-- =====================================================================
-- 빠진 나라 하나 — 키르기스스탄
--
-- 049 를 넣었더니 171곳 중 **170곳만** 들어갔습니다. currency 를 countries 에서
-- join 으로 가져오는데 **그 나라가 없으면 그 줄이 조용히 빠지기 때문**입니다.
-- 049 의 확인 쿼리가 그 한 곳을 잡아냈습니다(482 vs 483).
--
-- 빠진 것은 비슈케크(KG) 하나였습니다. 나라를 넣고 도시를 다시 시도합니다.
--
-- 049 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

insert into public.countries (code, name, name_en, currency, local_lang)
values ('KG', '키르기스스탄', 'Kyrgyzstan', 'KGS', 'ky')
on conflict (code) do nothing;

-- 049 에서 빠졌던 줄만 다시 넣습니다. 값은 049 와 같은 것(GeoNames)입니다.
insert into public.cities
  (id, name, name_en, country, center_lat, center_lng, timezone, currency, transit_grade, fame)
select v.id, v.name, v.name_en, v.country, v.lat, v.lng, v.tz, c.currency, v.grade, v.fame
from (values
  ('bishkek', '비슈케크', 'Bishkek', 'KG', 42.87, 74.59, 'Asia/Bishkek', 'normal', 3)
) as v(id, name, name_en, country, lat, lng, tz, grade, fame)
join public.countries c on c.code = v.country
on conflict (id) do nothing;


-- ── 확인 ─────────────────────────────────────────────────────────────
-- 이제 483 이어야 합니다. 여전히 모자라면 아래 3번이 어느 나라인지 알려줍니다.
select * from (
  select 1 as ord, '전체 도시'::text as check, count(*)::text as result from public.cities
  union all
  select 2, '비슈케크 들어갔나',
         case when exists (select 1 from public.cities where id = 'bishkek')
              then '예' else '아니오' end
  union all
  select 3, 'countries 에 없는 나라를 쓰는 도시',
         coalesce((select string_agg(distinct x.country, ' ') from public.cities x
                    where not exists (select 1 from public.countries c where c.code = x.country)),
                  '없음')
) t order by ord;
