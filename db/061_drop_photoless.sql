-- =====================================================================
-- 사진을 못 구한 도시 22곳을 목록에서 뺀다
--
-- 한·일 지방도시입니다. Pexels 에서 이름으로 찾으면 어느 도시인지 알 수 없는
-- 일반 "한국"·"일본" 사진이 오고, 대표 명소 이름으로 다시 찾아봐도
-- 23곳 중 한 곳(공주 = 공산성)만 건졌습니다.
-- 나머지는 전부 "그 범주는 맞는데 그 장소라는 증거가 없는" 사진이었습니다 —
-- 열기구도 등불도 양도 소용돌이도 세계 어디에나 있습니다.
--
-- 사진 없이 첫 글자만 뜨게 두는 방법도 있지만, 목록에서 그 줄만 회색
-- 네모로 비어 보입니다. 한국인이 많이 가는 곳도 아니라 뺍니다.
--
-- **지우기 전에 확인했습니다. 22곳 다 아무 데도 안 쓰입니다** —
-- 별점 0 · 여행 0 · 구간 0 · 노선색 0. 아래에서 한 번 더 확인하고 지웁니다.
-- city_ratings 는 on delete cascade 라, 쓰이는 도시를 지우면 남의 별점이
-- 조용히 사라집니다. 그래서 세어보고 하나라도 있으면 멈춥니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

do $$
declare
  ids text[] := array[
    'surabaya',
    'akita','fukuyama','gifu','kofu','kure','morioka','oita','saga',
    'tokushima','yamaguchi',
    'asan','boryeong','cheonan','cheongjusi','chinju','gunsan','kimhae',
    'pyeongchang','sejong','wonju','yeongju'
  ];
  used int;
begin
  select
    (select count(*) from public.city_ratings  where city_id = any(ids)) +
    (select count(*) from public.trips         where city_id = any(ids)) +
    (select count(*) from public.trip_legs     where city_id = any(ids)) +
    (select count(*) from public.transit_lines where city_id = any(ids))
  into used;

  if used > 0 then
    raise exception '이 도시들이 %건 쓰이고 있습니다. 지우면 별점이 같이 사라집니다.', used;
  end if;

  delete from public.cities where id = any(ids);
  raise notice '지웠습니다: %', (select count(*) from unnest(ids));
end $$;

-- 확인
select count(*) as "도시 전체(469여야 함)" from public.cities;
select count(*) as "사진 없는 도시(0이어야 함)" from public.cities where image_url is null;
