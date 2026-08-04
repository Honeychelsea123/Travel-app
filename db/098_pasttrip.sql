-- ※ 이메일은 비워뒀습니다. 저장소가 공개라 주소가 그대로 올라갑니다.
--    실행할 때 '여기에-이메일' 을 본인 계정으로 바꿔 쓰세요.
-- =====================================================================
-- 개발용 시험 데이터 2 — 지난 여행 (도쿄 → 교토 → 오사카, 2026년 4월)
--
-- 이미 끝난 여행이라 다음이 확인됩니다:
--   · 여행 탭의 "다녀온" 필터에 나타남
--   · 기록 탭에 도쿄 · 교토 · 오사카가 "평가 대기"로 올라옴
--   · 프로필의 나라/도시 숫자와 대륙 칩이 올라감
--   · 여행 후기를 남길 수 있음
--
-- 여러 번 실행해도 됩니다. 같은 이름의 시험 여행을 지우고 다시 만듭니다.
-- **시험 여행만 지웁니다.** 직접 만드신 여행은 건드리지 않습니다.
-- =====================================================================

do $$
declare
  v_email text := '여기에-이메일';   -- 다른 계정에 넣으려면 여기만 바꾸세요
  v_user  uuid;
  v_trip  uuid;
begin
  select id into v_user from auth.users where email = v_email;
  if v_user is null then
    select id into v_user from auth.users order by created_at limit 1;
  end if;
  if v_user is null then raise exception '가입한 사용자가 없습니다. 먼저 로그인하세요.'; end if;

  delete from public.trips
   where title = '테스트 · 도쿄 벚꽃' and created_by = v_user;

  insert into public.trips
    (title, city_id, destination, start_date, end_date, home_currency, created_by)
  values ('테스트 · 도쿄 벚꽃', 'tokyo', '도쿄',
          date '2026-04-08', date '2026-04-14', 'KRW', v_user)
  returning id into v_trip;

  delete from public.trip_legs where trip_id = v_trip;
  insert into public.trip_legs (trip_id, city_id, destination, start_date, end_date) values
    (v_trip, 'tokyo', '도쿄',   date '2026-04-08', date '2026-04-11'),
    (v_trip, 'kyoto', '교토',   date '2026-04-12', date '2026-04-13'),
    (v_trip, 'osaka', '오사카', date '2026-04-14', date '2026-04-14');

  -- ── 일정 ── 지난 여행이라 무리 없이 짰습니다
  insert into public.plans
    (trip_id, date, start_time, end_time, category, title, memo, lat, lng, sort_order)
  values
  -- 4/08 도쿄 도착
  (v_trip,'2026-04-08','13:40',null,   '이동','나리타 공항 도착','NRT',   35.7720,140.3929,0),
  (v_trip,'2026-04-08','16:30','17:00','숙소','신주쿠 숙소 체크인',null,  35.6938,139.7036,1),
  (v_trip,'2026-04-08','19:00','20:30','식사','신주쿠 이자카야',null,     35.6939,139.7005,2),
  -- 4/09 벚꽃
  (v_trip,'2026-04-09','09:30','11:30','관광','신주쿠 교엔','벚꽃',       35.6852,139.7100,0),
  (v_trip,'2026-04-09','12:30','13:30','식사','점심',null,               35.6870,139.7030,1),
  (v_trip,'2026-04-09','15:00','17:00','관광','메이지 신궁',null,         35.6764,139.6993,2),
  (v_trip,'2026-04-09','17:30','19:00','쇼핑','하라주쿠',null,           35.6702,139.7027,3),
  -- 4/10 아사쿠사
  (v_trip,'2026-04-10','09:00','11:00','관광','센소지',null,             35.7148,139.7967,0),
  (v_trip,'2026-04-10','11:30','13:00','관광','도쿄 스카이트리',null,     35.7101,139.8107,1),
  (v_trip,'2026-04-10','14:30','16:30','관광','우에노 공원','벚꽃',       35.7148,139.7737,2),
  -- 4/11 시부야
  (v_trip,'2026-04-11','08:00','09:30','식사','츠키지 장외시장',null,     35.6654,139.7707,0),
  (v_trip,'2026-04-11','11:00','13:00','관광','시부야 스크램블',null,     35.6595,139.7005,1),
  (v_trip,'2026-04-11','19:00','20:30','식사','저녁',null,               35.6938,139.7036,2),
  -- 4/12 교토
  (v_trip,'2026-04-12','08:30','11:00','이동','도쿄 → 교토 신칸센',null,  null,   null,   0),
  (v_trip,'2026-04-12','12:00','14:00','관광','후시미 이나리',null,       34.9671,135.7727,1),
  (v_trip,'2026-04-12','15:30','17:30','관광','기요미즈데라',null,        34.9949,135.7851,2),
  (v_trip,'2026-04-12','19:00','20:30','식사','기온 저녁',null,          35.0037,135.7752,3),
  -- 4/13 아라시야마
  (v_trip,'2026-04-13','09:00','11:30','관광','아라시야마 대나무숲',null, 35.0170,135.6716,0),
  (v_trip,'2026-04-13','13:30','15:30','관광','금각사',null,             35.0394,135.7292,1),
  -- 4/14 오사카
  (v_trip,'2026-04-14','09:00','10:00','이동','교토 → 오사카',null,       null,   null,   0),
  (v_trip,'2026-04-14','11:00','13:00','관광','오사카성',null,           34.6873,135.5259,1),
  (v_trip,'2026-04-14','14:00','16:00','식사','도톤보리',null,           34.6687,135.5013,2),
  (v_trip,'2026-04-14','19:30',null,   '이동','간사이 공항 출발','KIX',   34.4342,135.2328,3);

  -- ── 지출 ──
  insert into public.expenses
    (trip_id, date, title, amount, currency, category, payer_id)
  values
    (v_trip,'2026-03-02','항공권 2인',   980000,'KRW','이동', v_user),
    (v_trip,'2026-03-10','숙소 선결제',  640000,'KRW','숙소', v_user),
    (v_trip,'2026-04-08','나리타 익스프레스',6320,'JPY','이동', v_user),
    (v_trip,'2026-04-08','신주쿠 이자카야', 9800,'JPY','식사', v_user),
    (v_trip,'2026-04-09','점심',           2400,'JPY','식사', v_user),
    (v_trip,'2026-04-10','스카이트리 입장', 4200,'JPY','관광', v_user),
    (v_trip,'2026-04-11','츠키지 아침',    3600,'JPY','식사', v_user),
    (v_trip,'2026-04-12','신칸센',        27800,'JPY','이동', v_user),
    (v_trip,'2026-04-13','금각사 입장',     900,'JPY','관광', v_user),
    (v_trip,'2026-04-14','도톤보리 저녁',  8400,'JPY','식사', v_user);

  raise notice '지난 여행을 만들었습니다: %', v_trip;
end $$;


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '지난 여행'::text as check,
         (select count(*)::text from public.trips
           where title = '테스트 · 도쿄 벚꽃') as n,
         '2026-04-08 ~ 04-14 · 이미 끝남'::text as note
  union all
  select 2, '구간',
         (select count(*)::text from public.trip_legs l join public.trips t on t.id = l.trip_id
           where t.title = '테스트 · 도쿄 벚꽃'),
         '도쿄 · 교토 · 오사카'
  union all
  select 3, '일정',
         (select count(*)::text from public.plans p join public.trips t on t.id = p.trip_id
           where t.title = '테스트 · 도쿄 벚꽃' and p.deleted_at is null),
         '좌표 대부분 있음'
  union all
  select 4, '평가 대기로 올라올 도시',
         (select count(*)::text from public.my_visited() v
           where not exists (select 1 from public.city_ratings r
                              where r.user_id = auth.uid() and r.city_id = v.city_id
                                and r.stars is not null)),
         'SQL Editor 에서는 로그인 정보가 없어 0으로 나옵니다 — 앱에서 확인하세요'
) t order by ord;
