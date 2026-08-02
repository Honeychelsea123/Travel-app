-- =====================================================================
-- 여행을 안 고르고 나눈 대화도 저장한다
--
-- chats.trip_id 가 not null 이라 여행에 매달린 대화만 남길 수 있었습니다.
-- 그런데 "어디로 갈까" 는 여행을 만들기 전에 묻는 말입니다.
-- 그 대화가 새로고침하면 사라지고 있었습니다.
--
-- 칸을 비울 수 있게 하고, 여행 없는 대화만 빨리 찾을 색인을 답니다.
-- 정책은 손대지 않습니다 — 이미 user_id = auth.uid() 라 그대로 맞습니다.
--
-- 028 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

alter table public.chats alter column trip_id drop not null;

-- 여행 없는 대화는 trip_id 가 null 이라 기존 색인((trip_id, user_id, ...))을
-- 잘 못 탑니다. 그것만 따로 모으는 색인을 답니다.
create index if not exists chats_free_idx
  on public.chats(user_id, created_at desc)
  where trip_id is null;


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '여행 없이 저장 가능'::text as check,
         case when (select is_nullable from information_schema.columns
                     where table_schema='public' and table_name='chats'
                       and column_name='trip_id') = 'YES'
              then 'OK' else 'X' end as result,
         '어디로 갈지 묻는 말은 여행보다 먼저입니다'::text as note
  union all
  select 2, '색인',
         case when exists (select 1 from pg_indexes
                            where schemaname='public' and indexname='chats_free_idx')
              then 'OK' else 'X' end,
         '여행 없는 대화만 모아 봅니다'
  union all
  select 3, '정책은 그대로',
         case when exists (select 1 from pg_policies
                            where schemaname='public' and tablename='chats'
                              and policyname='chats_self')
              then 'OK' else 'X' end,
         'user_id = auth.uid() 라 여행이 없어도 내 것만 보입니다'
  union all
  select 4, '지금 쌓인 대화',
         (select count(*)::text from public.chats),
         '여행 없는 것 ' ||
         (select count(*)::text from public.chats where trip_id is null) || '건'
) t order by ord;
