-- ── 사람 신고 보기 · 비공개로 잠그기 (b789) ─────────────────────────────
--
-- 101(팔로우) 다음에 실행합니다. 여러 번 실행해도 안전합니다.
--
-- 1. 사람 신고를 관리자 화면에서 봅니다.
--    101 에서 신고(people_reports)를 받기 시작했는데 **볼 곳이 없었습니다** —
--    Supabase 를 직접 열어야 보였습니다. 대시보드에 한 칸을 둡니다.
--    ⚠ 이름·사진은 profiles 에서 읽는데, profiles 는 «나와 일행»만 읽힙니다(001).
--      그래서 관리자라도 표를 바로 못 읽고 이 함수(security definer)를 거칩니다.
--    ⚠ 「처리함」 표시(handled_at)는 101 의 정책(preports_admin)으로 관리자가
--      표에 바로 씁니다 — 함수가 따로 없습니다.
--    ⚠ 신고한 사람의 이름은 **관리자에게만** 나옵니다.
--
-- 2. 비공개로 잠그기 (사용자: 「아무도 안보여주고 싶을 때 비공개 기능도 있어?」
--    → 「비공개로 잠그기 만들어줘」).
--    켜면 **팔로워를 포함해 아무에게도** 지구본·성향·배지·별점·소식이 안 보입니다.
--    새 팔로우 요청을 못 받고, 이름 찾기 · 도시 화면의 「팔로우하는 사람들」 ·
--    친구 소식에서도 빠집니다. 남이 보는 머리에는 이름·사진만(팔로워 수도 숨김).
--    ⚠ 팔로우 관계는 **그대로** 둡니다 — 끄면 원래대로 보입니다(한 명씩 뺄 필요 없음).
--    ⚠ 한줄평은 원래 누구에게나 보이는 것이라 그대로입니다(city_comments 안 건드림).
--    ⚠ 화면에서 숨기는 것이 아니라 **서버가 안 보냅니다.** 거르는 곳은 아래 여섯 —
--      can_see_person · person_head · people_find · follow_ask · friend_feed · city_friends.
--      ⚠ 101 의 본문을 그대로 옮기고 잠금 한 줄씩만 더했습니다. 101 을 고치면 여기도.


-- ── 1. 사람 신고 ─────────────────────────────────────────────────────────
create or replace function public.admin_people_reports(p_all boolean default false)
returns table (id bigint, target uuid, target_name text, target_avatar text,
               reporter uuid, reporter_name text, reason text, detail text,
               created_at timestamptz, handled_at timestamptz, target_total int)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception '관리자만 볼 수 있어요'; end if;
  return query
    select r.id, r.target, t.display_name, t.avatar_url,
           r.reporter, p.display_name, r.reason, r.detail,
           r.created_at, r.handled_at,
           -- 같은 사람이 몇 번 신고됐나(처리한 것까지). 여러 사람에게 신고당하는 것이 신호입니다.
           (select count(*)::int from public.people_reports x where x.target = r.target)
      from public.people_reports r
      left join public.profiles t on t.id = r.target
      left join public.profiles p on p.id = r.reporter
     where p_all or r.handled_at is null
     order by r.handled_at nulls first, r.created_at desc
     limit 200;
end $$;
revoke all on function public.admin_people_reports(boolean) from public, anon;
grant execute on function public.admin_people_reports(boolean) to authenticated;


-- ── 2. 비공개로 잠그기 ───────────────────────────────────────────────────
alter table public.profiles add column if not exists locked boolean not null default false;
comment on column public.profiles.locked is
  '비공개로 잠그기(b789). 켜면 팔로워에게도 안 보이고 새 팔로우를 못 받음. 팔로우 관계는 그대로';

-- 2-1. 알맹이를 볼 수 있나 — 잠겼으면 본인만
create or replace function public.can_see_person(p_viewer uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_viewer is not null and p_user is not null and (
           p_viewer = p_user
           or (exists (select 1 from public.follows
                        where follower = p_viewer and followee = p_user and status = 'accepted')
               and not public.blocked_between(p_viewer, p_user)
               and not coalesce((select locked from public.profiles where id = p_user), false)));
$$;
revoke all on function public.can_see_person(uuid, uuid) from public, anon, authenticated;

-- 2-2. 머리 — 잠겼으면 남에게는 이름·사진·잠김만(수·함께 아는 사람 숨김)
create or replace function public.person_head(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); p record; 나 text; 너 text; 잠김 boolean;
begin
  if me is null then raise exception '로그인이 필요합니다'; end if;
  if p_user is null then return null; end if;
  if p_user <> me and public.blocked_between(me, p_user) then return null; end if;
  select id, display_name, avatar_url, follow_mode, locked into p from public.profiles where id = p_user;
  if not found then return null; end if;
  잠김 := coalesce(p.locked, false) and p_user <> me;     -- 남이 볼 때만 잠김
  select status into 나 from public.follows where follower = me and followee = p_user;
  select status into 너 from public.follows where follower = p_user and followee = me;
  return jsonb_build_object(
    'id', p.id, 'name', p.display_name, 'avatar_url', p.avatar_url,
    'follow_mode', p.follow_mode,
    'locked', coalesce(p.locked, false),
    'followers', case when 잠김 then null else
                   (select count(*) from public.follows where followee = p_user and status = 'accepted') end,
    'following', case when 잠김 then null else
                   (select count(*) from public.follows where follower = p_user and status = 'accepted') end,
    'mine', 나, 'theirs', 너,
    'self', p_user = me,
    'can_see', p_user = me or (coalesce(나 = 'accepted', false) and not 잠김),
    -- 함께 아는 사람: 내가 팔로우하는 사람 중 그 사람을 팔로우하는 사람
    'mutual', case when 잠김 then 0 else
                (select count(*) from public.follows a
                   join public.follows b on b.follower = a.followee
                  where a.follower = me and a.status = 'accepted'
                    and b.followee = p_user and b.status = 'accepted'
                    and a.followee <> p_user) end,
    'requests', case when p_user = me then
                  (select count(*) from public.follows where followee = me and status = 'requested') end
  );
end $$;
revoke all on function public.person_head(uuid) from public, anon;
grant execute on function public.person_head(uuid) to authenticated;

-- 2-3. 이름으로 찾기 — 잠긴 사람은 안 나옴(101 의 처음 이름 빼기도 그대로)
create or replace function public.people_find(p_name text)
returns table (user_id uuid, name text, avatar_url text, mine text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar_url,
         (select f.status from public.follows f where f.follower = auth.uid() and f.followee = p.id)
    from public.profiles p
   where auth.uid() is not null
     and public.name_key(p_name) is not null
     and public.name_key(p.display_name) = public.name_key(p_name)
     and not public.blocked_between(auth.uid(), p.id)
     and not coalesce(p.locked, false)
     -- ⚠ 처음 이름(메일 앞부분)은 찾기에서 뺍니다(101 머리말).
     and not exists (select 1 from auth.users u
                      where u.id = p.id
                        and public.name_key(split_part(u.email, '@', 1)) = public.name_key(p.display_name))
   limit 5;
$$;
revoke all on function public.people_find(text) from public, anon;
grant execute on function public.people_find(text) to authenticated;

-- 2-4. 팔로우(요청) — 잠긴 사람에게는 새로 못 함. 이미 한 것은 그대로 돌려줌
create or replace function public.follow_ask(p_user uuid)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); 방식 text; 잠김 boolean; 상태 text; 이미 text; 이름 text;
begin
  if me is null then raise exception '로그인이 필요합니다'; end if;
  if p_user is null or p_user = me then raise exception '자기 자신은 팔로우할 수 없어요'; end if;
  if public.blocked_between(me, p_user) then raise exception '팔로우할 수 없는 사람이에요'; end if;
  select follow_mode, coalesce(locked, false) into 방식, 잠김 from public.profiles where id = p_user;
  if not found then raise exception '없는 사람이에요'; end if;
  select status into 이미 from public.follows where follower = me and followee = p_user;
  if 이미 is not null then return 이미; end if;
  if 잠김 then raise exception '비공개 계정이라 지금은 팔로우할 수 없어요'; end if;
  if (select count(*) from public.follows
       where follower = me and created_at > now() - interval '1 day') >= 100 then
    raise exception '오늘은 팔로우를 너무 많이 했어요. 내일 다시 해 주세요';
  end if;
  상태 := case when 방식 = 'anyone' then 'accepted' else 'requested' end;
  insert into public.follows (follower, followee, status, accepted_at)
  values (me, p_user, 상태, case when 상태 = 'accepted' then now() end)
  on conflict do nothing;
  -- 같은 사람에게 하루에 한 번만(팔로우를 껐다 켰다 해도 알림이 쌓이지 않게)
  if not exists (select 1 from public.notifications
                  where user_id = p_user and actor_id = me
                    and kind in ('follow_request', 'follow_new')
                    and created_at > now() - interval '1 day') then
    select coalesce(display_name, '누군가') into 이름 from public.profiles where id = me;
    perform public.notify_user(p_user,
      case when 상태 = 'accepted' then 'follow_new' else 'follow_request' end,
      이름 || case when 상태 = 'accepted' then '님이 나를 팔로우하기 시작했어요'
                 else '님이 팔로우를 요청했어요' end,
      me);
  end if;
  return 상태;
end $$;
revoke all on function public.follow_ask(uuid) from public, anon;
grant execute on function public.follow_ask(uuid) to authenticated;

-- 2-5. 친구 소식 — 잠긴 사람 것은 안 나옴
create or replace function public.friend_feed(p_before timestamptz default null, p_limit int default 60)
returns table (user_id uuid, name text, avatar_url text, kind text,
               city_id text, stars numeric, comment text, at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.user_id, p.display_name, p.avatar_url, a.kind, a.city_id,
         case when coalesce(p.show_stars, true) then a.stars end,
         a.comment, a.created_at
    from public.activity a
    join public.follows f
      on f.followee = a.user_id and f.follower = auth.uid() and f.status = 'accepted'
    join public.profiles p on p.id = a.user_id
   where auth.uid() is not null
     and a.created_at < coalesce(p_before, now() + interval '1 minute')
     and not public.blocked_between(auth.uid(), a.user_id)
     and not coalesce(p.locked, false)
   order by a.created_at desc
   limit least(greatest(coalesce(p_limit, 60), 1), 200);
$$;
revoke all on function public.friend_feed(timestamptz, int) from public, anon;
grant execute on function public.friend_feed(timestamptz, int) to authenticated;

-- 2-6. 도시 화면의 「팔로우하는 사람들」 — 잠긴 사람은 안 나옴
create or replace function public.city_friends(p_city text)
returns table (user_id uuid, name text, avatar_url text, stars numeric, comment text)
language sql stable security definer set search_path = public as $$
  select f.followee, p.display_name, p.avatar_url,
         case when coalesce(p.show_stars, true) then r.stars end,
         nullif(btrim(r.comment), '')
    from public.follows f
    join public.profiles p on p.id = f.followee
    left join public.city_ratings r on r.user_id = f.followee and r.city_id = p_city
   where auth.uid() is not null
     and f.follower = auth.uid() and f.status = 'accepted'
     and not public.blocked_between(auth.uid(), f.followee)
     and not coalesce(p.locked, false)
     and (r.stars is not null
          or nullif(btrim(r.comment), '') is not null
          or exists (select 1 from public.visited_of(f.followee) v where v.city_id = p_city))
   order by r.stars desc nulls last, p.display_name;
$$;
revoke all on function public.city_friends(text) from public, anon;
grant execute on function public.city_friends(text) to authenticated;


-- ── 확인 ─────────────────────────────────────────────────────────────
select 1 as 순서, 'admin_people_reports 함수(true 여야)' as 항목,
       (to_regproc('public.admin_people_reports') is not null)::text as 값
union all
select 2, '잠금 칸 profiles.locked(true 여야)',
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'profiles'
                  and column_name = 'locked')::text
union all
select 3, '지금 잠근 사람 수(처음엔 0)',
       (select count(*) from public.profiles where locked)::text
union all
select 4, '아직 처리 안 한 사람 신고 수',
       (select count(*) from public.people_reports where handled_at is null)::text
order by 1;
