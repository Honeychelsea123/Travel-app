-- =====================================================================
-- 104 · 구글이 넘기는 이름·사진을 안 받기 (b798, SNS 점검에서 찾음)
--
-- 개인정보처리방침(privacy.html)과 로그인 화면이 약속한 것:
--   「구글 로그인에서 이메일만 받습니다(요청 범위 openid email). 이름과 구글 프로필
--    사진은 받지 않습니다. 닉네임과 사진은 서비스 안에서 본인이 정합니다.」
--   「이메일만 받아요. 이름도 프로필 사진도 안 가져와요.」
-- 실제로는:
--   ① 로그인 서비스(Supabase)가 구글에 profile 범위를 «기본으로» 같이 요청합니다 — 앱이
--      scopes 를 'openid email' 로 줘도 **더해질 뿐 빠지지 않습니다.** 그래서 가입·로그인 때마다
--      auth.users.raw_user_meta_data 와 auth.identities.identity_data 에 full_name · name ·
--      avatar_url · picture 가 들어옵니다(시험 계정으로 재 봄: 키 10개 중 넷).
--   ② 가입 트리거(066 → 100 의 handle_new_user)가 «full_name · name · picture 폴백 유지» 로
--      그 이름과 사진을 **프로필에 그대로 넣었습니다** — 새 사용자의 구글 실명·사진이
--      이름 찾기·한줄평·일행·팔로우 화면에서 남에게 보였습니다.
--      (시험 계정의 프로필 사진이 lh3.googleusercontent.com 이었습니다.)
--
-- 이 파일이 하는 것(앞으로 막기 + 세기만)
--   1. 가입 트리거 — 이름은 **메일 앞부분만**(앱 app.js 가 원래 뜻한 대로), 사진은 **비움**.
--      066 의 가입 막기(signup_on), 100 의 「겹치거나 못 쓰는 이름이면 null」·동시 가입
--      unique_violation 받기는 **그대로** 둡니다(unique-names 의 가입 트리거 덫).
--   2. auth 에 들어오는 이름·사진 칸을 **저장하기 전에** 지웁니다 — 가입 때와, 로그인할 때
--      구글이 다시 보낼 때 둘 다(BEFORE INSERT OR UPDATE). 이메일·sub 같은 로그인에 필요한
--      칸은 안 건드립니다.
--   3. 확인 — 이미 가입한 사람 가운데 해당하는 사람 수만 셉니다(아무것도 안 바꿉니다).
--      정리는 105 에 따로 두었습니다 — 기존 사람의 사진·이름이 바뀌는 일이라 숫자를 보고 정하십시오.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================


-- ── 1. 가입 트리거 ─────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  -- ⚠ 구글 full_name · name · avatar_url · picture 를 쓰지 않습니다(위 머리말 ②).
  v_name text := split_part(new.email, '@', 1);
begin
  if not coalesce((select (value->>'on')::boolean
                     from public.app_settings where key='signup_on'), true) then
    raise exception '지금은 새로 가입할 수 없어요. 잠시 뒤 다시 시도해 주세요.';
  end if;
  v_name := nullif(btrim(v_name), '');
  if v_name is not null and (char_length(v_name) > 30
       or public.name_reserved(v_name)
       or exists (select 1 from public.profiles p
                   where public.name_key(p.display_name) = public.name_key(v_name))) then
    v_name := null;
  end if;
  begin
    insert into public.profiles (id, display_name, avatar_url)
    values (new.id, v_name, null) on conflict (id) do nothing;
  exception when unique_violation then
    insert into public.profiles (id, display_name, avatar_url)
    values (new.id, null, null) on conflict (id) do nothing;
  end;
  insert into public.user_prefs (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;


-- ── 2. auth 에 이름·사진을 남기지 않기 ───────────────────────────────────
-- 지우는 칸: full_name · name · avatar_url · picture. jsonb 의 `-` 는 없는 키면 그대로 둡니다.
create or replace function public.strip_google_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'users' then
    if new.raw_user_meta_data is not null then
      new.raw_user_meta_data := new.raw_user_meta_data - 'full_name' - 'name' - 'avatar_url' - 'picture';
    end if;
  elsif tg_table_name = 'identities' then
    if new.identity_data is not null then
      new.identity_data := new.identity_data - 'full_name' - 'name' - 'avatar_url' - 'picture';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.strip_google_profile() from public, anon, authenticated;

drop trigger if exists strip_google_profile_users on auth.users;
create trigger strip_google_profile_users
  before insert or update of raw_user_meta_data on auth.users
  for each row execute function public.strip_google_profile();

drop trigger if exists strip_google_profile_identities on auth.identities;
create trigger strip_google_profile_identities
  before insert or update of identity_data on auth.identities
  for each row execute function public.strip_google_profile();


-- ── 3. 확인(세기만) ─────────────────────────────────────────────────────
-- 기대값: 1·2 는 true. 3~5 는 «이미 가입한 사람» 가운데 해당하는 수 — 105 를 돌릴지 정하는 숫자.
--   (3 을 먼저 세고 나서 105 를 돌려야 합니다 — 105 가 auth 의 이름을 지우면 4 를 못 셉니다.)
select 1 as 순서, '가입 트리거가 구글이 준 칸을 안 읽음(true 여야)' as 항목,
       (position('raw_user_meta_data' in pg_get_functiondef('public.handle_new_user'::regproc)) = 0)::text as 값
union all
select 2, '이름·사진 지우는 트리거 둘(true 여야)',
       ((select count(*) from pg_trigger
          where tgname in ('strip_google_profile_users', 'strip_google_profile_identities')
            and not tgisinternal) = 2)::text
union all
select 3, '구글 사진을 프로필 사진으로 쓰는 사람 수',
       (select count(*) from public.profiles
         where avatar_url like 'https://lh3.googleusercontent.com/%')::text
union all
select 4, '구글 이름이 그대로 이름인 사람 수',
       (select count(*) from public.profiles p join auth.users u on u.id = p.id
         where p.display_name is not null
           and (p.display_name = u.raw_user_meta_data->>'full_name'
             or p.display_name = u.raw_user_meta_data->>'name'))::text
union all
select 5, 'auth 에 이름·사진 칸이 남은 사람 수',
       (select count(*) from auth.users
         where raw_user_meta_data ?| array['full_name', 'name', 'avatar_url', 'picture'])::text
order by 1;
