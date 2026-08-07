-- =====================================================================
-- 배지 숫자를 프로필과 **같은 곳에서** 가져오기
--
-- 프로필 국가는 27 인데 배지는 '첫 해외여행' 하나만 불이 들어왔습니다.
-- 둘 다 "다녀온 곳(city_ratings.been)의 나라 수"를 세는데 값이 달랐습니다.
--
-- 원인은 **같은 식을 두 군데에 베껴 쓴 것**입니다. my_footprint 의 식을
-- my_counts 가 손으로 옮겨 적었고, 옮겨 적은 것은 언젠가 어긋납니다.
-- 베끼지 말고 **부릅니다.** 이제 두 값이 다를 수가 없습니다.
--
-- 평가 수(rated)도 같습니다 — 프로필의 '평가' 숫자와 한 곳에서 옵니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

create or replace function public.my_counts()
returns jsonb
language sql stable security definer set search_path = public as $$
  with fp as (
    /* **프로필이 쓰는 그 함수를 그대로 부릅니다.** 식을 옮겨 적으면
       한쪽만 고치는 날이 오고, 그러면 "국가 27인데 배지는 왜 안 들어와"가
       됩니다. 실제로 그렇게 됐습니다. */
    select public.my_footprint() as j
  ),
  mine as (
    select t.*
      from public.trips t
      join public.trip_members m on m.trip_id = t.id
     where m.user_id = auth.uid() and m.left_at is null
       and t.end_date < current_date
  )
  select jsonb_build_object(
    'countries', coalesce(((select j from fp) ->> 'countries')::int, 0),
    'rated',     coalesce(((select j from fp) ->> 'rated')::int, 0),
    'trips',     (select count(*) from mine),
    /* 다 합친 여행 일수. 하루짜리도 1일이라 +1 합니다. */
    'days',      coalesce((select sum(end_date - start_date + 1) from mine), 0),
    'reviews',   (select count(*) from public.trip_reviews
                   where user_id = auth.uid()
                     and (comment is not null or stars is not null))
  );
$$;
grant execute on function public.my_counts() to authenticated;

-- 확인: 둘이 같아야 합니다 (SQL Editor 에서는 둘 다 0 — 로그인이 아니라 정상)
select (public.my_footprint() ->> 'countries') as "프로필 국가",
       (public.my_counts()    ->> 'countries') as "배지 국가",
       (public.my_footprint() ->> 'rated')     as "프로필 평가",
       (public.my_counts()    ->> 'rated')     as "배지 평가";
