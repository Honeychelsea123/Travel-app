use strict; use warnings; use utf8;
binmode(STDOUT, ':encoding(UTF-8)'); binmode(STDERR, ':encoding(UTF-8)');

# ── 같은 선택자가 두 번 이상 쓰인 자리를 찾습니다 ─────────────────────
#
# ⚠⚠ **왜 필요한가** — b599·b601 에서 같은 병을 하루에 두 번 앓았습니다.
#   b599: 도시 화면에 `.pcard` 를 새로 붙였는데 **이미 성향 카드**였습니다.
#         검은 바탕·흰 글씨·flex 를 그대로 뒤집어썼습니다.
#   b601: 일기 칸에 `#cv_journal` 규칙을 새로 썼는데 파일 뒤쪽에 **같은
#         id 규칙이 또** 있었습니다. 자릿수가 같으면 뒤엣것이 이깁니다.
#   둘 다 문법은 맞고 검사도 다 통과했습니다. 화면에서만 틀렸습니다.
#
# ⚠ 두 번 나오는 것이 «전부» 잘못은 아닙니다. 일부러 나중에 덮어쓰는
#   자리도 있습니다(상태·미디어질의·순서 잡기). 그래서 이 검사는
#   **막지 않고 알려만 줍니다.** 새 규칙을 쓰기 «전에» 돌려서
#   「그 이름 이미 있나」를 보는 용도입니다.
#
#   쓰기:  perl tools/dupsel.pl            (다 보기)
#          perl tools/dupsel.pl .pcard     (이 이름만 보기 — 새로 붙이기 전에)

my $f = 'app.css';
open my $h, '<:encoding(UTF-8)', $f or die "$f: $!";
my @줄 = <$h>; close $h;
my $찾기 = shift @ARGV;

# 주석을 지웁니다(줄 수는 지킵니다 — 줄번호를 말해야 하니까).
my $s = join '', @줄;
$s =~ s{/\*(.*?)\*/}{ my $t=$1; my $n=($t =~ tr/\n//); "\n" x $n }ges;
my @c = split /\n/, $s, -1;

my (%자리, $깊이);
$깊이 = 0;
my $모은 = '';
my $시작 = 0;
for my $i (0 .. $#c){
  my $l = $c[$i];
  for my $ch (split //, $l){
    if ($ch eq '{'){
      if ($모은 =~ /\S/ && $모은 !~ /^\s*\@/){
        my $sel = $모은;
        $sel =~ s/\s+/ /g; $sel =~ s/^ | $//g;
        # 규칙 안의 규칙(@media 속)도 셉니다 — 자릿수가 같으면 똑같이 위험합니다.
        push @{ $자리{$sel} }, ($시작 + 1) unless $sel =~ /^\s*$/;
      }
      $깊이++; $모은 = ''; $시작 = $i; next;
    }
    if ($ch eq '}'){ $깊이--; $모은 = ''; $시작 = $i; next; }
    if ($ch eq ';' && $깊이 == 0){ $모은 = ''; $시작 = $i; next; }
    if ($깊이 == 0 || $모은 =~ /\S/ || $ch =~ /\S/){
      $시작 = $i if $모은 !~ /\S/;
      $모은 .= $ch if $깊이 == 0 || $깊이 == 1;
    }
  }
  $모은 .= ' ' if $모은 =~ /\S/;
}

my $셈 = 0;
for my $sel (sort keys %자리){
  my @줄들 = @{ $자리{$sel} };
  next if @줄들 < 2;
  # 애니메이션 마디(from · to · 35%)는 원래 여러 번 나옵니다 — 셈에서 뺍니다.
  next if $sel =~ /^(from|to|[\d.]+%)$/;
  if (defined $찾기){ next unless index($sel, $찾기) >= 0; }
  $셈++;
  printf "  %-46s %s\n", (length($sel) > 46 ? substr($sel,0,43).'...' : $sel),
         join(' · ', map { "${f}:$_" } @줄들);
}

if (defined $찾기 && !$셈){
  # 한 번만 나와도 «이미 있는» 것입니다 — 새 이름을 붙일 때는 그게 더 중요합니다.
  my @한번 = grep { index($_, $찾기) >= 0 } keys %자리;
  if (@한번){ print "  «$찾기» 는 이미 있습니다 (한 번):\n";
              printf "  %-46s %s\n", $_, "${f}:".$자리{$_}[0] for sort @한번; }
  else { print "  «$찾기» 는 안 쓰고 있습니다 — 새로 써도 됩니다.\n"; }
}
print "  겹치는 선택자 검사 끝", (defined $찾기 ? '' : " ($셈 개)"), "\n";
