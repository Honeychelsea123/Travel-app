-- =====================================================================
-- 버그 신고 · 관리자 대시보드
--
-- ── 1. 신고 ──
-- 지금까지는 앱이 **스스로 터진 것**(client_errors)만 모았습니다.
-- 그런데 제일 흔한 문제는 안 터집니다 — "눌러도 아무 일이 안 나요",
-- "이게 왜 이렇게 나오죠". 그건 사람이 적어줘야 압니다.
--
-- ── 2. 대시보드 ──
-- 관리자가 봐야 하는 것: 사람이 몇이나 쓰는지, AI 를 얼마나 쓰는지,
-- 검색을 얼마나 쓰는지, 뭐가 터지고 있는지.
-- 표를 하나씩 열어보게 하면 안 봅니다. 함수 하나로 묶어 냅니다.
--
-- **관리자만 볼 수 있습니다.** is_admin() 이 아니면 아무것도 안 돌려줍니다.
-- 남의 이메일이나 여행 제목은 애초에 안 담습니다 — 숫자만 봅니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

-- ── 신고 표 ─────────────────────────────────────────────────────────
create table if not exists public.reports (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users on delete set null default auth.uid(),
  kind       text not null default '버그',      -- 버그 | 의견
  body       text not null,
  build      text,
  ua         text,
  handled_at timestamptz,                       -- 관리자가 처리했다고 표시
  created_at timestamptz not null default now()
);
create index if not exists reports_at_idx on public.reports(created_at desc);

alter table public.reports enable row level security;

-- 누구나 자기 이름으로 넣을 수 있습니다. 남의 것을 읽을 수는 없습니다.
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert
  with check (user_id = auth.uid());

-- 내가 보낸 것은 볼 수 있습니다. 관리자는 전부 봅니다.
drop policy if exists reports_read on public.reports;
create policy reports_read on public.reports for select
  using (user_id = auth.uid() or public.is_admin());

-- 처리 표시는 관리자만.
drop policy if exists reports_admin_update on public.reports;
create policy reports_admin_update on public.reports for update
  using (public.is_admin()) with check (public.is_admin());


-- ── 관리자도 남들 오류를 봐야 합니다 ────────────────────────────────
-- 032 에서 client_errors 는 "내 것만" 보게 해뒀습니다. 그러면 남이 겪은 것을
-- 영영 못 봅니다. 오류를 모으는 이유가 없어집니다.
drop policy if exists errors_self on public.client_errors;
create policy errors_self on public.client_errors for select
  using (user_id = auth.uid() or public.is_admin());


-- ── 대시보드 ────────────────────────────────────────────────────────
-- 숫자만 냅니다. 누가 어디를 갔는지는 관리자도 볼 이유가 없습니다.
create or replace function public.admin_stats()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_admin() then
    raise exception '관리자만 볼 수 있습니다';
  end if;

  select jsonb_build_object(
    'users_total',   (select count(*) from auth.users),
    'users_7d',      (select count(*) from auth.users where created_at > now() - interval '7 days'),
    -- 최근에 실제로 쓴 사람. 가입만 하고 안 오는 사람과 구분해야 합니다.
    'active_7d',     (select count(distinct user_id) from public.ai_usage
                       where day > current_date - 7),
    'trips_total',   (select count(*) from public.trips),
    'trips_7d',      (select count(*) from public.trips where created_at > now() - interval '7 days'),
    'plans_total',   (select count(*) from public.plans where deleted_at is null),
    'expenses_total',(select count(*) from public.expenses where deleted_at is null),
    'ratings_total', (select count(*) from public.city_ratings where stars is not null),

    -- AI (Gemini). ai_usage 가 사람·날짜별로 세고 있습니다.
    'ai_today',      (select coalesce(sum(calls), 0) from public.ai_usage
                       where day = current_date),
    'ai_7d',         (select coalesce(sum(calls), 0) from public.ai_usage
                       where day > current_date - 7),
    'ai_30d',        (select coalesce(sum(calls), 0) from public.ai_usage
                       where day > current_date - 30),
    'ai_review_7d',  (select coalesce(sum(review_calls), 0) from public.ai_usage
                       where day > current_date - 7),
    -- 한도에 자주 걸리는 사람이 있는지. 있으면 한도를 손봐야 합니다.
    'ai_top_today',  (select coalesce(max(calls), 0) from public.ai_usage
                       where day = current_date),

    -- 검색 (Tavily). 크레딧을 쓰는 것이라 담아둔 것이 몇 개인지가 곧 아낀 양입니다.
    -- 다만 6시간마다 치우므로(037) 이건 "지금 들고 있는 것"이지 누적이 아닙니다.
    'search_cached', (select count(*) from public.search_cache),
    'search_fresh',  (select count(*) from public.search_cache
                       where created_at > now() - interval '1 hour'),

    'errors_7d',     (select count(*) from public.client_errors
                       where created_at > now() - interval '7 days'),
    'reports_open',  (select count(*) from public.reports where handled_at is null)
  ) into r;
  return r;
end $$;
grant execute on function public.admin_stats() to authenticated;


-- ── 최근 신고와 오류 ────────────────────────────────────────────────
-- 숫자만 보면 무엇을 고쳐야 할지 모릅니다. 실제 문장을 봐야 합니다.
create or replace function public.admin_feed()
returns table (kind text, body text, build text, at timestamptz, n bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 볼 수 있습니다';
  end if;

  return query
  select '신고'::text, r.body, r.build, r.created_at, 1::bigint
    from public.reports r
   where r.handled_at is null
   order by r.created_at desc
   limit 20;

  -- 오류는 같은 것이 수백 번 쌓입니다. 메시지로 묶어 몇 번인지만 봅니다.
  return query
  select '오류'::text, e.message, max(e.build), max(e.created_at), count(*)
    from public.client_errors e
   where e.created_at > now() - interval '30 days'
   group by e.message
   order by count(*) desc
   limit 20;
end $$;
grant execute on function public.admin_feed() to authenticated;


-- ── 확인 ─────────────────────────────────────────────────────────────
select 'reports 표'     as item, to_regclass('public.reports') is not null as ok
union all select 'admin_stats',  to_regproc('public.admin_stats') is not null
union all select 'admin_feed',   to_regproc('public.admin_feed')  is not null
union all select '관리자면 통계가 나옴', (public.admin_stats() ? 'users_total');
