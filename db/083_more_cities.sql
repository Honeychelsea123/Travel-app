-- =====================================================================
-- 도시 19곳 추가 (701 → 720)
--
-- 사용자 요청:
--   터키 셀축·페티예 / 네덜란드 잔세스칸스 / 프랑스 아를 / 페루 이카 /
--   볼리비아 / 칠레 푸콘·산페드로데아타카마·발디비아 /
--   아르헨티나 살타·엘칼라파테 / 파라과이 아순시온
--   그리고 「한국 사람들이 패키지로 많이 가는 곳」
--
-- ⚠ 파묵칼레는 **이미 있어서 뺐습니다.**
-- ⚠ 볼리비아는 도시를 안 적어 주셔서 라파스·우유니(이미 있음) 다음으로
--   코파카바나(티티카카호)와 수크레(헌법상 수도)를 골랐습니다.
-- ⚠ 패키지 명소는 후보 120곳을 훑어 **실제로 빠진 여섯만** 넣습니다:
--   포지타노 · 몽생미셸 · 포스두이구아수 · 나이아가라폴스 ·
--   블라디보스토크 · 이르쿠츠크
--   나머지는 다 있었습니다. ⚠⚠ 처음엔 20곳이 빠진 줄 알았는데 **절반이
--   이름만 다른 것**이었습니다 — 하롱→하롱베이 · 푸켓→푸껫 · 크라비→끄라비 ·
--   계림→구이린 · 하바나→아바나 · 옌지→연변. 나라별 목록을 눈으로 안
--   봤으면 중복으로 넣어 `cities_country_name_uniq` 에 걸렸을 것이고,
--   그러면 **insert 전체가 취소**됩니다(db/077 에서 겪은 그것).
--
-- ── 좌표 ─────────────────────────────────────────────────────────────
-- ⚠⚠ **이름으로 지어내지 않았습니다.** 좌표는 전부 위키백과 문서에서
--   받아, 그 나라 범위 안에 드는지 확인했습니다(tools/cityadd.pl).
--   한국어 문서에 좌표가 없는 곳(7곳)은 영어판에서 빌려 왔고, 빌려 온
--   것도 나라 범위 검사를 똑같이 통과했습니다.
--   b654 에 나사우(BS)가 7,559km 떨어진 독일 문서에 걸린 적이 있습니다 —
--   **이름이 같다는 것은 같은 곳이라는 뜻이 아닙니다.**
--
-- ── 채우는 칸 ────────────────────────────────────────────────────────
-- ⚠ `timezone` 은 **트리거가 안 채웁니다**(db/004 의 fill_city_defaults 는
--   통화와 언어만 채웁니다). 러시아·브라질·캐나다·아르헨티나는 나라 안에서
--   시간대가 갈리므로 도시마다 직접 적습니다.
-- ⚠ `currency`·`local_lang` 과 걷기/이동 계수는 트리거가 채웁니다.
-- ⚠ `fame` 은 **작을수록 유명합니다**(db/033). 기존 눈금에 맞췄습니다 —
--   산토리니 1 · 할슈타트/우유니/쿠스코/인터라켄 2 · 평범한 큰 도시 3.
-- ⚠ 사진(`image_url`)은 **여기서 안 넣습니다.** 따로 골라 채웁니다 —
--   검색어를 「이름 + 나라」로 두면 4분의 1이 엉뚱합니다(메모리 city-photos).
--
-- 082 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

insert into public.cities
  (id, name, name_en, country, center_lat, center_lng, timezone,
   transit_grade, fame, summary, summary_url)
values
  ('selcuk', '셀축', 'Selcuk', 'TR', 37.9500, 27.3667, 'Europe/Istanbul',
   'limited', 2,
   '에페소스 고대도시를 끼고 있는 튀르키예 이즈미르주의 소도시. 대리석 길과 켈수스 도서관이 남은 유적이 마을에서 걸어서 닿고, 언덕에는 성 요한 성당 터와 이사베이 모스크가 있습니다. 여름은 매우 덥고 유적에 그늘이 거의 없어 이른 아침이 낫습니다. 이즈미르에서 기차나 버스로 한 시간 반쯤입니다.',
   'https://ko.wikipedia.org/wiki/%EC%85%80%EC%B6%94%ED%81%AC'),

  ('fethiye', '페티예', 'Fethiye', 'TR', 36.6514, 29.1231, 'Europe/Istanbul',
   'limited', 2,
   '튀르키예 남서부 지중해의 항구 휴양도시. 욜뤼데니즈 해변과 그 위에서 뛰어내리는 패러글라이딩, 열두 섬을 도는 보트 투어가 중심이고, 시내 뒤 절벽에는 리키아 시대 암굴 무덤이 박혀 있습니다. 5~10월이 성수기이고 겨울에는 배편이 크게 줄어듭니다. 달라만 공항에서 차로 한 시간쯤입니다.',
   'https://ko.wikipedia.org/wiki/%ED%8E%98%ED%8B%B0%EC%98%88'),

  ('zaanse-schans', '잔세스칸스', 'Zaanse Schans', 'NL', 52.4739, 4.8164,
   'Europe/Amsterdam', 'limited', 2,
   '네덜란드 잔담에 있는 풍차 마을. 강가에 늘어선 목조 풍차 안으로 들어가 맷돌이 도는 것을 볼 수 있고, 나막신 공방과 치즈 공방이 같은 길에 있습니다. 마을을 걷는 것 자체는 무료이고 풍차 내부만 따로 요금을 받습니다. 암스테르담 중앙역에서 기차로 20분, 잔서스한스역에서 걸어서 15분입니다.',
   'https://ko.wikipedia.org/wiki/%EC%9E%94%EC%84%9C%EC%8A%A4%ED%95%9C%EC%8A%A4'),

  ('arles', '아를', 'Arles', 'FR', 43.6767, 4.6278, 'Europe/Paris',
   'limited', 2,
   '로마 유적과 고흐의 자취가 겹쳐 있는 프로방스 도시. 원형경기장과 고대극장이 시내 한복판에 그대로 서 있고, 고흐가 그린 카페 테라스와 병원 안뜰이 걸어서 이어집니다. 7월 국제사진축제 기간에는 숙소가 일찍 찹니다. 마르세유에서 기차로 한 시간쯤입니다.',
   'https://ko.wikipedia.org/wiki/%EC%95%84%EB%A5%BC'),

  ('ica', '이카', 'Ica', 'PE', -14.0667, -75.7333, 'America/Lima',
   'car', 3,
   '페루 남부 사막 한가운데의 도시. 근처 와카치나 오아시스에서 사륜 버기를 타고 모래언덕을 넘거나 샌드보딩을 하고, 피스코를 빚는 포도주 양조장 견학도 이 지역입니다. 나스카 라인 경비행기는 근처 피스코나 나스카에서 뜹니다. 리마에서 버스로 네 시간 반쯤입니다.',
   'https://ko.wikipedia.org/wiki/%EC%9D%B4%EC%B9%B4_(%ED%8E%98%EB%A3%A8)'),

  ('pucon', '푸콘', 'Pucon', 'CL', -39.2767, -71.9744, 'America/Santiago',
   'car', 2,
   '칠레 호수지방의 화산 아래 휴양 마을. 연기가 오르는 비야리카 화산을 하루에 오르내리고, 내려와서는 온천과 카부르가 호수에서 쉽니다. 12~3월이 성수기이고 겨울에는 같은 화산에서 스키를 탑니다. 산티아고에서 버스로 아홉 시간, 테무코 공항에서 한 시간 반입니다.',
   'https://ko.wikipedia.org/wiki/%ED%91%B8%EC%BD%98'),

  ('san-pedro-de-atacama', '산페드로데아타카마', 'San Pedro de Atacama', 'CL',
   -22.9167, -68.2000, 'America/Santiago', 'car', 2,
   '세계에서 가장 건조한 아타카마 사막의 오아시스 마을. 달의 계곡 일몰, 새벽에 오르는 엘타티오 간헐천, 플라밍고가 있는 소금호수와 별 관측 투어가 모두 여기서 출발합니다. 해발 2,400m 이고 투어는 4,000m 를 넘으므로 고산 적응이 필요합니다. 칼라마 공항에서 차로 한 시간입니다.',
   'https://ko.wikipedia.org/wiki/%EC%82%B0%ED%8E%98%EB%93%9C%EB%A1%9C%EB%8D%B0%EC%95%84%ED%83%80%EC%B9%B4%EB%A7%88'),

  ('valdivia', '발디비아', 'Valdivia', 'CL', -39.8139, -73.2458,
   'America/Santiago', 'normal', 3,
   '강과 바다가 만나는 칠레 남부의 대학 도시. 강가 어시장 계단에는 바다사자가 올라와 누워 있고, 독일계 이민이 남긴 양조 전통 덕에 수제 맥주가 유명합니다. 일 년 내내 비가 잦아 우비가 필요합니다. 산티아고에서 비행기로 한 시간 반입니다.',
   'https://ko.wikipedia.org/wiki/%EB%B0%9C%EB%94%94%EB%B9%84%EC%95%84'),

  ('salta', '살타', 'Salta', 'AR', -24.7833, -65.4167,
   'America/Argentina/Salta', 'normal', 2,
   '안데스 기슭에 앉은 아르헨티나 북서부 도시. 식민지풍 광장과 분홍빛 성당이 남아 있고, 여기서 「구름열차」를 타거나 카파야테 협곡의 와이너리로 갑니다. 해발 6,700m 산정에서 발견된 잉카 어린이 미라를 전시한 고산고고학박물관이 시내에 있습니다. 부에노스아이레스에서 비행기로 두 시간입니다.',
   'https://ko.wikipedia.org/wiki/%EC%82%B4%ED%83%80'),

  ('el-calafate', '엘칼라파테', 'El Calafate', 'AR', -50.3378, -72.2600,
   'America/Argentina/Rio_Gallegos', 'car', 2,
   '파타고니아 빙하로 들어가는 관문 마을. 무너져 내리는 소리가 들리는 페리토모레노 빙하가 차로 한 시간 반 거리이고, 빙하 위를 아이젠 신고 걷는 트레킹도 여기서 신청합니다. 11~3월이 성수기이고 겨울에는 문 닫는 곳이 많습니다. 부에노스아이레스에서 비행기로 세 시간입니다.',
   'https://ko.wikipedia.org/wiki/%EC%97%98%EC%B9%BC%EB%9D%BC%ED%8C%8C%ED%85%8C'),

  ('asuncion', '아순시온', 'Asuncion', 'PY', -25.2822, -57.6350,
   'America/Asuncion', 'normal', 3,
   '파라과이의 수도이자 가장 큰 도시. 강가에 면한 분홍색 대통령궁과 영웅들의 판테온, 로페스 광장 둘레가 걸어서 둘러볼 만합니다. 연중 덥고 12~2월이 가장 무더워 한낮은 피하는 편이 낫습니다. 실비오페티로시 공항에서 차로 30분입니다.',
   'https://ko.wikipedia.org/wiki/%EC%95%84%EC%88%9C%EC%8B%9C%EC%98%A8'),

  ('copacabana-bo', '코파카바나', 'Copacabana', 'BO', -16.1667, -69.0833,
   'America/La_Paz', 'car', 2,
   '티티카카호 기슭의 볼리비아 순례 마을. 검은 성모상을 모신 흰 대성당이 마을 한가운데 있고, 선착장에서 배를 타면 잉카 신화의 「태양의 섬」에 닿습니다. 해발 3,800m 라 라파스에서 며칠 적응하고 오는 편이 낫습니다. 라파스에서 버스로 세 시간 반입니다.',
   'https://ko.wikipedia.org/wiki/%EC%BD%94%ED%8C%8C%EC%B9%B4%EB%B0%94%EB%82%98_(%EB%B3%BC%EB%A6%AC%EB%B9%84%EC%95%84)'),

  ('sucre', '수크레', 'Sucre', 'BO', -19.0500, -65.2500, 'America/La_Paz',
   'limited', 3,
   '흰 벽으로 통일된 구시가가 세계유산인 볼리비아의 헌법상 수도. 독립이 선포된 자유의 집과 성당들이 광장 둘레에 모여 있고, 도시 밖 절벽에는 공룡 발자국이 수천 개 남아 있습니다. 해발 2,800m 로 라파스보다 숨쉬기가 편합니다. 라파스에서 비행기로 한 시간입니다.',
   'https://ko.wikipedia.org/wiki/%EC%88%98%ED%81%AC%EB%A0%88'),

  ('positano', '포지타노', 'Positano', 'IT', 40.6333, 14.4833, 'Europe/Rome',
   'limited', 2,
   '아말피 해안 절벽에 파스텔색 집이 층층이 붙어 있는 마을. 골목이 전부 계단이라 걸어 내려가면 스피아자그란데 해변이 나오고, 언덕 위 산타마리아 성당의 마욜리카 돔이 어디서나 보입니다. 계단이 많아 큰 짐은 힘듭니다. 나폴리에서 소렌토까지 기차로 간 뒤 버스나 배로 들어갑니다.',
   'https://ko.wikipedia.org/wiki/%ED%8F%AC%EC%8B%9C%ED%83%80%EB%85%B8'),

  ('mont-saint-michel', '몽생미셸', 'Mont-Saint-Michel', 'FR', 48.6360, -1.5114,
   'Europe/Paris', 'car', 2,
   '노르망디 갯벌 위에 솟은 수도원 섬. 조수에 따라 섬이 되었다 육지가 되고, 좁은 골목을 지나 수도원 꼭대기까지 계단으로 오릅니다. 밀물 시간표를 보고 가야 갯벌 산책을 할 수 있고, 물이 드는 속도가 빨라 안내 없이는 들어가지 않습니다. 파리에서 기차와 버스로 네 시간쯤입니다.',
   'https://ko.wikipedia.org/wiki/%EB%AA%BD%EC%83%9D%EB%AF%B8%EC%85%B8%EC%84%AC'),

  ('foz-do-iguacu', '포스두이구아수', 'Foz do Iguacu', 'BR', -25.5500, -54.5833,
   'America/Sao_Paulo', 'limited', 2,
   '이구아수 폭포로 들어가는 브라질 쪽 관문 도시. 폭포 «전경»은 브라질 쪽이 낫고 폭포 «속»으로 들어가는 길은 아르헨티나 쪽이 나아, 이틀에 나눠 양쪽을 보는 사람이 많습니다. 세계 최대급 이타이푸 댐과 새 공원도 가깝습니다. 상파울루에서 비행기로 한 시간 반입니다.',
   'https://ko.wikipedia.org/wiki/%ED%8F%AC%EC%8A%A4%EB%91%90%EC%9D%B4%EA%B5%AC%EC%95%84%EC%88%98'),

  ('niagara-falls', '나이아가라폴스', 'Niagara Falls', 'CA', 43.1167, -79.0667,
   'America/Toronto', 'limited', 2,
   '폭포를 정면으로 마주 보는 캐나다 온타리오주 도시. 말굽폭포 난간과 물보라를 뚫고 가는 유람선, 폭포 뒤로 뚫린 터널이 걸어서 이어집니다. 겨울에는 유람선이 쉬는 대신 얼어붙은 폭포와 야간 조명을 봅니다. 토론토에서 차나 기차로 한 시간 반입니다.',
   'https://ko.wikipedia.org/wiki/%EB%82%98%EC%9D%B4%EC%95%84%EA%B0%80%EB%9D%BC%ED%8F%B4%EC%8A%A4_(%EC%98%A8%ED%83%80%EB%A6%AC%EC%98%A4%EC%A3%BC)'),

  ('vladivostok', '블라디보스토크', 'Vladivostok', 'RU', 43.1333, 131.9000,
   'Asia/Vladivostok', 'normal', 2,
   '러시아 극동의 항구도시. 금각교가 걸린 만을 독수리전망대에서 내려다보고, 해양공원과 해산물 시장이 시내에서 가깝습니다. 인천에서 두 시간 반이라 한국에서 가장 가까운 유럽 도시로 불립니다. 겨울 바닷바람이 매서워 체감온도가 크게 떨어집니다.',
   'https://ko.wikipedia.org/wiki/%EB%B8%94%EB%9D%BC%EB%94%94%EB%B3%B4%EC%8A%A4%ED%86%A0%ED%81%AC'),

  ('irkutsk', '이르쿠츠크', 'Irkutsk', 'RU', 52.2833, 104.2833, 'Asia/Irkutsk',
   'normal', 3,
   '바이칼호로 가는 시베리아의 관문 도시. 나무 조각으로 창을 두른 구시가 가옥과 유배 온 데카브리스트의 저택이 남아 있고, 호숫가 리스트뱐카까지는 차로 한 시간입니다. 겨울에는 호수가 통째로 얼어 그 위를 걷거나 차로 달립니다. 모스크바에서 비행기로 여섯 시간입니다.',
   'https://ko.wikipedia.org/wiki/%EC%9D%B4%EB%A5%B4%EC%BF%A0%EC%B8%A0%ED%81%AC')

on conflict do nothing;


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '도시 전체'::text as 확인, count(*)::text as 결과
    from public.cities
  union all
  select 2, '이번에 넣은 것 중 실제로 들어간 수',
         (select count(*)::text from public.cities where id in
           ('selcuk','fethiye','zaanse-schans','arles','ica','pucon',
            'san-pedro-de-atacama','valdivia','salta','el-calafate','asuncion',
            'copacabana-bo','sucre','positano','mont-saint-michel',
            'foz-do-iguacu','niagara-falls','vladivostok','irkutsk'))
  union all
  -- ⚠ 트리거가 통화·언어를 채웠는지. 안 채워졌으면 나라 코드가 틀린 것입니다.
  select 3, '통화가 빈 새 도시',
         coalesce((select string_agg(name, ' ' order by name) from public.cities
                    where created_at > now() - interval '10 minutes'
                      and (currency is null or currency = '')), '없음')
  union all
  select 4, '시간대가 빈 새 도시',
         coalesce((select string_agg(name, ' ' order by name) from public.cities
                    where created_at > now() - interval '10 minutes'
                      and (timezone is null or timezone = '')), '없음')
  union all
  -- 사진은 아직 안 넣었으므로 19곳이 나오는 것이 «정상»입니다.
  select 5, '사진이 없는 도시(다음 단계에서 채웁니다)',
         (select count(*)::text from public.cities where image_url is null)
  union all
  select 6, '소개글이 없는 도시',
         (select count(*)::text from public.cities where summary is null or summary = '')
) t order by ord;
