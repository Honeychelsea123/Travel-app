-- =====================================================================
-- 새 여행 첫 화면에 깔아둘 '많이 가는 곳' 순서 (pop_rank)
--
-- 왜 fame 으로 안 되나:
--   fame 은 1~3 세 칸뿐입니다(033). 1등급만 79곳이라 그중 여덟을 고르려면
--   결국 이름순으로 자르게 되고, 그러면 일본 대표가 '교토'가 됩니다.
--   순서를 매기는 값이 따로 필요합니다.
--
-- 무엇을 담았나:
--   한국에서 나가는 여행객이 실제로 많이 가는 곳을 **나라마다 한 곳씩**.
--   수도가 아니라 많이 가는 곳입니다 — 베트남은 하노이가 아니라 다낭,
--   필리핀은 마닐라가 아니라 세부입니다.
--
--   국내(KR)는 넣지 않습니다. 이 목록은 어디로 나갈지 정하는 자리이고,
--   국내는 검색으로 바로 찾습니다.
--
-- 고치는 법: 아래 값 목록만 손보고 다시 실행하면 됩니다.
--            빼려면 그 줄을 지우고 update ... set pop_rank = null 을 먼저.
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

alter table public.cities add column if not exists pop_rank smallint;

comment on column public.cities.pop_rank is
  '새 여행 첫 화면 추천 순서. 작을수록 위. 나라마다 한 곳만. null 이면 안 뜸';

-- 먼저 전부 지웁니다. 목록에서 뺀 도시가 옛 값을 들고 남아 있으면 안 됩니다.
update public.cities set pop_rank = null where pop_rank is not null;

update public.cities c set pop_rank = v.r
  from (values
  ('tokyo',        1),   -- 일본
  ('danang',       2),   -- 베트남 (하노이 아님)
  ('bangkok',      3),   -- 태국
  ('taipei',       4),   -- 대만
  ('cebu',         5),   -- 필리핀 (마닐라 아님)
  ('hongkong',     6),   -- 홍콩
  ('singapore',    7),   -- 싱가포르
  ('guam',         8),   -- 괌
  ('saipan',       9),   -- 북마리아나
  ('bali',        10),   -- 인도네시아
  ('kualalumpur', 11),   -- 말레이시아
  ('paris',       12),   -- 프랑스
  ('newyork',     13),   -- 미국
  ('rome',        14),   -- 이탈리아
  ('london',      15),   -- 영국
  ('barcelona',   16)    -- 스페인
) as v(id, r)
where c.id = v.id;

-- 확인: 16줄이 나와야 하고, 나라가 겹치면 안 됩니다.
select c.pop_rank, c.id, c.name, c.country
  from public.cities c where c.pop_rank is not null order by c.pop_rank;

select count(*) as "매긴 도시(16이어야 함)" from public.cities where pop_rank is not null;
select count(*) as "나라 겹침(0이어야 함)" from (
  select country from public.cities where pop_rank is not null
  group by country having count(*) > 1) x;
