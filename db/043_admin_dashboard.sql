-- =====================================================================
-- 관리자 대시보드 2 — 실제로 판단에 쓰이는 숫자
--
-- 지금 대시보드에는 "얼마나 쌓였나"만 있습니다. 정작 알아야 하는 것은 셋입니다.
--   1. 돈이 얼마나 나가고 있나 (Gemini · Tavily)
--   2. 사람들이 한도에 막히고 있나 (막히면 다시 안 옵니다)
--   3. 이 속도면 언제 예산이 바닥나나
--
-- 그런데 **셋 다 지금 못 셉니다.**
--   · Tavily 호출은 아예 안 세고 있습니다. search_cache 는 6시간짜리 보관함일 뿐이라
--     "지금 들고 있는 것"이지 "이번 달 몇 번 나갔나"가 아닙니다.
--   · 한도에 걸려 거절된 호출은 아무 데도 안 남습니다.
--   · 예산이라는 개념 자체가 없습니다.
--
-- ── 미리 분명히 해둘 것 ──
-- **구글과 Tavily 의 실제 잔여량은 여기서 알 수 없습니다.** 그건 그쪽 콘솔에만
-- 있고 API 로 열어주지 않습니다. 여기서 하는 것은 "내가 정한 예산 대비
-- 우리가 몇 번 불렀나"입니다. 그 둘을 헷갈리면 안 됩니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

-- ── 1. 한도에 막힌 횟수 ─────────────────────────────────────────────
-- ai_take 가 거절할 때 그냥 돌려보내기만 했습니다. 그러면 "한도가 빡빡한가"를
-- 영영 모릅니다. 막힌 횟수가 곧 "더 쓰고 싶었는데 못 쓴 사람"의 수입니다.
alter table public.ai_usage add column if not exists blocked int not null default 0;

create or replace function public.ai_take(p_user uuid, p_kind text default 'chat')
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_limit int := public.ai_limit(p_user);
  v_used  int;
begin
  insert into public.ai_usage (user_id, day) values (p_user, current_date)
  on conflict (user_id, day) do nothing;

  select case when p_kind = 'review' then review_calls else calls end
    into v_used
    from public.ai_usage
   where user_id = p_user and day = current_date
   for update;

  if v_used >= v_limit then
    -- 거절도 기록합니다. 이게 한도를 손볼지 말지의 유일한 근거입니다.
    update public.ai_usage set blocked = blocked + 1
     where user_id = p_user and day = current_date;
    return jsonb_build_object('ok', false, 'used', v_used, 'limit', v_limit);
  end if;

  if p_kind = 'review' then
    update public.ai_usage set review_calls = review_calls + 1
     where user_id = p_user and day = current_date;
  else
    update public.ai_usage set calls = calls + 1
     where user_id = p_user and day = current_date;
  end if;

  return jsonb_build_object('ok', true, 'used', v_used + 1, 'limit', v_limit);
end $$;

-- 010 과 같은 권한을 다시 걸어둡니다 (create or replace 는 권한을 유지하지만,
-- 이 파일만 따로 돌릴 수도 있으니 명시합니다).
revoke execute on function public.ai_take(uuid, text) from public;
revoke execute on function public.ai_take(uuid, text) from anon, authenticated;
grant  execute on function public.ai_take(uuid, text) to service_role;


-- ── 2. Tavily 호출 세기 ─────────────────────────────────────────────
-- calls = 실제로 나간 것(크레딧 소모). hits = 보관함이 막아준 것(아낀 크레딧).
-- 둘을 같이 세야 "캐시가 일을 하고 있나"를 알 수 있습니다.
create table if not exists public.search_usage (
  day   date primary key,
  calls int not null default 0,
  hits  int not null default 0
);

alter table public.search_usage enable row level security;
-- 정책을 안 만듭니다. 서비스 키(Edge Function)와 security definer 함수만 씁니다.

create or replace function public.search_bump(p_hit boolean)
returns void
language sql security definer set search_path = public as $$
  insert into public.search_usage (day, calls, hits)
  values (current_date,
          case when p_hit then 0 else 1 end,
          case when p_hit then 1 else 0 end)
  on conflict (day) do update
     set calls = public.search_usage.calls + excluded.calls,
         hits  = public.search_usage.hits  + excluded.hits;
$$;

revoke execute on function public.search_bump(boolean) from public;
revoke execute on function public.search_bump(boolean) from anon, authenticated;
grant  execute on function public.search_bump(boolean) to service_role;


-- ── 3. 예산 ─────────────────────────────────────────────────────────
-- **이 숫자는 구글·Tavily 가 알려준 값이 아닙니다.** 내가 정하는 값입니다.
-- 무료 등급이 얼마인지는 각 콘솔에서 보고 여기에 옮겨 적으세요.
create table if not exists public.app_config (
  key  text primary key,
  val  numeric not null,
  note text
);

alter table public.app_config enable row level security;
drop policy if exists app_config_admin on public.app_config;
create policy app_config_admin on public.app_config for select
  using (public.is_admin());

insert into public.app_config (key, val, note) values
  ('ai_budget_month',     4500, 'Gemini 한 달 호출 예산. 콘솔에서 보고 고치세요'),
  ('search_budget_month', 1000, 'Tavily 한 달 크레딧. 콘솔에서 보고 고치세요')
on conflict (key) do nothing;

-- 예산을 고치는 법:
--   update public.app_config set val = 9000 where key = 'ai_budget_month';


-- ── 4. 대시보드 ─────────────────────────────────────────────────────
create or replace function public.admin_stats()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  r          jsonb;
  m_start    date := date_trunc('month', current_date)::date;
  ai_budget  numeric := coalesce((select val from app_config where key='ai_budget_month'), 0);
  se_budget  numeric := coalesce((select val from app_config where key='search_budget_month'), 0);
  ai_month   int;
  se_month   int;
  ai_avg     numeric;
begin
  if not public.is_admin() then
    raise exception '관리자만 볼 수 있습니다';
  end if;

  select coalesce(sum(calls + review_calls), 0) into ai_month
    from ai_usage where day >= m_start;
  select coalesce(sum(calls), 0) into se_month
    from search_usage where day >= m_start;
  -- 최근 7일 하루 평균. 이걸로 "이 속도면 며칠 남나"를 냅니다.
  select round(coalesce(sum(calls + review_calls), 0) / 7.0, 1) into ai_avg
    from ai_usage where day > current_date - 7;

  select jsonb_build_object(
    -- ── 사람 ──
    'users_total',   (select count(*) from auth.users),
    'users_today',   (select count(*) from auth.users where created_at >= current_date),
    'users_7d',      (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'users_30d',     (select count(*) from auth.users where created_at > now() - interval '30 days'),
    -- 쓴 사람의 기준은 "AI 를 한 번이라도 부른 사람"입니다. AI 를 안 쓰고
    -- 일정만 적는 사람은 여기 안 잡힙니다 — 아래 '손댄 사람'이 그걸 봅니다.
    'active_today',  (select count(distinct user_id) from ai_usage where day = current_date),
    'active_7d',     (select count(distinct user_id) from ai_usage where day > current_date - 7),
    'active_30d',    (select count(distinct user_id) from ai_usage where day > current_date - 30),
    -- 일정·지출·별점을 최근에 건드린 사람. AI 를 안 써도 잡힙니다.
    'touched_7d',    (select count(distinct user_id) from (
                        select created_by as user_id from plans
                         where updated_at > now() - interval '7 days'
                        union select created_by from expenses
                         where updated_at > now() - interval '7 days'
                        union select user_id from city_ratings
                         where updated_at > now() - interval '7 days') q
                       where user_id is not null),
    -- 가입만 하고 아무것도 안 한 사람. 이 비율이 높으면 첫 화면이 문제입니다.
    'users_idle',    (select count(*) from auth.users u
                       where not exists (select 1 from trip_members m where m.user_id = u.id)),

    -- ── 쌓인 것 ──
    'trips_total',   (select count(*) from trips),
    'trips_7d',      (select count(*) from trips where created_at > now() - interval '7 days'),
    'trips_now',     (select count(*) from trips
                       where current_date between start_date and end_date),
    'trips_soon',    (select count(*) from trips where start_date > current_date),
    -- 일행이 둘 이상인 여행. 혼자 쓰는 앱인지 같이 쓰는 앱인지가 여기서 갈립니다.
    'trips_shared',  (select count(*) from (
                        select trip_id from trip_members where left_at is null
                         group by trip_id having count(*) > 1) q),
    'plans_total',   (select count(*) from plans where deleted_at is null),
    'expenses_total',(select count(*) from expenses where deleted_at is null),
    'ratings_total', (select count(*) from city_ratings where stars is not null),
    'reviews_total', (select count(*) from trip_reviews),

    -- ── AI (Gemini) ──
    'ai_today',      (select coalesce(sum(calls + review_calls), 0) from ai_usage
                       where day = current_date),
    'ai_yday',       (select coalesce(sum(calls + review_calls), 0) from ai_usage
                       where day = current_date - 1),
    'ai_7d',         (select coalesce(sum(calls + review_calls), 0) from ai_usage
                       where day > current_date - 7),
    'ai_30d',        (select coalesce(sum(calls + review_calls), 0) from ai_usage
                       where day > current_date - 30),
    'ai_month',      ai_month,
    'ai_avg',        ai_avg,
    'ai_review_7d',  (select coalesce(sum(review_calls), 0) from ai_usage
                       where day > current_date - 7),
    'ai_top_today',  (select coalesce(max(calls), 0) from ai_usage where day = current_date),
    -- 한도에 막힌 횟수. 0 이 아니면 한도가 빡빡하다는 뜻입니다.
    'ai_blocked_today', (select coalesce(sum(blocked), 0) from ai_usage
                          where day = current_date),
    'ai_blocked_7d',    (select coalesce(sum(blocked), 0) from ai_usage
                          where day > current_date - 7),
    'ai_budget',     ai_budget,
    'ai_left',       greatest(ai_budget - ai_month, 0),
    'ai_pct',        case when ai_budget > 0
                          then round(ai_month * 100.0 / ai_budget) else null end,
    -- 이 속도면 예산이 며칠 남는지. 평균이 0 이면 계산이 안 됩니다.
    'ai_days_left',  case when ai_avg > 0
                          then floor(greatest(ai_budget - ai_month, 0) / ai_avg) else null end,

    -- ── 검색 (Tavily) ──
    'se_today',      (select coalesce(sum(calls), 0) from search_usage where day = current_date),
    'se_7d',         (select coalesce(sum(calls), 0) from search_usage
                       where day > current_date - 7),
    'se_month',      se_month,
    'se_hits_month', (select coalesce(sum(hits), 0) from search_usage where day >= m_start),
    'se_budget',     se_budget,
    'se_left',       greatest(se_budget - se_month, 0),
    'se_pct',        case when se_budget > 0
                          then round(se_month * 100.0 / se_budget) else null end,
    'se_cached',     (select count(*) from search_cache),

    -- ── 문제 ──
    'errors_today',  (select count(*) from client_errors where created_at >= current_date),
    'errors_7d',     (select count(*) from client_errors
                       where created_at > now() - interval '7 days'),
    'reports_open',  (select count(*) from reports where handled_at is null),
    'reports_total', (select count(*) from reports)
  ) into r;
  return r;
end $$;
grant execute on function public.admin_stats() to authenticated;


-- ── 확인 ─────────────────────────────────────────────────────────────
select 'ai_usage.blocked 칸' as item,
  exists (select 1 from information_schema.columns
           where table_schema='public' and table_name='ai_usage'
             and column_name='blocked') as ok
union all select 'search_usage 표', to_regclass('public.search_usage') is not null
union all select 'search_bump 함수', to_regproc('public.search_bump') is not null
union all select 'app_config 표',   to_regclass('public.app_config') is not null
union all select '예산 2줄 들어감',
  (select count(*) = 2 from public.app_config
    where key in ('ai_budget_month','search_budget_month'))
union all select 'admin_stats 새로 만들어짐',
  (select prosrc like '%ai_days_left%' from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.proname='admin_stats')
union all select '화면에서 search_usage 못 읽음',
  not exists (select 1 from pg_policies
               where schemaname='public' and tablename='search_usage');
