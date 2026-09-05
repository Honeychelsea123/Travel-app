use strict; use warnings;
use JSON::PP;
binmode STDOUT, ':encoding(UTF-8)';

# ── 나라별 정밀 지도(50m)를 굽는 도구 ────────────────────────────────
#
# 왜 있나: world.js 는 Natural Earth **110m** 이라 «작은 섬을 통째로 지웠습니다».
#   실측: 제주·서귀포·울릉도·완도·거제·오키나와·이시가키·사도·발리가 모두
#   한국/일본/인도네시아 다각형 «밖»입니다(8곳 검사 0/8).
#   한국은 조각 1개·점 19개뿐입니다 — 나라 화면으로 확대하면 19각형입니다.
#
# 무엇을 하나: world-atlas 의 countries-50m TopoJSON 을 받아
#   **나라 하나에 파일 하나**(map50/XX.js)로 구워 냅니다. 좌표계는 world.js 와 같습니다:
#     x = (경도+180)/360*1000 · y = (90-위도)/180*500
#
# ⚠ **통째로 바꾸지 않습니다.** 50m 전체는 점 99,539개(551KB)라 지구본이
#   매 프레임 그것을 다 돌아야 합니다(지금 9,879개). 지구본과 평면 지도는
#   110m 그대로 두고, **나라 화면에 들어갈 때만** 그 나라 것을 받습니다.
#   실측: 가운데값 1.8KB · 한국 2.1KB · 일본 8.6KB · 제일 큰 캐나다 89KB.
#
# ⚠ 소수 **두 자리**로 적습니다. 한 자리면 0.1u = 2.6px 라 나라 화면에서
#   계단이 보입니다(한국 화면은 1u ≈ 25.6px). 두 자리면 0.26px 입니다.
#
# 쓰는 법:
#   1) 자료를 받습니다(한 번만):
#      curl -sSL -o countries-50m.json https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json
#      curl -sSL -o iso.json https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json
#   2) perl tools/mkmap50.pl <자료가 있는 폴더> [도시목록.json]
#      도시목록을 주면 «도시가 있는 나라»만 굽습니다(199개). 안 주면 전부.
#
# ⚠ world-atlas 는 나라를 **ISO 숫자코드**로 적습니다. 우리 data-c 는 알파2라
#   iso.json 으로 갈아탑니다. 이 갈아타기에서 두 개가 안 맞습니다 —
#   GF(프랑스령 기아나)는 50m 에서 FR 안에 들어 있고, XK(코소보)는 ISO 숫자가
#   없습니다. 둘 다 **도시가 0곳**이라 나라 화면이 열리지 않습니다.

my $DIR = shift(@ARGV) or die "쓰는 법: perl tools/mkmap50.pl <자료폴더> [cities.json]\n";
my $CITY = shift(@ARGV);
my $OUT  = 'map50';

sub slurp { my $f = shift; open my $h, '<:raw', $f or die "$f: $!"; local $/; my $x = <$h>; close $h; $x }

my $topo = JSON::PP->new->decode(slurp("$DIR/countries-50m.json"));
my $iso  = JSON::PP->new->decode(slurp("$DIR/iso.json"));
my %n2a; $n2a{ $_->{'country-code'} + 0 } = $_->{'alpha-2'} for @$iso;

my %want;
if ($CITY){
  my $cs = JSON::PP->new->decode(slurp($CITY));
  $want{ $_->[2] }++ for @$cs;
  printf "도시가 있는 나라 %d개만 굽습니다\n", scalar keys %want;
}

# ── TopoJSON 아크를 절대 경위도로 편다 ───────────────────────────────
my ($sx, $sy) = @{ $topo->{transform}{scale} };
my ($tx, $ty) = @{ $topo->{transform}{translate} };
my @arcs;
for my $a (@{ $topo->{arcs} }){
  my ($x, $y) = (0, 0); my @p;
  for my $d (@$a){ $x += $d->[0]; $y += $d->[1]; push @p, [$x * $sx + $tx, $y * $sy + $ty]; }
  push @arcs, \@p;
}
sub ring {                       # 아크 번호 목록 → 점 목록 (음수는 뒤집기)
  my @o;
  for my $i (@_){
    my @p = $i < 0 ? reverse @{ $arcs[-$i - 1] } : @{ $arcs[$i] };
    shift @p if @o;              # 이어붙일 때 첫 점이 겹친다
    push @o, @p;
  }
  \@o;
}

# ── 우리 좌표계로 ────────────────────────────────────────────────────
my $PX = sub { ($_[0] + 180) / 360 * 1000 };
my $PY = sub { (90 - $_[0]) / 180 * 500 };

my (%poly, %nm);
for my $g (@{ $topo->{objects}{countries}{geometries} }){
  my $id = $g->{id}; next unless defined $id;
  my $cc = $n2a{ $id + 0 }; next unless $cc;
  next if %want && !$want{$cc};
  $nm{$cc} = $g->{properties}{name} // '';
  my @r;
  if ($g->{type} eq 'Polygon'){ @r = map { ring(@$_) } @{ $g->{arcs} } }
  elsif ($g->{type} eq 'MultiPolygon'){
    for my $pl (@{ $g->{arcs} }){ push @r, map { ring(@$_) } @$pl }
  }
  # ⚠ 구멍(안쪽 고리)도 그대로 넣습니다 — 짝수-홀수로 그리면 구멍이 뚫립니다.
  push @{ $poly{$cc} }, [ map { [ $PX->($_->[0]), $PY->($_->[1]) ] } @$_ ] for @r;
}

# ── world.js 와 같은 모양의 문자열로 ─────────────────────────────────
sub num {                        # 0.70 -> .7 · -0.70 -> -.7 (world.js 와 같은 줄임)
  my $s = sprintf('%.2f', $_[0]);
  $s =~ s/\.?0+$// if $s =~ /\./;
  $s = '0' if $s eq '' || $s eq '-';
  $s =~ s/^(-?)0\./$1./;
  $s;
}
sub d_of {
  my $rings = shift; my $s = '';
  for my $r (@$rings){
    next if @$r < 3;
    my $seg = ''; my ($px, $py);
    for my $p (@$r){
      my $x = sprintf('%.2f', $p->[0]) + 0;
      my $y = sprintf('%.2f', $p->[1]) + 0;
      if (!defined $px){ $s .= 'M' . num($x) . ' ' . num($y) }
      else {
        my $a = num($x - $px); my $b = num($y - $py);
        next if $a + 0 == 0 && $b + 0 == 0;     # 같은 자리는 버린다
        $seg .= ($seg eq '' ? '' : ($a =~ /^-/ ? '' : ' ')) . $a . ($b =~ /^-/ ? '' : ' ') . $b;
      }
      ($px, $py) = ($x, $y);
    }
    $s .= ($seg eq '' ? '' : 'l' . $seg) . 'Z';
  }
  $s;
}

mkdir $OUT unless -d $OUT;
my ($n, $bytes, @big) = (0, 0);
for my $cc (sort keys %poly){
  my $d = d_of($poly{$cc});
  next if $d eq '';
  my $pts = 0; $pts += scalar @$_ for @{ $poly{$cc} };
  my $js = "/* $cc · $nm{$cc} · Natural Earth 50m · 좌표 1000x500 · 소수 2자리\n"
         . "   tools/mkmap50.pl 이 구운 것입니다. 손으로 고치지 마십시오. */\n"
         . "export default \"$d\";\n";
  open my $o, '>:encoding(UTF-8)', "$OUT/$cc.js" or die "$OUT/$cc.js: $!";
  print $o $js; close $o;
  $n++; $bytes += length $js;
  push @big, [$cc, length($js), $pts, scalar @{ $poly{$cc} }];
}
@big = sort { $b->[1] <=> $a->[1] } @big;
printf "\n%d개 나라를 %s/ 에 구웠습니다 · 다 합쳐 %.0f KB\n", $n, $OUT, $bytes / 1024;
printf "  가운데값 %.1f KB\n", $big[int(@big / 2)][1] / 1024;
print  "  큰 것: ", join(' · ', map { sprintf '%s %.0fKB', $_->[0], $_->[1] / 1024 } @big[0 .. 7]), "\n";
for my $cc (qw(KR JP TW SG HK MO GU MT)){
  my ($r) = grep { $_->[0] eq $cc } @big;
  printf "  %-3s %5.1f KB · 점 %5d · 조각 %3d\n", $cc, $r->[1] / 1024, $r->[2], $r->[3] if $r;
}
my @missing = sort grep { !$poly{$_} } keys %want;
printf "\n⚠ 도시가 있는데 50m 에 없는 나라 %d개: %s\n", scalar @missing, join(" ", @missing) if @missing;
