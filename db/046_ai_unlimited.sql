-- =====================================================================
-- AI 사용 한도 — 지금은 걷어둡니다. 관리자는 언제나 무제한입니다.
--
-- 아직 쓰는 사람이 우리뿐이라 하루 15회가 아무도 지켜주지 않는 벽입니다.
-- 다만 **지우지 않고 끕니다.** 사람이 생기면 그날 바로 다시 켜야 하는데,
-- 그때 구조를 새로 만들면 늦습니다 (문서 8-1 이 처음부터 넣으라고 한 이유).
--
-- ★ 다시 켜는 법 ★
--   아래 v_free_for_all 을 false 로 바꾸고 이 파일을 다시 실행하세요.
--   그것 하나면 15회(여행 중 30회)로 돌아갑니다. 관리자는 그래도 무제한입니다.
--
-- "한도 없음"은 **null** 로 나타냅니다. 큰 수(99999)를 쓰지 않는 이유는
-- 화면에 "오늘 3/99999회"라고 찍히기 때문입니다. null 이면 화면이 아예
-- 다른 문장을 고를 수 있습니다.
--
-- 045 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

-- ── 오늘의 한도 ──────────────────────────────────────────────────────
-- null = 한도 없음
create or replace function public.ai_limit(p_user uuid)
returns int
language plpgsql stable security definer set search_path = public as $$
declare
  -- ★ 스위치 ★ 사람이 생기면 false 로 바꾸고 이 파일을 다시 실행하세요.
  v_free_for_all boolean := true;
begin
  -- 관리자는 **스위치와 상관없이** 늘 무제한입니다. 순서가 중요합니다 —
  -- 스위치를 끄는 날에도 이 줄은 그대로 살아 있어야 합니다.
  --
  -- is_admin() 을 못 쓰는 이유: 그것은 auth.uid() 를 보는데, ai_take 는
  -- Edge Function 이 서비스 키로 부르므로 auth.uid() 가 비어 있습니다.
  -- 여기서는 넘겨받은 p_user 로 직접 봐야 합니다.
  if exists (select 1 from public.admins where user_id = p_user) then
    return null;
  end if;

  if v_free_for_all then
    return null;
  end if;

  -- 여기부터는 예전 그대로입니다 (문서 8-1: 무료 15회 · 여행 기간 30회).
  -- "가치를 느끼는 시점에 막으면 다시 안 옵니다."
  return case when exists (
    select 1
      from public.trip_members m
      join public.trips t on t.id = m.trip_id
     where m.user_id = p_user and m.left_at is null
       and current_date between t.start_date and t.end_date
  ) then 30 else 15 end;
end $$;


-- ── 한 번 쓰기 ───────────────────────────────────────────────────────
-- 043 판을 그대로 두고 **비교 한 줄만** 고칩니다.
--
--   v_used >= v_limit  →  v_limit is not null and v_used >= v_limit
--
-- 사실 Postgres 에서는 null 과 비교하면 결과가 null 이고 if 는 그것을
-- 거짓으로 취급하므로 고치지 않아도 통과는 합니다. **그래도 씁니다** —
-- 나중에 이 줄을 읽는 사람이 "한도가 null 이면 어떻게 되지"를 코드에서
-- 바로 알 수 있어야 합니다. 조용히 맞는 것에 기대면 다음 사람이 고칩니다.
create or replace function public.ai_take(p_user uuid, p_kind text default 'chat')
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_limit int := public.ai_limit(p_user);   -- null 이면 한도 없음
  v_used  int;
begin
  insert into public.ai_usage (user_id, day) values (p_user, current_date)
  on conflict (user_id, day) do nothing;

  select case when p_kind = 'review' then review_calls else calls end
    into v_used
    from public.ai_usage
   where user_id = p_user and day = current_date
   for update;

  if v_limit is not null and v_used >= v_limit then
    -- 거절도 기록합니다. 이게 한도를 손볼지 말지의 유일한 근거입니다.
    update public.ai_usage set blocked = blocked + 1
     where user_id = p_user and day = current_date;
    return jsonb_build_object('ok', false, 'used', v_used, 'limit', v_limit);
  end if;

  -- **한도가 없어도 세는 것은 그대로 셉니다.** 얼마나 쓰는지를 모르면
  -- 다시 켤 때 얼마로 켤지도 못 정합니다. 막지 않을 뿐입니다.
  if p_kind = 'review' then
    update public.ai_usage set review_calls = review_calls + 1
     where user_id = p_user and day = current_date;
  else
    update public.ai_usage set calls = calls + 1
     where user_id = p_user and day = current_date;
  end if;

  return jsonb_build_object('ok', true, 'used', v_used + 1, 'limit', v_limit);
end $$;

revoke execute on function public.ai_take(uuid, text) from public;
revoke execute on function public.ai_take(uuid, text) from anon, authenticated;
grant  execute on function public.ai_take(uuid, text) to service_role;


-- ── 확인 ─────────────────────────────────────────────────────────────
-- SQL Editor 는 문장을 여러 개 실행하면 **마지막 결과만** 보여줍니다.
-- 그래서 union all 로 하나에 담습니다.
select * from (
  select 1 as ord, '내 한도(관리자면 null)'::text as check,
         coalesce(public.ai_limit(auth.uid())::text, '없음') as result
  union all
  select 2, '스위치가 켜져 있나 (모두 무제한)',
         case when public.ai_limit(
                '00000000-0000-0000-0000-000000000000'::uuid) is null
              then '켜짐 — 아무도 안 막힙니다'
              else '꺼짐 — 한도 ' || public.ai_limit(
                '00000000-0000-0000-0000-000000000000'::uuid)::text || '회' end
  union all
  select 3, '관리자 수', (select count(*)::text from public.admins)
  union all
  select 4, '오늘 쓴 횟수(나)',
         coalesce((select calls::text from public.ai_usage
                    where user_id = auth.uid() and day = current_date), '0')
) t order by ord;
