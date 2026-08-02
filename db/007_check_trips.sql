-- =====================================================================
-- 진단 — 여행 삭제가 왜 안 먹는지 본다
-- 읽기만 합니다. 아무것도 바꾸지 않습니다.
--
-- SQL Editor 는 문장을 여러 개 실행하면 **마지막 결과만** 보여줍니다.
-- 그래서 전부 한 질의로 합쳤습니다.
--
-- 주의: SQL Editor 는 관리자 권한으로 도는 자리라 auth.uid() 가 비어 있습니다.
-- 여기서 RLS 를 흉내낼 수는 없고, 대신 **정책이 보는 재료**를 봅니다.
-- =====================================================================

select * from (

  -- ① trips 에 걸린 정책. delete 줄이 있어야 하고 owner 조건이어야 합니다.
  select 1 as ord, 'policy'::text as kind,
         cmd::text as a,
         policyname::text as b,
         left(coalesce(qual, '(없음)'), 80) as c
    from pg_policies
   where schemaname = 'public' and tablename = 'trips'

  union all

  -- ② 여행마다 참여자가 제대로 붙어 있는지. 여기가 핵심입니다.
  --    만든 사람이 owner 로 들어와 있고 left_at 이 비어 있어야 지울 수 있습니다.
  select 2, 'trip',
         t.title,
         coalesce(m.role::text, '(참여자 행 없음)') ||
           case when m.left_at is not null then ' · 나감' else '' end,
         case
           when m.user_id is null         then 'X  참여자 행이 없다 — 트리거가 안 돌았다'
           when m.user_id <> t.created_by then '?  만든 사람과 다른 사람이다'
           when m.left_at is not null     then 'X  나간 것으로 표시돼 있다'
           when m.role <> 'owner'         then 'X  소유자가 아니다'
           else                                'OK 지울 수 있어야 한다'
         end
    from public.trips t
    left join public.trip_members m on m.trip_id = t.id

  union all

  -- ③ 로그인한 사람이 누구로 잡혀 있는지. 여행의 created_by 와 같아야 합니다.
  select 3, 'user', u.email::text, u.id::text,
         (select count(*)::text from public.trip_members m where m.user_id = u.id)
         || '개 여행에 참여'
    from auth.users u

  union all

  -- ④ 외래키 요약 (하나라도 cascade 가 아니면 삭제가 막힙니다)
  select 4, 'fk',
         count(*)::text || '개',
         count(*) filter (where confdeltype = 'c')::text || '개 cascade',
         case when count(*) filter (where confdeltype <> 'c') = 0
              then 'OK 삭제를 막는 외래키 없음'
              else 'X  cascade 가 아닌 것이 있다' end
    from pg_constraint
   where confrelid = 'public.trips'::regclass and contype = 'f'

) t order by ord, a, b;
