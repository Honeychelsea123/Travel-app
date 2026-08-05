-- =====================================================================
-- 탈퇴가 "남아서 막는 것: plans 2" 로 끝나던 것
--
-- 044 의 진단 함수가 제대로 짚어줬습니다. plans 두 줄이 아직 나를 가리킵니다.
-- 그런데 044 는 분명히 이렇게 비웁니다.
--
--   update public.plans set created_by = null where created_by = uid;
--   update public.plans set updated_by = null where updated_by = uid;
--
-- ── 왜 안 지워지는가 ──
-- 001 의 touch_row 트리거 때문입니다.
--
--   new.updated_by = coalesce(auth.uid(), new.updated_by);
--
-- **update 를 할 때마다 그 줄의 updated_by 를 나로 다시 찍습니다.**
-- 그러니 첫 줄(created_by 비우기)이 돌면서 updated_by 에 나를 새로 넣고,
-- 둘째 줄이 그걸 비우면 트리거가 또 넣습니다. 지우려고 손댈 때마다
-- 새 참조가 생기는 구조라 영영 못 지웁니다.
--
-- trips·plans·candidates·expenses·bookings·packing·links 일곱 표가 다 그렇습니다.
-- plans 가 먼저 보였을 뿐입니다.
--
-- ── 어떻게 고치는가 ──
-- "지금은 탈퇴 정리 중"이라는 표시를 트랜잭션에 걸고, 트리거가 그때만
-- 손을 떼게 합니다. 평소 동작은 그대로입니다 — 남이 고치면 그대로 찍힙니다.
--
-- set_config(..., true) 는 **그 트랜잭션 안에서만** 삽니다.
-- 함수가 끝나면 저절로 풀리므로 켜두고 잊을 일이 없습니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

-- ── 1. 트리거에 예외를 하나 둡니다 ──────────────────────────────────
create or replace function public.touch_row()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  -- 탈퇴 정리 중이면 수정자를 찍지 않습니다.
  -- 안 그러면 방금 비운 칸을 여기서 다시 채워 넣습니다.
  if coalesce(current_setting('app.purging', true), '') = '1' then
    return new;
  end if;
  new.updated_by = coalesce(auth.uid(), new.updated_by);
  return new;
end $$;


-- ── 2. 지우는 함수에 그 표시를 켭니다 ───────────────────────────────
-- 044 와 같은 내용이고 맨 앞 한 줄만 늘었습니다.
create or replace function public.delete_my_data()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid   uuid := auth.uid();
  solo  uuid[];
  heir  uuid;
  t     record;
  n_solo int := 0;
  n_left int := 0;
  n_hand int := 0;
  n_orph int := 0;
begin
  if uid is null then raise exception '로그인이 필요합니다'; end if;

  -- **여기가 새로 붙은 줄입니다.** 이 트랜잭션 동안 touch_row 가 손을 뗍니다.
  perform set_config('app.purging', '1', true);

  select coalesce(array_agg(m.trip_id), '{}')
    into solo
    from public.trip_members m
   where m.user_id = uid and m.left_at is null
     and not exists (select 1 from public.trip_members o
                      where o.trip_id = m.trip_id
                        and o.user_id <> uid
                        and o.left_at is null);

  for t in
    select m.trip_id, m.role
      from public.trip_members m
     where m.user_id = uid and m.left_at is null
       and not (m.trip_id = any(solo))
  loop
    if t.role = 'owner' then
      select o.user_id into heir
        from public.trip_members o
       where o.trip_id = t.trip_id and o.user_id <> uid and o.left_at is null
       order by (o.role = 'editor') desc, o.joined_at
       limit 1;

      if heir is not null then
        update public.trip_members set role = 'owner'
         where trip_id = t.trip_id and user_id = heir;
        update public.trips set created_by = heir where id = t.trip_id;
        n_hand := n_hand + 1;
      end if;
    end if;

    update public.expenses set payer_id = null
     where trip_id = t.trip_id and payer_id = uid;
    delete from public.expense_shares s
     using public.expenses e
     where s.expense_id = e.id and e.trip_id = t.trip_id and s.user_id = uid;

    delete from public.trip_members where trip_id = t.trip_id and user_id = uid;
    n_left := n_left + 1;
  end loop;

  delete from public.trips where id = any(solo);
  n_solo := coalesce(array_length(solo, 1), 0);

  update public.trips        set updated_by = null where updated_by = uid;
  update public.trip_legs    set created_by = null where created_by = uid;
  update public.trip_legs    set updated_by = null where updated_by = uid;
  update public.plans        set created_by = null where created_by = uid;
  update public.plans        set updated_by = null where updated_by = uid;
  update public.candidates   set created_by = null where created_by = uid;
  update public.candidates   set updated_by = null where updated_by = uid;
  update public.expenses     set created_by = null where created_by = uid;
  update public.expenses     set updated_by = null where updated_by = uid;
  update public.expenses     set payer_id   = null where payer_id   = uid;
  update public.bookings     set created_by = null where created_by = uid;
  update public.bookings     set updated_by = null where updated_by = uid;
  update public.packing      set assignee_id = null where assignee_id = uid;
  update public.packing      set created_by = null where created_by = uid;
  update public.packing      set updated_by = null where updated_by = uid;
  update public.links        set created_by = null where created_by = uid;
  update public.links        set updated_by = null where updated_by = uid;
  update public.attachments  set created_by = null where created_by = uid;
  update public.notifications set actor_id  = null where actor_id  = uid;
  update public.cities       set created_by = null where created_by = uid;

  delete from public.trip_invites where created_by = uid;

  delete from public.city_ratings   where user_id = uid;
  delete from public.plan_ratings   where user_id = uid;
  delete from public.trip_reviews   where user_id = uid;
  delete from public.chats          where user_id = uid;
  delete from public.notifications  where user_id = uid;
  delete from public.candidate_votes where user_id = uid;
  delete from public.expense_shares where user_id = uid;
  delete from public.ai_usage       where user_id = uid;
  delete from public.client_errors  where user_id = uid;
  delete from public.user_prefs     where user_id = uid;
  delete from public.profiles       where id = uid;

  -- 마지막 청소. 내가 만들었지만 이미 나간 여행, 소유권을 넘기고 빠진 여행은
  -- 위에서 아무도 안 건드려 그대로 나를 가리킵니다. created_by 는 not null 이라
  -- 비울 수 없으니 남은 사람에게 넘기고, 아무도 없으면 여행째 지웁니다.
  for t in select id from public.trips where created_by = uid loop
    select o.user_id into heir
      from public.trip_members o
     where o.trip_id = t.id and o.user_id <> uid and o.left_at is null
     order by (o.role = 'owner') desc, (o.role = 'editor') desc, o.joined_at
     limit 1;

    if heir is not null then
      update public.trips set created_by = heir where id = t.id;
    else
      delete from public.trips where id = t.id;
    end if;
    n_orph := n_orph + 1;
  end loop;

  -- 여기서 다시 한 번 훑습니다. 위 청소가 trips 를 건드리면서 updated_by 가
  -- 또 찍혔을 수 있었는데(트리거), 이제는 안 찍힙니다. 그래도 확인은 남깁니다.
  update public.trips set updated_by = null where updated_by = uid;

  return jsonb_build_object(
    'deleted_trips',   n_solo,
    'left_trips',      n_left,
    'handed_over',     n_hand,
    'orphans_fixed',   n_orph,
    'still_blocking',  public.account_blockers(uid));
end $$;

revoke all on function public.delete_my_data() from public;
grant execute on function public.delete_my_data() to authenticated;


-- ── 확인 ─────────────────────────────────────────────────────────────
select '트리거에 예외가 생김' as item,
  (select prosrc like '%app.purging%' from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.proname='touch_row') as ok
union all select '지우는 함수가 그 표시를 켬',
  (select prosrc like '%set_config(''app.purging''%' from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.proname='delete_my_data')
union all select '평소에는 그대로 (표시가 꺼져 있음)',
  coalesce(current_setting('app.purging', true), '') <> '1';
