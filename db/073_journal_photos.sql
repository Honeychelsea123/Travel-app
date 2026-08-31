-- ─────────────────────────────────────────────────────────────────────
-- 073_journal_photos.sql — 일기 사진을 «여러 장»으로
--
-- 사용자 요청(2026-08-31): 「사진이 여러장인 경우도 테스트해봐」.
--
-- ── 072 가 남긴 지시를 그대로 따릅니다 ──────────────────────────────
-- 072 머리말에 이렇게 적어 뒀습니다:
--   「여러 장이 필요해지면 `city_ratings` 를 늘리지 말고 052 처럼
--    **줄이 여럿인 표**를 새로 만드십시오. 칸을 배열로 바꾸면 RLS 와
--    공개 함수 검사가 통째로 다시 필요합니다.」
-- 그래서 배열이 아니라 표입니다. 모양은 052(`trip_photos`)와 같습니다 —
-- 두 벌을 다르게 만들면 나중에 한쪽만 고치게 됩니다.
--
-- ── 052 와 다른 점: «같이 보는 사람»이 없습니다 ─────────────────────
-- 여행 후기 사진은 일행이 같이 봅니다(`can_read_trip`). 일기는 **나만
-- 보는 것**입니다(071·072와 같은 성격). 그래서 정책이 넷 다 한 줄입니다 —
-- 내 것인가.
--
-- ⚠⚠ **`city_comments()` 에 이 표를 절대 엮지 마십시오.** ⚠⚠
--   071·072 에 적은 것과 같은 이유입니다. 그 함수는 `security definer` 로
--   남의 줄까지 내주고 anon 에게도 열려 있습니다.
--
-- ── 통은 072 것을 그대로 씁니다 ─────────────────────────────────────
-- `journal-photos` 버킷과 그 정책 넷(jphotos_*)은 이미 있고, 규칙이
-- **「경로 맨 앞 칸이 내 id」** 하나입니다. 경로가 한 겹 깊어져도
--   <uid>/<도시>/<uuid>.jpg
-- 맨 앞 칸은 여전히 uid 라 **정책을 안 고쳐도 그대로 맞습니다.**
-- ⚠ 072 의 한 장짜리 경로는 `<uid>/<도시>.jpg` 였습니다. 겹치지 않습니다.
--
-- ── 왜 url 도 같이 두는가 ───────────────────────────────────────────
-- 072 와 같은 이유입니다. 통이 비공개라 볼 때마다 서명이 필요한데,
-- 일기장은 **한 화면에 여러 장을 그리는 곳**이라 장마다 왕복하면 느립니다.
-- 오래 가는 서명 주소를 넣어 두고, 깨지면 그때 다시 받습니다.
-- ⚠ `path` 는 **지울 때** 필요합니다. url 만 두면 통에 파일이 남습니다.
--
-- 돌리는 법: Supabase → SQL Editor 에 붙여 넣고 실행. 여러 번 안전합니다.
-- ─────────────────────────────────────────────────────────────────────

-- ── 1. 표 ────────────────────────────────────────────────────────────
create table if not exists public.journal_photos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  city_id    text not null,
  path       text not null unique,          -- 통 안의 경로 (지울 때 필요)
  url        text not null,                 -- 오래 가는 서명 주소
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);

-- 한 도시의 사진을 순서대로 꺼내는 것이 유일한 읽기 방식입니다.
create index if not exists journal_photos_mine_idx
  on public.journal_photos (user_id, city_id, sort, created_at);

comment on table public.journal_photos is
  '일기 사진(여러 장). 파일은 journal-photos 통에 있고 여기는 경로와 서명 주소만. 나만 봅니다(073).';

alter table public.journal_photos enable row level security;

-- 넷 다 같은 한 줄입니다 — 내 것인가. 일기는 나만 보는 것이라
-- 052 처럼 「일행도 본다」가 없습니다.
drop policy if exists jphotos_rows_own on public.journal_photos;
create policy jphotos_rows_own on public.journal_photos
  for all using (user_id = auth.uid())
       with check (user_id = auth.uid());

-- ── 2. 있던 한 장을 옮겨 옵니다 ──────────────────────────────────────
-- 072 로 이미 올린 사진이 있습니다(도쿄·로바니에미). 새 표가 비어 있으면
-- 일기장에서 사진이 통째로 사라진 것처럼 보입니다.
-- ⚠ `path` 를 서명 주소에서 되짚습니다: .../object/sign/journal-photos/<경로>?token=…
-- ⚠ 이미 옮긴 것은 `on conflict (path)` 로 걸러집니다 — 여러 번 돌려도 안전.
insert into public.journal_photos (user_id, city_id, path, url, sort)
select r.user_id,
       r.city_id,
       split_part(split_part(r.journal_photo, '/journal-photos/', 2), '?', 1),
       r.journal_photo,
       0
  from public.city_ratings r
 where r.journal_photo is not null
   and r.journal_photo like '%/journal-photos/%'
on conflict (path) do nothing;

-- ⚠ `city_ratings.journal_photo` 는 **안 지웁니다.** 옮기다 잘못되면
--   되돌릴 것이 있어야 합니다. 앱은 073 이 돌아간 뒤로는 새 표만 봅니다.
comment on column public.city_ratings.journal_photo is
  '(옛것) 일기 사진 한 장. 073 부터는 journal_photos 표를 씁니다. 되돌릴 때를 위해 남겨둡니다.';

-- ── 확인 ────────────────────────────────────────────────────────────
-- ① 표와 정책
select tablename, policyname from pg_policies
 where schemaname = 'public' and tablename = 'journal_photos';

-- ② 옮겨진 줄 (도시별 장수)
select city_id, count(*) as 장수
  from public.journal_photos
 where user_id = auth.uid()
 group by city_id
 order by city_id;

-- ③ 통 정책은 그대로여야 합니다 (넷)
select policyname from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
   and policyname like 'jphotos_%'
 order by policyname;

-- ④ 공개 함수가 일기 사진을 안 내주는지 (0 줄이어야 정상입니다)
select 'city_comments 가 일기 사진을 내줍니다 — 고치십시오' as 경고
  from pg_proc
 where proname = 'city_comments'
   and (prosrc ilike '%journal_photo%' or prosrc ilike '%journal_photos%');
