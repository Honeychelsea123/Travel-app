# ── 빠진 위키 링크 채우기 ────────────────────────────────────────────
#
# `summary` 는 있는데 `summary_url` 이 빈 도시를 찾아 채웁니다.
#
# ⚠⚠ **이름으로만 찾으면 안 됩니다.** 오스틴·피닉스·포틀랜드·워싱턴·
#   산호세·카르타헤나·퀸스타운은 세계 여러 곳에 있는 이름입니다. 그래서
#   **좌표로 확인합니다** — 문서의 좌표가 우리 것과 80km 안이어야 통과.
#   b654 에 나사우(BS)가 7,559km 떨어진 독일 문서에 걸린 적이 있습니다.
#   **이름이 같다는 것은 같은 곳이라는 뜻이 아닙니다.**
#
# ⚠ 이름으로 안 되면 **좌표로 근처 문서를 받아**(geosearch) 제목이 우리
#   이름을 품은 것을 고릅니다. 그것도 없으면 안 채웁니다 — 틀린 링크를
#   거는 것보다 비워 두는 편이 낫습니다.
#
# ⚠⚠ **`gsradius` 는 최대 10,000(m)입니다.** 20000 을 넣었더니 결과가 아니라
#   `outofrange` 오류가 왔고, 제 코드는 그것을 「근처에 문서가 없다」로 읽어
#   **15곳 전부를 조용히 못 찾았습니다.** 0건이 나오면 자료가 없는 것인지
#   요청이 틀린 것인지 **응답을 눈으로 보십시오.**
#
# 쓰는 법: perl tools/wikilink.pl     (/tmp/geo/need15.tsv 를 읽습니다)
# 내는 것: db/081_wiki_links.sql

use strict; use warnings; use utf8;
binmode(STDOUT, ':encoding(UTF-8)');
my $G  = '/tmp/geo';
my $UA = 'keyro-city-setup/1.0 (https://honeychelsea123.github.io/Travel-app/; qkrthgml8068@gmail.com)';

sub 받기 {
  my ($u) = @_;
  open my $p, '-|', 'curl', '-s', '-m', '12', '-A', $UA, $u or return '';
  local $/; my $r = <$p>; close $p;
  utf8::decode($r) if defined $r;
  $r // '';
}
sub 인코딩 { my $b = shift; $b =~ s/ /_/g; utf8::encode($b);
  $b =~ s{([^A-Za-z0-9_.~()!*'-])}{sprintf('%%%02X', ord $1)}ge; $b }
sub 값 { my ($j,$k)=@_; return undef unless $j =~ /"\Q$k\E"\s*:\s*"((?:[^"\\]|\\.)*)"/;
  my $v=$1; $v =~ s/\\u([0-9a-fA-F]{4})/chr(hex $1)/ge; $v =~ s/\\"/"/g; $v =~ s/\\\\/\\/g; $v }
sub 수 { my ($j,$k)=@_; $j =~ /"\Q$k\E"\s*:\s*(-?[\d.]+)/ ? $1+0 : undef }
sub 거리 { my ($a1,$o1,$a2,$o2)=@_; my $P=3.14159265358979/180;
  my $x = sin(($a2-$a1)*$P/2)**2 + cos($a1*$P)*cos($a2*$P)*sin(($o2-$o1)*$P/2)**2;
  $x = 1 if $x > 1; 2*6371*atan2(sqrt($x), sqrt(1-$x)) }

# 문서 하나가 「그 도시」인지 본다 — standard 이고 좌표가 80km 안
sub 맞나 {
  my ($j, $lat, $lng) = @_;
  return (0) unless (값($j,'type') // '') eq 'standard';
  my ($cb) = $j =~ /"coordinates"\s*:\s*\{([^}]*)\}/;
  return (0) unless defined $cb;
  my ($wa,$wo) = (수($cb,'lat'), 수($cb,'lon'));
  return (0) unless defined $wa && defined $wo;
  my $d = 거리($lat,$lng,$wa,$wo);
  return ($d <= 80, $d, 값($j,'titles') ? undef : undef);
}
sub 제목 {
  my ($j) = @_;
  my ($t) = $j =~ /"titles"\s*:\s*\{[^}]*?"canonical"\s*:\s*"((?:[^"\\]|\\.)*)"/;
  return undef unless $t;
  $t =~ s/\\u([0-9a-fA-F]{4})/chr(hex $1)/ge; $t;
}

# ⚠⚠ **좌표로 찾으면 「근처 문서」가 걸립니다.** 「제목이 우리 이름을 품는다」
#   만으로는 도시가 아닌 것이 통과합니다. 실제로 이렇게 왔습니다:
#     워싱턴 → 「워싱턴 힐튼」(호텔) · 제주 → 「제주속오군적부」(조선 문서)
#     나가노 → 「나가노역」 · 포틀랜드 → 「포틀랜드 미술관」
#     골드코스트 → 「Timeline of Gold Coast, Queensland」
#   → 도시일 수 없는 낱말이 든 제목은 버립니다. 그래도 이름이 흔한 곳은
#     아래 표에 **직접 적습니다.** 링크는 눈으로 보고 고쳐야 합니다.
my $버릴말 = qr/역$|역_|미술관|박물관|호텔|힐튼|공항|대학|경기장|타워|
                적부|사지|서원|향교|Timeline|List_of|List\ of|Station|Museum|Hotel|Airport/x;
my %직접 = (
  'jeju'      => ['ko', '제주시'],
  'nagano'    => ['ko', '나가노시'],
  'portland'  => ['ko', '포틀랜드_(오리건주)'],
  'washington'=> ['ko', '워싱턴_D.C.'],
  'goldcoast' => ['ko', '골드코스트_(퀸즐랜드주)'],
);

open my $h, '<:encoding(UTF-8)', "$G/need15.tsv" or die $!;
my (@찾음, @못찾음);
while (<$h>){
  chomp; s/\r$//;
  my ($id,$ko,$en,$cc,$lat,$lng) = split /\t/;
  next unless $id && defined $lng;
  my ($판, $ti);

  # ⓞ 손으로 정한 것 — **문서가 살아 있는지만** 봅니다
  # ⚠ 여기서는 좌표를 요구하지 «않습니다». 「나가노시」는 멀쩡한 문서인데
  #   요약 응답에 좌표가 없어서, 좌표를 요구했더니 떨어졌습니다.
  #   손으로 정한 것은 «내가 고른 것»이라 확인할 대상이 다릅니다 —
  #   「그 도시가 맞나」가 아니라 「문서가 있나(동음이의 아닌가)」입니다.
  #   ⚠ 좌표가 있으면 그것도 봅니다. 있는 정보는 버리지 않습니다.
  if (my $d = $직접{$id}){
    my $j = 받기("https://$d->[0].wikipedia.org/api/rest_v1/page/summary/" . 인코딩($d->[1]));
    select(undef,undef,undef,0.15);
    if ((값($j,'type') // '') eq 'standard'){
      my ($cb) = $j =~ /"coordinates"\s*:\s*\{([^}]*)\}/;
      my $멀다 = 0;
      if (defined $cb){
        my ($wa,$wo) = (수($cb,'lat'), 수($cb,'lon'));
        $멀다 = 1 if defined $wa && defined $wo && 거리($lat,$lng,$wa,$wo) > 80;
      }
      if (!$멀다){ push @찾음, [$id, $ko, $d->[0], 제목($j) // $d->[1]]; next }
      push @못찾음, "$ko($id, 손으로 정한 문서의 좌표가 멀다)"; next;
    }
    push @못찾음, "$ko($id, 손으로 정한 문서가 없거나 동음이의)"; next;
  }

  # ① 한국어판, 우리 이름으로
  for my $후보 ($ko, "$ko (도시)", $en){
    next unless defined $후보 && length $후보;
    my $w = ($후보 eq $en) ? 'en' : 'ko';
    my $j = 받기("https://$w.wikipedia.org/api/rest_v1/page/summary/" . 인코딩($후보));
    select(undef,undef,undef,0.15);
    my ($ok, $d) = 맞나($j, $lat, $lng);
    if ($ok){ $판 = $w; $ti = 제목($j); last }
  }

  # ② 좌표로 근처 문서를 받아 이름이 맞는 것
  if (!$ti){
    for my $w ('ko','en'){
      my $gs = 받기(sprintf('https://%s.wikipedia.org/w/api.php?action=query&list=geosearch'
        . '&gscoord=%s%%7C%s&gsradius=10000&gslimit=20&format=json&formatversion=2', $w, $lat, $lng));
      select(undef,undef,undef,0.15);
      my @t = $gs =~ /"title"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
      for (@t){ s/\\u([0-9a-fA-F]{4})/chr(hex $1)/ge }
      my $key = ($w eq 'ko') ? $ko : $en;
      @t = grep { $_ !~ $버릴말 } @t;   # 도시일 수 없는 제목은 버립니다
      my ($pick) = grep { $_ eq $key } @t;
      ($pick) = grep { index($_, $key) == 0 } @t unless $pick;
      ($pick) = grep { index($_, $key) >= 0 } @t unless $pick;
      next unless $pick;
      my $j = 받기("https://$w.wikipedia.org/api/rest_v1/page/summary/" . 인코딩($pick));
      select(undef,undef,undef,0.15);
      my ($ok) = 맞나($j, $lat, $lng);
      if ($ok){ $판 = $w; $ti = 제목($j) // $pick; last }
    }
  }

  if ($ti){ push @찾음, [$id, $ko, $판, $ti] }
  else     { push @못찾음, "$ko($id)" }
}
close $h;

printf "찾음 %d · 못 찾음 %d\n", scalar @찾음, scalar @못찾음;
print "  $_->[1] → $_->[2]:$_->[3]\n" for @찾음;
print "⚠ 못 찾음(안 채웁니다): ", join(' ', @못찾음), "\n" if @못찾음;

die "채울 것이 없습니다\n" unless @찾음;
sub 따옴 { my $s=shift//''; $s =~ s/'/''/g; "'$s'" }

open my $o, '>:encoding(UTF-8)', 'db/081_wiki_links.sql' or die $!;
printf $o <<'H', scalar @찾음;
-- =====================================================================
-- 빠져 있던 위키 링크 %d곳
--
-- 소개글은 있는데 `summary_url` 이 비어 있던 곳들입니다(기존 469곳의 옛 누락).
--
-- ⚠⚠ **이름으로만 찾으면 안 됩니다.** 오스틴·피닉스·포틀랜드·워싱턴·
--   산호세·카르타헤나·퀸스타운은 세계 여러 곳에 있는 이름입니다.
--   그래서 **문서의 좌표가 우리 좌표와 80km 안인지** 확인했습니다.
--   b654 에 나사우(BS)가 7,559km 떨어진 독일 문서에 걸린 적이 있습니다 —
--   **이름이 같다는 것은 같은 곳이라는 뜻이 아닙니다.**
-- ⚠ 이름으로 안 되면 좌표로 근처 문서를 받아 이름이 맞는 것을 골랐습니다.
--   그것도 없으면 **안 채웁니다** — 틀린 링크보다 빈 칸이 낫습니다.
--
-- 여러 번 실행해도 안전합니다. 만든 것: tools/wikilink.pl
-- =====================================================================

update public.cities c set summary_url = v.url
from (values
H
print $o join(",\n", map {
  sprintf("  (%s, %s)", 따옴($_->[0]),
          따옴("https://$_->[2].wikipedia.org/wiki/" . 인코딩($_->[3])))
} @찾음), "\n) as v(id, url)\n",
  "where c.id = v.id and (c.summary_url is null or c.summary_url = '');\n\n";
print $o <<'V';
-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '링크가 있는 도시'::text as 확인, count(*)::text as 결과
    from public.cities where summary_url is not null and summary_url <> ''
  union all
  select 2, '소개글은 있는데 링크가 없는 곳',
         coalesce((select string_agg(name, ' ' order by name) from public.cities
                    where summary is not null
                      and (summary_url is null or summary_url = '')), '없음')
) t order by ord;
V
close $o;
print "→ db/081_wiki_links.sql\n";
