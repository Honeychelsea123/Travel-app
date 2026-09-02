# ── 「없는 것을 부정하기」 덫 (b647) ────────────────────────────────
# `!무엇?.어쩌고()` 는 무엇이 없을 때 undefined 를 부정해 **true** 가 됩니다.
# 그래서 「없다」가 「있고 그 조건이 참이다」로 뒤집힙니다.
# b647 에서 이 한 줄이 앱의 뒤로가기를 통째로 죽였습니다:
#   if (!$('gsheet')?.classList.contains('hide')) return 시트닫기(true);
#   → #gsheet 는 마크업에 없고 필요할 때 만들어집니다. 그 전까진 null 이라
#     이 조건이 늘 참이 되어 popstate 사슬이 첫 줄에서 끊겼습니다.
# ⚠ 다 틀린 것은 아닙니다 — `!r.data?.length` 처럼 「없으면 없는 것」인
#   경우는 맞습니다. 뒤에 **불리언을 돌려주는 호출**(contains/includes/
#   matches/has/startsWith/endsWith)이 올 때가 위험합니다. 그것만 고릅니다.
use strict; use warnings; use utf8;
binmode(STDOUT, ':encoding(UTF-8)');
my $덫 = qr,!\s*[\$\w][^\s;]*\?\.[^;]*\b(?:contains|includes|matches|has|startsWith|endsWith)\s*\(,;
# ⚠ 남의 코드는 뺍니다 — 한 줄로 뭉쳐 있어 오탐만 나옵니다.
my %뺄것 = ('supabase.js' => 1);
my $n = 0;
for my $f (grep { !$뺄것{$_} } glob('*.js')){
  open my $h, '<:encoding(UTF-8)', $f or next;
  my $줄 = 0;
  my $주석 = 0;   # ⚠ 여러 줄 주석 안은 건너뜁니다 — 이 덫을 설명하는 주석에
                  #   덫 모양이 그대로 적혀 있어 검사기가 자기 자신을 잡았습니다.
  while (my $l = <$h>){
    $줄++;
    next if length($l) > 300;            # 뭉친 줄은 안 봅니다
    if ($주석){ $주석 = 0 if $l =~ m,\*/,; next }
    if ($l =~ m,/\*, && $l !~ m,\*/,){ $주석 = 1; next }
    next if $l =~ m,^\s*(?:\*|//|\#),;
    next unless $l =~ $덫;
    $l =~ s,^\s+|\s+$,,g;
    print "!! $f:$줄  $l\n"; $n++;
  }
  close $h;
}
print $n ? "덫 $n 개\n" : "  덫 없음\n";
exit($n ? 1 : 0);
