-- =====================================================================
-- 확인 — 001·002 가 제대로 올라갔는지 본다
--
-- 001, 002 를 실행한 뒤 SQL Editor 에 붙여넣고 Run 합니다.
-- 아무것도 바꾸지 않습니다. 읽기만 합니다.
--
-- 결과의 result 칸이 전부 'OK' 여야 다음 단계로 갑니다.
-- 하나라도 'X' 면 note 에 무엇이 빠졌는지 나옵니다.
-- =====================================================================

with
-- 있어야 할 표 18개
expected(name) as (
  select unnest(array[
    'profiles','user_prefs','cities','transit_lines','trips','trip_members',
    'trip_invites','plans','candidates','candidate_votes','expenses',
    'expense_shares','bookings','packing','links','attachments',
    'chats','notifications','ai_usage'
  ])
),
actual as (
  select tablename::text as name, rowsecurity
    from pg_tables where schemaname = 'public'
),
missing as (
  select string_agg(e.name, ', ' order by e.name) as list
    from expected e left join actual a on a.name = e.name
   where a.name is null
),
-- RLS 가 꺼진 표가 하나라도 있으면 그 표의 데이터는 전원에게 열립니다
rls_off as (
  select string_agg(name, ', ' order by name) as list
    from actual where not rowsecurity
),
-- 정책이 하나도 없는 표. RLS 만 켜고 정책이 없으면 아무도 못 읽습니다
no_policy as (
  select string_agg(a.name, ', ' order by a.name) as list
    from actual a
   where a.rowsecurity
     and not exists (select 1 from pg_policies p
                      where p.schemaname='public' and p.tablename = a.name)
),
-- 있어야 할 함수
fns(name) as (
  select unnest(array[
    'trip_role_of','can_read_trip','can_write_trip','redeem_invite',
    'get_shared_trip','rotate_share_token','disable_share',
    'handle_new_user','add_creator_as_owner','fill_trip_from_city','touch_row'
  ])
),
missing_fn as (
  select string_agg(f.name, ', ' order by f.name) as list
    from fns f
   where not exists (select 1 from pg_proc p
                     join pg_namespace n on n.oid = p.pronamespace
                     where n.nspname='public' and p.proname = f.name)
),
-- 재귀 사고 방지: 멤버십 판정 함수는 반드시 SECURITY DEFINER 여야 합니다
not_definer as (
  select string_agg(p.proname, ', ') as list
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname='public'
     and p.proname in ('trip_role_of','can_read_trip','can_write_trip',
                       'redeem_invite','get_shared_trip')
     and not p.prosecdef
),
-- 가입 트리거는 auth.users 에 붙어 있어야 합니다
signup_trg as (
  select count(*) as n from pg_trigger
   where tgname = 'on_auth_user_created' and not tgisinternal
),
counts as (
  select (select count(*) from public.cities)        as cities,
         (select count(*) from public.transit_lines) as lines,
         (select count(*) from pg_policies where schemaname='public') as policies
)
select * from (
  select 1 as ord, '표 18개'          as check,
         case when (select list from missing) is null then 'OK' else 'X' end as result,
         coalesce('없음: ' || (select list from missing), '전부 있음') as note
  union all
  select 2, 'RLS 켜짐',
         case when (select list from rls_off) is null then 'OK' else 'X' end,
         coalesce('꺼짐: ' || (select list from rls_off),
                  '전부 켜짐 — 앱이 실수해도 남의 데이터가 안 샙니다')
  union all
  select 3, '정책 있음',
         case when (select list from no_policy) is null then 'OK' else 'X' end,
         coalesce('정책 없음: ' || (select list from no_policy),
                  (select policies from counts)::text || '개')
  union all
  select 4, '함수',
         case when (select list from missing_fn) is null then 'OK' else 'X' end,
         coalesce('없음: ' || (select list from missing_fn), '전부 있음')
  union all
  select 5, 'SECURITY DEFINER',
         case when (select list from not_definer) is null then 'OK' else 'X' end,
         coalesce('아님: ' || (select list from not_definer),
                  '멤버십 판정이 재귀에 안 걸립니다')
  union all
  select 6, '가입 트리거',
         case when (select n from signup_trg) = 1 then 'OK' else 'X' end,
         '구글 로그인하면 profiles 와 user_prefs 가 자동으로 생깁니다'
  union all
  select 7, '도시 시드',
         case when (select cities from counts) >= 22 then 'OK' else 'X' end,
         (select cities from counts)::text || '개 (22개여야 함)'
  union all
  select 8, '노선색 시드',
         case when (select lines from counts) >= 40 then 'OK' else 'X' end,
         (select lines from counts)::text || '개 (40개여야 함)'
) t order by ord;
