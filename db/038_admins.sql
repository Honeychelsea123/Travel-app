-- =====================================================================
-- 관리자
--
-- 개발 중에만 보면 되는 것들(빌드 번호, 부팅 시각, 나중에는 남들이 낸 오류)을
-- 아무에게나 보여줄 이유가 없습니다. 그렇다고 지워버리면 문제가 생겼을 때
-- 무엇을 보고 판단할지가 없어집니다.
--
-- ── 왜 표를 따로 만드는가 ──
--
-- 1. **코드에 이메일을 박지 않습니다.** 저장소가 공개라 그대로 올라갑니다.
-- 2. **profiles 에 칸을 하나 두는 것으로는 안 됩니다.** 그 표의 정책이
--    "본인 줄은 다 할 수 있음"이라, 누구나 자기를 관리자로 켤 수 있습니다.
--    여기는 **읽기 정책만 두고 쓰기 정책을 아예 안 만듭니다** — 그러면
--    SQL 편집기(서비스 키)로만 넣을 수 있습니다.
-- 3. 읽기도 자기 줄만 봅니다. 누가 관리자인지 남들이 알 이유가 없습니다.
--
-- ── 넣는 법 ──
-- 아래 마지막 줄의 주석을 풀고 이메일을 바꿔 실행하면 그 계정이 관리자가 됩니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

create table if not exists public.admins (
  user_id    uuid primary key references auth.users on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- 읽기는 자기 줄만. 쓰기 정책은 **일부러 안 만듭니다.**
drop policy if exists admins_self on public.admins;
create policy admins_self on public.admins for select
  using (user_id = auth.uid());

-- 화면에서 "나는 관리자인가"만 물어봅니다. 목록을 통째로 주지 않습니다.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to authenticated;


-- ── 관리자 넣기 ──────────────────────────────────────────────────────
-- 아래 주석(--)을 풀고 이메일을 채워 실행하세요.
-- 로그인을 한 번이라도 한 계정이어야 auth.users 에 있습니다.
--
-- **이 파일에 실제 이메일을 적어두지 마세요.** 저장소가 공개라 그대로 올라가고,
-- 이메일 주소는 긁어가는 곳이 많습니다. 실행할 때만 채워 넣으세요.
--
-- insert into public.admins (user_id, note)
-- select id, '만든 사람' from auth.users where email = '여기에-이메일'
-- on conflict (user_id) do nothing;


-- ── 확인 ─────────────────────────────────────────────────────────────
select 'admins 표'     as item, to_regclass('public.admins') is not null as ok
union all select 'is_admin 함수', to_regproc('public.is_admin') is not null
union all select '스스로 관리자가 될 수 없음',
  not exists (select 1 from pg_policies
               where schemaname='public' and tablename='admins'
                 and cmd in ('INSERT','UPDATE','ALL'))
union all select '지금 관리자 수 (0이면 아래 insert 를 실행하세요)',
  (select count(*) > 0 from public.admins);
