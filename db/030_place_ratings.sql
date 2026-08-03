-- =====================================================================
-- 식당과 카페를 평가한다
--
-- 도시는 city_ratings 로 매기고 있는데, 정작 기억에 남는 것은
-- "그 골목 파스타집"입니다. 그런데 그건 이미 일정에 들어 있습니다 —
-- 일정 짤 때 식사·카페로 넣었으니까요.
-- 그러니 새로 적게 하지 말고, 여행이 끝나면 그 일정들만 모아 별점을 받습니다.
--
-- 도시가 아니라 일정 줄에 답니다. 같은 가게를 여러 번 갔으면 그때마다
-- 따로 남는 것이 맞습니다 — 두 번째가 별로였을 수 있습니다.
--
-- 029 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

create table if not exists public.plan_ratings (
  user_id    uuid not null references auth.users on delete cascade,
  plan_id    uuid not null references public.plans on delete cascade,
  -- 0.5 단위 0.5~5.0. 도시 별점과 같은 규칙입니다.
  stars      numeric(2,1)
             check (stars is null or (stars between 0.5 and 5.0 and (stars * 2) % 1 = 0)),
  comment    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, plan_id)
);

create index if not exists plan_ratings_user_idx
  on public.plan_ratings(user_id, updated_at desc);

alter table public.plan_ratings enable row level security;

-- 내 것만 보고 내 것만 씁니다. 남의 별점은 아직 아무 데도 안 보여줍니다.
-- 일정 자체는 이미 RLS 로 막혀 있어서, 못 보는 여행의 plan_id 는 손에 넣을 수가
-- 없습니다. 그래서 여기서는 주인만 따집니다.
drop policy if exists plan_ratings_self on public.plan_ratings;
create policy plan_ratings_self on public.plan_ratings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop trigger if exists plan_ratings_touch on public.plan_ratings;
create or replace function public.touch_plan_rating()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger plan_ratings_touch before update on public.plan_ratings
  for each row execute function public.touch_plan_rating();


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '표'::text as check,
         case when to_regclass('public.plan_ratings') is not null then 'OK' else 'X' end as result,
         '일정 줄마다 별점 하나'::text as note
  union all
  select 2, '내 것만 보임',
         case when exists (select 1 from pg_policies
                            where schemaname='public' and tablename='plan_ratings')
              then 'OK' else 'X' end,
         '남의 별점은 아직 아무 데도 안 보여줍니다'
  union all
  select 3, '평가할 수 있는 일정',
         (select count(*)::text from public.plans
           where deleted_at is null and category in ('식사','카페')),
         '식사·카페로 넣은 일정 수 (내가 볼 수 있는 것만)'
) t order by ord;
