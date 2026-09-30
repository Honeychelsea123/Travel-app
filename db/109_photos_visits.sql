-- =====================================================================
-- 109 · 도시 사진 개편 칸 · 여러 번 간 도시 칸 (2026-09-30)
--
-- 사용자(2026-09-30):
--   「사진 가장 중요한건 관광지 어디다라는게 직관적으로 바로 알 수 있고 좀 이쁘게 해줘」
--   「성향은 여러번 똑같은 도시까지 녹일 수 있고 좀 더 다양성있게 로직을 짜보자」
--
-- 새 칸만 더합니다. 있으면 건너뛰고, 기존 자료는 하나도 안 건드립니다 — 여러 번 돌려도 같습니다.
-- 칸 단위 권한(grant/revoke)이 걸린 표가 아니라 새 칸도 표의 기존 규칙(RLS)을 그대로 따릅니다.
-- =====================================================================

-- ① 도시 사진 — 큰 칸용 사진 · 출처 페이지 · 라이선스
--    지금 image_url(가로 940·세로 350 안팎)은 목록 같은 작은 칸에 그대로 쓰고,
--    「넘기며 매기기」·도시 화면 맨 위 같은 큰 칸만 image_lg(세로 1080)를 씁니다.
--    image_page · image_license 는 앱의 「사진 출처」 화면이 읽습니다(위키미디어 사진은 출처 표시가 의무).
alter table public.cities
  add column if not exists image_lg      text,
  add column if not exists image_page    text,
  add column if not exists image_license text;

-- ② 여러 번 간 도시 — 몇 번 가봤는지(1~5, 5 는 «5번 이상»). 비어 있으면 앱이 1번으로 봅니다.
--    ⚠ 남에게 보내지 않습니다. person_body 처럼 남에게 가는 함수는 칸을 골라 보내서(102·106)
--      이 칸을 안 읽습니다. 친구 화면에는 계산된 성향만 갑니다(그 칸은 성향 계산을 정한 뒤 따로).
alter table public.city_ratings
  add column if not exists visits smallint;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'city_ratings_visits_chk') then
    alter table public.city_ratings
      add constraint city_ratings_visits_chk check (visits is null or visits between 1 and 5);
  end if;
end $$;

-- 확인 — 두 칸 모두 true 면 끝입니다.
select
  exists (select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'cities' and column_name = 'image_lg')   as cities_ok,
  exists (select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'city_ratings' and column_name = 'visits') as ratings_ok;
