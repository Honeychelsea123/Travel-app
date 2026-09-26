#!/usr/bin/perl
# ── 문법 하네스 만들기 (b755 에 tools/ 로 옮김) ────────────────────────
#
# ⚠ **이것은 «검사기»가 아니라 «생성기»입니다.** `_syn.html` 을 씁니다.
#   tools/*.pl 을 통째로 돌리는 짓은 하지 마십시오(그러다 db/075 를 덮은
#   적이 있습니다 — 메모 qa-sweep-b414 참고). 이 파일은 손으로 부릅니다.
#
# 쓰기:  perl tools/syntax.pl app.js photo.js ...
#        그다음 브라우저로 _syn.html 을 열고
#        [...document.querySelectorAll('pre.src')].map(...new Function...)
#
# ⚠ **만들기만 하고 «열어보지 않으면» 아무 소용이 없습니다**(b741 에 그렇게
#   해서 앱을 죽였습니다). 결과를 반드시 읽으십시오.
# ⚠ 인라인 <script> 는 미리보기 창에서 안 돕니다 — 그래서 <pre> 에 담고
#   바깥에서 eval 합니다.
my $out = "<!doctype html><meta charset=utf-8><title>문법</title>\n";
for my $p (@ARGV){
  open my $h,'<:encoding(UTF-8)',$p or die $!; local $/; my $s=<$h>; close $h;
  $s =~ s/\r\n/\n/g;
  $s =~ s/^\s*import\s[^;]*;/ /gms;   # 여러 줄짜리 import 도 걷습니다
  $s =~ s/^export\s+(?=(async\s+)?function|const|let|class)/ /gm;
  $s =~ s/^export\s*\{[^}]*\};?\s*$//gm;
  $s =~ s/&/&amp;/g; $s =~ s/</&lt;/g; $s =~ s/>/&gt;/g;
  $out .= "<pre class=src data-n=\"$p\">$s</pre>\n";
}
open my $o,'>:encoding(UTF-8)','_syn.html' or die $!; print $o $out; close $o;
print "만듦\n";
