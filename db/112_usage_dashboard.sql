-- =====================================================================
-- 112 · 앱 연 날(user_days) + 관리자 「사용」 칸(admin_usage) — b815, 2026-10-01
--
-- 사용자: 「얼마나 많은 사람이 가입하고 별점 매기고 전반적으로 쓰고 있는지 종합적으로 다 트래킹 하고 싶어」
--   고른 것: 「쓴 사람」은 **앱 연 날을 기록**(날짜만 · 시각·IP 없음) · 대시보드 「사용 | 비용 | 문제」 ·
--   사용 칸은 「유튜브 스튜디오 참고해서 잘 만들어봐」(adminuse.js).
--
-- ⚠ 그 전에는 앱을 연 기록이 아무 데도 없었습니다. 043 의 「최근 7일 쓴 사람」은 일정·지출·별점을
--   «고친» 사람만 셌고, 보기만 한 사람은 0 이었습니다. 「가입만 하고 안 쓴 사람」은 여행 0개로 셌습니다
--   (별점만 매긴 사람도 «안 쓴 사람»). 043 은 그대로 두고(비용·문제 칸이 씁니다) 사용 숫자는 여기서 냅니다.
-- ⚠ 날짜는 **서울 시각**으로 자릅니다. current_date(UTC)로 자르면 아침 9시 전에 연 사람이 어제가 됩니다.
-- ⚠ 처리방침 4차 개정(2026-10-01)과 짝입니다 — 2·3·4·7항 「앱을 연 날짜 · 이용 통계 · 400일 · 탈퇴하면 즉시」.
-- ⚠ **숫자만 냅니다**(043 과 같은 약속). 누가 언제 열었는지·무엇을 했는지는 관리자에게도 안 돌려줍니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

-- ── 앱 연 날 ──────────────────────────────────────────────────────────
-- 한 사람 하루 한 줄. 시각도 IP 도 없습니다.
create table if not exists public.user_days (
  user_id uuid not null references auth.users(id) on delete cascade,   -- 탈퇴하면 같이 지워집니다
  day     date not null,
  primary key (user_id, day)
);
create index if not exists user_days_day_idx on public.user_days (day);
alter table public.user_days enable row level security;
-- 정책을 하나도 안 둡니다 — 아무도 직접 읽고 쓰지 못합니다. 아래 함수들(security definer)만 만집니다.

-- 앱이 하루 한 번 부릅니다(dayseen.js). 같은 날 두 번 불러도 한 줄입니다.
create or replace function public.touch_day()
returns void
language sql security definer set search_path = public as $$
  insert into public.user_days (user_id, day)
  select auth.uid(), (now() at time zone 'Asia/Seoul')::date
   where auth.uid() is not null
  on conflict do nothing;
$$;
revoke all on function public.touch_day() from public, anon;
grant execute on function public.touch_day() to authenticated;

-- ── 보관 기간(042 에 한 줄 더) ─────────────────────────────────────────
-- 앱 연 날 400일 — 처리방침 4항. 042 의 두 줄은 그대로입니다.
create or replace function public.sweep_retention()
returns void
language sql security definer set search_path = public as $$
  -- 오류 기록 90일. 그보다 오래된 오류는 이미 고쳤거나 못 고칩니다.
  delete from public.client_errors where created_at < now() - interval '90 days';
  -- 신고·의견 1년.
  delete from public.reports       where created_at < now() - interval '365 days';
  -- 앱 연 날 400일(112).
  delete from public.user_days     where day < (now() at time zone 'Asia/Seoul')::date - 400;
$$;
grant execute on function public.sweep_retention() to authenticated;


-- ── 관리자 「사용」 칸 ─────────────────────────────────────────────────
-- p_days 일(7·28·90)을 «이번 기간», 그 바로 앞 같은 길이를 «지난 기간»으로 견줍니다(유튜브 스튜디오처럼).
-- 성향 확정한 날 = 해외(국내 뺌, b809) 다섯 번째 별을 준 날. profiles.persona 에는 날짜가 없어서 별로 셉니다.
-- ⚠ 별점 «처음 매긴 날»은 city_ratings.created_at 입니다 — ♡(가보고 싶은 곳)로 먼저 만든 줄에 나중에 별을
--   주면 ♡ 누른 날로 셉니다. 한줄평·일기는 updated_at(마지막으로 고친 날)이라 «그 기간에 손댄 사람»입니다.
create or replace function public.admin_usage(p_days int default 28)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  nd     int  := greatest(1, least(coalesce(p_days, 28), 365));
  today  date := (now() at time zone 'Asia/Seoul')::date;
  d0     date := today - (nd - 1);                      -- 이번 기간 첫날
  p0     date := today - (2 * nd - 1);                  -- 지난 기간 첫날
  since  date := (select min(day) from public.user_days);   -- 앱 연 날 기록이 시작된 날
  res    jsonb;
begin
  if not public.is_admin() then
    raise exception '관리자만 볼 수 있습니다';
  end if;

  with
  rt as (                       -- 별이 있는 별점 줄(서울 날짜)
    select x.user_id, x.city_id, x.stars, c.name, c.country,
           (x.created_at at time zone 'Asia/Seoul')::date as d,
           (x.updated_at at time zone 'Asia/Seoul')::date as ud
      from public.city_ratings x join public.cities c on c.id = x.city_id
     where x.stars is not null
  ),
  ps as (                       -- 성향 확정한 날
    select user_id, d from (
      select user_id, d, row_number() over (partition by user_id order by d, city_id) as k
        from rt where country is distinct from 'KR') q
     where k = 5
  ),
  su as (select id, (created_at at time zone 'Asia/Seoul')::date as d from auth.users),
  days as (select generate_series(d0, today, interval '1 day')::date as d),
  ua as (select day as d, count(*) as n from public.user_days where day between d0 and today group by day),
  sa as (select d, count(*) as n from su where d between d0 and today group by d),
  ra as (select d, count(*) as n from rt where d between d0 and today group by d),
  pa as (select d, count(*) as n from ps where d between d0 and today group by d),
  series as (
    select days.d, coalesce(ua.n, 0) as a, coalesce(sa.n, 0) as s,
           coalesce(ra.n, 0) as r, coalesce(pa.n, 0) as p
      from days left join ua using (d) left join sa using (d)
                left join ra using (d) left join pa using (d)
  )
  select jsonb_build_object(
    'days',  nd, 'today', today, 'from', d0, 'since', since,

    -- 날마다(그래프). a = 그날 앱을 연 사람 · s = 가입 · r = 새 별점 · p = 성향 확정
    'series', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'a', a, 's', s, 'r', r, 'p', p)
                                         order by d), '[]'::jsonb) from series),

    -- 지표 카드 넷 — 이번 기간 / 지난 기간. 「쓴 사람」은 기간 안에 한 번이라도 연 사람(같은 사람은 한 번).
    'kpi', jsonb_build_object(
      'active',       (select count(distinct user_id) from public.user_days where day between d0 and today),
      'active_prev',  (select count(distinct user_id) from public.user_days where day between p0 and d0 - 1),
      'signups',      (select count(*) from su where d between d0 and today),
      'signups_prev', (select count(*) from su where d between p0 and d0 - 1),
      'ratings',      (select count(*) from rt where d between d0 and today),
      'ratings_prev', (select count(*) from rt where d between p0 and d0 - 1),
      'persona',      (select count(*) from ps where d between d0 and today),
      'persona_prev', (select count(*) from ps where d between p0 and d0 - 1)),

    -- 지금까지 쌓인 것
    'total', jsonb_build_object(
      'users',   (select count(*) from su),
      'ratings', (select count(*) from rt),
      'raters',  (select count(distinct user_id) from rt),
      'persona', (select count(*) from ps),
      'follows', (select count(*) from public.follows where status = 'accepted'),
      'trips',   (select count(*) from public.trips),
      -- 043 의 비용 칸에 있던 둘을 여기로(b815 — 비용 칸은 돈 드는 것만).
      'trips_now',    (select count(*) from public.trips where today between start_date and end_date),
      'trips_shared', (select count(*) from (select trip_id from public.trip_members where left_at is null
                                              group by trip_id having count(*) > 1) q)),

    -- 실시간 — 오늘(서울) 숫자와 최근 48시간을 한 시간씩. 시각은 UTC 로 주고 화면이 바꿉니다.
    'live', jsonb_build_object(
      'active',  (select count(*) from public.user_days where day = today),
      'signups', (select count(*) from su where d = today),
      'ratings', (select count(*) from rt where d = today),
      'hours',   (select coalesce(jsonb_agg(jsonb_build_object('h', h, 'r', rr, 's', ss) order by h), '[]'::jsonb)
                    from (select h,
                            (select count(*) from public.city_ratings x
                              where x.stars is not null and x.created_at >= h
                                and x.created_at < h + interval '1 hour') as rr,
                            (select count(*) from auth.users u
                              where u.created_at >= h and u.created_at < h + interval '1 hour') as ss
                            from generate_series(date_trunc('hour', now()) - interval '47 hours',
                                                 date_trunc('hour', now()), interval '1 hour') as h) q)),

    -- 이 기간에 새 별을 가장 많이 받은 도시 다섯(도시 단위 숫자만 — 누가 매겼는지는 안 줍니다)
    -- ⚠ 화면(adminuse.js)은 b815 부터 이것을 안 씁니다(사용자: 「이 기간 인기도시가 필요해?? 앱 사용 통계가
    --   필요한건데」). 이 파일은 이미 돌린 그대로 둡니다 — 이 함수를 다시 고칠 일이 생기면 그때 같이 걷을 것.
    'top', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
              select city_id as id, name, count(*) as n, round(avg(stars)::numeric, 1) as avg
                from rt where d between d0 and today
               group by city_id, name
               order by count(*) desc, avg(stars) desc, name
               limit 5) t),

    -- 사람들 — 이 기간에 연 사람 중 새로 온 사람(이 기간에 가입) · 다시 온 사람(그 전에 가입)
    'aud', jsonb_build_object(
      'new',  (select count(distinct u.user_id) from public.user_days u join su on su.id = u.user_id
                where u.day between d0 and today and su.d >= d0),
      'back', (select count(distinct u.user_id) from public.user_days u join su on su.id = u.user_id
                where u.day between d0 and today and su.d < d0)),

    -- 가입 주별 재방문(최근 8주). w1 = 가입 다음 날~7일 안에 다시 연 사람 · w4 = 8~30일 사이에 연 사람.
    -- ok1·ok4 = 그 주 사람이 모두 7일·30일을 다 채웠나 · tracked = 다 기록 시작(since) 뒤에 가입했나.
    'cohort', (select coalesce(jsonb_agg(c order by w desc), '[]'::jsonb) from (
                 select date_trunc('week', su.d)::date as w, count(*) as size,
                        count(*) filter (where exists (select 1 from public.user_days u
                              where u.user_id = su.id and u.day between su.d + 1 and su.d + 7)) as w1,
                        count(*) filter (where exists (select 1 from public.user_days u
                              where u.user_id = su.id and u.day between su.d + 8 and su.d + 30)) as w4,
                        bool_and(su.d + 7  <= today) as ok1,
                        bool_and(su.d + 30 <= today) as ok4,
                        bool_and(since is not null and su.d >= since) as tracked
                   from su
                  where su.d >= today - 7 * 8
                  group by 1) c),

    -- 어디까지 가나(지금까지 전체) — 가입 → 첫 별점 → 성향 확정 → 팔로우 → 여행 만들기
    'funnel', jsonb_build_object(
      'users',   (select count(*) from su),
      'rated',   (select count(distinct user_id) from rt),
      'persona', (select count(*) from ps),
      'follow',  (select count(distinct follower) from public.follows),
      'trip',    (select count(distinct created_by) from public.trips)),

    -- 기능별 쓰임(이번 기간) — u = 쓴 사람 · n = 몇 번(건)
    'feat', jsonb_build_array(
      jsonb_build_object('k', '별점',
        'u', (select count(distinct user_id) from rt where ud between d0 and today),
        'n', (select count(*) from rt where d between d0 and today)),
      jsonb_build_object('k', '한줄평',
        'u', (select count(distinct user_id) from public.city_ratings
               where comment is not null and (updated_at at time zone 'Asia/Seoul')::date between d0 and today),
        'n', (select count(*) from public.city_ratings
               where comment is not null and (updated_at at time zone 'Asia/Seoul')::date between d0 and today)),
      jsonb_build_object('k', '일기',
        'u', (select count(distinct user_id) from public.city_ratings
               where journal is not null and (updated_at at time zone 'Asia/Seoul')::date between d0 and today),
        'n', (select count(*) from public.city_ratings
               where journal is not null and (updated_at at time zone 'Asia/Seoul')::date between d0 and today)),
      jsonb_build_object('k', '일기 사진',
        'u', (select count(distinct user_id) from public.journal_photos
               where (created_at at time zone 'Asia/Seoul')::date between d0 and today),
        'n', (select count(*) from public.journal_photos
               where (created_at at time zone 'Asia/Seoul')::date between d0 and today)),
      jsonb_build_object('k', '팔로우',
        'u', (select count(distinct follower) from public.follows
               where (created_at at time zone 'Asia/Seoul')::date between d0 and today),
        'n', (select count(*) from public.follows
               where (created_at at time zone 'Asia/Seoul')::date between d0 and today)),
      jsonb_build_object('k', '여행',
        'u', (select count(distinct created_by) from public.trips
               where (created_at at time zone 'Asia/Seoul')::date between d0 and today),
        'n', (select count(*) from public.trips
               where (created_at at time zone 'Asia/Seoul')::date between d0 and today)),
      jsonb_build_object('k', '일정',
        'u', (select count(distinct created_by) from public.plans
               where (created_at at time zone 'Asia/Seoul')::date between d0 and today),
        'n', (select count(*) from public.plans
               where (created_at at time zone 'Asia/Seoul')::date between d0 and today)),
      jsonb_build_object('k', '지출',
        'u', (select count(distinct created_by) from public.expenses
               where (created_at at time zone 'Asia/Seoul')::date between d0 and today),
        'n', (select count(*) from public.expenses
               where (created_at at time zone 'Asia/Seoul')::date between d0 and today)),
      jsonb_build_object('k', 'AI',
        'u', (select count(distinct user_id) from public.ai_usage where day between d0 and today),
        'n', (select coalesce(sum(calls + review_calls), 0) from public.ai_usage where day between d0 and today)))
  ) into res;
  return res;
end $$;
revoke all on function public.admin_usage(int) from public, anon;
grant execute on function public.admin_usage(int) to authenticated;


-- ── 확인 ─────────────────────────────────────────────────────────────
select '표 user_days' as item, to_regclass('public.user_days') is not null as ok
union all select '함수 touch_day',      to_regproc('public.touch_day') is not null
union all select '함수 admin_usage',    to_regprocedure('public.admin_usage(integer)') is not null
union all select '함수 sweep_retention', to_regproc('public.sweep_retention') is not null
union all select 'user_days 를 직접 못 읽음(RLS 켜짐)',
  (select relrowsecurity from pg_class where oid = 'public.user_days'::regclass);
