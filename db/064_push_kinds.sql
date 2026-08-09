-- =====================================================================
-- 알림을 골라 받게 한다
--
-- 063 은 "잠금화면 알림 켬/끔" 하나뿐이었습니다. 그런데 **일정 알림은
-- 일정 수만큼 옵니다** — 10일 여행에 하루 다섯 곳이면 쉰 번입니다.
-- 그건 안내가 아니라 공해고, 공해가 되면 스위치를 끄는 게 아니라
-- 앱을 지웁니다. 끄고 켜는 것보다 **덜 오게 하는 선택지**가 먼저입니다.
--
-- 그래서 일정 알림은 켬/끔이 아니라 셋입니다.
--   all   모든 일정 30분 전   — 빡빡하게 다니는 사람
--   first 그날 첫 일정만      — 기본값. 하루 한 번이면 절대 공해가 안 됩니다
--   off   안 받음
--
-- **기본값을 all 로 두지 않았습니다.** 켜자마자 쏟아지면 그 사람은
-- 두 번째 날을 안 봅니다. 조용한 쪽을 기본으로 두고 올리게 합니다.
--
-- 비행기는 켬/끔입니다. 여행에 몇 번 없고 놓치면 손해가 큽니다.
--
-- 063 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

alter table public.user_prefs
  add column if not exists notify_plan   text    not null default 'first',
  add column if not exists notify_flight boolean not null default true;

do $$ begin
  alter table public.user_prefs
    add constraint user_prefs_notify_plan_ck check (notify_plan in ('all','first','off'));
exception when duplicate_object then null; end $$;

comment on column public.user_prefs.notify_plan is
  '일정 알림: all=모든 일정 / first=그날 첫 일정만 / off=안 받음';
comment on column public.user_prefs.notify_flight is
  '비행기 출발 3시간 전 알림';


-- ── 보낼 것 다시 계산 ────────────────────────────────────────────────
-- 063 것을 덮어씁니다. 달라진 것은 **고른 대로 거른다**는 것 하나입니다.
create or replace function public.due_pushes(p_window interval default '20 minutes')
returns table (user_id uuid, kind text, ref_id uuid,
               title text, body text, url text)
language sql security definer set search_path = public as $$
  with mine as (
    select m.user_id, t.id as trip_id, t.title as trip_title,
           coalesce(nullif(t.timezone, ''), 'UTC') as tz,
           /* 설정 줄이 없는 옛 계정도 있습니다. 그때는 기본값으로 봅니다. */
           coalesce(p.notify_all, true)     as want_all,
           coalesce(p.notify_plan, 'first') as want_plan,
           coalesce(p.notify_flight, true)  as want_flight
      from public.trip_members m
      join public.trips t on t.id = m.trip_id
      left join public.user_prefs p on p.user_id = m.user_id
     where m.left_at is null
       and coalesce(p.notify_all, true)     -- 위 스위치를 끄면 전부 안 갑니다
  ),
  -- 일정 시작 30분 전.
  p as (
    select mine.user_id, 'plan'::text as kind, pl.id as ref_id,
           pl.title as title,
           to_char((pl.date + pl.start_time), 'HH24:MI') || ' · ' || mine.trip_title as body,
           ((pl.date + pl.start_time) at time zone mine.tz) as at,
           mine.want_plan,
           /* **그날 첫 일정**이 몇 번째인지. 사람·여행·날짜별로 셉니다 —
              여행 두 개가 같은 날에 걸쳐 있으면 각각 첫 일정이 있습니다. */
           row_number() over (partition by mine.user_id, pl.trip_id, pl.date
                              order by pl.start_time) as nth
      from public.plans pl
      join mine on mine.trip_id = pl.trip_id
     where pl.deleted_at is null and pl.start_time is not null
       and mine.want_plan <> 'off'
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
       and mine.want_flight
  ),
  all_rows as (
    select user_id, kind, ref_id, title, body, at - interval '30 minutes' as fire
      from p
     where want_plan = 'all' or nth = 1
    union all
    select user_id, kind, ref_id, title, body, at - interval '3 hours' as fire
      from f
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
  select 1 as ord, '고르는 칸'::text as check,
         case when exists (select 1 from information_schema.columns
                            where table_name='user_prefs' and column_name='notify_plan')
              then 'OK' else 'X' end as result,
         'all / first / off'::text as note
  union all
  select 2, '기본값',
         case when (select column_default from information_schema.columns
                     where table_name='user_prefs' and column_name='notify_plan')
                   like '%first%' then 'OK' else 'X' end,
         '조용한 쪽이 기본이다 — 켜자마자 쏟아지면 두 번째 날을 안 본다'
  union all
  select 3, '내 설정',
         'OK',
         coalesce((select notify_plan || ' · 비행기 ' || notify_flight::text
                     from public.user_prefs where user_id = auth.uid()), '(설정 줄 없음 = 기본값)')
  union all
  select 4, '지금 보낼 것',
         'OK',
         coalesce((select count(*)::text || '건' from public.due_pushes()), '0건')
) t order by ord;
