use strict; use warnings; use utf8;
binmode(STDOUT, ':encoding(UTF-8)');
# 「맨 바깥 함수가, 남의 함수 안에서만 사는 이름을 부른다」 검사.
#
# b512 에 이걸로 앱이 반쯤 죽었습니다: 카드 만드는 코드를 openCountries
# 밖으로 꺼내면서 그 안에서만 살던 `flag` 를 이름 그대로 들고 나왔고,
# 공유 단추가 눌러도 아무 일도 안 하는 채로 배포됐습니다.
# (핸들러 안의 ReferenceError 는 화면 어디에도 안 뜹니다.)
#
# ⚠ 이 코드베이스는 함수 이름이 한글입니다 — 반드시 UTF-8 로 읽어야
#   \w 가 「발자국스펙」 을 이름으로 봅니다. 바이트로 읽으면 함수를
#   통째로 못 찾고 **조용히 0건**이 나옵니다(실제로 그랬습니다).

my %GLOBAL = map { $_ => 1 } qw(
  document window navigator location history screen console
  Math JSON Object Array String Number Boolean Date RegExp Error Promise
  Set Map WeakMap WeakSet Symbol Proxy Reflect BigInt Intl
  setTimeout clearTimeout setInterval clearInterval queueMicrotask
  requestAnimationFrame cancelAnimationFrame fetch URL URLSearchParams Blob File
  FormData Headers Request Response AbortController Image Audio
  IntersectionObserver ResizeObserver MutationObserver CSS Event CustomEvent
  DOMParser XMLSerializer TextEncoder TextDecoder crypto localStorage
  sessionStorage indexedDB performance structuredClone isNaN parseInt parseFloat
  encodeURIComponent decodeURIComponent atob btoa alert confirm prompt
  addEventListener removeEventListener dispatchEvent scrollTo scrollBy
  getComputedStyle matchMedia Notification caches self globalThis
  OffscreenCanvas Path2D ImageData FileReader MouseEvent PointerEvent TouchEvent
  KeyboardEvent DragEvent Worker BroadcastChannel
  if else for while do switch case return function class new typeof
  try catch finally throw await async import export delete void in of
);

sub strip {
  my $t = shift;
  $t =~ s{/\*[\s\S]*?\*/}{ }g;
  $t =~ s{`[^`]*`}{ }g;
  $t =~ s{'[^']*'}{ }g;
  $t =~ s{"[^"]*"}{ }g;
  $t =~ s{(^|[^:/])//[^\n]*}{$1 }g;
  return $t;
}

my $ID = qr/[\w\$]+/u;

for my $f (@ARGV){
  open my $fh, '<:encoding(UTF-8)', $f or next;
  my $raw = do { local $/; <$fh> };
  close $fh;
  my $src = strip($raw);
  my @L = split /\n/, $src;

  # ① 맨 바깥에서 만든 이름 + 가져온 이름
  my %top;
  for my $line (@L){
    $top{$1} = 1 if $line =~ /^(?:export\s+)?(?:async\s+)?(?:function|const|let|var|class)\s+($ID)/;
  }
  while ($raw =~ /import\s*\{([^}]+)\}/g){
    for (split /,/, $1){ s/^\s+|\s+$//g; s/.*\bas\s+//; $top{$_} = 1 if length }
  }
  $top{$1} = 1 while $raw =~ /import\s+($ID)\s+from/g;
  while ($src =~ /^(?:export\s+)?(?:const|let|var)\s*\{([^}]*)\}/mg){
    for (split /,/, $1){ s/^\s+|\s+$//g; s/:.*//; s/=.*//; s/\s//g; $top{$_} = 1 if length }
  }

  # ② 맨 바깥 함수 하나씩
  for (my $i = 0; $i < @L; $i++){
    next unless $L[$i] =~ /^(?:export\s+)?(?:async\s+)?function\s+($ID)\s*\(([^)]*)/;
    my ($name, $params) = ($1, $2);
    my $depth = 0; my @body; my $j = $i;
    do {
      my $line = $L[$j];
      $depth += ($line =~ tr/{//) - ($line =~ tr/}//);
      push @body, $line;
      $j++;
    } while ($j < @L && $depth > 0);
    my $body = join "\n", @body;

    my %own;
    for (split /,/, $params){ s/[^\w\$]//gu; $own{$_} = 1 if length }
    $own{$1} = 1 while $body =~ /(?:const|let|var|function|class)\s+($ID)/g;
    while ($body =~ /(?:const|let|var)\s*\{([^}]*)\}/g){
      for (split /,/, $1){ s/^\s+|\s+$//g; s/:.*//; s/=.*//; s/\s//g; $own{$_} = 1 if length }
    }
    while ($body =~ /(?:const|let|var)\s*\[([^\]]*)\]/g){
      for (split /,/, $1){ s/[^\w\$]//gu; $own{$_} = 1 if length }
    }
    $own{$1} = 1 while $body =~ /($ID)\s*=>/g;
    while ($body =~ /\(([^()]*)\)\s*=>/g){
      for (split /,/, $1){ s/[^\w\$]//gu; $own{$_} = 1 if length }
    }
    $own{$1} = 1 while $body =~ /(?:for\s*\(\s*(?:const|let|var)\s+|catch\s*\(\s*)($ID)/g;

    my %seen;
    while ($body =~ /(?:^|[^\w\$.'"])($ID)\s*\(/g){
      my $n = $1;
      next if $seen{$n}++;
      next if $own{$n} || $top{$n} || $GLOBAL{$n} || $n =~ /^\d/;
      print "  $f  $name() 이 '$n' 을 부르는데 바깥에 그 이름이 없습니다\n";
    }
  }
}
print "  검사 끝\n";

# ── 남는 오탐 둘(2026-08-29). 고치려면 정규식 리터럴과 겹친 템플릿까지
#    벗겨야 하는데, 그러려면 사실상 파서가 필요합니다. 외워 두고 넘깁니다.
#
#   net.js  human() 이 'already'    → 정규식 리터럴 안의 말
#                                     /duplicate key|23505|already (exists…)/
#   persona.js drawPersona() 이 '고리입니다'
#                                   → 템플릿 안에 겹쳐 있는 템플릿의 주석
#
# 그 둘 말고 뜨는 것은 **전부 진짜**로 보고 확인할 것.
