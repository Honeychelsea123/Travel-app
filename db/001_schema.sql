-- =====================================================================
-- 여행앱 v2 — 스키마와 RLS
--
-- 근거: Downloads/SUPABASE-MIGRATION.md 의 "결정 목록" 과 1·2장.
-- 실행: Supabase 대시보드 > SQL Editor > 새 쿼리에 통째로 붙여넣고 Run.
--       그 다음 002_seed.sql 을 같은 방식으로 실행합니다.
-- 다시 실행해도 안전합니다 (create if not exists / drop policy if exists).
--
-- 규칙 셋 — 새 테이블을 만들 때마다 같이 지킵니다:
--   1. deleted_at 을 둔다. 진짜 지우지 않는다.
--   2. enable row level security + 정책 두 줄을 같은 자리에서 쓴다.
--   3. 멤버십 판정은 can_read_trip / can_write_trip 함수로만 한다 (아래 4번 참고).
-- =====================================================================


-- ── 1. 역할 ──────────────────────────────────────────────────────────
do $$ begin
  create type public.trip_role as enum ('owner','editor','viewer');
exception when duplicate_object then null; end $$;


-- ── 2. 프로필과 개인 설정 ────────────────────────────────────────────
-- auth.users 는 Supabase 소유라 직접 못 건드립니다. 표시용 정보는 여기 둡니다.
-- 구글 로그인이므로 이름과 사진이 자동으로 들어옵니다.
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- 글자 크기 같은 것은 사람마다 다릅니다.
-- 지금 도쿄 앱은 공유값이라 한 명이 키우면 전원 화면이 커집니다.
create table if not exists public.user_prefs (
  user_id    uuid primary key references auth.users on delete cascade,
  text_scale real not null default 1.0,
  updated_at timestamptz not null default now()
);

-- 가입하면 프로필과 설정이 자동으로 생깁니다. 앱에서 만들 필요가 없습니다.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',
             new.raw_user_meta_data->>'name',
             split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'avatar_url',
             new.raw_user_meta_data->>'picture')
  ) on conflict (id) do nothing;

  insert into public.user_prefs (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ── 3. 도시 (기본값 창고) ────────────────────────────────────────────
-- 문서 "목적지" 절: 일본에 얽매인 부분을 전부 설정값으로 뺀다.
-- 이 표는 여행을 만들 때 trips 로 복사되는 기본값일 뿐입니다.
-- 목록에 없는 도시로도 여행을 만들 수 있어야 하므로, 실제로 계산에 쓰이는
-- 값은 언제나 trips 행에 있습니다. (여기서 join 하지 않습니다.)
create table if not exists public.cities (
  id            text primary key,             -- 'tokyo', 'paris'
  name          text not null,                -- 한국어 표기
  name_local    text,
  name_en       text,
  country       char(2) not null,
  center_lat    double precision not null,
  center_lng    double precision not null,
  timezone      text not null,
  currency      char(3) not null,
  local_lang    text,
  -- 이동시간 모델 (도쿄에서 실제로 쓰던 식)
  --   도보 분 = km * walk_min_per_km + walk_base_min      (km < walk_max_km 일 때)
  --   교통 분 = km * transit_factor  + transit_base_min   (환승·대기 포함)
  walk_max_km       numeric not null default 1.3,
  walk_min_per_km   numeric not null default 12,
  walk_base_min     numeric not null default 2,
  transit_factor    numeric not null default 3.2,
  transit_base_min  numeric not null default 12,
  -- 그 나라에서 쓸 만한 맛집 사이트. 비어 있으면 구글맵만 붙입니다.
  -- (문서: 한국 식당 영수증에 타베로그 링크가 붙는 일이 실제로 있었음)
  food_domains  text[] not null default '{}',
  created_at    timestamptz not null default now()
);
alter table public.cities enable row level security;
drop policy if exists cities_read on public.cities;
create policy cities_read on public.cities for select using (true);


-- ── 4. 노선색 ────────────────────────────────────────────────────────
create table if not exists public.transit_lines (
  id         bigint generated always as identity primary key,
  city_id    text not null references public.cities on delete cascade,
  name       text not null,               -- 메모에서 찾을 한국어 표기
  name_local text,
  color      text not null,               -- #RRGGBB
  dark_text  boolean not null default false,  -- 밝은 색은 글자를 검게
  sort       int not null default 0,      -- 작을수록 먼저. 긴 이름이 앞
  unique (city_id, name)
);
alter table public.transit_lines enable row level security;
drop policy if exists lines_read on public.transit_lines;
create policy lines_read on public.transit_lines for select using (true);


-- ── 5. 여행 ──────────────────────────────────────────────────────────
create table if not exists public.trips (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  city_id       text references public.cities on delete set null,  -- 참고용. 계산에는 안 씀
  destination   text not null,
  country       char(2) not null default 'JP',
  start_date    date not null,
  end_date      date not null,
  -- 목적지에서 파생되는 값들. 도시 목록에 없으면 AI 가 채웁니다.
  timezone      text not null default 'Asia/Tokyo',
  currency      char(3) not null default 'JPY',   -- 현지 통화
  home_currency char(3) not null default 'KRW',   -- 정산해서 보여줄 통화
  local_lang    text default 'ja',                -- 주소를 어느 말로 적을지
  center_lat    double precision,
  center_lng    double precision,
  walk_max_km      numeric not null default 1.3,
  walk_min_per_km  numeric not null default 12,
  walk_base_min    numeric not null default 2,
  transit_factor   numeric not null default 3.2,
  transit_base_min numeric not null default 12,
  hero_image    text,
  -- 읽기 전용 공유. 재발급하면 기존 링크가 죽습니다. null 이면 공유 꺼짐.
  share_token   text unique,
  archived_at   timestamptz,          -- 여행이 끝나면 목록에서 접어둠
  created_by    uuid not null references auth.users default auth.uid(),
  updated_by    uuid references auth.users,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists trips_share_idx on public.trips(share_token)
  where share_token is not null;

-- 여행을 만들 때 도시를 골랐으면 그 도시의 값을 이 여행으로 복사합니다.
-- 복사해 두면 나중에 도시 기본값을 고쳐도 진행 중인 여행이 흔들리지 않습니다.
create or replace function public.fill_trip_from_city()
returns trigger language plpgsql security definer set search_path = public as $$
declare c public.cities%rowtype;
begin
  if new.city_id is null then return new; end if;
  select * into c from public.cities where id = new.city_id;
  if not found then return new; end if;

  -- 앱이 명시적으로 넣은 값은 건드리지 않습니다. 기본값일 때만 채웁니다.
  new.country          := coalesce(nullif(new.country,'JP'), c.country);
  new.timezone         := case when new.timezone = 'Asia/Tokyo' then c.timezone else new.timezone end;
  new.currency         := case when new.currency = 'JPY' then c.currency else new.currency end;
  new.local_lang       := coalesce(new.local_lang, c.local_lang);
  new.center_lat       := coalesce(new.center_lat, c.center_lat);
  new.center_lng       := coalesce(new.center_lng, c.center_lng);
  new.walk_max_km      := c.walk_max_km;
  new.walk_min_per_km  := c.walk_min_per_km;
  new.walk_base_min    := c.walk_base_min;
  new.transit_factor   := c.transit_factor;
  new.transit_base_min := c.transit_base_min;
  return new;
end $$;

drop trigger if exists trips_fill_city on public.trips;
create trigger trips_fill_city before insert on public.trips
  for each row execute function public.fill_trip_from_city();


-- ── 6. 참여자 ────────────────────────────────────────────────────────
create table if not exists public.trip_members (
  trip_id   uuid not null references public.trips on delete cascade,
  user_id   uuid not null references auth.users on delete cascade,
  role      public.trip_role not null default 'editor',
  nickname  text,                  -- 여행별 별명. 비면 계정 이름
  left_at   timestamptz,           -- 나가도 지출은 남김. 화면엔 "탈퇴함"
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create index if not exists trip_members_user_idx on public.trip_members(user_id);

-- 여행을 만들면 만든 사람이 곧바로 owner 로 들어갑니다.
-- 이게 없으면 방금 만든 여행이 RLS 에 걸려 자기 눈에도 안 보입니다.
create or replace function public.add_creator_as_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.trip_members (trip_id, user_id, role)
  values (new.id, new.created_by, 'owner') on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_trip_created on public.trips;
create trigger on_trip_created after insert on public.trips
  for each row execute function public.add_creator_as_owner();


-- ── 7. RLS 헬퍼 ──────────────────────────────────────────────────────
-- !! 이 파일에서 제일 중요한 부분입니다 !!
-- trip_members 의 정책이 trip_members 를 직접 조회하면 무한 재귀가 나서
-- 모든 질의가 42P17 로 죽습니다. SECURITY DEFINER 함수는 RLS 를 건너뛰므로
-- 그 고리가 끊깁니다. 멤버십 판정은 반드시 이 세 함수로만 합니다.
-- 나간 사람(left_at)은 더 이상 참여자가 아닙니다.
create or replace function public.trip_role_of(p_trip uuid)
returns public.trip_role
language sql stable security definer set search_path = public as $$
  select role from public.trip_members
   where trip_id = p_trip and user_id = auth.uid() and left_at is null;
$$;

create or replace function public.can_read_trip(p_trip uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.trip_members
     where trip_id = p_trip and user_id = auth.uid() and left_at is null
  );
$$;

create or replace function public.can_write_trip(p_trip uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.trip_members
     where trip_id = p_trip and user_id = auth.uid() and left_at is null
       and role in ('owner','editor')
  );
$$;


-- ── 8. 여행/참여자/프로필 정책 ───────────────────────────────────────
alter table public.trips enable row level security;

drop policy if exists trips_select on public.trips;
create policy trips_select on public.trips
  for select using (public.can_read_trip(id));

drop policy if exists trips_insert on public.trips;
create policy trips_insert on public.trips
  for insert with check (created_by = auth.uid());

drop policy if exists trips_update on public.trips;
create policy trips_update on public.trips
  for update using (public.can_write_trip(id));

drop policy if exists trips_delete on public.trips;
create policy trips_delete on public.trips
  for delete using (public.trip_role_of(id) = 'owner');

alter table public.trip_members enable row level security;

drop policy if exists members_select on public.trip_members;
create policy members_select on public.trip_members
  for select using (public.can_read_trip(trip_id));

-- 별명은 자기 것만 고칩니다. 남의 별명을 바꾸면 안 됩니다.
drop policy if exists members_self_update on public.trip_members;
create policy members_self_update on public.trip_members
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 내보내기·역할 변경은 owner 만. 새로 들어오는 길은 redeem_invite() 하나뿐입니다.
drop policy if exists members_admin on public.trip_members;
create policy members_admin on public.trip_members
  for all using (public.trip_role_of(trip_id) = 'owner')
       with check (public.trip_role_of(trip_id) = 'owner');

alter table public.user_prefs enable row level security;
drop policy if exists prefs_self on public.user_prefs;
create policy prefs_self on public.user_prefs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.profiles enable row level security;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- 같은 여행에 있는 사람의 이름/사진은 서로 보여야 합니다.
-- 나간 사람도 지출에 이름이 남으므로 left_at 을 따지지 않습니다.
drop policy if exists profiles_shared on public.profiles;
create policy profiles_shared on public.profiles
  for select using (
    exists (
      select 1 from public.trip_members me
      join public.trip_members them on them.trip_id = me.trip_id
      where me.user_id = auth.uid() and me.left_at is null
        and them.user_id = public.profiles.id
    )
  );


-- ── 9. 초대 ──────────────────────────────────────────────────────────
create or replace function public.gen_token(p_len int default 8)
returns text language sql volatile as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, p_len));
$$;

create table if not exists public.trip_invites (
  code       text primary key default public.gen_token(8),
  trip_id    uuid not null references public.trips on delete cascade,
  role       public.trip_role not null default 'editor',
  created_by uuid not null references auth.users default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  max_uses   int not null default 20,
  uses       int not null default 0
);
alter table public.trip_invites enable row level security;

drop policy if exists invites_select on public.trip_invites;
create policy invites_select on public.trip_invites
  for select using (public.can_read_trip(trip_id));

drop policy if exists invites_write on public.trip_invites;
create policy invites_write on public.trip_invites
  for all using (public.trip_role_of(trip_id) = 'owner')
       with check (public.trip_role_of(trip_id) = 'owner');

-- 코드를 받은 사람은 아직 멤버가 아니라 위 정책으로는 초대장을 못 읽습니다.
-- 그래서 가입은 이 함수로만 합니다. 서버에서 코드·만료·횟수를 확인합니다.
-- 문서 "첫 진입 처리": 로그인 후 바로 그 여행으로 보내려고 trip_id 를 돌려줍니다.
create or replace function public.redeem_invite(p_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v public.trip_invites%rowtype;
  v_new boolean := false;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;

  select * into v from public.trip_invites
   where code = upper(trim(p_code)) for update;

  if not found then raise exception '초대 코드가 없습니다'; end if;
  if v.expires_at < now() then raise exception '만료된 초대입니다'; end if;
  if v.uses >= v.max_uses then raise exception '사용 횟수를 넘었습니다'; end if;

  -- 이미 들어와 있으면 역할을 낮추지 않고 그대로 둡니다.
  -- 나갔다 다시 들어오면 left_at 을 지웁니다.
  insert into public.trip_members (trip_id, user_id, role)
  values (v.trip_id, auth.uid(), v.role)
  on conflict (trip_id, user_id) do update set left_at = null;

  get diagnostics v_new = row_count;
  if v_new then
    update public.trip_invites set uses = uses + 1 where code = v.code;
  end if;

  return v.trip_id;
end $$;


-- ── 10. 일정 ─────────────────────────────────────────────────────────
-- 문서 "날짜" 절: Day 번호가 아니라 실제 날짜를 저장합니다.
-- 그래야 한국에서 미리 결제한 항공권·보험이 Day 1 로 밀려 들어가지 않습니다.
-- Day 번호는 trips.start_date 로 화면에서 계산합니다. 저장하지 않습니다.
create table if not exists public.plans (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips on delete cascade,
  date       date not null,
  start_time time,          -- 문자열이 아니라 실제 시각. DB 가 정렬합니다
  end_time   time,          -- 시간 충돌·이동시간 검사에 필요합니다
  category   text,
  title      text not null,
  memo       text,
  move_note  text,          -- '긴자선 3정거장' — 노선색을 여기서 찾습니다
  lat        double precision,
  lng        double precision,
  candidate_id uuid,        -- 후보에서 올라온 것 (10번 뒤에 FK 를 겁니다)
  -- 소수를 쓰면 두 항목 사이에 끼울 때 그 둘만 건드리면 됩니다.
  -- 정수로 줄줄이 다시 매기면 같이 편집할 때 서로의 순서를 덮어씁니다.
  sort_order numeric not null default 0,
  created_by uuid references auth.users default auth.uid(),
  updated_by uuid references auth.users,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists plans_trip_idx on public.plans(trip_id, date, start_time, sort_order)
  where deleted_at is null;


-- ── 11. 후보와 투표 ──────────────────────────────────────────────────
-- 날짜를 정하지 않고 가고 싶은 곳을 모으는 곳. 여행 준비의 상당 부분이 여깁니다.
create table if not exists public.candidates (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips on delete cascade,
  title       text not null,
  title_local text,                 -- 현지 표기 (구글맵·간판에서 찾을 때)
  category    text,
  memo        text,
  lat         double precision,
  lng         double precision,
  address     text,
  hours       text,
  price_range text,
  -- 출처가 분명할 때만 채웁니다. 리뷰어 개인 점수를 가게 점수로 쓰지 않습니다
  -- (도쿄 앱에서 타베로그 3.92 를 3.5 로 답한 사고가 그것입니다).
  rating      numeric,
  rating_src  text,
  url         text,
  source      text,                 -- ai | blog | photo | search | manual
  source_url  text,
  created_by  uuid references auth.users default auth.uid(),
  updated_by  uuid references auth.users,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index if not exists candidates_trip_idx on public.candidates(trip_id)
  where deleted_at is null;

do $$ begin
  alter table public.plans
    add constraint plans_candidate_fk
    foreign key (candidate_id) references public.candidates on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.candidate_votes (
  candidate_id uuid not null references public.candidates on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  vote         smallint not null,   -- 1 찬성 / -1 반대 / 0 보류
  voted_at     timestamptz not null default now(),
  primary key (candidate_id, user_id)
);


-- ── 12. 지출과 정산 ──────────────────────────────────────────────────
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips on delete cascade,
  plan_id     uuid references public.plans on delete set null,
  date        date not null,        -- 여행 전 결제도 넣을 수 있어야 합니다
  title       text not null,
  amount      numeric not null,
  currency    char(3) not null,
  amount_home numeric,              -- trips.home_currency 로 환산한 값
  fx_rate     numeric,
  method      text,
  category    text,
  -- 이름 문자열이 아니라 사용자 ID. 오타가 나면 정산이 어긋납니다.
  payer_id    uuid references auth.users,
  memo        text,
  created_by  uuid references auth.users default auth.uid(),
  updated_by  uuid references auth.users,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index if not exists expenses_trip_idx on public.expenses(trip_id, date)
  where deleted_at is null;

-- 비어 있으면 참여자 전원 균등입니다. 그래서 대부분은 아무것도 안 넣습니다.
-- "이건 나랑 지훈만" 같은 경우에만 행이 생깁니다.
create table if not exists public.expense_shares (
  expense_id uuid not null references public.expenses on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  weight     real not null default 1,
  primary key (expense_id, user_id)
);


-- ── 13. 예약 ─────────────────────────────────────────────────────────
create table if not exists public.bookings (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips on delete cascade,
  kind       text not null,        -- 항공 | 숙소 | 식당 | 티켓 | 기타
  title      text not null,
  ref        text,                 -- 예약번호
  start_date date, start_time time,
  end_date   date, end_time   time,
  address    text,
  tel        text,
  memo       text,
  lat double precision, lng double precision,
  created_by uuid references auth.users default auth.uid(),
  updated_by uuid references auth.users,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists bookings_trip_idx on public.bookings(trip_id, start_date)
  where deleted_at is null;


-- ── 14. 준비물 ───────────────────────────────────────────────────────
create table if not exists public.packing (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips on delete cascade,
  category    text,
  title       text not null,
  -- 참여자와 연결돼야 "내가 챙길 것"만 볼 수 있습니다. 문자열이면 안 됩니다.
  assignee_id uuid references auth.users,
  done        boolean not null default false,
  memo        text,
  sort_order  numeric not null default 0,
  created_by  uuid references auth.users default auth.uid(),
  updated_by  uuid references auth.users,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index if not exists packing_trip_idx on public.packing(trip_id)
  where deleted_at is null;


-- ── 15. 링크 ─────────────────────────────────────────────────────────
create table if not exists public.links (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips on delete cascade,
  category   text,
  title      text not null,
  url        text not null,
  memo       text,
  sort_order numeric not null default 0,
  created_by uuid references auth.users default auth.uid(),
  updated_by uuid references auth.users,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists links_trip_idx on public.links(trip_id)
  where deleted_at is null;


-- ── 16. 첨부 (여권·보험증서·영수증·사진) ─────────────────────────────
-- 파일 자체는 Storage 의 trip-files 버킷에, 여기엔 위치와 뜻만 둡니다.
create table if not exists public.attachments (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips on delete cascade,
  plan_id    uuid references public.plans on delete set null,
  expense_id uuid references public.expenses on delete set null,
  booking_id uuid references public.bookings on delete set null,
  path       text not null,        -- storage 경로: <trip_id>/<uuid>.jpg
  kind       text not null default 'photo',  -- photo | receipt | ticket | document
  mime       text,
  bytes      bigint,
  width int, height int,
  caption    text,
  created_by uuid references auth.users default auth.uid(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists attachments_trip_idx on public.attachments(trip_id)
  where deleted_at is null;


-- ── 17. 대화 (사람별로 분리) ─────────────────────────────────────────
-- 섞이면 AI 가 남의 질문을 맥락으로 씁니다.
-- "아까 말한 그 라멘집" 이 다른 사람 대화일 수 있습니다.
create table if not exists public.chats (
  id         bigint generated always as identity primary key,
  trip_id    uuid not null references public.trips on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  role       text not null,        -- user | model
  content    text not null,
  created_at timestamptz not null default now()
);
create index if not exists chats_idx on public.chats(trip_id, user_id, created_at desc);


-- ── 18. 알림 ─────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users on delete cascade,
  trip_id    uuid references public.trips on delete cascade,
  kind       text not null,        -- plan_changed | expense_added | invited | ...
  body       text not null,
  actor_id   uuid references auth.users,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_unread_idx
  on public.notifications(user_id, created_at desc) where read_at is null;


-- ── 19. AI 사용량 ────────────────────────────────────────────────────
-- 문서 8-1: 나중에 붙이려면 구조를 갈아엎어야 하니 처음부터 넣습니다.
-- 개인별로 셉니다. 한 명이 많이 써도 남이 손해를 보지 않습니다.
-- 일정 검토(review_calls)는 따로 셉니다 — 이 앱의 핵심 기능인데
-- 일반 대화와 같이 세면 아까워서 안 쓰게 됩니다.
-- 실제 증가는 Edge Function 안에서 service key 로만 합니다.
create table if not exists public.ai_usage (
  user_id      uuid not null references auth.users on delete cascade,
  day          date not null default current_date,
  calls        int not null default 0,
  review_calls int not null default 0,
  searches     int not null default 0,
  tokens       bigint not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
-- 남은 횟수를 보여줘야 납득합니다. 읽기만 되고 쓰기는 아무도 못 합니다.
drop policy if exists usage_self on public.ai_usage;
create policy usage_self on public.ai_usage
  for select using (user_id = auth.uid());


-- ── 20. 여행에 딸린 표들의 정책 (전부 같은 모양) ─────────────────────
-- deleted_at 은 정책으로 거르지 않습니다. 삭제 복구 화면이 지운 것을 봐야 하고,
-- 소프트 삭제는 UPDATE 라 편집자면 됩니다. 평소 조회에서 앱이 걸러냅니다.
do $$
declare t text;
begin
  foreach t in array array[
    'plans','candidates','expenses','bookings','packing','links','attachments'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format(
      'create policy %I_select on public.%I for select using (public.can_read_trip(trip_id))', t, t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format(
      'create policy %I_write on public.%I for all using (public.can_write_trip(trip_id))
         with check (public.can_write_trip(trip_id))', t, t);
  end loop;
end $$;

-- 투표와 분담은 trip_id 가 없어 부모를 거쳐 판정합니다.
alter table public.candidate_votes enable row level security;
drop policy if exists votes_select on public.candidate_votes;
create policy votes_select on public.candidate_votes for select using (
  exists (select 1 from public.candidates c
           where c.id = candidate_id and public.can_read_trip(c.trip_id)));
-- 투표는 자기 것만. 남의 표를 바꾸면 안 됩니다. viewer 도 투표는 됩니다.
drop policy if exists votes_self on public.candidate_votes;
create policy votes_self on public.candidate_votes for all
  using (user_id = auth.uid() and exists (
    select 1 from public.candidates c
     where c.id = candidate_id and public.can_read_trip(c.trip_id)))
  with check (user_id = auth.uid() and exists (
    select 1 from public.candidates c
     where c.id = candidate_id and public.can_read_trip(c.trip_id)));

alter table public.expense_shares enable row level security;
drop policy if exists shares_all on public.expense_shares;
create policy shares_all on public.expense_shares for all
  using (exists (select 1 from public.expenses e
                  where e.id = expense_id and public.can_read_trip(e.trip_id)))
  with check (exists (select 1 from public.expenses e
                       where e.id = expense_id and public.can_write_trip(e.trip_id)));

alter table public.chats enable row level security;
drop policy if exists chats_self on public.chats;
create policy chats_self on public.chats for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.notifications enable row level security;
drop policy if exists notif_self on public.notifications;
create policy notif_self on public.notifications for select
  using (user_id = auth.uid());
-- 읽음 표시만 할 수 있습니다. 만드는 건 서버(트리거·Edge Function)입니다.
drop policy if exists notif_read on public.notifications;
create policy notif_read on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());


-- ── 21. updated_at / updated_by 자동 기록 ────────────────────────────
-- 문서 "변경 이력은 남기지 않는다. 대신 마지막 수정자만 기록한다."
create or replace function public.touch_row()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  new.updated_by = coalesce(auth.uid(), new.updated_by);
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'trips','plans','candidates','expenses','bookings','packing','links'
  ] loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format(
      'create trigger %I_touch before update on public.%I
         for each row execute function public.touch_row()', t, t);
  end loop;
end $$;


-- ── 22. 읽기 전용 공유 링크 ──────────────────────────────────────────
-- 부모님께 일정만 보여주는 용도입니다. 계정을 만들라고 하면 안 봅니다.
-- 지출·예약·준비물·대화는 절대 나가지 않습니다 (예약번호·주소·전화가 딸려 가면 안 됨).
-- RLS 로 익명 접근을 열면 실수 한 번에 다 새므로, 나가는 것을 여기서 손으로 고릅니다.
create or replace function public.get_shared_trip(p_token text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select case when t.id is null then null else jsonb_build_object(
    'trip', jsonb_build_object(
      'title', t.title, 'destination', t.destination,
      'start_date', t.start_date, 'end_date', t.end_date,
      'timezone', t.timezone, 'hero_image', t.hero_image,
      'center_lat', t.center_lat, 'center_lng', t.center_lng),
    'plans', coalesce((
      select jsonb_agg(jsonb_build_object(
               'date', p.date, 'start_time', p.start_time, 'end_time', p.end_time,
               'category', p.category, 'title', p.title, 'memo', p.memo,
               'move_note', p.move_note, 'lat', p.lat, 'lng', p.lng)
             order by p.date, p.start_time nulls last, p.sort_order)
        from public.plans p
       where p.trip_id = t.id and p.deleted_at is null), '[]'::jsonb)
  ) end
  from public.trips t
  where t.share_token = nullif(trim(p_token), '')
    and t.share_token is not null;
$$;

-- 로그인 안 한 사람도 부를 수 있어야 합니다.
grant execute on function public.get_shared_trip(text) to anon, authenticated;

-- 토큰 발급·재발급. 재발급하면 기존 링크가 즉시 죽습니다.
create or replace function public.rotate_share_token(p_trip uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_token text;
begin
  if public.trip_role_of(p_trip) <> 'owner' then
    raise exception '소유자만 공유 링크를 만들 수 있습니다';
  end if;
  v_token := public.gen_token(16);
  update public.trips set share_token = v_token where id = p_trip;
  return v_token;
end $$;

create or replace function public.disable_share(p_trip uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.trip_role_of(p_trip) <> 'owner' then
    raise exception '소유자만 공유를 끌 수 있습니다';
  end if;
  update public.trips set share_token = null where id = p_trip;
end $$;


-- ── 23. 실시간 ───────────────────────────────────────────────────────
-- 같이 편집하므로 상대의 변경이 바로 보여야 합니다.
-- 도쿄 앱의 8초 폴링(getRevision)을 이걸로 대체합니다. REV 는 사라집니다.
do $$
declare t text;
begin
  foreach t in array array[
    'trips','trip_members','plans','candidates','candidate_votes',
    'expenses','expense_shares','bookings','packing','links',
    'attachments','notifications'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
