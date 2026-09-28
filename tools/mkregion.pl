use strict; use warnings; use utf8;
no warnings 'recursion';
use JSON::PP;
use Encode qw(encode);
use Unicode::Normalize qw(NFD);
binmode STDOUT, ':encoding(UTF-8)'; binmode STDERR, ':encoding(UTF-8)';

# ── 너무 잘게 쪼개진 나라의 주·도를 «지역»으로 합쳐 굽기 (b792) ─────────────
#
# 사용자: 「특정 나라만 너무 자세하게 쪼개져서 나오는건 왜그런거야?」(슬로베니아·북마케도니아
#   사진) → 「둘다 그렇게해주고 세계 지도에 너무 잘게 쪼개진 나라들이 꽤 있으니 그것도 찾아서
#   고치자」.
#
# 왜: Natural Earth 10m 은 나라마다 «첫째 행정구역»을 그대로 씁니다. 슬로베니아는 그게
#   시·군이라 193 조각(평균 105km²), 북마케도니아 84 · 라트비아 119 · 몰타 67 · 영국 232.
#   이웃(오스트리아 9 · 크로아티아 21)과 굵기가 달라 그 나라만 퍼즐처럼 보였습니다.
#   앱에 있는 나라를 «평균 조각 넓이»로 줄 세워(재 봄) 튀는 것만 골랐습니다 — 아래 %규칙.
#
# 어떻게:
#   ① NE 의 상위 칸(region · region_sub), 이름표, 또는 «나라 하나»로 조각을 무리 짓습니다.
#   ② **같은 무리의 두 조각이 나눠 쓰는 변을 지워** 합칩니다. NE 조각은 이웃과 변을 점까지
#      똑같이 공유합니다(재 봄: 슬로베니아 3,620 변 중 3,098 이 두 조각 공유, 522 는 나라 바깥 ·
#      북마케도니아 3,208/3,572 · 영국 6,430/13,535 · 헝가리 1,247/2,096 — 셋 이상 공유 0).
#   ③ 남은 변을 이음점(주인이 바뀌거나 셋 이상 만나는 점)에서 **호**로 자르고 호마다 한 번만
#      더글러스-포이커 — 이웃 지역이 같은 선을 씁니다(tools/mkkr.pl · mktopo.pl 과 같은 수).
#   ④ 좌표는 소수 **셋째** 자리(둘째면 크게 당겼을 때 계단 — b786 에서 잰 것).
#
# 쓰는 법:  perl tools/mkregion.pl <ne10_adm1.geojson> [나라,…]   (안 주면 %규칙 전부)
#   원본: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson
#
# ⚠ 이름은 tools/mkadm1.pl 과 똑같이 «두 번 인코딩»해서 씁니다(앱의 citymap.js `이름풀기`).
# ⚠ 다시 구우면 citymap.js 의 MAP_V 를 올리십시오 — 안 올리면 받아 둔 옛 조각을 계속 씁니다.
# ⚠ 이 나라들은 시·군 자료(adm2)가 없습니다. 생기면 «도시 여럿인 지역»이 시·군 단계로 들어갑니다.
# ⚠ 여기 나라를 tools/mkadm1.pl 로 다시 구우면 합친 것이 풀립니다. 그 도구는 이 나라들을 빼고 쓰십시오.

my ($SRC, $목록) = @ARGV;
die "쓰는 법: perl tools/mkregion.pl <ne10_adm1.geojson> [나라,…]\n" unless $SRC;
my $OUT = 'adm1';

# 이름 맞추기용 — 악센트·기호·대소문자를 걷습니다(NE 는 ş/ș, ţ/ț 를 섞어 씁니다).
sub 열쇠 { my $t = NFD(shift // ''); $t =~ s/\p{Mn}//g; $t = lc $t; $t =~ s/[^a-z0-9]+//g; $t }

# ── 나라별 규칙 ──────────────────────────────────────────────────────
#   칸  : 무리 짓는 NE 속성. 비었으면 `빈칸`(이름 → 무리), 그래도 없으면 제 이름으로.
#   고침: 무리 이름 바꾸기(같은 것을 둘로 적은 곳).
#   표  : 이름표로 직접(NE 에 상위 칸이 없는 나라). 표에 없는 조각이 있으면 멈춥니다.
#   하나: 나라 전체를 한 조각으로(작은 나라 — 조각 경계가 몇 km 짜리).
my %규칙 = (
  # 통계 지역 12 (NUTS-3)
  SI => { 칸 => 'region' },
  # 통계 지역 8. NE 는 스코페 시(Greater Skopje)를 따로 적었고 15 조각은 칸이 비었습니다.
  MK => { 칸 => 'region', 고침 => { 'Greater Skopje' => 'Skopje' },
          빈칸 => { Strumitsa => 'Southeastern', Gevgelija => 'Southeastern', Bosilovo => 'Southeastern',
                   Jegunovce => 'Polog', Tearce => 'Polog', Tetovo => 'Polog', 'Vrapcište' => 'Polog',
                   'Staro Nagoričane' => 'Northeastern', Oslomej => 'Southwestern',
                   Drugovo => 'Southwestern', Plasnica => 'Southwestern', Mogila => 'Pelagonia',
                   Rosoman => 'Vardar', Skopje => 'Skopje', Zrnovci => 'Eastern' } },
  # 7 구(區)
  XK => { 칸 => 'region' },
  # 통계 지역 6(리가 시 · 피에리가 · 쿠르제메 · 젬갈레 · 비제메 · 라트갈레)
  LV => { 칸 => 'region_sub' },
  # 경제 지역 10
  AZ => { 칸 => 'region' },
  # 3 지역(고조 · 북 · 남)
  MT => { 칸 => 'region' },
  # 홍콩섬 · 구룡 · 신계
  HK => { 칸 => 'region' },
  # 세인트키츠 · 네비스
  KN => { 칸 => 'region' },
  # 우간다: 112 구(區) → 4 지역(중부 · 동부 · 북부 · 서부). 사용자: 「우간다도 줄이자」(b795).
  #   NE 에 하위 지역(아촐리 · 부간다 …) 칸은 없어 NE 의 region 네 개를 씁니다 — 이웃(탄자니아 31 ·
  #   남수단 10 · 콩고 26 주)과 굵기가 비슷해집니다.
  UG => { 칸 => 'region' },
  # 영국은 NUTS-3 쯤(런던 자치구 32 → 그레이터 런던 하나, 주 단위). City of London 도 런던에.
  GB => { 칸 => 'region_sub', 고침 => { 'City of London' => 'Greater London' } },
  # 헝가리: 19 주 + 부다페스트. «주 권한 시»(데브레첸 등 23)가 주 안에 구멍으로 있던 것을 메웁니다.
  #   칸이 빈 두 주(Csongrád · Baranya)는 제 이름 = 그 안 시들의 region_sub 라 저절로 합쳐집니다.
  HU => { 칸 => 'region_sub', 이름대로 => qr/^Budapest/ },
  # 아일랜드: 시 의회(더블린 4 · 코크 · 골웨이 …)를 주에 합칩니다. NE 가 모내건을 Ulster 로 적었습니다.
  IE => { 칸 => 'region_sub', 고침 => { 'Ulster' => 'Monaghan' } },
  # 필리핀: 도(道) 안의 독립시(세부시 · 다바오시 …)를 도에 합치고, 메트로 마닐라 17 시를 하나로.
  PH => { 칸 => 'region_sub', 지역이면 => qr/National Capital Region/ },
  # 몬테네그로: 21 시 → 3 지역(해안 · 중부 · 북부). NE 에 상위 칸이 없어 표로.
  ME => { 표 => {
    'Coastal'  => ['Herceg Novi', 'Kotor', 'Tivat', 'Budva', 'Bar', 'Ulcinj'],
    'Central'  => ['Podgorica', 'Nikšić', 'Cetinje', 'Danilovgrad'],
    'Northern' => ['Rožaje', 'Berane', 'Plav', 'Pljevlja', 'Bijelo Polje', 'Žabljak', 'Plužine',
                   'Andrijevica', 'Mojkovac', 'Šavnik', 'Kolašin'] } },
  # 몰도바: 40 → 개발 지역(북 · 중 · 남 · 키시너우 · 가가우지아 · 트란스니스트리아).
  #   ⚠ NE 에 「Rezina」가 둘입니다 — 동쪽 것은 강 건너(르브니차)라 트란스니스트리아로.
  MD => { 표 => {
    'Nord'   => ['Briceni', 'Edineț', 'Rîșcani', 'Glodeni', 'Fălești', 'Ocnița', 'Dondușeni',
                 'Soroca', 'Florești', 'Drochia', 'Sîngerei', 'Bălți'],
    'Centru' => ['Ungheni', 'Nisporeni', 'Hîncești', 'Criuleni', 'Strășeni', 'Anenii Noi', 'Orhei',
                 'Telenești', 'Șoldănești', 'Rezina', 'Ialoveni', 'Călărași'],
    'Sud'    => ['Leova', 'Cantemir', 'Cahul', 'Ștefan Vodă', 'Căușeni', 'Cimișlia', 'Basarabeasca',
                 'Taraclia'],
    'Chișinău'     => ['Chișinău'],
    'Găgăuzia'     => ['Comrat'],
    'Transnistria' => ['Camenca', 'Stîngă Nistrului', 'Grigoriopol', 'Bender', 'Transnistria'] },
    둘이면동쪽 => { 'Rezina' => 'Transnistria' } },
  # 앤티가 바부다: 앤티가 섬의 교구 6 → 하나. 바부다·레돈다는 따로(섬이 다름).
  AG => { 표 => {
    'Antigua' => ['Saint Paul', 'Saint Philip', 'Saint Peter', 'Saint George', 'Saint John', 'Saint Mary'],
    'Barbuda' => ['Barbuda'], 'Redonda' => ['Redonda'] } },
  # 아주 작은 나라 — 나라 하나를 한 조각으로(교구·구가 몇 km 짜리라 확대하면 퍼즐이 됩니다).
  map({ $_ => { 하나 => 1 } } qw(AD SM LI NR SC BB LC DM)),
);

my %want = $목록 ? (map { uc($_) => 1 } grep { /^[A-Za-z]{2}$/ } split /,/, $목록) : (map { $_ => 1 } keys %규칙);
for (keys %want){ die "!! $_: 규칙이 없습니다\n" unless $규칙{$_} }

# ── 원본을 글자로 먼저 쪼갭니다(mkadm1.pl 과 같음) ─────────────────────
my $s; { local $/; open my $h, '<:raw', $SRC or die "$SRC: $!\n"; $s = <$h>; }
my @pos; my $p = 0;
while (($p = index($s, '{"type":"Feature"', $p)) >= 0){ push @pos, $p; $p += 10 }
my $J = JSON::PP->new->utf8;
my %모음;
for my $i (0 .. $#pos){
  my $끝 = $i < $#pos ? $pos[$i+1] : length($s);
  my $덩이 = substr($s, $pos[$i], $끝 - $pos[$i]);
  my ($cc) = $덩이 =~ /"iso_a2":"([A-Z]{2})"/;
  next unless $cc && $want{$cc};
  $덩이 =~ s/,\s*$//; $덩이 =~ s/\}\s*\]\s*\}\s*$/}/ if $i == $#pos;
  my $f = eval { $J->decode($덩이) } or next;
  push @{ $모음{$cc} }, $f;
}
undef $s;

# ── 더글러스-포이커(mkadm1.pl 과 같음) ────────────────────────────────
sub 줄이기 {
  my ($pt, $eps) = @_;
  return $pt if @$pt < 3;
  my ($a, $b) = ($pt->[0], $pt->[-1]);
  my ($dx, $dy) = ($b->[0]-$a->[0], $b->[1]-$a->[1]);
  my $l2 = $dx*$dx + $dy*$dy;
  my ($최대, $나쁜) = (-1, 0);
  for my $i (1 .. $#$pt - 1){
    my $q = $pt->[$i]; my $d;
    if ($l2 < 1e-18){ my ($ux,$uy) = ($q->[0]-$a->[0], $q->[1]-$a->[1]); $d = sqrt($ux*$ux + $uy*$uy) }
    else { $d = abs($dy*$q->[0] - $dx*$q->[1] + $b->[0]*$a->[1] - $b->[1]*$a->[0]) / sqrt($l2) }
    if ($d > $최대){ $최대 = $d; $나쁜 = $i }
  }
  return [$a, $b] if $최대 <= $eps;
  my $왼 = 줄이기([@$pt[0 .. $나쁜]], $eps);
  my $오 = 줄이기([@$pt[$나쁜 .. $#$pt]], $eps);
  pop @$왼;
  return [@$왼, @$오];
}

# 고리 → 「M x y l dx dy … Z」, 소수 셋째 자리. 반올림 오차가 쌓이지 않게 찍은 자리를 따라갑니다.
sub 길 {
  my $r = shift;
  my $f = sub { my $t = sprintf('%.3f', shift); $t =~ s/\.?0+$// if $t =~ /\./;
                $t = '0' if $t eq '' || $t eq '-0'; $t };
  my ($px, $py); my $d = '';
  for my $i (0 .. $#$r){
    my ($x, $y) = @{$r->[$i]};
    if ($i == 0){ ($px, $py) = (sprintf('%.3f', $x)+0, sprintf('%.3f', $y)+0);
                  $d .= 'M'.$f->($px).' '.$f->($py).'l'; next }
    my ($ax, $ay) = (sprintf('%.3f', $x-$px)+0, sprintf('%.3f', $y-$py)+0);
    next if $ax == 0 && $ay == 0;
    $d .= $f->($ax).' '.$f->($ay).' ';
    $px += $ax; $py += $ay;
  }
  $d =~ s/\s+$//;
  return $d.'Z';
}

sub 내보내기 {
  my $단위 = shift;
  # ⚠ 이름은 «두 번 인코딩»(mkadm1.pl 과 같게): UTF-8 바이트를 글자로 보고 다시 UTF-8 로 씁니다.
  my $q = sub { my $t = encode('UTF-8', shift); $t =~ s/\\/\\\\/g; $t =~ s/"/\\"/g; '"'.$t.'"' };
  return "export default [\n" . join(",\n", map { '['.$q->($_->[0]).','.$q->($_->[1]).']' } @$단위) . "\n];\n";
}

# ── 굽기 ─────────────────────────────────────────────────────────────
my %표;   # 나라 → 표 열쇠 → 무리
for my $cc (sort keys %모음){
  my $규 = $규칙{$cc};
  my $fs = $모음{$cc};

  # ① 무리 짓기
  my %이름표; if ($규->{표}){ for my $g (keys %{$규->{표}}){ $이름표{열쇠($_)} = $g for @{$규->{표}{$g}} } }
  my %빈칸;   if ($규->{빈칸}){ $빈칸{열쇠($_)} = $규->{빈칸}{$_} for keys %{$규->{빈칸}} }
  my @무리;   # 조각마다
  # 같은 이름이 둘인 조각(몰도바 Rezina) — 경도 한가운데로 동쪽 것을 갈라냅니다.
  my %동쪽;
  if (my $둘 = $규->{둘이면동쪽}){
    for my $n (keys %$둘){
      my @같은 = grep { 열쇠($fs->[$_]{properties}{name}) eq 열쇠($n) } 0 .. $#$fs;
      next unless @같은 == 2;
      my @x = map { my $g = $fs->[$_]{geometry}; my @c = map { @$_ } map { @$_ }
                    ($g->{type} eq 'Polygon' ? ($g->{coordinates}) : @{$g->{coordinates}});
                    my $t = 0; $t += $_->[0] for @c; $t / @c } @같은;
      $동쪽{ $x[0] > $x[1] ? $같은[0] : $같은[1] } = $둘->{$n};
    }
  }
  for my $i (0 .. $#$fs){
    my $pr = $fs->[$i]{properties}; my $이름 = $pr->{name} // '';
    my $k;
    if ($규->{하나}){ $k = $pr->{admin} // $cc }
    elsif ($동쪽{$i}){ $k = $동쪽{$i} }
    elsif ($규->{표}){ $k = $이름표{열쇠($이름)} // die "!! $cc: 표에 없는 조각 「$이름」\n" }
    elsif ($규->{이름대로} && $이름 =~ $규->{이름대로}){ $k = $이름 }
    elsif ($규->{지역이면} && ($pr->{region} // '') =~ $규->{지역이면}){ $k = $pr->{region} }
    else {
      $k = $pr->{ $규->{칸} };
      $k = undef if defined $k && $k =~ /^\s*$/;
      $k //= $빈칸{열쇠($이름)} // $이름;
    }
    $k = $규->{고침}{$k} if $규->{고침} && exists $규->{고침}{$k};
    $무리[$i] = $k;
  }
  my (@무리차례, %무리번호);
  for my $k (@무리){ next if exists $무리번호{$k}; $무리번호{$k} = @무리차례; push @무리차례, $k }

  # ② 점과 변 — 점 열쇠는 원본 좌표 그대로(이웃이 똑같이 씁니다)
  my %점;   # 열쇠 → [x, y] 지도 단위
  my $열 = sub { my $q = shift; my $k = sprintf('%.7f,%.7f', $q->[0], $q->[1]);
                 $점{$k} //= [ ($q->[0]+180)/360*1000, (90-$q->[1])/180*500 ]; $k };
  my %무리변;   # 무리 → 변 열쇠 → 수
  my ($x0,$x1,$y0,$y1) = (1e9,-1e9,1e9,-1e9);
  for my $i (0 .. $#$fs){
    my $g = $fs->[$i]{geometry} or next;
    my @polys = $g->{type} eq 'Polygon' ? ($g->{coordinates}) : @{$g->{coordinates}};
    for my $poly (@polys){ for my $ring (@$poly){
      my @k = map { $열->($_) } @$ring;
      pop @k if @k > 1 && $k[0] eq $k[-1];
      my @정; for (@k){ push @정, $_ unless @정 && $정[-1] eq $_ }
      next if @정 < 3;
      for my $j (0 .. $#정){
        my ($a, $b) = ($정[$j], $정[($j+1) % @정]); next if $a eq $b;
        $무리변{$무리[$i]}{ $a lt $b ? "$a|$b" : "$b|$a" }++;
        for my $q ($점{$a}){ $x0 = $q->[0] if $q->[0] < $x0; $x1 = $q->[0] if $q->[0] > $x1;
                             $y0 = $q->[1] if $q->[1] < $y0; $y1 = $q->[1] if $q->[1] > $y1 }
      }
    }}
  }
  # 무리의 테두리 = 홀수 번 나온 변(두 조각이 나눠 쓴 안쪽 변은 짝수 → 지움)
  my %주인;   # 변 → [무리…]
  for my $k (@무리차례){ for my $e (keys %{$무리변{$k}}){ push @{$주인{$e}}, $k if $무리변{$k}{$e} % 2 } }
  # 이음점: 테두리 변이 셋 이상 만나거나, 만나는 변들의 주인이 다른 점
  my %닿는;   # 점 → { 변 → 1 }
  for my $e (keys %주인){ my ($a, $b) = split /\|/, $e; $닿는{$a}{$e} = 1; $닿는{$b}{$e} = 1 }
  my %이음;
  for my $v (keys %닿는){
    my @e = keys %{$닿는{$v}};
    if (@e != 2){ $이음{$v} = 1; next }
    my ($s1, $s2) = map { join ',', sort @{$주인{$_}} } @e;
    $이음{$v} = 1 if $s1 ne $s2;
  }

  # ③ 무리마다 고리를 잇습니다(오일러 길)
  my %고리들;
  for my $k (@무리차례){
    my %이웃;   # 점 → [변…]
    my @변 = grep { $무리변{$k}{$_} % 2 } keys %{$무리변{$k}};
    for my $e (@변){ my ($a, $b) = split /\|/, $e; push @{$이웃{$a}}, $e; push @{$이웃{$b}}, $e }
    my %씀;
    for my $시작변 (sort @변){
      next if $씀{$시작변};
      my ($a, $b) = split /\|/, $시작변;
      $씀{$시작변} = 1;
      my @고리 = ($a, $b); my $지금 = $b;
      while ($지금 ne $a){
        my ($다음) = grep { !$씀{$_} } @{$이웃{$지금}};
        last unless defined $다음;
        $씀{$다음} = 1;
        my ($p1, $p2) = split /\|/, $다음;
        $지금 = $p1 eq $지금 ? $p2 : $p1;
        push @고리, $지금;
      }
      pop @고리 if $고리[-1] eq $고리[0];
      push @{$고리들{$k}}, \@고리 if @고리 >= 3;
    }
  }

  # ④ 호로 자르고 호마다 한 번만 줄입니다
  my $짧 = ($x1-$x0) < ($y1-$y0) ? ($x1-$x0) : ($y1-$y0);
  my $바닥ε = 0.04;
  my @굽힘;
  # 크면 한 단계씩 더 줄입니다: 나라 크기에 맞춘 값 → 0.04 → 0.08(mkadm1.pl 의 마지막 값)
  my $첫ε = $짧 > 0 && $짧/1200 < $바닥ε ? $짧/1200 : $바닥ε;
  for my $ε ($첫ε, ($첫ε < 0.04 ? 0.04 : ()), 0.08){
    my %호캐시;
    my $호 = sub {    # 점 열쇠 목록 → 줄인 좌표 목록(같은 호는 방향과 상관없이 같은 결과)
      my @v = @{ shift() };
      my $앞 = join ';', @v; my $뒤 = join ';', reverse @v;
      my ($열쇠, $뒤집) = $앞 le $뒤 ? ($앞, 0) : ($뒤, 1);
      my $r = $호캐시{$열쇠} //= 줄이기([ map { $점{$_} } ($뒤집 ? reverse @v : @v) ], $ε);
      return $뒤집 ? [ reverse @$r ] : $r;
    };
    my @단위;
    for my $k (@무리차례){
      my $d = '';
      for my $고리 (@{ $고리들{$k} // [] }){
        my @r = @$고리;
        my @이음자리 = grep { $이음{$r[$_]} } 0 .. $#r;
        my @좌표;
        if (!@이음자리){
          # 이음점이 없는 고리(섬 · 통째로 둘러싸인 구멍) — 제일 작은 점에서 시작해 한 호로
          my ($m) = sort { $r[$a] cmp $r[$b] } 0 .. $#r;
          @r = (@r[$m .. $#r], @r[0 .. $m-1]);
          my $한 = [ @r, $r[0] ];
          # 방향도 맞춥니다 — 둘러싼 쪽과 구멍 쪽이 같은 줄이기 결과를 쓰게
          my $앞 = join ';', @r[1 .. $#r]; my $뒤 = join ';', reverse @r[1 .. $#r];
          $한 = [ reverse @$한 ] if $뒤 lt $앞;
          @좌표 = @{ $호->($한) };
          pop @좌표;
        } else {
          my $돌 = $이음자리[0];
          @r = (@r[$돌 .. $#r], @r[0 .. $돌-1]);
          my @자리 = grep { $이음{$r[$_]} } 0 .. $#r;
          push @자리, scalar @r;   # 끝 = 첫 점으로 돌아옴
          for my $j (0 .. $#자리 - 1){
            my @토막 = @r[$자리[$j] .. ($자리[$j+1] < @r ? $자리[$j+1] : $#r)];
            push @토막, $r[0] if $자리[$j+1] == @r;
            my $c = $호->(\@토막);
            pop @좌표 if @좌표;
            push @좌표, @$c;
          }
          pop @좌표 if @좌표 > 1;
        }
        next if @좌표 < 3;    # 점 셋 미만은 면이 아닙니다
        $d .= 길([ @좌표, $좌표[0] ]);
      }
      push @단위, [$k, $d] if $d;
    }
    @굽힘 = @단위;
    last if length(내보내기(\@단위)) <= 60 * 1024;   # 크면 한 번 더 줄입니다(mkadm1.pl 과 같은 문턱)
    printf "  %s: ε=%.4f 에서 %.0fKB — 한 단계 더 줄입니다\n", $cc, $ε, length(내보내기(\@단위))/1024;
  }
  my $글 = 내보내기(\@굽힘);
  open my $w, '>:encoding(UTF-8)', "$OUT/$cc.js" or die "$OUT/$cc.js: $!\n";
  print $w $글; close $w;
  printf "%s  %3d 조각 → %3d 지역  %6.1fKB  (%s)\n", $cc, scalar @$fs, scalar @굽힘, length($글)/1024,
    join(' · ', map { $_->[0] } @굽힘[0 .. ($#굽힘 < 5 ? $#굽힘 : 5)]) . (@굽힘 > 6 ? ' …' : '');
}
