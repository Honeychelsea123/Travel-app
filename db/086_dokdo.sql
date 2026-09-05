-- =====================================================================
-- 독도 추가 (726 → 727)
--
-- 사용자: 「그리고 독도도 추가해주고 울릉도 독도 생기면서 우측부분이
--   튀어나가게 되는데 지도 사이즈를 줄이더라도 한반도가 중앙정렬 하게
--   위치해주고 우측에 울릉도 독도 다 넣어줘」
--
-- 지도 쪽(가운데 정렬)은 b687 의 ctrymap.js 에서 했습니다. 여기는 자료입니다.
--
-- ── 좌표 ─────────────────────────────────────────────────────────────
-- 37.2426, 131.8664 — 동도 정상 부근. 위키백과(ko)와 국토지리정보원 값이
-- 소수 셋째 자리까지 같습니다.
-- ⚠ 울릉도(ulleung, 37.48453 / 130.90589)에서 동남쪽 87.4km 입니다.
--   지도에서 울릉도보다 «더 오른쪽·더 아래»에 찍히는 것이 맞습니다.
--
-- ── fame ─────────────────────────────────────────────────────────────
-- ⚠⚠ **fame 은 작을수록 유명합니다**(db/033). 1 = 누구나 아는 곳.
--   독도는 한국인이면 다 알지만 **「여행지로 아는 곳」은 아닙니다** — 배편이
--   날씨에 매여 있고 접안 자체가 자주 취소됩니다. 울릉도와 같은 **2** 로
--   둡니다. 1 로 두면 나라 카드에서 서울·부산과 같은 칸에 섭니다.
--
-- ── 사진 ─────────────────────────────────────────────────────────────
-- ⚠⚠ **image_url 을 비워 둡니다.** 지금 726곳이 «전부» 사진을 가지고
--   있는데(실측: image_url 이 빈 줄 0), 독도 사진만 제가 넣을 수 없습니다 —
--   사진은 Supabase 저장소(city-images/)에 올라가 있고 저는 올릴 권한이
--   없습니다. 비워 두면 카드에 글자 한 자가 대신 뜹니다(gsph).
--   → 사진을 `city-images/dokdo.jpg` 로 올린 뒤 맨 아래 UPDATE 한 줄을
--     돌리십시오. 그때까지는 이 한 곳만 사진이 없습니다.
--
-- 돌리는 법: Supabase SQL Editor 에 붙여넣고 Run.
-- =====================================================================

insert into cities
  (id, name, name_en, name_local, country, center_lat, center_lng, fame, summary, summary_url)
values
  ('dokdo', '독도', 'Dokdo', '독도', 'KR', 37.2426, 131.8664, 2,
   '동해 한가운데 솟은 화산섬. 동도와 서도, 그 둘레의 크고 작은 바위까지 91개로 이루어져 있습니다. 울릉도에서 배로 두 시간 남짓 걸리고, 파도가 잔잔한 날에만 접안합니다. 괭이갈매기가 번식하는 천연보호구역입니다.',
   'https://ko.wikipedia.org/wiki/%EB%8F%85%EB%8F%84')
on conflict (id) do update set
  name        = excluded.name,
  name_en     = excluded.name_en,
  name_local  = excluded.name_local,
  country     = excluded.country,
  center_lat  = excluded.center_lat,
  center_lng  = excluded.center_lng,
  fame        = excluded.fame,
  summary     = excluded.summary,
  summary_url = excluded.summary_url;

-- 확인: 727곳이어야 합니다.
select count(*) as 도시수 from cities;
select id, name, center_lat, center_lng, fame from cities where id = 'dokdo';

-- ── 사진을 올린 뒤에 ─────────────────────────────────────────────────
-- update cities
--    set image_url = 'https://qahqqhjleqfrsjiixnas.supabase.co/storage/v1/object/public/city-images/dokdo.jpg'
--  where id = 'dokdo';
