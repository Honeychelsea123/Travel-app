use strict; use warnings; use utf8;
use JSON::PP;
binmode STDOUT, ':encoding(UTF-8)';

# ── 도시마다 «제 시·군» 경계를 굽는 도구 (b778) ───────────────────────
#
# 왜 있나: 지구본을 확대하면 주·도(admin-1)를 칠합니다(adm1/, b768). 그런데
#   한 주·도에 도시가 여럿이면 **한 곳만 가도 전부** 칠해졌습니다 — 사용자:
#   「하코다테, 아사히카와는 가지도 않았는데 칠해져있네?」(홋카이도는 도 하나).
#   더 들어가면 «간 도시의 시·군만» 진하게 칠하려고, 그 도시들의 시·군 경계를
#   굽습니다. 사용자: 「최대한 정교하고 고퀄리티로」 · 「globemark 앱처럼 정교하게」.
#
# 무엇을 하나: 도시 하나에 **경계 하나**. `adm2/XX.js` 에
#     export default {"sapporo":"M…Z", "otaru":"M…Z", …}
#   좌표계는 adm1·map50 과 같습니다: x = (경도+180)/360*1000 · y = (90-위도)/180*500
#
# ⚠⚠ **«도시가 여럿인 주·도»의 도시만 굽습니다.** 도시가 하나뿐인 주·도는
#   그 주·도가 곧 그 도시의 자리입니다(서울특별시·도쿄도). 거기까지 시·군으로
#   쪼개면 서울이 «중구»만 남습니다 — 광역시는 시·군구 단위가 «구»입니다.
#   어느 도시가 여럿인 주·도에 드는지는 앱이 셉니다(citymap.js 의 `짜기`).
#   그 목록을 살아 있는 앱에서 뽑아 넣습니다(아래 「쓰는 법」).
#
# ⚠ **자료: geoBoundaries gbOpen «간략판»**(나라마다 라이선스가 다릅니다 —
#   구운 파일 머리에 적고, 앱 「지도 자료」에 모아 적습니다). 간략판의 오차는
#   100m 안팎이라 최대 배율(1pt ≈ 0.8km)에서 안 보입니다.
#
# ⚠⚠ **나라마다 «도시 한 곳»에 맞는 단계가 다릅니다.** 2단계가 한국·일본은
#   시·군이지만 이탈리아(20)·독일(38)·스페인(52)·프랑스(96)는 도급이라 너무
#   거칠고, 캐나다·오스트리아·스위스는 한 단계 더 내려가야 시·읍·면입니다.
#   아래 `%단계` 의 첫째가 «시·군급», 뒤는 «너무 작을 때 올려 볼 곳»입니다.
#
# 고르는 규칙(도시 C, 같은 주·도의 다른 도시들 S):
#   ① 시·군급 단계에서 C 가 든 경계 P. 없으면 3km 안의 가장 가까운 경계
#      (해안 도시는 점이 바다에 떨어지기도 합니다).
#   ② P 안에 S 가 같이 들면(하와이 오아후처럼 한 카운티에 셋) **P 를 둘 사이
#      가운데 선으로 나눕니다** — 그 안에서만입니다. 경계 밖은 그대로 진짜 선.
#   ③ P 가 30km² 보다 작으면(시내만 떼어 둔 곳: 빅토리아 19 · 이비사 11)
#      위 단계의 경계, 또는 그 경계에서 C 가 든 «섬 하나»로 올립니다 —
#      S 를 안 품고 3,000km² 이하일 때만. 못 올리면 작은 그대로 둡니다
#      (아말피 6km² — 그게 실제 크기입니다).
#
# 쓰는 법:
#   1) 도시 목록(TSV: id · 나라 · 단위번호 · 위도 · 경도)을 살아 있는 앱에서
#      뽑습니다 — 로그인 없이 됩니다. 브라우저 콘솔에서:
#        (그 방법은 이 파일 맨 아래 __END__ 뒤에 적어 뒀습니다)
#   2) perl tools/mkadm2.pl <목록.tsv> <원본폴더>
#      원본폴더에 ISO3-ADMn.geojson 이 없으면 받으라고 알려 줍니다.
#   ⚠ **도시를 더 넣으면 다시 구워야 합니다** — 새 도시가 어느 주·도를
#     «여럿»으로 만들면 그 주·도는 시·군 경계가 없어 예전처럼 통째로
#     칠해집니다(틀리지는 않고 덜 정교할 뿐입니다).

my ($목록, $원본) = @ARGV;
die "쓰는 법: perl tools/mkadm2.pl <목록.tsv> <원본폴더>\n" unless $목록 && $원본;
my $OUT = 'adm2';

my %ISO3 = (KR=>'KOR', JP=>'JPN', US=>'USA', CN=>'CHN', CA=>'CAN', DE=>'DEU', CH=>'CHE',
  NL=>'NLD', AU=>'AUS', AT=>'AUT', NZ=>'NZL', FR=>'FRA', IN=>'IND', TR=>'TUR', ES=>'ESP',
  PT=>'PRT', IT=>'ITA', GR=>'GRC', TW=>'TWN', MX=>'MEX', TH=>'THA', FJ=>'FJI', ZA=>'ZAF',
  HR=>'HRV', DK=>'DNK', BO=>'BOL', FI=>'FIN', ID=>'IDN', MM=>'MMR', OM=>'OMN', NP=>'NPL',
  CL=>'CHL');
# 첫째 = 시·군급. 뒤 = 작을 때 올려 볼 곳(거친 쪽으로).
# ⚠ 한국은 geoBoundaries 가 아니라 **통계청(KOSTAT) 2018**입니다. geoBoundaries
#   한국 판은 시·군 하나를 점 140개 남짓으로 그린 거친 자료라 **문경 시내가
#   상주시 안에** 들었습니다(원본 해상도로도 같음). 통계청 판은 같은 경계를
#   수천 점으로 그립니다. 파일: KOSTAT-2018.geojson(southkorea-maps 저장소).
# ⚠ 미국은 카운티(ADM2)가 너무 큽니다 — LA 카운티 10,607km² 에 롱비치·패서디나가
#   다 듭니다. 인구조사국의 **시 경계**(법인 도시 · 없으면 지정 구역 CDP)를 먼저,
#   너무 작으면 County Subdivision, 그다음 카운티. 파일: USA-PLACE · USA-CCD
#   (tiger.pl 이 TIGERweb 에서 도시 좌표로 뽑아 만듭니다).
my %단계 = (
  KR=>['KOSTAT'], JP=>['ADM2'], US=>['PLACE','CCD','ADM2'], CN=>['ADM2'], CA=>['ADM3','ADM2'],
  DE=>['ADM3'], CH=>['ADM3','ADM2'], NL=>['ADM2'], AU=>['ADM2'], AT=>['ADM3','ADM2'],
  NZ=>['ADM3','ADM2'], FR=>['ADM5'], IN=>['ADM2'], TR=>['ADM2'], ES=>['ADM3','ADM2'],
  PT=>['ADM2'], IT=>['ADM4','ADM3'], GR=>['ADM3'], TW=>['ADM2'], MX=>['ADM2'],
  TH=>['ADM2'], FJ=>['ADM3','ADM2'], ZA=>['ADM2'], HR=>['ADM2'], DK=>['ADM2'],
  BO=>['ADM2'], FI=>['ADM3'], ID=>['ADM2'], MM=>['ADM2'], OM=>['ADM2'], NP=>['ADM2'],
  CL=>['ADM3'],
);
# ⚠⚠ **라이선스로 뺀 나라.** 오만(OMN) 자료는 조건이 「Other - Direct Permission」
#   — geoBoundaries 가 «직접 허락»을 받은 것이라, 우리가 받아 앱에 다시 담아
#   나눠 줘도 되는지 적혀 있지 않습니다. 빼면 그 나라는 예전처럼 주·도 통째로
#   칠해집니다(틀리지는 않고 덜 정교할 뿐). 나머지 조건은 앱 「지도 자료」
#   (credits.html)에 나라마다 적었습니다 — 새 나라를 넣으면 거기도 늘리십시오.
my %안씀 = (OM => '라이선스 불분명(Direct Permission)');
my $작다 = 30;       # km² — 이보다 작으면 올려 봅니다
my $올림한도 = 3000;  # km² — 올려도 이보다 크면 안 올립니다
my $붙임 = 3;         # km — 점이 어느 경계에도 안 들 때 붙일 수 있는 거리

# ── 도시 목록 ─────────────────────────────────────────────────────────
my %나라;   # cc → [ {id, 단위, lat, lng} ]
{ open my $h, '<:encoding(UTF-8)', $목록 or die "$목록: $!\n";
  while (<$h>){ s/\r?\n$//; next unless /\S/;
    my ($id, $cc, $u, $lat, $lng) = split /\t/;
    push @{$나라{$cc}}, { id=>$id, 단위=>$u, lat=>$lat+0, lng=>$lng+0 }; }
  close $h; }

# ── 도형 셈 (경위도) ───────────────────────────────────────────────────
sub 안에 {            # 짝수-홀수 — 구멍·섬 모두 한 번에
  my ($lng, $lat, $고리들) = @_; my $in = 0;
  for my $r (@$고리들){ my $n = @$r;
    for (my $i = 0, my $j = $n - 1; $i < $n; $j = $i++){
      my ($xi,$yi) = @{$r->[$i]}; my ($xj,$yj) = @{$r->[$j]};
      $in = !$in if (($yi > $lat) != ($yj > $lat))
        && $lng < ($xj-$xi)*($lat-$yi)/(($yj-$yi)||1e-12)+$xi; } }
  return $in }
sub 거리km {          # 점 → 고리들 경계, km (그 자리 위도로 가로를 줄여 잽니다)
  my ($lng, $lat, $고리들) = @_; my $kx = 111.32 * cos($lat * 3.14159265/180); my $ky = 110.57;
  my $최소 = 1e18;
  for my $r (@$고리들){ my $n = @$r;
    for (my $i = 0, my $j = $n - 1; $i < $n; $j = $i++){
      my ($x1,$y1) = (($r->[$j][0]-$lng)*$kx, ($r->[$j][1]-$lat)*$ky);
      my ($x2,$y2) = (($r->[$i][0]-$lng)*$kx, ($r->[$i][1]-$lat)*$ky);
      my ($dx,$dy) = ($x2-$x1, $y2-$y1); my $L = $dx*$dx + $dy*$dy;
      my $t = $L ? -($x1*$dx + $y1*$dy)/$L : 0; $t = 0 if $t < 0; $t = 1 if $t > 1;
      my ($ex,$ey) = ($x1 + $t*$dx, $y1 + $t*$dy); my $d = sqrt($ex*$ex + $ey*$ey);
      $최소 = $d if $d < $최소; } }
  return $최소 }
sub 고리넓이km {      # 부호 없는 넓이
  my $r = shift; my $n = @$r; return 0 if $n < 3;
  my $lat0 = 0; $lat0 += $_->[1] for @$r; $lat0 /= $n;
  my $kx = 111.32 * cos($lat0 * 3.14159265/180); my $ky = 110.57; my $s = 0;
  for (my $i = 0, my $j = $n - 1; $i < $n; $j = $i++){
    $s += ($r->[$j][0]*$kx) * ($r->[$i][1]*$ky) - ($r->[$i][0]*$kx) * ($r->[$j][1]*$ky); }
  return abs($s) / 2 }
sub 넓이km {          # 도형(다각형들: [바깥, 구멍…]) 의 넓이
  my $polys = shift; my $s = 0;
  for my $p (@$polys){ my @r = @$p; next unless @r;
    $s += 고리넓이km($r[0]); $s -= 고리넓이km($_) for @r[1..$#r]; }
  return $s }
sub 고리모음 { my $polys = shift; return [ map { @$_ } @$polys ] }

# ── geoBoundaries 한 파일에서 «도시 둘레의» 경계만 꺼냅니다 ────────────
# ⚠ 파일이 한 줄에 경계 하나입니다(확인함). 줄마다 좌표 숫자로 상자부터
#   재고, 상자가 어느 도시에도 안 닿으면 JSON 으로 안 풉니다 — 프랑스
#   코뮌 35,010 개(56MB)를 다 풀면 순수 펄 JSON 으로는 한참 걸립니다.
my $J = JSON::PP->new->utf8;
# ⚠ 파일 꼴이 셋입니다 — geoBoundaries(한 줄에 경계 하나 `{ "type": "Feature"`),
#   통계청(파일 «전체가 한 줄» `{"type": "Feature"`), tiger.pl 이 만든 것.
#   그래서 줄이 아니라 **경계가 시작하는 자리**로 자릅니다.
sub 조각들 {
  my ($파일, $할일) = @_;
  open my $h, '<:raw', $파일 or die "$파일: $!\n"; local $/; my $t = <$h>; close $h;
  my @시작; while ($t =~ /\{\s*"type":\s*"Feature"/g){ push @시작, $-[0] }
  for my $i (0 .. $#시작){
    my $끝 = $i < $#시작 ? $시작[$i+1] : length($t);
    my $조각 = substr($t, $시작[$i], $끝 - $시작[$i]);
    $조각 =~ s/[\s,]+$//;
    # FeatureCollection 꼬리 — 목록 «뒤»에 딸린 것까지 자릅니다. 통계청 파일은
    #   `}}], "name": "sgg", "crs": {…}}` 로 끝나서, 전에는 **마지막 경계(서귀포)를
    #   못 풀었습니다.** `}` 다음 `]` 는 경계 목록이 닫히는 자리뿐입니다.
    $조각 =~ s/\}\s*\].*\z/}/s if $i == $#시작;
    $할일->($조각);
  }
}
sub 풀기 {
  my $조각 = shift;
  my $f = eval { $J->decode($조각) } or return;
  my $g = $f->{geometry} or return;
  my @polys = $g->{type} eq 'Polygon' ? ($g->{coordinates})
            : $g->{type} eq 'MultiPolygon' ? @{$g->{coordinates}} : ();
  return unless @polys;
  my $p = $f->{properties} || {};
  my ($x0,$x1,$y0,$y1) = (1e9,-1e9,1e9,-1e9);
  for my $pl (@polys){ for my $r (@$pl){ for (@$r){
    $x0 = $_->[0] if $_->[0] < $x0; $x1 = $_->[0] if $_->[0] > $x1;
    $y0 = $_->[1] if $_->[1] < $y0; $y1 = $_->[1] if $_->[1] > $y1; } } }
  return { 이름 => $p->{shapeName} // $p->{NAME} // $p->{name} // '', polys => \@polys,
           고리 => 고리모음(\@polys), 상자 => [$x0,$x1,$y0,$y1] };
}
sub 꺼내기 {
  my ($파일, $도시들, $이름맞음) = @_;
  my $여유 = 0.05;   # 도 — 3km 붙이기보다 넉넉히
  my @찾은;
  조각들($파일, sub {
    my $조각 = shift;
    if ($이름맞음){                          # 이름으로 모으기(아래 `형제모으기`)
      my ($n) = $조각 =~ /"(?:shapeName|NAME|name)":\s*"((?:[^"\\]|\\.)*)"/;
      return unless defined $n;
      $n = eval { $J->decode(qq{["$n"]})->[0] } // $n;   # \uXXXX 풀기
      return unless $이름맞음->($n);
      my $b = 풀기($조각); push @찾은, $b if $b; return;
    }
    my $c = index($조각, '"coordinates"'); return if $c < 0;
    my ($x0,$x1,$y0,$y1) = (1e9,-1e9,1e9,-1e9);
    my $좌표 = substr($조각, $c);
    while ($좌표 =~ /\[\s*(-?[\d.]+(?:[eE][-+]?\d+)?)\s*,\s*(-?[\d.]+(?:[eE][-+]?\d+)?)\s*\]/g){
      $x0 = $1 if $1 < $x0; $x1 = $1 if $1 > $x1; $y0 = $2 if $2 < $y0; $y1 = $2 if $2 > $y1; }
    for my $d (@$도시들){
      if ($d->{lng} >= $x0-$여유 && $d->{lng} <= $x1+$여유
       && $d->{lat} >= $y0-$여유 && $d->{lat} <= $y1+$여유){
        my $b = 풀기($조각); push @찾은, $b if $b; return; } }
  });
  return \@찾은;
}

# ── 같은 시의 «구»를 합칩니다 ───────────────────────────────────────────
# ⚠⚠ 통계청 자료는 일반구가 있는 시(수원·성남·안양·안산·고양·용인·청주·천안·
#   전주·포항·창원)를 **구마다** 나눠 둡니다(「수원시팔달구」). 프랑스 코뮌 자료는
#   마르세유·리옹·파리를 **아롱디스망**으로 나눠 둡니다(「Marseille 2e
#   Arrondissement」 4km²). 그대로 쓰면 수원에 가도 팔달구 하나만 칠해집니다.
# ⚠ 광역시의 자치구(종로구·해운대구)는 이름에 「○○시」가 없어 안 걸립니다 —
#   광역시는 주·도 단위라 여기까지 안 옵니다.
my %합치기 = (
  KOSTAT => sub { my $n = shift; $n =~ /^(.+?시)(.+구)$/ ? $1 : undef },
  ADM5   => sub { my $n = shift; $n =~ /^(.+?) \d+(?:e|er) Arrondissement$/ ? $1 : undef },
);
sub 형제모으기 {
  my ($L, $P, $파일) = @_;
  my $규칙 = $합치기{$L} or return $P;
  my $머리 = $규칙->($P->{이름}); return $P unless defined $머리;
  my $모음 = 꺼내기($파일, [], sub { my $m = $규칙->(shift); defined $m && $m eq $머리 });
  return $P unless @$모음 > 1;
  my @polys = map { @{$_->{polys}} } @$모음;
  my ($x0,$x1,$y0,$y1) = (1e9,-1e9,1e9,-1e9);
  for (@$모음){ my ($a,$b,$c,$e) = @{$_->{상자}};
    $x0 = $a if $a < $x0; $x1 = $b if $b > $x1; $y0 = $c if $c < $y0; $y1 = $e if $e > $y1 }
  return { 이름 => sprintf('%s(구 %d개 합침)', $머리, scalar @$모음), polys => \@polys,
           고리 => 고리모음(\@polys), 상자 => [$x0,$x1,$y0,$y1] };
}

# ── 섬 이름인 항목 ─────────────────────────────────────────────────────
# ⚠ 목록에는 도시가 아니라 **섬**인 것이 있습니다 — 좌표는 섬 가운데나 주도(州都).
#   시·군으로 자르면 팔마시(마요르카) · 타바난군(발리) · 나하시(오키나와)만
#   칠해집니다. 이것들은 **주·도(adm1) 자료에서 점이 든 섬 하나**를 씁니다 —
#   지구본이 그리는 해안선과 같은 자료라 칠이 해안에 딱 맞습니다.
# ⚠ 다른 도시를 품어도 씁니다(발리 안의 우붓) — 「발리에 갔다」는 섬 이야기입니다.
my %섬도시 = map { $_ => 1 } qw(mallorca bali okinawa);

sub 단위고리들 {      # adm1/XX.js → [ 단위마다 [고리(경위도)…] ]
  my $cc = shift; my @단위;
  open my $h, '<:encoding(UTF-8)', "adm1/$cc.js" or return [];
  local $/; my $t = <$h>; close $h;
  while ($t =~ /\["[^"]*","([^"]+)"\]/g){
    my $d = $1; my ($x, $y) = (0, 0); my @r; my $cur;
    while ($d =~ /([MlZ])([^MlZ]*)/g){
      my ($c, $a) = ($1, $2); my @n = $a =~ /(-?[\d.]+)/g;
      if ($c eq 'M'){ ($x,$y) = @n[0,1]; $cur = [[$x,$y]]; push @r, $cur }
      elsif ($c eq 'l'){ for (my $i = 0; $i+1 < @n; $i += 2){ $x += $n[$i]; $y += $n[$i+1]; push @$cur, [$x,$y] } } }
    push @단위, [ map { [ map { [ $_->[0]/1000*360 - 180, 90 - $_->[1]/500*180 ] } @$_ ] } @r ];
  }
  return \@단위;
}
sub km거리 { my ($a, $b) = @_;
  my $kx = 111.32 * cos(($a->{lat}+$b->{lat})/2 * 3.14159265/180);
  return sqrt((($a->{lng}-$b->{lng})*$kx)**2 + (($a->{lat}-$b->{lat})*110.57)**2) }
sub 든경계 {          # 점이 든 경계, 없으면 $붙임 km 안의 가장 가까운 것
  my ($d, $경계들) = @_;
  for my $b (@$경계들){ my ($x0,$x1,$y0,$y1) = @{$b->{상자}};
    next if $d->{lng} < $x0 || $d->{lng} > $x1 || $d->{lat} < $y0 || $d->{lat} > $y1;
    return ($b, 0) if 안에($d->{lng}, $d->{lat}, $b->{고리}); }
  my ($가장, $몇) = (undef, $붙임);
  for my $b (@$경계들){ my $k = 거리km($d->{lng}, $d->{lat}, $b->{고리});
    if ($k < $몇){ $몇 = $k; $가장 = $b } }
  return ($가장, $가장 ? $몇 : undef);
}
sub 섬하나 {          # 경계에서 점이 든 «다각형 하나»(바깥 + 제 구멍)
  my ($d, $b) = @_;
  for my $p (@{$b->{polys}}){ return [$p] if 안에($d->{lng}, $d->{lat}, [$p->[0]]) }
  return undef;
}

# ── 볼록 칸으로 자르기(서덜랜드-호지먼) — 가운데 선으로 나눌 때 ─────────
sub 반평면자르기 {    # 고리를 «a·x + b·y <= c» 쪽만 남깁니다
  my ($r, $a, $b, $c) = @_; my @out; my $n = @$r; return [] unless $n;
  for my $i (0 .. $n-1){
    my $P = $r->[$i]; my $Q = $r->[($i+1) % $n];
    my $fp = $a*$P->[0] + $b*$P->[1] - $c; my $fq = $a*$Q->[0] + $b*$Q->[1] - $c;
    push @out, $P if $fp <= 0;
    if (($fp <= 0) != ($fq <= 0)){ my $t = $fp / ($fp - $fq);
      push @out, [ $P->[0] + $t*($Q->[0]-$P->[0]), $P->[1] + $t*($Q->[1]-$P->[1]) ]; } }
  return \@out }
sub 가운데로나누기 {  # 경계 $b 에서 도시 $d 쪽(같이 든 도시들보다 가까운 곳)만
  my ($d, $b, $남들) = @_;
  my $kx = cos($d->{lat} * 3.14159265/180);   # 가로를 줄여 «거리가 같은 선»을 맞춥니다
  my @polys;
  for my $p (@{$b->{polys}}){
    my @새 = map { [ map { [ $_->[0]*$kx, $_->[1] ] } @$_ ] } @$p;
    for my $o (@$남들){
      my ($ax,$ay) = ($d->{lng}*$kx, $d->{lat}); my ($bx,$by) = ($o->{lng}*$kx, $o->{lat});
      # |p-A|² <= |p-B|²  ⇔  2(B-A)·p <= |B|²-|A|²
      my ($A, $B, $C) = (2*($bx-$ax), 2*($by-$ay), ($bx*$bx+$by*$by) - ($ax*$ax+$ay*$ay));
      @새 = map { 반평면자르기($_, $A, $B, $C) } @새;
    }
    @새 = grep { @$_ >= 3 } @새;
    next unless @새;
    push @polys, [ map { [ map { [ $_->[0]/$kx, $_->[1] ] } @$_ ] } @새 ];
  }
  return \@polys;
}

# ── 더글러스-포이커 · 길 (mkadm1.pl 과 같은 꼴, 소수 셋째 자리) ──────────
sub 줄이기 {
  my ($pt, $eps) = @_;
  return $pt if @$pt < 3;
  my ($a, $b) = ($pt->[0], $pt->[-1]);
  my ($dx, $dy) = ($b->[0]-$a->[0], $b->[1]-$a->[1]);
  my $l2 = $dx*$dx + $dy*$dy;
  my ($최대, $나쁜) = (-1, 0);
  for my $i (1 .. $#$pt - 1){
    my $q = $pt->[$i]; my $dd;
    if ($l2 < 1e-18){ my ($ux,$uy) = ($q->[0]-$a->[0], $q->[1]-$a->[1]); $dd = sqrt($ux*$ux + $uy*$uy) }
    else { $dd = abs($dy*$q->[0] - $dx*$q->[1] + $b->[0]*$a->[1] - $b->[1]*$a->[0]) / sqrt($l2) }
    if ($dd > $최대){ $최대 = $dd; $나쁜 = $i }
  }
  return [$a, $b] if $최대 <= $eps;
  my $왼 = 줄이기([@$pt[0 .. $나쁜]], $eps);
  my $오 = 줄이기([@$pt[$나쁜 .. $#$pt]], $eps);
  pop @$왼;
  return [@$왼, @$오];
}
sub 길 {
  my $r = shift;
  my $f = sub { my $t = sprintf('%.3f', shift); $t =~ s/\.?0+$// if $t =~ /\./;
                $t = '0' if $t eq '' || $t eq '-0'; $t };
  my ($px, $py); my $d = '';
  for my $i (0 .. $#$r){
    my ($x, $y) = @{$r->[$i]};
    if ($i == 0){ $d .= 'M'.$f->($x).' '.$f->($y).'l'; ($px,$py) = (sprintf('%.3f',$x)+0, sprintf('%.3f',$y)+0); next }
    my ($ax, $ay) = (sprintf('%.3f', $x-$px)+0, sprintf('%.3f', $y-$py)+0);
    next if $ax == 0 && $ay == 0;
    $d .= $f->($ax).' '.$f->($ay).' ';
    $px += $ax; $py += $ay;
  }
  $d =~ s/\s+$//;
  return $d.'Z';
}
sub 지도로 { my $r = shift; [ map { [ ($_->[0]+180)/360*1000, (90-$_->[1])/180*500 ] } @$r ] }
sub 굽기 {            # 다각형들 → 길 한 줄
  my $polys = shift;
  my ($x0,$x1,$y0,$y1) = (1e9,-1e9,1e9,-1e9);
  my @고리 = map { 지도로($_) } map { @$_ } @$polys;
  for my $r (@고리){ for (@$r){ $x0=$_->[0] if $_->[0]<$x0; $x1=$_->[0] if $_->[0]>$x1;
                                $y0=$_->[1] if $_->[1]<$y0; $y1=$_->[1] if $_->[1]>$y1; } }
  my $짧 = ($x1-$x0) < ($y1-$y0) ? ($x1-$x0) : ($y1-$y0);
  # ⚠ ε 를 경계 크기에 맞춥니다 — 작은 코뮌을 거친 ε 로 깎으면 제 모양을 잃습니다.
  #   0.0004 지도단위 ≈ 16m, 0.008 ≈ 320m — 최대 배율(1km ≈ 1.1px)에서 0.35px.
  #   ⚠ 0.004(0.18px)로 처음 구웠더니 한국만 149KB 였습니다. 눈에 안 보이는 촘촘함.
  my $e = $짧 / 80; $e = 0.0004 if $e < 0.0004; $e = 0.008 if $e > 0.008;
  my $d = '';
  for my $r (@고리){
    my $줄 = 줄이기([@$r, $r->[0]], $e);    # 닫힌 고리로 깎고
    pop @$줄 if @$줄 > 1;
    next if @$줄 < 3;
    # 아주 작은 섬(0.02km² 미만)은 버립니다 — 최대 배율에서도 한 점이 안 됩니다
    my $넓 = 0; my $n = @$줄;
    for (my $i = 0, my $j = $n - 1; $i < $n; $j = $i++){
      $넓 += $줄->[$j][0]*$줄->[$i][1] - $줄->[$i][0]*$줄->[$j][1] }
    next if abs($넓)/2 * 1600 < 0.02;          # 지도단위² × 약 1600km²
    $d .= 길($줄);
  }
  return $d;
}

# ── adm1 단위의 넓이(올림 한도의 기준) ─────────────────────────────────
sub 단위넓이들 {
  my $cc = shift; my @넓이;
  open my $h, '<:encoding(UTF-8)', "adm1/$cc.js" or return [];
  local $/; my $t = <$h>; close $h;
  while ($t =~ /\["[^"]*","([^"]+)"\]/g){
    my $d = $1; my ($x, $y) = (0, 0); my @r; my $cur; my $s = 0;
    while ($d =~ /([MlZ])([^MlZ]*)/g){
      my ($c, $a) = ($1, $2); my @n = $a =~ /(-?[\d.]+)/g;
      if ($c eq 'M'){ ($x,$y) = @n[0,1]; $cur = [[$x,$y]]; push @r, $cur }
      elsif ($c eq 'l'){ for (my $i = 0; $i+1 < @n; $i += 2){ $x += $n[$i]; $y += $n[$i+1]; push @$cur, [$x,$y] } } }
    for my $r (@r){ my $n = @$r; my $a = 0; my $lat = 0; $lat += 90 - $_->[1]*180/500 for @$r; $lat /= ($n||1);
      for (my $i = 0, my $j = $n - 1; $i < $n; $j = $i++){ $a += $r->[$j][0]*$r->[$i][1] - $r->[$i][0]*$r->[$j][1] }
      $s += abs($a)/2 * (0.36*111.32*cos($lat*3.14159265/180)) * (0.36*110.57); }
    push @넓이, $s;
  }
  return \@넓이;
}

# ══ 나라마다 ═════════════════════════════════════════════════════════════
mkdir $OUT unless -d $OUT;
my (%모자람, %출처);
my ($합도시, $합크기, $나눈, $올린, $없는) = (0, 0, 0, 0, 0);
for my $cc (sort keys %나라){
  if ($안씀{$cc}){ print "-- $cc: 뺌 — $안씀{$cc}\n"; next }
  # ⚠ 한국은 tools/mkkr.pl 이 굽습니다(b786) — 시·도(adm1)와 시·군을 «같은 선»으로 같이
  #   굽습니다. 여기서 따로 구우면 이웃 시·군끼리, 시·도 선과 또 어긋납니다.
  if ($cc eq 'KR'){ print "-- KR: tools/mkkr.pl 이 굽습니다(b786)\n"; next }
  my $iso = $ISO3{$cc} or do { print "!! $cc: ISO3 를 모릅니다\n"; next };
  my @단계 = @{ $단계{$cc} || ['ADM2'] };
  my $도시들 = $나라{$cc};
  my (%경계, %파일);   # 단계 → [경계…] · 파일
  for my $L (@단계){
    my $f = $L eq 'KOSTAT' ? "$원본/KOSTAT-2018.geojson" : "$원본/$iso-$L.geojson";
    unless (-s $f){ $모자람{$f =~ s{.*/}{}r} = 1; next }
    $경계{$L} = 꺼내기($f, $도시들);
    $파일{$L} = $f;
    my $m = $f =~ s/\.geojson$/.meta.json/r;
    if (-s $m){ open my $h, '<:raw', $m; local $/; my $t = <$h>; close $h;
      my $j = eval { decode_json($t) }; $j = $j->[0] if ref $j eq 'ARRAY';
      $출처{"$iso $L"} = ($j->{boundaryLicense} // '?') . ' · ' . ($j->{boundarySource} // '?') if $j; }
  }
  next unless $경계{$단계[0]};
  my $넓이 = 단위넓이들($cc);
  my $단위고리 = 단위고리들($cc);
  my %무리; push @{$무리{$_->{단위}}}, $_ for @$도시들;

  my %결과; my @기록;
  for my $u (sort { $a <=> $b } keys %무리){
    my @g = @{$무리{$u}};
    my $단위km = $넓이->[$u] // 1e9;
    for my $d (@g){
      # ⚠ 좌표가 2km 안인 항목은 «같은 곳»입니다(괴레메·카파도키아가 같은 점).
      #   나누면 반씩 갖게 되니, 남으로 치지 않습니다 — 둘 다 전체를 갖습니다.
      my @남 = grep { $_ != $d && km거리($d, $_) > 2 } @g;
      if ($섬도시{$d->{id}}){
        my ($섬) = grep { 안에($d->{lng}, $d->{lat}, [$_]) } @{ $단위고리->[$u] || [] };
        if ($섬){
          my $길 = 굽기([[ $섬 ]]);
          if ($길){ $결과{$d->{id}} = $길; $올린++;
            push @기록, sprintf '  %s: 섬 하나(주·도 자료) %.0fkm²', $d->{id}, 넓이km([[ $섬 ]]); next }
        }
      }
      my ($P, $몇) = 든경계($d, $경계{$단계[0]});
      unless ($P){ push @기록, "  $d->{id}: 시·군 경계 없음"; $없는++; next }
      $P = 형제모으기($단계[0], $P, $파일{$단계[0]});
      my @같이 = grep { 안에($_->{lng}, $_->{lat}, $P->{고리}) } @남;
      my ($polys, $어떻게);
      if (@같이){
        $polys = 가운데로나누기($d, $P, \@같이);
        $어떻게 = sprintf '%s 를 %s 와 나눔', $P->{이름}, join('·', map { $_->{id} } @같이);
        $나눈++;
      } else {
        $polys = $P->{polys}; my $a = 넓이km($polys);
        $어떻게 = sprintf '%s %.0fkm²%s', $P->{이름}, $a, $몇 ? sprintf(' (경계까지 %.1fkm)', $몇) : '';
        if ($a < $작다){
          올림: for my $L (@단계[1..$#단계]){
            next unless $경계{$L};
            my ($Q) = 든경계($d, $경계{$L}); next unless $Q;
            for my $후보 ($Q->{polys}, 섬하나($d, $Q)){
              next unless $후보;
              my $b = 넓이km($후보);
              next if $b > $올림한도 || $b > $단위km / 3;
              next if grep { 안에($_->{lng}, $_->{lat}, 고리모음($후보)) } @남;
              $polys = $후보;
              $어떻게 .= sprintf ' → %s%s %.0fkm²', $Q->{이름}, $후보 == $Q->{polys} ? '' : '(섬)', $b;
              $올린++; last 올림;
            }
          }
        }
      }
      my $길 = 굽기($polys);
      unless ($길){ push @기록, "  $d->{id}: 굽고 나니 빈 경계"; $없는++; next }
      $결과{$d->{id}} = $길;
      push @기록, "  $d->{id}: $어떻게";
    }
  }
  next unless %결과;
  my $js = "/* 시·군 경계 — tools/mkadm2.pl 이 굽습니다(b778). 손으로 고치지 마십시오.\n"
         . "   출처: geoBoundaries gbOpen — "
         . join(' / ', map { "$_: $출처{$_}" } grep { /^$iso / } sort keys %출처) . " */\n"
         . "export default {\n"
         . join(",\n", map { qq{"$_":"$결과{$_}"} } sort keys %결과) . "\n};\n";
  open my $o, '>:encoding(UTF-8)', "$OUT/$cc.js" or die; print $o $js; close $o;
  my $크기 = -s "$OUT/$cc.js"; $합크기 += $크기; $합도시 += keys %결과;
  printf "%s %s: %d곳 %.1fKB\n%s\n", $cc, $iso, scalar keys %결과, $크기/1024, join("\n", @기록);
}
printf "\n합: %d곳 · %.0fKB · 나눈 곳 %d · 올린 곳 %d · 경계 없음 %d\n", $합도시, $합크기/1024, $나눈, $올린, $없는;
print "!! 원본이 없습니다: ", join(' ', sort keys %모자람), "\n" if %모자람;
print "\n출처:\n", map { "  $_: $출처{$_}\n" } sort keys %출처;

__END__
도시 목록 뽑기 — 살아 있는 앱(로그인 없이)을 열고 콘솔에서. 앱과 같은 배정
(`가진주도` → `짜기`)을 그대로 씁니다. 결과를 TSV 로 저장해 1) 에 넣습니다.

  const v = [...document.scripts].map(s => s.src).find(s => /app\.js\?v=/.test(s)).match(/v=(b\d+)/)[1];
  const c = await import(`./cities.js?v=${v}`), m = await import(`./citymap.js?v=${v}`);
  const 줄 = [];
  for (const cc of [...new Set(c.cities.map(x => x.cc))]){
    const us = await m.가진주도(cc); if (!us) continue;   // 처음엔 undefined — 한 번 더 돌리면 찹니다
    us.forEach((u, i) => { if (u.도시.length < 2) return;
      for (const id of u.도시){ const x = c.cities.find(t => t.id === id);
        줄.push([id, cc, i, (+x.center_lat).toFixed(5), (+x.center_lng).toFixed(5)].join('\t')); } });
  }
  copy(줄.join('\n'));
