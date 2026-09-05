-- =====================================================================
-- 하와이 6곳 추가 (720 → 726)
--
-- 사용자가 섬별 도시 목록을 주고 「이렇게만 넣어」 했습니다:
--   오아후   호놀룰루(이미 있음) · 할레이바 · 코올리나
--   빅아일랜드 힐로 · 카일루아코나
--   마우이   카훌루이 · 라하이나
--
-- ⚠⚠ **섬이 아니라 «도시»로 넣습니다.** 제가 처음엔 마우이·카우아이·
--   하와이섬을 섬 단위로 넣으려 했는데, 사용자가 「하와이섬이라는 도시가
--   있어?」라고 물었습니다. 맞는 지적입니다. 이 목록에 섬이 여럿 있긴
--   하지만(발리·산토리니·오키나와…) 그건 «그 섬이 곧 여행지 이름»인
--   경우이고, 하와이는 섬 안에 갈 도시가 따로 있습니다.
-- ⚠ 카우아이는 사용자 목록에 없어 **안 넣습니다.** 「이렇게만」이었습니다.
--
-- ── 좌표와 링크 ──────────────────────────────────────────────────────
-- ⚠⚠ **이름으로 지어내지 않았습니다.** tools/cityadd.pl 이 위키백과에서
--   좌표를 받아 미국 범위(위 18~72 · 경 -180~-66) 안인지 확인했습니다.
--   여섯 곳 다 위도 19~21 · 경도 -155~-158 로 하와이에 맞습니다.
-- ⚠ **한국어 문서는 라하이나·힐로만 있습니다.** 나머지 넷은 영어 문서를
--   링크합니다 — 이 앱은 이미 영어 위키를 쓰는 도시가 여럿입니다
--   (빅토리아·옥스퍼드·뭄바이·재스퍼·마닐라). 새 규칙이 아닙니다.
-- ⚠ 코올리나의 문서 제목은 `Ko_Olina_Resort` 입니다 — 마을이 아니라
--   리조트 단지가 그 자체로 목적지라 그렇습니다.
--
-- ── 라하이나 ─────────────────────────────────────────────────────────
-- ⚠⚠ **2023년 8월 산불로 시가지 대부분이 탔습니다.** 소개글 첫 문장에
--   그것을 적습니다 — 「못 가는 곳은 못 간다고 쓴다」(메모리 city-photos).
--   반얀나무와 프론트 스트리트를 지금도 볼 수 있는 것처럼 쓰면 안 됩니다.
--
-- 083 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

insert into public.cities
  (id, name, name_en, country, center_lat, center_lng, timezone,
   transit_grade, fame, summary, summary_url)
values
  ('haleiwa', '할레이바', 'Haleiwa', 'US', 21.5900, -158.1139,
   'Pacific/Honolulu', 'car', 3,
   '오아후 북쪽 노스쇼어의 서핑 마을. 겨울이면 파도가 사람 키의 서너 배까지 올라 세계 대회가 열리고, 여름에는 잔잔해져 물놀이를 합니다. 무지개색 셰이브아이스와 길가 새우 트럭이 이 동네의 상징입니다. 호놀룰루에서 차로 한 시간쯤이고, 버스로는 두 시간이 넘습니다.',
   'https://en.wikipedia.org/wiki/Hale%CA%BBiwa,_Hawaii'),

  ('ko-olina', '코올리나', 'Ko Olina', 'US', 21.3375, -158.1186,
   'Pacific/Honolulu', 'car', 3,
   '오아후 서쪽 해안의 리조트 단지. 파도를 막아 만든 인공 석호 네 개가 나란히 있어 아이와 물에 들어가기 좋고, 디즈니 아울라니와 골프장이 그 안에 있습니다. 시내와 떨어져 조용한 대신 나가려면 차가 필요합니다. 호놀룰루 공항에서 차로 30분입니다.',
   'https://en.wikipedia.org/wiki/Ko_Olina_Resort'),

  ('hilo', '힐로', 'Hilo', 'US', 19.7056, -155.0858,
   'Pacific/Honolulu', 'car', 3,
   '빅아일랜드 동쪽의 행정·상업 도시. 하와이에서 비가 가장 많이 오는 곳이라 이끼와 고사리가 짙고, 레인보우 폭포와 리리우오칼라니 정원이 시내 안에 있습니다. 화산국립공원으로 들어가는 관문이기도 합니다. 호놀룰루에서 비행기로 50분입니다.',
   'https://ko.wikipedia.org/wiki/%ED%9E%90%EB%A1%9C'),

  ('kailua-kona', '카일루아코나', 'Kailua-Kona', 'US', 19.6500, -155.9942,
   'Pacific/Honolulu', 'car', 2,
   '빅아일랜드 서쪽의 관광 중심지. 해안도로를 따라 상점과 식당이 이어지고, 언덕 위 농장에서 코나 커피가 납니다. 비 많은 힐로와 달리 건조하고 맑아 별 보기와 만타레이 야간 스노클링을 여기서 합니다. 코나 공항에서 차로 15분입니다.',
   'https://en.wikipedia.org/wiki/Kailua-Kona,_Hawaii'),

  ('kahului', '카훌루이', 'Kahului', 'US', 20.8817, -156.4675,
   'Pacific/Honolulu', 'car', 3,
   '마우이의 관문 도시. 섬의 공항과 항구가 여기 있어 대부분 여기로 들어와 차를 빌립니다. 이아오 계곡과 할레아칼라 일출로 가는 길이 여기서 갈립니다. 도시 자체는 생활권이라 «구경하는 곳»보다 «준비하는 곳»에 가깝습니다.',
   'https://en.wikipedia.org/wiki/Kahului,_Hawaii'),

  ('lahaina', '라하이나', 'Lahaina', 'US', 20.8861, -156.6747,
   'Pacific/Honolulu', 'car', 2,
   '마우이 서쪽, 하와이 왕국의 옛 수도. 2023년 8월 산불로 시가지 대부분이 탔고 지금도 복구가 진행 중입니다 — 출입이 제한되는 구역이 있으니 가기 전에 반드시 확인하세요. 항구 앞 150년 된 반얀나무는 불에 그을렸지만 살아남아 다시 잎을 냈습니다.',
   'https://ko.wikipedia.org/wiki/%EB%9D%BC%ED%95%98%EC%9D%B4%EB%82%98')

on conflict do nothing;


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '도시 전체'::text as 확인, count(*)::text as 결과
    from public.cities
  union all
  select 2, '이번에 넣은 것 중 실제로 들어간 수',
         (select count(*)::text from public.cities where id in
           ('haleiwa','ko-olina','hilo','kailua-kona','kahului','lahaina'))
  union all
  select 3, '하와이 도시 전체(호놀룰루 포함)',
         coalesce((select string_agg(name, ' ' order by name) from public.cities
                    where timezone = 'Pacific/Honolulu'), '없음')
  union all
  -- 트리거가 통화·언어를 채웠는지. 안 채워졌으면 나라 코드가 틀린 것입니다.
  select 4, '통화가 빈 새 도시',
         coalesce((select string_agg(name, ' ' order by name) from public.cities
                    where created_at > now() - interval '10 minutes'
                      and (currency is null or currency = '')), '없음')
  union all
  -- 사진은 아직 안 넣었으므로 6곳이 나오는 것이 «정상»입니다.
  select 5, '사진이 없는 도시(다음 단계에서 채웁니다)',
         (select count(*)::text from public.cities where image_url is null)
  union all
  select 6, '소개글이 없는 도시',
         (select count(*)::text from public.cities where summary is null or summary = '')
) t order by ord;
