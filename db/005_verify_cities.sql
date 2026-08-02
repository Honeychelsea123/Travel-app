-- =====================================================================
-- 확인 — 004 가 제대로 올라갔는지 본다
-- 아무것도 바꾸지 않습니다. result 가 전부 'OK' 여야 합니다.
-- =====================================================================

with c as (
  select (select count(*) from public.countries)      as countries,
         (select count(*) from public.cities)         as cities,
         (select count(*) from public.transit_grades) as grades,
         (select count(*) from public.transit_lines)  as lines
),
-- 시간대 문자열이 진짜 존재하는 IANA 이름인지 DB 에 직접 물어봅니다.
-- 오타 하나면 그 도시의 시각이 통째로 어긋납니다.
bad_tz as (
  select string_agg(id, ', ' order by id) as list
    from public.cities ct
   where not exists (select 1 from pg_timezone_names z where z.name = ct.timezone)
),
-- 통화·언어가 나라 값과 다르면 트리거가 안 걸린 것입니다.
bad_ccy as (
  select string_agg(ct.id || '(' || ct.currency || '≠' || n.currency || ')', ', ') as list
    from public.cities ct join public.countries n on n.code = ct.country
   where ct.currency <> n.currency
),
-- 이동시간 상수가 등급표와 다르면 손으로 덮어쓴 흔적입니다.
bad_grade as (
  select string_agg(ct.id, ', ') as list
    from public.cities ct join public.transit_grades g on g.grade = ct.transit_grade
   where ct.walk_max_km <> g.walk_max_km or ct.transit_factor <> g.transit_factor
      or ct.transit_base_min <> g.transit_base_min
),
-- 도쿄 값은 유일한 실측값입니다. 절대 흔들리면 안 됩니다.
tokyo as (
  select walk_max_km, transit_factor, transit_base_min, currency, timezone
    from public.cities where id = 'tokyo'
),
-- 맛집 사이트는 이제 나라 것입니다. 도시에 남아 있으면 안 됩니다.
stray_food as (
  select count(*) as n from public.cities where food_domains <> '{}'
)
select * from (
  select 1 as ord, '나라' as check,
         case when (select countries from c) >= 56 then 'OK' else 'X' end as result,
         (select countries from c)::text || '개' as note
  union all
  select 2, '도시',
         case when (select cities from c) >= 138 then 'OK' else 'X' end,
         (select cities from c)::text || '개'
  union all
  select 3, '이동등급',
         case when (select grades from c) = 4 then 'OK' else 'X' end,
         'dense / normal / limited / car'
  union all
  select 4, '시간대가 실재함',
         case when (select list from bad_tz) is null then 'OK' else 'X' end,
         coalesce('없는 시간대: ' || (select list from bad_tz),
                  'IANA 이름으로 전부 확인됨')
  union all
  select 5, '통화 = 나라 통화',
         case when (select list from bad_ccy) is null then 'OK' else 'X' end,
         coalesce('어긋남: ' || (select list from bad_ccy),
                  '도시마다 손으로 적지 않아도 됩니다')
  union all
  select 6, '이동상수 = 등급값',
         case when (select list from bad_grade) is null then 'OK' else 'X' end,
         coalesce('어긋남: ' || (select list from bad_grade), '전부 등급에서 옴')
  union all
  select 7, '도쿄 실측값 보존',
         case when (select walk_max_km from tokyo) = 1.3
               and (select transit_factor from tokyo) = 3.2
               and (select transit_base_min from tokyo) = 12
               and (select currency from tokyo) = 'JPY'
               and (select timezone from tokyo) = 'Asia/Tokyo'
              then 'OK' else 'X' end,
         '1.3km · ×3.2+12분 — 유일하게 실제로 잰 값'
  union all
  select 8, '맛집사이트는 나라로',
         case when (select n from stray_food) = 0 then 'OK' else 'X' end,
         '도시에 남은 것 ' || (select n from stray_food)::text || '개 (0이어야 함)'
  union all
  select 9, '노선색 유지',
         case when (select lines from c) >= 40 then 'OK' else 'X' end,
         (select lines from c)::text || '개 — 004 가 안 건드렸는지'
) t order by ord;
