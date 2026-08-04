-- =====================================================================
-- 구글에서 받아뒀던 이름·사진 지우기
--
-- 로그인 범위를 'openid email' 로 좁혔습니다. 이제부터는 이름도 사진도 안 옵니다.
-- 그런데 **이미 받아둔 것은 그대로 남아 있습니다.** 앞으로 안 받는 것과
-- 지금까지 받은 것을 지우는 것은 다른 일입니다.
--
-- 두 군데에 남아 있습니다.
--   1. public.profiles 의 display_name · avatar_url
--   2. auth.users 의 raw_user_meta_data (구글이 준 원본)
--
-- 1번만 지우고 2번을 두면 "안 갖고 있다"고 말할 수 없습니다.
--
-- ── 무엇을 남기는가 ──
-- 본인이 직접 바꾼 이름은 남깁니다. 그건 우리가 가져온 것이 아니라
-- 사용자가 우리에게 준 것입니다. 구분이 안 되는 경우에는 지웁니다 —
-- 애매하면 안 갖고 있는 쪽이 맞습니다.
--
-- 사진 파일은 Storage 에 있습니다. 아래에서 주소만 지우고,
-- 남은 파일은 대시보드 Storage 에서 직접 비우셔야 합니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

-- ── 1. 구글이 준 이름·사진을 프로필에서 지웁니다 ────────────────────
-- 구글 사진은 주소가 googleusercontent.com 입니다. 우리 Storage 에 올린 것과
-- 확실히 구분됩니다. 그것만 지웁니다.
update public.profiles
   set avatar_url = null
 where avatar_url like '%googleusercontent.com%';

-- 이름은 출처를 구분할 수 없습니다. 구글이 준 것과 똑같으면 안 바꾼 것으로 봅니다.
update public.profiles p
   set display_name = null
  from auth.users u
 where u.id = p.id
   and p.display_name is not null
   and p.display_name in (
         u.raw_user_meta_data ->> 'full_name',
         u.raw_user_meta_data ->> 'name'
       );

-- ── 2. 구글이 준 원본을 auth.users 에서 비웁니다 ────────────────────
-- 이메일과 로그인에 필요한 것만 남기고 이름·사진 관련 칸을 걷어냅니다.
--
-- auth 스키마는 Supabase 가 관리하는 곳이라 손대는 것이 막혀 있을 수 있습니다.
-- 그냥 update 로 두면 막혔을 때 **위 1번까지 통째로 되돌아갑니다.**
-- 여기서 삼키고, 됐는지 안 됐는지는 아래 확인에서 보여줍니다.
do $$
begin
  update auth.users
     set raw_user_meta_data = raw_user_meta_data
           - 'full_name' - 'name' - 'avatar_url' - 'picture'
           - 'given_name' - 'family_name' - 'preferred_username'
   where raw_user_meta_data ?| array['full_name','name','avatar_url','picture',
                                     'given_name','family_name','preferred_username'];
exception when others then
  raise notice 'auth.users 는 못 건드렸습니다: %', sqlerrm;
end $$;


-- ── 확인 ─────────────────────────────────────────────────────────────
select '구글 사진이 남은 프로필' as item,
       (select count(*) from public.profiles
         where avatar_url like '%googleusercontent.com%') as n
union all
select '구글 이름이 남은 계정',
       (select count(*) from auth.users
         where raw_user_meta_data ?| array['full_name','name','picture','avatar_url'])
union all
select '이름이 비어 직접 정해야 하는 사람',
       (select count(*) from public.profiles where display_name is null);
