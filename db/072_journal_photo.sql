-- ─────────────────────────────────────────────────────────────────────
-- 072_journal_photo.sql — 일기에 사진 한 장
--
-- 사용자 요청(2026-08-31): 「일기장에 사진이랑 일기 내용 넣어서 샘플로
-- 만들어봐. 사진 기능이 없으면 만들어서」.
--
-- ── 왜 한 장인가 ────────────────────────────────────────────────────
-- 여행 후기(052)는 여러 장입니다 — 거기는 「그 여행에서 찍은 것들」이라
-- 앨범이 맞습니다. 일기는 **도시 한 곳에 대한 한 쪽**이고, 넘겨 보는
-- 화면(diary.js)에서 한 장이 한 화면을 채웁니다. 여러 장이면 그 안에
-- 또 넘김이 생겨 「넘기는 일기장」이 두 겹이 됩니다.
-- ⚠ 여러 장이 필요해지면 `city_ratings` 를 늘리지 말고 052 처럼
--   **줄이 여럿인 표**를 새로 만드십시오. 칸을 배열로 바꾸면 RLS 와
--   공개 함수 검사(아래 ⚠⚠)가 통째로 다시 필요합니다.
--
-- ── 왜 경로가 아니라 주소를 넣는가 ──────────────────────────────────
-- 후기 사진(052)은 **경로**를 두고 볼 때마다 서명 주소를 받아옵니다 —
-- 여러 장이라 그렇게 해야 합니다. 여기는 한 장이고 일기장은 **한 번에
-- 스무 장까지 그리는 화면**이라, 장마다 서명을 받으면 그만큼 왕복이
-- 늘어납니다. 통을 비공개로 두고 **오래 가는 서명 주소**를 칸에
-- 넣습니다(앱이 만료 전에 다시 받습니다 — diary.js 참고).
--
-- ⚠⚠ **`city_comments()` 에 이 칸을 절대 더하지 마십시오.** ⚠⚠
--   071 에 적은 것과 같은 이유입니다. 그 함수는 `security definer` 로
--   남의 줄까지 내주고 anon 에게도 열려 있습니다. 한 줄만 더하면
--   **모든 사람의 일기 사진이 열립니다.** `select *` 도 같은 뜻입니다.
--
-- 돌리는 법: Supabase → SQL Editor 에 붙여 넣고 실행.
--   여러 번 돌려도 안전합니다.
-- ─────────────────────────────────────────────────────────────────────

-- ── 1. 칸 ────────────────────────────────────────────────────────────
alter table public.city_ratings
  add column if not exists journal_photo text;

alter table public.city_ratings
  drop constraint if exists city_ratings_journal_photo_len;
alter table public.city_ratings
  add constraint city_ratings_journal_photo_len
  check (journal_photo is null or char_length(journal_photo) <= 1000);

comment on column public.city_ratings.journal_photo is
  '일기 사진 주소(비공개 통 journal-photos). city_comments() 에 절대 넣지 마십시오(072).';

-- ── 2. 통 ────────────────────────────────────────────────────────────
-- public = false. 주소를 알아도 그냥은 안 열립니다 — 서명이 있어야 합니다.
-- 5MB 는 후기 사진과 같은 값입니다. 앱이 올리기 전에 줄이므로(shrink)
-- 실제로는 훨씬 작습니다. 상한은 사고를 막는 것이지 기준이 아닙니다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('journal-photos', 'journal-photos', false, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── 3. 통 정책 ───────────────────────────────────────────────────────
-- 경로 맨 앞 칸이 **사람 id** 입니다: <uid>/<도시>.jpg
-- 일기는 나만 보는 것이라 여행 사진(052)처럼 「일행도 본다」가 없습니다.
-- 그래서 규칙이 셋 다 같은 한 줄입니다 — 내 칸인가.
drop policy if exists jphotos_read on storage.objects;
create policy jphotos_read on storage.objects for select
  using (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists jphotos_write on storage.objects;
create policy jphotos_write on storage.objects for insert
  with check (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 같은 도시에 사진을 다시 올리면 덮어씁니다(upsert). update 도 열어야 합니다.
drop policy if exists jphotos_update on storage.objects;
create policy jphotos_update on storage.objects for update
  using (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists jphotos_del on storage.objects;
create policy jphotos_del on storage.objects for delete
  using (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 확인 ────────────────────────────────────────────────────────────
-- ① 칸이 생겼는지
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name   = 'city_ratings'
   and column_name  = 'journal_photo';

-- ② 통이 비공개인지 (public 이 false 여야 합니다)
select id, public, file_size_limit from storage.buckets where id = 'journal-photos';

-- ③ 정책 넷이 있는지
select policyname from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
   and policyname like 'jphotos%'
 order by policyname;

-- ④ 공개 함수가 일기 사진을 안 내주는지 (0 줄이어야 정상입니다)
select 'city_comments 가 journal_photo 를 내줍니다 — 고치십시오' as 경고
  from pg_proc
 where proname = 'city_comments'
   and prosrc ilike '%journal_photo%';
