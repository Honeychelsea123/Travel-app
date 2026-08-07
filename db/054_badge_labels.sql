-- =====================================================================
-- 배지 글자를 한 줄로
--
-- 처음에는 이름('첫 해외')과 설명('다른 나라에 한 곳 다녀왔어요')을 따로
-- 뒀는데, 둘이 사실상 같은 말이었습니다. 칸마다 세 줄이 쌓여 목록이
-- 빽빽해졌고 정작 무슨 조건인지는 두 번 읽어야 했습니다.
--
-- 조건 그 자체를 이름으로 씁니다 — '3개국', '도시 10곳', '30박'.
-- 설명 칸(note)과 진행도 줄은 없앱니다.
--
-- 돌려주는 모양이 바뀌므로 함수를 먼저 지웁니다.
-- user_badges(받은 기록)는 그대로 둡니다 — id 가 안 바뀌었습니다.
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

drop function if exists public.my_badges();
drop function if exists public.badge_defs();

create or replace function public.badge_defs()
returns table (id text, cat text, name text, icon text, key text, need int)
language sql immutable as $$
  select * from (values
    -- ── 다녀온 곳 ──
    ('c_first','다녀온 곳','첫 해외여행','🛫','countries',1),
    ('c_3',    '다녀온 곳','3개국','🗺️','countries',3),
    ('c_10',   '다녀온 곳','10개국','🌏','countries',10),
    ('c_25',   '다녀온 곳','25개국','🌐','countries',25),
    ('t_10',   '다녀온 곳','도시 10곳','📍','cities',10),
    ('t_30',   '다녀온 곳','도시 30곳','📌','cities',30),
    ('t_50',   '다녀온 곳','도시 50곳','🧭','cities',50),
    ('n_3',    '다녀온 곳','대륙 3곳','✈️','continents',3),

    -- ── 여행 ──
    ('r_1',    '여행','첫 여행','🎒','trips',1),
    ('r_5',    '여행','여행 5회','🧳','trips',5),
    ('r_10',   '여행','여행 10회','🚉','trips',10),
    ('r_25',   '여행','여행 25회','🛬','trips',25),
    ('l_7',    '여행','7일 여행','🌙','longest',7),
    ('l_14',   '여행','14일 여행','🌗','longest',14),
    ('d_30',   '여행','30박','🛏️','nights',30),
    ('d_100',  '여행','100박','🏨','nights',100),

    -- ── 후기 ──
    ('v_1',    '후기','첫 후기','📝','reviews',1),
    ('v_5',    '후기','후기 5개','📖','reviews',5),
    ('v_10',   '후기','후기 10개','📚','reviews',10),
    ('p_10',   '후기','사진 10장','📷','photos',10),
    ('p_50',   '후기','사진 50장','🖼️','photos',50),
    ('s_10',   '후기','별점 10곳','⭐','rated',10),
    ('s_50',   '후기','별점 50곳','🌟','rated',50),

    -- ── 일행과 돈 ──
    ('m_1',    '일행과 돈','같이 간 여행','🤝','together',1),
    ('m_5',    '일행과 돈','같이 5번','👥','together',5),
    ('e_1',    '일행과 돈','첫 지출','💴','expenses',1),
    ('e_100',  '일행과 돈','지출 100건','🧾','expenses',100)
  ) as v(id, cat, name, icon, key, need);
$$;

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
     order by d.cat, d.need, d.id;
end;
$$;

revoke all on function public.my_badges() from public;
grant execute on function public.my_badges() to authenticated;

-- 확인
select count(*) as "배지 개수(27이어야 함)" from public.badge_defs();
select cat, string_agg(name, ' · ' order by need) as "배지"
  from public.badge_defs() group by cat order by cat;
