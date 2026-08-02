-- =====================================================================
-- 나라와 도시를 늘린다 (143 → 약 280곳)
--
-- 자주 가는 곳만 넣어뒀더니 목록이 얇았습니다.
-- 나라 26개, 도시 약 140곳을 더합니다.
--
-- 통화·언어·시간대는 나라에서, 이동 상수는 등급에서 따라옵니다 —
-- 004 의 트리거가 합니다. 여기서는 좌표·시간대·등급만 적습니다.
--
-- 이동 등급은 어림입니다. dense 만 도쿄에서 실측한 값이고 나머지는 판단입니다.
--
-- 018 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

-- ── 나라 ─────────────────────────────────────────────────────────────
insert into public.countries
  (code, name, name_en, currency, local_lang, continent, default_timezone) values
  ('NP','네팔','Nepal','NPR','ne','아시아','Asia/Kathmandu'),
  ('LK','스리랑카','Sri Lanka','LKR','si','아시아','Asia/Colombo'),
  ('MV','몰디브','Maldives','MVR','dv','아시아','Indian/Maldives'),
  ('BN','브루나이','Brunei','BND','ms','아시아','Asia/Brunei'),
  ('MN','몽골','Mongolia','MNT','mn','아시아','Asia/Ulaanbaatar'),
  ('UZ','우즈베키스탄','Uzbekistan','UZS','uz','아시아','Asia/Tashkent'),
  ('KZ','카자흐스탄','Kazakhstan','KZT','kk','아시아','Asia/Almaty'),
  ('GE','조지아','Georgia','GEL','ka','아시아','Asia/Tbilisi'),
  ('AZ','아제르바이잔','Azerbaijan','AZN','az','아시아','Asia/Baku'),
  ('JO','요르단','Jordan','JOD','ar','아시아','Asia/Amman'),
  ('SA','사우디아라비아','Saudi Arabia','SAR','ar','아시아','Asia/Riyadh'),
  ('OM','오만','Oman','OMR','ar','아시아','Asia/Muscat'),
  ('BG','불가리아','Bulgaria','BGN','bg','유럽','Europe/Sofia'),
  ('RO','루마니아','Romania','RON','ro','유럽','Europe/Bucharest'),
  ('RS','세르비아','Serbia','RSD','sr','유럽','Europe/Belgrade'),
  ('SI','슬로베니아','Slovenia','EUR','sl','유럽','Europe/Ljubljana'),
  ('SK','슬로바키아','Slovakia','EUR','sk','유럽','Europe/Bratislava'),
  ('EE','에스토니아','Estonia','EUR','et','유럽','Europe/Tallinn'),
  ('LV','라트비아','Latvia','EUR','lv','유럽','Europe/Riga'),
  ('LT','리투아니아','Lithuania','EUR','lt','유럽','Europe/Vilnius'),
  ('MT','몰타','Malta','EUR','mt','유럽','Europe/Malta'),
  ('CU','쿠바','Cuba','CUP','es','북아메리카','America/Havana'),
  ('CR','코스타리카','Costa Rica','CRC','es','북아메리카','America/Costa_Rica'),
  ('CO','콜롬비아','Colombia','COP','es','남아메리카','America/Bogota'),
  ('BO','볼리비아','Bolivia','BOB','es','남아메리카','America/La_Paz'),
  ('UY','우루과이','Uruguay','UYU','es','남아메리카','America/Montevideo'),
  ('TZ','탄자니아','Tanzania','TZS','sw','아프리카','Africa/Dar_es_Salaam'),
  ('TN','튀니지','Tunisia','TND','ar','아프리카','Africa/Tunis'),
  ('FJ','피지','Fiji','FJD','en','오세아니아','Pacific/Fiji'),
  ('PF','프렌치폴리네시아','French Polynesia','XPF','fr','오세아니아','Pacific/Tahiti')
on conflict (code) do update set
  name = excluded.name, name_en = excluded.name_en, currency = excluded.currency,
  local_lang = excluded.local_lang, continent = excluded.continent,
  default_timezone = excluded.default_timezone;

-- 일본은 나라별 맛집 사이트가 이미 붙어 있습니다. 새 나라는 비워 둡니다.


-- ── 도시 ─────────────────────────────────────────────────────────────
insert into public.cities
  (id, name, name_local, name_en, country, center_lat, center_lng, timezone, transit_grade)
values
  -- 일본
  ('nagasaki2','벳부','別府','Beppu','JP',33.2846,131.4914,'Asia/Tokyo','car'),
  ('kagoshima','가고시마','鹿児島','Kagoshima','JP',31.5966,130.5571,'Asia/Tokyo','limited'),
  ('takamatsu','다카마쓰','高松','Takamatsu','JP',34.3401,134.0434,'Asia/Tokyo','limited'),
  ('matsuyama','마쓰야마','松山','Matsuyama','JP',33.8416,132.7657,'Asia/Tokyo','limited'),
  ('aomori','아오모리','青森','Aomori','JP',40.8244,140.7400,'Asia/Tokyo','limited'),
  ('niigata','니가타','新潟','Niigata','JP',37.9161,139.0364,'Asia/Tokyo','limited'),
  ('shizuoka','시즈오카','静岡','Shizuoka','JP',34.9756,138.3828,'Asia/Tokyo','limited'),
  ('hakone','하코네','箱根','Hakone','JP',35.2324,139.1069,'Asia/Tokyo','car'),
  ('kamakura','가마쿠라','鎌倉','Kamakura','JP',35.3192,139.5467,'Asia/Tokyo','normal'),
  ('nikko','닛코','日光','Nikko','JP',36.7199,139.6982,'Asia/Tokyo','car'),
  ('himeji','히메지','姫路','Himeji','JP',34.8153,134.6855,'Asia/Tokyo','limited'),
  ('takayama','다카야마','高山','Takayama','JP',36.1461,137.2522,'Asia/Tokyo','car'),
  ('shirakawago','시라카와고','白川郷','Shirakawa-go','JP',36.2578,136.9063,'Asia/Tokyo','car'),
  ('nagano','나가노','長野','Nagano','JP',36.6485,138.1950,'Asia/Tokyo','limited'),
  ('otaru','오타루','小樽','Otaru','JP',43.1907,140.9947,'Asia/Tokyo','limited'),
  ('furano','후라노','富良野','Furano','JP',43.3421,142.3833,'Asia/Tokyo','car'),
  ('ishigaki','이시가키','石垣','Ishigaki','JP',24.3448,124.1572,'Asia/Tokyo','car'),
  ('miyakojima','미야코지마','宮古島','Miyakojima','JP',24.8055,125.2811,'Asia/Tokyo','car'),
  -- 한국
  ('daejeon','대전','대전','Daejeon','KR',36.3504,127.3845,'Asia/Seoul','normal'),
  ('gwangju','광주','광주','Gwangju','KR',35.1595,126.8526,'Asia/Seoul','normal'),
  ('ulsan','울산','울산','Ulsan','KR',35.5384,129.3114,'Asia/Seoul','limited'),
  ('pohang','포항','포항','Pohang','KR',36.0190,129.3435,'Asia/Seoul','car'),
  ('andong','안동','안동','Andong','KR',36.5684,128.7294,'Asia/Seoul','car'),
  ('tongyeong','통영','통영','Tongyeong','KR',34.8544,128.4331,'Asia/Seoul','car'),
  ('mokpo','목포','목포','Mokpo','KR',34.8118,126.3922,'Asia/Seoul','car'),
  ('suncheon','순천','순천','Suncheon','KR',34.9506,127.4872,'Asia/Seoul','car'),
  ('chuncheon','춘천','춘천','Chuncheon','KR',37.8813,127.7300,'Asia/Seoul','car'),
  ('geoje','거제','거제','Geoje','KR',34.8806,128.6211,'Asia/Seoul','car'),
  -- 대만 · 중화권
  ('tainan','타이난','臺南','Tainan','TW',22.9999,120.2270,'Asia/Taipei','limited'),
  ('jiufen','지우펀','九份','Jiufen','TW',25.1096,121.8443,'Asia/Taipei','car'),
  ('kenting','컨딩','墾丁','Kenting','TW',21.9476,120.7986,'Asia/Taipei','car'),
  ('hangzhou','항저우','杭州','Hangzhou','CN',30.2741,120.1551,'Asia/Shanghai','normal'),
  ('suzhou','쑤저우','蘇州','Suzhou','CN',31.2989,120.5853,'Asia/Shanghai','normal'),
  ('guilin','구이린','桂林','Guilin','CN',25.2736,110.2900,'Asia/Shanghai','car'),
  ('lijiang','리장','麗江','Lijiang','CN',26.8721,100.2299,'Asia/Shanghai','car'),
  ('harbin','하얼빈','哈爾濱','Harbin','CN',45.8038,126.5349,'Asia/Shanghai','normal'),
  ('chongqing','충칭','重慶','Chongqing','CN',29.5630,106.5516,'Asia/Shanghai','dense'),
  ('zhangjiajie','장자제','張家界','Zhangjiajie','CN',29.1170,110.4794,'Asia/Shanghai','car'),
  -- 동남아
  ('halong','하롱베이','Hạ Long','Ha Long','VN',20.9101,107.1839,'Asia/Ho_Chi_Minh','car'),
  ('hue','후에','Huế','Hue','VN',16.4637,107.5909,'Asia/Ho_Chi_Minh','car'),
  ('dalat','달랏','Đà Lạt','Da Lat','VN',11.9404,108.4583,'Asia/Ho_Chi_Minh','car'),
  ('sapa','사파','Sa Pa','Sa Pa','VN',22.3364,103.8438,'Asia/Ho_Chi_Minh','car'),
  ('kanchanaburi','칸차나부리','กาญจนบุรี','Kanchanaburi','TH',14.0227,99.5328,'Asia/Bangkok','car'),
  ('huahin','후아힌','หัวหิน','Hua Hin','TH',12.5684,99.9577,'Asia/Bangkok','car'),
  ('kohsamui','코사무이','เกาะสมุย','Koh Samui','TH',9.5120,100.0136,'Asia/Bangkok','car'),
  ('langkawi','랑카위','Langkawi','Langkawi','MY',6.3500,99.8000,'Asia/Kuala_Lumpur','car'),
  ('malacca','말라카','Melaka','Malacca','MY',2.1896,102.2501,'Asia/Kuala_Lumpur','car'),
  ('palawan','팔라완','Palawan','Palawan','PH',9.8349,118.7384,'Asia/Manila','car'),
  ('lombok','롬복','Lombok','Lombok','ID',-8.6500,116.3249,'Asia/Makassar','car'),
  ('yogyakarta','족자카르타','Yogyakarta','Yogyakarta','ID',-7.7956,110.3695,'Asia/Jakarta','limited'),
  ('luangprabang','루앙프라방','ຫຼວງພະບາງ','Luang Prabang','LA',19.8834,102.1347,'Asia/Vientiane','car'),
  ('bagan','바간','ပုဂံ','Bagan','MM',21.1717,94.8585,'Asia/Yangon','car'),
  ('bandarseri','반다르스리브가완','Bandar Seri Begawan','Bandar Seri Begawan','BN',4.9031,114.9398,'Asia/Brunei','car'),
  -- 남아시아
  ('agra','아그라','आगरा','Agra','IN',27.1767,78.0081,'Asia/Kolkata','car'),
  ('jaipur','자이푸르','जयपुर','Jaipur','IN',26.9124,75.7873,'Asia/Kolkata','limited'),
  ('varanasi','바라나시','वाराणसी','Varanasi','IN',25.3176,82.9739,'Asia/Kolkata','car'),
  ('goa','고아','गोवा','Goa','IN',15.2993,74.1240,'Asia/Kolkata','car'),
  ('kathmandu','카트만두','काठमाडौं','Kathmandu','NP',27.7172,85.3240,'Asia/Kathmandu','car'),
  ('pokhara','포카라','पोखरा','Pokhara','NP',28.2096,83.9856,'Asia/Kathmandu','car'),
  ('colombo','콜롬보','කොළඹ','Colombo','LK',6.9271,79.8612,'Asia/Colombo','limited'),
  ('kandy','캔디','මහනුවර','Kandy','LK',7.2906,80.6337,'Asia/Colombo','car'),
  ('male','말레','މާލެ','Male','MV',4.1755,73.5093,'Indian/Maldives','car'),
  -- 중앙아시아 · 코카서스 · 중동
  ('ulaanbaatar','울란바토르','Улаанбаатар','Ulaanbaatar','MN',47.8864,106.9057,'Asia/Ulaanbaatar','limited'),
  ('tashkent','타슈켄트','Toshkent','Tashkent','UZ',41.2995,69.2401,'Asia/Tashkent','normal'),
  ('samarkand','사마르칸트','Samarqand','Samarkand','UZ',39.6270,66.9750,'Asia/Tashkent','car'),
  ('almaty','알마티','Алматы','Almaty','KZ',43.2220,76.8512,'Asia/Almaty','normal'),
  ('tbilisi','트빌리시','თბილისი','Tbilisi','GE',41.7151,44.8271,'Asia/Tbilisi','limited'),
  ('baku','바쿠','Bakı','Baku','AZ',40.4093,49.8671,'Asia/Baku','normal'),
  ('amman','암만','عمان','Amman','JO',31.9454,35.9284,'Asia/Amman','car'),
  ('petra','페트라','البتراء','Petra','JO',30.3285,35.4444,'Asia/Amman','car'),
  ('riyadh','리야드','الرياض','Riyadh','SA',24.7136,46.6753,'Asia/Riyadh','car'),
  ('muscat','무스카트','مسقط','Muscat','OM',23.5880,58.3829,'Asia/Muscat','car'),
  ('antalya','안탈리아','Antalya','Antalya','TR',36.8969,30.7133,'Europe/Istanbul','car'),
  ('pamukkale','파묵칼레','Pamukkale','Pamukkale','TR',37.9203,29.1206,'Europe/Istanbul','car'),
  -- 유럽 (서·중부)
  ('lyon','리옹','Lyon','Lyon','FR',45.7640,4.8357,'Europe/Paris','normal'),
  ('marseille','마르세유','Marseille','Marseille','FR',43.2965,5.3698,'Europe/Paris','normal'),
  ('bordeaux','보르도','Bordeaux','Bordeaux','FR',44.8378,-0.5792,'Europe/Paris','normal'),
  ('strasbourg','스트라스부르','Strasbourg','Strasbourg','FR',48.5734,7.7521,'Europe/Paris','limited'),
  ('bruges','브뤼헤','Brugge','Bruges','BE',51.2093,3.2247,'Europe/Brussels','limited'),
  ('ghent','겐트','Gent','Ghent','BE',51.0543,3.7174,'Europe/Brussels','limited'),
  ('rotterdam','로테르담','Rotterdam','Rotterdam','NL',51.9244,4.4777,'Europe/Amsterdam','normal'),
  ('hamburg','함부르크','Hamburg','Hamburg','DE',53.5511,9.9937,'Europe/Berlin','dense'),
  ('cologne','쾰른','Köln','Cologne','DE',50.9375,6.9603,'Europe/Berlin','normal'),
  ('dresden','드레스덴','Dresden','Dresden','DE',51.0504,13.7373,'Europe/Berlin','normal'),
  ('heidelberg','하이델베르크','Heidelberg','Heidelberg','DE',49.3988,8.6724,'Europe/Berlin','limited'),
  ('geneva','제네바','Genève','Geneva','CH',46.2044,6.1432,'Europe/Zurich','normal'),
  ('lucerne','루체른','Luzern','Lucerne','CH',47.0502,8.3093,'Europe/Zurich','limited'),
  ('zermatt','체르마트','Zermatt','Zermatt','CH',46.0207,7.7491,'Europe/Zurich','car'),
  ('grindelwald','그린델발트','Grindelwald','Grindelwald','CH',46.6242,8.0414,'Europe/Zurich','car'),
  ('innsbruck','인스브루크','Innsbruck','Innsbruck','AT',47.2692,11.4041,'Europe/Vienna','limited'),
  ('hallstatt','할슈타트','Hallstatt','Hallstatt','AT',47.5622,13.6493,'Europe/Vienna','car'),
  ('cesky','체스키크룸로프','Český Krumlov','Cesky Krumlov','CZ',48.8127,14.3175,'Europe/Prague','car'),
  ('bratislava','브라티슬라바','Bratislava','Bratislava','SK',48.1486,17.1077,'Europe/Bratislava','limited'),
  ('ljubljana','류블랴나','Ljubljana','Ljubljana','SI',46.0569,14.5058,'Europe/Ljubljana','limited'),
  ('bled','블레드','Bled','Bled','SI',46.3683,14.1146,'Europe/Ljubljana','car'),
  ('zagreb','자그레브','Zagreb','Zagreb','HR',45.8150,15.9819,'Europe/Zagreb','normal'),
  ('split','스플리트','Split','Split','HR',43.5081,16.4402,'Europe/Zagreb','car'),
  ('belgrade','베오그라드','Београд','Belgrade','RS',44.7866,20.4489,'Europe/Belgrade','normal'),
  ('sofia','소피아','София','Sofia','BG',42.6977,23.3219,'Europe/Sofia','normal'),
  ('bucharest','부쿠레슈티','București','Bucharest','RO',44.4268,26.1025,'Europe/Bucharest','normal'),
  ('tallinn','탈린','Tallinn','Tallinn','EE',59.4370,24.7536,'Europe/Tallinn','limited'),
  ('riga','리가','Rīga','Riga','LV',56.9496,24.1052,'Europe/Riga','limited'),
  ('vilnius','빌뉴스','Vilnius','Vilnius','LT',54.6872,25.2797,'Europe/Vilnius','limited'),
  ('valletta','발레타','Valletta','Valletta','MT',35.8989,14.5146,'Europe/Malta','car'),
  -- 유럽 (남·북)
  ('valencia','발렌시아','València','Valencia','ES',39.4699,-0.3763,'Europe/Madrid','normal'),
  ('granada','그라나다','Granada','Granada','ES',37.1773,-3.5986,'Europe/Madrid','limited'),
  ('bilbao','빌바오','Bilbao','Bilbao','ES',43.2630,-2.9350,'Europe/Madrid','normal'),
  ('sansebastian','산세바스티안','Donostia','San Sebastian','ES',43.3183,-1.9812,'Europe/Madrid','limited'),
  ('mallorca','마요르카','Mallorca','Mallorca','ES',39.5696,2.6502,'Europe/Madrid','car'),
  ('sintra','신트라','Sintra','Sintra','PT',38.8029,-9.3817,'Europe/Lisbon','car'),
  ('madeira','마데이라','Madeira','Madeira','PT',32.6669,-16.9241,'Europe/Lisbon','car'),
  ('bologna','볼로냐','Bologna','Bologna','IT',44.4949,11.3426,'Europe/Rome','limited'),
  ('verona','베로나','Verona','Verona','IT',45.4384,10.9916,'Europe/Rome','limited'),
  ('siena','시에나','Siena','Siena','IT',43.3188,11.3308,'Europe/Rome','car'),
  ('pisa','피사','Pisa','Pisa','IT',43.7228,10.4017,'Europe/Rome','limited'),
  ('como','코모','Como','Como','IT',45.8081,9.0852,'Europe/Rome','car'),
  ('turin','토리노','Torino','Turin','IT',45.0703,7.6869,'Europe/Rome','normal'),
  ('palermo','팔레르모','Palermo','Palermo','IT',38.1157,13.3615,'Europe/Rome','limited'),
  ('amalfi','아말피','Amalfi','Amalfi','IT',40.6340,14.6027,'Europe/Rome','car'),
  ('mykonos','미코노스','Μύκονος','Mykonos','GR',37.4467,25.3289,'Europe/Athens','car'),
  ('crete','크레타','Κρήτη','Crete','GR',35.2401,24.8093,'Europe/Athens','car'),
  ('bergen','베르겐','Bergen','Bergen','NO',60.3913,5.3221,'Europe/Oslo','limited'),
  ('tromso','트롬쇠','Tromsø','Tromso','NO',69.6492,18.9553,'Europe/Oslo','car'),
  ('gothenburg','예테보리','Göteborg','Gothenburg','SE',57.7089,11.9746,'Europe/Stockholm','normal'),
  -- 영국 · 아일랜드
  ('manchester','맨체스터','Manchester','Manchester','GB',53.4808,-2.2426,'Europe/London','normal'),
  ('liverpool','리버풀','Liverpool','Liverpool','GB',53.4084,-2.9916,'Europe/London','normal'),
  ('oxford','옥스퍼드','Oxford','Oxford','GB',51.7520,-1.2577,'Europe/London','limited'),
  ('cambridge','케임브리지','Cambridge','Cambridge','GB',52.2053,0.1218,'Europe/London','limited'),
  ('bath','바스','Bath','Bath','GB',51.3811,-2.3590,'Europe/London','limited'),
  ('york','요크','York','York','GB',53.9600,-1.0873,'Europe/London','limited'),
  ('glasgow','글래스고','Glasgow','Glasgow','GB',55.8642,-4.2518,'Europe/London','normal'),
  ('galway','골웨이','Gaillimh','Galway','IE',53.2707,-9.0568,'Europe/Dublin','car'),
  -- 북미
  ('neworleans','뉴올리언스','New Orleans','New Orleans','US',29.9511,-90.0715,'America/Chicago','limited'),
  ('austin','오스틴','Austin','Austin','US',30.2672,-97.7431,'America/Chicago','car'),
  ('denver','덴버','Denver','Denver','US',39.7392,-104.9903,'America/Denver','car'),
  ('phoenix','피닉스','Phoenix','Phoenix','US',33.4484,-112.0740,'America/Phoenix','car'),
  ('sandiego','샌디에이고','San Diego','San Diego','US',32.7157,-117.1611,'America/Los_Angeles','car'),
  ('portland','포틀랜드','Portland','Portland','US',45.5152,-122.6784,'America/Los_Angeles','normal'),
  ('nashville','내슈빌','Nashville','Nashville','US',36.1627,-86.7816,'America/Chicago','car'),
  ('philadelphia','필라델피아','Philadelphia','Philadelphia','US',39.9526,-75.1652,'America/New_York','normal'),
  ('anchorage','앵커리지','Anchorage','Anchorage','US',61.2181,-149.9003,'America/Anchorage','car'),
  ('quebec','퀘벡','Québec','Quebec City','CA',46.8139,-71.2080,'America/Toronto','limited'),
  ('calgary','캘거리','Calgary','Calgary','CA',51.0447,-114.0719,'America/Edmonton','car'),
  ('banff','밴프','Banff','Banff','CA',51.1784,-115.5708,'America/Edmonton','car'),
  ('ottawa','오타와','Ottawa','Ottawa','CA',45.4215,-75.6972,'America/Toronto','normal'),
  ('tulum','툴룸','Tulum','Tulum','MX',20.2114,-87.4654,'America/Cancun','car'),
  ('oaxaca','오악사카','Oaxaca','Oaxaca','MX',17.0732,-96.7266,'America/Mexico_City','car'),
  ('havana','아바나','La Habana','Havana','CU',23.1136,-82.3666,'America/Havana','car'),
  ('sanjose','산호세','San José','San Jose','CR',9.9281,-84.0907,'America/Costa_Rica','car'),
  -- 남미
  ('bogota','보고타','Bogotá','Bogota','CO',4.7110,-74.0721,'America/Bogota','normal'),
  ('medellin','메데인','Medellín','Medellin','CO',6.2442,-75.5812,'America/Bogota','normal'),
  ('cartagena','카르타헤나','Cartagena','Cartagena','CO',10.3910,-75.4794,'America/Bogota','car'),
  ('quito','키토','Quito','Quito','EC',-0.1807,-78.4678,'America/Bogota','limited'),
  ('lapaz','라파스','La Paz','La Paz','BO',-16.4897,-68.1193,'America/La_Paz','limited'),
  ('uyuni','우유니','Uyuni','Uyuni','BO',-20.4597,-66.8250,'America/La_Paz','car'),
  ('montevideo','몬테비데오','Montevideo','Montevideo','UY',-34.9011,-56.1645,'America/Montevideo','normal'),
  -- 아프리카
  ('casablanca','카사블랑카','الدار البيضاء','Casablanca','MA',33.5731,-7.5898,'Africa/Casablanca','normal'),
  ('fes','페스','فاس','Fes','MA',34.0181,-5.0078,'Africa/Casablanca','car'),
  ('luxor','룩소르','الأقصر','Luxor','EG',25.6872,32.6396,'Africa/Cairo','car'),
  ('zanzibar','잔지바르','Zanzibar','Zanzibar','TZ',-6.1659,39.2026,'Africa/Dar_es_Salaam','car'),
  ('tunis','튀니스','تونس','Tunis','TN',36.8065,10.1815,'Africa/Tunis','limited'),
  -- 오세아니아 · 태평양
  ('perth','퍼스','Perth','Perth','AU',-31.9523,115.8613,'Australia/Perth','normal'),
  ('adelaide','애들레이드','Adelaide','Adelaide','AU',-34.9285,138.6007,'Australia/Adelaide','normal'),
  ('cairns','케언스','Cairns','Cairns','AU',-16.9186,145.7781,'Australia/Brisbane','car'),
  ('hobart','호바트','Hobart','Hobart','AU',-42.8821,147.3272,'Australia/Hobart','car'),
  ('wellington','웰링턴','Wellington','Wellington','NZ',-41.2866,174.7756,'Pacific/Auckland','normal'),
  ('christchurch','크라이스트처치','Christchurch','Christchurch','NZ',-43.5321,172.6362,'Pacific/Auckland','car'),
  ('rotorua','로토루아','Rotorua','Rotorua','NZ',-38.1368,176.2497,'Pacific/Auckland','car'),
  ('nadi','난디','Nadi','Nadi','FJ',-17.7765,177.4356,'Pacific/Fiji','car'),
  ('tahiti','타히티','Tahiti','Tahiti','PF',-17.6509,-149.4260,'Pacific/Tahiti','car')
on conflict (id) do update set
  name = excluded.name, name_local = excluded.name_local, name_en = excluded.name_en,
  country = excluded.country, center_lat = excluded.center_lat,
  center_lng = excluded.center_lng, timezone = excluded.timezone,
  transit_grade = excluded.transit_grade;


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '나라'::text as check,
         (select count(*)::text from public.countries) as n,
         (select count(*)::text from public.countries where continent is null) ||
         '개가 대륙 없음 (0이어야 함)' as note
  union all
  select 2, '도시', (select count(*)::text from public.cities),
         '자주 가는 곳 위주로 늘렸습니다'
  union all
  select 3, '시간대가 실재함',
         (select count(*)::text from public.cities ct
           where not exists (select 1 from pg_timezone_names z where z.name = ct.timezone)),
         '0이어야 합니다'
  union all
  select 4, '사진 없는 도시',
         (select count(*)::text from public.cities where image_url is null),
         '이어서 020 으로 채웁니다'
) t order by ord;
