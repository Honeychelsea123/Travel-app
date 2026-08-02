-- =====================================================================
-- 도시에 사진 칸을 만든다
--
-- 기록 화면이 왓챠처럼 목록 + 썸네일 + 별점 모양이라 사진이 필요합니다.
-- 글자만 있는 목록은 143줄이 다 똑같아 보입니다.
--
-- 사진 자체는 016 에서 채웁니다.
--
-- 014 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

alter table public.cities add column if not exists image_url text;

select case when exists (
         select 1 from information_schema.columns
          where table_schema='public' and table_name='cities' and column_name='image_url')
       then 'OK  사진 칸 준비됨 — 이어서 016 을 실행하세요'
       else 'X   칸이 안 생겼습니다' end as result;
