use strict; use warnings; use utf8;
no warnings 'recursion';
use JSON::PP;
use Encode qw(encode decode);
binmode STDOUT, ':encoding(UTF-8)'; binmode STDERR, ':encoding(UTF-8)';

# ── 한국의 시·도(adm1/KR.js)와 도시 시·군(adm2/KR.js)을 «한 벌의 선»으로 굽기 (b786) ──
#
# 왜 있나: 사용자 사진 「아직 삐뚤빼뚤하고 경계 안맞는 부분들이 있는데?」(30배쯤).
#   ① 시·도는 Natural Earth 10m 였습니다 — **대전이 점 19개, 광주 10개, 서울 30개**.
#      30배(1km ≈ 0.85pt)에서 각지고, 실제 경계와 1~2km 어긋납니다.
#   ② 시·군은 통계청 2018(수천 점)인데 mkadm2.pl 이 **시·군마다 따로** 줄여서,
#      붙어 있는 두 시·군의 경계조차 서로 조금씩 달랐습니다.
#   → 칠한 면이 먹선을 넘거나 모자라고, 도 선 옆에 시·군 선이 한 줄 더 생겼습니다.
#
# 어떻게: 통계청 시군구 250개가 경계 점을 **정확히 공유**합니다(재 봄: 두 곳이 같이 쓰는
#   변 81,537개, 나머지는 해안). 그래서 TopoJSON 과 같은 수를 씁니다 —
#   ① 경계를 «이음점(셋 이상이 만나거나 이웃이 바뀌는 점)에서 이음점까지»의 호로 자르고
#   ② 호마다 **한 번만** 줄여서(더글러스-포이커) 양쪽이 같은 점을 쓰게 하고
#   ③ 시·도는 그 시군구들을 «안쪽 호를 지워» 합쳐 만듭니다(해안선도 같은 호).
#   그러면 시·도 선 · 시·군 선 · 칠한 면의 가장자리가 **같은 선**입니다.
#
# ⚠ 시·도의 이름과 차례는 예전 adm1/KR.js 와 같습니다 — 앱(citymap.js)이 도시를 단위에
#   넣을 때 이름(`배정고침`)과 차례를 씁니다. 이름은 다른 adm1 파일처럼 두 번 인코딩합니다
#   (`이름풀기` 가 풉니다 — [[mojibake-trap]] 의 예외).
# ⚠ adm2/KR.js 에 넣을 도시는 **앱과 같은 배정**으로 고릅니다(아래 `배정`). 시·도 모양이
#   바뀌면 «도시가 여럿인 시·도»가 달라지므로(강화도: NE 는 경기, 실제는 인천) 둘은 늘
#   같이 굽습니다. 다시 구우면 citymap.js 의 `MAP_V`·`시군V` 를 올립니다.
# ⚠ 광역시에 도시가 둘이면(인천 + 강화도) 그 광역시의 **구를 다 합친 것**이 그 도시입니다.
#   mkadm2 의 규칙대로 두면 인천이 «남동구» 하나만 남습니다.
#
# 쓰는 법:  perl tools/mkkr.pl <KOSTAT-2018.geojson> <kr_cities.tsv>
#   kr_cities.tsv = id · 나라 · 위도 · 경도 · 이름 (살아 있는 앱에서 — 맨 아래 __END__)
#   원본: southkorea-maps 의 kostat/2018/json/skorea-municipalities-2018-geo.json (18MB)

my ($src, $tsv) = @ARGV;
die "쓰는 법: perl tools/mkkr.pl <KOSTAT-2018.geojson> <kr_cities.tsv>\n" unless $src && $tsv;

my $EPS    = $ENV{KR_EPS} // 0.006;   # 지도 단위(세로 500 = 180°) — 약 225m. 30배에서 0.19pt, 40배(최대)에서 0.25pt
my $섬최소 = $ENV{KR_ISLE} // 0.5;     # km² — 이웃이 없는 섬·구멍이 이보다 작으면 버립니다(30배에서 0.6pt 점)
my $붙임   = 3;       # km — 점이 어느 시군구에도 안 들 때(해안) 붙일 수 있는 거리

# 시·도 — 통계청 코드 앞 두 자리 → 이름. **예전 파일과 같은 차례**입니다.
my @시도 = (
  [32, '강원도'], [31, '경기도'], [34, '충청남도'], [23, '인천광역시'], [35, '전라북도'],
  [36, '전라남도'], [38, '경상남도'], [21, '부산광역시'], [26, '울산광역시'], [37, '경상북도'],
  [39, '제주특별자치도'], [11, '서울특별시'], [25, '대전광역시'], [29, '세종특별자치시'],
  [33, '충청북도'], [24, '광주광역시'], [22, '대구광역시'],
);
my %광역시 = map { $_ => 1 } qw(11 21 22 23 24 25 26);
my %배정고침 = (gwangju => '광주광역시', gongju => '충청남도');   # citymap.js 와 같게

sub slurp { open my $h, '<:raw', $_[0] or die "$_[0]: $!\n"; local $/; my $t = <$h>; close $h; $t }

# ══ 1. 읽기 ══════════════════════════════════════════════════════════════
my $gj = JSON::PP->new->utf8->decode(slurp($src));
my (@F, %XY);
my $vk = sub { my $k = sprintf('%.7f %.7f', $_[0], $_[1]); $XY{$k} //= [$_[0]+0, $_[1]+0]; $k };
for my $ft (@{$gj->{features}}){
  my $p = $ft->{properties}; my $g = $ft->{geometry};
  my @polys = $g->{type} eq 'Polygon' ? ($g->{coordinates}) : @{$g->{coordinates}};
  my @P;
  for my $pl (@polys){
    my @R;
    for my $r (@$pl){
      my @k; for my $c (@$r){ my $k = $vk->(@$c); push @k, $k unless @k && $k[-1] eq $k }
      pop @k if @k > 1 && $k[0] eq $k[-1];
      push @R, \@k if @k >= 3;
    }
    push @P, \@R if @R;
  }
  push @F, { code => "$p->{code}", name => $p->{name}, 시도 => substr("$p->{code}", 0, 2), polys => \@P };
}
printf "시군구 %d · 점 %d\n", scalar @F, scalar keys %XY;

# ══ 2. 변 · 이음점 ══════════════════════════════════════════════════════
my (%EO, %VE);
for my $fi (0 .. $#F){ for my $pl (@{$F[$fi]{polys}}){ for my $r (@$pl){
  my $n = @$r;
  for my $i (0 .. $n-1){
    my ($a, $b) = ($r->[$i], $r->[($i+1) % $n]);
    my $e = $a lt $b ? "$a|$b" : "$b|$a";
    $EO{$e}{$fi}++; $VE{$a}{$e} = 1; $VE{$b}{$e} = 1;
  } } } }
my %서명; $서명{$_} = join(',', sort { $a <=> $b } keys %{$EO{$_}}) for keys %EO;
my %이음;
for my $v (keys %VE){ my @e = keys %{$VE{$v}};
  $이음{$v} = 1 if @e != 2 || $서명{$e[0]} ne $서명{$e[1]} }
my $변서명 = sub { my ($a, $b) = @_; $서명{ $a lt $b ? "$a|$b" : "$b|$a" } };

# ══ 3. 호 ═══════════════════════════════════════════════════════════════
my %ARC;
sub 호열쇠 {
  my ($seq) = @_;
  my ($a, $z) = ($seq->[0], $seq->[-1]);
  my $rev = $a ne $z ? ($a gt $z) : (@$seq > 2 && $seq->[1] gt $seq->[-2]);
  my @c = $rev ? reverse @$seq : @$seq;
  my $key = join('|', $c[0], $c[1], $c[-2], $c[-1], scalar @c);
  $ARC{$key} //= { k => \@c, 주인 => [ split /,/, $변서명->($c[0], $c[1]) ] };
  return [$key, $rev ? 1 : 0];
}
sub 고리호들 {
  my ($r) = @_; my $n = @$r;
  my @j = grep { $이음{$r->[$_]} } 0 .. $n-1;
  unless (@j){
    my $m = 0; for (1 .. $n-1){ $m = $_ if $r->[$_] lt $r->[$m] }
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
for my $f (@F){ $f->{호} = [ map { [ map { 고리호들($_) } @$_ ] } @{$f->{polys}} ] }

# ══ 4. 호마다 한 번 줄이기 ═══════════════════════════════════════════════
sub 줄이기 {           # 더글러스-포이커(mkadm2.pl 과 같음)
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
sub 지도점 { my ($lon, $lat) = @{$XY{$_[0]}}; [ ($lon+180)/360*1000, (90-$lat)/180*500 ] }
my ($점전, $점후) = (0, 0);
for my $a (values %ARC){
  my @p = map { 지도점($_) } @{$a->{k}};
  $점전 += @p;
  if ($a->{k}[0] eq $a->{k}[-1]){          # 고리 — 가장 먼 점에서 둘로 나눠 줄입니다
    my ($far, $best) = (1, -1);
    for my $i (1 .. $#p-1){ my $d = ($p[$i][0]-$p[0][0])**2 + ($p[$i][1]-$p[0][1])**2;
      if ($d > $best){ $best = $d; $far = $i } }
    my $l = 줄이기([@p[0 .. $far]], $EPS); my $r = 줄이기([@p[$far .. $#p]], $EPS);
    pop @$l; $a->{s} = [@$l, @$r];
  } else { $a->{s} = 줄이기(\@p, $EPS) }
  $점후 += @{$a->{s}};
}
printf "호 %d · 점 %d → %d\n", scalar keys %ARC, $점전, $점후;

sub 호점 { my ($h) = @_; my $s = $ARC{$h->[0]}{s}; $h->[1] ? [reverse @$s] : $s }
sub 고리잇기 {
  my ($hs) = @_; my @pt;
  for my $h (@$hs){ my $s = 호점($h); push @pt, @pt ? @$s[1 .. $#$s] : @$s }
  pop @pt if @pt > 1 && $pt[0][0] == $pt[-1][0] && $pt[0][1] == $pt[-1][1];
  return \@pt;
}
sub 넓이km {           # 지도 단위 고리의 넓이
  my $r = shift; my $n = @$r; return 0 if $n < 3;
  my ($s, $y0) = (0, 0); $y0 += $_->[1] for @$r; $y0 /= $n;
  my $lat = 90 - $y0/500*180;
  for (my $i = 0, my $j = $n - 1; $i < $n; $j = $i++){ $s += $r->[$j][0]*$r->[$i][1] - $r->[$i][0]*$r->[$j][1] }
  return abs($s)/2 * (0.36*111.32*cos($lat*3.14159265/180)) * (0.36*110.57);
}

# ══ 5. 작은 섬·구멍 버리기 — 이웃이 없는(호의 주인이 하나뿐인) 고리만 ════════════
my ($버린섬, $버린구멍) = (0, 0);
for my $f (@F){
  my @새;
  for my $pl (@{$f->{호}}){
    my $홀로 = sub { my $ring = shift; !grep { @{$ARC{$_->[0]}{주인}} > 1 } @$ring };
    my ($바깥, @구멍) = @$pl;
    if ($홀로->($바깥) && 넓이km(고리잇기($바깥)) < $섬최소){ $버린섬++; next }
    my @남긴 = grep { !($홀로->($_) && 넓이km(고리잇기($_)) < $섬최소) or do { $버린구멍++; 0 } } @구멍;
    push @새, [$바깥, @남긴];
  }
  $f->{호} = \@새;
}
printf "버린 섬 %d · 버린 구멍 %d\n", $버린섬, $버린구멍;

# ══ 6. 합치기(안쪽 호 지우기) ═════════════════════════════════════════════
sub 합치기 {
  my @fis = @_;
  my (%cnt, @occ);
  for my $fi (@fis){ for my $pl (@{$F[$fi]{호}}){ for my $ring (@$pl){ for my $h (@$ring){
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
    while ($cur ne $s0){
      my ($nx) = grep { !$used{$_->[0]} } @{$from{$cur} || []};
      unless ($nx){ $ok = 0; last }
      $used{$nx->[0]} = 1; push @hs, $b[$nx->[0]]; $cur = $nx->[1];
    }
    # 넓이가 거의 0 인 고리는 합칠 때 남은 찌꺼기(선 조각)입니다 — 칠은 안 보이는데
    # 선이 점으로 찍힙니다(서울에 넓이 0 인 3·4점 고리 둘이 있었습니다).
    if ($ok){ my $r = 고리잇기(\@hs); push @rings, $r if @$r >= 3 && 넓이km($r) >= 0.01 }
    else { $끊김++ }
  }
  warn "!! 끊긴 고리 ${끊김}개 (@{[ map { $F[$_]{name} } @fis[0 .. ($#fis < 2 ? $#fis : 2)] ]}…)\n" if $끊김;
  return \@rings;
}

# ── 길(mkadm2.pl 과 같은 꼴, 소수 셋째 자리) ────────────────────────────
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
sub 길풀기 {           # citymap.js 의 조각내기와 같은 읽기
  my $d = shift; my @r; my ($x, $y) = (0, 0); my $cur;
  while ($d =~ /([MlZ])([^MlZ]*)/g){
    my ($c, $a) = ($1, $2); my @n = $a =~ /(-?[\d.]+)/g;
    if ($c eq 'M'){ ($x,$y) = @n[0,1]; $cur = [[$x,$y]]; push @r, $cur }
    elsif ($c eq 'l'){ for (my $i = 0; $i+1 < @n; $i += 2){ $x += $n[$i]; $y += $n[$i+1]; push @$cur, [$x,$y] } } }
  return \@r;
}

# ══ 7. 시·도 ════════════════════════════════════════════════════════════
my %시도명 = map { $_->[0] => $_->[1] } @시도;
{ my %본; for my $f (@F){ next if $본{$f->{시도}}++; printf "  %s %s ← %s\n", $f->{시도}, $시도명{$f->{시도}} // '??', $f->{name} } }
my @단위;
for my $s (@시도){
  my ($c, $이름) = @$s;
  my @fis = grep { $F[$_]{시도} eq $c } 0 .. $#F;
  die "!! 시·도 $c ($이름) 에 시군구가 없습니다\n" unless @fis;
  my $rings = 합치기(@fis);
  my $d = 길들($rings);
  my $고리 = 길풀기($d);
  my ($x0,$x1,$y0,$y1) = (1e9,-1e9,1e9,-1e9);
  for my $r (@$고리){ for (@$r){ $x0=$_->[0] if $_->[0]<$x0; $x1=$_->[0] if $_->[0]>$x1; $y0=$_->[1] if $_->[1]<$y0; $y1=$_->[1] if $_->[1]>$y1 } }
  my $점 = 0; $점 += @$_ for @$고리;
  push @단위, { 이름 => $이름, 코드 => $c, 길 => $d, 고리 => $고리, 상자 => [$x0,$x1,$y0,$y1], 도시 => [] };
  printf "  %-8s 고리 %4d · 점 %6d · %.1fKB\n", $이름, scalar @$고리, $점, length($d)/1024;
}

# ══ 8. 도시 → 시·도 (citymap.js 의 `짜기` 와 같은 순서) ══════════════════
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
my @도시;
{ open my $h, '<:encoding(UTF-8)', $tsv or die "$tsv: $!\n";
  while (<$h>){ s/\r?\n$//; next unless /\S/;
    my ($id, $나라, $lat, $lng, $이름) = split /\t/;
    push @도시, { id => $id, 나라 => $나라 || 'KR', lat => $lat+0, lng => $lng+0, 이름 => $이름 // $id,
                  x => ($lng+180)/360*1000, y => (90-$lat)/180*500 } }
  close $h }
my @작은것부터 = sort { ($a->{상자}[1]-$a->{상자}[0])*($a->{상자}[3]-$a->{상자}[2])
                    <=> ($b->{상자}[1]-$b->{상자}[0])*($b->{상자}[3]-$b->{상자}[2]) } @단위;
for my $c (@도시){
  my $u;
  if (my $n = $배정고침{$c->{id}}){ ($u) = grep { $_->{이름} eq $n } @단위 }
  unless ($u){ for my $v (@작은것부터){ my ($x0,$x1,$y0,$y1) = @{$v->{상자}};
    next if $c->{x} < $x0 || $c->{x} > $x1 || $c->{y} < $y0 || $c->{y} > $y1;
    if (안에($c->{x}, $c->{y}, $v->{고리})){ $u = $v; last } } }
  if (!$u && $c->{나라} eq 'KR'){ my $가장 = 3.75;
    for my $v (@단위){ my ($x0,$x1,$y0,$y1) = @{$v->{상자}};
      next if $c->{x} < $x0-$가장 || $c->{x} > $x1+$가장 || $c->{y} < $y0-$가장 || $c->{y} > $y1+$가장;
      my $d = 경계거리($c->{x}, $c->{y}, $v->{고리}); if ($d < $가장){ $가장 = $d; $u = $v } } }
  if ($u){ push @{$u->{도시}}, $c; $c->{단위} = $u } else { print "!! $c->{id}: 어느 시·도에도 안 듦\n" }
}
print "시·도별 도시:\n";
printf "  %-8s %s\n", $_->{이름}, join(' ', map { $_->{id} } @{$_->{도시}}) for @단위;

# ══ 9. 도시의 시·군 (mkadm2.pl 의 한국 규칙 + 광역시 규칙) ══════════════════
sub 원본안에 {         # 경위도 — 원본(안 줄인) 고리로 봅니다
  my ($lng, $lat, $f) = @_; my $in = 0;
  for my $pl (@{$f->{polys}}){ for my $r (@$pl){ my $n = @$r;
    for (my $i = 0, my $j = $n - 1; $i < $n; $j = $i++){
      my ($xi,$yi) = @{$XY{$r->[$i]}}; my ($xj,$yj) = @{$XY{$r->[$j]}};
      $in = !$in if (($yi > $lat) != ($yj > $lat)) && $lng < ($xj-$xi)*($lat-$yi)/(($yj-$yi)||1e-12)+$xi } } }
  return $in }
sub 원본거리km {
  my ($lng, $lat, $f) = @_; my $kx = 111.32 * cos($lat * 3.14159265/180); my $ky = 110.57; my $최소 = 1e18;
  for my $pl (@{$f->{polys}}){ for my $r (@$pl){ my $n = @$r;
    for (my $i = 0, my $j = $n - 1; $i < $n; $j = $i++){
      my ($x1,$y1) = (($XY{$r->[$j]}[0]-$lng)*$kx, ($XY{$r->[$j]}[1]-$lat)*$ky);
      my ($x2,$y2) = (($XY{$r->[$i]}[0]-$lng)*$kx, ($XY{$r->[$i]}[1]-$lat)*$ky);
      my ($dx,$dy) = ($x2-$x1, $y2-$y1); my $L = $dx*$dx + $dy*$dy;
      my $t = $L ? -($x1*$dx + $y1*$dy)/$L : 0; $t = 0 if $t < 0; $t = 1 if $t > 1;
      my ($ex,$ey) = ($x1 + $t*$dx, $y1 + $t*$dy); my $d = sqrt($ex*$ex + $ey*$ey);
      $최소 = $d if $d < $최소 } } }
  return $최소 }
sub km거리 { my ($a, $b) = @_; my $kx = 111.32 * cos(($a->{lat}+$b->{lat})/2 * 3.14159265/180);
  sqrt((($a->{lng}-$b->{lng})*$kx)**2 + (($a->{lat}-$b->{lat})*110.57)**2) }
sub 반평면자르기 {     # 고리를 «a·x + b·y <= c» 쪽만
  my ($r, $a, $b, $c) = @_; my @out; my $n = @$r; return [] unless $n;
  for my $i (0 .. $n-1){
    my $P = $r->[$i]; my $Q = $r->[($i+1) % $n];
    my $fp = $a*$P->[0] + $b*$P->[1] - $c; my $fq = $a*$Q->[0] + $b*$Q->[1] - $c;
    push @out, $P if $fp <= 0;
    if (($fp <= 0) != ($fq <= 0)){ my $t = $fp / ($fp - $fq);
      push @out, [ $P->[0] + $t*($Q->[0]-$P->[0]), $P->[1] + $t*($Q->[1]-$P->[1]) ] } }
  return \@out }

my (%결과, @기록);
for my $u (@단위){
  my @g = @{$u->{도시}};
  next if @g < 2;                        # 도시가 하나뿐인 시·도는 통째로 칠합니다
  for my $d (@g){
    my @남 = grep { $_ != $d && km거리($d, $_) > 2 } @g;
    my @후보 = grep { $F[$_]{시도} eq $u->{코드} } 0 .. $#F;
    my ($P) = grep { 원본안에($d->{lng}, $d->{lat}, $F[$_]) } @후보;
    my $몇 = 0;
    unless (defined $P){
      my $가장 = $붙임;
      for my $i (@후보){ my $k = 원본거리km($d->{lng}, $d->{lat}, $F[$i]); if ($k < $가장){ $가장 = $k; $P = $i } }
      $몇 = $가장 if defined $P;
    }
    unless (defined $P){ push @기록, "  $d->{id}: 시·군 경계 없음(점으로 찍힘)"; next }
    my $이름 = $F[$P]{name};
    my @무리 = ($P);
    if ($광역시{$u->{코드}} && $이름 =~ /구$/){
      @무리 = grep { $F[$_]{name} =~ /구$/ } @후보;
      $이름 = "$u->{이름}의 구 " . scalar(@무리) . '개';
    } elsif ($이름 =~ /^(.+?시)(.+구)$/){
      my $머리 = $1; @무리 = grep { $F[$_]{name} =~ /^\Q$머리\E.+구$/ } @후보;
      $이름 = "$머리(구 " . scalar(@무리) . '개 합침)';
    }
    my $rings = 합치기(@무리);
    my @같이 = grep { my $o = $_; grep { 원본안에($o->{lng}, $o->{lat}, $F[$_]) } @무리 } @남;
    my $어떻게;
    if (@같이){
      my $kx = cos($d->{lat} * 3.14159265/180);
      my @새 = map { [ map { [ $_->[0]*$kx, $_->[1] ] } @$_ ] } @$rings;
      for my $o (@같이){
        my ($ax,$ay) = ($d->{x}*$kx, $d->{y}); my ($bx,$by) = ($o->{x}*$kx, $o->{y});
        my ($A, $B, $C) = (2*($bx-$ax), 2*($by-$ay), ($bx*$bx+$by*$by) - ($ax*$ax+$ay*$ay));
        @새 = grep { @$_ >= 3 } map { 반평면자르기($_, $A, $B, $C) } @새;
      }
      $rings = [ map { [ map { [ $_->[0]/$kx, $_->[1] ] } @$_ ] } @새 ];
      $어떻게 = sprintf '%s 를 %s 와 나눔', $이름, join('·', map { $_->{id} } @같이);
    } else {
      my $a = 0; $a += 넓이km($_) for @$rings;   # 구멍까지 더한 대강의 크기(기록용)
      $어떻게 = sprintf '%s %.0fkm²%s', $이름, $a, $몇 ? sprintf(' (경계까지 %.1fkm)', $몇) : '';
    }
    my $d길 = 길들($rings);
    unless ($d길){ push @기록, "  $d->{id}: 굽고 나니 빈 경계"; next }
    $결과{$d->{id}} = $d길;
    push @기록, "  $d->{id}: $어떻게";
  }
}
print "시·군:\n", join("\n", @기록), "\n";

# ══ 10. 쓰기 ═════════════════════════════════════════════════════════════
my $출처 = '통계청(KOSTAT) 센서스용 행정구역경계 2018 — 자유 이용(공유·변형 가능) · southkorea-maps';
{ my $js = "/* 시·도 경계 — tools/mkkr.pl 이 굽습니다(b786). 손으로 고치지 마십시오.\n"
         . "   출처: $출처\n"
         . "   ⚠ adm2/KR.js 와 «같은 선»입니다(같이 굽습니다). 이름은 다른 adm1 처럼 두 번 인코딩. */\n"
         . "export default [\n"
         . join(",\n", map { my $n = decode('ISO-8859-1', encode('UTF-8', $_->{이름}));
                               qq{["$n","$_->{길}"]} } @단위)
         . "\n];\n";
  open my $o, '>:encoding(UTF-8)', 'adm1/KR.js' or die; print $o $js; close $o;
  printf "adm1/KR.js %.1fKB\n", (-s 'adm1/KR.js')/1024 }
{ my $js = "/* 시·군 경계 — tools/mkkr.pl 이 굽습니다(b786, 전에는 mkadm2.pl). 손으로 고치지 마십시오.\n"
         . "   출처: $출처\n"
         . "   ⚠ adm1/KR.js 와 «같은 선»입니다 — 이웃한 시·군, 시·도 경계, 해안선이 같은 호를 씁니다. */\n"
         . "export default {\n"
         . join(",\n", map { qq{"$_":"$결과{$_}"} } sort keys %결과) . "\n};\n";
  open my $o, '>:encoding(UTF-8)', 'adm2/KR.js' or die; print $o $js; close $o;
  printf "adm2/KR.js %d곳 %.1fKB\n", scalar keys %결과, (-s 'adm2/KR.js')/1024 }

__END__
도시 목록 뽑기 — 살아 있는 앱(로그인 없이)을 열고 콘솔에서:

  const v = [...document.scripts].map(s => s.src).find(s => /app\.js\?v=/.test(s)).match(/v=(b\d+)/)[1];
  const C = await import(`./cities.js?v=${v}`);
  copy(C.cities.filter(c => c.cc === 'KR').map(c => [c.id, c.country || '',
    (+(c.center_lat ?? c.lat)).toFixed(5), (+(c.center_lng ?? c.lng)).toFixed(5), c.name || ''].join('\t')).join('\n'));

그다음(travel-v2 에서):  perl tools/mkkr.pl <원본>/KOSTAT-2018.geojson kr_cities.tsv
⚠ 도시를 늘리거나 줄이면 다시 굽고 citymap.js 의 MAP_V · 시군V 를 올립니다.
⚠ mkadm2.pl 은 한국을 건너뜁니다(KR 은 이 파일이 굽습니다) — 목록에 KR 줄이 있어도 무시.
