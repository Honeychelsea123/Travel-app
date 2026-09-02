# ── 도시 목록 보강 SQL 만들기 (b651) ─────────────────────────────────
#
# 「지금 같으면 간 나라도 평가를 못해서 갔다고 할 수 없을 것 같은데」
#   — 사용자. 그래서 이 판의 목표는 **깊이가 아니라 나라 덮기**입니다.
#     러시아·이란·파키스탄·나이지리아·우크라이나는 도시가 **하나도** 없었고
#     44개국은 한두 곳뿐이었습니다. 갔다고 말할 방법이 없었습니다.
#
# ⚠⚠ **좌표와 시간대는 지어내지 않습니다.** 메모리 `city-list-expansion.md`
#   의 규칙입니다 — 어긴 적이 있습니다. 자료는 셋에서만 옵니다:
#     ① GeoNames cities500 (CC BY 4.0)  — 좌표·인구·시간대·영문 이름
#     ② GeoNames 한국어 별칭            — 한국어 이름 (있을 때)
#     ③ OpenStreetMap Nominatim (ODbL)  — 한국 여행지 좌표 (①에 없어서)
#   우리가 하는 판단은 「어느 도시를 넣을까」와 「한국어로 뭐라 적을까」 둘뿐.
#
# ⚠⚠ **인구로 뽑으면 여행지가 아니라 위성도시가 나옵니다.** 한국을 인구
#   순으로 채워 봤더니 고양·성남·부천·안산·안양·의정부가 나왔습니다. 여행
#   앱에 넣을 것이 아닙니다. 그래서:
#     · 이미 여섯 곳 이상 있는 나라는 **자동으로는 아무것도 안 넣고**
#       `curated.txt` 에 손으로 적은 것만 넣습니다.
#     · 모자란 나라만 인구 순으로 채웁니다 — 거기서는 제일 큰 도시가 곧
#       사람들이 가는 도시입니다(모스크바·테헤란·카라치·라고스·키이우).
#
# ⚠ `currency` 는 `countries` 표에서 join 으로 가져옵니다. **그 나라가
#   countries 에 없으면 그 줄은 조용히 빠집니다**(049 에서 비슈케크 하나가
#   그렇게 사라졌습니다). 지금 88개국뿐이라 107개국이 통째로 빠집니다 —
#   그래서 나라를 먼저 넣는 SQL 도 같이 만듭니다.
#
# ⚠ **`q` 라고 이름 짓지 마십시오.** 펄의 «인용 연산자»와 부딪힙니다 —
#   `q($c->{id})` 가 함수 호출이 아니라 «작은따옴표 문자열»로 파싱돼서 SQL 에
#   변수 이름이 글자 그대로 박힙니다. **오류가 안 납니다.** 한 번 겪었습니다.
#
# 쓰는 법:  perl tools/citypick.pl
# 만드는 것: db/074_countries_all.sql · db/075_more_cities.sql
#
# 자료는 두 곳에서 옵니다:
#   · tools/citydata/  — **손으로 만든 것 셋.** 저장소에 있습니다.
#       ko-country.tsv (나라 이름) · curated.txt (고른 여행지) · kr-geo.tsv (한국 좌표)
#   · /tmp/geo/        — GeoNames 원본에서 뽑은 것(85MB 라 저장소에 안 둡니다).
#       alias.tsv · ko-pool.tsv · countryInfo.txt · un-cont.tsv · have.tsv · have-cty.txt
#   ⚠ **다시 만드는 법은 `tools/citydata/README.md` 에 명령까지 적어 뒀습니다.**

use strict; use warnings; use utf8;
binmode(STDOUT, ":encoding(UTF-8)"); binmode(STDERR, ':encoding(UTF-8)');

my $G = '/tmp/geo';
# 손으로 만든 셋은 저장소에서 읽습니다 — /tmp 는 지워지는 곳입니다.
my $D = 'tools/citydata';

# ── 나라별 목표(최종 몇 곳이 될지) ───────────────────────────────────
# ⚠ 「가는 사람이 많은 나라는 많이, 다만 상한을 둔다」 — 방문객 수에 그대로
#   비례하면 일본만 200곳이 되어 목록이 기웁니다(Downloads/CITY-LIST-EXPANSION.md).
# ⚠ 이 표는 **여섯 곳 미만인 나라에만** 쓰입니다. 그 위는 손으로 고른 것만.
my $기본 = 3;
my %목표 = (
  RU=>8, UA=>5, BY=>3, MD=>3, IR=>5, IQ=>4, PK=>5, BD=>4, LK=>5, NP=>6,
  MM=>6, KH=>8, LA=>7, MN=>5, KZ=>8, UZ=>8, KG=>4, TJ=>3, TM=>3,
  AZ=>4, GE=>5, AM=>4, IL=>5, JO=>4, SA=>5, OM=>4, QA=>3, KW=>3, BH=>3, LB=>3,
  EG=>8, MA=>8, ZA=>8, TN=>4, KE=>4, TZ=>4, ET=>4, NG=>4, GH=>3, SN=>3,
  PL=>10, CZ=>8, HU=>6, RO=>5, BG=>5, RS=>4, BA=>4, SK=>4, SI=>4,
  EE=>4, LV=>4, LT=>4, IS=>5, DK=>6, SE=>7, NO=>7, FI=>6, IE=>5, BE=>8,
  AR=>8, BR=>8, CL=>6, PE=>6, CO=>6, EC=>4, BO=>4, UY=>3,
  CU=>4, CR=>4, DO=>3, JM=>3, GT=>3, PA=>3, MX=>12,
);

# ── GeoNames 한국어 별칭 바로잡기 ────────────────────────────────────
# ⚠ **GeoNames 의 한국어 별칭도 틀립니다.** Saint Petersburg 가
#   「레닌그라드」(소련 시절 이름)로 들어 있었습니다. 의심스러운 것은
#   사람이 봐야 합니다. 손댈 때는 근거가 있어야 합니다 — 「내가 아는 이름」이
#   아니라 「지금 그 도시의 이름」.
my %바로잡기 = (
  'RU|Saint Petersburg' => '상트페테르부르크',   # 별칭이 「레닌그라드」였습니다
  # ⚠ 우크라이나는 러시아어 표기가 남아 있습니다. 2022년 이후 우리말
  #   표기도 우크라이나어 기준으로 바뀌었습니다(외래어심의위).
  'UA|Kyiv'             => '키이우',            # 별칭 「키예프」
  'UA|Kharkiv'          => '하르키우',          # 별칭 「카르키프」
  'UA|Dnipro'           => '드니프로',          # 별칭 「드니프로페트로우시크」(2016년에 바뀐 옛 이름)
  'UA|Lviv'             => '리비우',            # 별칭 「리비브」
  'UA|Odesa'            => '오데사',
);

# ── 안 넣을 곳 ───────────────────────────────────────────────────────
# 여행지가 아니라 행정구역 이름이거나, 같은 도시가 두 번 나오는 것.
# ⚠ 도네츠크는 인구로는 다섯째 안에 들지만 **여행지가 아닙니다**(점령지).
#   「가봤어요?」라고 물을 곳이 아닙니다. 빼면 그 자리에 리비우가 들어옵니다.
my %빼기 = map { $_ => 1 } ('CN|Chengguan', 'CN|Chaowai', 'UA|Donetsk');

# ── 읽기 도구 ────────────────────────────────────────────────────────
sub tsv {
  my ($f) = @_;
  open my $h, '<:encoding(UTF-8)', $f or die "$f: $!";
  my @r;
  while (<$h>){ chomp; s/\r$//; next unless /\S/; next if /^#/; push @r, [split /\t/, $_, -1] }
  close $h; \@r;
}
sub 따옴 { my $s = shift // ''; $s =~ s/'/''/g; "'$s'" }
sub 슬러그 { my $s = lc shift; $s =~ s/[^a-z0-9]+/-/g; $s =~ s/^-|-$//g; $s }

my %ko나라 = map { $_->[0] => $_->[1] } @{ tsv("$D/ko-country.tsv") };
my %대륙   = map { $_->[0] => $_->[1] } @{ tsv("$G/un-cont.tsv") };

# 지금 DB 에 있는 것
my (%있는id, %있는도시, %있는수);
for my $r (@{ tsv("$G/have.tsv") }){
  my ($cc, $id, $ko, $en) = @$r;
  $있는id{$id} = 1;
  $있는수{$cc}++;
  $있는도시{"$cc|" . lc $en} = 1 if defined $en && length $en;
  $있는도시{"$cc|$ko"} = 1;
}
my $지금도시수 = scalar @{ tsv("$G/have.tsv") };

my %있는나라;
{ open my $h, '<', "$G/have-cty.txt" or die $!;
  while (<$h>){ chomp; s/\r$//; $있는나라{$_} = 1 if /^[A-Z]{2}$/ } close $h; }

# GeoNames countryInfo: 통화·공용어
my (%통화, %말);
{
  open my $h, '<:encoding(UTF-8)', "$G/countryInfo.txt" or die $!;
  while (<$h>){
    next if /^#/; chomp;
    my @f = split /\t/, $_, -1;
    next unless ($f[0] // '') =~ /^[A-Z]{2}$/;
    $통화{$f[0]} = $f[10] if $f[10];
    my $l = (split /,/, ($f[15] // ''))[0] // '';
    $l =~ s/-.*//;
    $말{$f[0]} = $l if $l =~ /^[a-z]{2,3}$/;
  }
  close $h;
}

# 한국어 이름이 있는 도시 풀 (cc, gid, ascii, ko, pop, lat, lng, tz)
my (@풀, %ko이름);
for my $r (@{ tsv("$G/ko-pool.tsv") }){
  my ($cc, $gid, $en, $ko, $pop, $lat, $lng, $tz) = @$r;
  next unless $cc && $en && $ko && defined $lng;
  $ko이름{$gid} = $ko;
  push @풀, { cc=>$cc, gid=>$gid, en=>$en, ko=>$ko, pop=>($pop||0)+0,
              lat=>$lat+0, lng=>$lng+0, tz=>$tz };
}

# 이름으로 찾는 색인 — 한국어 별칭이 없어도 찾을 수 있어야 합니다.
# ⚠ **나라로 걸러서 찾습니다.** 「Danyang」은 중국에도 있고 「Vik」은
#   노르웨이에 셋입니다. 나라를 안 걸면 엉뚱한 좌표가 들어갑니다.
my %색인;   # cc|소문자이름 -> {gid, en, pop, lat, lng, tz}
{
  open my $h, '<:encoding(UTF-8)', "$G/alias.tsv" or die $!;
  while (<$h>){
    chomp; my @f = split /\t/;
    next unless @f >= 9;
    my $k = "$f[0]|$f[1]";
    $색인{$k} //= { gid=>$f[3], en=>$f[4], pop=>($f[5]||0)+0,
                    lat=>$f[6]+0, lng=>$f[7]+0, tz=>$f[8] };
  }
  close $h;
}

# ── 기본 시간대 = 그 나라에서 인구가 제일 많은 도시의 시간대 ─────────
my %기본tz;
for my $c (sort { $b->{pop} <=> $a->{pop} } @풀){ $기본tz{$c->{cc}} //= $c->{tz} }

# ── 등급·이름값 ──────────────────────────────────────────────────────
# ⚠ transit_grade 는 화면에 안 씁니다(citysearch.js 주석) — 계산에만 쓰입니다.
my %차나라 = map { $_ => 1 } qw(US CA AU NZ IS NO);
sub 등급 {
  my ($pop, $cc) = @_;
  my $g = $pop >= 1_000_000 ? 'dense' : $pop >= 200_000 ? 'normal' : 'limited';
  if ($차나라{$cc}){ $g = $g eq 'dense' ? 'normal' : $g eq 'normal' ? 'limited' : 'car' }
  $g;
}
sub 이름값 { my $p = shift; $p >= 2_000_000 ? 3 : $p >= 300_000 ? 2 : 1 }

# ── 담기 ─────────────────────────────────────────────────────────────
my (%뽑은id, @새도시, %모자람, @못찾음, @이름없음);

sub 넣기 {
  my ($c) = @_;                       # {cc, en, ko, pop, lat, lng, tz}
  my $cc = $c->{cc};
  my $키 = "$cc|$c->{en}";
  return 0 if $빼기{$키};
  my $en = $c->{en};
  # ⚠ 한국 GeoNames 는 「Goyang-si」처럼 행정 단위가 붙어 옵니다. DB 의
  #   다른 줄은 「Gangneung」식이라 그대로 넣으면 한 표에 두 표기가 섞입니다.
  $en =~ s/-(?:si|gun|do|shi)$//i if $cc eq 'KR';
  my $ko = $바로잡기{$키} // $c->{ko};
  $ko =~ s/시$// if $cc eq 'KR' && length($ko) > 2;      # 「김해시」→「김해」
  return 0 if $있는도시{"$cc|" . lc $c->{en}};
  return 0 if $있는도시{"$cc|" . lc $en};
  return 0 if $있는도시{"$cc|$ko"};
  my $id = 슬러그($en);
  return 0 unless length $id;
  $id .= '-' . lc $cc if $있는id{$id} || $뽑은id{$id};
  return 0 if $있는id{$id} || $뽑은id{$id};
  $뽑은id{$id} = 1;
  push @새도시, { %$c, id=>$id, ko=>$ko, en=>$en };
  1;
}

# ① 손으로 고른 여행지 — 목표와 상관없이 다 넣습니다
{
  open my $h, '<:encoding(UTF-8)', "$D/curated.txt" or die $!;
  while (<$h>){
    chomp; s/\r$//; next unless /\S/; next if /^#/;
    my ($cc, @항목) = split /\|/;
    for my $항 (@항목){
      my ($en, $ko) = split /=/, $항, 2;
      my $r = $색인{"$cc|" . lc $en};
      if (!$r){ push @못찾음, "$cc|$en"; next }
      $ko = $ko이름{$r->{gid}} unless defined $ko && length $ko;
      if (!defined $ko || !length $ko){ push @이름없음, "$cc|$en"; next }
      넣기({ cc=>$cc, en=>$r->{en}, ko=>$ko, pop=>$r->{pop},
             lat=>$r->{lat}, lng=>$r->{lng}, tz=>$r->{tz} });
    }
  }
  close $h;
}

# ② 한국 여행지 — GeoNames 에 없어서 OpenStreetMap 에서 받아왔습니다
# ⚠ **GeoNames 의 한국 자료는 못 씁니다.** 「Donghae City」·「T'aebaek」·
#   「Yangp'yong」·「Eisen」·「Jenzan」처럼 표기가 뒤죽박죽이고(일제강점기
#   로마자까지 섞여 있습니다), 양양·단양·정선·영월은 아예 없습니다.
# ⚠ 인구를 모르므로 등급은 `car`(차로 가는 곳), 이름값은 2 로 둡니다 —
#   군 단위 여행지라 둘 다 맞습니다.
for my $r (@{ tsv("$D/kr-geo.tsv") }){
  my ($cc, $ko, $en, $lat, $lng) = @$r;
  넣기({ cc=>$cc, en=>$en, ko=>$ko, pop=>0, lat=>$lat+0, lng=>$lng+0,
         tz=>'Asia/Seoul', 손=>1 });
}

# ③ 모자란 나라 채우기 — **여섯 곳 미만인 나라만**
for my $cc (sort keys %ko나라){
  my $이미 = $있는수{$cc} // 0;
  next if $이미 >= 6;
  my $want = ($목표{$cc} // $기본) - $이미;
  next if $want <= 0;
  my $넣음 = 0;
  for my $c (sort { $b->{pop} <=> $a->{pop} } grep { $_->{cc} eq $cc } @풀){
    last if $넣음 >= $want;
    $넣음 += 넣기($c);
  }
  $모자람{$cc} = $want - $넣음 if $넣음 < $want;
}

# ── SQL ① 나라 ───────────────────────────────────────────────────────
my @빠진나라 = grep { !$있는나라{$_} } sort keys %ko나라;
{
  open my $o, '>:encoding(UTF-8)', 'db/074_countries_all.sql' or die $!;
  my $n = scalar @빠진나라;
  print $o <<"H";
-- =====================================================================
-- UN 195개국을 countries 에 다 넣습니다 (${n}개국 추가)
--
-- ⚠⚠ **075 보다 먼저 돌리십시오.** cities 를 넣는 SQL 은 currency 를
--   countries 에서 join 으로 가져오는데, **그 나라가 없으면 그 줄이
--   조용히 빠집니다.** 049 에서 비슈케크 하나가 그렇게 사라졌고, 지금은
--   88개국뿐이라 107개국이 통째로 빠집니다.
--
-- 이름:   CLDR 한국어(Intl.DisplayNames). 몇은 우리말에서 더 흔한 쪽으로
--         손봤습니다 — 호주 · 남아프리카공화국 · 콩고 공화국 ·
--         콩고 민주 공화국 · 중앙아프리카공화국 · 도미니카 연방.
-- 통화·공용어: GeoNames countryInfo.txt
-- 대륙:   un.js 의 UN_BY_CONT (아시아 48 · 유럽 44 · 아프리카 54 ·
--         북아메리카 23 · 남아메리카 12 · 오세아니아 14 = 195).
--   ⚠ 홈 화면의 대륙 캐러셀이 이 분모를 씁니다. 여기서 한 나라라도 다른
--     대륙에 넣으면 **같은 앱이 두 가지 수를 말합니다.**
-- 기본 시간대: 그 나라에서 인구가 제일 많은 도시의 시간대(GeoNames).
--
-- 여러 번 실행해도 안전합니다.
-- 만든 것: tools/citypick.pl — 손으로 고치지 말고 그쪽을 고치십시오.
-- =====================================================================

insert into public.countries (code, name, currency, local_lang, continent, default_timezone)
values
H
  print $o join(",\n", map {
    sprintf("  (%s, %s, %s, %s, %s, %s)", 따옴($_), 따옴($ko나라{$_}),
            따옴($통화{$_} // ''), 따옴($말{$_} // ''),
            따옴($대륙{$_} // ''), 따옴($기본tz{$_} // ''))
  } @빠진나라), "\non conflict (code) do nothing;\n\n";
  print $o <<'V';
-- ── 확인 ─────────────────────────────────────────────────────────────
-- 1번이 195 이상이어야 합니다(괌·홍콩·마카오처럼 UN 회원국이 아닌 것도
-- 이미 들어 있어서 조금 더 큽니다).
select * from (
  select 1 as ord, 'countries 전체'::text as 확인, count(*)::text as 결과
    from public.countries
  union all
  select 2, '통화가 빈 나라',
         coalesce((select string_agg(code, ' ' order by code) from public.countries
                    where currency is null or currency = ''), '없음')
  union all
  select 3, '대륙이 빈 나라',
         coalesce((select string_agg(code, ' ' order by code) from public.countries
                    where continent is null or continent = ''), '없음')
) t order by ord;
V
  close $o;
}

# ── SQL ② 도시 ───────────────────────────────────────────────────────
{
  open my $o, '>:encoding(UTF-8)', 'db/075_more_cities.sql' or die $!;
  my $새 = scalar @새도시;
  my $합 = $지금도시수 + $새;
  print $o <<"H";
-- =====================================================================
-- 도시 목록 보강 — ${새}곳 추가 ($지금도시수 → $합)
--
-- 「지금 같으면 간 나라도 평가를 못해서 갔다고 할 수 없을 것 같은데」
--   — 사용자. 그래서 이 판의 목표는 **깊이가 아니라 나라 덮기**입니다.
--   러시아·이란·파키스탄·나이지리아·우크라이나는 도시가 **하나도** 없었고
--   44개국은 한두 곳뿐이었습니다. 갔다고 말할 방법이 없었습니다.
--   → 이제 UN 195개국이 저마다 최소 세 곳을 갖습니다.
--
-- ⚠⚠ **074 를 먼저 돌리십시오.** currency 를 countries 에서 join 으로
--   가져오므로, 그 나라가 countries 에 없으면 그 줄이 **조용히** 빠집니다.
--
-- 자료(지어낸 것은 하나도 없습니다):
--   · GeoNames cities500 (CC BY 4.0) — 좌표·인구·시간대·영문 이름
--   · GeoNames 한국어 별칭            — 한국어 이름(있을 때)
--   · OpenStreetMap Nominatim (ODbL)  — 한국 여행지 좌표
--     ⚠ GeoNames 의 한국 자료는 못 씁니다. 표기가 뒤죽박죽이고
--       (「Donghae City」·「T'aebaek」·「Eisen」·「Jenzan」) 양양·단양·
--       정선·영월은 아예 없습니다.
--   · 한국어 표기가 없는 곳은 음역했습니다 — 049 에서 세운 규칙 그대로,
--     **그 경우에도 좌표는 GeoNames 것**입니다.
--
-- 고르는 규칙:
--   · 이미 여섯 곳 이상 있는 나라 → 손으로 고른 여행지만 넣습니다.
--     ⚠ 인구 순으로 채우면 여행지가 아니라 위성도시가 들어옵니다.
--       한국을 그렇게 채워 봤더니 고양·성남·부천·안산·안양·의정부가
--       나왔습니다. 여행 앱에 넣을 것이 아닙니다.
--   · 모자란 나라 → 인구 순. 거기서는 제일 큰 도시가 곧 사람들이 가는
--     도시입니다(모스크바·테헤란·카라치·라고스·키이우).
--
-- transit_grade: 100만↑ dense · 20만↑ normal · 그 아래 limited.
--   차로 다니는 나라(US·CA·AU·NZ·IS·NO)는 한 단계 낮춤.
-- fame: 200만↑ 3 · 30만↑ 2 · 그 아래 1.
--
-- ⚠ 사진(image_url)과 소개글(summary)은 **아직 없습니다.** 없어도 화면은
--   그대로 돕니다(빈 자리로 나옵니다). 채우는 것은 다음 일입니다.
--
-- 여러 번 실행해도 안전합니다.
-- 만든 것: tools/citypick.pl — 손으로 고치지 말고 그쪽을 고치십시오.
-- =====================================================================

insert into public.cities
  (id, name, name_en, country, center_lat, center_lng, timezone, currency, transit_grade, fame)
select v.id, v.name, v.name_en, v.country, v.lat, v.lng, v.tz, c.currency, v.grade, v.fame
from (values
H
  print $o join(",\n", map {
    sprintf("  (%s, %s, %s, %s, %s, %s, %s, %s, %d)",
      따옴($_->{id}), 따옴($_->{ko}), 따옴($_->{en}), 따옴($_->{cc}),
      sprintf('%.5f', $_->{lat}), sprintf('%.5f', $_->{lng}), 따옴($_->{tz}),
      따옴($_->{손} ? 'car' : 등급($_->{pop}, $_->{cc})),
      $_->{손} ? 2 : 이름값($_->{pop}))
  } sort { $a->{cc} cmp $b->{cc} or $b->{pop} <=> $a->{pop} or $a->{en} cmp $b->{en} } @새도시),
    "\n) as v(id, name, name_en, country, lat, lng, tz, grade, fame)\n",
    "join public.countries c on c.code = v.country\n",
    "on conflict (id) do nothing;\n\n";
  print $o <<"V";
-- ── 확인 ─────────────────────────────────────────────────────────────
-- 1번이 $합 이어야 합니다. 모자라면 3번이 어느 나라가 빠졌는지 알려줍니다.
select * from (
  select 1 as ord, '도시 전체'::text as 확인, count(*)::text as 결과
    from public.cities
  union all
  select 2, '도시가 있는 나라', count(distinct country)::text from public.cities
  union all
  select 3, 'countries 에 없는 나라를 쓰는 도시',
         coalesce((select string_agg(distinct x.country, ' ') from public.cities x
                    where not exists (select 1 from public.countries c
                                       where c.code = x.country)), '없음')
  union all
  select 4, '도시가 3곳 미만인 나라',
         coalesce((select string_agg(t.country, ' ' order by t.country) from (
                     select country from public.cities
                      group by country having count(*) < 3) t), '없음')
  union all
  select 5, '사진이 없는 도시',
         count(*)::text from public.cities where image_url is null or image_url = ''
) t order by ord;
V
  close $o;
}

# ── 사람이 볼 요약 ───────────────────────────────────────────────────
my %새수; $새수{$_->{cc}}++ for @새도시;
printf "새 나라 %d · 새 도시 %d · 최종 %d\n",
       scalar @빠진나라, scalar @새도시, $지금도시수 + scalar @새도시;
if (@못찾음){
  print "⚠ 손으로 고른 것 중 GeoNames 에 없던 이름(표기를 확인하십시오):\n  ",
        join('  ', @못찾음), "\n";
}
if (@이름없음){
  print "⚠ 한국어 이름이 없어 건너뛴 것(curated.txt 에 =한국어 를 적으십시오):\n  ",
        join('  ', @이름없음), "\n";
}
if (%모자람){
  print "⚠ 목표를 못 채운 나라(풀에 도시가 모자람):\n  ",
        join(' ', map { "$_(-$모자람{$_})" } sort keys %모자람), "\n";
}
print "나라별 추가: ",
      join(' ', map { "$_:$새수{$_}" } sort { $새수{$b} <=> $새수{$a} || $a cmp $b } keys %새수),
      "\n";
