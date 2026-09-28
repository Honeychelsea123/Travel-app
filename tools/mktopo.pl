use strict; use warnings; use utf8;
no warnings 'recursion';
use JSON::PP;
binmode STDOUT, ':encoding(UTF-8)'; binmode STDERR, ':encoding(UTF-8)';

# ── 나라 하나의 주·도(adm1/XX.js)와 도시 시·군(adm2/XX.js)을 «한 벌의 선»으로 굽기 (b787) ──
#
# 왜 있나: 한국(tools/mkkr.pl, b786)과 같은 병을 나머지 30개국에서 고칩니다.
#   주·도는 Natural Earth 10m, 시·군은 geoBoundaries 등 **다른 자료**라서 크게 당기면
#   칠한 면이 먹선을 넘고, 도 선 옆에 시·군 선이 한 줄 더 생겼습니다(사용자: 「처음부터 그
#   구조로 가면 되는거 아니야?」 → 「진행해」).
#
# 어떻게(mkkr.pl 과 같은 수):
#   ① 그 나라 «시·군급» 자료(판)를 통째로 읽어 경계를 이음점~이음점의 **호**로 자르고,
#      호마다 한 번만 줄입니다 — 이웃이 같은 선을 씁니다(재 봄: 일본·독일·이탈리아·중국 모두
#      이웃끼리 변을 정확히 공유).
#   ② 판의 칸을 NE 주·도에 **투표로** 넣습니다(geoBoundaries 에는 «어느 주 소속»이 없습니다).
#      칸 안의 가로줄 네 개에서 속 구간의 가운데 점을 뽑아, 구간 길이만큼 표를 줍니다.
#   ③ 주·도 = 그 칸들의 안쪽 호를 지워 합친 것. 이름·차례는 NE 그대로(앱이 차례와 이름을 씀).
#   ④ 도시 시·군은 mkadm2.pl 의 규칙 그대로(든 칸 → 같은 칸의 다른 도시와 가운데 선으로 나누기 →
#      30km² 미만이면 윗단계로 올리기 → 섬 항목은 주·도의 그 섬) — 다만 **같은 호**로 만듭니다.
#
# ⚠ 미국은 판이 카운티(ADM2)입니다. 도시는 인구조사국의 시 경계(PLACE)·CCD 가 먼저인데, 그 둘은
#   도시 둘레만 받아 둔 것이라(tiger.pl) 나라를 다 덮지 않습니다 — 그래서 «따로 줄인» 도형으로
#   씁니다(전과 같음). 주 경계·해안은 카운티에서 옵니다.
# ⚠ 한국은 tools/mkkr.pl 입니다(통계청 코드로 시·도를 바로 압니다).
#
# 쓰는 법:  perl tools/mktopo.pl <나라> <원본폴더> <NE주도폴더> <도시.tsv> [--dry]
#   원본폴더: ISO3-ADMn.geojson (+ .meta.json). NE주도폴더: 구울 «전» adm1/XX.js 들
#     (다시 구울 때도 NE 를 기준으로 투표해야 하므로 따로 둡니다 — git 의 b786 판이나
#      tools/mkadm1.pl 로 만든 것).
#   도시.tsv: id · cc · country · 위도 · 경도 (살아 있는 앱에서 — 맨 아래 __END__)
#   --dry: 파일은 안 쓰고 잰 것만 보여 줍니다.

my ($cc, $원본, $NE, $tsv, $말리기) = @ARGV;
die "쓰는 법: perl tools/mktopo.pl <나라> <원본폴더> <NE주도폴더> <도시.tsv> [--dry]\n"
  unless $cc && $원본 && $NE && $tsv;
my $dry = ($말리기 // '') eq '--dry';

# 줄이는 폭 — 지도 단위(세로 500 = 180°). 0.006 ≈ 225m(mkkr.pl 과 같음). 나라별로 `%설정` 의 EPS 가 이깁니다.
my $섬최소; # 아래 `%설정` 뒤에서 정합니다    # km² — 이웃이 없는 섬·구멍이 이보다 작으면 버림
my $작다 = 30; my $올림한도 = 3000; my $붙임 = 3;   # mkadm2.pl 과 같음

my %ISO3 = (JP=>'JPN', US=>'USA', CN=>'CHN', CA=>'CAN', DE=>'DEU', CH=>'CHE', NL=>'NLD',
  AU=>'AUS', AT=>'AUT', NZ=>'NZL', FR=>'FRA', IN=>'IND', TR=>'TUR', ES=>'ESP', PT=>'PRT',
  IT=>'ITA', GR=>'GRC', TW=>'TWN', MX=>'MEX', TH=>'THA', FJ=>'FJI', ZA=>'ZAF', HR=>'HRV',
  DK=>'DNK', BO=>'BOL', FI=>'FIN', ID=>'IDN', MM=>'MMR', NP=>'NPL', CL=>'CHL');
# 판 = 호를 만드는 «나라를 다 덮는» 단계. 도시 = 도시 도형을 찾는 차례(mkadm2 의 %단계).
my %설정 = (
  US => { 판 => 'ADM2', 도시 => ['PLACE', 'CCD', 'ADM2'] },
  # 캐나다는 북극 섬들의 해안이 세계에서 가장 길어 0.006 이면 주·도가 2.8MB 입니다(재 봄).
  #   안쪽 경계는 그대로 두고 해안·국경만 0.03(≈1.1km), 30km² 미만 섬은 버립니다 → 약 660KB.
  CA => { 판 => 'ADM3', 도시 => ['ADM3', 'ADM2'], 해안 => 0.03, 섬 => 30 },
  DE => { 판 => 'ADM3' }, CH => { 판 => 'ADM3', 도시 => ['ADM3', 'ADM2'] },
  AT => { 판 => 'ADM3', 도시 => ['ADM3', 'ADM2'] }, NZ => { 판 => 'ADM3', 도시 => ['ADM3', 'ADM2'] },
  FR => { 판 => 'ADM5' }, ES => { 판 => 'ADM3', 도시 => ['ADM3', 'ADM2'] },
  IT => { 판 => 'ADM4', 도시 => ['ADM4', 'ADM3'] }, GR => { 판 => 'ADM3' },
  FJ => { 판 => 'ADM3', 도시 => ['ADM3', 'ADM2'] }, FI => { 판 => 'ADM3' }, CL => { 판 => 'ADM3', EPS => 0.01 },
  # 칠레·인도네시아는 섬·피오르가 수천이라 0.006 이면 1MB 에 가깝고 한 프레임이 무겁습니다(재 봄:
  #   칠레 3.4배 14.5ms). 0.01 ≈ 370m 로 넓힙니다 — 30배에서 0.31pt.
  ID => { 판 => 'ADM2', EPS => 0.01 },
);
my $EPS = $ENV{T_EPS} // $설정{$cc}{EPS} // 0.006;
$섬최소 = $ENV{T_ISLE} // $설정{$cc}{섬} // 0.5;   # km² — 이웃이 없는 섬·구멍이 이보다 작으면 버림
my $iso = $ISO3{$cc} or die "!! $cc: 모르는 나라\n";
my $판단계 = $설정{$cc}{판} // 'ADM2';
my @도시단계 = @{ $설정{$cc}{도시} // [$판단계] };
my %섬도시 = map { $_ => 1 } qw(mallorca bali okinawa);
my %합치기 = (ADM5 => sub { my $n = shift; $n =~ /^(.+?) \d+(?:e|er) Arrondissement$/ ? $1 : undef });

sub slurp { open my $h, '<:raw', $_[0] or die "$_[0]: $!\n"; local $/; my $t = <$h>; close $h; $t }
my $J = JSON::PP->new->utf8;
sub 조각들 {            # mkadm2.pl 과 같음 — 경계가 시작하는 자리로 자릅니다
  my ($파일, $할일) = @_;
  my $t = slurp($파일);
  my @시작; while ($t =~ /\{\s*"type":\s*"Feature"/g){ push @시작, $-[0] }
  for my $i (0 .. $#시작){
    my $끝 = $i < $#시작 ? $시작[$i+1] : length($t);
    my $조각 = substr($t, $시작[$i], $끝 - $시작[$i]);
    $조각 =~ s/[\s,]+$//;
    $조각 =~ s/\}\s*\].*\z/}/s if $i == $#시작;
    $할일->($조각);
  }
}
sub 도형읽기 {          # 조각 → { 이름, polys(경위도) }
  my $f = eval { $J->decode(shift) } or return;
  my $g = $f->{geometry} or return;
  my @polys = $g->{type} eq 'Polygon' ? ($g->{coordinates})
            : $g->{type} eq 'MultiPolygon' ? @{$g->{coordinates}} : ();
  return unless @polys;
  my $p = $f->{properties} || {};
  return { 이름 => $p->{shapeName} // $p->{NAME} // $p->{name} // '', polys => \@polys };
}
sub 출처 {
  my $m = "$원본/$iso-$_[0].meta.json";
  return '?' unless -s $m;
  my $j = eval { decode_json(slurp($m)) }; $j = $j->[0] if ref $j eq 'ARRAY';
  return $j ? (($j->{boundaryLicense} // '?') . ' · ' . ($j->{boundarySource} // '?')) : '?';
}

# ══ 1. NE 주·도 (이름·차례·투표 기준) ═══════════════════════════════════
my @단위;
{ my $t; { open my $h, '<:encoding(UTF-8)', "$NE/$cc.js" or die "$NE/$cc.js: $!\n"; local $/; $t = <$h> }
  while ($t =~ /\["([^"]*)","([^"]+)"\]/g){
    my ($이름, $d) = ($1, $2);
    push @단위, { 이름 => $이름, 원길 => $d, 고리 => 길풀기($d), 칸 => [] };
  }
  for my $u (@단위){ $u->{상자} = 상자($u->{고리}) } }
printf "%s %s: NE 주·도 %d · 판 %s\n", $cc, $iso, scalar @단위, $판단계;

# ══ 2. 판 읽기 · 점 번호 ═══════════════════════════════════════════════
my (@VX, @VY, %VID, @U);
sub vid { my $k = sprintf('%.7f %.7f', $_[0], $_[1]); my $i = $VID{$k};
  return $i if defined $i; push @VX, $_[0]+0; push @VY, $_[1]+0; return $VID{$k} = $#VX }
조각들("$원본/$iso-$판단계.geojson", sub {
  my $b = 도형읽기(shift) or return;
  my @P;
  for my $pl (@{$b->{polys}}){
    my @R;
    for my $r (@$pl){
      my @k; for my $c (@$r){ my $v = vid(@$c); push @k, $v unless @k && $k[-1] == $v }
      pop @k if @k > 1 && $k[0] == $k[-1];
      push @R, \@k if @k >= 3;
    }
    push @P, \@R if @R;
  }
  push @U, { 이름 => $b->{이름}, polys => \@P } if @P;
});
%VID = ();                                   # 이제 필요 없습니다(메모리)
printf "  판 칸 %d · 점 %d\n", scalar @U, scalar @VX;

# ══ 3. 변 · 이음점 · 호 ═══════════════════════════════════════════════════
my %E;
for my $ui (0 .. $#U){ for my $pl (@{$U[$ui]{polys}}){ for my $r (@$pl){
  my $n = @$r;
  for my $i (0 .. $n-1){
    my ($a, $b) = ($r->[$i], $r->[($i+1) % $n]); next if $a == $b;
    my $k = $a < $b ? "$a $b" : "$b $a";
    $E{$k} = defined $E{$k} ? "$E{$k},$ui" : "$ui";
  } } } }
my (@DEG, @SIG, @J);
{ my ($공유, $혼자) = (0, 0);
  while (my ($k, $own) = each %E){
    my ($p, $q) = split / /, $k;
    my $sig = join(',', sort { $a <=> $b } split /,/, $own);
    $E{$k} = $sig;
    if ($sig =~ /,/){ $공유++ } else { $혼자++ }
    for my $v ($p, $q){
      $DEG[$v]++;
      if (!defined $SIG[$v]){ $SIG[$v] = $sig } elsif ($SIG[$v] ne $sig){ $J[$v] = 1 }
    }
  }
  for my $v (0 .. $#VX){ $J[$v] = 1 if ($DEG[$v] // 0) != 2 }
  @SIG = (); @DEG = ();
  printf "  변: 둘이 같이 씀 %d · 혼자(해안·국경) %d\n", $공유, $혼자 }

my %ARC;
sub 변서명 { my ($a, $b) = @_; $E{ $a < $b ? "$a $b" : "$b $a" } }
sub 호열쇠 {
  my ($seq) = @_;
  my ($a, $z) = ($seq->[0], $seq->[-1]);
  my $rev = $a != $z ? ($a > $z) : (@$seq > 2 && $seq->[1] > $seq->[-2]);
  my @c = $rev ? reverse @$seq : @$seq;
  my $key = "$c[0] $c[1] $c[-2] $c[-1] " . scalar @c;
  $ARC{$key} //= { k => \@c, 주인 => [ split /,/, 변서명($c[0], $c[1]) ] };
  return [$key, $rev ? 1 : 0];
}
sub 고리호들 {
  my ($r) = @_; my $n = @$r;
  my @j = grep { $J[$r->[$_]] } 0 .. $n-1;
  unless (@j){
    my $m = 0; for (1 .. $n-1){ $m = $_ if $r->[$_] < $r->[$m] }
    return [ 호열쇠([ @$r[$m .. $n-1], @$r[0 .. $m-1], $r->[$m] ]) ];
  }
  my @out;
  for my $t (0 .. $#j){
    my ($i0, $i1) = ($j[$t], $j[($t+1) % @j]);
    my @s = ($r->[$i0]); my $i = $i0;
    do { $i = ($i + 1) % $n; push @s, $r->[$i] } until $i == $i1;
    push @out, 호열쇠(\@s);
  }
  return \@out;
}
for my $u (@U){ $u->{호} = [ map { [ map { 고리호들($_) } @$_ ] } @{$u->{polys}} ] }
%E = (); @J = ();

# ══ 4. 호마다 한 번 줄이기 ═══════════════════════════════════════════════
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
sub 지도xy { [ ($_[0]+180)/360*1000, (90-$_[1])/180*500 ] }
sub 점지도 { 지도xy($VX[$_[0]], $VY[$_[0]]) }
sub 고리줄이기 {        # 닫힌 고리 — 가장 먼 점에서 둘로 나눠 줄입니다
  my ($p, $eps) = @_;
  my ($far, $best) = (1, -1);
  for my $i (1 .. $#$p-1){ my $d = ($p->[$i][0]-$p->[0][0])**2 + ($p->[$i][1]-$p->[0][1])**2;
    if ($d > $best){ $best = $d; $far = $i } }
  my $l = 줄이기([@$p[0 .. $far]], $eps); my $r = 줄이기([@$p[$far .. $#$p]], $eps);
  pop @$l; return [@$l, @$r];
}
{ my ($전, $후) = (0, 0);
  for my $a (values %ARC){
    my @p = map { 점지도($_) } @{$a->{k}};
    $전 += @p;
    # 해안·국경(이웃이 없는 호)은 나라에 따라 더 넓게 줄입니다(`%설정` 의 해안). 호마다 한 벌이라
    # 칠·선이 맞는 성질은 그대로입니다 — 그 호를 쓰는 주·도와 시·군이 같은 점을 씁니다.
    my $e = @{$a->{주인}} > 1 ? $EPS : ($ENV{T_COAST} // $설정{$cc}{해안} // $EPS);
    $a->{s} = $a->{k}[0] == $a->{k}[-1] ? 고리줄이기(\@p, $e) : 줄이기(\@p, $e);
    $후 += @{$a->{s}};
  }
  printf "  호 %d · 점 %d → %d\n", scalar keys %ARC, $전, $후 }

sub 호점 { my ($h) = @_; my $s = $ARC{$h->[0]}{s}; $h->[1] ? [reverse @$s] : $s }
sub 고리잇기 {
  my ($hs) = @_; my @pt;
  for my $h (@$hs){ my $s = 호점($h); push @pt, @pt ? @$s[1 .. $#$s] : @$s }
  pop @pt if @pt > 1 && $pt[0][0] == $pt[-1][0] && $pt[0][1] == $pt[-1][1];
  return \@pt;
}
sub 넓이km {
  my $r = shift; my $n = @$r; return 0 if $n < 3;
  my ($s, $y0) = (0, 0); $y0 += $_->[1] for @$r; $y0 /= $n;
  my $lat = 90 - $y0/500*180;
  for (my $i = 0, my $j = $n - 1; $i < $n; $j = $i++){ $s += $r->[$j][0]*$r->[$i][1] - $r->[$i][0]*$r->[$j][1] }
  return abs($s)/2 * (0.36*111.32*cos($lat*3.14159265/180)) * (0.36*110.57);
}

# ══ 5. 작은 섬·구멍 버리기(이웃이 없는 고리만) ═══════════════════════════════
{ my ($섬, $구멍) = (0, 0);
  for my $u (@U){
    my @새;
    for my $pl (@{$u->{호}}){
      my $홀로 = sub { !grep { @{$ARC{$_->[0]}{주인}} > 1 } @{$_[0]} };
      my ($바깥, @안) = @$pl;
      if ($홀로->($바깥) && 넓이km(고리잇기($바깥)) < $섬최소){ $섬++; next }
      my @남긴 = grep { !($홀로->($_) && 넓이km(고리잇기($_)) < $섬최소) or do { $구멍++; 0 } } @안;
      push @새, [$바깥, @남긴];
    }
    $u->{호} = \@새;
  }
  printf "  버린 섬 %d · 버린 구멍 %d\n", $섬, $구멍 }

# ══ 6. 합치기(안쪽 호 지우기) ═════════════════════════════════════════════
sub 합치기 {
  my @uis = @_;
  my (%cnt, @occ);
  for my $ui (@uis){ for my $pl (@{$U[$ui]{호}}){ for my $ring (@$pl){ for my $h (@$ring){
    push @occ, $h; $cnt{$h->[0]}++ } } } }
  my @b = grep { $cnt{$_->[0]} == 1 } @occ;
  my %from;
  for my $i (0 .. $#b){ my $k = $ARC{$b[$i][0]}{k};
    my ($s, $e) = $b[$i][1] ? ($k->[-1], $k->[0]) : ($k->[0], $k->[-1]);
    push @{$from{$s}}, [$i, $e] }
  my (%used, @rings, $끊김);
  for my $i (0 .. $#b){
    next if $used{$i};
    $used{$i} = 1; my @hs = ($b[$i]); my $k = $ARC{$b[$i][0]}{k};
    my ($s0, $cur) = $b[$i][1] ? ($k->[-1], $k->[0]) : ($k->[0], $k->[-1]);
    my $ok = 1;
    while ($cur != $s0){
      my ($nx) = grep { !$used{$_->[0]} } @{$from{$cur} || []};
      unless ($nx){ $ok = 0; last }
      $used{$nx->[0]} = 1; push @hs, $b[$nx->[0]]; $cur = $nx->[1];
    }
    # 넓이가 거의 0 인 고리는 합칠 때 남은 찌꺼기입니다(mkkr.pl 과 같음)
    if ($ok){ my $r = 고리잇기(\@hs); push @rings, $r if @$r >= 3 && 넓이km($r) >= 0.01 }
    else { $끊김++ }
  }
  warn "  !! 끊긴 고리 ${끊김}개\n" if $끊김;
  return \@rings;
}

# ── 길 ─────────────────────────────────────────────────────────────────
sub 길 {
  my $r = shift;
  my $f = sub { my $t = sprintf('%.3f', shift); $t =~ s/\.?0+$// if $t =~ /\./;
                $t = '0' if $t eq '' || $t eq '-0'; $t };
  my ($px, $py); my $d = ''; my $n = 0;
  for my $i (0 .. $#$r){
    my ($x, $y) = @{$r->[$i]};
    if ($i == 0){ $d .= 'M'.$f->($x).' '.$f->($y).'l'; ($px,$py) = (sprintf('%.3f',$x)+0, sprintf('%.3f',$y)+0); $n++; next }
    my ($ax, $ay) = (sprintf('%.3f', $x-$px)+0, sprintf('%.3f', $y-$py)+0);
    next if $ax == 0 && $ay == 0;
    $d .= $f->($ax).' '.$f->($ay).' ';
    $px += $ax; $py += $ay; $n++;
  }
  return '' if $n < 3;
  $d =~ s/\s+$//;
  return $d.'Z';
}
sub 길들 { join '', map { 길($_) } @{$_[0]} }
sub 길풀기 {
  my $d = shift; my @r; my ($x, $y) = (0, 0); my $cur;
  while ($d =~ /([MlZ])([^MlZ]*)/g){
    my ($c, $a) = ($1, $2); my @n = $a =~ /(-?[\d.]+)/g;
    if ($c eq 'M'){ ($x,$y) = @n[0,1]; $cur = [[$x,$y]]; push @r, $cur }
    elsif ($c eq 'l'){ for (my $i = 0; $i+1 < @n; $i += 2){ $x += $n[$i]; $y += $n[$i+1]; push @$cur, [$x,$y] } } }
  return \@r;
}
sub 상자 { my $r = shift; my ($x0,$x1,$y0,$y1) = (1e9,-1e9,1e9,-1e9);
  for my $q (@$r){ for (@$q){ $x0=$_->[0] if $_->[0]<$x0; $x1=$_->[0] if $_->[0]>$x1; $y0=$_->[1] if $_->[1]<$y0; $y1=$_->[1] if $_->[1]>$y1 } }
  [$x0,$x1,$y0,$y1] }
sub 안에 {             # 짝수-홀수 — 지도 단위
  my ($x, $y, $고리들) = @_; my $in = 0;
  for my $r (@$고리들){ my $n = @$r;
    for (my $i = 0, my $j = $n - 1; $i < $n; $j = $i++){
      my ($xi,$yi) = @{$r->[$i]}; my ($xj,$yj) = @{$r->[$j]};
      $in = !$in if (($yi > $y) != ($yj > $y)) && $x < ($xj-$xi)*($y-$yi)/(($yj-$yi)||1e-12)+$xi } }
  return $in }
sub 경계거리 {
  my ($x, $y, $고리들) = @_; my $최소 = 1e18;
  for my $r (@$고리들){ my $n = @$r;
    for (my $i = 0, my $j = $n - 1; $i < $n; $j = $i++){
      my ($x1,$y1) = @{$r->[$j]}; my ($x2,$y2) = @{$r->[$i]};
      my ($dx,$dy) = ($x2-$x1, $y2-$y1); my $L = $dx*$dx + $dy*$dy;
      my $t = $L ? (($x-$x1)*$dx + ($y-$y1)*$dy)/$L : 0; $t = 0 if $t < 0; $t = 1 if $t > 1;
      my ($ex,$ey) = ($x1 + $t*$dx - $x, $y1 + $t*$dy - $y); my $d = sqrt($ex*$ex + $ey*$ey);
      $최소 = $d if $d < $최소 } }
  return $최소 }

# ══ 7. 판의 칸 → NE 주·도 (투표) ═════════════════════════════════════════
# 칸의 원본(안 줄인) 고리를 지도 단위로 — 투표할 때 만들고 버립니다. 도시 찾기에 쓰는 칸만
# 들고 있습니다(`원고리`). 프랑스 코뮌 35,010개를 다 들고 있으면 메모리가 모자랍니다.
sub 원고리계산 { my $ui = shift; [ map { [ map { 점지도($_) } @$_ ] } map { @$_ } @{$U[$ui]{polys}} ] }
sub 원고리 { my $ui = shift; $U[$ui]{원고리} //= 원고리계산($ui) }
sub 속점들 {            # 가로줄 네 개에서 «속 구간»의 가운데 점과 그 길이
  my ($고리들, $상자) = @_; my @out;
  for my $f (0.2, 0.4, 0.6, 0.8){
    my $y = $상자->[2] + ($상자->[3] - $상자->[2]) * $f;
    my @x;
    for my $r (@$고리들){ my $n = @$r;
      for (my $i = 0, my $j = $n - 1; $i < $n; $j = $i++){
        my ($xi,$yi) = @{$r->[$i]}; my ($xj,$yj) = @{$r->[$j]};
        push @x, ($xj-$xi)*($y-$yi)/(($yj-$yi)||1e-12)+$xi if ($yi > $y) != ($yj > $y) } }
    @x = sort { $a <=> $b } @x;
    for (my $i = 0; $i+1 < @x; $i += 2){ push @out, [ ($x[$i]+$x[$i+1])/2, $y, $x[$i+1]-$x[$i] ] }
  }
  return \@out;
}
{ my ($표없음, $붙인) = (0, 0);
  for my $ui (0 .. $#U){
    my $u = $U[$ui];
    my $rg = 원고리계산($ui);
    $u->{상자} = 상자($rg);
    my $점 = 속점들($rg, $u->{상자});
    $u->{속점} = @$점 ? (sort { $b->[2] <=> $a->[2] } @$점)[0] : [ @{$rg->[0][0]}, 0 ];
    my %표;
    for my $p (@$점){ for my $di (0 .. $#단위){ my $d = $단위[$di]; my ($x0,$x1,$y0,$y1) = @{$d->{상자}};
      next if $p->[0] < $x0 || $p->[0] > $x1 || $p->[1] < $y0 || $p->[1] > $y1;
      if (안에($p->[0], $p->[1], $d->{고리})){ $표{$di} += $p->[2] || 1e-9; last } } }
    my ($best) = sort { $표{$b} <=> $표{$a} } keys %표;
    unless (defined $best){             # 어느 주·도에도 안 들면 — 경계가 가장 가까운 곳(150km 안)
      my ($x, $y) = @{$u->{속점}}; my $가장 = 3.75;
      for my $di (0 .. $#단위){ my ($x0,$x1,$y0,$y1) = @{$단위[$di]{상자}};
        next if $x < $x0-$가장 || $x > $x1+$가장 || $y < $y0-$가장 || $y > $y1+$가장;
        my $d = 경계거리($x, $y, $단위[$di]{고리}); if ($d < $가장){ $가장 = $d; $best = $di } }
      if (defined $best){ $붙인++ } else { $표없음++ }
    }
    next unless defined $best;
    $u->{단위} = $best;
    push @{$단위[$best]{칸}}, $ui;
  }
  printf "  투표: 붙인 칸 %d · 못 넣은 칸 %d(버림)\n", $붙인, $표없음 }

# ══ 8. 주·도 굽기 ══════════════════════════════════════════════════════════
my ($옛합, $새합) = (0, 0);
for my $d (@단위){
  my $옛 = 0; $옛 += 넓이km($_) for @{$d->{고리}};   # 짝수-홀수라 구멍도 더해지는 대강 — 비교용
  $옛합 += $옛;
  unless (@{$d->{칸}}){      # 판에 없는 곳(네덜란드의 카리브 섬들) — NE 모양 그대로 둡니다
    $d->{길} = $d->{원길}; $d->{새고리} = $d->{고리}; $d->{새상자} = $d->{상자};
    printf "  -- %s: 판에 없음 — NE 모양 그대로\n", 이름풀기($d->{이름}); next }
  my $rings = 합치기(@{$d->{칸}});
  $d->{길} = 길들($rings);
  $d->{새고리} = 길풀기($d->{길});
  $d->{새상자} = 상자($d->{새고리});
  my $새 = 0; $새 += 넓이km($_) for @{$d->{새고리}};
  $새합 += $새;
  my $점 = 0; $점 += @$_ for @{$d->{새고리}};
  $d->{보고} = sprintf "%-24s 칸 %4d · 고리 %3d · 점 %6d · 넓이 %.2f배", 이름풀기($d->{이름}),
    scalar @{$d->{칸}}, scalar @{$d->{새고리}}, $점, $옛 ? $새/$옛 : 0;
}
print "  $_->{보고}\n" for grep { $_->{보고} } @단위;
printf "  넓이 합: NE %.0fkm² → 새 %.0fkm² (%.3f배)\n", $옛합, $새합, $옛합 ? $새합/$옛합 : 0;

# ── 물까지 칸에 넣은 자료인가 ─────────────────────────────────────────────
# ⚠ 「새 해안이 NE 땅 밖으로 나간 비율」로 재 봤더니 일본·독일까지 다 걸렸습니다 — NE 에 없던
#   작은 섬들 때문입니다. 쓸모 있던 것은 **주·도별 넓이 비**였습니다: 물이 든 곳은 한 주·도가
#   통째로 부풉니다(네덜란드 제일란트 1.59·프리슬란트 1.47, 피지 동부 1.37). 1.15 넘는 곳을 적습니다.
#   ⚠ 섬이 많은 곳(핀란드 남서부 1.15)이나 분쟁 경계(인도 라다크 1.48)도 걸리므로 눈으로 보고 정합니다.
{ my @의심 = map { $_->{보고} =~ /넓이 ([0-9.]+)배/ && $1 > 1.15 ? sprintf('%s %.2f', 이름풀기($_->{이름}), $1) : () } grep { $_->{보고} } @단위;
  print "  ⚠ 넓이가 1.15배 넘게 부푼 주·도(물·분쟁 경계 의심): ", join(', ', @의심), "\n" if @의심 }

sub 이름풀기 {           # 두 번 인코딩된 이름을 풉니다(앱의 `이름풀기` 와 같은 뜻). 안 되면 그대로.
  my $s = shift; my @c = map { ord } split //, $s;
  return $s if grep { $_ > 255 } @c;
  my $b = pack('C*', @c);
  return utf8::decode($b) ? $b : $s }

# ══ 9. 도시 → 주·도 (citymap.js 의 `짜기` 와 같은 순서) ══════════════════════
my @도시;
{ open my $h, '<:encoding(UTF-8)', $tsv or die "$tsv: $!\n";
  while (<$h>){ s/\r?\n$//; next unless /\S/;
    my ($id, $c, $나라, $lat, $lng) = split /\t/;
    next unless $c eq $cc;
    push @도시, { id => $id, 나라 => $나라 || $c, lat => $lat+0, lng => $lng+0,
                  x => ($lng+180)/360*1000, y => (90-$lat)/180*500 } }
  close $h }
my @쓸단위 = grep { $_->{새고리} && @{$_->{새고리}} } @단위;
my @작은것부터 = sort { ($a->{새상자}[1]-$a->{새상자}[0])*($a->{새상자}[3]-$a->{새상자}[2])
                    <=> ($b->{새상자}[1]-$b->{새상자}[0])*($b->{새상자}[3]-$b->{새상자}[2]) } @쓸단위;
for my $c (@도시){
  my $u;
  for my $v (@작은것부터){ my ($x0,$x1,$y0,$y1) = @{$v->{새상자}};
    next if $c->{x} < $x0 || $c->{x} > $x1 || $c->{y} < $y0 || $c->{y} > $y1;
    if (안에($c->{x}, $c->{y}, $v->{새고리})){ $u = $v; last } }
  if (!$u && $c->{나라} eq $cc){ my $가장 = 3.75;
    for my $v (@쓸단위){ my ($x0,$x1,$y0,$y1) = @{$v->{새상자}};
      next if $c->{x} < $x0-$가장 || $c->{x} > $x1+$가장 || $c->{y} < $y0-$가장 || $c->{y} > $y1+$가장;
      my $d = 경계거리($c->{x}, $c->{y}, $v->{새고리}); if ($d < $가장){ $가장 = $d; $u = $v } } }
  if ($u){ push @{$u->{도시}}, $c } else { print "  -- $c->{id}: 어느 주·도에도 안 듦(속령이거나 멂)\n" }
}

# ══ 10. 도시 시·군 ═══════════════════════════════════════════════════════
sub km거리 { my ($a, $b) = @_; my $kx = 111.32 * cos(($a->{lat}+$b->{lat})/2 * 3.14159265/180);
  sqrt((($a->{lng}-$b->{lng})*$kx)**2 + (($a->{lat}-$b->{lat})*110.57)**2) }
sub 점거리km {          # 지도 단위 고리까지 km(대강 — 붙임 3km 판정용)
  my ($c, $고리들) = @_; my $d = 경계거리($c->{x}, $c->{y}, $고리들);
  return $d * 0.36 * 110.57 }
sub 반평면자르기 {
  my ($r, $a, $b, $c) = @_; my @out; my $n = @$r; return [] unless $n;
  for my $i (0 .. $n-1){
    my $P = $r->[$i]; my $Q = $r->[($i+1) % $n];
    my $fp = $a*$P->[0] + $b*$P->[1] - $c; my $fq = $a*$Q->[0] + $b*$Q->[1] - $c;
    push @out, $P if $fp <= 0;
    if (($fp <= 0) != ($fq <= 0)){ my $t = $fp / ($fp - $fq);
      push @out, [ $P->[0] + $t*($Q->[0]-$P->[0]), $P->[1] + $t*($Q->[1]-$P->[1]) ] } }
  return \@out }
sub 나누기 {           # 고리들에서 도시 $d 쪽(같이 든 도시들보다 가까운 곳)만
  my ($d, $rings, $남들) = @_;
  my $kx = cos($d->{lat} * 3.14159265/180);
  my @새 = map { [ map { [ $_->[0]*$kx, $_->[1] ] } @$_ ] } @$rings;
  for my $o (@$남들){
    my ($ax,$ay) = ($d->{x}*$kx, $d->{y}); my ($bx,$by) = ($o->{x}*$kx, $o->{y});
    my ($A, $B, $C) = (2*($bx-$ax), 2*($by-$ay), ($bx*$bx+$by*$by) - ($ax*$ax+$ay*$ay));
    @새 = grep { @$_ >= 3 } map { 반평면자르기($_, $A, $B, $C) } @새;
  }
  return [ map { [ map { [ $_->[0]/$kx, $_->[1] ] } @$_ ] } @새 ];
}
sub 넓이들 { my $s = 0; $s += 넓이km($_) for @{$_[0]}; $s }   # 짝수-홀수 대강
sub 칸찾기 {            # 판에서 도시가 든 칸(원본 고리), 없으면 3km 안의 가장 가까운 칸
  my ($c, $후보) = @_;
  for my $ui (@$후보){ my ($x0,$x1,$y0,$y1) = @{$U[$ui]{상자}};
    next if $c->{x} < $x0 || $c->{x} > $x1 || $c->{y} < $y0 || $c->{y} > $y1;
    return ($ui, 0) if 안에($c->{x}, $c->{y}, 원고리($ui)) }
  my ($가장, $몇) = (undef, $붙임);
  for my $ui (@$후보){ my ($x0,$x1,$y0,$y1) = @{$U[$ui]{상자}};
    next if $c->{x} < $x0-0.1 || $c->{x} > $x1+0.1 || $c->{y} < $y0-0.1 || $c->{y} > $y1+0.1;
    my $k = 점거리km($c, 원고리($ui)); if ($k < $몇){ $몇 = $k; $가장 = $ui } }
  return ($가장, $가장 ? $몇 : undef);
}
# 판이 아닌 단계(미국 PLACE·CCD, 윗단계 올림)의 도형 — 도시 둘레만 읽습니다
my %바깥;
sub 바깥읽기 {
  my ($L) = @_;
  return $바깥{$L} if $바깥{$L};
  my @b; my $f = "$원본/$iso-$L.geojson";
  unless (-s $f){ print "  !! $iso-$L.geojson 없음\n"; return $바깥{$L} = [] }
  조각들($f, sub {
    my $조각 = shift;
    my $c = index($조각, '"coordinates"'); return if $c < 0;
    my ($x0,$x1,$y0,$y1) = (1e9,-1e9,1e9,-1e9);
    my $좌표 = substr($조각, $c);
    while ($좌표 =~ /\[\s*(-?[\d.]+(?:[eE][-+]?\d+)?)\s*,\s*(-?[\d.]+(?:[eE][-+]?\d+)?)\s*\]/g){
      $x0 = $1 if $1 < $x0; $x1 = $1 if $1 > $x1; $y0 = $2 if $2 < $y0; $y1 = $2 if $2 > $y1; }
    return unless grep { $_->{lng} >= $x0-0.05 && $_->{lng} <= $x1+0.05
                      && $_->{lat} >= $y0-0.05 && $_->{lat} <= $y1+0.05 } @도시;
    my $g = 도형읽기($조각) or return;
    my $원 = [ map { [ map { [ map { 지도xy(@$_) } @$_ ] } @$_ ] } @{$g->{polys}} ];
    my $고리 = [ map { @$_ } @$원 ];
    push @b, { 이름 => $g->{이름}, 원 => $원, 고리 => $고리, 상자 => 상자($고리) };
  });
  return $바깥{$L} = \@b;
}
sub 바깥찾기 { my ($c, $L) = @_;
  for my $b (@{ 바깥읽기($L) }){ my ($x0,$x1,$y0,$y1) = @{$b->{상자}};
    next if $c->{x} < $x0 || $c->{x} > $x1 || $c->{y} < $y0 || $c->{y} > $y1;
    return $b if 안에($c->{x}, $c->{y}, $b->{고리}) }
  return undef }
sub 따로줄이기 {        # 판 밖 도형(미국 PLACE·CCD) — 고리마다 줄입니다(전과 같음)
  my ($원) = @_; my @r;
  for my $pl (@$원){ for my $ring (@$pl){
    my $s = 고리줄이기([@$ring, $ring->[0]], $EPS); pop @$s if @$s > 1;
    push @r, $s if @$s >= 3 && 넓이km($s) >= 0.02 } }
  return \@r }

my (%결과, @기록);
for my $u (@쓸단위){
  my @g = @{ $u->{도시} || [] };
  next if @g < 2;
  my $단위km = 넓이들($u->{새고리});
  my @후보 = @{$u->{칸}};
  for my $d (@g){
    my @남 = grep { $_ != $d && km거리($d, $_) > 2 } @g;
    my ($rings, $어떻게);
    # ① 섬 항목 — 새 주·도에서 점이 든 섬 하나
    if ($섬도시{$d->{id}}){
      my ($섬) = grep { 안에($d->{x}, $d->{y}, [$_]) } @{$u->{새고리}};
      if ($섬){ $결과{$d->{id}} = 길($섬);
        push @기록, sprintf '  %s: 섬 하나(주·도) %.0fkm²', $d->{id}, 넓이km($섬); next }
    }
    # ② 도시 단계 차례대로(미국: PLACE → CCD → 판). 판이면 같은 호로 만듭니다.
    my ($단계, $이름, $판칸, $바깥도형, $몇);
    for my $L (@도시단계){
      if ($L eq $판단계){ my ($ui, $k) = 칸찾기($d, \@후보); next unless defined $ui;
        ($단계, $판칸, $몇, $이름) = ($L, $ui, $k, $U[$ui]{이름}); last }
      my $b = 바깥찾기($d, $L); next unless $b;
      ($단계, $바깥도형, $이름) = ($L, $b, $b->{이름}); last;
    }
    unless ($단계){ push @기록, "  $d->{id}: 시·군 경계 없음(점으로)"; next }
    if (defined $판칸){
      my @무리 = ($판칸);
      if (my $규칙 = $합치기{$판단계}){ my $머리 = $규칙->($이름);
        if (defined $머리){ @무리 = grep { my $m = $규칙->($U[$_]{이름}); defined $m && $m eq $머리 } @후보;
          $이름 = "$머리(" . scalar(@무리) . '개 합침)' } }
      $rings = 합치기(@무리);
      $d->{무리} = \@무리;
    } else { $rings = 따로줄이기($바깥도형->{원}) }
    my @같이 = grep { my $o = $_; defined $판칸 ? (grep { 안에($o->{x}, $o->{y}, 원고리($_)) } @{$d->{무리}})
                                                 : 안에($o->{x}, $o->{y}, $바깥도형->{고리}) } @남;
    if (@같이){
      $rings = 나누기($d, $rings, \@같이);
      $어떻게 = sprintf '%s 를 %s 와 나눔', $이름, join('·', map { $_->{id} } @같이);
    } else {
      my $a = 넓이들($rings);
      $어떻게 = sprintf '%s %.0fkm²%s', $이름, $a, $몇 ? sprintf(' (경계까지 %.1fkm)', $몇) : '';
      # ③ 너무 작으면 윗단계로 — 판 칸의 모임(같은 호) 또는 판 밖 도형
      if ($a < $작다){
        my @위 = @도시단계; shift @위 while @위 && $위[0] ne $단계; shift @위;
        올림: for my $L (@위){
          my @후보형;
          if ($L eq $판단계){ my ($ui) = 칸찾기($d, \@후보); next unless defined $ui;
            push @후보형, [ 합치기($ui), $U[$ui]{이름} ] }
          else {
            my $b = 바깥찾기($d, $L) or next;
            # 판 칸 가운데 속점이 이 윗단계 도형 안에 드는 것들을 모아 같은 호로 만듭니다
            my @모임 = grep { my $p = $U[$_]{속점}; 안에($p->[0], $p->[1], $b->{고리}) } @후보;
            push @후보형, [ @모임 ? 합치기(@모임) : 따로줄이기($b->{원}), $b->{이름} ];
          }
          for my $후 (@후보형){
            my ($r, $n) = @$후; next unless @$r;
            my @형 = ($r);
            my ($섬) = grep { 안에($d->{x}, $d->{y}, [$_]) } @$r;
            push @형, [$섬] if $섬 && @$r > 1;
            for my $f (@형){
              my $b = 넓이들($f);
              next if $b > $올림한도 || $b > $단위km / 3;
              next if grep { 안에($_->{x}, $_->{y}, $f) } @남;
              $rings = $f; $어떻게 .= sprintf ' → %s%s %.0fkm²', $n, $f == $r ? '' : '(섬)', $b;
              last 올림;
            }
          }
        }
      }
    }
    my $d길 = 길들($rings);
    unless ($d길){ push @기록, "  $d->{id}: 굽고 나니 빈 경계(점으로)"; next }
    $결과{$d->{id}} = $d길;
    push @기록, "  $d->{id}: $어떻게";
  }
}
print "  시·군:\n", join("\n", @기록), "\n" if @기록;

# ══ 11. 쓰기 ═════════════════════════════════════════════════════════════
my $출처판 = 출처($판단계);
my $adm1 = "/* 주·도 경계 — tools/mktopo.pl 이 굽습니다(b787). 손으로 고치지 마십시오.\n"
         . "   모양: geoBoundaries $iso $판단계 를 합친 것($출처판). 이름·차례: Natural Earth 10m.\n"
         . "   ⚠ adm2/$cc.js 와 «같은 선»입니다(같이 굽습니다). 이름은 다른 adm1 처럼 두 번 인코딩. */\n"
         . "export default [\n"
         . join(",\n", map { qq{["$_->{이름}","$_->{길}"]} } @단위) . "\n];\n";
my $adm2 = "/* 시·군 경계 — tools/mktopo.pl 이 굽습니다(b787, 전에는 mkadm2.pl). 손으로 고치지 마십시오.\n"
         . "   출처: geoBoundaries — " . join(' / ', map { "$iso $_: " . 출처($_) } grep { $_ ne 'PLACE' && $_ ne 'CCD' } @도시단계)
         . ($cc eq 'US' ? ' / U.S. Census Bureau TIGER (PLACE·CCD)' : '') . "\n"
         . "   ⚠ adm1/$cc.js 와 «같은 선»입니다 — 이웃 시·군, 주·도 경계, 해안선이 같은 호를 씁니다. */\n"
         . "export default {\n"
         . join(",\n", map { qq{"$_":"$결과{$_}"} } sort keys %결과) . "\n};\n";
printf "  → adm1 %.1fKB · adm2 %d곳 %.1fKB%s\n", length($adm1)/1024, scalar keys %결과, length($adm2)/1024,
  $dry ? ' (--dry: 안 씀)' : '';
unless ($dry){
  for ([ "adm1/$cc.js", $adm1 ], [ "adm2/$cc.js", $adm2 ]){
    open my $o, '>:encoding(UTF-8)', $_->[0] or die "$_->[0]: $!\n"; print $o $_->[1]; close $o }
}

__END__
도시 목록 뽑기 — 살아 있는 앱(로그인 없이)의 콘솔에서:

  const v = [...document.scripts].map(s => s.src).find(s => /app\.js\?v=/.test(s)).match(/v=(b\d+)/)[1];
  const C = await import(`./cities.js?v=${v}`);
  copy(C.cities.filter(c => (c.center_lat ?? c.lat) != null).map(c => [c.id, c.cc, c.country || '',
    (+(c.center_lat ?? c.lat)).toFixed(5), (+(c.center_lng ?? c.lng)).toFixed(5)].join('\t')).join('\n'));

그다음(travel-v2 에서) 나라마다:
  perl tools/mktopo.pl JP <원본> <NE주도> 도시.tsv --dry     ← 먼저 재 보고
  perl tools/mktopo.pl JP <원본> <NE주도> 도시.tsv           ← 씁니다
⚠ 다시 구우면 citymap.js 의 MAP_V · 시군V 를 올립니다.
⚠ «넓이 합»이 NE 보다 눈에 띄게 크면(1.05배 넘게) 그 자료는 물(만·호수)까지 칸에 넣은 것입니다.
  해안이 바다로 번지므로 그 나라는 쓰지 말고 NE 로 두십시오.
