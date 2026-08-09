-- =====================================================================
-- 알림의 구멍 셋
--
-- 1. **출국편 알림이 1시간 일찍 왔습니다.**
--    063 은 출발 시각을 여행지 시간대로 읽었습니다. 도쿄 여행이면
--    인천 13:20 출발을 Asia/Tokyo 로 해석합니다 — 실제로는 12:20 KST 라
--    3시간 전 알림이 09:20 에 옵니다. 맞는 시각은 10:20 입니다.
--    **사람이 적는 시각은 언제나 출발 공항의 현지 시각**(표에 적힌 그것)인데,
--    우리는 출발 공항이 어딘지 모릅니다.
--    → 여행 첫날까지의 비행기는 **집에서 뜨는 것**으로 봅니다. 그 뒤는
--      그날 있는 구간의 도시 시각으로 봅니다. 돌아오는 편이 여기 걸립니다.
--    → 집 시간대는 브라우저가 알고 있으므로 앱이 넣어줍니다(home_tz).
--      없으면 여행 시간대로 두는 건 063 과 같습니다.
--
-- 2. **알림을 눌러도 그 일정으로 안 갔습니다.** url 이 '/' 라 앱만 열렸습니다.
--    → 여행과 날짜를 주소에 실어 보냅니다.
--
-- 3. **push_log 가 영원히 쌓였습니다.** 지우는 코드가 없었습니다.
--    → 15분마다 도는 함수가 오래된 줄을 같이 치웁니다(042 와 같은 방식 —
--      pg_cron 이 없으니 지나가는 김에 합니다).
--
-- 064 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

alter table public.user_prefs
  add column if not exists home_tz text;
comment on column public.user_prefs.home_tz is
  '사는 곳 시간대(IANA). 앱이 브라우저에서 읽어 넣습니다. 출국편 알림 시각에 씁니다.';

-- 오래된 것을 지울 때 훑지 않도록.
create index if not exists push_log_sent_idx on public.push_log(sent_at);


-- ── 오래된 보낸 기록 치우기 ──────────────────────────────────────────
-- 30일이면 충분합니다. 여행 하나가 끝나고도 한참입니다.
create or replace function public.purge_push_log()
returns integer
language sql security definer set search_path = public as $$
  with x as (
    delete from public.push_log where sent_at < now() - interval '30 days' returning 1
  ) select count(*)::int from x;
$$;
revoke execute on function public.purge_push_log() from anon, authenticated;


-- ── 보낼 것 다시 계산 ────────────────────────────────────────────────
create or replace function public.due_pushes(p_window interval default '20 minutes')
returns table (user_id uuid, kind text, ref_id uuid,
               title text, body text, url text)
language sql security definer set search_path = public as $$
  with mine as (
    select m.user_id, t.id as trip_id, t.title as trip_title,
           t.start_date as trip_start,
           coalesce(nullif(t.timezone, ''), 'UTC') as tz,
           /* 집 시간대. 아직 안 받아둔 사람은 여행 시간대로 둡니다 —
              063 과 똑같이 도는 것이라 나빠지지는 않습니다. */
           coalesce(nullif(p.home_tz, ''), nullif(t.timezone, ''), 'UTC') as home_tz,
           coalesce(p.notify_plan, 'first') as want_plan,
           coalesce(p.notify_flight, true)  as want_flight
      from public.trip_members m
      join public.trips t on t.id = m.trip_id
      left join public.user_prefs p on p.user_id = m.user_id
     where m.left_at is null
       and coalesce(p.notify_all, true)
  ),
  -- 일정 시작 30분 전. 일정은 그 자리에 서 있는 것이라 여행지 시각이 맞습니다.
  p as (
    select mine.user_id, 'plan'::text as kind, pl.id as ref_id,
           pl.title as title,
           to_char((pl.date + pl.start_time), 'HH24:MI') || ' · ' || mine.trip_title as body,
           ((pl.date + pl.start_time) at time zone mine.tz) as at,
           mine.trip_id, pl.date as on_date, mine.want_plan,
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
           /* **여기가 1번입니다.** 여행 첫날까지는 집에서 뜹니다. */
           ((b.start_date + b.start_time) at time zone
              case when b.start_date <= mine.trip_start then mine.home_tz
                   else coalesce((select coalesce(nullif(c.timezone, ''), mine.tz)
                                    from public.trip_legs l
                                    join public.cities c on c.id = l.city_id
                                   where l.trip_id = mine.trip_id
                                     and b.start_date between l.start_date and l.end_date
                                   order by l.start_date limit 1), mine.tz)
              end) as at,
           mine.trip_id, b.start_date as on_date
      from public.bookings b
      join mine on mine.trip_id = b.trip_id
     where b.deleted_at is null and b.kind = '항공'
       and b.start_date is not null and b.start_time is not null
       and mine.want_flight
  ),
  all_rows as (
    select user_id, kind, ref_id, title, body, trip_id, on_date,
           at - interval '30 minutes' as fire
      from p where want_plan = 'all' or nth = 1
    union all
    select user_id, kind, ref_id, title, body, trip_id, on_date,
           at - interval '3 hours' as fire
      from f
  )
  select a.user_id, a.kind, a.ref_id,
         a.title,
         a.body || case when a.kind = 'plan' then ' · 30분 뒤예요'
                                             else ' · 슬슬 나가실 시간이에요' end,
         /* **2번.** 눌렀을 때 그 여행의 그 날로 갑니다. 앱만 열리면
            무엇 때문에 울렸는지 다시 찾아야 합니다. */
         './?t=' || a.trip_id::text || '&d=' || a.on_date::text
    from all_rows a
   where a.fire <= now() and a.fire > now() - p_window
     and not exists (select 1 from public.push_log g
                      where g.user_id = a.user_id and g.kind = a.kind
                        and g.ref_id = a.ref_id);
$$;

revoke execute on function public.due_pushes(interval) from anon, authenticated;


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '집 시간대 칸'::text as check,
         case when exists (select 1 from information_schema.columns
                            where table_name='user_prefs' and column_name='home_tz')
              then 'OK' else 'X' end as result,
         '출국편은 집 시각으로 잰다'::text as note
  union all
  select 2, '오래된 기록 치우기',
         case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                            where n.nspname='public' and p.proname='purge_push_log')
              then 'OK' else 'X' end,
         '30일 지난 것. 15분마다 도는 함수가 같이 한다'
  union all
  select 3, '주소에 여행이 실리나',
         case when (select prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                     where n.nspname='public' and p.proname='due_pushes') like '%?t=%'
              then 'OK' else 'X' end,
         '눌렀을 때 그 날로 간다'
  union all
  select 4, '지금 보낼 것',
         'OK',
         coalesce((select count(*)::text || '건' from public.due_pushes()), '0건')
) t order by ord;
