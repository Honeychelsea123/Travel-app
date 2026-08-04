-- =====================================================================
-- 탈퇴와 데이터 삭제
--
-- 이메일·이름·사진을 모으고 있으니 지울 길을 반드시 둬야 합니다.
-- 지금까지는 내려받기만 있고 지우는 길이 없었습니다.
--
-- ── 어려운 건 "지우기"가 아니라 "일행이 있는 여행" 입니다 ──
--
-- 내 계정을 지운다고 남의 여행 일정까지 없어지면 안 됩니다.
-- 그래서 여행을 두 갈래로 나눕니다.
--
--   나 혼자인 여행        → 통째로 지웁니다 (일정·지출·예약 다)
--   일행이 있는 여행      → 나만 빠집니다. 주인이면 다음 사람에게 넘깁니다
--
-- 일행이 있는 여행에서 **내가 낸 지출은 남깁니다.** 지우면 남은 사람들의
-- 정산이 조용히 틀어집니다. 대신 결제자 칸을 비웁니다 —
-- 화면에는 "결제자 없음"으로 보이고 정산에서는 빠집니다.
-- 남은 사람이 누가 냈는지 알고 다시 지정할 수 있습니다.
--
-- ── 왜 함수로 하는가 ──
-- 화면에서 표를 하나씩 지우면 중간에 끊겼을 때 반만 지워집니다.
-- 여기서 한 번에 처리하고, 하나라도 실패하면 전부 되돌아갑니다.
--
-- 계정(auth.users) 자체를 지우는 것은 이 함수가 못 합니다 —
-- 그건 서비스 키가 필요해서 Edge Function(delete-me)이 맡습니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

create or replace function public.delete_my_data()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid   uuid := auth.uid();
  solo  uuid[];            -- 나 혼자인 여행
  heir  uuid;
  t     record;
  n_solo int := 0;
  n_left int := 0;
  n_hand int := 0;
begin
  if uid is null then raise exception '로그인이 필요합니다'; end if;

  -- ── 1. 나 혼자인 여행을 고릅니다 ──
  -- "나간 사람"은 세지 않습니다. 다 나가고 나만 남은 여행도 혼자입니다.
  select coalesce(array_agg(m.trip_id), '{}')
    into solo
    from public.trip_members m
   where m.user_id = uid and m.left_at is null
     and not exists (select 1 from public.trip_members o
                      where o.trip_id = m.trip_id
                        and o.user_id <> uid
                        and o.left_at is null);

  -- ── 2. 일행이 있는 여행: 주인이면 넘기고, 아니면 그냥 빠집니다 ──
  for t in
    select m.trip_id, m.role
      from public.trip_members m
     where m.user_id = uid and m.left_at is null
       and not (m.trip_id = any(solo))
  loop
    if t.role = 'owner' then
      -- 가장 먼저 들어온 사람에게 넘깁니다. 편집자가 우선입니다 —
      -- 보기만 하던 사람에게 주인을 맡기면 아무것도 못 고칩니다.
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

    -- 내가 낸 지출은 남기고 결제자만 비웁니다 (위 설명 참고).
    update public.expenses set payer_id = null
     where trip_id = t.trip_id and payer_id = uid;
    -- 내 몫으로 잡혀 있던 줄은 뺍니다. 없는 사람에게 나눠 물릴 수는 없습니다.
    delete from public.expense_shares s
     using public.expenses e
     where s.expense_id = e.id and e.trip_id = t.trip_id and s.user_id = uid;

    delete from public.trip_members where trip_id = t.trip_id and user_id = uid;
    n_left := n_left + 1;
  end loop;

  -- ── 3. 나 혼자인 여행은 통째로 ──
  -- 아래 표들은 trip_id 에 on delete cascade 가 걸려 있어 같이 지워집니다.
  delete from public.trips where id = any(solo);
  n_solo := array_length(solo, 1);

  -- ── 4. 남의 여행에 남아 있는 내 흔적 ──
  -- 여기를 안 비우면 계정을 못 지웁니다(외래키가 붙잡습니다).
  -- 누가 만들었는지는 지워도 되는 정보입니다 — 내용은 그 여행 것입니다.
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
  -- 내가 넣은 도시는 남깁니다. 남들도 쓰고 있고 개인정보가 아닙니다.
  update public.cities       set created_by = null where created_by = uid;

  -- 내가 만든 초대 링크는 지웁니다 (created_by 가 not null 이라 비울 수 없습니다).
  delete from public.trip_invites where created_by = uid;

  -- ── 5. 내 것만 담긴 표 ──
  -- user_id 에 cascade 가 걸려 있어 계정을 지우면 따라 지워지지만,
  -- 계정 삭제가 실패할 수도 있으니 여기서 먼저 확실히 지웁니다.
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

  return jsonb_build_object(
    'deleted_trips',   coalesce(n_solo, 0),
    'left_trips',      n_left,
    'handed_over',     n_hand);
end $$;

revoke all on function public.delete_my_data() from public;
grant execute on function public.delete_my_data() to authenticated;


-- ── 미리 보기 ────────────────────────────────────────────────────────
-- 무엇이 지워지는지 **누르기 전에** 보여줘야 합니다.
-- "정말 지울까요?"만 묻고 실행하면 무엇을 잃는지 모른 채 누르게 됩니다.
create or replace function public.delete_preview()
returns jsonb
language sql stable security definer set search_path = public as $$
  with mine as (
    select m.trip_id,
           not exists (select 1 from public.trip_members o
                        where o.trip_id = m.trip_id and o.user_id <> auth.uid()
                          and o.left_at is null) as solo
      from public.trip_members m
     where m.user_id = auth.uid() and m.left_at is null
  )
  select jsonb_build_object(
    'solo_trips',   (select count(*) from mine where solo),
    'shared_trips', (select count(*) from mine where not solo),
    'plans',        (select count(*) from public.plans p
                      join mine on mine.trip_id = p.trip_id
                     where mine.solo and p.deleted_at is null),
    'expenses',     (select count(*) from public.expenses e
                      join mine on mine.trip_id = e.trip_id
                     where mine.solo and e.deleted_at is null),
    'city_ratings', (select count(*) from public.city_ratings
                      where user_id = auth.uid() and stars is not null),
    'plan_ratings', (select count(*) from public.plan_ratings where user_id = auth.uid()),
    'chats',        (select count(*) from public.chats where user_id = auth.uid())
  );
$$;
grant execute on function public.delete_preview() to authenticated;


-- ── 확인 ─────────────────────────────────────────────────────────────
select 'delete_my_data' as item, to_regproc('public.delete_my_data') is not null as ok
union all select 'delete_preview', to_regproc('public.delete_preview') is not null;
