-- =====================================================================
-- 107 · 배지 「첫 여행 후기」 · 「가보고 싶은 곳」 숫자에서 다녀온 도시 빼기 (b799)
--
-- 사용자(2026-09-29, GPT 리포트를 검토하고 고른 것):
--   ① 배지 「첫 후기」 → 「첫 여행 후기」. 한줄평과 헷갈려서입니다 — 「후기」 배지는 «여행 후기»
--      (trip_reviews)만 셉니다. 도시 한줄평(city_ratings.comment)은 어느 판에서도 센 적이 없습니다
--      (053·056·057). 같은 줄의 나머지(5·10·20개)와 갈래 이름도 「여행 후기」로 맞춥니다.
--   ② 「가보고 싶은 곳」에서 «별점을 매긴(다녀온) 도시»를 뺍니다(「목록에서 빼기」).
--      앱의 보관함 목록 · 분석 탭 「다음 여행」과 같은 셈 — want 이고 별점이 없는 곳.
--      ♡(want)는 지우지 않습니다. 별점을 지우면 다시 셉니다.
--
-- ⚠ 배지 id · 조건 · 받은 기록은 그대로입니다 — 글자만 바뀝니다.
-- ⚠ 056 의 badge_defs 와 076 의 my_footprint 본문을 **그대로 떠 와서** 한 줄씩만 바꿨습니다.
--   056·076 을 다시 돌리면 옛 이름·옛 셈으로 돌아갑니다 — 그러면 이 파일을 다시 돌리십시오.
--
-- 106 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================


-- ── 1. 배지 이름(056 에서) ──────────────────────────────────────────────
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

    -- ── 여행 후기 (trip_reviews — 한줄평이 아닙니다, b799) ──
    (41,'v_1',  '여행 후기','첫 여행 후기','📝','reviews',1),
    (42,'v_5',  '여행 후기','여행 후기 5개','📖','reviews',5),
    (43,'v_10', '여행 후기','여행 후기 10개','📚','reviews',10),
    (44,'v_20', '여행 후기','여행 후기 20개','🗂️','reviews',20)
  ) as v(ord, id, cat, name, icon, key, need);
$$;


-- ── 2. 발자국의 「가보고 싶은 곳」 수(076 에서) ─────────────────────────────
create or replace function public.my_footprint()
returns jsonb
language sql stable security definer set search_path = public as $$
  with been as (
    select v.city_id,
           /* 속령이면 모국. 대륙도 모국 것을 씁니다 — 괌을 오세아니아로
              두면 「미국 = 북아메리카」와 어긋나 대륙 합이 안 맞습니다. */
           coalesce(n.parent_code, c.country)        as country,
           coalesce(np.continent, n.continent)       as continent
      from public.my_visited() v
      join public.cities c          on c.id = v.city_id
      left join public.countries n  on n.code = c.country
      left join public.countries np on np.code = n.parent_code
  )
  select jsonb_build_object(
    'cities',    (select count(*) from been),
    'countries', (select count(distinct country) from been),
    'rated',     (select count(*) from public.city_ratings
                   where user_id = auth.uid() and stars is not null),
    'wants',     (select count(*) from public.city_ratings
                   where user_id = auth.uid() and want and stars is null),   -- b799: 별점 매긴(다녀온) 도시는 뺌
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
-- 기대값: 1·2 는 true. 3 은 참고(내 계정 기준 — SQL 편집기에서는 로그인 사용자가 없어 0 이 나옵니다).
select 1 as 순서, '배지 이름 「첫 여행 후기」(true 여야)' as 항목,
       exists (select 1 from public.badge_defs()
                where id = 'v_1' and name = '첫 여행 후기' and cat = '여행 후기')::text as 값
union all
select 2, '「가보고 싶은 곳」에서 별점 매긴 도시를 뺌(true 여야)',
       (pg_get_functiondef('public.my_footprint()'::regprocedure) like '%and want and stars is null%')::text
union all
select 3, '「후기」 배지 네 개 이름',
       (select string_agg(name, ' · ' order by ord) from public.badge_defs() where key = 'reviews')
order by 1;
