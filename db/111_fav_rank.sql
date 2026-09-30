-- =====================================================================
-- 111 · 진짜 최애 고르기 — 동점을 가른 순위 칸 (2026-10-01)
--
-- 사용자(2026-10-01): 분석 탭 시안 넷 중 「③-B 최애 월드컵」을 고름 — 별점이 같은 곳끼리 둘씩 골라 1·2·3위를 정함.
--   (명세 17.2: 별점이 같으면 순위를 지어내지 않는다 — 가르는 것은 사용자가 직접)
--
-- 새 칸만 더하고 트리거 하나를 갈아 끼웁니다. 기존 자료는 안 건드립니다 — 여러 번 돌려도 같습니다.
-- ⚠ **앱을 올리기 전에 돌려 주세요.** 안 돌리면 순위를 저장할 때 일기장·보관함 최신순이 흔들립니다(②).
-- =====================================================================

-- ① fav_rank — 1·2·3 = 내가 고른 순위, 0 = 같이 겨뤘지만 셋 안에 못 든 곳, 비어 있음 = 아직 안 겨룸.
--    city_ratings 에 둡니다(profiles 가 아니라). profiles 는 같은 여행의 일행이 줄째로 읽을 수 있고(001 의
--    profiles_shared), city_ratings 는 본인만 읽습니다(012 의 ratings_own). 남에게 가는 함수(person_body ·
--    city_comments)는 칸을 골라 보내서 이 칸을 안 읽습니다 — 다시 간 횟수(109)와 같습니다.
alter table public.city_ratings
  add column if not exists fav_rank smallint;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'city_ratings_fav_rank_chk') then
    alter table public.city_ratings
      add constraint city_ratings_fav_rank_chk check (fav_rank is null or fav_rank between 0 and 3);
  end if;
end $$;

-- ② 「다시 간 횟수」(110)처럼 순위만 바꾼 것도 «쓴 때»가 아닙니다 — updated_at 을 그대로 둡니다.
--    110 의 함수를 갈아 끼웁니다(트리거는 그대로 이 함수를 부릅니다).
create or replace function public.ratings_touch_guard()
returns trigger language plpgsql as $$
begin
  if (to_jsonb(new) - 'visits' - 'fav_rank' - 'updated_at')
     is not distinct from (to_jsonb(old) - 'visits' - 'fav_rank' - 'updated_at') then
    new.updated_at = old.updated_at;
  else
    new.updated_at = now();
  end if;
  return new;
end $$;

-- 확인 — 두 칸 모두 true 면 끝입니다.
select
  exists (select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'city_ratings' and column_name = 'fav_rank') as rank_ok,
  (select pg_get_functiondef('public.ratings_touch_guard()'::regprocedure) like '%fav_rank%')         as touch_ok;
