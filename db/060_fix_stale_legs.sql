-- =====================================================================
-- 안 따라온 구간을 제자리로 (한 번 쓰고 버리는 것)
--
-- 059 가 함수를 고쳤으니 앞으로는 안 생깁니다. 이미 어긋난 것만 맞춥니다.
--
-- **아무거나 고치지 않습니다.** 아래 조건을 다 만족하는 여행만 손댑니다.
--   1. 그 여행의 구간이 전부 여행 날짜 밖에 있고
--   2. 앞쪽 차이(여행 시작 − 구간 첫날)와
--      뒤쪽 차이(여행 끝 − 구간 마지막날)가 **같을 것**
--
-- 둘이 같다는 것은 구간 덩어리가 모양 그대로 남겨졌다는 뜻입니다. 그때만
-- 그 차이만큼 통째로 밀면 원래 모양이 정확히 돌아옵니다.
-- 둘이 다르면 누군가 기간을 늘리거나 줄인 것이라 **우리가 짐작하면 안 됩니다.**
-- 그런 여행은 건드리지 않고 아래 확인 조회에 남습니다.
--
-- 059 다음에 실행합니다. 여러 번 실행해도 안전합니다(고칠 것이 없으면 0건).
-- =====================================================================

with span as (
  select l.trip_id,
         min(l.start_date) as lo,
         max(l.end_date)   as hi,
         count(*)          as n
    from public.trip_legs l
   group by l.trip_id
),
fixable as (
  select s.trip_id,
         (t.start_date - s.lo) as shift
    from span s
    join public.trips t on t.id = s.trip_id
     -- **괄호가 있어야 합니다.** AND 가 OR 보다 먼저 묶이므로 괄호를 빼면
     -- "구간이 여행보다 앞이면 무조건" 이 되어, 앞뒤 차이가 다른 것까지
     -- 밀어버립니다. 조용히 자료를 망가뜨리는 종류의 실수입니다.
   where (s.hi < t.start_date or s.lo > t.end_date)      -- 전부 밖에 있고
     and (t.start_date - s.lo) = (t.end_date - s.hi)     -- 앞뒤 차이가 같을 때만
)
update public.trip_legs l
   set start_date = l.start_date + f.shift,
       end_date   = l.end_date   + f.shift
  from fixable f
 where l.trip_id = f.trip_id and f.shift <> 0;


-- ── 확인 ─────────────────────────────────────────────────────────────
-- 여기 남는 것이 **손 못 댄 것**입니다. 앞뒤 차이가 달라서 짐작할 수 없는
-- 경우이고, 여행 화면의 '고치기' 로 직접 맞춰야 합니다.
select t.title,
       t.start_date || ' ~ ' || t.end_date as "여행",
       l.destination,
       l.start_date || ' ~ ' || l.end_date as "구간"
  from public.trip_legs l
  join public.trips t on t.id = l.trip_id
 where l.end_date < t.start_date or l.start_date > t.end_date
 order by t.title, l.start_date;

select count(*) as "아직 어긋난 구간(0이면 끝)"
  from public.trip_legs l
  join public.trips t on t.id = l.trip_id
 where l.end_date < t.start_date or l.start_date > t.end_date;
