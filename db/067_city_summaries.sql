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

commit;

-- 확인 — 아직 비어 있는 곳이 몇 곳인지
select count(*) filter (where summary is null or btrim(summary) = '') as 설명없음,
       count(*)                                                        as 전체
from public.cities;
