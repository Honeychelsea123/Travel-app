-- ─────────────────────────────────────────────────────────────────────
-- 067_city_summaries.sql — 설명이 비어 있던 도시 채우기
--
-- 2026-08-12 기준 469곳 중 **157곳**에 `summary` 가 없었습니다.
-- 도시 페이지에서 이름과 사진만 있고 "여기가 어떤 곳인지"가 없는 상태입니다.
--
-- 쓰는 법: 위키백과 문서를 읽고 **네 문장, 110~140자**로 줄입니다.
--   1) 한 줄 정체성 — 무엇으로 알려진 어디인가
--   2) 대표 볼거리
--   3) 그곳에서만 되는 일
--   4) 실용 정보 — 시기 · 동선 · 주의
-- 말투는 기존 312곳과 같게 `~입니다`. (앱의 다른 글은 `~해요` 지만
-- 이 설명만 예외입니다 — 이미 들어 있는 것과 섞이면 안 됩니다.)
--
-- ⚠ **화면에서는 못 넣습니다.** `cities` 에 UPDATE 정책이 없어서
--   PATCH 가 **오류 없이 0건**으로 돌아옵니다(RLS 침묵 실패).
--   실제로 한 번 그렇게 돌아보고 알았습니다. SQL Editor 에서 돌리십시오.
--
-- ⚠ **이름이 겹치는 문서를 조심해야 합니다.** '갈레'는 한국어 위키에서
--   동음이의 문서(공예가 에밀 갈레 등)로 갑니다. '기타큐슈'도 지역명이라
--   도시 문서는 '기타큐슈시' 입니다. 문서 제목을 눈으로 확인하고 적었습니다.
-- ─────────────────────────────────────────────────────────────────────

begin;

update public.cities set
  summary = '오키나와 여행이 시작되는 현청 소재지. 국제거리에 먹을 곳과 살 것이 몰려 있고, 언덕 위 슈리성에서 류큐 왕국의 흔적을 봅니다. 슈리성 정전은 2019년 화재로 타서 복원 중입니다. 북부 해변이나 이시가키로 가는 길도 여기서 갈라집니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/나하시'
where name = '나하' and country = 'JP';

update public.cities set
  summary = '제주 남쪽의 바다 도시. 천지연폭포와 정방폭포가 시내에서 걸어갈 거리에 있고, 중문에 큰 호텔과 해변이 모여 있습니다. 올레길이 해안을 따라 이어집니다. 한라산이 북풍을 막아 제주시보다 겨울이 포근합니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/서귀포시'
where name = '서귀포' and country = 'KR';

update public.cities set
  summary = '규슈 오이타의 온천 마을. 유후인역에서 긴린코 호수까지 이어지는 길에 상점과 료칸, 작은 미술관이 늘어서 있습니다. 온천 용출량이 일본에서 손꼽히고 유후다케가 마을을 감쌉니다. 후쿠오카에서 기차로 두 시간 남짓이라 당일치기도 합니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/유후인 온천'
where name = '유후인' and country = 'JP';

update public.cities set
  summary = '서울에서 한 시간 남짓인 경기 동북부의 물과 산. 남이섬과 자라섬, 쁘띠프랑스가 대표적이고 북한강을 따라 카페가 이어집니다. 잣이 특산물입니다. 차가 없어도 ITX와 경춘선으로 닿습니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/가평군'
where name = '가평' and country = 'KR';

update public.cities set
  summary = '스리랑카 남서쪽 끝의 항구 도시. 네덜란드가 쌓은 성벽 안에 옛 거리가 통째로 남아 있고 유네스코 세계문화유산입니다. 성벽 위를 걸으며 인도양으로 지는 해를 봅니다. 콜롬보에서 남쪽으로 119km, 해안 열차로 이어집니다.',
  summary_url = 'https://en.wikipedia.org/wiki/Galle'
where name = '갈레' and country = 'LK';

update public.cities set
  summary = '은광으로 세워진 멕시코의 식민 도시. 색색의 집이 골짜기를 채우고 도시 아래로는 옛 물길을 고친 지하 도로가 지납니다. 1988년 유네스코 세계문화유산이 됐습니다. 해발 2,050m라 한여름에도 아침저녁은 선선합니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/과나후아토'
where name = '과나후아토' and country = 'MX';

update public.cities set
  summary = '오카야마의 운하 마을. 흰 벽 창고가 늘어선 미관지구가 중심이고, 일본 최초의 서양미술관인 오하라 미술관이 그 안에 있습니다. 운하를 따라 나룻배를 탑니다. 오카야마에서 기차로 15분이라 반나절이면 충분합니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/구라시키시'
where name = '구라시키' and country = 'JP';

update public.cities set
  summary = '발트해에 면한 폴란드의 항구 도시. 한자동맹 시절의 색색 상인 집이 늘어선 긴 시장 거리가 중심입니다. 호박 세공으로 이름났고 제2차 세계대전이 시작된 곳이기도 합니다. 여름이면 트램으로 소포트 해변까지 갑니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/그단스크'
where name = '그단스크' and country = 'PL';

update public.cities set
  summary = '규슈 최북단의 항구 도시. 모지코 레트로 지구에 옛 서양식 건물이 남아 있고, 고쿠라성과 단가 시장이 시내 중심입니다. 간몬해협 건너 시모노세키까지 걸어서도 갑니다. 후쿠오카에서 신칸센으로 15분입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/기타큐슈시'
where name = '기타큐슈' and country = 'JP';

update public.cities set
  summary = '랴오둥반도 끝의 부동항. 러시아와 일본이 차례로 개발해 유럽식 광장과 거리가 남아 있고, 성해광장과 해안 도로가 대표적입니다. 여름 해수욕장으로 중국 안에서 인기가 높습니다. 인천에서 배와 비행기 모두 닿습니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/다롄시'
where name = '다롄' and country = 'CN';

update public.cities set
  summary = '로테르담과 헤이그 사이의 운하 도시. 파란 무늬 델프트 도기의 고향이고, 페르메이르가 살며 그린 곳입니다. 광장의 신교회 탑에 오르면 시가지가 내려다보입니다. 암스테르담에서 기차로 한 시간이라 당일치기가 됩니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/델프트'
where name = '델프트' and country = 'NL';

update public.cities set
  summary = '라인강에 면한 노르트라인베스트팔렌의 주도. 쾨니히스알레의 명품 거리와 구시가의 알트비어 선술집이 대표적입니다. 강변 산책로에서 메디엔하펜의 현대 건축까지 이어집니다. 유럽에서 손꼽히는 일본인 거리가 있어 일식당이 많습니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/뒤셀도르프'
where name = '뒤셀도르프' and country = 'DE';

update public.cities set
  summary = '포르투갈 남부 알가르베의 해안 도시. 황금빛 절벽과 동굴이 이어지는 폰타 다 피에다지가 대표적이고, 배를 타고 바위 사이를 지납니다. 대항해 시대에 배가 떠나던 항구입니다. 여름에 붐비고 봄가을이 걷기 좋습니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/라구스'
where name = '라구스' and country = 'PT';

update public.cities set
  summary = '그리스 도데카니사 제도의 중심 섬 도시. 성 요한 기사단이 쌓은 중세 성벽 안 구시가가 통째로 유네스코 세계문화유산입니다. 고대에는 세계 7대 불가사의였던 거상이 서 있던 곳입니다. 여름이 길어 5월에서 10월이 성수기입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/로도스'
where name = '로도스' and country = 'GR';

update public.cities set
  summary = '북극권에 걸친 핀란드 라피주의 주도. 산타클로스 마을에서 북극권 선을 넘고 그 자리에서 편지를 부칩니다. 겨울에는 오로라와 허스키 썰매, 여름에는 해가 지지 않는 백야가 이어집니다. 헬싱키에서 야간열차나 비행기로 갑니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/로바니에미'
where name = '로바니에미' and country = 'FI';

-- ⚠ '론다'와 '마쓰모토'는 한국어 위키에서 동음이의 문서로 갑니다
--   (론다 — 이탈리아 Londa 도 있음 / 마쓰모토 — 성씨·인명).
--   도시 문서는 각각 '론다 (스페인)' · '마쓰모토시' 입니다.
update public.cities set
  summary = '안달루시아 산속의 절벽 마을. 100m 깊이 협곡을 잇는 누에보 다리가 상징이고, 다리를 사이에 두고 구시가와 신시가가 갈립니다. 스페인에서 가장 오래된 투우장 가운데 하나가 있습니다. 말라가에서 기차나 버스로 두 시간 안팎입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/론다 (스페인)'
where name = '론다' and country = 'ES';

update public.cities set
  summary = '일본 알프스 아래 나가노의 성 도시. 검은 벽의 마쓰모토성 천수각이 국보이고 해자에 그대로 비칩니다. 가미코치와 노리쿠라로 가는 길목이라 등산객이 모입니다. 신주쿠에서 특급으로 두 시간 반입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/마쓰모토시'
where name = '마쓰모토' and country = 'JP';

update public.cities set
  summary = '지중해에 면한 안달루시아의 항구 도시. 피카소가 태어난 곳이라 생가와 피카소 미술관이 있고, 언덕 위 알카사바에서 항구가 내려다보입니다. 해변을 따라 정어리 구이집이 이어집니다. 코스타 델 솔로 나가는 관문입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/말라가'
where name = '말라가' and country = 'ES';

update public.cities set
  summary = '사암 바위기둥 위에 수도원이 올라앉은 그리스 중부의 지역. 여섯 곳이 남아 지금도 수도 생활이 이어집니다. 유네스코 세계문화유산이고 절벽에 낸 계단을 걸어 올라갑니다. 가장 가까운 마을은 칼람바카입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/메테오라'
where name = '메테오라' and country = 'GR';

update public.cities set
  summary = '제네바호에 면한 스위스 리비에라의 휴양지. 호숫가 산책로와 물 위에 선 시옹성이 대표적입니다. 여름이면 재즈 페스티벌로 도시가 채워집니다. 기후가 온화해 19세기부터 요양지로 알려진 곳입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/몽트뢰'
where name = '몽트뢰' and country = 'CH';

update public.cities set
  summary = '자바섬 산속에 있는 서자바의 주도. 해발이 높아 자카르타보다 시원하고 네덜란드 시절의 아르데코 건물이 남아 있습니다. 화산 분화구 탕쿠반프라후와 차밭이 근교에 있습니다. 자카르타에서 고속철로 40분입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/반둥'
where name = '반둥' and country = 'ID';

update public.cities set
  summary = '비엔티안과 루앙프라방 사이에 있는 라오스의 강 마을. 남송강을 따라 카르스트 봉우리가 솟아 있고 튜빙과 카약, 열기구를 탑니다. 블루라군에서 물놀이를 합니다. 비엔티안에서 고속철로 한 시간입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/방비엥'
where name = '방비엥' and country = 'LA';

-- ── 2묶음 ──────────────────────────────────────────────────────────
-- ⚠ '비크'도 한국어 위키에서는 동음이의(스페인 비크 · 인명)입니다.
--   아이슬란드 마을 문서는 '비크이뮈르달' 입니다.
update public.cities set
  summary = '베트남 남중부 빈딘성의 해안 도시. 붐비지 않는 긴 백사장과 참파 왕국이 남긴 벽돌 탑이 함께 있습니다. 절벽 길로 이어지는 에오지오 어촌이 대표적입니다. 다낭이나 나트랑보다 사람이 적어 조용히 쉬려는 사람이 찾습니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/꾸이년'
where name = '꾸이년' and country = 'VN';

update public.cities set
  summary = '필리핀 중부 비사야스의 섬. 마른 풀로 갈색이 되는 초콜릿 힐과 손바닥만 한 안경원숭이 타르시어가 대표적입니다. 팡라오섬 해변에서 다이빙과 호핑을 합니다. 세부에서 배로 두 시간이라 함께 묶어 다닙니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/보홀주'
where name = '보홀' and country = 'PH';

update public.cities set
  summary = '호찌민에서 가장 가까운 바다. 언덕 위 예수상까지 계단을 오르면 도시와 해안이 한눈에 들어옵니다. 프랑스 시절의 별장과 등대가 남아 있습니다. 호찌민에서 배나 버스로 두 시간이라 주말에 붐빕니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/붕따우'
where name = '붕따우' and country = 'VN';

update public.cities set
  summary = '홋카이도 한가운데의 구릉 마을. 밭이 이어붙인 천처럼 보이는 패치워크 로드와 파랗게 빛나는 청의 호수가 대표적입니다. 여름에는 꽃밭, 겨울에는 눈밭이 됩니다. 후라노와 묶어 아사히카와에서 차로 다닙니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/비에이정'
where name = '비에이' and country = 'JP';

update public.cities set
  summary = '아이슬란드 남쪽 끝의 작은 마을. 검은 모래 해변 레이니스피아라와 육각 기둥 절벽, 바다에 선 바위 기둥이 대표적입니다. 링로드를 도는 사람들이 하룻밤 묵는 곳입니다. 파도가 갑자기 밀려와 물가에 가까이 가지 않습니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/비크이뮈르달'
where name = '비크' and country = 'IS';

update public.cities set
  summary = '나가사키현 북부의 항구 도시. 규슈 최대 테마파크 하우스텐보스가 있고, 섬이 흩어진 구주쿠시마를 배로 돕니다. 미군 기지에서 시작된 사세보 버거가 명물입니다. 하카타에서 특급으로 두 시간입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/사세보시'
where name = '사세보' and country = 'JP';

update public.cities set
  summary = '리가 근교 가우야 강 골짜기의 마을. 붉은 벽돌 투라이다성과 옛 성터가 숲에 흩어져 있고 골짜기를 케이블카로 건넙니다. 가을 단풍으로 라트비아에서 이름났습니다. 리가에서 기차로 한 시간입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/시굴다'
where name = '시굴다' and country = 'LV';

update public.cities set
  summary = '캄보디아 남부의 해변 도시. 오트레스와 오체틀 해변이 대표적이고 앞바다의 코롱섬으로 배가 오갑니다. 카지노와 고층 건물이 크게 늘어 예전의 한적한 모습과는 많이 달라졌습니다. 프놈펜에서 차로 네 시간입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/시아누크빌'
where name = '시아누크빌' and country = 'KH';

update public.cities set
  summary = '마닐라 북쪽 팜팡가주의 도시. 옛 미군 클라크 기지가 국제공항과 자유무역지대로 바뀌었습니다. 근교에 피나투보 화산 트레킹과 골프장이 모여 있습니다. 한국에서 클라크 직항이 있어 마닐라를 거치지 않습니다.',
  summary_url = 'https://en.wikipedia.org/wiki/Angeles,_Pampanga'
where name = '앙헬레스' and country = 'PH';

update public.cities set
  summary = '팔라완 북쪽 끝의 해변 마을. 바다에서 솟은 석회암 절벽과 그 사이 라군을 배로 도는 호핑 투어가 전부라 할 만합니다. 빅라군과 스몰라군이 대표적입니다. 푸에르토프린세사에서 차로 다섯 시간 걸립니다.',
  summary_url = 'https://en.wikipedia.org/wiki/El_Nido,_Palawan'
where name = '엘니도' and country = 'PH';

update public.cities set
  summary = '중국 지린성 연변 조선족 자치주의 중심 도시. 간판이 한글과 한자로 함께 적혀 있고 조선족 문화가 남아 있습니다. 백두산으로 가는 길목이라 여름과 가을에 사람이 몰립니다. 인천에서 직항이 있습니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/옌지시'
where name = '연변' and country = 'CN';

update public.cities set
  summary = '하코네로 들어가는 길목의 성 도시. 복원된 오다와라성 천수각이 시내 한가운데 있고 사가미만이 바로 앞입니다. 어시장과 가마보코가 명물입니다. 도쿄에서 신칸센으로 35분이라 하코네 여행의 첫 정거장이 됩니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/오다와라시'
where name = '오다와라' and country = 'JP';

update public.cities set
  summary = '리가 옆 발트해에 면한 휴양 도시. 30km 넘게 이어지는 백사장과 소나무 숲, 나무로 지은 별장이 늘어서 있습니다. 여름 한철에 사람이 몰립니다. 리가에서 기차로 30분입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/유르말라'
where name = '유르말라' and country = 'LV';

update public.cities set
  summary = '베트남 남부의 해변 도시. 옆의 무이네에 붉은 모래와 흰 모래 사구가 있어 지프를 타고 오릅니다. 바람이 좋아 카이트서핑으로 알려졌습니다. 호찌민에서 차로 네 시간, 고속도로가 열려 더 가까워졌습니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/판티엣'
where name = '판티엣' and country = 'VN';

update public.cities set
  summary = '뉴질랜드 남섬의 옥빛 호수. 호숫가에 선 선한 목자의 교회가 사진으로 알려졌고 11월에서 12월에 루피너스가 핍니다. 국제 다크스카이 보호구역이라 밤하늘로도 이름났습니다. 크라이스트처치에서 차로 세 시간입니다.',
  summary_url = 'https://en.wikipedia.org/wiki/Lake_Tekapo'
where name = '테카포' and country = 'NZ';

update public.cities set
  summary = '캐나다 로키의 북쪽 국립공원 마을. 아이스필드 파크웨이가 밴프까지 이어지고 말리뉴 호수와 애서배스카 폭포가 대표적입니다. 다크스카이 보호구역입니다. 2024년 큰 산불로 마을 일부가 탔으니 가기 전에 확인이 필요합니다.',
  summary_url = 'https://en.wikipedia.org/wiki/Jasper,_Alberta'
where name = '재스퍼' and country = 'CA';

update public.cities set
  summary = '아드리아해에 면한 크로아티아의 항구 도시. 파도가 밀려들 때 소리가 나는 바다 오르간과 태양의 인사가 바닷가에 있습니다. 로마 포룸 유적이 구시가에 그대로 남아 있습니다. 노을로 이름난 곳입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/자다르'
where name = '자다르' and country = 'HR';

update public.cities set
  summary = '알프스 기슭 호수에 안긴 프랑스 동부의 도시. 운하가 구시가를 가로지르고 물 위에 선 팔레 드 릴이 상징입니다. 호수가 유럽에서 손꼽히게 맑아 여름에 물놀이를 합니다. 제네바에서 차로 한 시간입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/안시'
where name = '안시' and country = 'FR';

update public.cities set
  summary = '암스테르담 남쪽의 운하 도시. 물가보다 한 층 낮은 부두에 카페가 늘어선 구조가 이곳만의 것입니다. 네덜란드에서 가장 높은 돔 타워를 계단으로 오릅니다. 대학 도시라 젊고, 암스테르담에서 기차로 30분입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/위트레흐트'
where name = '위트레흐트' and country = 'NL';

update public.cities set
  summary = '운하를 색색의 배가 지나 포르투갈의 베네치아라 불리는 도시. 몰리세이루를 타고 운하를 돕니다. 근처 코스타 노바에 줄무늬 어부 집이 늘어서 있습니다. 포르투에서 기차로 한 시간입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/아베이루'
where name = '아베이루' and country = 'PT';

-- ── 3묶음 ──────────────────────────────────────────────────────────
-- ⚠ **여기서 제일 위험한 것을 만났습니다.** 대만 '이란(宜蘭)'을 한국어 위키에서
--   찾으면 **나라 이란(Iran)** 문서로 갑니다. 도시 문서는 '이란시' 입니다.
--   '자이(嘉義)'·'타이둥(台東)'도 동음이의로 빠집니다 → '자이시' · '타이둥시'.
--   이름이 짧고 흔한 한자음일수록 이런 일이 잦습니다.
update public.cities set
  summary = '대만 북동부 이란현의 중심 도시. 온천과 논이 함께 있는 평야에 자리하고, 근교 자오시 온천과 우스비 폭포로 갑니다. 매년 여름 국제 어린이 민속예술제가 열립니다. 타이베이에서 기차나 버스로 한 시간 남짓입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/이란시'
where name = '이란' and country = 'TW';

update public.cities set
  summary = '일본에서 가장 오래된 신사 가운데 하나인 이즈모타이샤가 있는 시마네의 도시. 인연을 맺어주는 신을 모신다 하여 참배객이 끊이지 않습니다. 음력 10월에 전국의 신이 모인다는 이야기가 전해집니다. 이즈모 소바가 명물입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/이즈모시'
where name = '이즈모' and country = 'JP';

update public.cities set
  summary = '대만 남서부 자난 평야의 도시. 아리산으로 올라가는 산악 철도가 여기서 출발합니다. 닭고기 덮밥 지러우판이 이 도시의 이름을 달고 팔립니다. 타이베이에서 고속철로 한 시간 반입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/자이시'
where name = '자이' and country = 'TW';

update public.cities set
  summary = '대만 동남쪽 해안의 도시. 태평양을 따라 산과 논이 이어지는 화둥 종곡이 시작되는 곳입니다. 여름에 열기구 축제가 열리고 뤼다오·란위섬으로 배가 나갑니다. 타이베이에서 기차로 네 시간, 비행기로는 한 시간입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/타이둥시'
where name = '타이둥' and country = 'TW';

update public.cities set
  summary = '말레이시아 페락주의 주도. 주석 광산으로 번성한 옛 도시라 식민지 시절 건물이 그대로 남아 있습니다. 화이트커피가 이곳에서 시작됐고 노점 음식으로 이름났습니다. 쿠알라룸푸르에서 북쪽으로 200km, 기차로 두 시간 반입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/이포'
where name = '이포' and country = 'MY';

update public.cities set
  summary = '말레이 반도 최남단, 다리 하나로 싱가포르와 이어진 도시. 레고랜드와 대형 쇼핑몰이 모여 있어 싱가포르에서 건너와 놀고 갑니다. 물가가 싱가포르보다 크게 쌉니다. 출퇴근 시간에는 국경 다리가 매우 붐빕니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/조호르바루'
where name = '조호르바루' and country = 'MY';

update public.cities set
  summary = '경상남도청이 있는 남해안의 계획도시. 진해의 벚꽃길이 봄마다 사람을 불러 모으고, 마산어시장과 돝섬이 가까이 있습니다. 바다를 낀 공업 도시라 항구 풍경이 함께 있습니다. 서울에서 KTX로 세 시간입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/창원시'
where name = '창원' and country = 'KR';

update public.cities set
  summary = '히바 칸국의 수도였던 우즈베키스탄의 성곽 도시. 흙벽으로 둘러싸인 이찬 칼라 안에 미나레트와 마드라사가 그대로 남아 있습니다. 우즈베키스탄에서 처음 세계유산이 된 곳입니다. 성벽 위에서 지는 해를 봅니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/히바'
where name = '히바' and country = 'UZ';

update public.cities set
  summary = '실크로드의 오아시스 도시. 천 년 넘은 미르아랍 마드라사와 칼란 미나레트가 중심에 서 있고 구시가 전체가 세계유산입니다. 히바·사마르칸트와 묶어 도는 것이 보통입니다. 여름은 매우 덥고 봄가을이 좋습니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/부하라'
where name = '부하라' and country = 'UZ';

update public.cities set
  summary = '초원 한가운데 새로 지은 카자흐스탄의 수도. 바이테렉 전망탑과 칸 샤티르처럼 눈에 띄는 현대 건축이 모여 있습니다. 겨울에는 영하 30도까지 내려가는 세계에서 손꼽히게 추운 수도입니다. 여름이 짧고 다니기 좋습니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/아스타나'
where name = '아스타나' and country = 'KZ';

update public.cities set
  summary = '흰 화산암으로 지어 하얀 도시라 불리는 페루 남부의 도시. 산타 카탈리나 수도원과 아르마스 광장이 중심이고 미스티 화산이 배경에 섭니다. 콜카 협곡으로 콘도르를 보러 갑니다. 해발 2,300m라 고산 적응지로도 들릅니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/아레키파'
where name = '아레키파' and country = 'PE';

update public.cities set
  summary = '캐나다 노스웨스트 준주의 주도. 오로라를 보러 가는 도시로 알려져 겨울이면 밤마다 사람들이 호수 밖으로 나갑니다. 여름에는 백야에 가까운 긴 해가 이어집니다. 밴쿠버나 캘거리에서 비행기로 갑니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/옐로나이프'
where name = '옐로나이프' and country = 'CA';

update public.cities set
  summary = '노르웨이 남서쪽의 항구 도시. 나무로 지은 흰 집이 늘어선 옛 시가지와 북해 유전으로 세워진 석유 박물관이 함께 있습니다. 뤼세 피오르의 프레이케스톨렌으로 가는 출발점입니다. 트레킹은 여름철에 합니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/스타방에르'
where name = '스타방에르' and country = 'NO';

update public.cities set
  summary = '송네 피오르 끝에 자리한 노르웨이의 작은 마을. 산을 굽이굽이 오르는 플롬 산악열차가 이곳에서 출발합니다. 피오르 유람선과 열차를 이어 타는 길이 대표적입니다. 마을 자체는 작아 대개 하루 머물다 갑니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/플롬'
where name = '플롬' and country = 'NO';

update public.cities set
  summary = '암스테르담 서쪽의 운하 도시. 큰 성 바보 교회가 선 광장과 골목의 작은 안뜰 호프여가 대표적입니다. 봄이면 근교 큐켄호프 튤립 정원으로 가는 길목이 됩니다. 암스테르담에서 기차로 15분입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/하를럼'
where name = '하를럼' and country = 'NL';

update public.cities set
  summary = '홍해에 면한 이집트의 휴양 도시. 산호초가 가까워 다이빙과 스노클링으로 이름났습니다. 사막과 바다가 맞닿아 사파리도 함께 합니다. 겨울에도 따뜻해 유럽에서 피한지로 찾습니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/후르가다'
where name = '후르가다' and country = 'EG';

update public.cities set
  summary = '대서양에 면한 모로코의 휴양 도시. 1960년 지진으로 무너진 뒤 새로 지어 도시가 반듯하고 긴 해변이 이어집니다. 서핑과 아르간 오일로 알려졌습니다. 마라케시에서 차로 세 시간입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/아가디르'
where name = '아가디르' and country = 'MA';

update public.cities set
  summary = '흑해에 면한 튀르키예 북동부의 도시. 절벽에 붙어 있는 쉬멜라 수도원과 우준괼 호수가 대표적입니다. 비가 잦아 산이 늘 푸릅니다. 이스탄불에서 비행기로 두 시간이고 여름이 성수기입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/트라브존'
where name = '트라브존' and country = 'TR';

update public.cities set
  summary = '중국 안후이성의 산 도시. 기송·괴석·운해·온천을 사절이라 부르는 황산이 유네스코 세계유산입니다. 케이블카로 오르지만 능선은 걸어야 합니다. 근처 훙춘과 시디의 옛 마을도 세계유산입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/황산시'
where name = '황산' and country = 'CN';

update public.cities set
  summary = '아오모리의 성 마을. 벚나무 2,600그루가 둘러싼 히로사키성이 일본에서 손꼽히는 벚꽃 명소입니다. 해자를 꽃잎이 덮는 봄이 절정이고, 가을에는 사과가 나옵니다. 여름 네부타 축제도 함께 열립니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/히로사키시'
where name = '히로사키' and country = 'JP';

-- ── 4묶음 ──────────────────────────────────────────────────────────
update public.cities set
  summary = '백제의 옛 도읍 웅진. 공산성과 무령왕릉이 시내에 있고 백제역사유적지구로 유네스코 세계유산에 올랐습니다. 가을 백제문화제 때 금강에 유등이 뜹니다. 부여와 묶어 하루씩 도는 것이 보통입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/공주시'
where name = '공주' and country = 'KR';

update public.cities set
  summary = '백제의 마지막 도읍 사비. 부소산성과 낙화암, 정림사지 오층석탑이 남아 있고 백제역사유적지구로 세계유산입니다. 궁남지의 연꽃이 여름에 핍니다. 공주와 함께 도는 것이 보통입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/부여군'
where name = '부여' and country = 'KR';

update public.cities set
  summary = '초록 계단이 산을 덮은 차밭으로 알려진 전남의 군. 대한다원 차밭과 율포 해변이 대표적이고 5월에 다향대축제가 열립니다. 겨울에는 차밭에 불을 밝힙니다. 광주에서 차로 한 시간 반입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/보성군'
where name = '보성' and country = 'KR';

update public.cities set
  summary = '대나무로 이름난 전남의 군. 죽녹원 대숲길과 관방제림 고목 산책로가 대표적이고 메타세쿼이아 가로수길이 이어집니다. 떡갈비와 대통밥이 이곳 음식입니다. 광주에서 차로 40분입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/담양군'
where name = '담양' and country = 'KR';

update public.cities set
  summary = '조선의 계획도시가 성곽째 남은 경기도의 도시. 화성이 유네스코 세계유산이고 성벽을 따라 한 바퀴 걷습니다. 행궁 앞 통닭거리와 왕갈비가 이곳 음식입니다. 서울에서 지하철로 닿습니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/수원시'
where name = '수원' and country = 'KR';

update public.cities set
  summary = '명나라의 도읍이었던 장강 가의 도시. 명효릉과 중산릉, 성벽이 남아 있고 부자묘 일대가 번화합니다. 난징대학살 기념관이 있어 근대사를 함께 봅니다. 상하이에서 고속철로 한 시간 반입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/난징시'
where name = '난징' and country = 'CN';

update public.cities set
  summary = '루이 14세가 지은 궁전으로 알려진 파리 근교 도시. 거울의 방과 정원, 마리 앙투아네트의 별궁이 대표적입니다. 정원이 매우 넓어 자전거나 꼬마열차를 탑니다. 파리에서 RER로 한 시간이고 월요일은 휴관입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/베르사유'
where name = '베르사유' and country = 'FR';

update public.cities set
  summary = '아레강이 감싸 도는 스위스의 수도. 중세 아케이드가 6km 이어지는 구시가가 유네스코 세계유산입니다. 시계탑 치트글로게와 아인슈타인이 살던 집이 그 안에 있습니다. 여름에는 강물에 몸을 맡기고 떠내려갑니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/베른'
where name = '베른' and country = 'CH';

update public.cities set
  summary = '스페인의 옛 수도. 좁은 골목이 얽힌 언덕 전체가 세계유산이고 대성당과 알카사르가 중심에 섭니다. 기독교·이슬람·유대 문화가 겹쳐 남은 도시입니다. 마드리드에서 고속철로 30분이라 당일치기가 많습니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/톨레도'
where name = '톨레도' and country = 'ES';

update public.cities set
  summary = '2천 년 된 로마 수도교가 도심을 가로지르는 스페인의 도시. 디즈니 성의 본보기로 알려진 알카사르와 대성당이 있습니다. 새끼돼지 통구이가 이곳 음식입니다. 마드리드에서 고속철로 30분입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/세고비아'
where name = '세고비아' and country = 'ES';

update public.cities set
  summary = '이슬람 사원 안에 성당이 들어선 메스키타로 알려진 안달루시아의 도시. 유대인 지구의 흰 골목과 꽃을 건 안뜰이 이어집니다. 5월 파티오 축제 때 안뜰을 열어 보여줍니다. 여름은 매우 덥습니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/코르도바 (스페인)'
where name = '코르도바' and country = 'ES';

update public.cities set
  summary = '독일 국경에 붙은 알자스의 마을. 목조 가옥과 운하가 있는 프티트 베니스 구역이 대표적입니다. 겨울 크리스마스 마켓으로 이름났고 알자스 와인길이 여기서 이어집니다. 스트라스부르에서 기차로 30분입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/콜마르'
where name = '콜마르' and country = 'FR';

update public.cities set
  summary = '노이슈반슈타인성으로 가는 길목의 바이에른 마을. 성 두 채가 호수와 알프스를 배경으로 서 있습니다. 성은 예약제라 미리 표를 사야 합니다. 뮌헨에서 기차와 버스로 두 시간입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/퓌센'
where name = '퓌센' and country = 'DE';

update public.cities set
  summary = '절벽에 색색의 집이 붙어 있는 이탈리아 리구리아의 다섯 마을. 마을 사이를 기차와 해안 산책로가 잇습니다. 통째로 유네스코 세계유산이고 국립공원입니다. 길이 좁아 성수기에는 매우 붐빕니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/친퀘테레'
where name = '친퀘테레' and country = 'IT';

update public.cities set
  summary = '나폴리만 절벽 위에 앉은 이탈리아 남부의 휴양 도시. 아말피 해안과 카프리섬으로 가는 배가 여기서 뜹니다. 레몬으로 만든 리몬첼로가 이곳 술입니다. 나폴리에서 사철로 한 시간입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/소렌토'
where name = '소렌토' and country = 'IT';

update public.cities set
  summary = '콜럼버스가 태어난 이탈리아 최대의 항구 도시. 좁은 골목 카루지가 얽힌 구시가와 왕궁 거리가 유네스코 세계유산입니다. 페스토와 포카치아가 이곳에서 났습니다. 친퀘테레로 가는 길목이기도 합니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/제노바'
where name = '제노바' and country = 'IT';

update public.cities set
  summary = '에트나 화산 아래 시칠리아 동쪽 항구 도시. 화산암으로 지어 건물이 검고, 바로크 구시가가 세계유산입니다. 아침 어시장이 활기찹니다. 에트나 화산과 타오르미나로 가는 출발점입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/카타니아'
where name = '카타니아' and country = 'IT';

update public.cities set
  summary = '비잔틴 모자이크로 이름난 이탈리아 북부의 도시. 산 비탈레 성당과 갈라 플라치디아 영묘의 천장이 대표적이고 여덟 곳이 세계유산입니다. 단테가 묻힌 곳이기도 합니다. 볼로냐에서 기차로 한 시간입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/라벤나'
where name = '라벤나' and country = 'IT';

update public.cities set
  summary = '이탈리아 남동쪽 아드리아해의 항구 도시. 구시가 바리 베키아의 골목에서 할머니들이 오레키에테를 손으로 빚어 팝니다. 성 니콜라 성당이 중심에 있습니다. 그리스와 크로아티아로 가는 배가 뜹니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/바리'
where name = '바리' and country = 'IT';

update public.cities set
  summary = '교황이 머물렀던 프랑스 남부의 성벽 도시. 교황궁과 끊어진 생베네제 다리가 세계유산입니다. 여름이면 도시 전체가 연극제로 채워집니다. 프로방스를 도는 거점으로 삼기 좋습니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/아비뇽'
where name = '아비뇽' and country = 'FR';

update public.cities set
  summary = '붉은 벽돌로 지어 장밋빛 도시라 불리는 프랑스 남서부의 도시. 에어버스 본사가 있어 항공우주 박물관이 함께 있습니다. 카술레가 이곳 음식이고 미디 운하가 지납니다. 학생이 많아 밤이 활기찹니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/툴루즈'
where name = '툴루즈' and country = 'FR';

update public.cities set
  summary = '레만호에 면한 스위스의 도시. 국제올림픽위원회 본부와 올림픽 박물관이 있고 언덕 위 대성당에서 호수가 내려다보입니다. 호숫가 우시 지구가 산책하기 좋습니다. 제네바에서 기차로 40분입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/로잔'
where name = '로잔' and country = 'CH';

update public.cities set
  summary = '루벤스가 살던 벨기에의 항구 도시. 다이아몬드 거래로 이름났고 중앙역이 유럽에서 손꼽히게 아름다운 역으로 꼽힙니다. 성모 대성당에 루벤스의 제단화가 있습니다. 브뤼셀에서 기차로 40분입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/안트베르펜'
where name = '안트베르펜' and country = 'BE';

update public.cities set
  summary = '대학으로 이름난 벨기에의 도시. 레이스처럼 조각된 시청사와 유럽에서 가장 오래된 가톨릭 대학이 있습니다. 스텔라 아르투아가 이곳에서 만들어집니다. 브뤼셀에서 기차로 25분입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/뢰번'
where name = '뢰번' and country = 'BE';

update public.cities set
  summary = '네덜란드 정부와 국제사법재판소가 있는 도시. 평화궁과 마우리츠하위스 미술관이 대표적이고 진주 귀걸이를 한 소녀가 거기 있습니다. 스헤베닝언 해변이 트램으로 이어집니다. 암스테르담에서 기차로 50분입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/헤이그'
where name = '헤이그' and country = 'NL';

-- ── 5묶음 ──────────────────────────────────────────────────────────
update public.cities set
  summary = '마스강이 지나는 네덜란드 최남단의 도시. 유럽연합의 출발이 된 마스트리흐트 조약이 여기서 맺어졌습니다. 800년 된 교회를 고쳐 만든 서점이 유명합니다. 벨기에·독일 국경이 차로 20분 거리입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/마스트리흐트'
where name = '마스트리흐트' and country = 'NL';

update public.cities set
  summary = '모차르트가 아닌 무기의 도시로 시작한 오스트리아 제2의 도시. 시계탑이 선 슐로스베르크 언덕과 붉은 지붕 구시가가 세계유산입니다. 강 위에 뜬 인공섬과 현대미술관이 대비를 이룹니다. 빈에서 기차로 두 시간 반입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/그라츠'
where name = '그라츠' and country = 'AT';

update public.cities set
  summary = '도나우강에 면한 오스트리아의 공업 도시. 전자예술 축제 아르스 일렉트로니카로 이름났고 그 미술관이 강가에 있습니다. 린처 토르테가 이곳 과자입니다. 빈과 잘츠부르크 사이에 있습니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/린츠'
where name = '린츠' and country = 'AT';

update public.cities set
  summary = '뉘른베르크 재판과 크리스마스 마켓으로 알려진 독일 바이에른의 도시. 언덕 위 황제성과 구시가가 강을 끼고 있습니다. 손가락만 한 뉘른베르크 소시지가 명물입니다. 뮌헨에서 고속열차로 한 시간입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/뉘른베르크'
where name = '뉘른베르크' and country = 'DE';

update public.cities set
  summary = '벤츠와 포르쉐가 태어난 독일 남서부의 도시. 두 브랜드의 박물관이 도시 양쪽에 있습니다. 포도밭이 시내까지 들어와 있고 가을에는 대규모 맥주 축제가 열립니다. 프랑크푸르트에서 고속열차로 한 시간 반입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/슈투트가르트'
where name = '슈투트가르트' and country = 'DE';

update public.cities set
  summary = '난쟁이 동상을 찾아다니는 폴란드의 도시. 오데르강의 섬과 다리가 얽혀 있고 색색의 시장 광장이 중심입니다. 백 년 홀이 유네스코 세계유산입니다. 크라쿠프·프라하와 기차로 이어집니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/브로츠와프'
where name = '브로츠와프' and country = 'PL';

update public.cities set
  summary = '체코 제2의 도시이자 모라바 지방의 중심. 미스 반 데어 로에가 지은 투겐타트 저택이 세계유산입니다. 프라하보다 조용하고 물가가 쌉니다. 프라하에서 기차로 두 시간 반입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/브르노'
where name = '브르노' and country = 'CZ';

update public.cities set
  summary = '온천으로 세워진 체코 서부의 도시. 골짜기를 따라 파스텔색 온천장이 늘어서 있고 컵을 들고 다니며 온천수를 마십니다. 베헤로프카와 온천 과자가 이곳 것입니다. 프라하에서 버스로 두 시간입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/카를로비바리'
where name = '카를로비바리' and country = 'CZ';

update public.cities set
  summary = '옥빛 호수 열여섯 개가 폭포로 이어지는 크로아티아의 국립공원. 나무 데크를 따라 물 위를 걷고 배로 큰 호수를 건넙니다. 유네스코 세계유산입니다. 자그레브와 자다르 사이에 있어 오가는 길에 들릅니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/플리트비체 호수 국립공원'
where name = '플리트비체' and country = 'HR';

update public.cities set
  summary = '이스트라반도 서쪽 바다에 튀어나온 크로아티아의 항구 마을. 언덕 꼭대기 성 에우페미아 성당 종탑이 멀리서도 보입니다. 이탈리아 지배가 길어 음식과 말에 그 흔적이 남았습니다. 근처 숲에서 송로버섯이 납니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/로비니'
where name = '로비니' and country = 'HR';

update public.cities set
  summary = '오스만 제국의 첫 수도. 초록 모스크와 초록 영묘가 이름을 남겼고 실크로드 시장 한이 남아 있습니다. 겨울에는 울루산에서 스키를 탑니다. 이스탄불에서 배와 버스로 두 시간 반입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/부르사'
where name = '부르사' and country = 'TR';

update public.cities set
  summary = '에게해에 면한 튀르키예 제3의 도시. 해안 산책로 코르돈과 시계탑 광장이 중심이고 케이블카로 언덕에 오릅니다. 고대 도시 에페소스와 파묵칼레로 가는 길목입니다. 이스탄불보다 여유롭습니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/이즈미르'
where name = '이즈미르' and country = 'TR';

update public.cities set
  summary = '튀르키예의 수도. 아타튀르크 영묘가 언덕을 차지하고 있고 아나톨리아 문명 박물관에 히타이트 유물이 모여 있습니다. 성곽 안 옛 마을이 남아 있습니다. 이스탄불에서 고속철로 네 시간입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/앙카라'
where name = '앙카라' and country = 'TR';

update public.cities set
  summary = '모로코의 수도. 하산 탑과 무함마드 5세 영묘, 바다에 면한 우다이아 카스바가 대표적입니다. 파란 흰 골목이 조용해 마라케시와 결이 다릅니다. 카사블랑카에서 기차로 한 시간입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/라바트'
where name = '라바트' and country = 'MA';

update public.cities set
  summary = '지브롤터 해협을 사이에 두고 스페인과 마주 보는 모로코의 항구. 메디나와 카스바에서 두 대륙이 만나는 바다가 보입니다. 유럽에서 배로 한 시간이라 당일로 건너오기도 합니다. 헤라클레스 동굴이 근교에 있습니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/탕헤르'
where name = '탕헤르' and country = 'MA';

update public.cities set
  summary = '나일강과 사막이 만나는 이집트 남쪽 도시. 필레 신전과 미완성 오벨리스크가 있고 여기서 아부심벨로 갑니다. 펠루카를 타고 강을 떠다니는 것이 이 도시의 방식입니다. 여름은 매우 덥고 겨울이 성수기입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/아스완'
where name = '아스완' and country = 'EG';

update public.cities set
  summary = '지중해에 면한 이집트 제2의 도시. 고대 도서관을 기려 지은 알렉산드리아 도서관과 카이트베이 요새가 해안에 있습니다. 그리스·로마 유적이 도심에 섞여 있습니다. 카이로에서 기차로 두 시간 반입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/알렉산드리아'
where name = '알렉산드리아' and country = 'EG';

update public.cities set
  summary = '시크교의 중심인 황금 사원이 있는 인도 북서부의 도시. 금박 사원이 연못 한가운데 서 있고 누구에게나 무료로 밥을 냅니다. 파키스탄 국경의 와가 국기 하강식도 함께 봅니다. 델리에서 기차로 여섯 시간입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/암리차르'
where name = '암리차르' and country = 'IN';

update public.cities set
  summary = '호수 위에 궁전이 뜬 인도 라자스탄의 도시. 시티 팰리스와 물 위의 레이크 팰리스가 대표적이라 백색 도시로 불립니다. 골목마다 세밀화 공방이 있습니다. 자이푸르·조드푸르와 묶어 돕니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/우다이푸르'
where name = '우다이푸르' and country = 'IN';

update public.cities set
  summary = '벵골만에 면한 인도 남부의 도시. 마리나 해변이 길게 이어지고 마하발리푸람 석조 유적이 근교에 있습니다. 남인도 음식과 카르나틱 음악의 중심입니다. 덥고 습해 12월에서 2월이 다니기 좋습니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/첸나이'
where name = '첸나이' and country = 'IN';

update public.cities set
  summary = '인도 정보기술 산업의 중심 도시. 해발 900m 고원이라 인도에서 기후가 온화한 편입니다. 라루바그 식물원과 큐본 공원이 도심에 있습니다. 남인도를 도는 관문으로 쓰입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/벵갈루루'
where name = '벵갈루루' and country = 'IN';

update public.cities set
  summary = '벵골만에 면한 인도 동부의 옛 수도. 영국 식민 시절 건물이 늘어서 있고 하우라 다리와 빅토리아 기념관이 대표적입니다. 노란 택시와 손수레가 아직 다닙니다. 10월 두르가 푸자 때 도시가 축제로 뒤덮입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/콜카타'
where name = '콜카타' and country = 'IN';

update public.cities set
  summary = '아유타야 왕조의 옛 도읍. 무너진 사원과 나무뿌리에 감긴 불상 머리가 그대로 남아 유네스코 세계유산입니다. 자전거나 툭툭으로 유적 사이를 옮겨 다닙니다. 방콕에서 기차나 배로 당일치기가 됩니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/아유타야'
where name = '아유타야' and country = 'TH';

update public.cities set
  summary = '태국 최북단의 도시. 흰색 사원 왓 롱 쿤과 푸른 사원이 근교에 있고 미얀마·라오스와 만나는 골든 트라이앵글로 갑니다. 산악 마을과 차밭이 이어집니다. 치앙마이에서 버스로 세 시간입니다.',
  summary_url = 'https://ko.wikipedia.org/wiki/치앙라이'
where name = '치앙라이' and country = 'TH';

commit;

-- 확인 — 아직 비어 있는 곳이 몇 곳인지
select count(*) filter (where summary is null or btrim(summary) = '') as 설명없음,
       count(*)                                                        as 전체
from public.cities;
