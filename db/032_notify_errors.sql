-- =====================================================================
-- 알림 만드는 쪽 · 삭제 복구 · 오류 기록
--
-- 알림은 받는 화면(종 아이콘)만 있고 만드는 쪽이 없었습니다.
-- 표와 정책은 001 에 이미 있고, 정책이 "만드는 건 서버(트리거)"로 못박아 뒀습니다.
-- 그래서 여기서 트리거로 만듭니다. 화면에서는 못 만듭니다 — 남의 알림함에
-- 아무 말이나 넣을 수 있으면 안 되기 때문입니다.
--
-- **무엇을 알리고 무엇을 안 알리는가**
--   알림 : 일행이 들어옴 · 지출이 늘어남 · 출발 하루 전
--   안 함 : 일정 추가.
--     AI 초안을 "이대로 30개 넣기"로 담으면 알림이 30개 쏟아집니다.
--     묶어서 하나로 만들려면 트리거만으로는 안 되고, 시끄러운 알림은
--     사람들이 알림 자체를 꺼버리게 만듭니다. 값이 확실한 것만 남겼습니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

-- ── 1. 여러 사람에게 한 번에 ─────────────────────────────────────────
-- 나(행동한 사람)에게는 안 보냅니다. 내가 한 일을 나에게 알릴 이유가 없습니다.
-- 나간 사람(left_at)에게도 안 보냅니다.
create or replace function public.notify_members(
  p_trip uuid, p_kind text, p_body text, p_actor uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.notifications (user_id, trip_id, kind, body, actor_id)
  select m.user_id, p_trip, p_kind, p_body, p_actor
    from public.trip_members m
   where m.trip_id = p_trip
     and m.left_at is null
     and m.user_id is distinct from p_actor;
  get diagnostics n = row_count;
  return n;
end $$;


-- ── 2. 지출이 늘어나면 ───────────────────────────────────────────────
-- 정산에 바로 영향을 주는 일이라 일행이 알아야 합니다.
create or replace function public.notify_expense()
returns trigger language plpgsql security definer set search_path = public as $$
declare who text;
begin
  select coalesce(m.nickname, p.display_name, '누군가')
    into who
    from public.trip_members m
    left join public.profiles p on p.id = m.user_id
   where m.trip_id = new.trip_id and m.user_id = auth.uid();

  perform public.notify_members(
    new.trip_id, 'expense_added',
    coalesce(who, '누군가') || '님이 지출을 넣었어요 · ' ||
      new.title || ' ' || trim(to_char(new.amount, 'FM999,999,999,990.##')) ||
      ' ' || new.currency,
    auth.uid());
  return new;
end $$;

drop trigger if exists expenses_notify on public.expenses;
create trigger expenses_notify after insert on public.expenses
  for each row execute function public.notify_expense();


-- ── 3. 일행이 들어오면 ───────────────────────────────────────────────
-- redeem_invite 로 들어오는 길 하나뿐이라 여기 한 곳만 보면 됩니다.
create or replace function public.notify_join()
returns trigger language plpgsql security definer set search_path = public as $$
declare who text; t text;
begin
  select display_name into who from public.profiles where id = new.user_id;
  select title into t from public.trips where id = new.trip_id;
  -- 새로 들어온 사람에게는 "합류했어요"가 아니라 여행 이름을 알려줍니다.
  insert into public.notifications (user_id, trip_id, kind, body, actor_id)
  values (new.user_id, new.trip_id, 'joined',
          coalesce(t, '여행') || ' 에 참여했어요', new.user_id);
  -- 원래 있던 사람들에게는 누가 왔는지.
  perform public.notify_members(
    new.trip_id, 'member_joined',
    coalesce(who, '새 일행') || '님이 합류했어요', new.user_id);
  return new;
end $$;

drop trigger if exists members_notify on public.trip_members;
create trigger members_notify after insert on public.trip_members
  for each row execute function public.notify_join();


-- ── 4. 출발 하루 전 ──────────────────────────────────────────────────
-- 시간이 되면 저절로 도는 장치(pg_cron)는 유료 등급에서만 확실합니다.
-- 그래서 앱을 열 때 화면이 이 함수를 부릅니다. 여러 번 불러도 한 번만 생깁니다 —
-- 같은 여행에 이미 같은 알림이 있으면 넘어갑니다.
create or replace function public.ensure_trip_reminders()
returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0;
begin
  if auth.uid() is null then return 0; end if;

  insert into public.notifications (user_id, trip_id, kind, body)
  select auth.uid(), t.id, 'depart_soon',
         t.title || ' 출발이 내일이에요 · ' || t.destination
    from public.trips t
    join public.trip_members m on m.trip_id = t.id
                              and m.user_id = auth.uid()
                              and m.left_at is null
   where t.start_date = current_date + 1
     and not exists (select 1 from public.notifications x
                      where x.user_id = auth.uid()
                        and x.trip_id = t.id
                        and x.kind = 'depart_soon');
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.ensure_trip_reminders() to authenticated;


-- ── 5. 삭제 복구 ─────────────────────────────────────────────────────
-- 지운 것은 진짜로 안 지우고 deleted_at 만 찍어 왔습니다(001 의 규칙 1).
-- 그런데 되살리는 길이 화면에 없어서 사실상 영영 지운 것과 같았습니다.
-- 표별 정책이 이미 can_write_trip 을 요구하므로 화면에서 그냥 update 하면 됩니다.
-- 여기서는 "지운 것"을 한 번에 모아 주는 함수만 둡니다 — 표 셋을 각각
-- 물어보면 화면 코드가 세 배가 됩니다.
create or replace function public.deleted_items(p_trip uuid)
returns table (kind text, id uuid, title text, sub text, deleted_at timestamptz)
language sql security definer set search_path = public as $$
  select 'plan', p.id, p.title,
         p.date::text || coalesce(' ' || to_char(p.start_time, 'HH24:MI'), ''),
         p.deleted_at
    from public.plans p
   where p.trip_id = p_trip and p.deleted_at is not null
     and public.can_read_trip(p_trip)
  union all
  select 'expense', e.id, e.title,
         e.date::text || ' · ' || trim(to_char(e.amount, 'FM999,999,999,990.##'))
           || ' ' || e.currency,
         e.deleted_at
    from public.expenses e
   where e.trip_id = p_trip and e.deleted_at is not null
     and public.can_read_trip(p_trip)
  union all
  select 'booking', b.id, b.title,
         b.kind || coalesce(' · ' || b.start_date::text, ''),
         b.deleted_at
    from public.bookings b
   where b.trip_id = p_trip and b.deleted_at is not null
     and public.can_read_trip(p_trip)
  order by 5 desc
  limit 200;
$$;
grant execute on function public.deleted_items(uuid) to authenticated;


-- ── 6. 오류 기록 ─────────────────────────────────────────────────────
-- 남이 쓰기 시작하면 "안 돼요" 한 마디만 오고 무엇이 터졌는지 알 길이 없습니다.
-- 화면에서 터진 것을 여기 남깁니다. 개인정보는 담지 않습니다 —
-- 메시지와 어느 파일 몇 줄인지, 그리고 누구인지(user_id)까지만입니다.
create table if not exists public.client_errors (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users on delete set null default auth.uid(),
  build      text,
  message    text not null,
  source     text,
  stack      text,
  ua         text,
  created_at timestamptz not null default now()
);
create index if not exists client_errors_at_idx
  on public.client_errors(created_at desc);

alter table public.client_errors enable row level security;
-- 넣기만 됩니다. 남의 오류를 읽을 수는 없습니다.
-- 내가 낸 오류는 내가 볼 수 있게 둡니다 — 프로필에서 확인하고 보내라고 할 수 있습니다.
drop policy if exists errors_insert on public.client_errors;
create policy errors_insert on public.client_errors for insert
  with check (user_id = auth.uid());
drop policy if exists errors_self on public.client_errors;
create policy errors_self on public.client_errors for select
  using (user_id = auth.uid());


-- ── 확인 ─────────────────────────────────────────────────────────────
select 'notify_members'         as item, to_regproc('public.notify_members')          is not null as ok
union all select 'expenses_notify 트리거', exists (select 1 from pg_trigger where tgname='expenses_notify')
union all select 'members_notify 트리거',  exists (select 1 from pg_trigger where tgname='members_notify')
union all select 'ensure_trip_reminders',  to_regproc('public.ensure_trip_reminders') is not null
union all select 'deleted_items',          to_regproc('public.deleted_items')         is not null
union all select 'client_errors 표',       to_regclass('public.client_errors')        is not null;
