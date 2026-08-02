-- =====================================================================
-- 시드 — 도시와 노선색
-- 001_schema.sql 다음에 실행합니다. 여러 번 실행해도 안전합니다.
--
-- cities 는 여행을 만들 때 trips 로 복사되는 "기본값 창고"일 뿐입니다.
-- 목록에 없는 도시로도 여행을 만들 수 있고, 그때는 AI 가 trips 를 직접 채웁니다.
-- =====================================================================

-- ── 도시 ─────────────────────────────────────────────────────────────
-- 좌표·시간대·통화·언어는 확정 값입니다.
-- 이동시간 상수(walk_*, transit_*)는 도쿄에서 실제로 쓰던 값이 컬럼 기본값이고,
-- 아래 도시들은 그것을 그대로 물려받습니다. 도쿄 밖에서는 아직 검증하지 않은
-- 숫자입니다 — 써 보면서 도시별로 고칠 자리입니다.
insert into public.cities
  (id, name, name_local, name_en, country, center_lat, center_lng,
   timezone, currency, local_lang, food_domains)
values
  ('tokyo',    '도쿄',    '東京',      'Tokyo',      'JP',  35.6812, 139.7671, 'Asia/Tokyo',      'JPY', 'ja', '{tabelog.com}'),
  ('osaka',    '오사카',  '大阪',      'Osaka',      'JP',  34.7025, 135.4959, 'Asia/Tokyo',      'JPY', 'ja', '{tabelog.com}'),
  ('kyoto',    '교토',    '京都',      'Kyoto',      'JP',  34.9858, 135.7588, 'Asia/Tokyo',      'JPY', 'ja', '{tabelog.com}'),
  ('fukuoka',  '후쿠오카','福岡',      'Fukuoka',    'JP',  33.5902, 130.4207, 'Asia/Tokyo',      'JPY', 'ja', '{tabelog.com}'),
  ('sapporo',  '삿포로',  '札幌',      'Sapporo',    'JP',  43.0686, 141.3508, 'Asia/Tokyo',      'JPY', 'ja', '{tabelog.com}'),
  ('okinawa',  '오키나와','沖縄',      'Okinawa',    'JP',  26.2124, 127.6809, 'Asia/Tokyo',      'JPY', 'ja', '{tabelog.com}'),
  ('seoul',    '서울',    '서울',      'Seoul',      'KR',  37.5665, 126.9780, 'Asia/Seoul',      'KRW', 'ko', '{blog.naver.com}'),
  ('busan',    '부산',    '부산',      'Busan',      'KR',  35.1796, 129.0756, 'Asia/Seoul',      'KRW', 'ko', '{blog.naver.com}'),
  ('jeju',     '제주',    '제주',      'Jeju',       'KR',  33.4996, 126.5312, 'Asia/Seoul',      'KRW', 'ko', '{blog.naver.com}'),
  ('taipei',   '타이베이','臺北',      'Taipei',     'TW',  25.0330, 121.5654, 'Asia/Taipei',     'TWD', 'zh', '{}'),
  ('hongkong', '홍콩',    '香港',      'Hong Kong',  'HK',  22.3193, 114.1694, 'Asia/Hong_Kong',  'HKD', 'zh', '{}'),
  ('bangkok',  '방콕',    'กรุงเทพฯ',  'Bangkok',    'TH',  13.7563, 100.5018, 'Asia/Bangkok',    'THB', 'th', '{}'),
  ('singapore','싱가포르','Singapore', 'Singapore',  'SG',   1.3521, 103.8198, 'Asia/Singapore',  'SGD', 'en', '{}'),
  ('danang',   '다낭',    'Đà Nẵng',   'Da Nang',    'VN',  16.0544, 108.2022, 'Asia/Ho_Chi_Minh','VND', 'vi', '{}'),
  ('paris',    '파리',    'Paris',     'Paris',      'FR',  48.8566,   2.3522, 'Europe/Paris',    'EUR', 'fr', '{}'),
  ('london',   '런던',    'London',    'London',     'GB',  51.5074,  -0.1278, 'Europe/London',   'GBP', 'en', '{}'),
  ('rome',     '로마',    'Roma',      'Rome',       'IT',  41.9028,  12.4964, 'Europe/Rome',     'EUR', 'it', '{}'),
  ('barcelona','바르셀로나','Barcelona','Barcelona', 'ES',  41.3874,   2.1686, 'Europe/Madrid',   'EUR', 'es', '{}'),
  ('newyork',  '뉴욕',    'New York',  'New York',   'US',  40.7128, -74.0060, 'America/New_York','USD', 'en', '{}'),
  ('losangeles','로스앤젤레스','Los Angeles','Los Angeles','US',34.0522,-118.2437,'America/Los_Angeles','USD','en','{}'),
  ('honolulu', '호놀룰루','Honolulu',  'Honolulu',   'US',  21.3069,-157.8583, 'Pacific/Honolulu','USD', 'en', '{}'),
  ('sydney',   '시드니',  'Sydney',    'Sydney',     'AU', -33.8688, 151.2093, 'Australia/Sydney','AUD', 'en', '{}')
on conflict (id) do update set
  name = excluded.name, name_local = excluded.name_local, name_en = excluded.name_en,
  country = excluded.country,
  center_lat = excluded.center_lat, center_lng = excluded.center_lng,
  timezone = excluded.timezone, currency = excluded.currency,
  local_lang = excluded.local_lang, food_domains = excluded.food_domains;


-- ── 도쿄 노선색 ──────────────────────────────────────────────────────
-- 도쿄 앱(index.html 의 LINES)에서 그대로 옮겼습니다. 각 사업자 공식 색입니다.
-- 도쿄는 역 안내판이 노선색이라, 앱에서 같은 색을 쓰면 메모를 읽지 않아도
-- "아, 주황색 긴자선" 하고 눈으로 찾게 됩니다.
--
-- sort 가 작을수록 먼저 봅니다. 긴 이름을 앞에 둬야 '세이부 신주쿠선'이
-- 도에이 '신주쿠선'으로 잘못 잡히지 않습니다.
-- dark_text = 밝은 색(은색·금색·연두·노랑)이라 글자를 검게 두는 것.
insert into public.transit_lines (city_id, name, color, dark_text, sort) values
  -- 사철 (이름이 겹칠 수 있어 먼저)
  ('tokyo','세이부 신주쿠선',    '#1C3F94', false,  1),
  ('tokyo','세이부 이케부쿠로선','#1C3F94', false,  2),
  ('tokyo','세이부선',           '#1C3F94', false,  3),
  ('tokyo','케이오 이노카시라선','#0075C2', false,  4),
  ('tokyo','케이오선',           '#DD0077', false,  5),
  ('tokyo','도부 스카이트리라인','#0F6CB6', false,  6),
  ('tokyo','도부 이세사키선',    '#0F6CB6', false,  7),
  ('tokyo','도부선',             '#0F6CB6', false,  8),
  ('tokyo','오다큐선',           '#2581C6', false,  9),
  ('tokyo','도요코선',           '#DA0442', false, 10),
  ('tokyo','덴엔토시선',         '#009BBF', false, 11),
  ('tokyo','나리타 익스프레스',  '#E60012', false, 12),
  ('tokyo','스카이라이너',       '#003894', false, 13),
  ('tokyo','케이세이',           '#003894', false, 14),
  ('tokyo','츠쿠바 익스프레스',  '#000098', false, 15),
  ('tokyo','게이큐',             '#DA0442', false, 16),
  ('tokyo','유리카모메',         '#0080C6', false, 17),
  ('tokyo','모노레일',           '#0072BC', false, 18),
  -- 도쿄메트로
  ('tokyo','긴자선',             '#FF9500', false, 20),
  ('tokyo','마루노우치선',       '#F62E36', false, 21),
  ('tokyo','히비야선',           '#B5B5AC', true,  22),
  ('tokyo','도자이선',           '#009BBF', false, 23),
  ('tokyo','치요다선',           '#00BB85', false, 24),
  ('tokyo','유라쿠초선',         '#C1A470', true,  25),
  ('tokyo','한조몬선',           '#8F76D6', false, 26),
  ('tokyo','난보쿠선',           '#00AC9B', false, 27),
  ('tokyo','후쿠토신선',         '#9C5E31', false, 28),
  -- 도에이
  ('tokyo','아사쿠사선',         '#E85298', false, 30),
  ('tokyo','미타선',             '#0079C2', false, 31),
  ('tokyo','신주쿠선',           '#6CBB5A', false, 32),
  ('tokyo','오에도선',           '#B6007A', false, 33),
  -- JR
  ('tokyo','야마노테선',         '#9ACD32', true,  40),
  ('tokyo','주오선',             '#F15A22', false, 41),
  ('tokyo','소부선',             '#FFD400', true,  42),
  ('tokyo','케이힌토호쿠선',     '#00B2E5', false, 43),
  ('tokyo','사이쿄선',           '#00AC9B', false, 44),
  ('tokyo','쇼난신주쿠라인',     '#E21F26', false, 45),
  ('tokyo','케이요선',           '#C9252F', false, 46),
  ('tokyo','요코스카선',         '#0067C0', false, 47),
  ('tokyo','조반선',             '#00B48D', false, 48)
on conflict (city_id, name) do update set
  color = excluded.color, dark_text = excluded.dark_text, sort = excluded.sort;
