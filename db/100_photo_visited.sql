-- =====================================================================
-- 사진에서 다녀온 곳 가져오기 — 「가봤다」를 별점 없이도 셉니다
--
-- 왜 넣는가
--   이 앱의 제일 큰 약점은 **처음에 아무것도 없다는 것**입니다. 성향 카드를
--   보려면 5곳, 흔들리지 않으려면 20곳을 손으로 매겨야 합니다. 그 전까지는
--   빈 화면이고, 대부분은 거기서 나갑니다.
--   사진첩에는 이미 답이 있습니다 — 찍은 자리의 좌표가 사진에 들어 있습니다.
--   한 번 고르면 다녀온 도시 수십 곳이 채워지고, 그 목록이 곧 평가할 목록이
--   됩니다.
--
-- 왜 표를 새로 안 만드는가
--   `city_ratings` 에 `been boolean` 칸이 012 부터 있었습니다. 「가봤는지」를
--   적으라고 만든 칸인데 아무도 안 썼습니다 — `my_visited()` 가 `stars is
--   not null` 만 봤기 때문입니다. 쓸 자리가 이미 있는데 표를 더 만들면
--   「어디 갔다」가 두 군데에 적히고, 둘은 언젠가 어긋납니다.
--
-- ⚠ **별점을 지어내지 않습니다.** 사진은 「갔다」만 말하지 「좋았다」는
--   말하지 않습니다. `stars` 는 null 그대로 두고 `been` 만 켭니다.
--   그러면 평가 목록에 남고(거르개가 `stars == null` 을 봅니다) 「평가 대기」로
--   맨 위에 섭니다 — 가져오기가 곧 평가할 목록이 되는 것이 이 기능의 요점입니다.
--
-- ⚠ **사진은 서버로 안 올라갑니다.** 브라우저에서 좌표만 읽고 버립니다.
--   여기 저장되는 것은 「어느 도시에 갔다」 한 줄뿐이고, 그건 별점을 매길 때
--   이미 저장하던 것과 같은 종류입니다.
--
-- 014 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

create or replace function public.my_visited()
returns table (city_id text)
language sql stable security definer set search_path = public as $$
  -- ① 지난 여행의 구간 도시
  select l.city_id
    from public.trip_legs l
    join public.trips t        on t.id = l.trip_id
    join public.trip_members m on m.trip_id = t.id
   where m.user_id = auth.uid() and m.left_at is null
     and t.end_date < current_date
     and l.city_id is not null
  union
  -- ② 별점을 매긴 곳, 그리고 ③ 「가봤다」고 적은 곳(사진에서 가져온 것 포함)
  select r.city_id
    from public.city_ratings r
   where r.user_id = auth.uid()
     and (r.stars is not null or r.been);
$$;
grant execute on function public.my_visited() to authenticated;
