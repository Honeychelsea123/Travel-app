# ── 위키백과에서 «긁어올 수 있는» 도시만 남깁니다 (b654) ─────────────
#
# 사용자 결정: 「이미지랑 위키백과 내용 다 긁어올 수 있는 도시만 넣어야해」
#   b651 에 682곳을 넣었더니 아무도 모르는 곳이 너무 많이 들어왔습니다.
#   「인구가 많다」는 여행지의 기준이 아니었습니다. 이제 기준은 하나입니다 —
#   **한국어 위키백과에 사진 있는 문서가 있느냐.** 그게 없으면 앱에서도
#   빈 카드로 나오고, 사람들은 그 도시를 아예 모릅니다.
#
# 통과 조건 넷 (하나라도 안 되면 뺍니다):
#   ① ko.wikipedia 에 문서가 있고 `type` 이 `standard` 일 것
#      — `disambiguation`(동음이의)은 「그 도시」가 아닙니다.
#   ② 본문(extract)이 60자 이상일 것 — 한 줄짜리 토막글은 소개글이 못 됩니다.
#   ③ 사진(originalimage 또는 thumbnail)이 있을 것.
#   ④ ⚠⚠ **좌표가 우리 것과 80km 안일 것.**
#      이게 없으면 엉뚱한 문서가 통과합니다 — 「님」(Nimes)·「레」(Leh)·
#      「빈」(Vinh) 같은 짧은 이름은 전혀 다른 낱말의 문서에 걸립니다.
#      **이름이 같다는 것은 같은 곳이라는 뜻이 아닙니다.**
#      ⚠ 문서에 좌표가 없으면(가끔 있습니다) 본문에 나라 이름이 있는지로
#        대신 봅니다. 둘 다 없으면 뺍니다 — 확인 못 한 것은 안 넣습니다.
#
# 쓰는 법: sh /tmp/geo/wikifetch.sh   (682줄 받기)
#          perl tools/wikigate.pl     (판정 + db/077 만들기)

use strict; use warnings; use utf8;
binmode(STDOUT, ':encoding(UTF-8)');
my $G = '/tmp/geo';

# 나라 한국어 이름 — ④의 대체 확인에 씁니다
my %ko나라;
{
  open my $h, '<:encoding(UTF-8)', 'tools/citydata/ko-country.tsv' or die $!;
  while (<$h>){ chomp; s/\r$//; my ($c,$n) = split /\t/; $ko나라{$c} = $n if $c }
  close $h;
}

sub 거리 {                       # km, 하버사인
  my ($a1,$o1,$a2,$o2) = @_;
  my $r = 6371; my $P = 3.14159265358979 / 180;
  my $da = ($a2-$a1)*$P; my $do = ($o2-$o1)*$P;
  my $x = sin($da/2)**2 + cos($a1*$P)*cos($a2*$P)*sin($do/2)**2;
  $x = 1 if $x > 1;
  2 * $r * atan2(sqrt($x), sqrt(1-$x));
}

# JSON 에서 값 하나 꺼내기 — 작은 응답이라 파서를 안 씁니다.
# ⚠ 문자열 값은 역슬래시 이스케이프가 들어 있습니다. 쓰기 전에 풉니다.
sub 값 {
  my ($j, $k) = @_;
  return undef unless $j =~ /"\Q$k\E"\s*:\s*"((?:[^"\\]|\\.)*)"/;
  my $v = $1;
  $v =~ s/\\u([0-9a-fA-F]{4})/chr(hex $1)/ge;
  $v =~ s/\\n/ /g; $v =~ s/\\"/"/g; $v =~ s/\\\\/\\/g; $v =~ s/\\\//\//g;
  $v;
}
sub 수 { my ($j,$k)=@_; $j =~ /"\Q$k\E"\s*:\s*(-?[\d.]+)/ ? $1+0 : undef }

my (@통과, @탈락, %왜);
open my $h, '<:encoding(UTF-8)', "$G/wiki-raw.tsv" or die "$G/wiki-raw.tsv: $!";
while (<$h>){
  chomp; s/\r$//;
  my ($id,$ko,$en,$cc,$lat,$lng,$json) = split /\t/, $_, 7;
  next unless $id;
  $json //= '';
  my $빼 = sub { my $r = shift; push @탈락, [$id,$ko,$cc,$r]; $왜{$r}++; };

  if ($json !~ /"title"/){ $빼->('문서 없음'); next }
  my $type = 값($json, 'type') // '';
  if ($type ne 'standard'){ $빼->($type eq 'disambiguation' ? '동음이의' : "type=$type"); next }
  my $ex = 값($json, 'extract') // '';
  if (length($ex) < 60){ $빼->('본문이 너무 짧음'); next }

  # 사진 — originalimage / thumbnail 의 source
  my ($img) = $json =~ /"originalimage"\s*:\s*\{[^}]*?"source"\s*:\s*"((?:[^"\\]|\\.)*)"/;
  ($img) = $json =~ /"thumbnail"\s*:\s*\{[^}]*?"source"\s*:\s*"((?:[^"\\]|\\.)*)"/ unless $img;
  if (!$img){ $빼->('사진 없음'); next }
  $img =~ s/\\\//\//g;

  # 좌표 — 우리 것과 80km 안인가
  my ($cb) = $json =~ /"coordinates"\s*:\s*\{([^}]*)\}/;
  if (defined $cb){
    my $wla = 수($cb,'lat'); my $wlo = 수($cb,'lon');
    if (defined $wla && defined $wlo){
      my $d = 거리($lat, $lng, $wla, $wlo);
      if ($d > 80){ $빼->(sprintf('딴 곳 (%dkm)', $d)); next }
    }
  } else {
    my $나라 = $ko나라{$cc} // '';
    if (!length($나라) || index($ex, $나라) < 0){ $빼->('좌표도 나라 확인도 없음'); next }
  }
  push @통과, { id=>$id, ko=>$ko, en=>$en, cc=>$cc, extract=>$ex, img=>$img };
}
close $h;

printf "통과 %d · 탈락 %d (합 %d)\n", scalar @통과, scalar @탈락, @통과 + @탈락;
print "탈락 이유: ", join('  ', map { "$_ $왜{$_}" }
        sort { $왜{$b} <=> $왜{$a} } keys %왜), "\n\n";

open my $o, '>:encoding(UTF-8)', "$G/wiki-pass.tsv" or die $!;
print $o join("\t", $_->{id}, $_->{ko}, $_->{cc}, $_->{img}, $_->{extract}), "\n" for @통과;
close $o;
open my $x, '>:encoding(UTF-8)', "$G/wiki-fail.tsv" or die $!;
print $x join("\t", @$_), "\n" for @탈락;
close $x;
print "통과 목록 $G/wiki-pass.tsv · 탈락 목록 $G/wiki-fail.tsv\n";
