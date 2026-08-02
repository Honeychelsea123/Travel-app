-- =====================================================================
-- 도시에 간단한 설명 칸을 만든다
--
-- 상세 페이지에 사진과 별점만 있으면 그 도시가 어떤 곳인지 알 수 없습니다.
-- 위키백과 요약 두어 문장을 받아 둡니다.
--
-- **출처를 반드시 적어야 합니다.** 위키백과 글은 CC BY-SA 라 사진(Pexels)과 달리
-- 표기 의무가 있습니다. 그래서 원문 주소를 같이 저장하고 화면에도 링크를 답니다.
--
-- 설명 자체는 023 에서 채웁니다.
--
-- 021 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

alter table public.cities add column if not exists summary     text;
alter table public.cities add column if not exists summary_url text;

select case when exists (
         select 1 from information_schema.columns
          where table_schema='public' and table_name='cities' and column_name='summary')
       then 'OK  설명 칸 준비됨 — 이어서 023 을 실행하세요'
       else 'X   칸이 안 생겼습니다' end as result;
