-- =====================================================================
-- 106 · 공개 범위 세 가지 — 공개 계정 · 비공개 계정 · 비활성화 (b799)
--
-- 사용자(2026-09-29): 「인스타처럼 공개 구분을 바꾸려고 하는데 모두에게보이기(공개 계정) /
--   맞팔끼리만 보이기(비공개 계정) / 비활성화(누구에게도 안보임, 기로 앱은 사용가능) 어때」
--   → 시안을 보고 고른 것: 비공개 = **승인한 팔로워**(인스타 비공개와 같음 — 맞팔이 아님),
--     비활성화하면 도시 화면의 한줄평도 **숨기기**.
--
-- 옛 방식(101·102)            →  새 방식(profiles.visibility)
--   follow_mode 'approve'      →  'private' 비공개 계정(기본) — 내가 승인한 팔로워만
--   follow_mode 'anyone'       →  'private' ⚠ 공개로 옮기지 «않습니다»(바로 아래)
--   locked = true              →  'off'     비활성화
--   (새것)                     →  'public'  공개 계정 — 로그인한 누구나. 팔로우는 승인 없이 바로
-- ⚠ 「누구나 바로」(anyone)는 «팔로우하면» 보이는 것이었습니다. 새 「공개」는 팔로우를 안 해도
--   보입니다 — 전보다 넓게 보이므로 옛 선택을 그 동의로 칠 수 없습니다. 비공개로 두고 본인이
--   다시 고르게 합니다(방침 16조 「동의를 받기 전에는 그 처리를 시작하지 않습니다」).
--
-- 누가 무엇을 보나
--                               공개              비공개              비활성화
--   알맹이(지구본·기록·성향)    로그인한 누구나   승인한 팔로워        아무도(팔로워도)
--   머리(이름·사진·소개·수)     로그인한 누구나   로그인한 누구나      이름·사진만 + 「비활성화」
--   이름 찾기 · 프로필 링크     나옴              나옴                 안 나옴
--   소식 · 도시 「팔로우하는 사람들」 팔로워에게  팔로워에게           안 나옴
--   도시 화면 한줄평            누구나            누구나               안 나옴(사용자 결정)
--   남의 팔로워·팔로잉 목록과 수 나옴             나옴                 빠짐(인스타와 같음)
--   새 팔로우                   바로 수락         요청 → 내가 승인      못 받고 · 못 겁니다
-- ⚠ 비활성화해도 «내가» 남을 보는 것은 그대로입니다 — 팔로우 관계를 안 지웁니다. 끄면 원래대로.
--   다만 새로 팔로우를 «거는» 것은 막습니다 — 걸면 상대 알림에 내 이름이 뜹니다.
-- ⚠ 일행(같은 여행)은 그대로 이름·사진을 봅니다 — 여행을 같이 쓰려면 필요합니다(001 의 공유 정책).
-- ⚠ 도시 평균 별점에는 그대로 들어갑니다 — 누가 매겼는지 안 나오는 합계입니다.
-- ⚠ 공개로 바꾸면 **기다리던 팔로우 요청을 모두 수락합니다**(인스타와 같음) — 공개 계정은
--   요청 없이 바로 팔로우되는 곳이라, 남은 요청만 「요청됨」으로 걸려 있으면 어긋납니다.
--
-- ⚠ 옛 칸(follow_mode · locked)은 **지우지 않고 visibility 를 따라가게** 둡니다(아래 2).
--   앱이 새로 뜨기 전의 폰(b798 이하)이 그 칸을 읽고 씁니다 — 옛 판에서 「비공개로 잠그기」를
--   켜면 비활성화로, 끄면 비공개로 옮겨 적습니다.
-- ⚠⚠ 102·103 의 함수 본문을 옮기고 거르는 줄만 바꿨습니다. **102·103 을 다시 돌리면 옛 규칙으로
--   돌아갑니다** — 돌렸으면 이 파일을 다시 돌리십시오. 앞으로 이 함수들을 고칠 때는 여기를 고칩니다.
--
-- 103 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================


-- ── 1. 칸 ───────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists visibility text not null default 'private';
do $$ begin
  alter table public.profiles add constraint profiles_visibility_chk
    check (visibility in ('public', 'private', 'off'));
exception when duplicate_object then null; end $$;
comment on column public.profiles.visibility is
  '공개 범위(b799): public 공개 계정 · private 비공개 계정(기본, 승인한 팔로워만) · off 비활성화. '
  '옛 locked · follow_mode 는 이 칸을 따라갑니다(트리거 profiles_visibility_sync)';

-- 잠갔던 사람 → 비활성화. (두 번째부터는 locked 가 이미 visibility 를 따르므로 바뀌는 줄이 없습니다)
update public.profiles set visibility = 'off'
 where coalesce(locked, false) and visibility <> 'off';


-- ── 2. 옛 칸이 새 칸을 따라가게 ──────────────────────────────────────────
-- 새 앱은 visibility 만 씁니다. 옛 앱은 locked 만 씁니다(follow_mode 는 아래 이유로 무시).
create or replace function public.profiles_visibility_sync()
returns trigger language plpgsql set search_path = public as $$
begin
  -- ⚠ 두 겹 if 입니다 — 한 줄 `and` 로 쓰면 INSERT 때도 old 를 읽을 수 있습니다(평가 순서는 보장 안 됨).
  if tg_op = 'UPDATE' then
    if new.visibility is not distinct from old.visibility
       and new.locked is distinct from old.locked then
      -- 옛 판이 「비공개로 잠그기」를 눌렀습니다
      new.visibility := case when coalesce(new.locked, false) then 'off' else 'private' end;
    end if;
  end if;
  -- ⚠ 옛 판의 「누구나 바로」(follow_mode='anyone')는 옮기지 않습니다 — 공개와 뜻이 달라서(머리말).
  new.locked := new.visibility = 'off';
  new.follow_mode := case when new.visibility = 'public' then 'anyone' else 'approve' end;
  return new;
end $$;
drop trigger if exists profiles_visibility_sync on public.profiles;
create trigger profiles_visibility_sync
  before insert or update on public.profiles
  for each row execute function public.profiles_visibility_sync();

-- 지금 있는 줄도 한 번 맞춥니다(위 트리거가 돌며 locked · follow_mode 를 고칩니다).
update public.profiles
   set visibility = visibility
 where locked is distinct from (visibility = 'off')
    or follow_mode is distinct from (case when visibility = 'public' then 'anyone' else 'approve' end);


-- ── 3. 공개로 바꾸면 기다리던 요청을 수락 ────────────────────────────────
-- 알림은 안 보냅니다 — 한꺼번에 수십 개가 갈 수 있습니다. 내 종의 「요청」 알림은 읽음으로.
create or replace function public.profiles_went_public()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.visibility = 'public' and old.visibility is distinct from 'public' then
    update public.follows set status = 'accepted', accepted_at = now()
     where followee = new.id and status = 'requested';
    update public.notifications set read_at = now()
     where user_id = new.id and kind = 'follow_request' and read_at is null;
  end if;
  return null;
end $$;
revoke all on function public.profiles_went_public() from public, anon, authenticated;
drop trigger if exists profiles_went_public on public.profiles;
create trigger profiles_went_public
  after update of visibility on public.profiles
  for each row execute function public.profiles_went_public();


-- ── 4. 알맹이를 볼 수 있나 ───────────────────────────────────────────────
-- 나 자신 · 공개 계정(막힘 없으면 누구나) · 비공개 계정의 승인된 팔로워. 비활성화는 본인만.
create or replace function public.can_see_person(p_viewer uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_viewer is not null and p_user is not null and (
           p_viewer = p_user
           or (not public.blocked_between(p_viewer, p_user)
               and case coalesce((select visibility from public.profiles where id = p_user), 'private')
                     when 'public'  then true
                     when 'private' then exists (select 1 from public.follows
                                                  where follower = p_viewer and followee = p_user
                                                    and status = 'accepted')
                     else false end));
$$;
revoke all on function public.can_see_person(uuid, uuid) from public, anon, authenticated;


-- ── 5. 머리 ─────────────────────────────────────────────────────────────
-- 103 의 본문에서: 잠김 → 비활성화(visibility='off'), can_see 는 can_see_person 하나로,
-- 수·함께 아는 사람·받은 요청에서 비활성화한 사람을 뺍니다(목록 follow_people 과 같은 수).
-- ⚠ 옛 판이 읽는 두 칸(follow_mode · locked)도 계속 보냅니다.
create or replace function public.person_head(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); p record; 나 text; 너 text; 꺼짐 boolean;
begin
  if me is null then raise exception '로그인이 필요합니다'; end if;
  if p_user is null then return null; end if;
  if p_user <> me and public.blocked_between(me, p_user) then return null; end if;
  select id, display_name, avatar_url, visibility, bio into p
    from public.profiles where id = p_user;
  if not found then return null; end if;
  꺼짐 := p.visibility = 'off' and p_user <> me;      -- 남이 볼 때만
  select status into 나 from public.follows where follower = me and followee = p_user;
  select status into 너 from public.follows where follower = p_user and followee = me;
  return jsonb_build_object(
    'id', p.id, 'name', p.display_name, 'avatar_url', p.avatar_url,
    'bio', case when 꺼짐 then null else nullif(btrim(p.bio), '') end,
    'visibility', p.visibility,
    'follow_mode', case when p.visibility = 'public' then 'anyone' else 'approve' end,
    'locked', p.visibility = 'off',
    'followers', case when 꺼짐 then null else
                   (select count(*) from public.follows f join public.profiles q on q.id = f.follower
                     where f.followee = p_user and f.status = 'accepted'
                       and (q.visibility <> 'off' or q.id = me)) end,
    'following', case when 꺼짐 then null else
                   (select count(*) from public.follows f join public.profiles q on q.id = f.followee
                     where f.follower = p_user and f.status = 'accepted'
                       and (q.visibility <> 'off' or q.id = me)) end,
    'mine', 나, 'theirs', 너,
    'self', p_user = me,
    'can_see', public.can_see_person(me, p_user),
    -- 함께 아는 사람: 내가 팔로우하는 사람 중 그 사람을 팔로우하는 사람
    'mutual', case when 꺼짐 then 0 else
                (select count(*) from public.follows a
                   join public.follows b on b.follower = a.followee
                   join public.profiles q on q.id = a.followee
                  where a.follower = me and a.status = 'accepted'
                    and b.followee = p_user and b.status = 'accepted'
                    and a.followee <> p_user and q.visibility <> 'off') end,
    'requests', case when p_user = me then
                  (select count(*) from public.follows f join public.profiles q on q.id = f.follower
                    where f.followee = me and f.status = 'requested' and q.visibility <> 'off') end
  );
end $$;
revoke all on function public.person_head(uuid) from public, anon;
grant execute on function public.person_head(uuid) to authenticated;


-- ── 6. 이름으로 찾기 — 비활성화는 안 나옴(101 의 처음 이름 빼기도 그대로) ──
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
     and p.visibility <> 'off'
     -- ⚠ 처음 이름(메일 앞부분)은 찾기에서 뺍니다(101 머리말).
     and not exists (select 1 from auth.users u
                      where u.id = p.id
                        and public.name_key(split_part(u.email, '@', 1)) = public.name_key(p.display_name))
   limit 5;
$$;
revoke all on function public.people_find(text) from public, anon;
grant execute on function public.people_find(text) to authenticated;


-- ── 7. 프로필 링크 → 사람 — 비활성화는 안 나옴(본인 링크는 본인에게 열림) ──
create or replace function public.person_by_link(p_code text)
returns uuid language sql stable security definer set search_path = public as $$
  select p.id from public.profiles p
   where auth.uid() is not null
     and p.link_code = upper(btrim(p_code))
     and not public.blocked_between(auth.uid(), p.id)
     and (p.visibility <> 'off' or p.id = auth.uid());
$$;
revoke all on function public.person_by_link(text) from public, anon;
grant execute on function public.person_by_link(text) to authenticated;


-- ── 8. 팔로우(요청) — 공개면 바로 수락, 비공개면 요청, 비활성화는 못 받음 ──
-- 비활성화한 사람은 새로 «걸» 수도 없습니다(머리말). 이미 한 것은 그대로 돌려줍니다.
create or replace function public.follow_ask(p_user uuid)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); 범위 text; 상태 text; 이미 text; 이름 text;
begin
  if me is null then raise exception '로그인이 필요합니다'; end if;
  if p_user is null or p_user = me then raise exception '자기 자신은 팔로우할 수 없어요'; end if;
  if public.blocked_between(me, p_user) then raise exception '팔로우할 수 없는 사람이에요'; end if;
  select visibility into 범위 from public.profiles where id = p_user;
  if not found then raise exception '없는 사람이에요'; end if;
  select status into 이미 from public.follows where follower = me and followee = p_user;
  if 이미 is not null then return 이미; end if;
  if 범위 = 'off' then raise exception '비활성화된 계정이라 팔로우할 수 없어요'; end if;
  if coalesce((select visibility from public.profiles where id = me), 'private') = 'off' then
    raise exception '비활성화 중에는 팔로우할 수 없어요. 설정 › 공개 범위에서 바꿀 수 있어요';
  end if;
  if (select count(*) from public.follows
       where follower = me and created_at > now() - interval '1 day') >= 100 then
    raise exception '오늘은 팔로우를 너무 많이 했어요. 내일 다시 해 주세요';
  end if;
  상태 := case when 범위 = 'public' then 'accepted' else 'requested' end;
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


-- ── 9. 내 목록 — 비활성화한 사람은 빠집니다(수와 같게) ─────────────────────
create or replace function public.follow_people(p_kind text)
returns table (user_id uuid, name text, avatar_url text, status text, at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar_url, f.status, coalesce(f.accepted_at, f.created_at)
    from public.follows f
    join public.profiles p
      on p.id = case when p_kind in ('following', 'sent') then f.followee else f.follower end
   where auth.uid() is not null
     and p.visibility <> 'off'
     and ((p_kind = 'following' and f.follower = auth.uid() and f.status = 'accepted')
       or (p_kind = 'sent'      and f.follower = auth.uid() and f.status = 'requested')
       or (p_kind = 'followers' and f.followee = auth.uid() and f.status = 'accepted')
       or (p_kind = 'requests'  and f.followee = auth.uid() and f.status = 'requested'))
   order by 5 desc;
$$;
revoke all on function public.follow_people(text) from public, anon;
grant execute on function public.follow_people(text) to authenticated;


-- ── 10. 친구 소식 — 비활성화한 사람 것은 안 나옴 ──────────────────────────
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
     and p.visibility <> 'off'
   order by a.created_at desc
   limit least(greatest(coalesce(p_limit, 60), 1), 200);
$$;
revoke all on function public.friend_feed(timestamptz, int) from public, anon;
grant execute on function public.friend_feed(timestamptz, int) to authenticated;


-- ── 11. 도시 화면의 「팔로우하는 사람들」 — 비활성화한 사람은 안 나옴 ─────────
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
     and p.visibility <> 'off'
     and (r.stars is not null
          or nullif(btrim(r.comment), '') is not null
          or exists (select 1 from public.visited_of(f.followee) v where v.city_id = p_city))
   order by r.stars desc nulls last, p.display_name;
$$;
revoke all on function public.city_friends(text) from public, anon;
grant execute on function public.city_friends(text) to authenticated;


-- ── 12. 도시 화면 한줄평 — 비활성화한 사람 것은 숨김(사용자 결정). 내 것은 나에게 보임 ──
-- ⚠ 101 과 같이 로그인 안 한 사람(anon)도 부릅니다 — 그대로 둡니다.
create or replace function public.city_comments(p_city text)
returns table (
  user_id     uuid,
  name        text,
  avatar_url  text,
  stars       numeric,
  comment     text,
  created_at  timestamptz
)
language sql stable security definer set search_path = public as $$
  select r.user_id,
         coalesce(p.display_name, '여행자'),     -- b799: 「이름 없음」 → 「여행자」(사용자 결정)
         p.avatar_url,
         r.stars,
         r.comment,
         r.updated_at
    from public.city_ratings r
    left join public.profiles p on p.id = r.user_id
   where r.city_id = p_city
     and r.comment is not null
     and length(btrim(r.comment)) > 0
     and (auth.uid() is null or not public.blocked_between(auth.uid(), r.user_id))
     and (p.visibility is distinct from 'off' or r.user_id = auth.uid())
   order by r.updated_at desc
   limit 50;
$$;
grant execute on function public.city_comments(text) to anon, authenticated;


-- ── 확인 ─────────────────────────────────────────────────────────────
-- 기대값: 1·2·3·4·5 는 true. 6 은 공개 범위별 사람 수(처음엔 공개 0 — 아무도 안 골랐으므로).
select 1 as 순서, '공개 범위 칸 profiles.visibility(true 여야)' as 항목,
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'profiles'
                  and column_name = 'visibility')::text as 값
union all
select 2, '옛 칸이 새 칸을 따름 — 어긋난 줄 0(true 여야)',
       (not exists (select 1 from public.profiles
                     where locked is distinct from (visibility = 'off')
                        or follow_mode is distinct from
                           (case when visibility = 'public' then 'anyone' else 'approve' end)))::text
union all
select 3, '트리거 둘(true 여야)',
       ((select count(*) from pg_trigger
          where tgname in ('profiles_visibility_sync', 'profiles_went_public')
            and not tgisinternal) = 2)::text
union all
select 4, '보이나 판단이 새 칸을 봄(true 여야)',
       (pg_get_functiondef('public.can_see_person(uuid, uuid)'::regprocedure) like '%visibility%')::text
union all
select 5, '한줄평·소식·찾기·링크·목록이 비활성화를 거름(true 여야)',
       (pg_get_functiondef('public.city_comments(text)'::regprocedure) like '%visibility%'
        and pg_get_functiondef('public.friend_feed(timestamptz, integer)'::regprocedure) like '%visibility%'
        and pg_get_functiondef('public.people_find(text)'::regprocedure) like '%visibility%'
        and pg_get_functiondef('public.person_by_link(text)'::regprocedure) like '%visibility%'
        and pg_get_functiondef('public.follow_people(text)'::regprocedure) like '%visibility%'
        and pg_get_functiondef('public.city_friends(text)'::regprocedure) like '%visibility%'
        and pg_get_functiondef('public.follow_ask(uuid)'::regprocedure) like '%visibility%')::text
union all
select 6, '공개 범위별 사람 수',
       (select string_agg(visibility || ' ' || n, ' · ' order by visibility)
          from (select visibility, count(*) n from public.profiles group by 1) x)
order by 1;
