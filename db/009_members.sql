-- =====================================================================
-- 일행 목록을 한 번에 읽을 수 있게 한다
--
-- trip_members.user_id 는 auth.users 만 가리키고 있었습니다.
-- 그래서 "이 여행의 참여자와 그 사람 이름·사진"을 한 질의로 못 가져옵니다.
-- PostgREST 는 외래키가 있어야 표를 이어 붙여 주기 때문입니다.
--
-- profiles.id 도 auth.users 를 가리키므로 값은 언제나 같습니다.
-- 외래키를 하나 더 걸어 이어 붙일 길만 만들어 줍니다.
--
-- 008 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

do $$ begin
  alter table public.trip_members
    add constraint trip_members_profile_fk
    foreign key (user_id) references public.profiles(id) on delete cascade;
exception when duplicate_object then null; end $$;

-- 지출의 결제자도 같은 이유로 이어 붙일 수 있어야 합니다 (정산 화면에서 씁니다).
do $$ begin
  alter table public.expenses
    add constraint expenses_payer_profile_fk
    foreign key (payer_id) references public.profiles(id) on delete set null;
exception when duplicate_object then null; end $$;


-- ── 초대 코드로 들어온 뒤 여행 이름을 보여주기 위한 것 ────────────────
-- 코드를 받은 사람은 아직 멤버가 아니라 trips 를 못 읽습니다.
-- 수락하기 전에 "무슨 여행에 초대받았는지"는 보여줘야 하므로
-- 이름과 날짜만 돌려주는 함수를 둡니다. 그 밖의 것은 나가지 않습니다.
create or replace function public.peek_invite(p_code text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select case when t.id is null then null else jsonb_build_object(
    'title', t.title, 'destination', t.destination,
    'start_date', t.start_date, 'end_date', t.end_date,
    'role', i.role,
    'expired', (i.expires_at < now() or i.uses >= i.max_uses)
  ) end
  from public.trip_invites i
  join public.trips t on t.id = i.trip_id
  where i.code = upper(trim(p_code));
$$;

grant execute on function public.peek_invite(text) to anon, authenticated;


-- 확인
select * from (
  select 1 as ord, '일행 잇기'::text as check,
         case when exists (select 1 from pg_constraint
                            where conname = 'trip_members_profile_fk')
              then 'OK' else 'X' end as result
  union all
  select 2, '결제자 잇기',
         case when exists (select 1 from pg_constraint
                            where conname = 'expenses_payer_profile_fk')
              then 'OK' else 'X' end
  union all
  select 3, '초대 미리보기',
         case when exists (select 1 from pg_proc p
                           join pg_namespace n on n.oid = p.pronamespace
                            where n.nspname='public' and p.proname='peek_invite')
              then 'OK' else 'X' end
  union all
  select 4, '초대 수락',
         case when exists (select 1 from pg_proc p
                           join pg_namespace n on n.oid = p.pronamespace
                            where n.nspname='public' and p.proname='redeem_invite')
              then 'OK' else 'X' end
) t order by ord;
