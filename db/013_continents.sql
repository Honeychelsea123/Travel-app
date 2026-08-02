-- =====================================================================
-- 나라에 대륙을 넣는다
--
-- 프로필에서 "아시아 8 · 유럽 3 · 북미 1"처럼 쪼개 보여주려는 것입니다.
-- 어디가 비었는지 눈에 보이면 다음 여행을 정하는 데 도움이 됩니다.
--
-- 튀르키예처럼 두 대륙에 걸친 나라는 하나를 골라야 합니다.
-- 여행자가 묶어 생각하는 쪽으로 넣었습니다.
--
-- 012 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

alter table public.countries add column if not exists continent text;

update public.countries c set continent = v.k
from (values
  -- 아시아
  ('JP','아시아'),('KR','아시아'),('TW','아시아'),('HK','아시아'),('MO','아시아'),
  ('CN','아시아'),('TH','아시아'),('SG','아시아'),('MY','아시아'),('VN','아시아'),
  ('PH','아시아'),('ID','아시아'),('KH','아시아'),('LA','아시아'),('MM','아시아'),
  ('IN','아시아'),('AE','아시아'),('QA','아시아'),('IL','아시아'),
  -- 유럽 (튀르키예는 두 대륙에 걸쳐 있지만 여행에서는 유럽으로 묶입니다)
  ('TR','유럽'),
  ('FR','유럽'),('GB','유럽'),('IE','유럽'),('IT','유럽'),('ES','유럽'),
  ('PT','유럽'),('NL','유럽'),('BE','유럽'),('DE','유럽'),('CZ','유럽'),
  ('AT','유럽'),('HU','유럽'),('CH','유럽'),('DK','유럽'),('SE','유럽'),
  ('NO','유럽'),('FI','유럽'),('IS','유럽'),('HR','유럽'),('GR','유럽'),
  ('PL','유럽'),
  -- 아메리카
  ('US','북아메리카'),('CA','북아메리카'),('MX','북아메리카'),
  ('BR','남아메리카'),('AR','남아메리카'),('PE','남아메리카'),('CL','남아메리카'),
  -- 오세아니아 (괌·사이판은 미국령이지만 위치로 묶습니다)
  ('AU','오세아니아'),('NZ','오세아니아'),('GU','오세아니아'),('MP','오세아니아'),
  -- 아프리카
  ('EG','아프리카'),('MA','아프리카'),('ZA','아프리카'),('KE','아프리카')
) as v(code, k)
where c.code = v.code;


-- ── 내 발자국 ────────────────────────────────────────────────────────
-- 나라 수 · 도시 수 · 평가 수 · 가보고 싶은 곳 수, 그리고 대륙별 나라 수.
-- 한 번에 받아야 화면이 여러 번 안 깜빡입니다.
create or replace function public.my_footprint()
returns jsonb
language sql stable security definer set search_path = public as $$
  with been as (
    select distinct c.id as city_id, c.country, n.continent
      from public.city_ratings r
      join public.cities c    on c.id = r.city_id
      left join public.countries n on n.code = c.country
     where r.user_id = auth.uid() and r.been
  )
  select jsonb_build_object(
    'cities',    (select count(*) from been),
    'countries', (select count(distinct country) from been),
    'rated',     (select count(*) from public.city_ratings
                   where user_id = auth.uid() and stars is not null),
    'wants',     (select count(*) from public.city_ratings
                   where user_id = auth.uid() and want),
    'trips',     (select count(*) from public.trip_members m
                   join public.trips t on t.id = m.trip_id
                  where m.user_id = auth.uid() and m.left_at is null
                    and t.end_date < current_date),
    'by_continent', coalesce((
      select jsonb_object_agg(k, n) from (
        select coalesce(continent, '기타') as k, count(distinct country) as n
          from been group by 1
      ) x), '{}'::jsonb)
  );
$$;
grant execute on function public.my_footprint() to authenticated;


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '대륙 채움'::text as check,
         case when (select count(*) from public.countries where continent is null) = 0
              then 'OK' else 'X' end as result,
         (select count(*) from public.countries where continent is not null)::text ||
         '/' || (select count(*) from public.countries)::text || '개' as note
  union all
  select 2, '대륙 종류',
         'OK',
         (select string_agg(distinct continent, ' · ') from public.countries)
  union all
  select 3, '발자국 함수',
         case when has_function_privilege('authenticated','public.my_footprint()','execute')
              then 'OK' else 'X' end,
         '나라 · 도시 · 평가 · 가보고 싶은 곳 · 다녀온 여행'
) t order by ord;
