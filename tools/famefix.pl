# ── 새로 넣은 도시의 fame 을 바로잡습니다 (b656) ────────────────────
#
# ⚠⚠ **`fame` 은 작을수록 유명합니다**(db/033):
#     1 누구나 아는 곳(도쿄·파리·뉴욕) · 2 여행 좀 다니면 아는 곳 ·
#     3 덜 알려진 곳
#   그런데 db/075 는 **인구가 많을수록 3** 을 줬습니다. 정확히 거꾸로입니다.
#   그대로 두면 성향 카드의 「남들이 안 가는 도시 매니아」 판정이 뒤집히고
#   (card.js 의 avgFame), 추천 가중치도 반대로 갑니다(rec.js).
#
# ⚠ **인구로는 못 정합니다.** 카라치·라고스·킨샤사는 200만이 넘지만 한국
#   사람은 모릅니다. fame 은 **한국인 기준의 «알려짐»**이지 크기가 아닙니다.
#   그래서 이렇게 매깁니다:
#     · 손으로 고른 여행지(curated.txt) ......... 2
#     · 한국 여행지(kr-geo.tsv) ................. 2
#     · 그 나라에서 제일 큰 도시(대개 수도) ..... 2
#     · 나머지 ................................. 3
#   **1 은 안 씁니다.** 「누구나 아는 곳」은 이미 기존 469곳에 다 있습니다.
#
# ⚠ SQL 은 **절대값을 넣습니다**(뒤집기가 아니라). 두 번 돌려도 같은 결과가
#   나와야 합니다 — 뒤집기로 짜면 두 번 돌렸을 때 도로 거꾸로 갑니다.

use strict; use warnings; use utf8;
binmode(STDOUT, ':encoding(UTF-8)');
my $G = '/tmp/geo';

sub 줄들 { my $f=shift; open my $h,'<:encoding(UTF-8)',$f or die "$f: $!";
  my @r; while(<$h>){ chomp; s/\r$//; next unless /\S/; push @r, $_ } close $h; @r }

my %지움 = map { $_ => 1 } 줄들("$G/ALLDEL2.txt");

# 손으로 고른 것 — 나라|한국어이름
my %손;
for my $l (줄들('tools/citydata/curated.txt')){
  next if $l =~ /^#/;
  my ($cc, @it) = split /\|/, $l;
  for my $i (@it){ my ($en,$ko) = split /=/, $i, 2; $손{"$cc|$ko"} = 1 if defined $ko }
}
# 한국 여행지
my %한국;
for my $l (줄들('tools/citydata/kr-geo.tsv')){
  my (undef,$ko) = split /\t/, $l; $한국{"KR|$ko"} = 1 if $ko;
}
# 나라별 제일 큰 도시 — db/075 의 fame 3(= 그때 규칙으로 200만↑)과
# 무관하게, 인구 자료(ko-pool)에서 다시 셉니다.
my %인구;
for my $l (줄들("$G/ko-pool.tsv")){
  my ($cc,undef,undef,$ko,$pop) = split /\t/, $l;
  next unless $cc && $ko;
  $인구{"$cc|$ko"} = ($pop||0) + 0;
}
my %최대;
for my $l (줄들("$G/new682.tsv")){
  my ($id,$ko,$en,$cc) = split /\t/, $l;
  next if $지움{$id};
  my $p = $인구{"$cc|$ko"} // 0;
  $최대{$cc} = [$id, $p] if !$최대{$cc} || $p > $최대{$cc}[1];
}

# ⚠ **수도라고 다 2 는 아닙니다.** 「그 나라 최대 도시」만으로 매겼더니
#   부줌부라·우아가두구·방기까지 「여행 좀 다니면 아는 곳」이 됐습니다.
#   한국 사람 기준으로는 셋 다 «덜 알려진 곳»입니다.
#   → 최대 도시는 **그 나라를 실제로 가는 경우에만** 2 로 봅니다. 기준은
#     「그 나라에 도시가 넷 이상이냐」 — 우리가 도시를 넷 넣었다는 것은
#     한국인이 실제로 가는 나라라는 뜻입니다(상한이 방문 통계로 정해졌으므로).
my %나라도시수;
for my $l (줄들("$G/have.tsv")){ my ($cc) = split /\t/, $l; $나라도시수{$cc}++ }
for my $l (줄들("$G/new682.tsv")){
  my ($id,undef,undef,$cc) = split /\t/, $l;
  $나라도시수{$cc}++ unless $지움{$id};
}

my (@둘, @셋);
for my $l (줄들("$G/new682.tsv")){
  my ($id,$ko,$en,$cc) = split /\t/, $l;
  next if $지움{$id};
  my $두냐 = $손{"$cc|$ko"} || $한국{"$cc|$ko"}
          || ($최대{$cc} && $최대{$cc}[0] eq $id && ($나라도시수{$cc} // 0) >= 4);
  push @{ $두냐 ? \@둘 : \@셋 }, $id;
}

sub 목록 {
  my @q = map { "'$_'" } @_;
  my (@줄, @묶);
  for my $i (0 .. $#q){
    push @묶, $q[$i];
    if (@묶 == 8 || $i == $#q){ push @줄, '    ' . join(', ', @묶); @묶 = () }
  }
  join(",\n", @줄);
}

open my $o, '>:encoding(UTF-8)', 'db/078_fame_fix.sql' or die $!;
printf $o <<'H', scalar @둘, scalar @셋;
-- =====================================================================
-- 새로 넣은 도시의 fame 을 바로잡습니다 (2등급 %d · 3등급 %d)
--
-- ⚠⚠ **`fame` 은 작을수록 유명합니다**(db/033):
--     1 누구나 아는 곳(도쿄·파리·뉴욕) · 2 여행 좀 다니면 아는 곳 ·
--     3 덜 알려진 곳
--   그런데 db/075 는 **인구가 많을수록 3** 을 줬습니다. 정확히 거꾸로입니다.
--   그대로 두면 성향 카드의 「남들이 안 가는 도시 매니아」 판정이 뒤집히고
--   (card.js 의 avgFame), 추천 가중치도 반대로 갑니다(rec.js 의 `3 - fame`).
--
-- ⚠ **인구로는 못 정합니다.** 카라치·라고스·킨샤사는 200만이 넘지만 한국
--   사람은 모릅니다. fame 은 **한국인 기준의 «알려짐»**이지 크기가 아닙니다.
--   그래서 이렇게 매깁니다:
--     · 손으로 고른 여행지 · 한국 여행지 · 그 나라 최대 도시 ..... 2
--     · 나머지 .................................................. 3
--   **1 은 안 씁니다.** 「누구나 아는 곳」은 이미 기존 469곳에 다 있습니다.
--
-- ⚠ **절대값을 넣습니다**(뒤집기가 아니라). 여러 번 돌려도 같은 결과입니다 —
--   뒤집기로 짜면 두 번 돌렸을 때 도로 거꾸로 갑니다.
-- ⚠ 077 을 먼저 돌리십시오. 여기 목록은 **살아남은 도시**만 담고 있습니다.
--
-- 만든 것: tools/famefix.pl
-- =====================================================================

update public.cities set fame = 2 where id in (
H
print $o 목록(@둘), "\n);\n\nupdate public.cities set fame = 3 where id in (\n";
print $o 목록(@셋), "\n);\n\n";
print $o <<'V';
-- ── 확인 ─────────────────────────────────────────────────────────────
-- 1등급은 기존 469곳에서만 나와야 합니다(새로 넣은 것에는 1 이 없습니다).
select * from (
  select 1 as ord, 'fame 1 (누구나 아는 곳)'::text as 확인,
         count(*)::text as 결과 from public.cities where fame = 1
  union all
  select 2, 'fame 2', count(*)::text from public.cities where fame = 2
  union all
  select 3, 'fame 3', count(*)::text from public.cities where fame = 3
  union all
  select 4, 'fame 이 빈 곳', count(*)::text from public.cities where fame is null
  union all
  select 5, '미국에서 제일 유명한 다섯',
         (select string_agg(name, ' ' order by fame, name)
            from (select name, fame from public.cities
                   where country = 'US' and fame is not null
                   order by fame, name limit 5) x)
) t order by ord;
V
close $o;
printf "db/078_fame_fix.sql — 2등급 %d · 3등급 %d\n", scalar @둘, scalar @셋;
