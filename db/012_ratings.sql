-- =====================================================================
-- 여행지 평가 — 도시 별점 · 가보고 싶어요 · 여행 후기
--
-- 왜 넣는가
--   일정 앱은 1년에 두 번 열립니다. 여행 전과 여행 중. 그 사이가 비어 있습니다.
--   평가와 취향이 붙으면 돌아올 이유가 생깁니다.
--
-- 왜 여행 기록과 잇는가
--   평가만 따로 만들면 텅 빈 별점 화면부터 시작합니다.
--   다녀온 여행이 이미 있으니 그게 평가할 목록이 됩니다.
--   여행이 끝나면 후기를 묻고, 그 여행의 구간 도시들을 같이 평가하게 합니다.
--
-- 011 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

-- ── 1. 도시 평가 ─────────────────────────────────────────────────────
-- 한 사람이 한 도시에 한 줄. 별점 · 가봤는지 · 가보고 싶은지를 한 행에 담습니다.
-- 셋을 따로 표로 나누면 "가봤고 4점" 같은 흔한 경우에 조인이 늘어납니다.
create table if not exists public.city_ratings (
  user_id    uuid not null references auth.users on delete cascade,
  city_id    text not null references public.cities on delete cascade,
  -- 0.5 단위 0.5~5.0. 아직 점수를 안 준 상태(가보고 싶어요만)는 null 입니다.
  stars      numeric(2,1)
             check (stars is null or (stars between 0.5 and 5.0 and (stars * 2) % 1 = 0)),
  been       boolean not null default false,
  want       boolean not null default false,
  comment    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, city_id)
);
create index if not exists city_ratings_city_idx on public.city_ratings(city_id);

alter table public.city_ratings enable row level security;
-- 남의 평가는 행으로 못 봅니다. 누가 어디 다녀왔는지가 그대로 드러나기 때문입니다.
-- 평균은 아래 city_stats() 로만 나갑니다.
drop policy if exists ratings_own on public.city_ratings;
create policy ratings_own on public.city_ratings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());


-- ── 2. 도시별 집계 ───────────────────────────────────────────────────
-- 개인을 드러내지 않고 숫자만 내보냅니다. 누가 매겼는지는 안 나갑니다.
create or replace function public.city_stats(p_city text default null)
returns table (city_id text, avg_stars numeric, n_rated int, n_been int, n_want int)
language sql stable security definer set search_path = public as $$
  select r.city_id,
         round(avg(r.stars)::numeric, 2),
         count(*) filter (where r.stars is not null)::int,
         count(*) filter (where r.been)::int,
         count(*) filter (where r.want)::int
    from public.city_ratings r
   where p_city is null or r.city_id = p_city
   group by r.city_id;
$$;
grant execute on function public.city_stats(text) to anon, authenticated;


-- ── 3. 여행 후기 ─────────────────────────────────────────────────────
-- 여행은 여럿이 갑니다. 같은 여행도 사람마다 느낌이 다르므로 한 사람에 한 줄입니다.
create table if not exists public.trip_reviews (
  trip_id    uuid not null references public.trips on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  stars      numeric(2,1)
             check (stars is null or (stars between 0.5 and 5.0 and (stars * 2) % 1 = 0)),
  comment    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

alter table public.trip_reviews enable row level security;
-- 같이 간 사람끼리는 서로의 후기를 봅니다. 같은 여행을 다녀왔으니까요.
drop policy if exists reviews_read on public.trip_reviews;
create policy reviews_read on public.trip_reviews
  for select using (public.can_read_trip(trip_id));
drop policy if exists reviews_own on public.trip_reviews;
create policy reviews_own on public.trip_reviews
  for all using (user_id = auth.uid() and public.can_read_trip(trip_id))
       with check (user_id = auth.uid() and public.can_read_trip(trip_id));


-- ── 4. 다녀온 도시 표시 ──────────────────────────────────────────────
-- 여행이 끝나면 그 여행의 구간 도시를 "가봤음"으로 올립니다.
-- 별점은 건드리지 않습니다 — 갔다는 사실과 좋았다는 판단은 다릅니다.
create or replace function public.mark_visited(p_trip uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.can_read_trip(p_trip) then
    raise exception '이 여행의 참여자가 아닙니다';
  end if;

  insert into public.city_ratings (user_id, city_id, been)
  select auth.uid(), l.city_id, true
    from public.trip_legs l
   where l.trip_id = p_trip and l.city_id is not null
  on conflict (user_id, city_id) do update
     set been = true, updated_at = now();

  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.mark_visited(uuid) to authenticated;


-- ── 5. updated_at ────────────────────────────────────────────────────
-- 001 의 touch_row() 는 updated_by 도 채웁니다. 이 두 표에는 그 칸이 없어서
-- 그걸 쓰면 실행할 때 터집니다. 시각만 건드리는 것을 따로 둡니다.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists ratings_touch on public.city_ratings;
create trigger ratings_touch before update on public.city_ratings
  for each row execute function public.touch_updated_at();
drop trigger if exists reviews_touch on public.trip_reviews;
create trigger reviews_touch before update on public.trip_reviews
  for each row execute function public.touch_updated_at();

do $$ begin
  alter publication supabase_realtime add table public.trip_reviews;
exception when duplicate_object then null; end $$;


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '도시 평가 표'::text as check,
         case when exists (select 1 from pg_tables
                where schemaname='public' and tablename='city_ratings')
              then 'OK' else 'X' end as result,
         '한 사람이 한 도시에 한 줄'::text as note
  union all
  select 2, '여행 후기 표',
         case when exists (select 1 from pg_tables
                where schemaname='public' and tablename='trip_reviews')
              then 'OK' else 'X' end,
         '같은 여행도 사람마다 따로'
  union all
  select 3, '남의 평가는 안 보임',
         case when (select rowsecurity from pg_tables
                     where schemaname='public' and tablename='city_ratings')
              then 'OK' else 'X' end,
         '누가 어디 다녀왔는지가 드러나면 안 된다'
  union all
  select 4, '평균은 함수로만',
         case when has_function_privilege('authenticated',
                'public.city_stats(text)', 'execute')
              then 'OK' else 'X' end,
         '개인은 빼고 숫자만 나간다'
  union all
  select 5, '다녀온 곳 표시',
         case when has_function_privilege('authenticated',
                'public.mark_visited(uuid)', 'execute')
              then 'OK' else 'X' end,
         '여행 구간의 도시를 가봤음으로 올린다'
) t order by ord;
