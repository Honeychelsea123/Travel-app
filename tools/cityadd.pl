# ── 넣을 도시의 좌표·문서를 위키백과에서 받아 «확인»한다 ──────────────
#
# 읽는 것: tools/citydata/add-b671.tsv
# 내는 것: tools/citydata/add-b671-ok.tsv + 화면에 표 하나.
#          SQL 은 이 표를 «보고 나서» 만듭니다.
#
# ⚠⚠ **이름을 지어내지 않습니다**(메모리 city-list-expansion).
#   좌표도 나라도 «문서에서» 받습니다.
# ⚠⚠ **나라를 대조합니다.** b654 에 나사우(BS)가 7,559km 떨어진 독일
#   문서에 걸린 적이 있습니다 — 이름이 같다고 같은 곳이 아닙니다.
#   여기서는 문서 좌표가 그 나라 «범위» 안에 드는지 봅니다.
# ⚠⚠ **한국어 문서에 좌표가 없는 일이 흔합니다**(19곳 중 7곳이 그랬습니다).
#   문서는 멀쩡한데 요약 응답에 `coordinates` 가 안 들어옵니다. 그때는
#   **영어판에서 좌표만** 빌려 옵니다 — 글(summary_url)은 한국어 것을
#   그대로 씁니다. ⚠ 빌려 왔어도 나라 범위 검사는 «똑같이» 통과해야
#   합니다. 건너뛰면 동음이의가 그대로 들어옵니다.
# ⚠ 그래도 안 되면 **그 줄은 못 넣습니다.** 억지로 채우지 않고 표에
#   표시만 합니다 — 사람이 보고 정할 일입니다.
#
# 쓰는 법: perl tools/cityadd.pl tools/citydata/add-b673.tsv
#          (안 주면 add-b671.tsv 를 읽습니다)

use strict; use warnings; use utf8;
binmode(STDOUT, ':encoding(UTF-8)');
binmode(STDERR, ':encoding(UTF-8)');

my $UA = 'keyro-city-setup/1.0 (https://honeychelsea123.github.io/Travel-app/; qkrthgml8068@gmail.com)';

sub 받기 {
  my ($u) = @_;
  open my $p, '-|', 'curl', '-s', '-m', '15', '-A', $UA, $u or return '';
  local $/; my $r = <$p>; close $p;
  utf8::decode($r) if defined $r;
  $r // '';
}
sub 인코딩 {
  my $b = shift; $b =~ s/ /_/g; utf8::encode($b);
  $b =~ s{([^A-Za-z0-9_.~()!*'-])}{sprintf('%%%02X', ord $1)}ge;
  $b;
}
sub 값 {
  my ($j, $k) = @_;
  return undef unless $j =~ /"\Q$k\E"\s*:\s*"((?:[^"\\]|\\.)*)"/;
  my $v = $1;
  $v =~ s/\\u([0-9a-fA-F]{4})/chr(hex $1)/ge;
  $v =~ s/\\"/"/g; $v =~ s/\\\\/\\/g;
  $v;
}
sub 수 { my ($j, $k) = @_; $j =~ /"\Q$k\E"\s*:\s*(-?[\d.]+)/ ? $1 + 0 : undef }
sub 좌표뭉치 { my $j = shift; my ($cb) = $j =~ /"coordinates"\s*:\s*\{([^}]*)\}/; $cb }

# 나라별 대략 범위(위도최소, 위도최대, 경도최소, 경도최대).
# 정밀할 필요 없습니다 — 「엉뚱한 대륙」만 걸러내면 됩니다.
my %범위 = (
  TR => [ 35.5,  42.5,   25.5,  45.0],
  NL => [ 50.7,  53.6,    3.3,   7.3],
  FR => [ 41.3,  51.2,   -5.2,   9.6],
  PE => [-18.4,   0.1,  -81.4, -68.6],
  CL => [-56.0, -17.4,  -76.0, -66.0],
  AR => [-55.1, -21.7,  -73.6, -53.6],
  PY => [-27.7, -19.2,  -62.7, -54.2],
  BO => [-23.0,  -9.6,  -69.7, -57.4],
  IT => [ 36.6,  47.1,    6.6,  18.6],
  BR => [-33.8,   5.3,  -74.0, -34.7],
  CA => [ 41.6,  83.2, -141.0, -52.6],
  RU => [ 41.1,  82.0,   19.6, 190.0],
  # 미국은 하와이(경도 -156)와 알래스카까지 넣어야 합니다 —
  # 본토만 잡으면 하와이가 「나라 밖」으로 걸립니다.
  US => [ 18.0,  72.0, -180.0, -66.0],
);

my $입력 = $ARGV[0] || 'tools/citydata/add-b671.tsv';
(my $출력 = $입력) =~ s/.tsv$/-ok.tsv/;

open my $h, '<:encoding(UTF-8)', $입력 or die "$입력: $!";
my (@좋음, @나쁨);
while (<$h>){
  chomp; s/\r$//;
  next if /^\s*#/ || /^\s*$/;
  my ($id, $ko, $제목, $cc, $en) = split /\t/;
  next unless $id && $cc;

  my $j = 받기('https://ko.wikipedia.org/api/rest_v1/page/summary/' . 인코딩($제목));
  select(undef, undef, undef, 0.2);

  my $종류 = 값($j, 'type') // '';
  if ($종류 ne 'standard'){
    push @나쁨, [$id, $ko, "한국어 문서가 없거나 동음이의($종류)"];
    next;
  }

  my $cb = 좌표뭉치($j);
  my $빌림 = '';
  unless (defined $cb){
    my $je = 받기('https://en.wikipedia.org/api/rest_v1/page/summary/' . 인코딩($en));
    select(undef, undef, undef, 0.2);
    $cb = 좌표뭉치($je);
    $빌림 = 'en 좌표' if defined $cb;
  }
  unless (defined $cb){
    push @나쁨, [$id, $ko, '한국어·영어 문서 둘 다 좌표가 없음'];
    next;
  }

  my ($lat, $lng) = (수($cb, 'lat'), 수($cb, 'lon'));
  unless (defined $lat && defined $lng){
    push @나쁨, [$id, $ko, '좌표를 못 읽음'];
    next;
  }

  my $r = $범위{$cc};
  if ($r && !($lat >= $r->[0] && $lat <= $r->[1] && $lng >= $r->[2] && $lng <= $r->[3])){
    push @나쁨, [$id, $ko, sprintf('좌표가 %s 밖 (%.3f, %.3f)', $cc, $lat, $lng)];
    next;
  }

  my ($ti) = $j =~ /"titles"\s*:\s*\{[^}]*?"canonical"\s*:\s*"((?:[^"\\]|\\.)*)"/;
  $ti =~ s/\\u([0-9a-fA-F]{4})/chr(hex $1)/ge if $ti;

  push @좋음, [$id, $ko, $en, $cc, $lat, $lng, $ti // $제목, $빌림];
}
close $h;

printf "확인됨 %d · 못 넣음 %d\n\n", scalar @좋음, scalar @나쁨;
printf "%-22s %-14s %-4s %9s %10s  %-26s %s\n",
       'id', '이름', '나라', '위도', '경도', '문서', '비고';
print '-' x 100, "\n";
printf("%-22s %-14s %-4s %9.4f %10.4f  %-26s %s\n", @{$_}[0,1,3,4,5,6,7]) for @좋음;
if (@나쁨){
  print "\n⚠ 못 넣는 것(억지로 채우지 않습니다):\n";
  printf("   %-22s %-14s %s\n", @$_) for @나쁨;
}

open my $o, '>:encoding(UTF-8)', $출력 or die "$출력: $!";
print $o join("\t", @$_), "\n" for @좋음;
close $o;
print "\n→ $출력\n";
