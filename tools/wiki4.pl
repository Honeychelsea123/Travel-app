# ── 3차: 영어판으로 되찾기 (b654) ────────────────────────────────────
#
# 1·2차를 돌리고 96곳이 남았는데, 그 안에 **명백한 여행지**가 있었습니다 —
# 평창·포지타노·나자레·오비두스·칼람바카(메테오라), 그리고 **수도들**
# (나사우·릴롱궤·루사카·내피도·빅토리아·코로르·바스테르).
# 이유는 셋이었습니다:
#   · 한국어판 본문이 한 줄짜리 (「기후시는 일본 기후현의 도시이다.」)
#   · 이름이 겹쳐 동음이의 문서로 감 (「평창」·「나자레」)
#   · 한국어판에 문서가 아예 없음 (「칼람바카」)
#
# ⚠⚠ **기준은 「글이 한국어판에 있느냐」가 아니라 「사진과 설명을 넣을 수
#   있느냐」입니다**(사용자: 「사진이랑 설명 넣을 수 있는곳만 살리자」).
#   영어판에 사진과 긴 본문이 있으면 넣을 수 있습니다 — 어차피 앱의
#   소개글은 **우리가 우리 말투로 씁니다**(지금 469곳이 다 그렇습니다).
#   위키백과는 «재료»이지 그대로 붙일 글이 아닙니다.
#
# ⚠ **좌표 확인은 그대로 둡니다.** 이것만은 못 느슨하게 합니다 — 1차에서
#   나사우가 7,559km 떨어진 문서에, 리베리아(CR)가 나라 문서에 걸렸습니다.
#   이름이 같다는 것은 같은 곳이라는 뜻이 아닙니다.
#
# 쓰는 법: perl tools/wiki3.pl   (1·2차를 합쳐 판정한 «뒤», cull.txt 를 보고 돕니다)

use strict; use warnings; use utf8;
binmode(STDOUT, ':encoding(UTF-8)');
my $G  = '/tmp/geo';
my $UA = 'keyro-city-setup/1.0 (https://honeychelsea123.github.io/Travel-app/; qkrthgml8068@gmail.com)';

sub 받기 {
  my ($url) = @_;
  open my $p, '-|', 'curl', '-s', '-m', '12', '-A', $UA, $url or return '';
  local $/; my $r = <$p>; close $p;
  utf8::decode($r) if defined $r;
  $r // '';
}
sub 인코딩 { my $b = shift; utf8::encode($b);
  $b =~ s/([^A-Za-z0-9_.~-])/sprintf('%%%02X', ord $1)/ge; $b }
sub 값 {
  my ($j,$k) = @_;
  return undef unless $j =~ /"\Q$k\E"\s*:\s*"((?:[^"\\]|\\.)*)"/;
  my $v = $1;
  $v =~ s/\\u([0-9a-fA-F]{4})/chr(hex $1)/ge;
  $v =~ s/\\n/ /g; $v =~ s/\\"/"/g; $v =~ s/\\\//\//g; $v =~ s/\\\\/\\/g;
  $v;
}
sub 수 { my ($j,$k)=@_; $j =~ /"\Q$k\E"\s*:\s*(-?[\d.]+)/ ? $1+0 : undef }
sub 거리 {
  my ($a1,$o1,$a2,$o2) = @_;
  my $r = 6371; my $P = 3.14159265358979/180;
  my $x = sin(($a2-$a1)*$P/2)**2 + cos($a1*$P)*cos($a2*$P)*sin(($o2-$o1)*$P/2)**2;
  $x = 1 if $x > 1;
  2*$r*atan2(sqrt($x), sqrt(1-$x));
}

my %우리;
open my $n, '<:encoding(UTF-8)', "$G/new682.tsv" or die $!;
while (<$n>){ chomp; my @f = split /\t/; $우리{$f[0]} = \@f if $f[0] }
close $n;

open my $out, '>:encoding(UTF-8)', "$G/wiki4.tsv" or die $!;
open my $c, '<:encoding(UTF-8)', "$G/final-cull.txt" or die $!;
my ($본,$살림) = (0,0); my %왜;
while (<$c>){
  chomp; s/\r$//; my $id = $_ or next;
  my $u = $우리{$id} or next;
  my (undef, $ko, $en, $cc, $lat, $lng) = @$u;
  $본++;
  my $j = 받기('https://en.wikipedia.org/api/rest_v1/page/summary/' . 인코딩($en));
  select(undef,undef,undef,0.12);
  # ⚠ 영어판도 이름이 겹치면 동음이의로 갑니다(Cordoba · Nassau · Santa Maria ·
  #   Victoria · Leon · Trujillo…). 2차에서 통했던 수법을 여기도 씁니다 —
  #   **좌표로 근처 문서를 받아 제목이 맞는 것만** 고릅니다. 좌표가 닻이라
  #   딴 곳이 섞일 수가 없습니다.
  if ((값($j,'type') // '') ne 'standard'){
    my $gs = 받기(sprintf('https://en.wikipedia.org/w/api.php?action=query&list=geosearch'
              . '&gscoord=%s%%7C%s&gsradius=10000&gslimit=15&format=json&formatversion=2',
              $lat, $lng));
    my @t = $gs =~ /"title"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    for (@t){ s/\\u([0-9a-fA-F]{4})/chr(hex $1)/ge }
    my ($pick) = grep { $_ eq $en } @t;
    ($pick) = grep { index($_, $en) == 0 } @t unless $pick;
    ($pick) = grep { index($_, $en) >= 0 } @t unless $pick;
    if ($pick){
      $j = 받기('https://en.wikipedia.org/api/rest_v1/page/summary/' . 인코딩($pick));
      select(undef,undef,undef,0.12);
    }
  }

  my $type = 
값($j,'type') // '';
  if ($type ne 'standard'){ $왜{$type eq 'disambiguation' ? '영어판도 동음이의' : '영어판 문서 없음'}++; next }
  my $ex = 값($j,'extract') // '';
  if (length($ex) < 100){ $왜{'영어판 본문도 짧음'}++; next }
  my ($img) = $j =~ /"originalimage"\s*:\s*\{[^}]*?"source"\s*:\s*"((?:[^"\\]|\\.)*)"/;
  ($img)    = $j =~ /"thumbnail"\s*:\s*\{[^}]*?"source"\s*:\s*"((?:[^"\\]|\\.)*)"/ unless $img;
  if (!$img){ $왜{'영어판도 사진 없음'}++; next }
  $img =~ s/\\\//\//g;

  # ⚠ 좌표 확인은 못 느슨하게 합니다 — 여기가 딴 곳을 걸러내는 유일한 그물입니다.
  my ($cb) = $j =~ /"coordinates"\s*:\s*\{([^}]*)\}/;
  if (!defined $cb){ $왜{'좌표 없음(확인 불가)'}++; next }
  my ($wla,$wlo) = (수($cb,'lat'), 수($cb,'lon'));
  if (!defined $wla){ $왜{'좌표 없음(확인 불가)'}++; next }
  my $d = 거리($lat,$lng,$wla,$wlo);
  if ($d > 80){ $왜{sprintf('딴 곳 (%dkm)',$d)}++; next }

  print $out join("\t", $id, $ko, $en, $cc, $img, $ex), "\n";
  $살림++;
}
close $c; close $out;
printf "남았던 %d 중 영어판으로 살림 %d\n", $본, $살림;
print "못 살린 이유: ", join('  ', map {"$_ $왜{$_}"} sort {$왜{$b}<=>$왜{$a}} keys %왜), "\n";
print "→ $G/wiki4.tsv\n";
