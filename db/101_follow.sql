-- =====================================================================
-- 101 · 팔로우(승인제) · 차단 · 사람 신고 · 친구 소식 · 공개 설정 (b789)
--
-- 사용자 결정(2026-09-28): 「사람들 유입되기 전에 기능은 다 만들어 놔야지」 ·
-- 「다른 어플들 벤치마크해서 제대로 미리 만들어 놓자」 → 설계안 확인 후 「진행해」.
--
-- 벤치마크에서 가져온 것(조사 2026-09-28)
--   · 한쪽 팔로우 + **승인제가 기본**(Polarsteps — 2026-09-04 자동 승인 계정을 통한
--     대량 수집 사고 뒤 전원 승인제로 바꿈). 「누구나」도 고를 수 있습니다.
--   · 모르는 사람에게는 얇은 머리(사진·이름·수)만, 지구본·별점 같은 알맹이는
--     **승인된 팔로워만**(Polarsteps·Strava).
--   · 도시 화면에 팔로우한 사람들의 별점·한줄평(Letterboxd·Beli 「친구 점수」).
--   · 차단은 조용히 · 서로 안 보이게 · 팔로우 양쪽 해제(왓챠·Letterboxd).
--
-- 동의: 팔로우를 «승인»하는 것이 곧 그 사람에게 보여 주겠다는 동의입니다
--   (개인정보처리방침 16조 「동의를 받기 전에는 그 처리를 시작하지 않습니다」와 맞음).
--   「누구나」는 본인이 설정에서 고를 때만 — 그것도 본인의 선택입니다.
--
-- ⚠ 남의 기록은 전부 RLS 로 본인만 읽힙니다. 공개는 **아래 함수들만** 합니다 —
--   고른 칸만 내보냅니다. 일기(journal·journal_photo·journal_photos)·가고 싶은 곳(want)·
--   AI 대화는 **어떤 함수도 내보내지 않습니다.**
-- ⚠ 소식은 city_ratings.updated_at 으로 만들면 안 됩니다 — 비공개 일기를 고쳐도
--   그 값이 움직입니다. 그래서 따로 적는 표(activity)를 둡니다(별점·한줄평이 바뀔 때만).
-- ⚠ 알림을 만드는 notify_members 가 누구나 부를 수 있게 열려 있었습니다(035 에 grant·
--   revoke 가 없음) — 아무 여행 id 로 가짜 알림을 넣을 수 있었습니다. 여기서 막습니다.
--   트리거(security definer)에서만 부르므로 앱은 그대로 돕니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================


-- ── 1. 공개 설정(프로필) ───────────────────────────────────────────────
-- follow_mode: approve(내가 승인한 사람만 · 기본) | anyone(누구나 바로)
-- show_stars : 팔로워에게 별점 숫자를 보일까(기본 보임 — 가 본 도시·한줄평은 늘 보임)
-- persona    : 성향 코드(앱이 계산해 적음). 남의 궁합·성향에 씁니다.
-- link_code  : 「내 프로필 링크」의 열쇠. 새로 만들면 예전 링크는 죽습니다.
alter table public.profiles add column if not exists follow_mode text not null default 'approve';
do $$ begin
  alter table public.profiles add constraint profiles_follow_mode_chk
    check (follow_mode in ('approve', 'anyone'));
exception when duplicate_object then null; end $$;
alter table public.profiles add column if not exists show_stars boolean not null default true;
alter table public.profiles add column if not exists persona text;
do $$ begin
  alter table public.profiles add constraint profiles_persona_chk
    check (persona is null or persona ~ '^[FH][ML][ND][GP]$');
exception when duplicate_object then null; end $$;
alter table public.profiles add column if not exists link_code text default public.gen_token(8);
update public.profiles set link_code = public.gen_token(8) where link_code is null;
create unique index if not exists profiles_link_code_uniq on public.profiles (link_code);

-- 알림 스위치 하나(팔로우 요청·수락·새 팔로워)
alter table public.user_prefs add column if not exists notify_social boolean not null default true;


-- ── 2. 표 넷 ───────────────────────────────────────────────────────────
create table if not exists public.follows (
  follower    uuid not null references auth.users (id) on delete cascade,
  followee    uuid not null references auth.users (id) on delete cascade,
  status      text not null default 'requested' check (status in ('requested', 'accepted')),
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (follower, followee),
  check (follower <> followee)
);
create index if not exists follows_followee_idx on public.follows (followee, status);
alter table public.follows enable row level security;
-- 내가 한 쪽인 줄만 봅니다. 쓰기는 아래 함수만 합니다(쓰기 정책 없음).
drop policy if exists follows_see on public.follows;
create policy follows_see on public.follows
  for select using (follower = auth.uid() or followee = auth.uid());

create table if not exists public.blocks (
  blocker    uuid not null references auth.users (id) on delete cascade,
  blocked    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create index if not exists blocks_blocked_idx on public.blocks (blocked);
alter table public.blocks enable row level security;
drop policy if exists blocks_see on public.blocks;
create policy blocks_see on public.blocks for select using (blocker = auth.uid());

-- 사람 신고(040 의 reports 는 앱 버그·의견입니다 — 따로 둡니다)
create table if not exists public.people_reports (
  id          bigint generated always as identity primary key,
  reporter    uuid not null references auth.users (id) on delete cascade,
  target      uuid not null references auth.users (id) on delete cascade,
  reason      text not null check (reason in ('사칭', '욕설·괴롭힘', '스팸·광고', '부적절한 사진·이름', '기타')),
  detail      text check (detail is null or char_length(detail) <= 500),
  created_at  timestamptz not null default now(),
  handled_at  timestamptz
);
alter table public.people_reports enable row level security;
drop policy if exists preports_see on public.people_reports;
create policy preports_see on public.people_reports
  for select using (reporter = auth.uid() or public.is_admin());
drop policy if exists preports_admin on public.people_reports;
create policy preports_admin on public.people_reports
  for update using (public.is_admin()) with check (public.is_admin());

-- 친구 소식(별점을 매기거나 바꾼 것 · 한줄평을 쓴 것만)
create table if not exists public.activity (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('rate', 'comment')),
  city_id    text not null references public.cities (id) on delete cascade,
  stars      numeric(2,1),
  comment    text,
  created_at timestamptz not null default now()
);
create index if not exists activity_user_time_idx on public.activity (user_id, created_at desc);
alter table public.activity enable row level security;
drop policy if exists activity_see on public.activity;
create policy activity_see on public.activity for select using (user_id = auth.uid());


-- ── 3. 안에서만 쓰는 도우미(앱에서 못 부름) ───────────────────────────────
-- 둘 중 누가 누구를 막았나(어느 쪽이든)
create or replace function public.blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks
                  where (blocker = a and blocked = b) or (blocker = b and blocked = a));
$$;
revoke all on function public.blocked_between(uuid, uuid) from public, anon, authenticated;

-- 알맹이를 볼 수 있나: 나 자신이거나, 승인된 팔로워이고 막힘이 없을 때
create or replace function public.can_see_person(p_viewer uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_viewer is not null and p_user is not null and (
           p_viewer = p_user
           or (exists (select 1 from public.follows
                        where follower = p_viewer and followee = p_user and status = 'accepted')
               and not public.blocked_between(p_viewer, p_user)));
$$;
revoke all on function public.can_see_person(uuid, uuid) from public, anon, authenticated;

-- 그 사람이 다녀온 도시 — 014 의 my_visited 와 같은 식(auth.uid() 대신 p_user)
create or replace function public.visited_of(p_user uuid)
returns table (city_id text)
language sql stable security definer set search_path = public as $$
  select l.city_id
    from public.trip_legs l
    join public.trips t        on t.id = l.trip_id
    join public.trip_members m on m.trip_id = t.id
   where m.user_id = p_user and m.left_at is null
     and t.end_date < current_date
     and l.city_id is not null
  union
  select r.city_id
    from public.city_ratings r
   where r.user_id = p_user and r.stars is not null;
$$;
revoke all on function public.visited_of(uuid) from public, anon, authenticated;

-- 알림 받을 사람인지 — 035 에 팔로우 갈래를 더합니다
create or replace function public.notify_wants(p_user uuid, p_kind text)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
             when not p.notify_all then false
             when p_kind = 'expense_added'            then p.notify_expense
             when p_kind in ('member_joined','joined') then p.notify_member
             when p_kind = 'depart_soon'              then p.notify_depart
             when p_kind in ('follow_request','follow_new','follow_accepted')
                                                       then p.notify_social
             else true
           end
      from public.user_prefs p
     where p.user_id = p_user
  ), true);
$$;

-- 한 사람에게 알림 하나(여행과 무관한 것)
create or replace function public.notify_user(p_user uuid, p_kind text, p_body text, p_actor uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_user = p_actor then return; end if;
  if not public.notify_wants(p_user, p_kind) then return; end if;
  insert into public.notifications (user_id, trip_id, kind, body, actor_id)
  values (p_user, null, p_kind, p_body, p_actor);
end $$;
revoke all on function public.notify_user(uuid, text, text, uuid) from public, anon, authenticated;

-- ⚠ 구멍 막기 — 트리거(security definer) 안에서만 부릅니다
revoke execute on function public.notify_members(uuid, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.notify_wants(uuid, text) from public, anon, authenticated;


-- ── 4. 소식 적기(트리거) ─────────────────────────────────────────────────
-- ⚠ 별점·한줄평이 «바뀔 때만». 일기·방문 날짜·가고 싶은 곳을 고쳐도 안 적습니다.
-- ⚠ 같은 도시를 10분 안에 또 고치면 새 줄 대신 그 줄을 고칩니다(별을 몇 번 눌러 보는 사람).
-- ⚠ 별을 지우면(안 매김) 그 도시의 별 소식도, 한줄평을 지우면 그 소식도 지웁니다.
create or replace function public.activity_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare 별바뀜 boolean; 평바뀜 boolean; 새평 text;
begin
  if tg_op = 'DELETE' then
    delete from public.activity where user_id = old.user_id and city_id = old.city_id;
    return old;
  end if;
  새평 := nullif(btrim(new.comment), '');
  if tg_op = 'INSERT' then
    별바뀜 := new.stars is not null;
    평바뀜 := 새평 is not null;
  else
    별바뀜 := new.stars is distinct from old.stars;
    평바뀜 := 새평 is distinct from nullif(btrim(old.comment), '');
  end if;
  if not 별바뀜 and not 평바뀜 then return new; end if;

  if 별바뀜 and new.stars is null then
    delete from public.activity where user_id = new.user_id and city_id = new.city_id and kind = 'rate';
  elsif 별바뀜 then
    update public.activity set stars = new.stars, created_at = now()
     where id = (select id from public.activity
                  where user_id = new.user_id and city_id = new.city_id and kind = 'rate'
                    and created_at > now() - interval '10 minutes'
                  order by created_at desc limit 1);
    if not found then
      insert into public.activity (user_id, kind, city_id, stars)
      values (new.user_id, 'rate', new.city_id, new.stars);
    end if;
  end if;

  if 평바뀜 and 새평 is null then
    delete from public.activity where user_id = new.user_id and city_id = new.city_id and kind = 'comment';
  elsif 평바뀜 then
    update public.activity set comment = left(새평, 200), stars = new.stars, created_at = now()
     where id = (select id from public.activity
                  where user_id = new.user_id and city_id = new.city_id and kind = 'comment'
                    and created_at > now() - interval '10 minutes'
                  order by created_at desc limit 1);
    if not found then
      insert into public.activity (user_id, kind, city_id, stars, comment)
      values (new.user_id, 'comment', new.city_id, new.stars, left(새평, 200));
    end if;
  end if;
  return new;
end $$;
drop trigger if exists city_ratings_activity on public.city_ratings;
create trigger city_ratings_activity
  after insert or update of stars, comment or delete on public.city_ratings
  for each row execute function public.activity_log();

-- 처음 한 번 — 지금까지의 별점·한줄평을 소식으로(매긴 «처음» 시각으로).
-- ⚠ updated_at 을 쓰지 않습니다(위 머리말: 일기를 고쳐도 움직입니다).
insert into public.activity (user_id, kind, city_id, stars, created_at)
select r.user_id, 'rate', r.city_id, r.stars, r.created_at
  from public.city_ratings r
 where r.stars is not null
   and not exists (select 1 from public.activity a
                    where a.user_id = r.user_id and a.city_id = r.city_id and a.kind = 'rate');
insert into public.activity (user_id, kind, city_id, stars, comment, created_at)
select r.user_id, 'comment', r.city_id, r.stars, left(btrim(r.comment), 200), r.created_at
  from public.city_ratings r
 where nullif(btrim(r.comment), '') is not null
   and not exists (select 1 from public.activity a
                    where a.user_id = r.user_id and a.city_id = r.city_id and a.kind = 'comment');


-- ── 5. 한줄평 — 막은 사람(어느 쪽이든)은 서로 안 보이게 ───────────────────────
-- ⚠ 071·072·073 의 경고: 일기 칸을 여기 넣지 마십시오. 칸은 020 그대로입니다.
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
         coalesce(p.display_name, '이름 없음'),
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
   order by r.updated_at desc
   limit 50;
$$;
grant execute on function public.city_comments(text) to anon, authenticated;


-- ── 6. 앱이 부르는 함수 ───────────────────────────────────────────────────
-- 6-1. 사람 머리(누구나 — 로그인한 사람). 막힘이면 null(없는 사람처럼).
create or replace function public.person_head(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); p record; 나 text; 너 text;
begin
  if me is null then raise exception '로그인이 필요합니다'; end if;
  if p_user is null then return null; end if;
  if p_user <> me and public.blocked_between(me, p_user) then return null; end if;
  select id, display_name, avatar_url, follow_mode into p from public.profiles where id = p_user;
  if not found then return null; end if;
  select status into 나 from public.follows where follower = me and followee = p_user;
  select status into 너 from public.follows where follower = p_user and followee = me;
  return jsonb_build_object(
    'id', p.id, 'name', p.display_name, 'avatar_url', p.avatar_url,
    'follow_mode', p.follow_mode,
    'followers', (select count(*) from public.follows where followee = p_user and status = 'accepted'),
    'following', (select count(*) from public.follows where follower = p_user and status = 'accepted'),
    'mine', 나, 'theirs', 너,
    'self', p_user = me,
    'can_see', p_user = me or coalesce(나 = 'accepted', false),
    -- 함께 아는 사람: 내가 팔로우하는 사람 중 그 사람을 팔로우하는 사람
    'mutual', (select count(*) from public.follows a
                 join public.follows b on b.follower = a.followee
                where a.follower = me and a.status = 'accepted'
                  and b.followee = p_user and b.status = 'accepted'
                  and a.followee <> p_user),
    'requests', case when p_user = me then
                  (select count(*) from public.follows where followee = me and status = 'requested') end
  );
end $$;
revoke all on function public.person_head(uuid) from public, anon;
grant execute on function public.person_head(uuid) to authenticated;

-- 6-2. 사람 알맹이(나 자신 · 승인된 팔로워만). 못 보면 null.
create or replace function public.person_body(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); p record; 별 boolean; 발자국 jsonb;
begin
  if me is null then raise exception '로그인이 필요합니다'; end if;
  if not public.can_see_person(me, p_user) then return null; end if;
  select show_stars, persona into p from public.profiles where id = p_user;
  별 := p_user = me or coalesce(p.show_stars, true);

  with been as (
    select v.city_id,
           coalesce(n.parent_code, c.country)  as country,
           coalesce(np.continent, n.continent) as continent
      from public.visited_of(p_user) v
      join public.cities c          on c.id = v.city_id
      left join public.countries n  on n.code = c.country
      left join public.countries np on np.code = n.parent_code
  )
  select jsonb_build_object(
    'cities',    (select count(*) from been),
    'countries', (select count(distinct country) from been),
    'rated',     (select count(*) from public.city_ratings where user_id = p_user and stars is not null),
    'trips',     (select count(*) from public.trip_members m join public.trips t on t.id = m.trip_id
                   where m.user_id = p_user and m.left_at is null and t.end_date < current_date),
    'by_continent', coalesce((select jsonb_object_agg(k, n) from (
        select coalesce(continent, '기타') as k, count(distinct country) as n from been group by 1) x),
      '{}'::jsonb)
  ) into 발자국;

  return jsonb_build_object(
    'persona', p.persona,
    'show_stars', 별,
    'foot', 발자국,
    'visited', coalesce((select jsonb_agg(v.city_id) from public.visited_of(p_user) v), '[]'::jsonb),
    -- 별점 · 한줄평(가고 싶은 곳 · 일기는 안 나갑니다)
    'ratings', coalesce((
      select jsonb_agg(jsonb_build_object(
               'city_id', r.city_id,
               'stars',   case when 별 then r.stars end,
               'comment', nullif(btrim(r.comment), ''))
             order by r.stars desc nulls last, r.city_id)
        from public.city_ratings r
       where r.user_id = p_user
         and (r.stars is not null or nullif(btrim(r.comment), '') is not null)), '[]'::jsonb),
    'badges', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.badge_id, 'at', b.earned_at) order by b.earned_at)
        from public.user_badges b where b.user_id = p_user), '[]'::jsonb)
  );
end $$;
revoke all on function public.person_body(uuid) from public, anon;
grant execute on function public.person_body(uuid) to authenticated;

-- 6-3. 이름으로 찾기 — 이름이 «똑같을 때만»(100 의 name_key). 목록을 훑을 수 없게.
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
     -- ⚠ 처음 이름(메일 앞부분, 100 의 handle_new_user)은 찾기에서 뺍니다.
     --   안 빼면 메일 주소를 아는 사람이 「이 사람이 기로를 쓰나」를 알아냅니다.
     --   이름을 직접 바꾸면 찾아집니다. 링크·한줄평·일행 목록으로는 그대로 닿습니다.
     and not exists (select 1 from auth.users u
                      where u.id = p.id
                        and public.name_key(split_part(u.email, '@', 1)) = public.name_key(p.display_name))
   limit 5;
$$;
revoke all on function public.people_find(text) from public, anon;
grant execute on function public.people_find(text) to authenticated;

-- 6-4. 프로필 링크 → 사람
create or replace function public.person_by_link(p_code text)
returns uuid language sql stable security definer set search_path = public as $$
  select p.id from public.profiles p
   where auth.uid() is not null
     and p.link_code = upper(btrim(p_code))
     and not public.blocked_between(auth.uid(), p.id);
$$;
revoke all on function public.person_by_link(text) from public, anon;
grant execute on function public.person_by_link(text) to authenticated;

-- 6-5. 팔로우(요청). 답: requested | accepted
create or replace function public.follow_ask(p_user uuid)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); 방식 text; 상태 text; 이미 text; 이름 text;
begin
  if me is null then raise exception '로그인이 필요합니다'; end if;
  if p_user is null or p_user = me then raise exception '자기 자신은 팔로우할 수 없어요'; end if;
  if public.blocked_between(me, p_user) then raise exception '팔로우할 수 없는 사람이에요'; end if;
  select follow_mode into 방식 from public.profiles where id = p_user;
  if not found then raise exception '없는 사람이에요'; end if;
  select status into 이미 from public.follows where follower = me and followee = p_user;
  if 이미 is not null then return 이미; end if;
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

-- 6-6. 팔로우 끊기 · 요청 거두기
create or replace function public.follow_drop(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception '로그인이 필요합니다'; end if;
  delete from public.follows where follower = me and followee = p_user;
  -- 아직 안 읽은 「요청했어요」는 거둡니다
  delete from public.notifications
   where user_id = p_user and actor_id = me and kind = 'follow_request' and read_at is null;
end $$;
revoke all on function public.follow_drop(uuid) from public, anon;
grant execute on function public.follow_drop(uuid) to authenticated;

-- 6-7. 받은 요청에 답하기. 답: accepted | declined | none
create or replace function public.follow_answer(p_user uuid, p_ok boolean)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); 이름 text; 답 text := 'none';
begin
  if me is null then raise exception '로그인이 필요합니다'; end if;
  if p_ok then
    update public.follows set status = 'accepted', accepted_at = now()
     where follower = p_user and followee = me and status = 'requested';
    if found then
      답 := 'accepted';
      select coalesce(display_name, '누군가') into 이름 from public.profiles where id = me;
      perform public.notify_user(p_user, 'follow_accepted', 이름 || '님이 팔로우 요청을 수락했어요', me);
    end if;
  else
    delete from public.follows where follower = p_user and followee = me and status = 'requested';
    if found then 답 := 'declined'; end if;
  end if;
  update public.notifications set read_at = now()
   where user_id = me and actor_id = p_user and kind = 'follow_request' and read_at is null;
  return 답;
end $$;
revoke all on function public.follow_answer(uuid, boolean) from public, anon;
grant execute on function public.follow_answer(uuid, boolean) to authenticated;

-- 6-8. 내 팔로워에서 빼기
create or replace function public.follower_drop(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  delete from public.follows where follower = p_user and followee = auth.uid();
end $$;
revoke all on function public.follower_drop(uuid) from public, anon;
grant execute on function public.follower_drop(uuid) to authenticated;

-- 6-9. 내 목록: following(팔로잉) · sent(보낸 요청) · followers(팔로워) · requests(받은 요청)
create or replace function public.follow_people(p_kind text)
returns table (user_id uuid, name text, avatar_url text, status text, at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar_url, f.status, coalesce(f.accepted_at, f.created_at)
    from public.follows f
    join public.profiles p
      on p.id = case when p_kind in ('following', 'sent') then f.followee else f.follower end
   where auth.uid() is not null
     and ((p_kind = 'following' and f.follower = auth.uid() and f.status = 'accepted')
       or (p_kind = 'sent'      and f.follower = auth.uid() and f.status = 'requested')
       or (p_kind = 'followers' and f.followee = auth.uid() and f.status = 'accepted')
       or (p_kind = 'requests'  and f.followee = auth.uid() and f.status = 'requested'))
   order by 5 desc;
$$;
revoke all on function public.follow_people(text) from public, anon;
grant execute on function public.follow_people(text) to authenticated;

-- 6-10. 차단 · 풀기 · 목록 — 막으면 팔로우 양쪽을 끊고 서로의 알림도 지웁니다
create or replace function public.block_user(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception '로그인이 필요합니다'; end if;
  if p_user is null or p_user = me then return; end if;
  insert into public.blocks (blocker, blocked) values (me, p_user) on conflict do nothing;
  delete from public.follows
   where (follower = me and followee = p_user) or (follower = p_user and followee = me);
  delete from public.notifications
   where (user_id = me and actor_id = p_user and trip_id is null)
      or (user_id = p_user and actor_id = me and trip_id is null);
end $$;
revoke all on function public.block_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;

create or replace function public.unblock_user(p_user uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.blocks where blocker = auth.uid() and blocked = p_user;
$$;
revoke all on function public.unblock_user(uuid) from public, anon;
grant execute on function public.unblock_user(uuid) to authenticated;

create or replace function public.my_blocks()
returns table (user_id uuid, name text, avatar_url text, at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar_url, b.created_at
    from public.blocks b join public.profiles p on p.id = b.blocked
   where b.blocker = auth.uid()
   order by b.created_at desc;
$$;
revoke all on function public.my_blocks() from public, anon;
grant execute on function public.my_blocks() to authenticated;

-- 6-11. 사람 신고(하루 열 번까지)
create or replace function public.report_user(p_user uuid, p_reason text, p_detail text default null)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception '로그인이 필요합니다'; end if;
  if p_user is null or p_user = me then return; end if;
  if (select count(*) from public.people_reports
       where reporter = me and created_at > now() - interval '1 day') >= 10 then
    raise exception '오늘은 신고를 더 할 수 없어요';
  end if;
  insert into public.people_reports (reporter, target, reason, detail)
  values (me, p_user, p_reason, nullif(btrim(p_detail), ''));
end $$;
revoke all on function public.report_user(uuid, text, text) from public, anon;
grant execute on function public.report_user(uuid, text, text) to authenticated;

-- 6-12. 친구 소식 — 내가 팔로우하는(승인된) 사람들
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
   order by a.created_at desc
   limit least(greatest(coalesce(p_limit, 60), 1), 200);
$$;
revoke all on function public.friend_feed(timestamptz, int) from public, anon;
grant execute on function public.friend_feed(timestamptz, int) to authenticated;

-- 6-13. 도시 화면의 「팔로우하는 사람들」 — 매겼거나 한줄평을 썼거나 다녀온 사람
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
     and (r.stars is not null
          or nullif(btrim(r.comment), '') is not null
          or exists (select 1 from public.visited_of(f.followee) v where v.city_id = p_city))
   order by r.stars desc nulls last, p.display_name;
$$;
revoke all on function public.city_friends(text) from public, anon;
grant execute on function public.city_friends(text) to authenticated;


-- ── 확인 ────────────────────────────────────────────────────────────────
-- 기대값: 표 넷 true · 함수 true · 공개 칸 true · 소식 줄 수(숫자) · 링크 없는 사람 0
select 1 as 순서, '표: follows·blocks·people_reports·activity' as 항목,
       (to_regclass('public.follows') is not null and to_regclass('public.blocks') is not null
        and to_regclass('public.people_reports') is not null
        and to_regclass('public.activity') is not null)::text as 값
union all select 2, '함수: person_head·person_body·follow_ask·friend_feed·city_friends',
       (to_regproc('public.person_head') is not null and to_regproc('public.person_body') is not null
        and to_regproc('public.follow_ask') is not null and to_regproc('public.friend_feed') is not null
        and to_regproc('public.city_friends') is not null)::text
union all select 3, '공개 칸: follow_mode·show_stars·persona·link_code',
       (select count(*) = 4 from information_schema.columns
         where table_schema = 'public' and table_name = 'profiles'
           and column_name in ('follow_mode', 'show_stars', 'persona', 'link_code'))::text
union all select 4, '처음 채운 소식 줄 수', (select count(*)::text from public.activity)
union all select 5, '링크 없는 사람(0 이어야)', (select count(*)::text from public.profiles where link_code is null)
union all select 6, 'notify_members 를 로그인한 사람이 부를 수 있나(false 여야)',
       has_function_privilege('authenticated', 'public.notify_members(uuid, text, text, uuid)', 'execute')::text
order by 순서;
