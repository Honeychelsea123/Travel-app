-- =====================================================================
-- 진단 — 여행 삭제가 왜 안 먹는지 본다
-- 읽기만 합니다. 아무것도 바꾸지 않습니다.
--
-- 주의: SQL Editor 는 관리자 권한으로 도는 자리라 auth.uid() 가 비어 있습니다.
-- 그래서 여기서는 RLS 를 흉내낼 수 없고, 대신 **정책이 보는 재료**를 봅니다.
-- 소유자 행이 제대로 있는지, 정책이 걸려 있는지 둘을 확인합니다.
-- =====================================================================

-- ① trips 에 걸린 정책. trips_delete 가 있어야 하고 owner 조건이어야 합니다.
select 'policy' as kind, policyname as name, cmd,
       coalesce(qual, '(없음)') as using_expr
  from pg_policies
 where schemaname = 'public' and tablename = 'trips'
 order by cmd, policyname;

-- ② 여행마다 참여자가 제대로 붙어 있는지.
--    만든 사람이 owner 로 들어와 있어야 하고 left_at 이 비어 있어야 합니다.
--    role 이 비었거나 left_at 이 찍혀 있으면 그게 원인입니다.
select 'trip' as kind,
       t.title,
       t.id,
       t.created_by,
       m.user_id,
       m.role::text,
       m.left_at,
       case
         when m.user_id is null                     then 'X  참여자 행이 없음 — 트리거가 안 돌았다'
         when m.user_id <> t.created_by             then '?  만든 사람과 다른 사람'
         when m.left_at is not null                 then 'X  나간 것으로 표시됨'
         when m.role <> 'owner'                     then 'X  소유자가 아님 (' || m.role || ')'
         else                                            'OK 지울 수 있어야 함'
       end as verdict
  from public.trips t
  left join public.trip_members m on m.trip_id = t.id
 order by t.created_at;

-- ③ trips 를 가리키는 외래키가 전부 cascade 인지.
--    하나라도 아니면 삭제가 그 표에 걸려 막힙니다.
select 'fk' as kind,
       c.conrelid::regclass::text as child_table,
       c.conname,
       case c.confdeltype when 'c' then 'cascade'
                          when 'n' then 'set null'
                          when 'a' then 'no action  <-- 삭제를 막는다'
                          when 'r' then 'restrict   <-- 삭제를 막는다'
                          else c.confdeltype::text end as on_delete
  from pg_constraint c
 where c.confrelid = 'public.trips'::regclass and c.contype = 'f'
 order by 3 desc, 2;
