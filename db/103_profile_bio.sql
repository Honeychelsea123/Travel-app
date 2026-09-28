-- ── 프로필 소개 (b791) ────────────────────────────────────────────────
--
-- 사용자: 「프로필 수정에서 닉네임이랑, 사진 바꾸고, 소개까지 넣자」
--   (왓챠 「프로필 변경」 화면 사진) → 「그렇게 가자」.
--
-- 60자 한 줄. **이름·사진처럼 로그인한 사람에게 보이고, 비공개로 잠그면
-- 남에게는 숨깁니다**(person_head). 본인은 늘 봅니다.
-- ⚠ 102 의 person_head 본문을 그대로 옮기고 소개 한 줄(과 select 의 bio)만
--   더했습니다. 102 를 고치면 여기도 고치십시오.
-- ⚠ 빈 글은 앱이 null 로 보냅니다. 여기서는 길이만 막습니다.
--
-- 102 다음에 실행합니다. 여러 번 실행해도 안전합니다.

alter table public.profiles add column if not exists bio text;
alter table public.profiles drop constraint if exists profiles_bio_len;
alter table public.profiles add constraint profiles_bio_len
  check (bio is null or char_length(bio) <= 60);
comment on column public.profiles.bio is
  '프로필 소개(b791). 60자. 로그인한 사람에게 보이고 잠그면(locked) 남에게 숨김';

-- 머리 — 소개를 더함(잠겼으면 남에게는 null)
create or replace function public.person_head(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); p record; 나 text; 너 text; 잠김 boolean;
begin
  if me is null then raise exception '로그인이 필요합니다'; end if;
  if p_user is null then return null; end if;
  if p_user <> me and public.blocked_between(me, p_user) then return null; end if;
  select id, display_name, avatar_url, follow_mode, locked, bio into p
    from public.profiles where id = p_user;
  if not found then return null; end if;
  잠김 := coalesce(p.locked, false) and p_user <> me;     -- 남이 볼 때만 잠김
  select status into 나 from public.follows where follower = me and followee = p_user;
  select status into 너 from public.follows where follower = p_user and followee = me;
  return jsonb_build_object(
    'id', p.id, 'name', p.display_name, 'avatar_url', p.avatar_url,
    'bio', case when 잠김 then null else nullif(btrim(p.bio), '') end,
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


-- ── 확인 ─────────────────────────────────────────────────────────────
select 1 as 순서, '소개 칸 profiles.bio(true 여야)' as 항목,
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'profiles'
                  and column_name = 'bio')::text as 값
union all
select 2, '60자 막기(true 여야)',
       exists (select 1 from pg_constraint where conname = 'profiles_bio_len')::text
union all
select 3, 'person_head 가 소개를 보냄(true 여야)',
       (pg_get_functiondef('public.person_head(uuid)'::regprocedure) like '%''bio''%')::text
order by 1;
