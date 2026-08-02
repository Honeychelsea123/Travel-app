-- =====================================================================
-- AI 사용량 제한
--
-- 문서 8-1: "나중에 붙이려면 구조를 갈아엎어야 하니 처음부터 넣으세요."
-- 개인별로 셉니다. 한 명이 많이 써도 남이 손해를 보지 않습니다.
--
-- 세는 것은 Edge Function 안에서만 합니다. 화면에서 부를 수 있으면
-- 그냥 안 부르고 넘어가면 그만이라 제한이 아무 의미가 없습니다.
-- 그래서 아래 ai_take 는 anon · authenticated 에서 실행 권한을 뺍니다.
--
-- 009 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

-- ── 오늘의 한도 ──────────────────────────────────────────────────────
-- 문서 8-1의 제안 그대로입니다.
--   무료 15회 · 여행 기간에는 30회.
--   "가치를 느끼는 시점에 막으면 다시 안 옵니다."
create or replace function public.ai_limit(p_user uuid)
returns int
language sql stable security definer set search_path = public as $$
  select case when exists (
    select 1
      from public.trip_members m
      join public.trips t on t.id = m.trip_id
     where m.user_id = p_user and m.left_at is null
       and current_date between t.start_date and t.end_date
  ) then 30 else 15 end;
$$;


-- ── 한 번 쓰기 ───────────────────────────────────────────────────────
-- 확인과 증가를 한 번에 합니다. 나눠 하면 빠르게 두 번 누를 때 둘 다 통과합니다.
-- 일정 검토(review)는 따로 셉니다 — 이 앱의 핵심 기능인데 일반 대화와 같이 세면
-- 아까워서 안 쓰게 됩니다 (문서 8-1).
create or replace function public.ai_take(p_user uuid, p_kind text default 'chat')
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_limit int := public.ai_limit(p_user);
  v_used  int;
begin
  insert into public.ai_usage (user_id, day) values (p_user, current_date)
  on conflict (user_id, day) do nothing;

  select case when p_kind = 'review' then review_calls else calls end
    into v_used
    from public.ai_usage
   where user_id = p_user and day = current_date
   for update;

  if v_used >= v_limit then
    return jsonb_build_object('ok', false, 'used', v_used, 'limit', v_limit);
  end if;

  if p_kind = 'review' then
    update public.ai_usage set review_calls = review_calls + 1
     where user_id = p_user and day = current_date;
  else
    update public.ai_usage set calls = calls + 1
     where user_id = p_user and day = current_date;
  end if;

  return jsonb_build_object('ok', true, 'used', v_used + 1, 'limit', v_limit);
end $$;

-- 화면에서는 못 부릅니다. 서비스 키(Edge Function)만 부를 수 있습니다.
--
-- 주의: Postgres 는 함수를 만들면 PUBLIC 에게 실행 권한을 자동으로 줍니다.
-- anon · authenticated 에서만 빼면 PUBLIC 권한이 남아 그대로 부를 수 있습니다.
-- PUBLIC 을 먼저 걷어내고 service_role 에만 다시 줍니다.
revoke execute on function public.ai_take(uuid, text) from public;
revoke execute on function public.ai_take(uuid, text) from anon, authenticated;
grant  execute on function public.ai_take(uuid, text) to service_role;


-- ── 남은 횟수 보기 ───────────────────────────────────────────────────
-- 문서 8-1: "갑자기 막히면 화가 나지만 줄어드는 게 보이면 납득합니다."
create or replace function public.ai_left()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'limit', public.ai_limit(auth.uid()),
    'used',  coalesce((select calls from public.ai_usage
                        where user_id = auth.uid() and day = current_date), 0)
  );
$$;
grant execute on function public.ai_left() to authenticated;


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, 'ai_limit'::text as check,
         case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                            where n.nspname='public' and p.proname='ai_limit')
              then 'OK' else 'X' end as result,
         '무료 15회 · 여행 기간 30회'::text as note
  union all
  select 2, 'ai_take',
         case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                            where n.nspname='public' and p.proname='ai_take')
              then 'OK' else 'X' end,
         '확인과 증가를 한 번에'
  union all
  select 3, '화면에서 못 부름',
         case when not has_function_privilege('authenticated',
                'public.ai_take(uuid, text)', 'execute')
              then 'OK' else 'X' end,
         'authenticated 에 실행 권한이 없어야 한다'
  union all
  select 4, '서버는 부를 수 있음',
         case when has_function_privilege('service_role',
                'public.ai_take(uuid, text)', 'execute')
              then 'OK' else 'X' end,
         'Edge Function 이 세려면 이건 있어야 한다'
  union all
  select 5, 'ai_left',
         case when has_function_privilege('authenticated', 'public.ai_left()', 'execute')
              then 'OK' else 'X' end,
         '남은 횟수는 화면에서 볼 수 있어야 한다'
) t order by ord;
