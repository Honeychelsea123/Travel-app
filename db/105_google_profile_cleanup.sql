-- =====================================================================
-- 105 · 이미 가입한 사람의 구글 이름·사진 정리 (b798)
--
-- ⚠ **104 를 먼저 돌리고, 104 의 확인 3~5 숫자를 본 뒤에** 돌리십시오.
--   104 는 «앞으로» 막기만 합니다. 이미 가입한 사람의 프로필에는 구글 사진·이름이 남아 있고,
--   auth 에도 이름·사진 칸이 남아 있습니다(방침: 「이름과 구글 프로필 사진은 받지 않습니다」).
-- ⚠ 순서가 중요합니다 — 2(이름)는 auth 의 구글 이름과 견주므로 3(auth 지우기)보다 먼저.
-- 여러 번 실행해도 안전합니다.
-- =====================================================================


-- ── 1. 구글 사진을 프로필 사진에서 뺍니다 ─────────────────────────────────
-- 본인이 앱에서 올린 사진(Supabase avatars 통 주소)은 안 건드립니다. 빠진 사람은 앱이
-- 이름 첫 글자 그림을 그립니다 — 본인이 언제든 「프로필 변경」에서 사진을 올릴 수 있습니다.
update public.profiles
   set avatar_url = null
 where avatar_url like 'https://lh3.googleusercontent.com/%';


-- ── 2. (고르기) 구글 이름이 그대로 이름인 사람 ────────────────────────────
-- 104 확인 4 의 사람들입니다. 이미 일행·친구가 그 이름으로 알고 있을 수 있어 «고르기»로 둡니다.
--   · 그대로 두려면: 아무것도 안 하면 됩니다(아래 줄은 주석).
--   · 비우려면: 아래 줄의 `--` 를 지우고 돌리십시오. 앱이 그 사람에게 「이름을 정해 주세요」를
--     띄웁니다(b798). 남에게는 정할 때까지 「이름 없음」으로 보입니다.
-- update public.profiles p
--    set display_name = null
--   from auth.users u
--  where u.id = p.id
--    and p.display_name is not null
--    and (p.display_name = u.raw_user_meta_data->>'full_name'
--      or p.display_name = u.raw_user_meta_data->>'name');


-- ── 3. auth 에 남은 이름·사진 칸을 지웁니다 ──────────────────────────────
-- 로그인에 필요한 칸(email · sub · iss · provider_id …)은 그대로입니다.
update auth.users
   set raw_user_meta_data = raw_user_meta_data - 'full_name' - 'name' - 'avatar_url' - 'picture'
 where raw_user_meta_data ?| array['full_name', 'name', 'avatar_url', 'picture'];

update auth.identities
   set identity_data = identity_data - 'full_name' - 'name' - 'avatar_url' - 'picture'
 where identity_data ?| array['full_name', 'name', 'avatar_url', 'picture'];


-- ── 확인 ────────────────────────────────────────────────────────────────
-- 기대값: 1 · 3 · 4 는 0. 2 는 위에서 무엇을 골랐느냐에 따라(그대로 두면 104 확인 4 와 같은 수…
--   다만 3 이 auth 의 이름을 지웠으므로 여기서는 늘 0 으로 나옵니다 — 104 의 숫자를 믿으십시오).
select 1 as 순서, '구글 사진을 쓰는 프로필(0 이어야)' as 항목,
       (select count(*) from public.profiles
         where avatar_url like 'https://lh3.googleusercontent.com/%')::text as 값
union all
select 3, 'auth.users 에 이름·사진 칸(0 이어야)',
       (select count(*) from auth.users
         where raw_user_meta_data ?| array['full_name', 'name', 'avatar_url', 'picture'])::text
union all
select 4, 'auth.identities 에 이름·사진 칸(0 이어야)',
       (select count(*) from auth.identities
         where identity_data ?| array['full_name', 'name', 'avatar_url', 'picture'])::text
order by 1;
