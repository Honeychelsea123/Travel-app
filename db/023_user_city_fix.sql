-- =====================================================================
-- 사용자가 넣는 도시가 막히던 것을 고친다
--
-- 처음 만든 143곳은 좌표와 시간대를 손으로 다 적어 넣었습니다.
-- 그래서 그 두 칸을 not null 로 두었는데, 사용자가 이름과 나라만 적어 넣을 때는
-- 좌표를 알 수 없습니다. "울릉도"를 넣으려다 center_lat 에서 막혔습니다.
--
-- 두 가지를 고칩니다.
--   1. 좌표를 비워둘 수 있게 한다. 모르면 모르는 대로 두는 것이 맞습니다.
--   2. 시간대는 나라 기본값으로 채운다. 트리거가 통화·언어는 채우면서
--      시간대는 안 채우고 있었습니다 — 다음 차례에서 똑같이 막혔을 것입니다.
--
-- 좌표가 없으면 이동시간 검사와 지도 중심에서 그 도시는 빠집니다.
-- 나중에 채우면 그때부터 됩니다.
--
-- 022 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

alter table public.cities alter column center_lat drop not null;
alter table public.cities alter column center_lng drop not null;

-- 시간대도 나라에서 따라오게 합니다.
create or replace function public.fill_city_defaults()
returns trigger language plpgsql as $$
declare c public.countries%rowtype; g public.transit_grades%rowtype;
begin
  select * into c from public.countries where code = new.country;
  if found then
    new.currency   := coalesce(c.currency, new.currency);
    new.local_lang := coalesce(new.local_lang, c.local_lang);
    -- 손으로 적어 넣은 도시는 자기 시간대가 있습니다. 그건 건드리지 않습니다.
    if new.timezone is null or new.timezone = '' then
      new.timezone := c.default_timezone;
    end if;
  end if;

  select * into g from public.transit_grades where grade = new.transit_grade;
  if found then
    new.walk_max_km      := g.walk_max_km;
    new.walk_min_per_km  := g.walk_min_per_km;
    new.walk_base_min    := g.walk_base_min;
    new.transit_factor   := g.transit_factor;
    new.transit_base_min := g.transit_base_min;
  end if;
  return new;
end $$;

-- 트리거가 채우기 전에 not null 로 막히지 않게 기본값을 하나 둡니다.
-- 나라가 없는 경우에만 쓰이는 값입니다.
alter table public.cities alter column timezone set default 'UTC';


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '좌표를 비울 수 있음'::text as check,
         case when (select is_nullable from information_schema.columns
                     where table_schema='public' and table_name='cities'
                       and column_name='center_lat') = 'YES'
              then 'OK' else 'X' end as result,
         '모르면 모르는 대로 둡니다'::text as note
  union all
  select 2, '시간대 기본값',
         case when (select column_default from information_schema.columns
                     where table_schema='public' and table_name='cities'
                       and column_name='timezone') is not null
              then 'OK' else 'X' end,
         '나라에서 채우고, 나라도 없으면 UTC'
) t order by ord;
