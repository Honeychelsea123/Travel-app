-- =====================================================================
-- 같은 도시가 두 번 등록된 것을 하나로 합친다
--
-- 벳푸가 두 개 있습니다.
--   beppu     "벳푸"
--   nagasaki2 "벳부"   <- 초기 시드 때 들어간 실수입니다.
--                          id 는 나가사키인데 이름은 벳부입니다.
--
-- 그냥 두면 별점이 두 곳으로 갈라집니다. 같은 도시를 두 번 매기게 되고
-- 평균도 두 개가 따로 나옵니다. nagasaki2 를 beppu 로 합치고 지웁니다.
--
-- cities 를 가리키는 곳이 네 군데입니다. 지우기 전에 다 옮깁니다.
--   transit_lines.city_id  (on delete cascade -- 안 옮기면 사라집니다)
--   trips.city_id          (on delete set null)
--   trip_legs.city_id      (on delete set null)
--   city_ratings.city_id   (on delete cascade -- 안 옮기면 사라집니다)
--
-- 027 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

do $$
declare
  v_dup  text := 'nagasaki2';
  v_keep text := 'beppu';
begin
  -- 남길 쪽이 없으면 아무것도 하지 않습니다. 잘못 지우는 것보다 안전합니다.
  if not exists (select 1 from public.cities where id = v_keep) then
    raise notice '남길 도시(%)가 없습니다. 건너뜁니다.', v_keep;
    return;
  end if;
  if not exists (select 1 from public.cities where id = v_dup) then
    raise notice '이미 정리됐습니다.';
    return;
  end if;

  -- ── 별점 ───────────────────────────────────────────────────────────
  -- 두 곳 다 매긴 사람이 있으면 옮길 수 없습니다(기본키가 user_id, city_id).
  -- 그런 경우는 남길 쪽 값을 그대로 두고 중복 쪽만 버립니다.
  update public.city_ratings r set city_id = v_keep
   where r.city_id = v_dup
     and not exists (select 1 from public.city_ratings k
                      where k.user_id = r.user_id and k.city_id = v_keep);
  delete from public.city_ratings where city_id = v_dup;

  -- ── 노선색 ─────────────────────────────────────────────────────────
  -- (city_id, name) 이 유일해야 하므로 이미 같은 이름이 있으면 버립니다.
  update public.transit_lines l set city_id = v_keep
   where l.city_id = v_dup
     and not exists (select 1 from public.transit_lines k
                      where k.city_id = v_keep and k.name = l.name);
  delete from public.transit_lines where city_id = v_dup;

  -- ── 여행과 구간 ────────────────────────────────────────────────────
  -- 이름표일 뿐이라 그냥 갈아 끼우면 됩니다.
  update public.trips     set city_id = v_keep where city_id = v_dup;
  update public.trip_legs set city_id = v_keep where city_id = v_dup;

  delete from public.cities where id = v_dup;
  raise notice '% 를 % 로 합쳤습니다.', v_dup, v_keep;
end $$;


-- ── 다른 중복이 또 있는지 본다 ───────────────────────────────────────
-- 이름이 같거나, 좌표가 5km 안에 있으면서 나라가 같으면 의심합니다.
select * from (
  select 1 as ord, '벳부 중복'::text as check,
         case when exists (select 1 from public.cities where id = 'nagasaki2')
              then 'X 남아 있음' else 'OK 정리됨' end as result,
         '별점과 구간은 벳푸로 옮겼습니다'::text as note
  union all
  select 2, '도시 수', count(*)::text, '312곳이면 하나 지워진 것입니다'
    from public.cities
  union all
  select 3, '이름이 겹치는 도시',
         coalesce(count(*)::text, '0'),
         coalesce(string_agg(nm || '(' || ids || ')', ' / '), '없음')
    from (select name as nm, string_agg(id, '+') as ids
            from public.cities group by name, country having count(*) > 1) d
  union all
  select 4, '좌표가 5km 안인 짝',
         coalesce(count(*)::text, '0'),
         coalesce(string_agg(pair, ' / '), '없음')
    from (
      select a.name || '=' || b.name as pair
        from public.cities a join public.cities b
          on a.id < b.id and a.country = b.country
         and a.center_lat is not null and b.center_lat is not null
         and 6371 * 2 * asin(sqrt(
               power(sin(radians(b.center_lat - a.center_lat) / 2), 2) +
               cos(radians(a.center_lat)) * cos(radians(b.center_lat)) *
               power(sin(radians(b.center_lng - a.center_lng) / 2), 2))) < 5
    ) p
) t order by ord;
