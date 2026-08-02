-- =====================================================================
-- 개발용 시험 데이터 — 로마 → 피렌체 → 베네치아 → 바젤
--
-- 손으로 넣기 번거로운 것들을 한 번에 만듭니다.
--   구간 4개 · 나라 2개(IT · CH) · 통화 3개(EUR · CHF · KRW)
--   좌표가 붙은 일정 · 지출 · 후보
--
-- 검토가 걸어야 할 것들을 **일부러** 섞어 뒀습니다:
--   겹치는 일정 · 하루 7개 · 이동 틈 0분 · 이른 체크인 · 빈 날 · 시각 미정
--
-- 여러 번 실행해도 됩니다. 같은 이름의 시험 여행을 지우고 다시 만듭니다.
-- **시험 여행만 지웁니다.** 직접 만드신 여행은 건드리지 않습니다.
-- =====================================================================

-- 바젤은 도시 목록에 없었습니다. 시험용이 아니라 실제로 있어야 할 도시라
-- cities 에 제대로 넣습니다. (통화·언어는 트리거가 나라에서 채웁니다.)
insert into public.cities
  (id, name, name_local, name_en, country, center_lat, center_lng, timezone, transit_grade)
values ('basel','바젤','Basel','Basel','CH', 47.5596, 7.5886, 'Europe/Zurich','normal')
on conflict (id) do update set
  name = excluded.name, center_lat = excluded.center_lat,
  center_lng = excluded.center_lng, timezone = excluded.timezone,
  transit_grade = excluded.transit_grade;

do $$
declare
  v_email text := 'jinsoo9271@gmail.com';   -- 다른 계정에 넣으려면 여기만 바꾸세요
  v_user  uuid;
  v_trip  uuid;
begin
  select id into v_user from auth.users where email = v_email;
  if v_user is null then
    select id into v_user from auth.users order by created_at limit 1;
  end if;
  if v_user is null then raise exception '가입한 사용자가 없습니다. 먼저 로그인하세요.'; end if;

  delete from public.trips
   where title in ('테스트 · 이탈리아 종단', '테스트 · 이탈리아 + 스위스')
     and created_by = v_user;

  insert into public.trips
    (title, city_id, destination, start_date, end_date, home_currency, created_by)
  values ('테스트 · 이탈리아 + 스위스', 'rome', '로마',
          date '2026-09-07', date '2026-09-17', 'KRW', v_user)
  returning id into v_trip;

  -- 트리거가 만든 구간 하나를 지우고 넷으로 다시 넣습니다.
  -- 경계는 그날 밤 자는 곳 기준입니다.
  -- 바젤에서 나라가 IT → CH 로 바뀌고 통화도 EUR → CHF 로 바뀝니다.
  delete from public.trip_legs where trip_id = v_trip;
  insert into public.trip_legs (trip_id, city_id, destination, start_date, end_date) values
    (v_trip, 'rome',     '로마',     date '2026-09-07', date '2026-09-10'),
    (v_trip, 'florence', '피렌체',   date '2026-09-11', date '2026-09-12'),
    (v_trip, 'venice',   '베네치아', date '2026-09-13', date '2026-09-14'),
    (v_trip, 'basel',    '바젤',     date '2026-09-15', date '2026-09-17');

  -- ── 일정 ──
  -- 좌표는 널리 알려진 곳의 중심 좌표입니다. 이동 시간 계산 시험용입니다.
  insert into public.plans
    (trip_id, date, start_time, end_time, category, title, memo, lat, lng, sort_order)
  values
  -- Day 1 (9/07) 로마 도착 — 정상적인 하루
  (v_trip,'2026-09-07','14:00',null,   '이동','피우미치노 공항 도착','FCO', 41.8003, 12.2389, 0),
  (v_trip,'2026-09-07','16:30','17:00','숙소','숙소 체크인',null,      41.8955, 12.4823, 1),
  (v_trip,'2026-09-07','19:30','21:00','식사','트라스테베레 저녁',null, 41.8896, 12.4695, 2),

  -- Day 2 (9/08) 로마 — 일부러 빡빡하게 (7개 · 겹침 · 틈 0분)
  (v_trip,'2026-09-08','09:00','11:00','관광','콜로세오',null,          41.8902, 12.4922, 0),
  (v_trip,'2026-09-08','11:00','12:00','관광','로마 포로','틈 0분 시험', 41.8925, 12.4853, 1),
  (v_trip,'2026-09-08','13:00','14:00','식사','판테온 근처 점심',null,   41.8986, 12.4769, 2),
  (v_trip,'2026-09-08','13:30',null,   '관광','트레비 분수','겹침 시험', 41.9009, 12.4833, 3),
  (v_trip,'2026-09-08','15:00',null,   '관광','스페인 계단',null,       41.9059, 12.4823, 4),
  (v_trip,'2026-09-08','17:00',null,   '관광','나보나 광장',null,       41.8992, 12.4731, 5),
  (v_trip,'2026-09-08','20:00','21:30','식사','저녁',null,             41.8955, 12.4823, 6),

  -- Day 3 (9/09) 바티칸 — 먼 거리 이동이 있는 하루
  (v_trip,'2026-09-09','08:30','12:00','관광','바티칸 박물관',null,      41.9065, 12.4536, 0),
  (v_trip,'2026-09-09','12:30','14:00','관광','성 베드로 대성당',null,   41.9022, 12.4539, 1),
  (v_trip,'2026-09-09','19:00','20:30','식사','저녁',null,             41.8896, 12.4695, 2),

  -- Day 4 (9/10) — 비워 둡니다 (빈 날 경고 시험)

  -- Day 5 (9/11) 피렌체 — 이른 체크인 경고 시험
  (v_trip,'2026-09-11','09:30','11:00','이동','로마 → 피렌체 기차','좌표 없음 시험',
                                                                     null,    null,    0),
  (v_trip,'2026-09-11','11:30','12:00','숙소','숙소 체크인','15시 전 시험', 43.7731, 11.2560, 1),
  (v_trip,'2026-09-11','14:00','16:00','관광','우피치 미술관',null,      43.7678, 11.2553, 2),
  (v_trip,'2026-09-11','18:00',null,   '관광','두오모',null,            43.7731, 11.2560, 3),

  -- Day 6 (9/12) 피렌체
  (v_trip,'2026-09-12','10:00','12:00','관광','아카데미아 미술관',null,  43.7770, 11.2588, 0),
  (v_trip,'2026-09-12','13:00','14:00','식사','점심',null,             43.7700, 11.2560, 1),
  (v_trip,'2026-09-12','16:00','17:30','관광','미켈란젤로 광장',null,    43.7629, 11.2650, 2),
  (v_trip,'2026-09-12','19:00',null,   '관광','베키오 다리',null,        43.7680, 11.2531, 3),

  -- Day 7 (9/13) 베네치아
  (v_trip,'2026-09-13','10:00','12:30','이동','피렌체 → 베네치아 기차',null,
                                                                     null,    null,    0),
  (v_trip,'2026-09-13','14:30','16:00','관광','산 마르코 광장',null,     45.4340, 12.3388, 1),
  (v_trip,'2026-09-13','17:00',null,   '관광','리알토 다리',null,        45.4380, 12.3358, 2),

  -- Day 8 (9/14) 베네치아 — 시각 미정이 많은 하루
  (v_trip,'2026-09-14','10:00','13:00','관광','무라노 섬',null,          45.4585, 12.3537, 0),
  (v_trip,'2026-09-14',null,   null,   '쇼핑','기념품','시각 미정 시험',  45.4371, 12.3326, 1),
  (v_trip,'2026-09-14',null,   null,   '식사','마지막 저녁',null,        45.4340, 12.3388, 2),

  -- Day 9 (9/15) 베네치아 → 바젤 — 나라가 바뀝니다 (IT → CH, EUR → CHF)
  (v_trip,'2026-09-15','08:20','15:40','이동','베네치아 → 바젤 기차','밀라노 환승',
                                                                     null,    null,    0),
  (v_trip,'2026-09-15','16:30','17:00','숙소','바젤 숙소 체크인',null,   47.5479, 7.5905, 1),
  (v_trip,'2026-09-15','18:30','20:00','관광','미틀레레 다리 · 라인강',null,
                                                                     47.5606, 7.5893, 2),

  -- Day 10 (9/16) 바젤 — 미술관 하루
  (v_trip,'2026-09-16','10:00','13:00','관광','바이엘러 재단',null,      47.5850, 7.6642, 0),
  (v_trip,'2026-09-16','14:30','16:30','관광','팅겔리 박물관',null,      47.5620, 7.6119, 1),
  (v_trip,'2026-09-16','18:00',null,   '식사','저녁',null,             47.5583, 7.5878, 2),

  -- Day 11 (9/17) 바젤 — 마지막 날
  (v_trip,'2026-09-17','09:30','11:00','관광','바젤 대성당',null,        47.5556, 7.5925, 0),
  (v_trip,'2026-09-17','13:00',null,   '이동','바젤 공항 출발','BSL',    47.5896, 7.5299, 1);

  -- ── 지출 ── 통화가 섞인 상태를 봅니다 (선결제는 원화)
  insert into public.expenses
    (trip_id, date, title, amount, currency, category, payer_id)
  values
    (v_trip,'2026-08-20','항공권 2인',        1840000,'KRW','이동', v_user),
    (v_trip,'2026-08-25','로마 숙소 선결제',   520000,'KRW','숙소', v_user),
    (v_trip,'2026-09-07','공항 열차',              32,'EUR','이동', v_user),
    (v_trip,'2026-09-07','트라스테베레 저녁',      78,'EUR','식사', v_user),
    (v_trip,'2026-09-08','콜로세오 입장',          36,'EUR','관광', v_user),
    (v_trip,'2026-09-09','바티칸 입장',            40,'EUR','관광', v_user),
    (v_trip,'2026-09-11','기차 로마-피렌체',       58,'EUR','이동', v_user),
    (v_trip,'2026-09-12','젤라토',                 12,'EUR','카페', v_user),
    -- 여기부터 스위스. 통화가 CHF 로 바뀝니다.
    (v_trip,'2026-09-15','기차 베네치아-바젤',     142,'CHF','이동', v_user),
    (v_trip,'2026-09-15','바젤 저녁',               96,'CHF','식사', v_user),
    (v_trip,'2026-09-16','바이엘러 재단 입장',      50,'CHF','관광', v_user),
    (v_trip,'2026-09-16','커피',                    11,'CHF','카페', v_user);

  -- ── 후보 ── 아직 날짜를 안 정한 곳
  insert into public.candidates
    (trip_id, title, title_local, category, memo, lat, lng, source)
  values
    (v_trip,'아르만도 알 판테온','Armando al Pantheon','식사','판테온 옆, 예약 필요',
       41.8990, 12.4767,'manual'),
    (v_trip,'보르게세 미술관','Galleria Borghese','관광','예약 필수, 2시간 제한',
       41.9142, 12.4922,'manual'),
    (v_trip,'부라노 섬','Burano','관광','베네치아에서 배로 40분',
       45.4853, 12.4170,'manual');

  raise notice '시험 여행을 만들었습니다: %', v_trip;
end $$;


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '여행'::text as check,
         (select count(*)::text from public.trips
           where title = '테스트 · 이탈리아 + 스위스') as n,
         '테스트 · 이탈리아 + 스위스'::text as note
  union all
  select 2, '구간',
         (select count(*)::text from public.trip_legs l
           join public.trips t on t.id = l.trip_id
          where t.title = '테스트 · 이탈리아 + 스위스'),
         '로마 · 피렌체 · 베네치아 · 바젤 (IT/CH)'
  union all
  select 3, '일정',
         (select count(*)::text from public.plans p
           join public.trips t on t.id = p.trip_id
          where t.title = '테스트 · 이탈리아 + 스위스' and p.deleted_at is null),
         '9/10 은 일부러 비워 뒀습니다'
  union all
  select 4, '좌표 있는 일정',
         (select count(*)::text from public.plans p
           join public.trips t on t.id = p.trip_id
          where t.title = '테스트 · 이탈리아 + 스위스'
            and p.deleted_at is null and p.lat is not null),
         '이동 시간 계산의 재료'
  union all
  select 5, '지출',
         (select count(*)::text from public.expenses e
           join public.trips t on t.id = e.trip_id
          where t.title = '테스트 · 이탈리아 + 스위스' and e.deleted_at is null),
         'KRW 2 + EUR 6 + CHF 4'
  union all
  select 6, '후보',
         (select count(*)::text from public.candidates c
           join public.trips t on t.id = c.trip_id
          where t.title = '테스트 · 이탈리아 + 스위스' and c.deleted_at is null),
         '날짜 안 정한 곳'
) t order by ord;

