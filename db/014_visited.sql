-- =====================================================================
-- "가봤어요"를 저장하지 않고 계산한다
--
-- 전에는 city_ratings.been 을 켰다 껐다 했습니다. 그런데 별점을 매기면
-- 자동으로 켜지고 지우면 꺼지는데, 여행으로 다녀온 곳은 또 따로 켜져서
-- 어느 쪽이 맞는지 어긋나기 시작했습니다.
--   (별점을 지웠는데 가봤어요에 남아 있던 것이 그 증상입니다.)
--
-- 켜고 끄는 스위치를 없애고 **사실에서 계산**합니다.
--   가봤다 = 별점을 매겼다  OR  내 지난 여행의 구간 도시다
-- 스위치가 없으면 어긋날 자리도 없습니다.
--
-- city_ratings.been 컬럼은 남겨두지만 더 이상 쓰지 않습니다.
-- 지우면 되돌리기 어려우니 그냥 둡니다.
--
-- 013 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

-- ── 내가 다녀온 도시 ─────────────────────────────────────────────────
create or replace function public.my_visited()
returns table (city_id text)
language sql stable security definer set search_path = public as $$
  select l.city_id
    from public.trip_legs l
    join public.trips t        on t.id = l.trip_id
    join public.trip_members m on m.trip_id = t.id
   where m.user_id = auth.uid() and m.left_at is null
     and t.end_date < current_date
     and l.city_id is not null
  union
  select r.city_id
    from public.city_ratings r
   where r.user_id = auth.uid() and r.stars is not null;
$$;
grant execute on function public.my_visited() to authenticated;


-- ── 발자국 다시 쓰기 ─────────────────────────────────────────────────
create or replace function public.my_footprint()
returns jsonb
language sql stable security definer set search_path = public as $$
  with been as (
    select v.city_id, c.country, n.continent
      from public.my_visited() v
      join public.cities c         on c.id = v.city_id
      left join public.countries n on n.code = c.country
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


-- 이제 안 씁니다. 다녀온 것은 여행에서 저절로 나옵니다.
drop function if exists public.mark_visited(uuid);


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '다녀온 도시 함수'::text as check,
         case when has_function_privilege('authenticated','public.my_visited()','execute')
              then 'OK' else 'X' end as result,
         '별점을 매겼거나 지난 여행의 구간 도시'::text as note
  union all
  select 2, '켜고 끄는 스위치 없앰',
         case when not exists (select 1 from pg_proc p
                               join pg_namespace n on n.oid = p.pronamespace
                                where n.nspname='public' and p.proname='mark_visited')
              then 'OK' else 'X' end,
         'been 을 손으로 켜던 길을 없앴다'
  union all
  select 3, '지금 내 발자국',
         'OK',
         coalesce((select (public.my_footprint())::text), '{}')
) t order by ord;
