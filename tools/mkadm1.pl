use strict; use warnings; use utf8;
use JSON::PP;
binmode STDOUT, ':encoding(UTF-8)';

# ── 나라 «안»의 주·도(admin-1) 를 굽는 도구 ───────────────────────────
#
# 왜 있나: 지구본을 확대하면 도시마다 «보로노이 셀»이 칠해졌습니다 —
#   「가장 가까운 도시의 땅」이라 경계가 직선으로 뚝뚝 끊깁니다.
#   사용자 지적: 「삐뚤빼뚤한 채움으로 인해 너무 아마추어처럼 보이고」.
#   글로브마크는 **실제 행정경계**(퀘벡·몬태나·오키나와현)를 칠합니다.
#
# 무엇을 하나: Natural Earth **10m** admin-1 을 받아 **나라 하나에 파일
#   하나**(adm1/XX.js)로 굽습니다. 좌표계는 map50 과 같습니다:
#     x = (경도+180)/360*1000 · y = (90-위도)/180*500
#
# ⚠⚠ **50m 판은 못 씁니다.** 재보니 나라가 **아홉 개**뿐입니다 —
#   러시아·캐나다·미국·중국·브라질·인도·인도네시아·호주·남아공.
#   한국 0 · 일본 0 · 프랑스 0 · 이탈리아 0 · 영국 0 · 태국 0.
#   연방제 큰 나라만 담은 판이라 우리 사용자가 가는 곳이 통째로 빕니다.
#   10m 는 4,583 단위 · 240 나라로 **빈 나라가 하나도 없습니다**
#   (map50 199 개와 맞춰 봤습니다: 빠지는 나라 0).
#
# ⚠⚠ **직접 줄여야 합니다.** 10m 원본은 40.7MB 입니다. NE 가 미리 줄여 둔
#   50m 을 그냥 옮겨 담던 mkmap50.pl 과 다른 점이 이것입니다.
#   더글러스-포이커로 줄입니다. 기본 ε=0.04 지도단위 = **약 1.6km** 인데,
#   지구본이 낼 수 있는 최대 배율(40배)에서 1km 가 1.1px 이므로
#   **1.8px** 입니다(globe.js 의 그 주석 참고). 눈에 안 띕니다.
#   실측: 한국 17단위 13.4KB · 일본 47단위 32.9KB · 전 세계 3.1MB.
#
# ⚠ **덩치 큰 나라는 한 번 더 줄입니다.** 러시아는 ε=0.04 에서 305KB 라
#   한 번 받는 데 오래 걸립니다. 60KB 를 넘으면 ε=0.08 로 다시 굽습니다 —
#   큰 나라는 확대해도 한 칸이 화면을 꽉 채우므로 오차가 안 보입니다.
#
# ⚠ 소수 **두 자리**입니다 — map50 과 같은 이유(한 자리면 0.1u = 2.6px).
#
# 쓰는 법:
#   1) 자료를 한 번 받습니다(40MB):
#      curl -sSL -o ne10_adm1.geojson \
#        https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson
#   2) perl tools/mkadm1.pl <자료가 있는 폴더>
#      **map50/ 에 있는 나라만** 굽습니다 — 거기 있는 것이 곧 「도시가
#      있는 나라」입니다(mkmap50.pl 이 그렇게 만들었습니다).
#
# ⚠ JSON::XS 가 없어서 40MB 를 통째로 JSON 으로 읽으면 한참 걸립니다.
#   파일이 **한 줄**이고 조각이 `{"type":"Feature"` 로 시작하므로 **글자로
#   먼저 쪼갠 뒤** 조각 하나씩만 JSON 으로 풉니다.

my $DIR = shift(@ARGV) or die "쓰는 법: perl tools/mkadm1.pl <자료폴더>\n";
my $OUT = 'adm1';
my $EPS = 0.04;
my $큰것 = 60 * 1024;        # 이보다 커지면 한 번 더 줄입니다
my $EPS2 = 0.08;

# ── 어느 나라를 구울까 — map50 에 있는 것 ─────────────────────────────
opendir(my $d, 'map50') or die "map50/ 를 못 엽니다: $!\n";
my %want = map { /^([A-Z]{2})\.js$/ ? ($1 => 1) : () } readdir($d);
closedir $d;
die "map50 에서 나라를 못 읽었습니다\n" unless keys %want;
printf "도시가 있는 나라 %d개를 굽습니다\n", scalar keys %want;

mkdir $OUT unless -d $OUT;

# ── 원본을 글자로 먼저 쪼갭니다 ───────────────────────────────────────
my $s;
{ local $/; open my $h, '<:raw', "$DIR/ne10_adm1.geojson"
    or die "$DIR/ne10_adm1.geojson: $!\n"; $s = <$h>; close $h; }
printf "원본 %.1f MB\n", length($s)/1048576;

my @pos; my $p = 0;
while (($p = index($s, '{"type":"Feature"', $p)) >= 0){ push @pos, $p; $p += 10 }
printf "조각 %d개\n", scalar @pos;

my $J = JSON::PP->new;

# ── 더글러스-포이커 ───────────────────────────────────────────────────
sub 줄이기 {
  my ($pt, $eps) = @_;
  return $pt if @$pt < 3;
  my ($a, $b) = ($pt->[0], $pt->[-1]);
  my ($dx, $dy) = ($b->[0]-$a->[0], $b->[1]-$a->[1]);
  my $l2 = $dx*$dx + $dy*$dy;
  my ($최대, $나쁜) = (-1, 0);
  for my $i (1 .. $#$pt - 1){
    my $q = $pt->[$i]; my $d;
    if ($l2 < 1e-18){ my ($ux,$uy) = ($q->[0]-$a->[0], $q->[1]-$a->[1]);
                      $d = sqrt($ux*$ux + $uy*$uy) }
    else { $d = abs($dy*$q->[0] - $dx*$q->[1] + $b->[0]*$a->[1] - $b->[1]*$a->[0])
               / sqrt($l2) }
    if ($d > $최대){ $최대 = $d; $나쁜 = $i }
  }
  return [$a, $b] if $최대 <= $eps;
  my $왼 = 줄이기([@$pt[0 .. $나쁜]], $eps);
  my $오 = 줄이기([@$pt[$나쁜 .. $#$pt]], $eps);
  pop @$왼;
  return [@$왼, @$오];
}

# ── 고리 → 「M x y l dx dy … Z」 (map50 과 같은 꼴) ────────────────────
sub 길 {
  my $r = shift;
  my $f = sub { my $t = sprintf('%.2f', shift);
                $t =~ s/\.?0+$// if $t =~ /\./;
                $t = '0' if $t eq '' || $t eq '-0'; $t };
  my ($px, $py); my $d = '';
  for my $i (0 .. $#$r){
    my ($x, $y) = @{$r->[$i]};
    if ($i == 0){ $d .= 'M'.$f->($x).' '.$f->($y).'l'; $px = $x; $py = $y; next }
    my ($ax, $ay) = (sprintf('%.2f', $x-$px)+0, sprintf('%.2f', $y-$py)+0);
    next if $ax == 0 && $ay == 0;
    $d .= $f->($ax).' '.$f->($ay).' ';
    $px += $ax; $py += $ay;
  }
  $d =~ s/\s+$//;
  return $d.'Z';
}

# ── 한 나라를 굽습니다 ────────────────────────────────────────────────
sub 굽기 {
  my ($fs, $eps) = @_;
  my @단위;
  for my $f (@$fs){
    my $g = $f->{geometry} or next;
    my @polys = $g->{type} eq 'Polygon'      ? ($g->{coordinates})
              : $g->{type} eq 'MultiPolygon' ? @{$g->{coordinates}} : ();
    my $d = '';
    for my $poly (@polys){
      for my $ring (@$poly){
        my @pt = map { [ ($_->[0]+180)/360*1000, (90-$_->[1])/180*500 ] } @$ring;
        my $줄 = 줄이기(\@pt, $eps);
        next if @$줄 < 4;          # 점 셋 미만은 면이 아닙니다
        $d .= 길($줄);
      }
    }
    next unless $d;
    my $이름 = $f->{properties}{name_ko} || $f->{properties}{name} || '';
    push @단위, [$이름, $d];
  }
  return \@단위;
}

# ── 나라별로 조각을 모읍니다 ──────────────────────────────────────────
my %모음;
for my $i (0 .. $#pos){
  my $끝 = ($i < $#pos) ? $pos[$i+1] : length($s);
  my $덩이 = substr($s, $pos[$i], $끝 - $pos[$i]);
  $덩이 =~ s/,\s*$//;
  $덩이 =~ s/\}\s*\]\s*\}\s*$/}/ if $i == $#pos;    # 마지막 조각 꼬리
  my ($cc) = $덩이 =~ /"iso_a2":"([A-Z]{2})"/;
  next unless $cc && $want{$cc};
  my $f = eval { $J->decode($덩이) } or next;
  push @{ $모음{$cc} }, $f;
}
undef $s; undef @pos;
printf "자료가 있는 나라 %d개\n\n", scalar keys %모음;

# ── 굽고 씁니다 ───────────────────────────────────────────────────────
my ($합, $단합, $거친것) = (0, 0, 0);
my %잰것;
for my $cc (sort keys %모음){
  my $단위 = 굽기($모음{$cc}, $EPS);
  my $글 = 내보내기($단위);
  my $쓴ε = $EPS;
  if (length($글) > $큰것){
    $단위 = 굽기($모음{$cc}, $EPS2);
    $글 = 내보내기($단위);
    $쓴ε = $EPS2; $거친것++;
  }
  open my $w, '>:encoding(UTF-8)', "$OUT/$cc.js" or die "$OUT/$cc.js: $!\n";
  print $w $글; close $w;
  $합 += length($글); $단합 += scalar @$단위;
  $잰것{$cc} = [ scalar @$단위, length($글), $쓴ε ];
}

sub 내보내기 {
  my $단위 = shift;
  my $q = sub { my $t = shift; $t =~ s/\\/\\\\/g; $t =~ s/"/\\"/g; '"'.$t.'"' };
  return "export default [\n" .
    join(",\n", map { '['.$q->($_->[0]).','.$q->($_->[1]).']' } @$단위) .
    "\n];\n";
}

printf "구웠습니다 — 나라 %d · 단위 %d · 합계 %.0f KB\n",
  scalar keys %잰것, $단합, $합/1024;
printf "그중 %d개는 ε=%s 로 한 번 더 줄였습니다(60KB 넘어서)\n\n", $거친것, $EPS2;

my @큰 = sort { $잰것{$b}[1] <=> $잰것{$a}[1] } keys %잰것;
printf "%-4s %5s %8s  %s\n", 'cc', '단위', 'KB', 'ε';
for my $cc (@큰[0 .. ($#큰 > 11 ? 11 : $#큰)]){
  printf "%-4s %5d %8.1f  %s\n", $cc, $잰것{$cc}[0], $잰것{$cc}[1]/1024, $잰것{$cc}[2];
}
for my $cc (qw(KR JP)){
  next unless $잰것{$cc};
  printf "%-4s %5d %8.1f  %s\n", $cc, $잰것{$cc}[0], $잰것{$cc}[1]/1024, $잰것{$cc}[2];
}
