use strict; use warnings; use utf8;
binmode(STDOUT, ':encoding(UTF-8)');
# 「템플릿 문자열 안 HTML 주석에 역따옴표」 검사.
#
# 이 함정에 세 번 걸렸습니다.
#   b394  persona.js — 주석에 백틱 하나로 파일 전체가 안 읽혔습니다.
#   b505  map.js     — 주석에 `data-shelf` 를 써서 모듈 아홉이 같이 죽었습니다.
#   b548  persona.js — 주석에 `spec.picks` 를 써서 다섯이 같이 죽었습니다.
#
# 세 번 다 증상이 같습니다: **문법은 멀쩡해 보이는데 그 파일을 import 하는
# 모듈이 줄줄이 죽습니다.** `Unexpected identifier` 가 엉뚱한 이름을 가리켜서
# 어디가 원인인지 안 보입니다.
#
# ⚠ **역따옴표 «개수»를 세는 것으로는 못 잡습니다.** 짝수면 통과하는데,
#   b548 은 짝수였고도 깨졌습니다 — 자리가 문제지 개수가 아닙니다.
#
# 방법: `<!--` 부터 `-->` 까지 안에 역따옴표가 있으면 알립니다. HTML 주석은
# JS 문법이 아니므로, 그것이 소스에 있다는 것은 곧 **템플릿 문자열 안**이라는
# 뜻입니다. 그 안의 역따옴표는 언제나 잘못입니다.
#
# 쓰기:  perl tools/tick.pl *.js

my $탈 = 0;
for my $f (@ARGV){
  open my $h, '<:encoding(UTF-8)', $f or next;
  local $/;
  my $s = <$h>;
  close $h;
  my $줄 = 1;
  my $안 = 0;      # 지금 HTML 주석 안인가
  my $연 = 0;      # 주석이 열린 줄
  while ($s =~ /(\n|<!--|-->|`)/g){
    my $t = $1;
    if ($t eq "\n"){ $줄++; next }
    if ($t eq '<!--'){ $안 = 1; $연 = $줄; next }
    if ($t eq '-->'){ $안 = 0; next }
    if ($t eq '`' && $안){
      print "  $f:$줄  HTML 주석(줄 $연 에서 열림) 안에 역따옴표\n";
      $탈++;
    }
  }
}
print $탈 ? "  ⚠ $탈 곳 — 그 파일을 쓰는 모듈이 통째로 죽습니다\n"
          : "  역따옴표 검사 끝\n";
exit($탈 ? 1 : 0);
