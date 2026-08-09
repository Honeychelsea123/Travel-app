-- =====================================================================
-- 잠금화면 알림 (Web Push)
--
-- 지금까지 알림은 **앱을 열어야만** 보였습니다(종 아이콘). 그런데 여행
-- 앱을 여는 이유는 대개 "지금 뭐 할 시간인가" 하나이고, 그걸 알려면
-- 앱을 열어야 한다는 것이 앞뒤가 안 맞습니다. 먼저 말을 걸어야 합니다.
--
-- **035 의 notify_all 스위치를 그대로 씁니다.** "무엇을 알릴지"는 거기서
-- 정하고 여기는 "어떻게 받을지"만 더합니다 — 스위치를 두 벌 두면
-- 하나를 껐는데 다른 하나로 계속 오는 일이 생깁니다.
--
-- **pg_cron 은 이 등급에 없습니다**(032·042 에 적어둔 것과 같은 사정).
-- 그래서 시간이 되면 도는 일은 GitHub Actions 가 맡고, 여기서는
-- "지금 보낼 것"을 계산해 주기만 합니다.
--
-- 062 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

-- ── 기기 등록 ────────────────────────────────────────────────────────
-- 사람 하나가 폰·노트북 여러 대를 씁니다. 그래서 사람당 한 줄이 아니라
-- **기기(endpoint)당 한 줄**입니다.
create table if not exists public.push_subs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  endpoint   text not null unique,   -- 브라우저가 주는 주소. 이것이 곧 기기
  p256dh     text not null,
  auth       text not null,
  ua         text,                   -- 어느 기기인지 사람이 알아보게
  created_at timestamptz not null default now()
);
create index if not exists push_subs_user_idx on public.push_subs(user_id);

alter table public.push_subs enable row level security;
drop policy if exists push_self on public.push_subs;
create policy push_self on public.push_subs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());


-- ── 보낸 것 ──────────────────────────────────────────────────────────
-- **같은 것을 두 번 보내면 안 됩니다.** 15분마다 도는데 창을 20분으로
-- 잡으므로 한 건이 두 번 걸립니다. 여기 줄이 있으면 건너뜁니다.
-- 기기별이 아니라 **사람별**입니다 — 폰과 노트북에 같은 말이 두 번
-- 뜨는 것은 맞지만, 그건 한 번 보낸 것이 두 기기로 간 것뿐입니다.
create table if not exists public.push_log (
  user_id uuid not null references auth.users on delete cascade,
  kind    text not null,             -- plan | flight
  ref_id  uuid not null,             -- 그 일정·예약의 id
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, ref_id)
);
alter table public.push_log enable row level security;
-- 사람이 읽을 일이 없습니다. 서비스 키로만 씁니다(정책을 안 만들면 아무도 못 봅니다).


-- ── 지금 보낼 것 ─────────────────────────────────────────────────────
-- **시각은 여행지 시간입니다.** 도쿄 09:00 일정은 한국에서 08:00 입니다.
-- `(날짜 + 시각) at time zone 여행시간대` 로 진짜 순간을 만들어 비교합니다.
-- 이걸 안 하면 시차만큼 어긋난 때에 알림이 갑니다.
--
-- 창을 p_window 로 받는 이유: 도는 간격보다 넉넉히 잡아야 한 번 늦어도
-- 안 놓칩니다. 두 번 걸리는 것은 push_log 가 막습니다.
create or replace function public.due_pushes(p_window interval default '20 minutes')
returns table (user_id uuid, kind text, ref_id uuid,
               title text, body text, url text)
language sql security definer set search_path = public as $$
  with mine as (
    select m.user_id, t.id as trip_id, t.title as trip_title,
           coalesce(nullif(t.timezone, ''), 'UTC') as tz
      from public.trip_members m
      join public.trips t on t.id = m.trip_id
     where m.left_at is null
       and public.notify_wants(m.user_id, 'plan')   -- 035 의 스위치
  ),
  -- 일정 시작 30분 전
  p as (
    select mine.user_id, 'plan'::text as kind, pl.id as ref_id,
           pl.title as title,
           to_char((pl.date + pl.start_time), 'HH24:MI') || ' · ' || mine.trip_title as body,
           ((pl.date + pl.start_time) at time zone mine.tz) as at
      from public.plans pl
      join mine on mine.trip_id = pl.trip_id
     where pl.deleted_at is null and pl.start_time is not null
  ),
  -- 항공은 3시간 전. 공항까지 가야 하는 시간입니다.
  f as (
    select mine.user_id, 'flight'::text as kind, b.id as ref_id,
           b.title as title,
           to_char((b.start_date + b.start_time), 'HH24:MI') || ' 출발' as body,
           ((b.start_date + b.start_time) at time zone mine.tz) as at
      from public.bookings b
      join mine on mine.trip_id = b.trip_id
     where b.deleted_at is null and b.kind = '항공'
       and b.start_date is not null and b.start_time is not null
  ),
  all_rows as (
    select user_id, kind, ref_id, title, body, at - interval '30 minutes' as fire from p
    union all
    select user_id, kind, ref_id, title, body, at - interval '3 hours'    as fire from f
  )
  select a.user_id, a.kind, a.ref_id,
         a.title,
         a.body || case when a.kind = 'plan' then ' · 30분 뒤예요'
                                             else ' · 슬슬 나가실 시간이에요' end,
         '/'::text
    from all_rows a
   where a.fire <= now() and a.fire > now() - p_window
     and not exists (select 1 from public.push_log g
                      where g.user_id = a.user_id and g.kind = a.kind
                        and g.ref_id = a.ref_id);
$$;

revoke execute on function public.due_pushes(interval) from anon, authenticated;


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '기기 표'::text as check,
         case when to_regclass('public.push_subs') is not null then 'OK' else 'X' end as result,
         '사람당이 아니라 기기당 한 줄'::text as note
  union all
  select 2, '보낸 기록',
         case when to_regclass('public.push_log') is not null then 'OK' else 'X' end,
         '같은 것을 두 번 안 보내려고'
  union all
  select 3, '보낼 것 계산',
         case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                            where n.nspname='public' and p.proname='due_pushes')
              then 'OK' else 'X' end,
         '여행지 시간으로 계산한다'
  union all
  select 4, '지금 보낼 것',
         'OK',
         coalesce((select count(*)::text || '건' from public.due_pushes()), '0건')
) t order by ord;
