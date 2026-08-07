-- =====================================================================
-- 여행 배지
--
-- 지금 있는 자료만으로 셉니다. 새로 쌓을 것이 없습니다 —
-- 나라·도시·여행·후기·사진·정산은 이미 표에 다 있습니다.
--
-- **한 번 받은 배지는 안 뺏습니다.** 여행을 지우면 나라 수가 줄어드는데
-- 그때 배지가 사라지면 "내가 뭘 잘못했나" 싶습니다. 받은 시각을 남겨두고,
-- 조건이 나중에 어긋나도 그대로 둡니다.
--
-- 세는 것은 **여기서**만 합니다. 화면에서 세면 기기마다 다르게 나오고,
-- 나중에 조건을 바꿔도 옛날 기기는 옛 조건으로 셉니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

-- ── 1. 받은 배지 ─────────────────────────────────────────────────────
create table if not exists public.user_badges (
  user_id   uuid not null references auth.users on delete cascade,
  badge_id  text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

comment on table public.user_badges is
  '받은 배지와 받은 시각. 조건이 나중에 어긋나도 지우지 않음';

alter table public.user_badges enable row level security;

-- 내 것만 봅니다. 넣고 지우는 것은 아래 함수(security definer)만 합니다 —
-- 쓰기 정책을 안 두면 앱에서 손으로 배지를 만들어 넣을 수가 없습니다.
drop policy if exists badges_read on public.user_badges;
create policy badges_read on public.user_badges
  for select using (user_id = auth.uid());

-- ── 2. 배지 목록과 조건 ──────────────────────────────────────────────
-- 조건은 "무엇을 몇 개" 하나로 통일했습니다. 종류마다 다른 식을 쓰면
-- 나중에 배지를 더할 때마다 함수를 뜯어야 합니다.
--
--   cat   갈래 (화면에서 묶어 보여줍니다)
--   key   무엇을 세는가 (아래 3번에서 값을 만듭니다)
--   need  몇 개부터 받는가
create or replace function public.badge_defs()
returns table (id text, cat text, name text, note text, icon text,
               key text, need int)
language sql immutable as $$
  select * from (values
    -- ── 다녀온 곳 ──
    ('c_first','다녀온 곳','첫 해외','다른 나라에 한 곳 다녀왔어요','🛫','countries',1),
    ('c_3',    '다녀온 곳','세 나라','3개국','🗺️','countries',3),
    ('c_10',   '다녀온 곳','열 나라','10개국','🌏','countries',10),
    ('c_25',   '다녀온 곳','스물다섯 나라','25개국','🌐','countries',25),
    ('t_10',   '다녀온 곳','도시 열 곳','10곳','📍','cities',10),
    ('t_30',   '다녀온 곳','도시 서른 곳','30곳','📌','cities',30),
    ('t_50',   '다녀온 곳','도시 쉰 곳','50곳','🧭','cities',50),
    ('n_3',    '다녀온 곳','대륙 셋','대륙 3곳','✈️','continents',3),

    -- ── 여행 ──
    ('r_1',    '여행','첫 여행','여행 한 번 다녀왔어요','🎒','trips',1),
    ('r_5',    '여행','다섯 번째','여행 5회','🧳','trips',5),
    ('r_10',   '여행','열 번째','여행 10회','🚉','trips',10),
    ('r_25',   '여행','스물다섯 번째','여행 25회','🛬','trips',25),
    ('l_7',    '여행','일주일 여행','한 번에 7일 이상','🌙','longest',7),
    ('l_14',   '여행','장기 여행','한 번에 14일 이상','🌗','longest',14),
    ('d_30',   '여행','서른 밤','다 합쳐 30박','🛏️','nights',30),
    ('d_100',  '여행','백 밤','다 합쳐 100박','🏨','nights',100),

    -- ── 후기 ──
    ('v_1',    '후기','첫 후기','후기를 남겼어요','📝','reviews',1),
    ('v_5',    '후기','기록하는 사람','후기 5개','📖','reviews',5),
    ('v_10',   '후기','열 개의 기억','후기 10개','📚','reviews',10),
    ('p_10',   '후기','사진 열 장','사진 10장','📷','photos',10),
    ('p_50',   '후기','사진 쉰 장','사진 50장','🖼️','photos',50),
    ('s_10',   '후기','별점 열 곳','별점 매긴 곳 10','⭐','rated',10),
    ('s_50',   '후기','별점 쉰 곳','별점 매긴 곳 50','🌟','rated',50),

    -- ── 일행과 돈 ──
    ('m_1',    '일행과 돈','같이 간 여행','일행이 있는 여행 1회','🤝','together',1),
    ('m_5',    '일행과 돈','자주 같이','일행이 있는 여행 5회','👥','together',5),
    ('e_100',  '일행과 돈','지출 백 건','지출 100건','🧾','expenses',100),
    ('e_1',    '일행과 돈','첫 지출','지출을 적었어요','💴','expenses',1)
  ) as v(id, cat, name, note, icon, key, need);
$$;

-- ── 3. 지금 내 숫자 ──────────────────────────────────────────────────
-- 배지가 쓰는 값을 한 번에 만듭니다. 배지마다 따로 세면 목록 한 번에
-- 표를 스무 번 훑게 됩니다.
create or replace function public.my_counts()
returns jsonb
language sql stable security definer set search_path = public as $$
  with been as (
    select distinct c.id as city_id, c.country, n.continent
      from public.city_ratings r
      join public.cities c on c.id = r.city_id
      left join public.countries n on n.code = c.country
     where r.user_id = auth.uid() and r.been
  ),
  mine as (   -- 내가 참여 중이고 이미 끝난 여행
    select t.*
      from public.trips t
      join public.trip_members m on m.trip_id = t.id
     where m.user_id = auth.uid() and m.left_at is null
       and t.end_date < current_date
  )
  select jsonb_build_object(
    'countries',  (select count(distinct country) from been),
    'cities',     (select count(*) from been),
    'continents', (select count(distinct continent) from been
                    where continent is not null),
    'trips',      (select count(*) from mine),
    /* 하루짜리도 1일입니다. 끝날 - 시작 + 1. */
    'longest',    coalesce((select max(end_date - start_date) + 1 from mine), 0),
    /* 박 수는 날짜 차이 그대로입니다. 3박 4일이면 3. */
    'nights',     coalesce((select sum(end_date - start_date) from mine), 0),
    'reviews',    (select count(*) from public.trip_reviews
                    where user_id = auth.uid()
                      and (comment is not null or stars is not null)),
    'photos',     (select count(*) from public.trip_photos where user_id = auth.uid()),
    'rated',      (select count(*) from public.city_ratings
                    where user_id = auth.uid() and stars is not null),
    /* 나 말고 다른 사람이 한 명이라도 있는 여행. 나간 사람도 셉니다 —
       같이 갔다는 사실은 나중에 나가도 달라지지 않습니다. */
    'together',   (select count(*) from mine t
                    where exists (select 1 from public.trip_members m2
                                   where m2.trip_id = t.id and m2.user_id <> auth.uid())),
    'expenses',   (select count(*) from public.expenses e
                    join public.trip_members m on m.trip_id = e.trip_id
                   where m.user_id = auth.uid() and e.deleted_at is null)
  );
$$;
grant execute on function public.my_counts() to authenticated;

-- ── 4. 배지 목록 (받은 것 기록까지) ──────────────────────────────────
-- 부를 때마다 새로 받은 것이 있으면 남깁니다. 이미 있으면 그대로 둡니다 —
-- 받은 시각은 처음 받은 그때여야 합니다.
create or replace function public.my_badges()
returns table (id text, cat text, name text, note text, icon text,
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
    select d.id, d.cat, d.name, d.note, d.icon, d.need,
           coalesce((c ->> d.key)::int, 0) as have,
           b.earned_at
      from public.badge_defs() d
      left join public.user_badges b
             on b.badge_id = d.id and b.user_id = auth.uid()
     order by d.cat, d.need, d.id;
end;
$$;

revoke all on function public.my_badges() from public;
grant execute on function public.my_badges() to authenticated;

-- 확인
select count(*) as "배지 개수(27이어야 함)" from public.badge_defs();
select cat, count(*) from public.badge_defs() group by cat order by cat;
select public.my_counts() as "내 숫자";
