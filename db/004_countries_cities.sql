-- =====================================================================
-- 나라 표를 만들고 도시를 늘린다
--
-- 001·002 를 이미 실행한 프로젝트에 덧붙이는 것입니다.
-- 003_verify.sql 로 확인한 뒤 이걸 실행하고, 005_verify_cities.sql 로 다시 확인합니다.
-- 여러 번 실행해도 안전합니다.
--
-- 왜 나라를 따로 두는가
--   통화와 언어는 도시의 성질이 아니라 나라의 성질입니다. 도시마다 적으면
--   같은 값을 수십 번 반복하게 되고, 한 번 틀리면 그 도시만 조용히 틀립니다.
--   맛집 사이트도 마찬가지입니다 — 타베로그는 '도쿄'가 아니라 '일본'의 것입니다.
--   (실제로 한국 식당 영수증에 타베로그 링크가 붙는 일이 있었습니다.)
--
-- 왜 이동시간 등급을 두는가
--   도쿄에서 잰 ×3.2+12 는 촘촘한 지하철을 전제한 숫자입니다.
--   차로 다니는 오키나와·괌·로스앤젤레스에 그대로 물려주면 틀린 값이 나옵니다.
--   **도쿄 값만 실측이고 나머지 등급은 어림입니다.** 써 보면서 고칠 자리입니다.
-- =====================================================================


-- ── 1. 나라 ──────────────────────────────────────────────────────────
create table if not exists public.countries (
  code         char(2) primary key,     -- ISO 3166-1 alpha-2
  name         text not null,           -- 한국어
  name_en      text not null,
  currency     char(3) not null,        -- ISO 4217
  local_lang   text,                    -- 주소를 어느 말로 적을지
  -- 그 나라에서 쓸 만한 맛집 사이트. 비어 있으면 구글맵만 붙입니다.
  food_domains text[] not null default '{}',
  created_at   timestamptz not null default now()
);
alter table public.countries enable row level security;
drop policy if exists countries_read on public.countries;
create policy countries_read on public.countries for select using (true);

insert into public.countries (code, name, name_en, currency, local_lang, food_domains) values
  ('JP','일본','Japan','JPY','ja','{tabelog.com}'),
  ('KR','한국','South Korea','KRW','ko','{blog.naver.com}'),
  ('TW','대만','Taiwan','TWD','zh','{}'),
  ('HK','홍콩','Hong Kong','HKD','zh','{openrice.com}'),
  ('MO','마카오','Macau','MOP','zh','{openrice.com}'),
  ('CN','중국','China','CNY','zh','{dianping.com}'),
  ('TH','태국','Thailand','THB','th','{}'),
  ('SG','싱가포르','Singapore','SGD','en','{}'),
  ('MY','말레이시아','Malaysia','MYR','ms','{}'),
  ('VN','베트남','Vietnam','VND','vi','{}'),
  ('PH','필리핀','Philippines','PHP','en','{}'),
  ('ID','인도네시아','Indonesia','IDR','id','{}'),
  ('KH','캄보디아','Cambodia','KHR','km','{}'),
  ('LA','라오스','Laos','LAK','lo','{}'),
  ('MM','미얀마','Myanmar','MMK','my','{}'),
  ('IN','인도','India','INR','hi','{}'),
  ('AE','아랍에미리트','United Arab Emirates','AED','ar','{}'),
  ('QA','카타르','Qatar','QAR','ar','{}'),
  ('TR','튀르키예','Turkey','TRY','tr','{}'),
  ('IL','이스라엘','Israel','ILS','he','{}'),
  ('AU','호주','Australia','AUD','en','{}'),
  ('NZ','뉴질랜드','New Zealand','NZD','en','{}'),
  ('GU','괌','Guam','USD','en','{}'),
  ('MP','북마리아나제도','Northern Mariana Islands','USD','en','{}'),
  ('FR','프랑스','France','EUR','fr','{}'),
  ('GB','영국','United Kingdom','GBP','en','{}'),
  ('IE','아일랜드','Ireland','EUR','en','{}'),
  ('IT','이탈리아','Italy','EUR','it','{}'),
  ('ES','스페인','Spain','EUR','es','{}'),
  ('PT','포르투갈','Portugal','EUR','pt','{}'),
  ('NL','네덜란드','Netherlands','EUR','nl','{}'),
  ('BE','벨기에','Belgium','EUR','nl','{}'),
  ('DE','독일','Germany','EUR','de','{}'),
  ('CZ','체코','Czechia','CZK','cs','{}'),
  ('AT','오스트리아','Austria','EUR','de','{}'),
  ('HU','헝가리','Hungary','HUF','hu','{}'),
  ('CH','스위스','Switzerland','CHF','de','{}'),
  ('DK','덴마크','Denmark','DKK','da','{}'),
  ('SE','스웨덴','Sweden','SEK','sv','{}'),
  ('NO','노르웨이','Norway','NOK','no','{}'),
  ('FI','핀란드','Finland','EUR','fi','{}'),
  ('IS','아이슬란드','Iceland','ISK','is','{}'),
  ('HR','크로아티아','Croatia','EUR','hr','{}'),
  ('GR','그리스','Greece','EUR','el','{}'),
  ('PL','폴란드','Poland','PLN','pl','{}'),
  ('US','미국','United States','USD','en','{}'),
  ('CA','캐나다','Canada','CAD','en','{}'),
  ('MX','멕시코','Mexico','MXN','es','{}'),
  ('BR','브라질','Brazil','BRL','pt','{}'),
  ('AR','아르헨티나','Argentina','ARS','es','{}'),
  ('PE','페루','Peru','PEN','es','{}'),
  ('CL','칠레','Chile','CLP','es','{}'),
  ('EG','이집트','Egypt','EGP','ar','{}'),
  ('MA','모로코','Morocco','MAD','ar','{}'),
  ('ZA','남아프리카공화국','South Africa','ZAR','en','{}'),
  ('KE','케냐','Kenya','KES','sw','{}')
on conflict (code) do update set
  name = excluded.name, name_en = excluded.name_en,
  currency = excluded.currency, local_lang = excluded.local_lang,
  food_domains = excluded.food_domains;


-- ── 2. 이동시간 등급 ─────────────────────────────────────────────────
-- 도시마다 숫자를 따로 적으면 관리가 안 됩니다. 등급 넷으로 묶습니다.
create table if not exists public.transit_grades (
  grade            text primary key,
  label            text not null,
  walk_max_km      numeric not null,
  walk_min_per_km  numeric not null,
  walk_base_min    numeric not null,
  transit_factor   numeric not null,
  transit_base_min numeric not null,
  note             text
);
alter table public.transit_grades enable row level security;
drop policy if exists grades_read on public.transit_grades;
create policy grades_read on public.transit_grades for select using (true);

insert into public.transit_grades
  (grade, label, walk_max_km, walk_min_per_km, walk_base_min,
   transit_factor, transit_base_min, note) values
  ('dense',  '지하철이 촘촘함', 1.3, 12, 2, 3.2, 12,
   '도쿄에서 실제로 재서 쓰던 값. 이 등급만 실측이다'),
  ('normal', '대중교통 보통',   1.2, 12, 2, 3.5, 13,
   '어림값. 환승과 배차 간격이 도쿄보다 길다고 본 것'),
  ('limited','대중교통 약함',   1.0, 12, 2, 4.0, 15,
   '어림값. 버스 위주이거나 배차가 뜸한 곳'),
  ('car',    '차로 다니는 곳',  0.8, 12, 2, 2.2, 10,
   '어림값. km당 시간은 짧지만 주차·픽업이 붙는다. 렌터카 전제')
on conflict (grade) do update set
  label = excluded.label,
  walk_max_km = excluded.walk_max_km, walk_min_per_km = excluded.walk_min_per_km,
  walk_base_min = excluded.walk_base_min,
  transit_factor = excluded.transit_factor, transit_base_min = excluded.transit_base_min,
  note = excluded.note;


-- ── 3. cities 를 나라·등급에 붙인다 ──────────────────────────────────
alter table public.cities add column if not exists transit_grade text
  references public.transit_grades default 'normal';

do $$ begin
  alter table public.cities
    add constraint cities_country_fk foreign key (country) references public.countries;
exception when duplicate_object then null;
     when others then raise notice '나라 FK 를 못 걸었습니다: %', sqlerrm;
end $$;

-- 새 도시를 넣을 때 통화·언어는 나라에서, 이동시간 상수는 등급에서 자동으로 채웁니다.
-- 도시마다 손으로 적지 않으므로 틀릴 자리가 없어집니다.
create or replace function public.fill_city_defaults()
returns trigger language plpgsql as $$
declare c public.countries%rowtype; g public.transit_grades%rowtype;
begin
  select * into c from public.countries where code = new.country;
  if found then
    new.currency   := coalesce(c.currency, new.currency);
    new.local_lang := coalesce(new.local_lang, c.local_lang);
  end if;

  select * into g from public.transit_grades where grade = new.transit_grade;
  if found then
    new.walk_max_km      := g.walk_max_km;
    new.walk_min_per_km  := g.walk_min_per_km;
    new.walk_base_min    := g.walk_base_min;
    new.transit_factor   := g.transit_factor;
    new.transit_base_min := g.transit_base_min;
  end if;
  return new;
end $$;

drop trigger if exists cities_fill on public.cities;
create trigger cities_fill before insert or update on public.cities
  for each row execute function public.fill_city_defaults();

-- food_domains 는 이제 나라가 갖습니다. 도시 것은 비워둡니다.
update public.cities set food_domains = '{}' where food_domains <> '{}';


-- ── 4. 도시 ──────────────────────────────────────────────────────────
-- currency·local_lang·이동시간 상수는 위 트리거가 채웁니다. 여기선 안 적습니다.
-- 좌표는 지도 중심으로 쓸 도심 좌표입니다. 소수점 넷째 자리면 충분합니다.
insert into public.cities
  (id, name, name_local, name_en, country, center_lat, center_lng, timezone, transit_grade)
values
  -- 일본
  ('tokyo',      '도쿄',      '東京',       'Tokyo',      'JP', 35.6812, 139.7671,'Asia/Tokyo','dense'),
  ('osaka',      '오사카',    '大阪',       'Osaka',      'JP', 34.7025, 135.4959,'Asia/Tokyo','dense'),
  ('kyoto',      '교토',      '京都',       'Kyoto',      'JP', 34.9858, 135.7588,'Asia/Tokyo','normal'),
  ('nagoya',     '나고야',    '名古屋',     'Nagoya',     'JP', 35.1709, 136.8815,'Asia/Tokyo','dense'),
  ('yokohama',   '요코하마',  '横浜',       'Yokohama',   'JP', 35.4658, 139.6222,'Asia/Tokyo','dense'),
  ('kobe',       '고베',      '神戸',       'Kobe',       'JP', 34.6900, 135.1955,'Asia/Tokyo','normal'),
  ('fukuoka',    '후쿠오카',  '福岡',       'Fukuoka',    'JP', 33.5902, 130.4207,'Asia/Tokyo','normal'),
  ('sapporo',    '삿포로',    '札幌',       'Sapporo',    'JP', 43.0686, 141.3508,'Asia/Tokyo','normal'),
  ('hakodate',   '하코다테',  '函館',       'Hakodate',   'JP', 41.7687, 140.7288,'Asia/Tokyo','limited'),
  ('sendai',     '센다이',    '仙台',       'Sendai',     'JP', 38.2682, 140.8694,'Asia/Tokyo','normal'),
  ('hiroshima',  '히로시마',  '広島',       'Hiroshima',  'JP', 34.3853, 132.4553,'Asia/Tokyo','normal'),
  ('nara',       '나라',      '奈良',       'Nara',       'JP', 34.6851, 135.8048,'Asia/Tokyo','limited'),
  ('kanazawa',   '가나자와',  '金沢',       'Kanazawa',   'JP', 36.5613, 136.6562,'Asia/Tokyo','limited'),
  ('nagasaki',   '나가사키',  '長崎',       'Nagasaki',   'JP', 32.7503, 129.8779,'Asia/Tokyo','limited'),
  ('kumamoto',   '구마모토',  '熊本',       'Kumamoto',   'JP', 32.8032, 130.7079,'Asia/Tokyo','limited'),
  ('beppu',      '벳푸',      '別府',       'Beppu',      'JP', 33.2846, 131.4914,'Asia/Tokyo','car'),
  ('okinawa',    '오키나와',  '沖縄',       'Okinawa',    'JP', 26.2124, 127.6809,'Asia/Tokyo','car'),
  -- 한국
  ('seoul',      '서울',      '서울',       'Seoul',      'KR', 37.5665, 126.9780,'Asia/Seoul','dense'),
  ('busan',      '부산',      '부산',       'Busan',      'KR', 35.1796, 129.0756,'Asia/Seoul','dense'),
  ('incheon',    '인천',      '인천',       'Incheon',    'KR', 37.4563, 126.7052,'Asia/Seoul','normal'),
  ('daegu',      '대구',      '대구',       'Daegu',      'KR', 35.8714, 128.6014,'Asia/Seoul','normal'),
  ('jeju',       '제주',      '제주',       'Jeju',       'KR', 33.4996, 126.5312,'Asia/Seoul','car'),
  ('gyeongju',   '경주',      '경주',       'Gyeongju',   'KR', 35.8562, 129.2247,'Asia/Seoul','car'),
  ('gangneung',  '강릉',      '강릉',       'Gangneung',  'KR', 37.7519, 128.8761,'Asia/Seoul','car'),
  ('sokcho',     '속초',      '속초',       'Sokcho',     'KR', 38.2070, 128.5918,'Asia/Seoul','car'),
  ('jeonju',     '전주',      '전주',       'Jeonju',     'KR', 35.8242, 127.1480,'Asia/Seoul','limited'),
  ('yeosu',      '여수',      '여수',       'Yeosu',      'KR', 34.7604, 127.6622,'Asia/Seoul','car'),
  -- 중화권
  ('taipei',     '타이베이',  '臺北',       'Taipei',     'TW', 25.0330, 121.5654,'Asia/Taipei','dense'),
  ('taichung',   '타이중',    '臺中',       'Taichung',   'TW', 24.1477, 120.6736,'Asia/Taipei','limited'),
  ('kaohsiung',  '가오슝',    '高雄',       'Kaohsiung',  'TW', 22.6273, 120.3014,'Asia/Taipei','normal'),
  ('hualien',    '화롄',      '花蓮',       'Hualien',    'TW', 23.9871, 121.6015,'Asia/Taipei','car'),
  ('hongkong',   '홍콩',      '香港',       'Hong Kong',  'HK', 22.3193, 114.1694,'Asia/Hong_Kong','dense'),
  ('macau',      '마카오',    '澳門',       'Macau',      'MO', 22.1987, 113.5439,'Asia/Macau','normal'),
  ('shanghai',   '상하이',    '上海',       'Shanghai',   'CN', 31.2304, 121.4737,'Asia/Shanghai','dense'),
  ('beijing',    '베이징',    '北京',       'Beijing',    'CN', 39.9042, 116.4074,'Asia/Shanghai','dense'),
  ('guangzhou',  '광저우',    '廣州',       'Guangzhou',  'CN', 23.1291, 113.2644,'Asia/Shanghai','dense'),
  ('shenzhen',   '선전',      '深圳',       'Shenzhen',   'CN', 22.5431, 114.0579,'Asia/Shanghai','dense'),
  ('xian',       '시안',      '西安',       'Xian',       'CN', 34.3416, 108.9398,'Asia/Shanghai','normal'),
  ('chengdu',    '청두',      '成都',       'Chengdu',    'CN', 30.5728, 104.0668,'Asia/Shanghai','normal'),
  ('qingdao',    '칭다오',    '青島',       'Qingdao',    'CN', 36.0671, 120.3826,'Asia/Shanghai','normal'),
  -- 동남아
  ('bangkok',    '방콕',      'กรุงเทพฯ',   'Bangkok',    'TH', 13.7563, 100.5018,'Asia/Bangkok','normal'),
  ('chiangmai',  '치앙마이',  'เชียงใหม่',  'Chiang Mai', 'TH', 18.7883,  98.9853,'Asia/Bangkok','car'),
  ('phuket',     '푸껫',      'ภูเก็ต',     'Phuket',     'TH',  7.8804,  98.3923,'Asia/Bangkok','car'),
  ('pattaya',    '파타야',    'พัทยา',      'Pattaya',    'TH', 12.9236, 100.8825,'Asia/Bangkok','car'),
  ('krabi',      '끄라비',    'กระบี่',     'Krabi',      'TH',  8.0863,  98.9063,'Asia/Bangkok','car'),
  ('singapore',  '싱가포르',  'Singapore',  'Singapore',  'SG',  1.3521, 103.8198,'Asia/Singapore','dense'),
  ('kualalumpur','쿠알라룸푸르','Kuala Lumpur','Kuala Lumpur','MY',3.1390,101.6869,'Asia/Kuala_Lumpur','normal'),
  ('penang',     '페낭',      'Pulau Pinang','Penang',    'MY',  5.4141, 100.3288,'Asia/Kuala_Lumpur','car'),
  ('kotakinabalu','코타키나발루','Kota Kinabalu','Kota Kinabalu','MY',5.9804,116.0735,'Asia/Kuala_Lumpur','car'),
  ('danang',     '다낭',      'Đà Nẵng',    'Da Nang',    'VN', 16.0544, 108.2022,'Asia/Ho_Chi_Minh','car'),
  ('hanoi',      '하노이',    'Hà Nội',     'Hanoi',      'VN', 21.0278, 105.8342,'Asia/Ho_Chi_Minh','limited'),
  ('hochiminh',  '호치민',    'TP. Hồ Chí Minh','Ho Chi Minh City','VN',10.8231,106.6297,'Asia/Ho_Chi_Minh','limited'),
  ('nhatrang',   '나트랑',    'Nha Trang',  'Nha Trang',  'VN', 12.2388, 109.1967,'Asia/Ho_Chi_Minh','car'),
  ('phuquoc',    '푸꾸옥',    'Phú Quốc',   'Phu Quoc',   'VN', 10.2270, 103.9670,'Asia/Ho_Chi_Minh','car'),
  ('hoian',      '호이안',    'Hội An',     'Hoi An',     'VN', 15.8801, 108.3380,'Asia/Ho_Chi_Minh','car'),
  ('manila',     '마닐라',    'Maynila',    'Manila',     'PH', 14.5995, 120.9842,'Asia/Manila','limited'),
  ('cebu',       '세부',      'Cebu',       'Cebu',       'PH', 10.3157, 123.8854,'Asia/Manila','car'),
  ('boracay',    '보라카이',  'Boracay',    'Boracay',    'PH', 11.9674, 121.9248,'Asia/Manila','car'),
  ('bali',       '발리',      'Bali',       'Bali',       'ID', -8.4095, 115.1889,'Asia/Makassar','car'),
  ('jakarta',    '자카르타',  'Jakarta',    'Jakarta',    'ID', -6.2088, 106.8456,'Asia/Jakarta','limited'),
  ('siemreap',   '시엠립',    'សៀមរាប',     'Siem Reap',  'KH', 13.3671, 103.8448,'Asia/Phnom_Penh','car'),
  ('phnompenh',  '프놈펜',    'ភ្នំពេញ',    'Phnom Penh', 'KH', 11.5564, 104.9282,'Asia/Phnom_Penh','limited'),
  ('vientiane',  '비엔티안',  'ວຽງຈັນ',     'Vientiane',  'LA', 17.9757, 102.6331,'Asia/Vientiane','car'),
  ('yangon',     '양곤',      'ရန်ကုန်',    'Yangon',     'MM', 16.8661,  96.1951,'Asia/Yangon','limited'),
  -- 남아시아 · 중동
  ('delhi',      '델리',      'दिल्ली',     'Delhi',      'IN', 28.6139,  77.2090,'Asia/Kolkata','normal'),
  ('mumbai',     '뭄바이',    'मुंबई',      'Mumbai',     'IN', 19.0760,  72.8777,'Asia/Kolkata','normal'),
  ('dubai',      '두바이',    'دبي',        'Dubai',      'AE', 25.2048,  55.2708,'Asia/Dubai','normal'),
  ('abudhabi',   '아부다비',  'أبوظبي',     'Abu Dhabi',  'AE', 24.4539,  54.3773,'Asia/Dubai','car'),
  ('doha',       '도하',      'الدوحة',     'Doha',       'QA', 25.2854,  51.5310,'Asia/Qatar','car'),
  ('istanbul',   '이스탄불',  'İstanbul',   'Istanbul',   'TR', 41.0082,  28.9784,'Europe/Istanbul','normal'),
  ('cappadocia', '카파도키아','Kapadokya',  'Cappadocia', 'TR', 38.6431,  34.8289,'Europe/Istanbul','car'),
  ('telaviv',    '텔아비브',  'תל אביב',    'Tel Aviv',   'IL', 32.0853,  34.7818,'Asia/Jerusalem','normal'),
  -- 오세아니아 · 태평양
  ('sydney',     '시드니',    'Sydney',     'Sydney',     'AU',-33.8688, 151.2093,'Australia/Sydney','normal'),
  ('melbourne',  '멜버른',    'Melbourne',  'Melbourne',  'AU',-37.8136, 144.9631,'Australia/Melbourne','normal'),
  ('brisbane',   '브리즈번',  'Brisbane',   'Brisbane',   'AU',-27.4698, 153.0251,'Australia/Brisbane','normal'),
  ('goldcoast',  '골드코스트','Gold Coast', 'Gold Coast', 'AU',-28.0167, 153.4000,'Australia/Brisbane','car'),
  ('auckland',   '오클랜드',  'Auckland',   'Auckland',   'NZ',-36.8485, 174.7633,'Pacific/Auckland','car'),
  ('queenstown', '퀸스타운',  'Queenstown', 'Queenstown', 'NZ',-45.0312, 168.6626,'Pacific/Auckland','car'),
  ('guam',       '괌',        'Guam',       'Guam',       'GU', 13.4443, 144.7937,'Pacific/Guam','car'),
  ('saipan',     '사이판',    'Saipan',     'Saipan',     'MP', 15.1770, 145.7500,'Pacific/Saipan','car'),
  -- 유럽
  ('paris',      '파리',      'Paris',      'Paris',      'FR', 48.8566,   2.3522,'Europe/Paris','dense'),
  ('nice',       '니스',      'Nice',       'Nice',       'FR', 43.7102,   7.2620,'Europe/Paris','limited'),
  ('london',     '런던',      'London',     'London',     'GB', 51.5074,  -0.1278,'Europe/London','dense'),
  ('edinburgh',  '에든버러',  'Edinburgh',  'Edinburgh',  'GB', 55.9533,  -3.1883,'Europe/London','limited'),
  ('dublin',     '더블린',    'Dublin',     'Dublin',     'IE', 53.3498,  -6.2603,'Europe/Dublin','limited'),
  ('rome',       '로마',      'Roma',       'Rome',       'IT', 41.9028,  12.4964,'Europe/Rome','normal'),
  ('milan',      '밀라노',    'Milano',     'Milan',      'IT', 45.4642,   9.1900,'Europe/Rome','dense'),
  ('venice',     '베네치아',  'Venezia',    'Venice',     'IT', 45.4408,  12.3155,'Europe/Rome','limited'),
  ('florence',   '피렌체',    'Firenze',    'Florence',   'IT', 43.7696,  11.2558,'Europe/Rome','limited'),
  ('naples',     '나폴리',    'Napoli',     'Naples',     'IT', 40.8518,  14.2681,'Europe/Rome','normal'),
  ('barcelona',  '바르셀로나','Barcelona',  'Barcelona',  'ES', 41.3874,   2.1686,'Europe/Madrid','dense'),
  ('madrid',     '마드리드',  'Madrid',     'Madrid',     'ES', 40.4168,  -3.7038,'Europe/Madrid','dense'),
  ('seville',    '세비야',    'Sevilla',    'Seville',    'ES', 37.3891,  -5.9845,'Europe/Madrid','limited'),
  ('lisbon',     '리스본',    'Lisboa',     'Lisbon',     'PT', 38.7223,  -9.1393,'Europe/Lisbon','normal'),
  ('porto',      '포르투',    'Porto',      'Porto',      'PT', 41.1579,  -8.6291,'Europe/Lisbon','limited'),
  ('amsterdam',  '암스테르담','Amsterdam',  'Amsterdam',  'NL', 52.3676,   4.9041,'Europe/Amsterdam','normal'),
  ('brussels',   '브뤼셀',    'Brussel',    'Brussels',   'BE', 50.8476,   4.3572,'Europe/Brussels','normal'),
  ('berlin',     '베를린',    'Berlin',     'Berlin',     'DE', 52.5200,  13.4050,'Europe/Berlin','dense'),
  ('munich',     '뮌헨',      'München',    'Munich',     'DE', 48.1351,  11.5820,'Europe/Berlin','dense'),
  ('frankfurt',  '프랑크푸르트','Frankfurt', 'Frankfurt',  'DE', 50.1109,   8.6821,'Europe/Berlin','normal'),
  ('prague',     '프라하',    'Praha',      'Prague',     'CZ', 50.0755,  14.4378,'Europe/Prague','dense'),
  ('vienna',     '빈',        'Wien',       'Vienna',     'AT', 48.2082,  16.3738,'Europe/Vienna','dense'),
  ('salzburg',   '잘츠부르크','Salzburg',   'Salzburg',   'AT', 47.8095,  13.0550,'Europe/Vienna','limited'),
  ('budapest',   '부다페스트','Budapest',   'Budapest',   'HU', 47.4979,  19.0402,'Europe/Budapest','normal'),
  ('zurich',     '취리히',    'Zürich',     'Zurich',     'CH', 47.3769,   8.5417,'Europe/Zurich','normal'),
  ('interlaken', '인터라켄',  'Interlaken', 'Interlaken', 'CH', 46.6863,   7.8632,'Europe/Zurich','car'),
  ('copenhagen', '코펜하겐',  'København',  'Copenhagen', 'DK', 55.6761,  12.5683,'Europe/Copenhagen','normal'),
  ('stockholm',  '스톡홀름',  'Stockholm',  'Stockholm',  'SE', 59.3293,  18.0686,'Europe/Stockholm','normal'),
  ('oslo',       '오슬로',    'Oslo',       'Oslo',       'NO', 59.9139,  10.7522,'Europe/Oslo','normal'),
  ('helsinki',   '헬싱키',    'Helsinki',   'Helsinki',   'FI', 60.1699,  24.9384,'Europe/Helsinki','normal'),
  ('reykjavik',  '레이캬비크','Reykjavík',  'Reykjavik',  'IS', 64.1466, -21.9426,'Atlantic/Reykjavik','car'),
  ('dubrovnik',  '두브로브니크','Dubrovnik','Dubrovnik',  'HR', 42.6507,  18.0944,'Europe/Zagreb','car'),
  ('athens',     '아테네',    'Αθήνα',      'Athens',     'GR', 37.9838,  23.7275,'Europe/Athens','normal'),
  ('santorini',  '산토리니',  'Σαντορίνη',  'Santorini',  'GR', 36.3932,  25.4615,'Europe/Athens','car'),
  ('warsaw',     '바르샤바',  'Warszawa',   'Warsaw',     'PL', 52.2297,  21.0122,'Europe/Warsaw','normal'),
  ('krakow',     '크라쿠프',  'Kraków',     'Krakow',     'PL', 50.0647,  19.9450,'Europe/Warsaw','limited'),
  -- 북미
  ('newyork',    '뉴욕',      'New York',   'New York',   'US', 40.7128, -74.0060,'America/New_York','dense'),
  ('boston',     '보스턴',    'Boston',     'Boston',     'US', 42.3601, -71.0589,'America/New_York','normal'),
  ('washington', '워싱턴',    'Washington DC','Washington','US',38.9072, -77.0369,'America/New_York','normal'),
  ('chicago',    '시카고',    'Chicago',    'Chicago',    'US', 41.8781, -87.6298,'America/Chicago','normal'),
  ('miami',      '마이애미',  'Miami',      'Miami',      'US', 25.7617, -80.1918,'America/New_York','car'),
  ('orlando',    '올랜도',    'Orlando',    'Orlando',    'US', 28.5383, -81.3792,'America/New_York','car'),
  ('losangeles', '로스앤젤레스','Los Angeles','Los Angeles','US',34.0522,-118.2437,'America/Los_Angeles','car'),
  ('sanfrancisco','샌프란시스코','San Francisco','San Francisco','US',37.7749,-122.4194,'America/Los_Angeles','normal'),
  ('lasvegas',   '라스베이거스','Las Vegas', 'Las Vegas',  'US', 36.1699,-115.1398,'America/Los_Angeles','car'),
  ('seattle',    '시애틀',    'Seattle',    'Seattle',    'US', 47.6062,-122.3321,'America/Los_Angeles','normal'),
  ('honolulu',   '호놀룰루',  'Honolulu',   'Honolulu',   'US', 21.3069,-157.8583,'Pacific/Honolulu','car'),
  ('vancouver',  '밴쿠버',    'Vancouver',  'Vancouver',  'CA', 49.2827,-123.1207,'America/Vancouver','normal'),
  ('toronto',    '토론토',    'Toronto',    'Toronto',    'CA', 43.6532, -79.3832,'America/Toronto','normal'),
  ('montreal',   '몬트리올',  'Montréal',   'Montreal',   'CA', 45.5019, -73.5674,'America/Toronto','normal'),
  ('mexicocity', '멕시코시티','Ciudad de México','Mexico City','MX',19.4326,-99.1332,'America/Mexico_City','normal'),
  ('cancun',     '칸쿤',      'Cancún',     'Cancun',     'MX', 21.1619, -86.8515,'America/Cancun','car'),
  -- 남미
  ('rio',        '리우데자네이루','Rio de Janeiro','Rio de Janeiro','BR',-22.9068,-43.1729,'America/Sao_Paulo','limited'),
  ('saopaulo',   '상파울루',  'São Paulo',  'Sao Paulo',  'BR',-23.5505, -46.6333,'America/Sao_Paulo','normal'),
  ('buenosaires','부에노스아이레스','Buenos Aires','Buenos Aires','AR',-34.6037,-58.3816,'America/Argentina/Buenos_Aires','normal'),
  ('lima',       '리마',      'Lima',       'Lima',       'PE',-12.0464, -77.0428,'America/Lima','limited'),
  ('cusco',      '쿠스코',    'Cusco',      'Cusco',      'PE',-13.5319, -71.9675,'America/Lima','car'),
  ('santiago',   '산티아고',  'Santiago',   'Santiago',   'CL',-33.4489, -70.6693,'America/Santiago','normal'),
  -- 아프리카
  ('cairo',      '카이로',    'القاهرة',    'Cairo',      'EG', 30.0444,  31.2357,'Africa/Cairo','limited'),
  ('marrakech',  '마라케시',  'مراكش',      'Marrakech',  'MA', 31.6295,  -7.9811,'Africa/Casablanca','car'),
  ('capetown',   '케이프타운','Cape Town',  'Cape Town',  'ZA',-33.9249,  18.4241,'Africa/Johannesburg','car'),
  ('nairobi',    '나이로비',  'Nairobi',    'Nairobi',    'KE', -1.2921,  36.8219,'Africa/Nairobi','car')
on conflict (id) do update set
  name = excluded.name, name_local = excluded.name_local, name_en = excluded.name_en,
  country = excluded.country,
  center_lat = excluded.center_lat, center_lng = excluded.center_lng,
  timezone = excluded.timezone, transit_grade = excluded.transit_grade;


-- ── 5. trips 도 나라에서 맛집 사이트를 가져온다 ──────────────────────
-- 001 의 fill_trip_from_city 는 도시에서만 복사했습니다.
-- 이제 나라 값도 같이 채웁니다. 목록에 없는 도시로 만든 여행도
-- 나라만 맞으면 통화·언어가 제대로 들어갑니다.
create or replace function public.fill_trip_from_city()
returns trigger language plpgsql security definer set search_path = public as $$
declare c public.cities%rowtype; n public.countries%rowtype;
begin
  if new.city_id is not null then
    select * into c from public.cities where id = new.city_id;
    if found then
      new.country          := c.country;
      new.timezone         := c.timezone;
      new.center_lat       := coalesce(new.center_lat, c.center_lat);
      new.center_lng       := coalesce(new.center_lng, c.center_lng);
      new.walk_max_km      := c.walk_max_km;
      new.walk_min_per_km  := c.walk_min_per_km;
      new.walk_base_min    := c.walk_base_min;
      new.transit_factor   := c.transit_factor;
      new.transit_base_min := c.transit_base_min;
    end if;
  end if;

  -- 도시를 안 골랐어도 나라만 알면 통화와 언어는 정해집니다.
  select * into n from public.countries where code = new.country;
  if found then
    new.currency   := n.currency;
    new.local_lang := coalesce(new.local_lang, n.local_lang);
  end if;
  return new;
end $$;
