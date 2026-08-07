-- =====================================================================
-- 여행 날짜를 옮길 때 **구간도 같이** 옮긴다
--
-- 008 의 shift_trip_days 는 plans 만 옮겼습니다. 그래서 여행을 며칠 미루면
-- 일정은 따라가는데 구간(trip_legs)은 옛 날짜에 그대로 남았습니다.
--
-- 실제로 이렇게 됐습니다:
--   여행  2026-09-07~09-17  →  2026-09-29~10-09  (22일 미룸)
--   일정  전부 22일 따라감                        ✓
--   구간  로마 09/07~09/10 … 바젤 09/15~09/17     ✗ 그대로
--
-- 그러면 어느 날짜도 어느 구간에 안 들어갑니다. 날짜 칩이 도시를 못 찾고
-- **11일 전부가 '바젤'** 로 나왔습니다 (가장 가까운 구간으로 떨어지는 규칙).
-- 화면 쪽은 b215 에서 "모르면 안 적는다"로 고쳤지만, 애초에 이렇게 어긋나는
-- 것을 막아야 합니다.
--
-- **구간은 여행의 뼈대입니다.** 여행이 밀리면 같이 밀려야 합니다.
-- expenses(실제로 돈이 나간 날)와 bookings(항공사가 잡아둔 날)는 그대로 둡니다 —
-- 008 의 판단이 옳습니다. 내 일정이 밀린다고 비행기가 옮겨지지는 않습니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

create or replace function public.shift_trip_days(p_trip uuid, p_days int)
returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  -- SECURITY DEFINER 는 RLS 를 건너뛰므로 권한을 여기서 직접 봅니다.
  if not public.can_write_trip(p_trip) then
    raise exception '이 여행을 편집할 권한이 없습니다';
  end if;

  if p_days = 0 then return 0; end if;

  update public.plans
     set date = date + p_days, updated_at = now()
   where trip_id = p_trip and deleted_at is null;
  get diagnostics n = row_count;

  -- **구간도 같이.** 이게 빠져 있어서 날짜 칩이 엉뚱한 도시를 달았습니다.
  update public.trip_legs
     set start_date = start_date + p_days,
         end_date   = end_date   + p_days
   where trip_id = p_trip;

  return n;   -- 돌려주는 값은 예전처럼 '옮긴 일정 수' 입니다
end $$;

grant execute on function public.shift_trip_days(uuid, int) to authenticated;

-- ── 이미 어긋난 것 ───────────────────────────────────────────────────
-- 자동으로 고치지 않습니다. 며칠 어긋났는지는 알 수 있어도 **원래 어느 도시에
-- 며칠 있으려 했는지**는 우리가 정할 일이 아닙니다. 어긋난 여행을 찾아만 줍니다.
-- 화면에서도 b215 부터 경고와 '고치기' 를 띄웁니다.
select t.title,
       t.start_date || ' ~ ' || t.end_date          as "여행",
       l.destination,
       l.start_date || ' ~ ' || l.end_date          as "구간"
  from public.trip_legs l
  join public.trips t on t.id = l.trip_id
 where l.end_date < t.start_date or l.start_date > t.end_date
 order by t.title, l.start_date;
