# ── 정리 SQL 만들기 (b655) ───────────────────────────────────────────
# 읽는 것: /tmp/geo/ALLDEL2.txt (지울 id) · new682.tsv (이름 확인용)
# 내는 것: db/077_cull_cities.sql
use strict; use warnings; use utf8;
binmode(STDOUT, ':encoding(UTF-8)');
my $G = '/tmp/geo';

my %이름;
open my $n, '<:encoding(UTF-8)', "$G/new682.tsv" or die $!;
while (<$n>){ chomp; my ($id,$ko,$en,$cc) = split /\t/; $이름{$id} = [$ko,$cc] if $id }
close $n;

# ⚠⚠ **그 나라의 마지막 도시는 안 지웁니다(b656 에서 겪은 것).**
#   077 을 넣고 나서 바하마·세인트키츠·세이셸에 도시가 0 이 됐습니다.
#   도시가 0 이면 그 나라는 앱에서 «없는 나라»입니다 — 깃발도 못 켜고
#   평가도 못 합니다. **애초에 도시를 늘린 이유가 그것이었는데**
#   정리하다 목적을 깎아먹었습니다(db/079 로 되살렸습니다).
#   → 아래에서 나라별로 세어, 다 지워질 나라는 제일 유명한 하나를 남깁니다.
my @del;
open my $d, '<:encoding(UTF-8)', "$G/ALLDEL2.txt" or die $!;
while (<$d>){ chomp; s/\r$//; push @del, $_ if /^[a-z0-9-]+$/ }
close $d;
die "지울 것이 없습니다\n" unless @del;

sub 따옴 { my $s = shift; $s =~ s/'/''/g; "'$s'" }
my $남 = 1151 - scalar @del;

open my $o, '>:encoding(UTF-8)', 'db/077_cull_cities.sql' or die $!;
printf $o <<'H', scalar @del, $남;
-- =====================================================================
-- 도시 목록 정리 — %d곳 삭제 (1,151 → %d)
--
-- 사용자: 「마이너한 도시들이 너무 많이 생겼던데 이미지랑 위키백과 내용
--   다 긁어올 수 있는 도시만 넣어야해」 · 「사진이랑 설명 넣을 수 있는곳만
--   살리자」 · 「다 조금씩 줄이자 한국인 아무도 안가는데도 많이 들어간거
--   같은데」 · 「북한은 삭제해」
--
-- 무엇을 지우나 (넷을 합친 것입니다):
--   ① 한국어 위키백과에 «사진 있는 문서»가 없는 곳 ......... 96
--      ⚠ 이름만으로 찾으면 「님」·「팔마」·「코르도바」가 동음이의 문서에
--        걸립니다. 그래서 **좌표로 다시 찾아** 10km 안의 문서 중 이름이
--        맞는 것만 인정했습니다(2차). 좌표 확인이 실제로 일했습니다 —
--        나사우(BS)는 7,559km 떨어진 딴 문서에, 리베리아(CR)는 나라
--        「라이베리아」 문서에 걸려 있었습니다.
--        **이름이 같다는 것은 같은 곳이라는 뜻이 아닙니다.**
--   ② 일본 과다분 .......................................... 18
--      이번에 넣은 26곳 중 여덟만 남깁니다(미야지마·고야산·가루이자와·
--      니세코·노보리베쓰·구사쓰·하쿠바·아타미 — 세계유산·스키·온천).
--   ③ 북한 ................................................. 3
--   ④ 나라별 상한 초과 .................................... 나머지
--      한국인 출국 통계 기준(계획서). 그 밖의 나라는 **1곳** — 애초에
--      도시를 늘린 이유가 「간 나라를 갔다고 말할 자리」였고, 두 곳째부터는
--      아무도 안 누릅니다. 결과: 1곳 114개국 · 2곳 22개국 · 3곳 11개국.
--
-- ⚠⚠ **기존 469곳은 하나도 안 건드립니다.** 사진과 소개글이 손으로 채워져
--   있고(469/469), 그 자체가 「넣을 만한 곳」이라는 증거입니다. 아래 목록은
--   전부 db/075 로 들어간 것들입니다.
--
-- ⚠ **누가 쓰고 있는 도시는 안 지웁니다.** 아래 `not exists` 넷이 막습니다.
--   외래키가 `on delete cascade` 라 그냥 지우면 **남의 별점과 일기가 같이
--   사라집니다.** 오늘 넣은 것이라 아무도 안 썼겠지만, 그 가정에 기대지
--   않습니다. 못 지운 것이 있으면 아래 확인 쿼리 2번이 알려줍니다.
--
-- 여러 번 실행해도 안전합니다.
-- 만든 것: tools/cullsql.pl (고르는 규칙은 tools/wikigate.pl · citytrim.pl)
-- =====================================================================

H

# ── 몬터레이 고치기 ──
print $o <<'F';
-- ── 먼저: 잘못 들어간 도시 고치기 ────────────────────────────────────
-- ⚠⚠ **이름으로 GeoNames 를 찾을 때 «별칭»까지 훑은 것이 문제였습니다.**
--   별칭이 먼저 걸리면 엉뚱한 마을이 들어옵니다. 넷이 그랬습니다:
--     오쓰→Ozu(에히메) · 가와고에→Toyoda · 후쿠야마→Okugano ·
--     몬터레이→Michie(테네시!)
--   앞의 셋은 아래 삭제 목록에 들어 있고, 몬터레이만 남으므로 여기서
--   바로잡습니다. 캘리포니아 몬터레이(36.60024, -121.89468, 인구 28,338).
--   ⚠ 다음에 목록을 만들 때는 **이름 일치를 별칭보다 우선**해야 합니다.
--     tools/citypick.pl 의 `%색인` 에 적어 뒀습니다.
update public.cities
   set id = 'monterey', name_en = 'Monterey',
       center_lat = 36.60024, center_lng = -121.89468,
       timezone = 'America/Los_Angeles'
 where id = 'michie'
   and not exists (select 1 from public.cities x where x.id = 'monterey');


-- ── 지우기 ───────────────────────────────────────────────────────────
delete from public.cities c
 where c.id in (
F

my @줄; my @묶음;
for my $i (0 .. $#del){
  push @묶음, 따옴($del[$i]);
  if (@묶음 == 8 || $i == $#del){ push @줄, '   ' . join(', ', @묶음); @묶음 = () }
}
print $o join(",\n", @줄), "\n";
print $o <<'T';
 )
   /* ⚠ 누가 쓰고 있으면 안 지웁니다 — 외래키가 cascade 라 별점·일기가
      같이 사라집니다. 네 표 모두 `city_id` 를 갖고 있습니다(직접 확인). */
   and not exists (select 1 from public.city_ratings   r where r.city_id = c.id)
   and not exists (select 1 from public.trip_legs      l where l.city_id = c.id)
   and not exists (select 1 from public.journal_photos j where j.city_id = c.id)
   and not exists (select 1 from public.trips          t where t.city_id = c.id);


-- ── 확인 ─────────────────────────────────────────────────────────────
T
my $아이디목록 = join(', ', map { 따옴($_) } @del);
printf $o <<'V', $남, $아이디목록;
-- 1번이 %d 이어야 합니다.
select * from (
  select 1 as ord, '도시 전체'::text as 확인, count(*)::text as 결과
    from public.cities
  union all
  select 2, '못 지운 것(누가 쓰는 중)',
         coalesce((select string_agg(name, ' ' order by name) from public.cities
                    where id in (%s)), '없음')
  union all
  select 3, '도시가 있는 나라', count(distinct country)::text from public.cities
  union all
  select 4, '도시가 없는 나라',
         coalesce((select string_agg(n.code, ' ' order by n.code)
                     from public.countries n
                    where not exists (select 1 from public.cities x
                                       where x.country = n.code)), '없음')
  union all
  select 5, '북한이 남았나',
         case when exists (select 1 from public.cities where country = 'KP')
              then '★남음' else '없음' end
  union all
  select 6, '몬터레이 고쳐졌나',
         coalesce((select name_en || ' ' || round(center_lat::numeric, 3)
                     from public.cities where id in ('monterey','michie')), '없음')
) t order by ord;
V
close $o;
printf "db/077_cull_cities.sql — %d곳 삭제, 남는 도시 %d\n", scalar @del, $남;
