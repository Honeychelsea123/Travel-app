-- =====================================================================
-- 알림 설정
--
-- 032 에서 알림을 **만들기 시작**했는데 끌 방법이 없었습니다.
-- 끌 수 없는 알림은 결국 앱 자체를 지우게 만듭니다.
--
-- **화면에서만 숨기지 않고 서버에서 막습니다.** 화면에서 거르면 줄은 계속 쌓이고,
-- 기기를 바꾸거나 앱을 지웠다 깔면 안 보이던 것이 우르르 나옵니다.
-- 안 받겠다고 했으면 애초에 안 만드는 것이 맞습니다.
--
-- **나중에 푸시를 붙일 것을 생각해 둘로 나눴습니다.**
--   무엇을 알릴지 : notify_expense / notify_member / notify_depart  ← 지금 만드는 것
--   어떻게 알릴지 : 앱 안(지금) · 잠금화면(나중에 push_on 하나만 더)
-- 이렇게 두면 푸시를 붙일 때 이 스위치들을 다시 만들 필요가 없습니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

-- ── 1. 설정 칸 ───────────────────────────────────────────────────────
-- 기본은 전부 받기입니다. 안 받겠다고 한 적 없는 사람에게서 알림을 뺏지 않습니다.
alter table public.user_prefs
  add column if not exists notify_all     boolean not null default true,
  add column if not exists notify_expense boolean not null default true,
  add column if not exists notify_member  boolean not null default true,
  add column if not exists notify_depart  boolean not null default true;

comment on column public.user_prefs.notify_all is
  '전체 스위치. 끄면 종류와 상관없이 아무것도 안 만듭니다';


-- ── 2. 받을 사람인지 판정 ────────────────────────────────────────────
-- 설정 줄이 아직 없는 사람도 있습니다(가입 트리거가 만들지만 옛 계정은 없을 수 있음).
-- 그때는 기본값인 "받기"로 봅니다 — coalesce 가 그 역할입니다.
create or replace function public.notify_wants(p_user uuid, p_kind text)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
             when not p.notify_all then false
             when p_kind = 'expense_added'            then p.notify_expense
             when p_kind in ('member_joined','joined') then p.notify_member
             when p_kind = 'depart_soon'              then p.notify_depart
             else true
           end
      from public.user_prefs p
     where p.user_id = p_user
  ), true);
$$;


-- ── 3. 만드는 쪽에 그 판정을 겁니다 ──────────────────────────────────
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
     and m.user_id is distinct from p_actor
     and public.notify_wants(m.user_id, p_kind);   -- ← 여기
  get diagnostics n = row_count;
  return n;
end $$;

-- 새로 들어온 사람에게 보내는 "참여했어요"도 같은 판정을 거칩니다.
create or replace function public.notify_join()
returns trigger language plpgsql security definer set search_path = public as $$
declare who text; t text;
begin
  select display_name into who from public.profiles where id = new.user_id;
  select title into t from public.trips where id = new.trip_id;

  if public.notify_wants(new.user_id, 'joined') then
    insert into public.notifications (user_id, trip_id, kind, body, actor_id)
    values (new.user_id, new.trip_id, 'joined',
            coalesce(t, '여행') || ' 에 참여했어요', new.user_id);
  end if;

  perform public.notify_members(
    new.trip_id, 'member_joined',
    coalesce(who, '새 일행') || '님이 합류했어요', new.user_id);
  return new;
end $$;

-- 출발 하루 전도 마찬가지입니다.
create or replace function public.ensure_trip_reminders()
returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0;
begin
  if auth.uid() is null then return 0; end if;
  if not public.notify_wants(auth.uid(), 'depart_soon') then return 0; end if;

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


-- ── 확인 ─────────────────────────────────────────────────────────────
select 'notify_all 칸'  as item,
       exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='user_prefs'
                  and column_name='notify_all') as ok
union all select 'notify_wants 함수', to_regproc('public.notify_wants') is not null
union all select '기본값은 받기',
                 public.notify_wants('00000000-0000-0000-0000-000000000000'::uuid,
                                     'expense_added');
