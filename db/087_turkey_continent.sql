-- ── 튀르키예를 아시아로 (b698 점검에서 잡음) ─────────────────────────
--
-- ⚠⚠ **같은 앱이 대륙을 두 가지로 세고 있었습니다.**
--   분자(다녀온 수)는 `my_footprint()` 가 **DB 의 countries.continent** 로 냅니다.
--   분모(전체 수)는 `map.js` 의 `CONT` = `un.js` 의 `UN_BY_CONT` 로 냅니다.
--   그 둘이 **딱 한 나라에서 갈라져 있었습니다** — TR.
--     DB      : '유럽'   (013_continents.sql:23 이 넣은 값)
--     un.js   : '아시아' (아시아 48 안에 TR 이 들어 있습니다)
--
-- ⚠ **074 가 이미 고치려고 했는데 안 먹었습니다.**
--   074_countries_all.sql:322 는 ('TR', '아시아', …) 로 적어 뒀습니다.
--   그런데 같은 파일 141~144 줄의 갱신문이
--     continent = coalesce(nullif(c.continent,''), nullif(v.continent,''))
--   라서 **이미 값이 있는 줄은 안 덮습니다.** 013 이 넣어둔 '유럽' 이 이겼습니다.
--   → 곧 **의도는 처음부터 '아시아'** 였습니다. 여기서 그 의도를 마저 적용합니다.
--
-- ⚠ 왜 지금 중요한가 — 튀르키예에는 도시가 **12곳**(이스탄불·카파도키아·
--   파묵칼레·안탈리아…) 있습니다. 한 곳이라도 매긴 사람은 그 순간부터
--     · 유럽 분자가 +1 되는데 분모(44)에는 TR 이 없습니다 → **최대 45/44 = 102.3%**
--     · 아시아 분모(48)에는 TR 이 있는데 분자에는 영영 안 들어옵니다
--       → **아시아는 아무리 다녀도 47/48 = 97.9% 가 천장입니다.**
--
-- ⚠⚠ **un.js 의 `검산(CONT)` 은 이것을 못 잡습니다.** 실제로 돌려 봤더니
--   「맞습니다」라고 답했습니다 — 그 함수는 un.js 와 map.js **둘만** 견줍니다.
--   세 번째 당사자인 DB 는 아무도 안 물어봤습니다. 아래 ②가 그 검사입니다.
--
-- ⚠ 속령은 이미 잘 처리돼 있습니다(076 의 `been` 이 parent_code 로 접습니다) —
--   괌·홍콩·마카오·북마리아나·프렌치폴리네시아는 모국 대륙으로 셉니다.
--   여기서 건드릴 것은 TR 하나뿐입니다.

-- ① 고치기 ────────────────────────────────────────────────────────────
update public.countries
   set continent = '아시아'
 where code = 'TR' and continent is distinct from '아시아';


-- ② 확인 — 그리고 **다음에 또 갈라지면 여기서 걸리게** ─────────────────
-- ⚠ un.js 의 목록을 그대로 옮겨 적지 않습니다(두 벌이 되면 또 갈라집니다).
--   대신 «대륙별 개수»만 봅니다 — un.js 가 약속한 수와 같은지.
--   아시아 48 · 유럽 44 · 아프리카 54 · 북아메리카 23 · 남아메리카 12 ·
--   오세아니아 14 = 195. 단, DB 에는 속령 6개(HK·MO·GU·MP·PF)와 북한이
--   더 들어 있으므로 **parent_code 가 없는 줄만** 셉니다.
select * from (
  select 1 as ord, '튀르키예'::text as 확인,
         coalesce((select continent from public.countries where code = 'TR'), '없음') as 결과
  union all
  select 2, '대륙별(속령 뺀 것)',
         coalesce((select string_agg(k || ' ' || n, ' · ' order by k)
                     from (select continent as k, count(*) as n
                             from public.countries
                            where parent_code is null and code <> 'KP'
                            group by 1) x), '없음')
  union all
  -- un.js 가 약속한 수와 다르면 여기서 이름이 뜹니다.
  select 3, '⚠ un.js 와 어긋난 대륙',
         coalesce((select string_agg(k || ' DB=' || n || ' un.js=' || u, ' · ' order by k)
                     from (select continent as k, count(*) as n,
                                  case continent
                                    when '아시아' then 48 when '유럽' then 44
                                    when '아프리카' then 54 when '북아메리카' then 23
                                    when '남아메리카' then 12 when '오세아니아' then 14
                                    else -1 end as u
                             from public.countries
                            where parent_code is null and code <> 'KP'
                            group by 1) y
                    where n <> u), '없음 — 맞습니다')
  union all
  select 4, '튀르키예 도시 수',
         (select count(*)::text from public.cities where country = 'TR')
) z order by ord;
