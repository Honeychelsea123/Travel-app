-- =====================================================================
-- 탈퇴가 "자료는 지웠는데 계정이 남았습니다: {}" 로 끝나던 것
--
-- GoTrue 가 본문 없이 실패하면 저 {} 가 나옵니다. 거의 항상 원인은 하나입니다 —
-- **auth.users 를 가리키는 외래키가 아직 남아 있어서** 그 줄을 못 지웁니다.
--
-- ── 036 에 뚫려 있던 구멍 ──
-- 036 은 trips.created_by 를 **내가 지금 참여 중인 여행에 대해서만** 손봅니다.
-- 그런데 created_by 는 "만든 사람"이라 참여와 상관없이 남습니다.
--   · 내가 만들고 나중에 나간 여행
--   · 내가 만들고 소유권을 남에게 넘긴 여행
-- 이 둘은 아무도 안 건드려서 그대로 나를 가리킵니다. not null 이라 비울 수도 없습니다.
--
-- ── 사진도 걸립니다 ──
-- 프로필 사진을 올렸으면 storage.objects.owner 가 나를 가리킵니다.
-- 그건 storage 스키마 소유라 여기서 못 지웁니다 — Edge Function 이 맡습니다.
--
-- ── 다시는 추측하지 않게 ──
-- account_blockers() 를 같이 만듭니다. 또 막히면 무엇이 몇 개 남았는지
-- 숫자로 말해줍니다. {} 를 보고 짐작하는 일을 없앱니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

-- ── 1. 무엇이 막고 있는지 ───────────────────────────────────────────
create or replace function public.account_blockers(p_user uuid default auth.uid())
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'trips_created',  (select count(*) from trips        where created_by = p_user),
    'trips_updated',  (select count(*) from trips        where updated_by = p_user),
    'invites',        (select count(*) from trip_invites where created_by = p_user),
    'plans',          (select count(*) from plans
                        where created_by = p_user or updated_by = p_user),
    'candidates',     (select count(*) from candidates
                        where created_by = p_user or updated_by = p_user),
    'expenses',       (select count(*) from expenses
                        where created_by = p_user or updated_by = p_user
                           or payer_id = p_user),
    'bookings',       (select count(*) from bookings
                        where created_by = p_user or updated_by = p_user),
    'packing',        (select count(*) from packing
                        where created_by = p_user or updated_by = p_user
                           or assignee_id = p_user),
    'links',          (select count(*) from links
                        where created_by = p_user or updated_by = p_user),
    'attachments',    (select count(*) from attachments  where created_by = p_user),
    'trip_legs',      (select count(*) from trip_legs
                        where created_by = p_user or updated_by = p_user),
    'cities',         (select count(*) from cities       where created_by = p_user),
    'notif_actor',    (select count(*) from notifications where actor_id = p_user),
    -- storage 는 여기서 못 지웁니다. 숫자만 보여주고 지우는 것은 Edge Function 이.
    'storage_files',  (select count(*) from storage.objects where owner = p_user)
  );
$$;
grant execute on function public.account_blockers(uuid) to authenticated;


-- ── 2. delete_my_data 에 마지막 청소를 붙입니다 ─────────────────────
-- 036 을 통째로 다시 쓰지 않고, 끝나기 직전에 "그래도 남은 것"을 훑습니다.
-- 앞의 처리와 겹쳐도 손해가 없고, 앞에서 새 구멍이 생겨도 여기서 막힙니다.
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
  n_orph int := 0;      -- 마지막 청소에서 넘기거나 지운 여행 수
begin
  if uid is null then raise exception '로그인이 필요합니다'; end if;

  -- ── 1. 나 혼자인 여행 ──
  select coalesce(array_agg(m.trip_id), '{}')
    into solo
    from public.trip_members m
   where m.user_id = uid and m.left_at is null
     and not exists (select 1 from public.trip_members o
                      where o.trip_id = m.trip_id
                        and o.user_id <> uid
                        and o.left_at is null);

  -- ── 2. 일행이 있는 여행 ──
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

  -- ── 3. 나 혼자인 여행은 통째로 ──
  delete from public.trips where id = any(solo);
  n_solo := coalesce(array_length(solo, 1), 0);

  -- ── 4. 남의 여행에 남은 내 흔적 ──
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

  -- ── 5. 내 것만 담긴 표 ──
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

  -- ── 6. **마지막 청소** ─────────────────────────────────────────────
  -- 여기가 새로 붙은 부분입니다. 위를 다 돌고도 trips.created_by 가 나를
  -- 가리키는 여행이 남을 수 있습니다 — 내가 만들었지만 이미 나간 여행,
  -- 소유권을 넘기고 빠진 여행이 그렇습니다. created_by 는 not null 이라
  -- 비울 수 없으니, 남은 사람에게 넘기고 아무도 없으면 여행째 지웁니다.
  for t in select id from public.trips where created_by = uid loop
    select o.user_id into heir
      from public.trip_members o
     where o.trip_id = t.id and o.user_id <> uid and o.left_at is null
     order by (o.role = 'owner') desc, (o.role = 'editor') desc, o.joined_at
     limit 1;

    if heir is not null then
      update public.trips set created_by = heir where id = t.id;
    else
      -- 아무도 안 남았습니다. 남겨둘 이유가 없고, 남기면 계정을 못 지웁니다.
      delete from public.trips where id = t.id;
    end if;
    n_orph := n_orph + 1;
  end loop;

  return jsonb_build_object(
    'deleted_trips',   n_solo,
    'left_trips',      n_left,
    'handed_over',     n_hand,
    'orphans_fixed',   n_orph,
    -- 이걸 같이 돌려주면 그래도 실패했을 때 무엇이 남았는지 바로 보입니다.
    'still_blocking',  public.account_blockers(uid));
end $$;

revoke all on function public.delete_my_data() from public;
grant execute on function public.delete_my_data() to authenticated;


-- ── 확인 ─────────────────────────────────────────────────────────────
select 'account_blockers 함수' as item, to_regproc('public.account_blockers') is not null as ok
union all select 'delete_my_data 새로 만들어짐',
  (select prosrc like '%orphans_fixed%' from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.proname='delete_my_data')
union all select 'storage.objects 를 읽을 수 있음',
  (select count(*) >= 0 from storage.objects);
