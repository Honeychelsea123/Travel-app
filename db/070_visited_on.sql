-- ─────────────────────────────────────────────────────────────────────
-- 070_visited_on.sql — 「언제 다녀왔나」 칸 하나
--
-- 사용자 결정(2026-08-30): 이 앱의 핵심은 **다녀온 곳을 기록하는 것**이고,
-- 나중에 그것을 **일기장처럼** 넘겨 볼 수 있어야 합니다. 그런데 지금
-- `city_ratings` 에 있는 시간은 `created_at`(매긴 날) 하나뿐입니다.
--
--   10년 전 파리를 어제 매기면 **어제 일**이 됩니다.
--
-- 일기의 뼈대는 시간인데 그게 없었습니다. 칸 하나를 더합니다.
--
-- ── 왜 date 인가, 왜 「연·월」인가 ──────────────────────────────────
-- 칸은 `date` 지만 **화면은 연·월까지만 받습니다**(그 달 1일로 저장).
-- 2019년 여행의 날짜를 기억하는 사람은 없습니다. 일 단위로 물으면
--   ① 기억이 안 나서 안 적거나
--   ② 아무 날이나 찍어서 **틀린 기록**이 남습니다.
-- 둘 다 나쁩니다. 셀 수 있는 만큼만 묻습니다.
-- ⚠ 그러므로 화면에 **일(day)을 보여주지 마십시오** — 1일이라고 뜨면
--   사용자가 적지 않은 것을 앱이 지어낸 것이 됩니다. 「2019년 5월」까지만.
--
-- ── 왜 not null 이 아닌가 ──────────────────────────────────────────
-- 이미 매긴 곳이 수백입니다(작성자 계정만 74곳). 그것들은 언제 갔는지
-- 모릅니다. **비어 있는 것이 정상**이고, 앱은 「날짜 없음」을 그대로
-- 보여줍니다 — 나중에 채우면 채워집니다.
-- ⚠ 빈 것을 오늘로 채우지 마십시오. 그건 기록이 아니라 거짓입니다.
--
-- ── 미래 날짜는 막습니다 ────────────────────────────────────────────
-- 「다녀온」 날이므로 앞날일 수 없습니다. 가고 싶은 곳은 `want` 가 맡습니다.
-- ⚠ 시간대 때문에 하루 정도는 앞설 수 있어서 +1일까지 봐줍니다.
--
-- 돌리는 법: Supabase → SQL Editor 에 붙여 넣고 실행.
--   여러 번 돌려도 안전합니다(if not exists · drop 후 add).
-- ─────────────────────────────────────────────────────────────────────

alter table public.city_ratings
  add column if not exists visited_on date;

-- 다시 돌릴 수 있게 먼저 떼고 붙입니다.
alter table public.city_ratings
  drop constraint if exists city_ratings_visited_on_not_future;
alter table public.city_ratings
  add constraint city_ratings_visited_on_not_future
  check (visited_on is null or visited_on <= (current_date + 1));

comment on column public.city_ratings.visited_on is
  '다녀온 시점. 화면은 연·월까지만 받고 그 달 1일로 저장합니다(070).';

-- ── 일기장은 이 순서로 넘깁니다 ────────────────────────────────────
-- 최근에 다녀온 것부터. 날짜가 없는 것은 뒤로 갑니다(nulls last).
-- ⚠ 인덱스에도 **같은 정렬**을 적어야 실제로 쓰입니다 — desc/nulls last 를
--   빼먹으면 계획기가 그냥 훑습니다.
create index if not exists city_ratings_diary_idx
  on public.city_ratings (user_id, visited_on desc nulls last);

-- ── 확인 ────────────────────────────────────────────────────────────
-- 아래가 한 줄 나오면 성공입니다.
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public'
   and table_name   = 'city_ratings'
   and column_name  = 'visited_on';
