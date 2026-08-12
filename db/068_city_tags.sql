-- ─────────────────────────────────────────────────────────────────────
-- 068_city_tags.sql — 도시에 취향 태그를 답니다
--
-- **왜 필요한가.** 지금 추천은 전부 Gemini 에게 자료를 보여주고 부탁하는
-- 구조입니다. 그래서 세 가지가 따라옵니다:
--   · 같은 질문에 다른 답 (일관성 없음)
--   · 요청마다 비용 (무료 등급 1,500회/일을 여럿이 나눠 씀)
--   · **비행기모드에서 안 됨** — 앱의 다른 강점과 정면으로 부딪힙니다
--   · 규칙을 안 지킴 — "담아둔 곳은 빼라"를 실제로 세 번 어겼습니다
--
-- 태그가 있으면 취향 → 도시 매칭을 **계산으로** 할 수 있습니다.
-- 그러면 추천이 즉시 · 무료 · 일관되고 **오프라인에서도** 됩니다.
--
-- ⚠ **표를 따로 만들지 않고 `cities` 의 칸으로 둡니다.**
--   앱이 `cities` 를 통째로 localStorage 에 캐시하므로(`t2:cache:cities`),
--   칸으로 두면 태그가 **오프라인에 저절로 따라옵니다.**
--   별도 표면 따로 받아 따로 캐시해야 하고, 그러면 위의 제일 큰 장점이
--   사라집니다. 정규화보다 오프라인이 먼저입니다.
--
-- ## 태그를 어떻게 뽑았나
--
-- 처음에는 설명에서 **키워드로 뽑으려 했는데 안 됐습니다.** 설명이
-- 고유명사로 쓰여 있기 때문입니다 — 파리는 "루브르·오르세"라고 쓰지
-- "미술관"이라고 쓰지 않습니다. 실제로 재보니 파리에 `미술` 이 안 붙고
-- 제주에 `해변` 이 빠졌습니다. 469개 설명에서 8번 이상 나온 말을 세어봤더니
-- 상위가 전부 구조어(`세계유산`·`항구`·`당일치기`)였습니다.
--
-- 그래서 **LLM 을 실시간이 아니라 자료를 만들 때 한 번만** 썼습니다.
-- 40곳씩 묶어 설명을 읽히고 정해둔 열 개 중에서만 고르게 했습니다.
-- **이것이 이 제안의 핵심입니다** — LLM 은 자료를 만들고, 런타임은 계산합니다.
--
-- 태그 열 개: 해변 자연 온천 미술 유적 미식 도시 설상 축제 쇼핑
-- ─────────────────────────────────────────────────────────────────────

alter table public.cities add column if not exists tags text[] default '{}';

-- 태그로 도시를 고르는 일이 잦아집니다. GIN 이 배열 포함 검색을 받습니다.
create index if not exists cities_tags_idx on public.cities using gin (tags);

comment on column public.cities.tags is
  '취향 태그. 해변 자연 온천 미술 유적 미식 도시 설상 축제 쇼핑 중에서만.
   추천 계산에 씁니다. 설명(summary)을 LLM 에게 한 번 읽혀 뽑았습니다.';

-- ── 여기에 update 문이 들어갑니다 (아래에서 이어집니다) ──
update public.cities set tags = array['유적']
  where id in ('guanajuato','havana','cesky','heidelberg','tallinn','luxor','granada','rhodes','oxford','york','athens','ronda','split','mumbai','varanasi','agra','jaipur','bukhara','versailles','ravenna','ayutthaya','valparaiso','sharjah','matsue','uji','okayama','xiamen','belgrade','sacramento','yangon','bergen','kathmandu','christchurch','muscat','cusco','manila','krakow','sintra','samarkand');

update public.cities set tags = array['도시']
  where id in ('frankfurt','hamburg','copenhagen','helsinki','liverpool','venice','aveiro','brasilia','johannesburg','atlanta','detroit','utrecht','belfast','astana','yokohama','incheon','vientiane','marrakech','casablanca','rotterdam','auckland','wellington','nashville','lasvegas','sanfrancisco','orlando','tashkent');

update public.cities set tags = array['자연']
  where id in ('cairns','uyuni','interlaken','guilin','zhangjiajie','hangzhou','angelescity','tekapo','flam','vangvieng','nelson','ushuaia','stavanger','victoria','kunming','jasper','gapyeong','langkawi','kotakinabalu','tromso','palawan','hualien','seattle','sapa','halong');

update public.cities set tags = array['도시','미식']
  where id in ('buenosaires','guangzhou','chongqing','sasebo','melbourne','chiayi','dallas','haiphong','shimonoseki','hakodate','fukuoka','daegu','mokpo','yeosu','chuncheon','tongyeong','pohang','kualalumpur','shanghai','singapore','taichung','chicago');

update public.cities set tags = array['도시','유적']
  where id in ('bandarseri','bogota','prague','pisa','zadar','phnompenh','bern','coimbra','kitakyushu','amritsar','himeji','siemreap','gangneung','gyeongju','seoul','kandy','vilnius','riga','fes','bagan','bucharest','ljubljana');

update public.cities set tags = array['유적','미식']
  where id in ('bruges','xian','delhi','segovia','genoa','bari','toulouse','malacca','tianjin','hiroshima','macau','oaxaca','penang','lima','lisbon','tainan','boston','hanoi','hue');

update public.cities set tags = array['자연','유적']
  where id in ('lucerne','suzhou','hallstatt','fussen','catania','suncheon','lausanne','luangprabang','sigulda','plitvice','udaipur','chiangrai','dunedin','corfu','cappadocia');

update public.cities set tags = array['유적','도시']
  where id in ('quito','rome','khiva','nanjing','toledo','wroclaw','brno','ankara','rabat','maastricht','mexicocity','warsaw','bratislava','tunis');

update public.cities set tags = array['해변','자연']
  where id in ('lagos','santorini','bohol','vik','elnido','phanthiet','hurghada','jurmala','miyakojima','ishigaki','krabi','kohsamui','kenting','honolulu');

update public.cities set tags = array['해변']
  where id in ('gdansk','nice','mykonos','boracay','yantai','weihai','male','cancun','tahiti','pattaya','phuket','huahin','miami');

update public.cities set tags = array['자연','설상']
  where id in ('grindelwald','banff','rovaniemi','biei','yellowknife','pokhara','saltlakecity','furano','zermatt','denver','whistler');

update public.cities set tags = array['도시','유적','미식']
  where id in ('brussels','beijing','palermo','nagoya','izumo','odawara','osaka','suwon','andong','jeonju');

update public.cities set tags = array['해변','유적']
  where id in ('galle','cartagena','barcelona','telaviv','goa','izmir','tangier','tulum','saipan');

update public.cities set tags = array['도시','자연']
  where id in ('lapaz','geneva','medellin','reykjavik','como','bandung','yanji','haarlem','changwon');

update public.cities set tags = array['유적','자연']
  where id in ('lijiang','cambridge','meteora','trabzon','buyeo','aswan','cinqueterre','kanchanaburi');

update public.cities set tags = array['유적','축제']
  where id in ('dresden','cologne','seville','edinburgh','gongju','cordoba','salvador','washington');

update public.cities set tags = array['도시','유적','축제']
  where id in ('quebec','verona','siena','takayama','braga','avignon');

update public.cities set tags = array['자연','도시']
  where id in ('annecy','ulaanbaatar','bengaluru','monterrey','bishkek','nairobi');

update public.cities set tags = array['도시','유적','자연']
  where id in ('baku','sofia','amman','kyoto','nikko');

update public.cities set tags = array['해변','미식']
  where id in ('amalfi','sorrento','rovinj','durban','montevideo');

update public.cities set tags = array['해변','도시']
  where id in ('sihanoukville','newcastle','agadir','dalian','losangeles');

update public.cities set tags = array['자연','해변']
  where id in ('sanjose','lombok','sandiego','capetown');

update public.cities set tags = array['유적','해변']
  where id in ('dubrovnik','kamakura','okinawa','zanzibar');

update public.cities set tags = array['도시','자연','미식']
  where id in ('adelaide','santiago','hongkong');

update public.cities set tags = array['도시','쇼핑']
  where id in ('shenzhen','manchester','johorbahru');

update public.cities set tags = array['유적','쇼핑']
  where id in ('cairo','yogyakarta','hoian');

update public.cities set tags = array['도시','미술']
  where id in ('madrid','kaohsiung','minneapolis');

update public.cities set tags = array['해변','쇼핑']
  where id in ('guam','sanya','phuquoc');

update public.cities set tags = array['자연','축제']
  where id in ('galway','anchorage','madeira');

update public.cities set tags = array['도시','자연','유적']
  where id in ('nara','ulsan','riyadh');

update public.cities set tags = array['도시','미술','유적']
  where id in ('abudhabi','ghent','stockholm');

update public.cities set tags = array['자연','미식']
  where id in ('damyang','jeju','jiufen');

update public.cities set tags = array['도시','축제','미식']
  where id in ('colmar','asahikawa','austin');

update public.cities set tags = array['유적','미식','축제']
  where id in ('kolkata','guadalajara','chiangmai');

update public.cities set tags = array['해변','유적','도시']
  where id in ('quinhon','vungtau','alexandria');

update public.cities set tags = array['유적','미식','도시']
  where id in ('porto','bangkok','leuven');

update public.cities set tags = array['해변','자연','도시']
  where id in ('perth','seogwipo');

update public.cities set tags = array['도시','자연','쇼핑']
  where id in ('dubai','toronto');

update public.cities set tags = array['도시','미술','미식']
  where id in ('saopaulo','houston');

update public.cities set tags = array['도시','유적','미식','축제']
  where id in ('montreal','sendai');

update public.cities set tags = array['미술']
  where id in ('kurashiki','glasgow');

update public.cities set tags = array['도시','유적','미술']
  where id in ('berlin','graz');

update public.cities set tags = array['해변','자연','유적']
  where id in ('mallorca','bali');

update public.cities set tags = array['미식','축제']
  where id in ('valencia','mendoza');

update public.cities set tags = array['온천','유적']
  where id in ('bath','budapest');

update public.cities set tags = array['온천','미식']
  where id in ('tbilisi','karlovyvary');

update public.cities set tags = array['미식','도시']
  where id in ('bologna','ipoh');

update public.cities set tags = array['도시','미식','설상']
  where id in ('turin','niigata');

update public.cities set tags = array['도시','해변','자연']
  where id in ('sydney','geoje');

update public.cities set tags = array['도시','해변']
  where id in ('nadi','colombo');

update public.cities set tags = array['자연','유적','축제']
  where id in ('montreux','hirosaki');

update public.cities set tags = array['자연','온천','유적']
  where id in ('huangshan','pamukkale');

update public.cities set tags = array['유적','설상']
  where id in ('bursa','shirakawago');

update public.cities set tags = array['도시','유적','미식','쇼핑']
  where id in ('naha','tokyo');

update public.cities set tags = array['자연','유적','도시']
  where id in ('arequipa','matsumoto');

update public.cities set tags = array['도시','온천']
  where id in ('beppu','daejeon');

update public.cities set tags = array['도시','미식','설상','축제']
  where id in ('sapporo','otaru');

update public.cities set tags = array['도시','해변','자연','미식']
  where id in ('busan','sokcho');

update public.cities set tags = array['미술','유적','도시']
  where id in ('valletta','london');

update public.cities set tags = array['미술','도시']
  where id in ('amsterdam','oslo');

update public.cities set tags = array['해변','유적','자연']
  where id in ('cebu','antalya');

update public.cities set tags = array['자연','쇼핑']
  where id in ('portland','dalat');

update public.cities set tags = array['도시','유적','미술','미식']
  where id in ('vienna');

update public.cities set tags = array['해변','미술','도시']
  where id in ('brisbane');

update public.cities set tags = array['자연','미술','도시']
  where id in ('hobart');

update public.cities set tags = array['해변','자연','축제','도시']
  where id in ('rio');

update public.cities set tags = array['자연','설상','유적']
  where id in ('innsbruck');

update public.cities set tags = array['해변','자연','설상','도시']
  where id in ('vancouver');

update public.cities set tags = array['도시','유적','미술','축제','설상']
  where id in ('ottawa');

update public.cities set tags = array['도시','축제','설상','자연']
  where id in ('calgary');

update public.cities set tags = array['미술','자연']
  where id in ('basel');

update public.cities set tags = array['도시','미술','쇼핑','자연']
  where id in ('zurich');

update public.cities set tags = array['미식']
  where id in ('chengdu');

update public.cities set tags = array['해변','축제']
  where id in ('qingdao');

update public.cities set tags = array['설상','축제']
  where id in ('harbin');

update public.cities set tags = array['축제','도시']
  where id in ('munich');

update public.cities set tags = array['쇼핑','미식','도시']
  where id in ('duesseldorf');

update public.cities set tags = array['축제','유적']
  where id in ('salzburg');

update public.cities set tags = array['미술','미식']
  where id in ('bilbao');

update public.cities set tags = array['미식','해변','축제']
  where id in ('sansebastian');

update public.cities set tags = array['미식','유적','축제']
  where id in ('lyon');

update public.cities set tags = array['해변','자연','미식']
  where id in ('marseille');

update public.cities set tags = array['미식','유적','자연']
  where id in ('bordeaux');

update public.cities set tags = array['유적','축제','쇼핑']
  where id in ('strasbourg');

update public.cities set tags = array['미술','유적']
  where id in ('paris');

update public.cities set tags = array['유적','해변','자연']
  where id in ('crete');

update public.cities set tags = array['축제']
  where id in ('zagreb');

update public.cities set tags = array['쇼핑','도시']
  where id in ('jakarta');

update public.cities set tags = array['미식','유적']
  where id in ('dublin');

update public.cities set tags = array['미식','도시','유적','자연']
  where id in ('naples');

update public.cities set tags = array['도시','미술','해변','미식']
  where id in ('malaga');

update public.cities set tags = array['도시','미술','미식','쇼핑']
  where id in ('florence');

update public.cities set tags = array['유적','도시','자연']
  where id in ('petra');

update public.cities set tags = array['해변','도시','자연']
  where id in ('goldcoast');

update public.cities set tags = array['도시','자연','미식','온천']
  where id in ('kagoshima');

update public.cities set tags = array['도시','자연','유적','미식']
  where id in ('kanazawa');

update public.cities set tags = array['도시','미식','온천']
  where id in ('kobe');

update public.cities set tags = array['도시','온천','자연','미식']
  where id in ('kumamoto');

update public.cities set tags = array['도시','온천','설상','유적']
  where id in ('nagano');

update public.cities set tags = array['도시','미식','유적']
  where id in ('nagasaki');

update public.cities set tags = array['도시','미식','자연','미술']
  where id in ('takamatsu');

update public.cities set tags = array['도시','쇼핑','미술']
  where id in ('milan');

update public.cities set tags = array['온천','자연','축제']
  where id in ('yilan');

update public.cities set tags = array['도시','자연','축제']
  where id in ('taitung');

update public.cities set tags = array['자연','해변','축제']
  where id in ('boseong');

update public.cities set tags = array['도시','미식','축제']
  where id in ('neworleans');

update public.cities set tags = array['미술','해변']
  where id in ('thehague');

update public.cities set tags = array['미술','축제','미식']
  where id in ('linz');

update public.cities set tags = array['유적','축제','미식']
  where id in ('nuremberg');

update public.cities set tags = array['도시','축제']
  where id in ('stuttgart');

update public.cities set tags = array['해변','유적','미식']
  where id in ('chennai');

update public.cities set tags = array['자연','도시','축제']
  where id in ('darwin');

update public.cities set tags = array['유적','미술','축제']
  where id in ('canberra');

update public.cities set tags = array['미식','자연']
  where id in ('davao');

update public.cities set tags = array['쇼핑']
  where id in ('batam');

update public.cities set tags = array['자연','미술']
  where id in ('tottorishi');

update public.cities set tags = array['해변','자연','유적','도시']
  where id in ('faro');

update public.cities set tags = array['해변','도시','쇼핑']
  where id in ('brighton');

update public.cities set tags = array['자연','온천','미술','쇼핑']
  where id in ('yufuin');

update public.cities set tags = array['도시','유적','미술','쇼핑']
  where id in ('antwerp');

update public.cities set tags = array['도시','온천','유적']
  where id in ('matsuyama');

update public.cities set tags = array['자연','온천','도시']
  where id in ('shizuoka');

update public.cities set tags = array['도시','설상','축제']
  where id in ('aomori');

update public.cities set tags = array['온천','자연']
  where id in ('hakone');

update public.cities set tags = array['도시','미식','미술']
  where id in ('gwangju');

update public.cities set tags = array['도시','자연','설상']
  where id in ('almaty');

update public.cities set tags = array['온천']
  where id in ('rotorua');

update public.cities set tags = array['설상']
  where id in ('queenstown');

update public.cities set tags = array['도시','미술','쇼핑']
  where id in ('doha');

update public.cities set tags = array['도시','미식','해변']
  where id in ('gothenburg');

update public.cities set tags = array['자연','유적','미식']
  where id in ('bled');

update public.cities set tags = array['유적','미술','도시']
  where id in ('delft');

update public.cities set tags = array['유적','미술','도시','미식']
  where id in ('istanbul');

update public.cities set tags = array['유적','온천','미식']
  where id in ('taipei');

update public.cities set tags = array['미술','도시','쇼핑']
  where id in ('newyork');

update public.cities set tags = array['자연','온천']
  where id in ('phoenix');

update public.cities set tags = array['유적','미술','미식']
  where id in ('philadelphia');

update public.cities set tags = array['해변','온천']
  where id in ('nhatrang');

update public.cities set tags = array['유적','도시','미식']
  where id in ('hochiminh');

update public.cities set tags = array['해변','도시','유적']
  where id in ('danang');
-- 확인 — 태그가 안 붙은 곳이 몇 곳인지, 분포는 어떤지
select count(*) filter (where tags is null or cardinality(tags) = 0) as 태그없음,
       count(*) as 전체,
       round(avg(cardinality(tags))::numeric, 1) as 도시당평균
from public.cities;

select unnest(tags) as 태그, count(*) as 도시수
from public.cities group by 1 order by 2 desc;
