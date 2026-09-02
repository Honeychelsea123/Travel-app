-- =====================================================================
-- UN 195개국을 countries 에 다 넣습니다 (113개국 추가)
--
-- ⚠⚠ **075 보다 먼저 돌리십시오.** cities 를 넣는 SQL 은 currency 를
--   countries 에서 join 으로 가져오는데, **그 나라가 없으면 그 줄이
--   조용히 빠집니다.** 049 에서 비슈케크 하나가 그렇게 사라졌고, 지금은
--   88개국뿐이라 107개국이 통째로 빠집니다.
--
-- 이름:   CLDR 한국어(Intl.DisplayNames). 몇은 우리말에서 더 흔한 쪽으로
--         손봤습니다 — 호주 · 남아프리카공화국 · 콩고 공화국 ·
--         콩고 민주 공화국 · 중앙아프리카공화국 · 도미니카 연방.
-- 통화·공용어: GeoNames countryInfo.txt
-- 대륙:   un.js 의 UN_BY_CONT (아시아 48 · 유럽 44 · 아프리카 54 ·
--         북아메리카 23 · 남아메리카 12 · 오세아니아 14 = 195).
--   ⚠ 홈 화면의 대륙 캐러셀이 이 분모를 씁니다. 여기서 한 나라라도 다른
--     대륙에 넣으면 **같은 앱이 두 가지 수를 말합니다.**
-- 기본 시간대: 그 나라에서 인구가 제일 많은 도시의 시간대(GeoNames).
--
-- 여러 번 실행해도 안전합니다.
-- 만든 것: tools/citypick.pl — 손으로 고치지 말고 그쪽을 고치십시오.
-- =====================================================================

insert into public.countries (code, name, currency, local_lang, continent, default_timezone)
values
  ('AD', '안도라', 'EUR', 'ca', '유럽', 'Europe/Andorra'),
  ('AF', '아프가니스탄', 'AFN', 'fa', '아시아', 'Asia/Kabul'),
  ('AG', '앤티가 바부다', 'XCD', 'en', '북아메리카', 'America/Antigua'),
  ('AL', '알바니아', 'ALL', 'sq', '유럽', 'Europe/Tirane'),
  ('AM', '아르메니아', 'AMD', 'hy', '아시아', 'Asia/Yerevan'),
  ('AO', '앙골라', 'AOA', 'pt', '아프리카', 'Africa/Luanda'),
  ('BA', '보스니아 헤르체고비나', 'BAM', 'bs', '유럽', 'Europe/Sarajevo'),
  ('BB', '바베이도스', 'BBD', 'en', '북아메리카', 'America/Barbados'),
  ('BD', '방글라데시', 'BDT', 'bn', '아시아', 'Asia/Dhaka'),
  ('BF', '부르키나파소', 'XOF', 'fr', '아프리카', 'Africa/Ouagadougou'),
  ('BH', '바레인', 'BHD', 'ar', '아시아', 'Asia/Bahrain'),
  ('BI', '부룬디', 'BIF', 'fr', '아프리카', 'Africa/Bujumbura'),
  ('BJ', '베냉', 'XOF', 'fr', '아프리카', 'Africa/Porto-Novo'),
  ('BS', '바하마', 'BSD', 'en', '북아메리카', 'America/Nassau'),
  ('BT', '부탄', 'BTN', 'dz', '아시아', 'Asia/Thimphu'),
  ('BW', '보츠와나', 'BWP', 'en', '아프리카', 'Africa/Gaborone'),
  ('BY', '벨라루스', 'BYN', 'be', '유럽', 'Europe/Minsk'),
  ('BZ', '벨리즈', 'BZD', 'en', '북아메리카', 'America/Belize'),
  ('CD', '콩고 민주 공화국', 'CDF', 'fr', '아프리카', 'Africa/Kinshasa'),
  ('CF', '중앙아프리카공화국', 'XAF', 'fr', '아프리카', 'Africa/Bangui'),
  ('CG', '콩고 공화국', 'XAF', 'fr', '아프리카', 'Africa/Brazzaville'),
  ('CI', '코트디부아르', 'XOF', 'fr', '아프리카', 'Africa/Abidjan'),
  ('CM', '카메룬', 'XAF', 'en', '아프리카', 'Africa/Douala'),
  ('CV', '카보베르데', 'CVE', 'pt', '아프리카', 'Atlantic/Cape_Verde'),
  ('CY', '키프로스', 'EUR', 'el', '아시아', 'Asia/Nicosia'),
  ('DJ', '지부티', 'DJF', 'fr', '아프리카', 'Africa/Djibouti'),
  ('DM', '도미니카 연방', 'XCD', 'en', '북아메리카', 'America/Dominica'),
  ('DO', '도미니카 공화국', 'DOP', 'es', '북아메리카', 'America/Santo_Domingo'),
  ('DZ', '알제리', 'DZD', 'ar', '아프리카', 'Africa/Algiers'),
  ('ER', '에리트리아', 'ERN', 'aa', '아프리카', 'Africa/Asmara'),
  ('ET', '에티오피아', 'ETB', 'am', '아프리카', 'Africa/Addis_Ababa'),
  ('FM', '미크로네시아', 'USD', 'en', '오세아니아', 'Pacific/Chuuk'),
  ('GA', '가봉', 'XAF', 'fr', '아프리카', 'Africa/Libreville'),
  ('GD', '그레나다', 'XCD', 'en', '북아메리카', 'America/Grenada'),
  ('GH', '가나', 'GHS', 'en', '아프리카', 'Africa/Accra'),
  ('GM', '감비아', 'GMD', 'en', '아프리카', 'Africa/Banjul'),
  ('GN', '기니', 'GNF', 'fr', '아프리카', 'Africa/Conakry'),
  ('GQ', '적도 기니', 'XAF', 'es', '아프리카', 'Africa/Malabo'),
  ('GT', '과테말라', 'GTQ', 'es', '북아메리카', 'America/Guatemala'),
  ('GW', '기니비사우', 'XOF', 'pt', '아프리카', 'Africa/Bissau'),
  ('GY', '가이아나', 'GYD', 'en', '남아메리카', 'America/Guyana'),
  ('HN', '온두라스', 'HNL', 'es', '북아메리카', 'America/Tegucigalpa'),
  ('HT', '아이티', 'HTG', 'ht', '북아메리카', 'America/Port-au-Prince'),
  ('IQ', '이라크', 'IQD', 'ar', '아시아', 'Asia/Baghdad'),
  ('IR', '이란', 'IRR', 'fa', '아시아', 'Asia/Tehran'),
  ('JM', '자메이카', 'JMD', 'en', '북아메리카', 'America/Jamaica'),
  ('KI', '키리바시', 'AUD', 'en', '오세아니아', 'Pacific/Tarawa'),
  ('KM', '코모로', 'KMF', 'ar', '아프리카', 'Indian/Comoro'),
  ('KN', '세인트키츠 네비스', 'XCD', 'en', '북아메리카', 'America/St_Kitts'),
  ('KP', '북한', 'KPW', 'ko', '아시아', 'Asia/Pyongyang'),
  ('KW', '쿠웨이트', 'KWD', 'ar', '아시아', 'Asia/Kuwait'),
  ('LB', '레바논', 'LBP', 'ar', '아시아', 'Asia/Beirut'),
  ('LC', '세인트루시아', 'XCD', 'en', '북아메리카', 'America/St_Lucia'),
  ('LI', '리히텐슈타인', 'CHF', 'de', '유럽', 'Europe/Vaduz'),
  ('LR', '라이베리아', 'LRD', 'en', '아프리카', 'Africa/Monrovia'),
  ('LS', '레소토', 'LSL', 'en', '아프리카', 'Africa/Maseru'),
  ('LU', '룩셈부르크', 'EUR', 'lb', '유럽', 'Europe/Luxembourg'),
  ('LY', '리비아', 'LYD', 'ar', '아프리카', 'Africa/Tripoli'),
  ('MC', '모나코', 'EUR', 'fr', '유럽', 'Europe/Monaco'),
  ('MD', '몰도바', 'MDL', 'ro', '유럽', 'Europe/Chisinau'),
  ('ME', '몬테네그로', 'EUR', 'sr', '유럽', 'Europe/Podgorica'),
  ('MG', '마다가스카르', 'MGA', 'fr', '아프리카', 'Indian/Antananarivo'),
  ('MH', '마셜 제도', 'USD', 'mh', '오세아니아', 'Pacific/Majuro'),
  ('MK', '북마케도니아', 'MKD', 'mk', '유럽', 'Europe/Skopje'),
  ('ML', '말리', 'XOF', 'fr', '아프리카', 'Africa/Bamako'),
  ('MR', '모리타니', 'MRU', 'ar', '아프리카', 'Africa/Nouakchott'),
  ('MU', '모리셔스', 'MUR', 'en', '아프리카', 'Indian/Mauritius'),
  ('MW', '말라위', 'MWK', 'ny', '아프리카', 'Africa/Blantyre'),
  ('MZ', '모잠비크', 'MZN', 'pt', '아프리카', 'Africa/Maputo'),
  ('NA', '나미비아', 'NAD', 'en', '아프리카', 'Africa/Windhoek'),
  ('NE', '니제르', 'XOF', 'fr', '아프리카', 'Africa/Niamey'),
  ('NG', '나이지리아', 'NGN', 'en', '아프리카', 'Africa/Lagos'),
  ('NI', '니카라과', 'NIO', 'es', '북아메리카', 'America/Managua'),
  ('NR', '나우루', 'AUD', 'na', '오세아니아', 'Pacific/Nauru'),
  ('PA', '파나마', 'PAB', 'es', '북아메리카', 'America/Panama'),
  ('PG', '파푸아뉴기니', 'PGK', 'en', '오세아니아', 'Pacific/Port_Moresby'),
  ('PK', '파키스탄', 'PKR', 'ur', '아시아', 'Asia/Karachi'),
  ('PS', '팔레스타인', 'ILS', 'ar', '아시아', 'Asia/Hebron'),
  ('PW', '팔라우', 'USD', 'pau', '오세아니아', 'Pacific/Palau'),
  ('PY', '파라과이', 'PYG', 'es', '남아메리카', 'America/Asuncion'),
  ('RU', '러시아', 'RUB', 'ru', '유럽', 'Europe/Moscow'),
  ('RW', '르완다', 'RWF', 'rw', '아프리카', 'Africa/Kigali'),
  ('SB', '솔로몬 제도', 'SBD', 'en', '오세아니아', 'Pacific/Guadalcanal'),
  ('SC', '세이셸', 'SCR', 'en', '아프리카', 'Indian/Mahe'),
  ('SD', '수단', 'SDG', 'ar', '아프리카', 'Africa/Khartoum'),
  ('SL', '시에라리온', 'SLE', 'en', '아프리카', 'Africa/Freetown'),
  ('SM', '산마리노', 'EUR', 'it', '유럽', 'Europe/San_Marino'),
  ('SN', '세네갈', 'XOF', 'fr', '아프리카', 'Africa/Dakar'),
  ('SO', '소말리아', 'SOS', 'so', '아프리카', 'Africa/Mogadishu'),
  ('SR', '수리남', 'SRD', 'nl', '남아메리카', 'America/Paramaribo'),
  ('SS', '남수단', 'SSP', 'en', '아프리카', 'Africa/Juba'),
  ('ST', '상투메 프린시페', 'STN', 'pt', '아프리카', 'Africa/Sao_Tome'),
  ('SV', '엘살바도르', 'USD', 'es', '북아메리카', 'America/El_Salvador'),
  ('SY', '시리아', 'SYP', 'ar', '아시아', 'Asia/Damascus'),
  ('SZ', '에스와티니', 'SZL', 'en', '아프리카', 'Africa/Mbabane'),
  ('TD', '차드', 'XAF', 'fr', '아프리카', 'Africa/Ndjamena'),
  ('TG', '토고', 'XOF', 'fr', '아프리카', 'Africa/Lome'),
  ('TJ', '타지키스탄', 'TJS', 'tg', '아시아', 'Asia/Dushanbe'),
  ('TL', '동티모르', 'USD', 'tet', '아시아', 'Asia/Dili'),
  ('TM', '투르크메니스탄', 'TMT', 'tk', '아시아', 'Asia/Ashgabat'),
  ('TO', '통가', 'TOP', 'to', '오세아니아', 'Pacific/Tongatapu'),
  ('TT', '트리니다드 토바고', 'TTD', 'en', '북아메리카', 'America/Port_of_Spain'),
  ('TV', '투발루', 'AUD', 'tvl', '오세아니아', 'Pacific/Funafuti'),
  ('UA', '우크라이나', 'UAH', 'uk', '유럽', 'Europe/Kyiv'),
  ('UG', '우간다', 'UGX', 'en', '아프리카', 'Africa/Kampala'),
  ('VA', '바티칸 시국', 'EUR', 'la', '유럽', 'Europe/Vatican'),
  ('VC', '세인트빈센트 그레나딘', 'XCD', 'en', '북아메리카', 'America/St_Vincent'),
  ('VE', '베네수엘라', 'VES', 'es', '남아메리카', 'America/Caracas'),
  ('VU', '바누아투', 'VUV', 'bi', '오세아니아', 'Pacific/Efate'),
  ('WS', '사모아', 'WST', 'sm', '오세아니아', 'Pacific/Apia'),
  ('YE', '예멘', 'YER', 'ar', '아시아', 'Asia/Aden'),
  ('ZM', '잠비아', 'ZMW', 'en', '아프리카', 'Africa/Lusaka'),
  ('ZW', '짐바브웨', 'ZWG', 'en', '아프리카', 'Africa/Harare')
on conflict (code) do nothing;

-- ── 확인 ─────────────────────────────────────────────────────────────
-- 1번이 195 이상이어야 합니다(괌·홍콩·마카오처럼 UN 회원국이 아닌 것도
-- 이미 들어 있어서 조금 더 큽니다).
select * from (
  select 1 as ord, 'countries 전체'::text as 확인, count(*)::text as 결과
    from public.countries
  union all
  select 2, '통화가 빈 나라',
         coalesce((select string_agg(code, ' ' order by code) from public.countries
                    where currency is null or currency = ''), '없음')
  union all
  select 3, '대륙이 빈 나라',
         coalesce((select string_agg(code, ' ' order by code) from public.countries
                    where continent is null or continent = ''), '없음')
) t order by ord;
