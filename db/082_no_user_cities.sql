-- =====================================================================
-- 사용자가 도시를 «직접 넣는» 문을 닫는다  (db/017 을 되돌립니다)
--
-- 사용자 결정(b670): 「셀프로 도시 넣는 기능 없애자.
--                     유저들이 맘대로 이상한거 넣을 수도 있는거 아냐?」
--
-- 맞습니다. `cities` 는 **남들과 같이 보는 목록**입니다. 한 사람이 넣은
-- 이상한 이름을 모두가 보게 됩니다. db/017 을 만들던 때는 도시가 143곳
-- 뿐이라 「없으면 직접」이 필요했지만, 지금은 701곳입니다 — 필요는 줄었고
-- 위험은 그대로입니다.
--
-- ⚠⚠ **화면만 지우면 문은 열려 있습니다.** b670 에서 index.html 의
--   `#addcity` 와 rating.js 의 처리기를 걷었지만, 그것만으로는
--   `POST /rest/v1/cities` 를 직접 부르는 것을 못 막습니다. 막는 것은
--   여기(RLS)입니다. **둘 중 하나만 하면 안 됩니다.**
--
-- ⚠ 읽기(`cities_read`)는 **그대로 둡니다.** 앱 전체가 그걸로 돕니다.
-- ⚠ 이미 들어와 있는 사용자 도시는 **여기서 지우지 않습니다.** 아래
--   확인 쿼리가 목록을 보여줍니다 — 보고 나서 정하십시오. 남의 별점이
--   달려 있을 수 있어서 말없이 지우면 그 사람 기록이 사라집니다.
--
-- 081 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

-- ── 문 닫기 ──────────────────────────────────────────────────────────
-- 넣기·고치기·지우기 셋 다. 정책이 없으면 RLS 가 기본으로 막습니다.
drop policy if exists cities_insert  on public.cities;
drop policy if exists cities_own     on public.cities;
drop policy if exists cities_own_del on public.cities;

-- ⚠ `created_by` · `created_at` 칸과 `cities_country_name_uniq` 는 **남깁니다.**
--   칸을 지우면 이미 들어온 도시가 누가 넣은 것인지 알 수 없어지고,
--   같은 이름 막는 것은 우리가 넣을 때도 필요합니다(db/077 에서 이것 때문에
--   한 번 데었습니다 — 중복으로 insert 전체가 취소됐습니다).

-- ⚠ id 기본값(`u_...`)도 남깁니다. 우리가 넣을 때는 id 를 직접 적으므로
--   쓰이지 않고, 지우면 옛 마이그레이션을 다시 돌릴 때 깨집니다.


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '넣기 정책이 남아 있나'::text as 확인,
         case when exists (select 1 from pg_policies
                            where schemaname='public' and tablename='cities'
                              and policyname='cities_insert')
              then '⚠ 아직 있음' else '없음 (닫힘)' end as 결과
  union all
  select 2, '고치기·지우기 정책',
         coalesce((select string_agg(policyname, ' ' order by policyname)
                     from pg_policies
                    where schemaname='public' and tablename='cities'
                      and policyname in ('cities_own','cities_own_del')),
                  '없음 (닫힘)')
  union all
  select 3, '읽기 정책은 살아 있나 (살아 있어야 함)',
         case when exists (select 1 from pg_policies
                            where schemaname='public' and tablename='cities'
                              and policyname='cities_read')
              then '예' else '⚠ 아니오 — 앱이 멈춥니다' end
  union all
  -- 사람이 넣은 도시. 있으면 «보고 나서» 정합니다.
  select 4, '사람이 넣은 도시 수',
         (select count(*)::text from public.cities where created_by is not null)
  union all
  select 5, '그 목록',
         coalesce((select string_agg(id || '(' || name || '/' || country || ')', ' '
                                     order by name)
                     from public.cities where created_by is not null), '없음')
  union all
  -- 지우기 전에 반드시 봅니다 — 남의 별점이 달려 있으면 그 기록이 사라집니다.
  select 6, '그 도시들에 달린 별점 수',
         (select count(*)::text from public.city_ratings r
            join public.cities c on c.id = r.city_id
           where c.created_by is not null)
) t order by ord;
