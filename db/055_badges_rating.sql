-- =====================================================================
-- 배지 손보기 — 평가를 맨 앞 갈래로, 일행과 돈은 뺌
--
-- 평가(도시에 별을 매기는 것)가 이 앱의 핵심입니다. 그런데 배지에서는
-- '후기' 갈래에 두 개(10곳·50곳)만 껴 있어서 눈에 안 띄었습니다.
-- 갈래를 따로 내고 맨 위로 올립니다. 문턱도 10·20·30·40·50·60·80·100 으로
-- 촘촘하게 나눕니다 — 10 다음이 50 이면 그사이가 통째로 허공입니다.
--
-- '일행과 돈'은 뺍니다. 혼자 쓰는 사람은 영영 못 받는 배지가 되고,
-- 지출 100건은 닿을 것 같지가 않습니다.
--
-- '별점'이라는 말도 안 씁니다. 화면 다른 곳에서 쓰는 말은 '평가'입니다.
--
-- 순서를 ord 로 못박습니다. 전에는 갈래 이름 가나다순이라 '일행과 돈'이
-- '후기' 앞에 왔고, 갈래 안에서는 need 순이라 나라·도시·대륙이 뒤섞였습니다
-- (첫 해외여행 · 3개국 · 대륙 3곳 · 10개국 · 도시 10곳 …).
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

drop function if exists public.my_badges();
drop function if exists public.badge_defs();

create or replace function public.badge_defs()
returns table (ord int, id text, cat text, name text, icon text, key text, need int)
language sql immutable as $$
  select * from (values
    -- ── 평가 (맨 위) ──
    (11,'g_10', '평가','평가 10곳','⭐','rated',10),
    (12,'g_20', '평가','평가 20곳','🌟','rated',20),
    (13,'g_30', '평가','평가 30곳','✨','rated',30),
    (14,'g_40', '평가','평가 40곳','💫','rated',40),
    (15,'g_50', '평가','평가 50곳','🏅','rated',50),
    (16,'g_60', '평가','평가 60곳','🎖️','rated',60),
    (17,'g_80', '평가','평가 80곳','🏆','rated',80),
    (18,'g_100','평가','평가 100곳','👑','rated',100),

    -- ── 다녀온 곳 (나라 먼저, 그다음 도시, 마지막 대륙) ──
    (21,'c_first','다녀온 곳','첫 해외여행','🛫','countries',1),
    (22,'c_3',    '다녀온 곳','3개국','🗺️','countries',3),
    (23,'c_10',   '다녀온 곳','10개국','🌏','countries',10),
    (24,'c_25',   '다녀온 곳','25개국','🌐','countries',25),
    (25,'t_10',   '다녀온 곳','도시 10곳','📍','cities',10),
    (26,'t_30',   '다녀온 곳','도시 30곳','📌','cities',30),
    (27,'t_50',   '다녀온 곳','도시 50곳','🧭','cities',50),
    (28,'n_3',    '다녀온 곳','대륙 3곳','✈️','continents',3),

    -- ── 여행 (횟수 먼저, 그다음 기간) ──
    (31,'r_1',   '여행','첫 여행','🎒','trips',1),
    (32,'r_5',   '여행','여행 5회','🧳','trips',5),
    (33,'r_10',  '여행','여행 10회','🚉','trips',10),
    (34,'r_25',  '여행','여행 25회','🛬','trips',25),
    (35,'l_7',   '여행','7일 여행','🌙','longest',7),
    (36,'l_14',  '여행','14일 여행','🌗','longest',14),
    (37,'d_30',  '여행','30박','🛏️','nights',30),
    (38,'d_100', '여행','100박','🏨','nights',100),

    -- ── 후기 (글 먼저, 그다음 사진) ──
    (41,'v_1',  '후기','첫 후기','📝','reviews',1),
    (42,'v_5',  '후기','후기 5개','📖','reviews',5),
    (43,'v_10', '후기','후기 10개','📚','reviews',10),
    (44,'p_10', '후기','사진 10장','📷','photos',10),
    (45,'p_50', '후기','사진 50장','🖼️','photos',50)
  ) as v(ord, id, cat, name, icon, key, need);
$$;

-- 없앤 배지(일행과 돈, 옛 별점 둘)를 받은 기록은 치웁니다.
-- 안 지우면 목록에 안 나오는 배지가 표에만 남습니다.
delete from public.user_badges b
 where not exists (select 1 from public.badge_defs() d where d.id = b.badge_id);

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
     order by d.ord;          -- 순서를 못박습니다. 이름 가나다순은 뒤죽박죽입니다
end;
$$;

revoke all on function public.my_badges() from public;
grant execute on function public.my_badges() to authenticated;

-- 안 쓰는 숫자는 그만 셉니다. expenses 는 지출 표 전체를 훑던 것이라
-- 프로필 열 때마다 값이 들었습니다.
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
  mine as (
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
    'longest',    coalesce((select max(end_date - start_date) + 1 from mine), 0),
    'nights',     coalesce((select sum(end_date - start_date) from mine), 0),
    'reviews',    (select count(*) from public.trip_reviews
                    where user_id = auth.uid()
                      and (comment is not null or stars is not null)),
    'photos',     (select count(*) from public.trip_photos where user_id = auth.uid()),
    'rated',      (select count(*) from public.city_ratings
                    where user_id = auth.uid() and stars is not null)
  );
$$;
grant execute on function public.my_counts() to authenticated;

-- 확인
select count(*) as "배지 개수(29여야 함)" from public.badge_defs();
select cat, count(*), string_agg(name, ' · ' order by ord) as "배지"
  from public.badge_defs() group by cat, (ord/10) order by (ord/10);
