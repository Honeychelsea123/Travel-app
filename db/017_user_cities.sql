-- =====================================================================
-- 사용자가 도시를 직접 넣을 수 있게 한다
--
-- 세상의 도시를 우리가 다 넣을 수는 없습니다. 143곳은 자주 가는 곳일 뿐입니다.
-- 나라는 시스템이 가진 목록에서 고르게 하고(통화·언어·시간대가 거기 붙어 있습니다),
-- 도시는 사용자가 이름만 적어 넣습니다.
--
-- 나머지는 나라에서 따라옵니다 — 004 의 fill_city_defaults 트리거가 합니다.
-- 좌표와 이동 등급은 비워 둡니다. 나중에 채우면 이동시간 검사가 좋아집니다.
--
-- 016 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

-- 누가 넣었는지. 비어 있으면 처음부터 있던 것입니다.
alter table public.cities add column if not exists created_by uuid references auth.users;
alter table public.cities add column if not exists created_at timestamptz default now();

-- id 를 손으로 정할 수 없으니 자동으로 만듭니다.
-- 'u_' 로 시작하면 사용자가 넣은 것입니다.
alter table public.cities alter column id
  set default 'u_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);

-- 같은 나라에 같은 이름을 두 번 넣지 못하게 합니다.
-- 이게 없으면 열 명이 '치앙라이'를 각자 넣어 목록이 지저분해집니다.
create unique index if not exists cities_country_name_uniq
  on public.cities (country, lower(name));

-- 넣는 것은 로그인한 사람이면 됩니다. 고치고 지우는 것은 자기가 넣은 것만.
-- 처음부터 있던 도시(created_by 가 빈 것)는 아무도 못 건드립니다.
drop policy if exists cities_insert on public.cities;
create policy cities_insert on public.cities
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists cities_own on public.cities;
create policy cities_own on public.cities
  for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists cities_own_del on public.cities;
create policy cities_own_del on public.cities
  for delete to authenticated using (created_by = auth.uid());


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '넣은 사람 칸'::text as check,
         case when exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='cities'
                  and column_name='created_by')
              then 'OK' else 'X' end as result,
         '비어 있으면 처음부터 있던 도시'::text as note
  union all
  select 2, '같은 이름 막기',
         case when exists (select 1 from pg_indexes
                where schemaname='public' and indexname='cities_country_name_uniq')
              then 'OK' else 'X' end,
         '한 나라에 같은 이름은 하나만'
  union all
  select 3, '넣을 수 있음',
         case when exists (select 1 from pg_policies
                where schemaname='public' and tablename='cities' and cmd='INSERT')
              then 'OK' else 'X' end,
         '로그인하면 도시를 넣을 수 있다'
  union all
  select 4, '남의 도시는 못 고침',
         case when exists (select 1 from pg_policies
                where schemaname='public' and tablename='cities' and policyname='cities_own')
              then 'OK' else 'X' end,
         '자기가 넣은 것만 고치고 지운다'
) t order by ord;
