-- =====================================================================
-- 여행 후기에 사진 붙이기
--
-- 새로 만들지 않고 이미 있는 trip_reviews(별점 + 한 줄)를 키웁니다.
-- 후기와 일기를 따로 두면 사람들이 어디에 쓸지 헷갈리고, 우리는 두 벌을
-- 고쳐야 합니다. 글은 이미 text 라 길이 제한이 없었습니다 — 화면 쪽에서만
-- 200자로 막고 있었습니다. 여기서 새로 필요한 것은 **사진**뿐입니다.
--
-- 사진은 통(Storage)에 두고 표에는 경로만 남깁니다.
--   경로 규칙: <trip_id>/<user_id>/<아무 이름>.jpg
--   맨 앞 칸이 여행 id 라서, 통의 정책이 그것만 보고 참여자인지 가릅니다.
--
-- **비공개 통입니다.** 남의 여행 사진이 주소만 알면 열리는 것은 안 됩니다.
-- 화면에서는 createSignedUrl 로 잠깐 열리는 주소를 받아 씁니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

-- ── 1. 사진 표 ───────────────────────────────────────────────────────
create table if not exists public.trip_photos (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  path       text not null unique,          -- 통 안의 경로
  caption    text,
  created_at timestamptz not null default now()
);

create index if not exists trip_photos_trip_idx
  on public.trip_photos (trip_id, created_at);

comment on table public.trip_photos is
  '여행 후기 사진. 실제 파일은 trip-photos 통에 있고 여기는 경로만 가짐';

alter table public.trip_photos enable row level security;

-- 같이 간 사람끼리는 서로의 사진을 봅니다. 같은 여행을 다녀왔으니까요.
-- (trip_reviews 의 읽기 정책과 같은 기준입니다)
drop policy if exists photos_read on public.trip_photos;
create policy photos_read on public.trip_photos
  for select using (public.can_read_trip(trip_id));

-- 올리고 지우는 것은 자기 것만. 남의 사진을 지울 수 있으면 안 됩니다.
drop policy if exists photos_own on public.trip_photos;
create policy photos_own on public.trip_photos
  for all using (user_id = auth.uid() and public.can_read_trip(trip_id))
       with check (user_id = auth.uid() and public.can_read_trip(trip_id));

-- ── 2. 통 ────────────────────────────────────────────────────────────
-- public = false. 주소를 알아도 그냥은 안 열립니다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-photos', 'trip-photos', false, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── 3. 통 정책 ───────────────────────────────────────────────────────
-- 경로 맨 앞 칸이 여행 id 입니다. 그것만 보고 참여자인지 가릅니다.
drop policy if exists tphotos_read on storage.objects;
create policy tphotos_read on storage.objects for select
  using (
    bucket_id = 'trip-photos'
    and public.can_read_trip(((storage.foldername(name))[1])::uuid)
  );

-- 올리는 것은 참여자이면서, 자기 칸(두 번째 칸)에만.
drop policy if exists tphotos_write on storage.objects;
create policy tphotos_write on storage.objects for insert
  with check (
    bucket_id = 'trip-photos'
    and public.can_write_trip(((storage.foldername(name))[1])::uuid)
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists tphotos_del on storage.objects;
create policy tphotos_del on storage.objects for delete
  using (
    bucket_id = 'trip-photos'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- ── 4. 내가 남긴 후기 목록 ───────────────────────────────────────────
-- 프로필 > 보관함 > 여행 후기 가 씁니다. 한 번에 받아야 목록이 빨리 뜹니다.
-- 남긴 것이 하나라도 있는(글이든 별점이든 사진이든) 지난 여행만 나옵니다.
create or replace function public.my_reviews()
returns table (trip_id uuid, title text, destination text,
               start_date date, end_date date,
               stars numeric, comment text, photos bigint, cover text)
language sql security definer set search_path = public stable as $$
  select t.id, t.title, t.destination, t.start_date, t.end_date,
         r.stars, r.comment,
         coalesce(p.n, 0) as photos,
         p.cover
    from public.trips t
    join public.trip_members m on m.trip_id = t.id and m.user_id = auth.uid()
    left join public.trip_reviews r
           on r.trip_id = t.id and r.user_id = auth.uid()
    left join lateral (
      select count(*) as n,
             (select path from public.trip_photos
               where trip_id = t.id order by created_at limit 1) as cover
        from public.trip_photos where trip_id = t.id
    ) p on true
   where t.end_date < current_date
     and (r.comment is not null or r.stars is not null or coalesce(p.n, 0) > 0)
   order by t.end_date desc;
$$;

revoke all on function public.my_reviews() from public;
grant execute on function public.my_reviews() to authenticated;

-- 확인
select count(*) as "사진 표 있음(1이어야 함)"
  from information_schema.tables
 where table_schema = 'public' and table_name = 'trip_photos';
select id, public, file_size_limit from storage.buckets where id = 'trip-photos';
select count(*) as "통 정책(3이어야 함)" from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
   and policyname in ('tphotos_read','tphotos_write','tphotos_del');
