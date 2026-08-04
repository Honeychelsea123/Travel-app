-- =====================================================================
-- 검색 결과 보관함
--
-- AI 가 웹을 검색할 수 있게 붙이면서(Tavily) 같이 필요한 것입니다.
-- 도쿄 앱은 Apps Script 의 CacheService 에 1시간 담아뒀는데,
-- Edge Function 에는 그런 것이 없어서 표로 만듭니다.
--
-- **왜 필요한가.** Tavily 는 검색 한 번이 크레딧 한 개입니다.
-- 같은 질문을 두 사람이 하거나 한 사람이 다시 물으면 그때마다 나갑니다.
-- "신주쿠 라멘 영업시간"은 한 시간 안에 바뀌지 않습니다.
--
-- 화면에서는 아무도 못 읽습니다. Edge Function 이 서비스 키로만 씁니다 —
-- 남의 검색어를 들여다볼 수 있으면 안 됩니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

create table if not exists public.search_cache (
  key        text primary key,      -- 검색어 + 도메인 제한을 합쳐 만든 값
  results    jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists search_cache_at_idx on public.search_cache(created_at);

alter table public.search_cache enable row level security;
-- 정책을 하나도 안 만듭니다. 그러면 서비스 키 말고는 아무도 못 읽고 못 씁니다.
-- (RLS 를 켜고 정책이 없으면 전부 거부입니다.)

-- 오래된 것을 치웁니다. Edge Function 이 검색할 때마다 한 번씩 부릅니다 —
-- 따로 도는 장치가 없어도 표가 무한정 커지지 않습니다.
create or replace function public.sweep_search_cache()
returns void
language sql security definer set search_path = public as $$
  delete from public.search_cache where created_at < now() - interval '6 hours';
$$;


-- ── 확인 ─────────────────────────────────────────────────────────────
select 'search_cache 표' as item, to_regclass('public.search_cache') is not null as ok
union all select 'sweep 함수', to_regproc('public.sweep_search_cache') is not null
union all select '아무나 못 읽음',
  not exists (select 1 from pg_policies
               where schemaname='public' and tablename='search_cache');
