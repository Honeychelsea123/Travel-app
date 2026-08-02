-- =====================================================================
-- 나라에 기본 시간대를 두고, 도시를 안 고른 여행도 제대로 채운다
--
-- 왜 필요한가
--   "목록에 없어요"로 만든 여행은 통화와 언어는 나라에서 잘 왔지만
--   **시간대가 컬럼 기본값 Asia/Tokyo 로 남았습니다.**
--   치앙라이 여행에 태국 통화와 도쿄 시간대가 같이 붙습니다.
--   이동시간 상수도 도쿄(dense) 값을 그대로 물려받았습니다.
--
-- 도시를 못 고르는 것은 흔한 일이고 앞으로 더 흔해집니다.
-- 도시 표는 자주 가는 곳을 미리 넣어둔 지름길일 뿐, 필수가 아닙니다.
-- 그러니 도시 없는 경로가 제대로 돌아야 합니다.
--
-- 001~005 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

-- ── 1. 나라 기본 시간대 ──────────────────────────────────────────────
-- 시간대가 여럿인 나라는 수도/최대도시 기준입니다. 정확히 하려면 도시를
-- 골라야 하고, 그게 도시 표가 여전히 있는 이유입니다.
alter table public.countries add column if not exists default_timezone text;

update public.countries c set default_timezone = v.tz
from (values
  ('JP','Asia/Tokyo'),        ('KR','Asia/Seoul'),      ('TW','Asia/Taipei'),
  ('HK','Asia/Hong_Kong'),    ('MO','Asia/Macau'),      ('CN','Asia/Shanghai'),
  ('TH','Asia/Bangkok'),      ('SG','Asia/Singapore'),  ('MY','Asia/Kuala_Lumpur'),
  ('VN','Asia/Ho_Chi_Minh'),  ('PH','Asia/Manila'),     ('ID','Asia/Jakarta'),
  ('KH','Asia/Phnom_Penh'),   ('LA','Asia/Vientiane'),  ('MM','Asia/Yangon'),
  ('IN','Asia/Kolkata'),      ('AE','Asia/Dubai'),      ('QA','Asia/Qatar'),
  ('TR','Europe/Istanbul'),   ('IL','Asia/Jerusalem'),
  ('AU','Australia/Sydney'),  ('NZ','Pacific/Auckland'),
  ('GU','Pacific/Guam'),      ('MP','Pacific/Saipan'),
  ('FR','Europe/Paris'),      ('GB','Europe/London'),   ('IE','Europe/Dublin'),
  ('IT','Europe/Rome'),       ('ES','Europe/Madrid'),   ('PT','Europe/Lisbon'),
  ('NL','Europe/Amsterdam'),  ('BE','Europe/Brussels'), ('DE','Europe/Berlin'),
  ('CZ','Europe/Prague'),     ('AT','Europe/Vienna'),   ('HU','Europe/Budapest'),
  ('CH','Europe/Zurich'),     ('DK','Europe/Copenhagen'),('SE','Europe/Stockholm'),
  ('NO','Europe/Oslo'),       ('FI','Europe/Helsinki'), ('IS','Atlantic/Reykjavik'),
  ('HR','Europe/Zagreb'),     ('GR','Europe/Athens'),   ('PL','Europe/Warsaw'),
  ('US','America/New_York'),  ('CA','America/Toronto'), ('MX','America/Mexico_City'),
  ('BR','America/Sao_Paulo'), ('AR','America/Argentina/Buenos_Aires'),
  ('PE','America/Lima'),      ('CL','America/Santiago'),
  ('EG','Africa/Cairo'),      ('MA','Africa/Casablanca'),
  ('ZA','Africa/Johannesburg'),('KE','Africa/Nairobi')
) as v(code, tz)
where c.code = v.code;


-- ── 2. 여행 채우기 다시 쓰기 ─────────────────────────────────────────
-- 도시가 있으면 도시에서, 없으면 나라에서. 둘 다 없으면 손대지 않습니다.
create or replace function public.fill_trip_from_city()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c public.cities%rowtype;
  n public.countries%rowtype;
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
    end if;
  end if;

  -- 통화와 언어는 나라의 성질이라 도시를 골랐든 아니든 나라에서 옵니다.
  select * into n from public.countries where code = new.country;
  if found then
    new.currency   := n.currency;
    new.local_lang := coalesce(new.local_lang, n.local_lang);

    -- 도시를 안 골랐으면 시간대도 나라 기본값을 씁니다.
    -- 이게 없으면 컬럼 기본값 Asia/Tokyo 가 그대로 남습니다.
    if new.city_id is null and n.default_timezone is not null then
      new.timezone := n.default_timezone;
    end if;
  end if;

  -- 도시를 안 골랐으면 이동 등급도 모릅니다. 도쿄(dense) 값을 물려주면
  -- 어디든 지하철이 촘촘한 것처럼 계산합니다. 중간값을 씁니다.
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

  return new;
end $$;


-- ── 3. 확인 ──────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '나라 기본 시간대' as check,
         case when count(*) filter (where default_timezone is null) = 0
              then 'OK' else 'X' end as result,
         count(*) filter (where default_timezone is not null)::text || '/' ||
         count(*)::text || '개' as note
    from public.countries
  union all
  select 2, '시간대가 실재함',
         case when count(*) = 0 then 'OK' else 'X' end,
         coalesce(string_agg(code || '=' || default_timezone, ', '), 'IANA 이름으로 전부 확인됨')
    from public.countries n
   where default_timezone is not null
     and not exists (select 1 from pg_timezone_names z where z.name = n.default_timezone)
) t order by ord;
