# ── 같은 이름을 «두 번» 들여오지 않았나 ──────────────────────────────
#
# b676 에서 라이브가 통째로 깨졌습니다:
#     SyntaxError: Identifier '나라거르개닫기' has already been declared
# 고치는 스크립트를 두 번 돌려 import 줄이 두 벌이 됐는데,
# `imports.pl`(안 들여온 것 찾기)도 `scope.pl` 도 이걸 못 잡습니다.
# **없는 것만 찾고 겹치는 것은 안 찾고 있었습니다.**
#
# ⚠ 자바스크립트 모듈에서 이름이 겹치면 **파일 전체가 안 돕니다.** 화면에
#   「화면을 못 불러왔어요」만 뜨고, 어디가 문제인지는 콘솔을 봐야 압니다.
#   문법이 맞아도 안 도는 것이 아니라, 아예 문법 오류입니다.
#
# 쓰는 법: perl tools/dupimp.pl

use strict; use warnings; use utf8;
binmode(STDOUT, ':encoding(UTF-8)');

my @files = grep { -f } glob('*.js');
my $bad = 0;

for my $f (@files){
  next if $f eq 'supabase.js';          # 묶어 놓은 남의 코드
  open my $h, '<:encoding(UTF-8)', $f or next;
  local $/; my $s = <$h>; close $h;

  # import { a, b as c } from '...'  ·  import d from '...'
  my %어디;
  while ($s =~ /^import\s+(.+?)\s+from\s+['"][^'"]+['"];/gm){
    my $안 = $1;
    my $줄 = 1 + substr($s, 0, pos($s)) =~ tr/\n//;
    $안 =~ s/\{|\}//g;
    for my $n (split /,/, $안){
      $n =~ s/^\s+|\s+$//g;
      next unless length $n;
      $n = $1 if $n =~ /\bas\s+(\S+)$/;   # `x as y` 는 y 가 이름
      next if $n eq '*';
      push @{ $어디{$n} }, $줄;
    }
  }

  for my $n (sort keys %어디){
    next if @{ $어디{$n} } < 2;
    printf "!! %-16s %s 을(를) %d 번 들여옴 (줄 %s)\n",
           $f, $n, scalar @{ $어디{$n} }, join(', ', @{ $어디{$n} });
    $bad++;
  }
}

print $bad ? "겹치는 import $bad 건 — 고치십시오\n" : "겹치는 import 없음\n";
exit($bad ? 1 : 0);
