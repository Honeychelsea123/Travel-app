-- =====================================================================
-- 도시 사진을 우리 Storage 로 (버킷 만들기)
--
-- 지금 도시 사진은 **Pexels 서버에서 바로 끌어옵니다**(핫링크).
-- 남에게 앱을 열기 전에 옮겨야 합니다.
--   · 저쪽이 막거나 주소를 바꾸면 사진이 통째로 깨집니다
--   · 남의 대역폭을 쓰는 셈입니다
--   · 사진마다 원격 서버를 한 번씩 더 타서 첫 화면이 느립니다
--
-- Pexels 라이선스는 상업적 사용과 내려받아 쓰는 것을 허용합니다(재판매만 금지).
-- 촬영자는 image_credit 에 이미 저장돼 있습니다.
--
-- 옮기는 일 자체는 Edge Function(migrate-images)이 합니다 — 사진을 받아서
-- 올리고 주소를 바꾸는 일이라 SQL 로는 못 합니다. 여기서는 **담을 자리**만 만듭니다.
--
-- 047 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

-- 공개 버킷입니다. 도시 사진은 로그인 전 첫 화면에도 나오므로 누구나
-- 읽을 수 있어야 합니다. **쓰기는 service_role 만** 합니다(정책을 안 만들면
-- authenticated 는 못 씁니다 — 그게 우리가 원하는 것입니다).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('city-images', 'city-images', true, 3145728,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 3145728,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- 옮기기 전 주소를 남겨둡니다. 옮기다 잘못돼도 되돌릴 수 있어야 합니다.
alter table public.cities add column if not exists image_url_src text;

update public.cities
   set image_url_src = image_url
 where image_url is not null
   and image_url_src is null;


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '버킷'::text as check,
         coalesce((select 'city-images (' || case when public then '공개' else '비공개' end || ')'
                     from storage.buckets where id = 'city-images'), '(없음)') as result
  union all
  select 2, '사진 있는 도시', (select count(*)::text from public.cities where image_url is not null)
  union all
  select 3, '아직 바깥에 있는 것',
         (select count(*)::text from public.cities
           where image_url is not null and image_url not like '%/storage/v1/object/public/city-images/%')
  union all
  select 4, '우리 Storage 로 옮긴 것',
         (select count(*)::text from public.cities
           where image_url like '%/storage/v1/object/public/city-images/%')
  union all
  select 5, '되돌릴 원본 주소 보관', (select count(*)::text from public.cities where image_url_src is not null)
) t order by ord;
