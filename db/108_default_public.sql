-- =====================================================================
-- 108 · 공개 계정이 기본 — 새로 가입하는 사람도, 이미 가입한 사람도 (b799)
--
-- 사용자(2026-09-29): 「야 처음엔 다 공개 계정으로 해줘 인스타는 어떻게 돼있어?」
--   → 인스타그램도 어른 새 계정은 공개로 시작합니다(청소년만 비공개 — 우리는 나이를 안 받아서
--     그렇게 가를 수 없습니다). → 「지금 5명도 전부 공개로」(가입자 모두 운영자의 지인).
--
-- 하는 일
--   1. profiles.visibility 의 기본값을 'public' 으로 — 가입 트리거(handle_new_user)가 이 칸을
--      안 적으므로 새 사람은 공개 계정으로 시작합니다(106 의 동기화 트리거가 옛 칸도 맞춥니다).
--   2. 지금 비공개(private)인 사람을 공개로 — **처음 한 번만.**
--      ⚠ 기본값이 아직 'private' 일 때만 돕니다. 두 번째부터는 아무것도 안 바꿉니다 —
--        그 사이 본인이 비공개를 고른 사람을 다시 공개로 되돌리면 안 되기 때문입니다.
--      ⚠ 비활성화(off)한 사람은 건드리지 않습니다(지금은 0명).
--      ⚠ 공개로 바뀌는 순간 기다리던 팔로우 요청은 모두 수락됩니다(106 의 profiles_went_public).
--
-- ⚠ 개인정보처리방침 3차 개정(같은 날)에 「기본은 공개 계정」과 이날 바꾼 것을 적었습니다.
--
-- 106 · 107 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

do $$
begin
  if coalesce((select column_default from information_schema.columns
                where table_schema = 'public' and table_name = 'profiles'
                  and column_name = 'visibility'), '') not like '%public%' then
    update public.profiles set visibility = 'public' where visibility = 'private';
    alter table public.profiles alter column visibility set default 'public';
  end if;
end $$;

comment on column public.profiles.visibility is
  '공개 범위(b799): public 공개 계정(기본 — 108) · private 비공개 계정(승인한 팔로워만) · off 비활성화. '
  '옛 locked · follow_mode 는 이 칸을 따라갑니다(트리거 profiles_visibility_sync)';


-- ── 확인 ─────────────────────────────────────────────────────────────
-- 기대값: 1·2 는 true. 3 은 공개 범위별 사람 수(처음 돌리면 public 5).
select 1 as 순서, '새 가입자 기본값이 공개(true 여야)' as 항목,
       (coalesce((select column_default from information_schema.columns
                   where table_schema = 'public' and table_name = 'profiles'
                     and column_name = 'visibility'), '') like '%public%')::text as 값
union all
select 2, '옛 칸이 새 칸을 따름 — 어긋난 줄 0(true 여야)',
       (not exists (select 1 from public.profiles
                     where locked is distinct from (visibility = 'off')
                        or follow_mode is distinct from
                           (case when visibility = 'public' then 'anyone' else 'approve' end)))::text
union all
select 3, '공개 범위별 사람 수',
       (select string_agg(visibility || ' ' || n, ' · ' order by visibility)
          from (select visibility, count(*) n from public.profiles group by 1) x)
order by 1;
