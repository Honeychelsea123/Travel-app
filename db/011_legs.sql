-- =====================================================================
-- 구간 — 여행 하나가 여러 도시·나라를 도는 경우
--
-- 지금까지는 여행 하나에 도시가 하나였습니다. 이탈리아 종단이나 유럽 종단이면
-- 로마는 대중교통, 토스카나는 렌터카, 스위스는 CHF, 영국은 시간대가 다릅니다.
-- 하나로는 못 담습니다.
--
-- 구간 = "언제부터 언제까지 어디에 있는가".
-- 일정과 지출은 날짜로 저절로 구간에 붙습니다 — 하나하나 도시를 고를 필요가 없습니다.
--
-- 경계는 **그날 밤 어디서 자는가**로 나눕니다. 기차로 국경을 넘는 날이
-- 어느 쪽인지 애매한데, 숙소 기준이 제일 안 헷갈립니다.
--
-- 010 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

create table if not exists public.trip_legs (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips on delete cascade,
  city_id     text references public.cities on delete set null,
  destination text not null,
  country     char(2) references public.countries,
  start_date  date not null,
  end_date    date not null,
  -- 도시나 나라에서 채워집니다. 아래 트리거가 합니다.
  timezone    text not null default 'Asia/Tokyo',
  currency    char(3) not null default 'JPY',
  local_lang  text,
  center_lat  double precision,
  center_lng  double precision,
  walk_max_km      numeric not null default 1.2,
  walk_min_per_km  numeric not null default 12,
  walk_base_min    numeric not null default 2,
  transit_factor   numeric not null default 3.5,
  transit_base_min numeric not null default 13,
  created_by  uuid references auth.users default auth.uid(),
  updated_by  uuid references auth.users,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists trip_legs_trip_idx on public.trip_legs(trip_id, start_date);


-- ── 도시·나라에서 값을 채웁니다 (trips 와 같은 규칙) ────────────────
create or replace function public.fill_leg()
returns trigger language plpgsql security definer set search_path = public as $$
declare c public.cities%rowtype; n public.countries%rowtype;
        g public.transit_grades%rowtype;
begin
  if new.city_id is not null then
    select * into c from public.cities where id = new.city_id;
    if found then
      new.country          := c.country;
      new.timezone         := c.timezone;
      new.center_lat       := coalesce(new.center_lat, c.center_lat);
      new.center_lng       := coalesce(new.center_lng, c.center_lng);
      new.walk_max_km      := c.walk_max_km;
      new.walk_min_per_km  := c.walk_min_per_km;
      new.walk_base_min    := c.walk_base_min;
      new.transit_factor   := c.transit_factor;
      new.transit_base_min := c.transit_base_min;
      if new.destination is null or new.destination = '' then
        new.destination := c.name;
      end if;
    end if;
  end if;

  select * into n from public.countries where code = new.country;
  if found then
    new.currency   := n.currency;
    new.local_lang := coalesce(new.local_lang, n.local_lang);
    if new.city_id is null and n.default_timezone is not null then
      new.timezone := n.default_timezone;
    end if;
  end if;

  -- 도시를 모르면 이동 등급도 모릅니다. 중간값을 씁니다.
  if new.city_id is null then
    select * into g from public.transit_grades where grade = 'normal';
    if found then
      new.walk_max_km      := g.walk_max_km;
      new.walk_min_per_km  := g.walk_min_per_km;
      new.walk_base_min    := g.walk_base_min;
      new.transit_factor   := g.transit_factor;
      new.transit_base_min := g.transit_base_min;
    end if;
  end if;

  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end $$;

drop trigger if exists legs_fill on public.trip_legs;
create trigger legs_fill before insert or update on public.trip_legs
  for each row execute function public.fill_leg();


-- ── trips 의 대표값을 첫 구간에서 맞춥니다 ──────────────────────────
-- 목록과 홈은 여행 한 줄만 보여주므로 대표값이 필요합니다.
-- 구간이 여럿이면 "파리 외 3곳"으로 적습니다.
-- 진짜 계산(검토·통화)은 그날 구간을 직접 봅니다 — 여긴 표시용입니다.
create or replace function public.sync_trip_from_legs()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_trip uuid := coalesce(new.trip_id, old.trip_id);
  f public.trip_legs%rowtype;
  v_n int;
  v_dest text;
begin
  select count(*) into v_n from public.trip_legs where trip_id = v_trip;
  if v_n = 0 then return coalesce(new, old); end if;

  select * into f from public.trip_legs
   where trip_id = v_trip order by start_date, created_at limit 1;

  v_dest := f.destination || case when v_n > 1
              then ' 외 ' || (v_n - 1) || '곳' else '' end;

  update public.trips t set
      destination = v_dest,
      city_id     = f.city_id,
      country     = f.country,
      timezone    = f.timezone,
      currency    = f.currency,
      local_lang  = f.local_lang,
      center_lat  = f.center_lat,
      center_lng  = f.center_lng,
      walk_max_km = f.walk_max_km, walk_min_per_km = f.walk_min_per_km,
      walk_base_min = f.walk_base_min,
      transit_factor = f.transit_factor, transit_base_min = f.transit_base_min
   where t.id = v_trip
     and (t.destination, t.timezone, t.currency) is distinct from
         (v_dest,        f.timezone, f.currency);   -- 안 바뀌면 건드리지 않습니다
  return coalesce(new, old);
end $$;

drop trigger if exists legs_sync on public.trip_legs;
create trigger legs_sync after insert or update or delete on public.trip_legs
  for each row execute function public.sync_trip_from_legs();


-- ── 새 여행을 만들면 구간 하나가 같이 생깁니다 ──────────────────────
create or replace function public.add_first_leg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.trip_legs
    (trip_id, city_id, destination, country, start_date, end_date)
  values (new.id, new.city_id, new.destination, new.country,
          new.start_date, new.end_date);
  return new;
end $$;

drop trigger if exists trips_first_leg on public.trips;
create trigger trips_first_leg after insert on public.trips
  for each row execute function public.add_first_leg();


-- ── 지금 있는 여행들을 구간 하나로 옮깁니다 ─────────────────────────
insert into public.trip_legs
  (trip_id, city_id, destination, country, start_date, end_date)
select t.id, t.city_id, t.destination, t.country, t.start_date, t.end_date
  from public.trips t
 where not exists (select 1 from public.trip_legs l where l.trip_id = t.id);


-- ── 정책 (다른 자식 표와 같은 모양) ─────────────────────────────────
alter table public.trip_legs enable row level security;
drop policy if exists legs_select on public.trip_legs;
create policy legs_select on public.trip_legs
  for select using (public.can_read_trip(trip_id));
drop policy if exists legs_write on public.trip_legs;
create policy legs_write on public.trip_legs
  for all using (public.can_write_trip(trip_id))
       with check (public.can_write_trip(trip_id));

do $$ begin
  alter publication supabase_realtime add table public.trip_legs;
exception when duplicate_object then null; end $$;


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '구간 표'::text as check,
         case when exists (select 1 from pg_tables
                            where schemaname='public' and tablename='trip_legs')
              then 'OK' else 'X' end as result,
         (select count(*)::text from public.trip_legs) || '개 구간' as note
  union all
  select 2, '여행마다 구간 있음',
         case when not exists (
           select 1 from public.trips t
            where not exists (select 1 from public.trip_legs l where l.trip_id = t.id))
         then 'OK' else 'X' end,
         '구간 없는 여행이 있으면 그 여행은 도시를 잃는다'
  union all
  select 3, 'RLS',
         case when (select rowsecurity from pg_tables
                     where schemaname='public' and tablename='trip_legs')
              then 'OK' else 'X' end,
         '참여자만 읽고 편집자만 고친다'
  union all
  select 4, '대표값 동기화',
         case when exists (select 1 from pg_trigger
                            where tgname='legs_sync' and not tgisinternal)
              then 'OK' else 'X' end,
         '목록에 파리 외 3곳 처럼 나온다'
) t order by ord;
