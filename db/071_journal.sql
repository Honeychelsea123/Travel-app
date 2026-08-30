-- ─────────────────────────────────────────────────────────────────────
-- 071_journal.sql — 도시마다 남기는 **비공개 일기**
--
-- 사용자 결정(2026-08-30): 이 앱의 핵심은 다녀온 곳을 남기는 것이고,
-- 나중에 일기장처럼 넘겨 볼 수 있어야 합니다.
--
-- ── 왜 `comment` 를 늘리면 안 되는가 ────────────────────────────────
-- `comment`(한줄평)는 **남들에게 보입니다.** `city_comments()` 가
-- `security definer` 로 남의 것까지 내주고 anon 에게도 열려 있습니다
-- (db/020). 그 칸을 여러 줄로 바꾸면 **공개 한줄평이 공개 일기**가 됩니다.
-- 한줄평은 그대로 두고 칸을 따로 만듭니다.
--
--   comment  공개 · 한 줄 · 남들도 봄
--   journal  비공개 · 여러 줄 · 나만 봄
--
-- ── 왜 이 칸은 저절로 비공개인가 ────────────────────────────────────
-- `city_ratings` 의 RLS 가 `user_id = auth.uid()` 라 남의 줄은 애초에
-- 안 보입니다. 공개되는 길은 `city_comments()` 하나뿐인데 그 함수는
-- **칸을 하나씩 이름으로 적어** 내줍니다(select r.user_id, …, r.comment).
-- ⚠⚠ **그 함수에 `journal` 을 절대 더하지 마십시오.** 거기 한 줄이면
--   모든 사람의 일기가 열립니다. `select *` 로 바꾸는 것도 같은 뜻입니다 —
--   앞으로 칸이 늘 때마다 저절로 새 나갑니다.
--
-- ── 길이 ────────────────────────────────────────────────────────────
-- 상한을 둡니다. 없으면 실수로(붙여넣기 사고) 몇 MB 가 들어올 수 있고,
-- 무료 등급에서 그건 그대로 요금입니다. 4000자면 A4 두 장쯤입니다 —
-- 도시 한 곳 일기로는 넉넉합니다.
--
-- 돌리는 법: Supabase → SQL Editor 에 붙여 넣고 실행.
--   여러 번 돌려도 안전합니다.
-- ─────────────────────────────────────────────────────────────────────

alter table public.city_ratings
  add column if not exists journal text;

alter table public.city_ratings
  drop constraint if exists city_ratings_journal_len;
alter table public.city_ratings
  add constraint city_ratings_journal_len
  check (journal is null or char_length(journal) <= 4000);

comment on column public.city_ratings.journal is
  '비공개 일기. 나만 봅니다 — city_comments() 에 절대 넣지 마십시오(071).';

-- ── 확인 ────────────────────────────────────────────────────────────
-- ① 칸이 생겼는지
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public'
   and table_name   = 'city_ratings'
   and column_name  = 'journal';

-- ② 공개 함수가 일기를 안 내주는지 (0 줄이어야 정상입니다)
select 'city_comments 가 journal 을 내줍니다 — 고치십시오' as 경고
  from pg_proc
 where proname = 'city_comments'
   and prosrc ilike '%journal%';
