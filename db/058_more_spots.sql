-- =====================================================================
-- 인구는 적지만 한국인이 많이 가는 곳 여덟
--
-- 목록이 도시 위주라, 도시가 아닌 목적지 몇 곳이 비어 있었습니다.
-- 핀란드가 헬싱키 하나, 아이슬란드가 레이캬비크 하나였습니다 —
-- 노르웨이에는 오로라 도시 트롬쇠가 들어 있는데 말입니다.
--
-- **좌표는 전부 GeoNames 에서 하나씩 확인했습니다.** 지어내지 않습니다.
-- 도수를 십진수로 옮긴 값이고, 아래에 어느 줄을 골랐는지 적어둡니다.
--
-- 도시가 아닌 것이 섞여 있습니다 — 플리트비체는 국립공원, 친퀘테레는 마을
-- 다섯의 묶음, 플롬은 인구 500명 마을입니다. 다만 사람들이 "어디 가?"에
-- 그 이름으로 답하므로 목적지로는 맞습니다. 이미 들어 있는 하롱베이·
-- 시라카와고·할슈타트·메테오라도 같은 성격입니다.
--
-- 시간대는 모두 나라에 하나뿐인 곳들이라 안전합니다.
-- 통화는 countries 에서 가져옵니다 — 손으로 적으면 나중에 어긋납니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

insert into public.cities
  (id, name, name_en, country, center_lat, center_lng, timezone, currency, transit_grade, fame)
select v.id, v.name, v.name_en, v.country, v.lat, v.lng, v.tz, c.currency, v.grade, v.fame
from (values
  -- Rovaniemi · Lapland 주도 · 인구 65,670 · N 66°29′56″ E 25°41′19″
  ('rovaniemi',  '로바니에미', 'Rovaniemi',       'FI',  66.4989,   25.6886,
   'Europe/Helsinki',   'limited', 2),
  -- Vík · Mýrdalshreppur · 인구 750 (2번은 공항이라 1번을 씀)
  ('vik',        '비크',       'Vik',             'IS',  63.4194,  -19.0097,
   'Atlantic/Reykjavik','car',     2),
  -- Flåm · Aurland · 인구 500 (2번은 기차역, 4번은 교회)
  ('flam',       '플롬',       'Flam',            'NO',  60.8369,    7.1219,
   'Europe/Oslo',       'limited', 2),
  -- Lake Tekapo · Canterbury · locality (1번은 호수 자체라 마을 쪽을 씀)
  ('tekapo',     '테카포',     'Lake Tekapo',     'NZ', -43.9983,  170.4800,
   'Pacific/Auckland',  'car',     2),
  -- Biei · Hokkaido Kamikawa · 인구 10,374 (2번은 행정구역)
  ('biei',       '비에이',     'Biei',            'JP',  43.5844,  142.4597,
   'Asia/Tokyo',        'limited', 2),
  -- Plitvička Jezera · Lika-Senj · 인구 301 (1번은 행정구역이라 마을 쪽)
  ('plitvice',   '플리트비체', 'Plitvice Lakes',  'HR',  44.8811,   15.6225,
   'Europe/Zagreb',     'car',     2),
  -- Cinque Terre · La Spezia · GeoNames 에 area 로 등재
  ('cinqueterre','친퀘테레',   'Cinque Terre',    'IT',  44.1258,    9.7089,
   'Europe/Rome',       'normal',  2),
  -- El Nido · Palawan · 인구 51,3xx (2번은 공항)
  ('elnido',     '엘니도',     'El Nido',         'PH',  11.1858,  119.3956,
   'Asia/Manila',       'car',     2)
) as v(id, name, name_en, country, lat, lng, tz, grade, fame)
join public.countries c on c.code = v.country
on conflict (id) do nothing;


-- ── 확인 ─────────────────────────────────────────────────────────────
-- 여덟 줄이 다 나와야 합니다. 모자라면 그 나라가 countries 에 없다는 뜻입니다
-- (049 에서 키르기스스탄이 그렇게 조용히 빠졌습니다).
select id, name, name_en, country, center_lat, center_lng, timezone, currency, fame
  from public.cities
 where id in ('rovaniemi','vik','flam','tekapo','biei','plitvice','cinqueterre','elnido')
 order by id;

select count(*) as "넣은 수(8이어야 함)" from public.cities
 where id in ('rovaniemi','vik','flam','tekapo','biei','plitvice','cinqueterre','elnido');

select count(*) as "도시 전체(491이어야 함)" from public.cities;
