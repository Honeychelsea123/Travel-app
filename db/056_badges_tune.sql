-- =====================================================================
-- 배지 손보기 2 — 다녀온 곳은 나라만, 여행은 일수만, 후기는 사진 뺌
--
-- 갈래마다 재는 것이 하나여야 사다리가 됩니다. 전에는 '다녀온 곳'에
-- 나라·도시·대륙이 섞여 있어서 첫 해외여행 → 3개국 → 대륙 3곳 → 10개국
-- 처럼 뒤죽박죽으로 올라갔습니다.
--
--   평가       평가한 곳 수      10 20 30 40 50 60 80 100
--   다녀온 곳  나라 수           1 5 10 20 30 40 50 100
--   여행       **다 합친 여행 일수**  1(첫 여행) 7 15 30 50 100 200 365
--   후기       후기 수           1 5 10 20
--
-- '다녀온 곳'의 나라 수는 프로필에 찍히는 국가 숫자와 **같은 셈**입니다
-- (my_footprint 의 countries 와 아래 my_counts 의 countries 가 같은 식).
--
-- **여행 일수는 한 번에 며칠이 아니라 다 합쳐 며칠입니다.** 100일·200일·
-- 365일을 한 번에 가는 사람은 거의 없어서, 그렇게 두면 절반이 영영 못 받는
-- 배지가 됩니다. 다른 갈래도 전부 누적이라 이쪽만 다르면 헷갈립니다.
-- (한 번에 며칠로 하고 싶으면 아래 key 를 longest 로 바꾸면 됩니다.)
--
-- 사진 배지는 뺍니다. 많이 올리면 통이 무거워지는데, 배지가 그걸 부추길
-- 이유가 없습니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

drop function if exists public.my_badges();
drop function if exists public.badge_defs();

create or replace function public.badge_defs()
returns table (ord int, id text, cat text, name text, icon text, key text, need int)
language sql immutable as $$
  select * from (values
    -- ── 평가 ──
    (11,'g_10', '평가','평가 10곳','⭐','rated',10),
    (12,'g_20', '평가','평가 20곳','🌟','rated',20),
    (13,'g_30', '평가','평가 30곳','✨','rated',30),
    (14,'g_40', '평가','평가 40곳','💫','rated',40),
    (15,'g_50', '평가','평가 50곳','🏅','rated',50),
    (16,'g_60', '평가','평가 60곳','🎖️','rated',60),
    (17,'g_80', '평가','평가 80곳','🏆','rated',80),
    (18,'g_100','평가','평가 100곳','👑','rated',100),

    -- ── 다녀온 곳 (나라 수만. 프로필의 국가 숫자와 같은 셈) ──
    (21,'c_first','다녀온 곳','첫 해외여행','🛫','countries',1),
    (22,'c_5',    '다녀온 곳','5개국','🗺️','countries',5),
    (23,'c_10',   '다녀온 곳','10개국','🌏','countries',10),
    (24,'c_20',   '다녀온 곳','20개국','🌍','countries',20),
    (25,'c_30',   '다녀온 곳','30개국','🌎','countries',30),
    (26,'c_40',   '다녀온 곳','40개국','🧭','countries',40),
    (27,'c_50',   '다녀온 곳','50개국','🌐','countries',50),
    (28,'c_100',  '다녀온 곳','100개국','🛰️','countries',100),

    -- ── 여행 (다 합친 일수) ──
    (31,'r_1',   '여행','첫 여행','🎒','trips',1),
    (32,'y_7',   '여행','7일 여행','🌙','days',7),
    (33,'y_15',  '여행','15일 여행','🌗','days',15),
    (34,'y_30',  '여행','30일 여행','🌕','days',30),
    (35,'y_50',  '여행','50일 여행','🧳','days',50),
    (36,'y_100', '여행','100일 여행','🚉','days',100),
    (37,'y_200', '여행','200일 여행','🛬','days',200),
    (38,'y_365', '여행','365일 여행','🏨','days',365),

    -- ── 후기 ──
    (41,'v_1',  '후기','첫 후기','📝','reviews',1),
    (42,'v_5',  '후기','후기 5개','📖','reviews',5),
    (43,'v_10', '후기','후기 10개','📚','reviews',10),
    (44,'v_20', '후기','후기 20개','🗂️','reviews',20)
  ) as v(ord, id, cat, name, icon, key, need);
$$;

-- 없앤 배지(도시·대륙·사진·여행 횟수·박수)를 받은 기록은 치웁니다.
delete from public.user_badges b
 where not exists (select 1 from public.badge_defs() d where d.id = b.badge_id);

-- 배지가 쓰는 숫자만 셉니다. 안 쓰는 것을 세면 프로필 열 때마다 값이 듭니다.
create or replace function public.my_counts()
returns jsonb
language sql stable security definer set search_path = public as $$
  with been as (
    /* **프로필의 국가 숫자와 같은 식입니다** (my_footprint 의 countries).
       두 곳이 다르게 세면 "나라 8개인데 왜 5개국 배지가 없지"가 됩니다. */
    select distinct c.country
      from public.city_ratings r
      join public.cities c on c.id = r.city_id
     where r.user_id = auth.uid() and r.been
  ),
  mine as (
    select t.*
      from public.trips t
      join public.trip_members m on m.trip_id = t.id
     where m.user_id = auth.uid() and m.left_at is null
       and t.end_date < current_date
  )
  select jsonb_build_object(
    'countries', (select count(*) from been where country is not null),
    'trips',     (select count(*) from mine),
    /* 다 합친 여행 일수. 하루짜리도 1일이라 +1 합니다. */
    'days',      coalesce((select sum(end_date - start_date + 1) from mine), 0),
    'reviews',   (select count(*) from public.trip_reviews
                   where user_id = auth.uid()
                     and (comment is not null or stars is not null)),
    'rated',     (select count(*) from public.city_ratings
                   where user_id = auth.uid() and stars is not null)
  );
$$;
grant execute on function public.my_counts() to authenticated;

create or replace function public.my_badges()
returns table (id text, cat text, name text, icon text,
               need int, have int, earned_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare c jsonb;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;
  c := public.my_counts();

  insert into public.user_badges (user_id, badge_id)
  select auth.uid(), d.id
    from public.badge_defs() d
   where coalesce((c ->> d.key)::int, 0) >= d.need
  on conflict (user_id, badge_id) do nothing;

  return query
    select d.id, d.cat, d.name, d.icon, d.need,
           coalesce((c ->> d.key)::int, 0) as have,
           b.earned_at
      from public.badge_defs() d
      left join public.user_badges b
             on b.badge_id = d.id and b.user_id = auth.uid()
     order by d.ord;
end;
$$;

revoke all on function public.my_badges() from public;
grant execute on function public.my_badges() to authenticated;

-- 확인
select count(*) as "배지 개수(28이어야 함)" from public.badge_defs();
select cat, count(*), string_agg(name, ' · ' order by ord) as "배지"
  from public.badge_defs() group by cat, (ord/10) order by (ord/10);
-- 프로필 국가 숫자와 배지 국가 숫자가 같은지 (둘 다 0 이면 SQL Editor 라 정상)
select (public.my_footprint() ->> 'countries') as "프로필 국가",
       (public.my_counts()    ->> 'countries') as "배지 국가";
