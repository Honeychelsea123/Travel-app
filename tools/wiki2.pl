# ── 1차에서 떨어진 것 되찾기 (b654) ──────────────────────────────────
#
# 1차는 **한국어 이름으로** ko.wikipedia 를 물었습니다. 그래서 「님」(Nimes)·
# 「팔마」·「코르도바」처럼 흔한 이름은 **동음이의 문서**에 걸려 떨어졌습니다.
# 멀쩡한 도시인데 이름이 겹쳤을 뿐입니다.
#
# ⚠⚠ **2차는 좌표로 찾습니다.** `list=geosearch` 로 그 자리 10km 안의 문서를
#   받아, 제목이 우리 이름과 맞는 것만 고릅니다. **좌표가 닻이라 딴 곳이
#   섞일 수가 없습니다** — 1차에서 나사우(BS)가 7,559km 떨어진 문서에,
#   리베리아(CR)가 나라 문서에 걸렸던 그 사고가 여기서는 안 납니다.
#
# ⚠ **제목이 안 맞으면 그냥 뺍니다.** 근처에서 제일 가까운 것을 집으면
#   기차역·경기장·강 문서가 도시로 들어옵니다. 확인 못 한 것은 안 넣습니다.
#
# ⚠ 사진이 없어 떨어진 것은 **영어판에서 사진만** 빌립니다 — 루안다·수도
#   수크레·가보로네처럼 «수도인데» 한국어판에 대표 사진이 없는 곳들입니다.
#   글은 한국어판 것을 그대로 씁니다(같은 대상의 같은 문서).
#
# 쓰는 법: perl tools/wiki2.pl      (wikigate.pl 을 한 번 돌린 «뒤»)
# 내는 것: /tmp/geo/wiki2-raw.tsv   (1차와 «같은 일곱 칸» — 합쳐서 다시 판정)

use strict; use warnings; use utf8;
binmode(STDOUT, ':encoding(UTF-8)');
my $G  = '/tmp/geo';
my $UA = 'keyro-city-setup/1.0 (https://honeychelsea123.github.io/Travel-app/; qkrthgml8068@gmail.com)';

sub 받기 {
  my ($url) = @_;
  my @cmd = ('curl', '-s', '-m', '12', '-A', $UA, $url);
  open my $p, '-|', @cmd or return '';
  local $/; my $r = <$p>; close $p;
  utf8::decode($r) if defined $r;
  $r // '';
}
sub 인코딩 {
  my $s = shift;
  my $b = $s; utf8::encode($b);
  $b =~ s/([^A-Za-z0-9_.~-])/sprintf('%%%02X', ord $1)/ge;
  $b;
}
sub 값 {
  my ($j, $k) = @_;
  return undef unless $j =~ /"\Q$k\E"\s*:\s*"((?:[^"\\]|\\.)*)"/;
  my $v = $1;
  $v =~ s/\\u([0-9a-fA-F]{4})/chr(hex $1)/ge;
  $v =~ s/\\n/ /g; $v =~ s/\\"/"/g; $v =~ s/\\\//\//g; $v =~ s/\\\\/\\/g;
  $v;
}

# 우리 좌표·영문 이름
my %우리;
{
  open my $h, '<:encoding(UTF-8)', "$G/new682.tsv" or die $!;
  while (<$h>){ chomp; my ($id,$ko,$en,$cc,$lat,$lng) = split /\t/;
    $우리{$id} = { ko=>$ko, en=>$en, cc=>$cc, lat=>$lat, lng=>$lng } if $id }
  close $h;
}

open my $out, '>:encoding(UTF-8)', "$G/wiki2-raw.tsv" or die $!;
open my $f, '<:encoding(UTF-8)', "$G/wiki-fail.tsv" or die $!;
my ($본, $되찾음, $사진빌림) = (0, 0, 0);
while (<$f>){
  chomp; s/\r$//;
  my ($id, $ko, $cc, $why) = split /\t/;
  my $u = $우리{$id} or next;
  $본++;

  # ── ① 사진만 없던 것: 영어판에서 사진을 빌립니다 ──
  if ($why eq '사진 없음'){
    my $en = 받기('https://en.wikipedia.org/api/rest_v1/page/summary/' . 인코딩($u->{en}));
    my ($img) = $en =~ /"originalimage"\s*:\s*\{[^}]*?"source"\s*:\s*"((?:[^"\\]|\\.)*)"/;
    ($img)    = $en =~ /"thumbnail"\s*:\s*\{[^}]*?"source"\s*:\s*"((?:[^"\\]|\\.)*)"/ unless $img;
    if ($img){
      # 1차 응답에 영어판 사진만 끼워 넣어 다시 판정받게 합니다.
      my $ko응답 = 받기('https://ko.wikipedia.org/api/rest_v1/page/summary/' . 인코딩($ko));
      if ($ko응답 =~ /"extract"/){
        $ko응답 =~ s/\}\s*$/,"originalimage":{"source":"$img"}}/;
        print $out join("\t", $id, $ko, $u->{en}, $cc, $u->{lat}, $u->{lng}, $ko응답), "\n";
        $사진빌림++;
      }
    }
    select(undef, undef, undef, 0.12);
    next;
  }

  # ── ② 나머지: 좌표로 근처 문서를 받아 제목이 맞는 것을 고릅니다 ──
  my $gs = 받기(sprintf(
    'https://ko.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=%s%%7C%s'
    . '&gsradius=10000&gslimit=15&format=json&formatversion=2', $u->{lat}, $u->{lng}));
  my @제목 = $gs =~ /"title"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  for (@제목){ s/\\u([0-9a-fA-F]{4})/chr(hex $1)/ge }
  # 정확히 같은 것 › 우리 이름으로 시작하는 것 › 우리 이름을 품은 것
  my ($고른) = grep { $_ eq $ko } @제목;
  ($고른) = grep { index($_, $ko) == 0 } @제목 unless $고른;
  ($고른) = grep { index($_, $ko) >= 0 } @제목 unless $고른;
  select(undef, undef, undef, 0.12);
  next unless $고른;

  my $sum = 받기('https://ko.wikipedia.org/api/rest_v1/page/summary/' . 인코딩($고른));
  print $out join("\t", $id, $ko, $u->{en}, $cc, $u->{lat}, $u->{lng}, $sum), "\n";
  $되찾음++;
  select(undef, undef, undef, 0.12);
}
close $f; close $out;
printf "떨어진 것 %d 중 · 좌표로 다시 찾음 %d · 영어판 사진 빌림 %d\n",
       $본, $되찾음, $사진빌림;
print "→ $G/wiki2-raw.tsv (1차와 합쳐 다시 판정하십시오)\n";
