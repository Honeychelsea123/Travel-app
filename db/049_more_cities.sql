-- =====================================================================
-- 도시 목록 확장 — 171곳 추가
--
-- 이름도 좌표도 시간대도 **GeoNames 에서 그대로 가져온 것**입니다.
-- 우리가 한 판단은 "어느 도시를 넣을까" 하나뿐입니다.
--   근거 문서: Downloads/CITY-LIST-EXPANSION.md (한국인 출국 통계 기준 배분)
--   자료:      GeoNames cities500 (CC BY 4.0)
--
-- 한국어 이름이 GeoNames 에 없던 32곳만 음역했습니다(하이퐁·아유타야·보홀 등).
-- 그 경우에도 **좌표는 GeoNames 것**입니다. 지어낸 좌표는 하나도 없습니다.
--
-- transit_grade 는 인구로 정했습니다 — 100만↑ dense, 20만↑ normal, 그 아래
-- limited. 미국·캐나다·호주·뉴질랜드는 차로 다니는 곳이라 한 단계 낮췄습니다.
--
-- currency 는 countries 표에서 가져옵니다. **join 이라 그 나라가 countries 에
-- 없으면 그 줄은 조용히 빠집니다.** 아래 확인 쿼리가 몇 개 들어갔는지 셉니다.
--
-- 048 다음에 실행합니다. 여러 번 실행해도 안전합니다(on conflict do nothing).
-- =====================================================================

insert into public.cities
  (id, name, name_en, country, center_lat, center_lng, timezone, currency, transit_grade, fame)
select v.id, v.name, v.name_en, v.country, v.lat, v.lng, v.tz, c.currency, v.grade, v.fame
from (values
  ('sharjah', '샤르자', 'Sharjah', 'AE', 25.3342, 55.41221, 'Asia/Dubai', 'dense', 3),
  ('mendoza', '멘도사', 'Mendoza', 'AR', -32.88946, -68.84582, 'America/Argentina/Mendoza', 'limited', 3),
  ('ushuaia', '우수아이아', 'Ushuaia', 'AR', -54.81084, -68.31591, 'America/Argentina/Ushuaia', 'limited', 2),
  ('graz', '그라츠', 'Graz', 'AT', 47.06733, 15.44197, 'Europe/Vienna', 'normal', 3),
  ('linz', '린츠', 'Linz', 'AT', 48.30639, 14.28611, 'Europe/Vienna', 'normal', 3),
  ('canberra', '캔버라', 'Canberra', 'AU', -35.28346, 149.12807, 'Australia/Sydney', 'limited', 3),
  ('darwin', '다윈', 'Darwin', 'AU', -12.46113, 130.84185, 'Australia/Darwin', 'car', 3),
  ('newcastle', '뉴캐슬', 'Newcastle', 'AU', -32.92953, 151.7801, 'Australia/Sydney', 'limited', 3),
  ('antwerp', '안트베르펜', 'Antwerp', 'BE', 51.22047, 4.40026, 'Europe/Brussels', 'normal', 2),
  ('leuven', '뢰번', 'Leuven', 'BE', 50.87959, 4.70093, 'Europe/Brussels', 'limited', 3),
  ('brasilia', '브라질리아', 'Brasilia', 'BR', -15.77972, -47.92972, 'America/Sao_Paulo', 'dense', 3),
  ('salvador', '사우바도르', 'Salvador', 'BR', -12.97563, -38.49096, 'America/Bahia', 'dense', 3),
  ('jasper', '재스퍼', 'Jasper', 'CA', 52.87946, -118.08041, 'America/Edmonton', 'car', 2),
  ('victoria', '빅토리아', 'Victoria', 'CA', 48.4359, -123.35155, 'America/Vancouver', 'limited', 2),
  ('whistler', '휘슬러', 'Whistler', 'CA', 50.11817, -122.95396, 'America/Vancouver', 'car', 2),
  ('yellowknife', '옐로나이프', 'Yellowknife', 'CA', 62.45411, -114.37248, 'America/Edmonton', 'car', 3),
  ('bern', '베른', 'Bern', 'CH', 46.94809, 7.44744, 'Europe/Zurich', 'limited', 2),
  ('lausanne', '로잔', 'Lausanne', 'CH', 46.516, 6.63282, 'Europe/Zurich', 'limited', 3),
  ('montreux', '몽트뢰', 'Montreux', 'CH', 46.43301, 6.91143, 'Europe/Zurich', 'limited', 2),
  ('valparaiso', '발파라이소', 'Valparaiso', 'CL', -33.036, -71.62963, 'America/Santiago', 'normal', 3),
  ('dalian', '다롄', 'Dalian', 'CN', 38.91222, 121.60222, 'Asia/Shanghai', 'dense', 2),
  ('huangshan', '황산', 'Huangshan', 'CN', 29.71139, 118.3125, 'Asia/Shanghai', 'normal', 2),
  ('kunming', '쿤밍', 'Kunming', 'CN', 25.03889, 102.71833, 'Asia/Shanghai', 'dense', 2),
  ('nanjing', '난징', 'Nanjing', 'CN', 32.06167, 118.77778, 'Asia/Shanghai', 'dense', 2),
  ('sanya', '싼야', 'Sanya', 'CN', 18.25435, 109.50947, 'Asia/Shanghai', 'dense', 2),
  ('tianjin', '톈진', 'Tianjin', 'CN', 39.14222, 117.17667, 'Asia/Shanghai', 'dense', 2),
  ('weihai', '웨이하이', 'Weihai', 'CN', 37.50914, 122.11356, 'Asia/Shanghai', 'normal', 2),
  ('xiamen', '샤먼', 'Xiamen', 'CN', 24.47979, 118.08187, 'Asia/Shanghai', 'dense', 2),
  ('yanji', '연변', 'Yanji', 'CN', 42.88825, 129.50241, 'Asia/Shanghai', 'normal', 2),
  ('yantai', '옌타이', 'Yantai', 'CN', 37.47649, 121.44081, 'Asia/Shanghai', 'dense', 2),
  ('brno', '브르노', 'Brno', 'CZ', 49.19522, 16.60796, 'Europe/Prague', 'normal', 3),
  ('karlovyvary', '카를로비바리', 'Karlovy Vary', 'CZ', 50.23271, 12.87117, 'Europe/Prague', 'limited', 2),
  ('duesseldorf', '뒤셀도르프', 'Duesseldorf', 'DE', 51.22319, 6.77927, 'Europe/Berlin', 'normal', 2),
  ('fussen', '퓌센', 'Fussen', 'DE', 47.57143, 10.70171, 'Europe/Berlin', 'limited', 2),
  ('nuremberg', '뉘른베르크', 'Nuremberg', 'DE', 49.45421, 11.07752, 'Europe/Berlin', 'normal', 2),
  ('stuttgart', '슈투트가르트', 'Stuttgart', 'DE', 48.78232, 9.17702, 'Europe/Berlin', 'normal', 3),
  ('alexandria', '알렉산드리아', 'Alexandria', 'EG', 31.20176, 29.91582, 'Africa/Cairo', 'dense', 2),
  ('aswan', '아스완', 'Aswan', 'EG', 24.09082, 32.89942, 'Africa/Cairo', 'normal', 2),
  ('hurghada', '후르가다', 'Hurghada', 'EG', 27.25738, 33.81291, 'Africa/Cairo', 'normal', 2),
  ('cordoba', '코르도바', 'Cordoba', 'ES', 37.89155, -4.77275, 'Europe/Madrid', 'normal', 2),
  ('malaga', '말라가', 'Malaga', 'ES', 36.72016, -4.42034, 'Europe/Madrid', 'normal', 2),
  ('ronda', '론다', 'Ronda', 'ES', 36.74231, -5.16709, 'Europe/Madrid', 'limited', 2),
  ('segovia', '세고비아', 'Segovia', 'ES', 40.94808, -4.11839, 'Europe/Madrid', 'limited', 2),
  ('toledo', '톨레도', 'Toledo', 'ES', 39.8581, -4.02263, 'Europe/Madrid', 'limited', 2),
  ('annecy', '안시', 'Annecy', 'FR', 45.90878, 6.12565, 'Europe/Paris', 'limited', 2),
  ('avignon', '아비뇽', 'Avignon', 'FR', 43.94834, 4.80892, 'Europe/Paris', 'limited', 2),
  ('colmar', '콜마르', 'Colmar', 'FR', 48.08078, 7.35584, 'Europe/Paris', 'limited', 2),
  ('toulouse', '툴루즈', 'Toulouse', 'FR', 43.60426, 1.44367, 'Europe/Paris', 'normal', 3),
  ('versailles', '베르사유', 'Versailles', 'FR', 48.80359, 2.13424, 'Europe/Paris', 'limited', 2),
  ('belfast', '벨파스트', 'Belfast', 'GB', 54.59682, -5.92541, 'Europe/London', 'normal', 3),
  ('brighton', '브라이턴', 'Brighton', 'GB', 50.82838, -0.13947, 'Europe/London', 'normal', 3),
  ('corfu', '코르푸', 'Corfu', 'GR', 39.62441, 19.92016, 'Europe/Athens', 'limited', 2),
  ('meteora', '메테오라', 'Meteora', 'GR', 39.70444, 21.62694, 'Europe/Athens', 'limited', 2),
  ('rhodes', '로도스', 'Rhodes', 'GR', 36.43556, 28.22199, 'Europe/Athens', 'limited', 2),
  ('rovinj', '로비니', 'Rovinj', 'HR', 45.08268, 13.63457, 'Europe/Zagreb', 'limited', 3),
  ('zadar', '자다르', 'Zadar', 'HR', 44.11578, 15.22514, 'Europe/Zagreb', 'limited', 2),
  ('bandung', '반둥', 'Bandung', 'ID', -6.92222, 107.60694, 'Asia/Jakarta', 'dense', 2),
  ('batam', '바탐', 'Batam', 'ID', 1.14937, 104.02491, 'Asia/Jakarta', 'dense', 3),
  ('surabaya', '수라바야', 'Surabaya', 'ID', -7.24917, 112.75083, 'Asia/Jakarta', 'dense', 3),
  ('amritsar', '암리차르', 'Amritsar', 'IN', 31.62234, 74.87534, 'Asia/Kolkata', 'dense', 2),
  ('bengaluru', '벵갈루루', 'Bengaluru', 'IN', 12.97194, 77.59369, 'Asia/Kolkata', 'dense', 3),
  ('chennai', '첸나이', 'Chennai', 'IN', 13.08784, 80.27847, 'Asia/Kolkata', 'dense', 3),
  ('kolkata', '콜카타', 'Kolkata', 'IN', 22.56263, 88.36304, 'Asia/Kolkata', 'dense', 2),
  ('udaipur', '우다이푸르', 'Udaipur', 'IN', 24.58584, 73.71346, 'Asia/Kolkata', 'normal', 2),
  ('bari', '바리', 'Bari', 'IT', 41.12066, 16.86982, 'Europe/Rome', 'normal', 3),
  ('catania', '카타니아', 'Catania', 'IT', 37.49223, 15.07041, 'Europe/Rome', 'normal', 3),
  ('genoa', '제노바', 'Genoa', 'IT', 44.40478, 8.94439, 'Europe/Rome', 'normal', 3),
  ('ravenna', '라벤나', 'Ravenna', 'IT', 44.41344, 12.20121, 'Europe/Rome', 'limited', 3),
  ('sorrento', '소렌토', 'Sorrento', 'IT', 40.62678, 14.37771, 'Europe/Rome', 'limited', 2),
  ('akita', '아키타', 'Akita', 'JP', 39.71667, 140.11667, 'Asia/Tokyo', 'normal', 3),
  ('asahikawa', '아사히카와', 'Asahikawa', 'JP', 43.77063, 142.36489, 'Asia/Tokyo', 'normal', 2),
  ('fukuyama', '후쿠야마', 'Fukuyama', 'JP', 34.48333, 133.36667, 'Asia/Tokyo', 'normal', 3),
  ('gifu', '기후', 'Gifu', 'JP', 35.42291, 136.76039, 'Asia/Tokyo', 'normal', 3),
  ('hirosaki', '히로사키', 'Hirosaki', 'JP', 40.59306, 140.4725, 'Asia/Tokyo', 'limited', 3),
  ('izumo', '이즈모', 'Izumo', 'JP', 35.36667, 132.76667, 'Asia/Tokyo', 'limited', 3),
  ('kitakyushu', '기타큐슈', 'Kitakyushu', 'JP', 33.85181, 130.85034, 'Asia/Tokyo', 'normal', 2),
  ('kofu', '고후', 'Kofu', 'JP', 35.66667, 138.56667, 'Asia/Tokyo', 'limited', 3),
  ('kurashiki', '구라시키', 'Kurashiki', 'JP', 34.58333, 133.76667, 'Asia/Tokyo', 'normal', 2),
  ('kure', '구레', 'Kure', 'JP', 34.23222, 132.56658, 'Asia/Tokyo', 'normal', 3),
  ('matsue', '마쓰에', 'Matsue', 'JP', 35.48333, 133.05, 'Asia/Tokyo', 'normal', 3),
  ('matsumoto', '마쓰모토', 'Matsumoto', 'JP', 36.23333, 137.96667, 'Asia/Tokyo', 'normal', 2),
  ('morioka', '모리오카', 'Morioka', 'JP', 39.7, 141.15, 'Asia/Tokyo', 'normal', 3),
  ('naha', '나하', 'Naha', 'JP', 26.213, 127.67851, 'Asia/Tokyo', 'normal', 1),
  ('odawara', '오다와라', 'Odawara', 'JP', 35.25556, 139.15972, 'Asia/Tokyo', 'limited', 2),
  ('oita', '오이타', 'Oita', 'JP', 33.23333, 131.6, 'Asia/Tokyo', 'normal', 2),
  ('okayama', '오카야마', 'Okayama', 'JP', 34.65, 133.93333, 'Asia/Tokyo', 'normal', 2),
  ('saga', '사가', 'Saga', 'JP', 33.23333, 130.3, 'Asia/Tokyo', 'normal', 3),
  ('sasebo', '사세보', 'Sasebo', 'JP', 33.16834, 129.72502, 'Asia/Tokyo', 'normal', 2),
  ('shimonoseki', '시모노세키', 'Shimonoseki', 'JP', 33.95548, 130.93713, 'Asia/Tokyo', 'normal', 3),
  ('tokushima', '도쿠시마', 'Tokushima', 'JP', 34.06667, 134.56667, 'Asia/Tokyo', 'normal', 3),
  ('tottorishi', '돗토리', 'Tottori-shi', 'JP', 35.5, 134.23333, 'Asia/Tokyo', 'limited', 3),
  ('uji', '우지', 'Uji', 'JP', 34.89044, 135.80325, 'Asia/Tokyo', 'limited', 2),
  ('yamaguchi', '야마구치', 'Yamaguchi', 'JP', 34.18333, 131.46667, 'Asia/Tokyo', 'limited', 3),
  ('yufuin', '유후인', 'Yufuin', 'JP', 33.26367, 131.35597, 'Asia/Tokyo', 'limited', 1),
  ('bishkek', '비슈케크', 'Bishkek', 'KG', 42.87, 74.59, 'Asia/Bishkek', 'normal', 3),
  ('sihanoukville', '시아누크빌', 'Sihanoukville', 'KH', 10.60932, 103.52958, 'Asia/Phnom_Penh', 'limited', 2),
  ('asan', '아산', 'Asan', 'KR', 36.78361, 127.00417, 'Asia/Seoul', 'limited', 3),
  ('boryeong', '보령', 'Boryeong', 'KR', 36.34931, 126.59772, 'Asia/Seoul', 'limited', 3),
  ('boseong', '보성', 'Boseong', 'KR', 34.77148, 127.07996, 'Asia/Seoul', 'limited', 3),
  ('buyeo', '부여', 'Buyeo', 'KR', 36.27472, 126.90906, 'Asia/Seoul', 'limited', 3),
  ('changwon', '창원', 'Changwon', 'KR', 35.22806, 128.68111, 'Asia/Seoul', 'dense', 3),
  ('cheonan', '천안', 'Cheonan', 'KR', 36.8065, 127.1522, 'Asia/Seoul', 'normal', 3),
  ('cheongjusi', '청주', 'Cheongju-si', 'KR', 36.63722, 127.48972, 'Asia/Seoul', 'normal', 3),
  ('chinju', '진주', 'Chinju', 'KR', 35.19278, 128.08472, 'Asia/Seoul', 'normal', 3),
  ('damyang', '담양', 'Damyang', 'KR', 35.31889, 126.98389, 'Asia/Seoul', 'limited', 3),
  ('gapyeong', '가평', 'Gapyeong', 'KR', 37.83101, 127.51059, 'Asia/Seoul', 'limited', 2),
  ('gongju', '공주', 'Gongju', 'KR', 36.45556, 127.12472, 'Asia/Seoul', 'limited', 3),
  ('gunsan', '군산', 'Gunsan', 'KR', 35.97861, 126.71139, 'Asia/Seoul', 'normal', 3),
  ('kimhae', '김해', 'Kimhae', 'KR', 35.23417, 128.88111, 'Asia/Seoul', 'normal', 3),
  ('pyeongchang', '평창', 'Pyeongchang', 'KR', 37.37028, 128.39306, 'Asia/Seoul', 'limited', 2),
  ('sejong', '세종', 'Sejong', 'KR', 36.59245, 127.29223, 'Asia/Seoul', 'normal', 3),
  ('seogwipo', '서귀포', 'Seogwipo', 'KR', 33.25333, 126.56181, 'Asia/Seoul', 'limited', 1),
  ('suwon', '수원', 'Suwon', 'KR', 37.29111, 127.00889, 'Asia/Seoul', 'dense', 2),
  ('wonju', '원주', 'Wonju', 'KR', 37.35139, 127.94528, 'Asia/Seoul', 'normal', 3),
  ('yeongju', '영주', 'Yeongju', 'KR', 36.82167, 128.63083, 'Asia/Seoul', 'limited', 3),
  ('astana', '아스타나', 'Astana', 'KZ', 51.1801, 71.44598, 'Asia/Almaty', 'dense', 3),
  ('vangvieng', '방비엥', 'Vang Vieng', 'LA', 18.9235, 102.44784, 'Asia/Vientiane', 'limited', 2),
  ('galle', '갈레', 'Galle', 'LK', 6.0461, 80.2103, 'Asia/Colombo', 'limited', 2),
  ('jurmala', '유르말라', 'Jurmala', 'LV', 56.968, 23.77038, 'Europe/Riga', 'limited', 2),
  ('sigulda', '시굴다', 'Sigulda', 'LV', 57.15375, 24.85953, 'Europe/Riga', 'limited', 2),
  ('agadir', '아가디르', 'Agadir', 'MA', 30.42018, -9.59815, 'Africa/Casablanca', 'normal', 3),
  ('rabat', '라바트', 'Rabat', 'MA', 34.01325, -6.83255, 'Africa/Casablanca', 'dense', 3),
  ('tangier', '탕헤르', 'Tangier', 'MA', 35.76727, -5.79975, 'Africa/Casablanca', 'dense', 2),
  ('guadalajara', '과달라하라', 'Guadalajara', 'MX', 20.67738, -103.34749, 'America/Mexico_City', 'dense', 3),
  ('guanajuato', '과나후아토', 'Guanajuato', 'MX', 21.01858, -101.2591, 'America/Mexico_City', 'limited', 2),
  ('monterrey', '몬테레이', 'Monterrey', 'MX', 25.68435, -100.31721, 'America/Monterrey', 'dense', 3),
  ('ipoh', '이포', 'Ipoh', 'MY', 4.5841, 101.0829, 'Asia/Kuala_Lumpur', 'normal', 3),
  ('johorbahru', '조호르바루', 'Johor Bahru', 'MY', 1.4655, 103.7578, 'Asia/Kuala_Lumpur', 'normal', 3),
  ('delft', '델프트', 'Delft', 'NL', 52.00667, 4.35556, 'Europe/Amsterdam', 'limited', 2),
  ('haarlem', '하를럼', 'Haarlem', 'NL', 52.38084, 4.63683, 'Europe/Amsterdam', 'limited', 3),
  ('maastricht', '마스트리흐트', 'Maastricht', 'NL', 50.84833, 5.68889, 'Europe/Amsterdam', 'limited', 3),
  ('thehague', '헤이그', 'The Hague', 'NL', 52.07667, 4.29861, 'Europe/Amsterdam', 'normal', 2),
  ('utrecht', '위트레흐트', 'Utrecht', 'NL', 52.09083, 5.12222, 'Europe/Amsterdam', 'normal', 2),
  ('stavanger', '스타방에르', 'Stavanger', 'NO', 58.97005, 5.73332, 'Europe/Oslo', 'limited', 3),
  ('dunedin', '더니든', 'Dunedin', 'NZ', -45.87416, 170.50361, 'Pacific/Auckland', 'car', 3),
  ('nelson', '넬슨', 'Nelson', 'NZ', -41.27078, 173.28404, 'Pacific/Auckland', 'car', 3),
  ('arequipa', '아레키파', 'Arequipa', 'PE', -16.39899, -71.53747, 'America/Lima', 'dense', 3),
  ('angelescity', '앙헬레스', 'Angeles City', 'PH', 15.15, 120.58333, 'Asia/Manila', 'normal', 2),
  ('bohol', '보홀', 'Bohol', 'PH', 9.65556, 123.85219, 'Asia/Manila', 'limited', 2),
  ('davao', '다바오', 'Davao', 'PH', 7.07306, 125.61278, 'Asia/Manila', 'dense', 3),
  ('gdansk', '그단스크', 'Gdansk', 'PL', 54.35227, 18.64912, 'Europe/Warsaw', 'normal', 2),
  ('wroclaw', '브로츠와프', 'Wroclaw', 'PL', 51.10286, 17.03006, 'Europe/Warsaw', 'normal', 3),
  ('aveiro', '아베이루', 'Aveiro', 'PT', 40.64575, -8.64643, 'Europe/Lisbon', 'limited', 2),
  ('braga', '브라가', 'Braga', 'PT', 41.5514, -8.42311, 'Europe/Lisbon', 'limited', 3),
  ('coimbra', '코임브라', 'Coimbra', 'PT', 40.20686, -8.41996, 'Europe/Lisbon', 'limited', 2),
  ('faro', '파루', 'Faro', 'PT', 37.01869, -7.92716, 'Europe/Lisbon', 'limited', 2),
  ('lagos', '라구스', 'Lagos', 'PT', 37.10202, -8.67422, 'Europe/Lisbon', 'limited', 2),
  ('ayutthaya', '아유타야', 'Ayutthaya', 'TH', 14.35167, 100.57739, 'Asia/Bangkok', 'limited', 2),
  ('chiangrai', '치앙라이', 'Chiang Rai', 'TH', 19.90858, 99.8325, 'Asia/Bangkok', 'limited', 2),
  ('ankara', '앙카라', 'Ankara', 'TR', 39.91987, 32.85427, 'Europe/Istanbul', 'dense', 3),
  ('bursa', '부르사', 'Bursa', 'TR', 40.19559, 29.06013, 'Europe/Istanbul', 'dense', 3),
  ('izmir', '이즈미르', 'Izmir', 'TR', 38.41273, 27.13838, 'Europe/Istanbul', 'dense', 2),
  ('trabzon', '트라브존', 'Trabzon', 'TR', 41.005, 39.72694, 'Europe/Istanbul', 'normal', 3),
  ('chiayi', '자이', 'Chiayi', 'TW', 23.47917, 120.44889, 'Asia/Taipei', 'normal', 3),
  ('taitung', '타이둥', 'Taitung', 'TW', 22.75991, 121.14457, 'Asia/Taipei', 'limited', 3),
  ('yilan', '이란', 'Yilan', 'TW', 24.757, 121.753, 'Asia/Taipei', 'limited', 3),
  ('atlanta', '애틀랜타', 'Atlanta', 'US', 33.749, -84.38798, 'America/New_York', 'limited', 3),
  ('dallas', '댈러스', 'Dallas', 'US', 32.78306, -96.80667, 'America/Chicago', 'normal', 3),
  ('detroit', '디트로이트', 'Detroit', 'US', 42.33143, -83.04575, 'America/Detroit', 'limited', 3),
  ('houston', '휴스턴', 'Houston', 'US', 29.76328, -95.36327, 'America/Chicago', 'normal', 3),
  ('minneapolis', '미니애폴리스', 'Minneapolis', 'US', 44.97997, -93.26384, 'America/Chicago', 'limited', 3),
  ('sacramento', '새크라멘토', 'Sacramento', 'US', 38.58157, -121.4944, 'America/Los_Angeles', 'limited', 3),
  ('saltlakecity', '솔트레이크시티', 'Salt Lake City', 'US', 40.76078, -111.89105, 'America/Denver', 'limited', 3),
  ('bukhara', '부하라', 'Bukhara', 'UZ', 39.77026, 64.43069, 'Asia/Samarkand', 'normal', 2),
  ('khiva', '히바', 'Khiva', 'UZ', 41.38555, 60.36408, 'Asia/Samarkand', 'limited', 2),
  ('haiphong', '하이퐁', 'Haiphong', 'VN', 20.86481, 106.68345, 'Asia/Ho_Chi_Minh', 'dense', 2),
  ('phanthiet', '판티엣', 'Phan Thiet', 'VN', 10.92889, 108.10208, 'Asia/Ho_Chi_Minh', 'normal', 2),
  ('quinhon', '꾸이년', 'Qui Nhon', 'VN', 13.77648, 109.22367, 'Asia/Ho_Chi_Minh', 'normal', 2),
  ('vungtau', '붕따우', 'Vung Tau', 'VN', 10.34599, 107.08426, 'Asia/Ho_Chi_Minh', 'normal', 2),
  ('durban', '더반', 'Durban', 'ZA', -29.8579, 31.0292, 'Africa/Johannesburg', 'dense', 3),
  ('johannesburg', '요하네스버그', 'Johannesburg', 'ZA', -26.20227, 28.04363, 'Africa/Johannesburg', 'dense', 2)
) as v(id, name, name_en, country, lat, lng, tz, grade, fame)
join public.countries c on c.code = v.country
on conflict (id) do nothing;


-- ── 확인 ─────────────────────────────────────────────────────────────
-- 넣으려던 수와 실제로 들어간 수가 다르면 countries 에 없는 나라가 있는 것입니다.
select * from (
  select 1 as ord, '전체 도시'::text as check, count(*)::text as result from public.cities
  union all
  select 2, '이번에 넣으려던 것', '171'
  union all
  select 3, '시간대가 이상한 것',
         (select count(*)::text from public.cities x
           where not exists (select 1 from pg_timezone_names t where t.name = x.timezone))
  union all
  select 4, '좌표 없는 것', (select count(*)::text from public.cities
                              where center_lat is null or center_lng is null)
  union all
  select 5, '등급별',
         (select string_agg(g || ':' || n, ' ' order by g) from (
            select transit_grade as g, count(*)::text as n from public.cities
             group by transit_grade) s)
) t order by ord;
