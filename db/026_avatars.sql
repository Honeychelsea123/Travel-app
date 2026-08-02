-- =====================================================================
-- 프로필 사진을 올릴 수 있게 한다
--
-- 지금은 구글 계정 사진만 씁니다. 닉네임은 바꿀 수 있는데 사진은 못 바꿉니다.
--
-- 파일은 Storage 의 avatars 통에 넣고, 경로는 <내 id>/avatar.jpg 로 합니다.
-- 폴더 이름이 곧 주인이라 정책이 단순해집니다 — 남의 폴더에는 못 씁니다.
--
-- 통은 공개로 둡니다. 프로필 사진은 한 줄평 옆에 남에게 보이는 것이고,
-- 서명 주소를 쓰면 목록을 그릴 때마다 주소를 새로 받아와야 합니다.
-- 대신 파일 이름을 고정해 두어 옛 사진이 남지 않게 합니다.
--
-- 025 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];


-- ── 권한 ─────────────────────────────────────────────────────────────
-- 보는 것은 누구나. 쓰는 것은 자기 폴더에만.
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_write on storage.objects;
create policy avatars_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars'
              and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars'
         and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars'
              and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars'
         and (storage.foldername(name))[1] = auth.uid()::text);


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '사진 통'::text as check,
         case when exists (select 1 from storage.buckets where id='avatars')
              then 'OK' else 'X' end as result,
         '2MB 까지 · jpeg · png · webp'::text as note
  union all
  select 2, '공개로 읽기',
         case when (select public from storage.buckets where id='avatars')
              then 'OK' else 'X' end,
         '한 줄평 옆에 남에게 보이는 사진입니다'
  union all
  select 3, '내 폴더에만 쓰기',
         case when (select count(*) from pg_policies
                     where schemaname='storage' and tablename='objects'
                       and policyname like 'avatars_%') >= 4
              then 'OK' else 'X' end,
         '경로 앞이 내 id 여야 올릴 수 있습니다'
) t order by ord;
