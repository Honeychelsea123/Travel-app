-- =====================================================================
-- 일정 전체를 며칠 미루거나 당긴다
--
-- 실제 날짜를 저장하기로 하면서 생긴 숙제입니다.
-- 도쿄 앱은 Day 번호만 저장해서 출발일만 바꾸면 전부 따라왔는데,
-- 이제는 출발일이 하루 밀리면 일정 스무 개를 하나씩 옮겨야 합니다.
--   (문서 "날짜 · 새로 필요한 것": 일정 전체를 N일 미루기 버튼이 필요합니다)
--
-- 화면에서 한 줄씩 고치면 요청이 스무 번 나가고 중간에 끊기면 반만 옮겨집니다.
-- 한 번에 원자적으로 처리하려고 함수로 둡니다.
--
-- 옮기는 것은 plans 뿐입니다.
--   expenses 는 실제로 돈이 나간 날이고, bookings 는 항공사가 잡아둔 날입니다.
--   내 일정이 밀린다고 그것들이 따라 움직이면 안 됩니다.
--
-- 001~006 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

create or replace function public.shift_trip_days(p_trip uuid, p_days int)
returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  -- SECURITY DEFINER 는 RLS 를 건너뛰므로 권한을 여기서 직접 봅니다.
  -- 이 줄이 없으면 아무나 남의 일정을 밀 수 있습니다.
  if not public.can_write_trip(p_trip) then
    raise exception '이 여행을 편집할 권한이 없습니다';
  end if;

  if p_days = 0 then return 0; end if;

  update public.plans
     set date = date + p_days, updated_at = now()
   where trip_id = p_trip and deleted_at is null;

  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.shift_trip_days(uuid, int) to authenticated;


-- 확인
select case when exists (
         select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'shift_trip_days' and p.prosecdef
       ) then 'OK  일정 전체 미루기 준비됨'
         else 'X   함수가 없다' end as result;
