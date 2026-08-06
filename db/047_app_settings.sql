-- =====================================================================
-- 관리자가 앱 안에서 바꾸는 설정
--
-- 046 은 한도 스위치를 **함수 안에 글자로** 박아뒀습니다. 그러면 껐다 켤
-- 때마다 SQL 을 열어 고치고 다시 실행해야 합니다. 운영하는 사람이
-- 개발 도구를 열어야 한다면 그건 아직 만들다 만 것입니다.
--
-- 값을 표로 옮기고, 화면에서 바꿉니다.
--
-- **읽기는 관리자만입니다.** 일반 사용자는 이 표를 볼 이유가 없습니다 —
-- 한도는 ai_limit(SECURITY DEFINER)이 대신 읽어 판정만 돌려줍니다.
-- **쓰기 정책은 일부러 안 만듭니다.** 아래 RPC 로만 바꿉니다. 표에 직접
-- 쓰게 두면 값의 모양(jsonb 안에 무엇이 들어가야 하는지)을 아무도 안 지킵니다.
--
-- 046 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.app_settings enable row level security;

drop policy if exists app_settings_admin_read on public.app_settings;
create policy app_settings_admin_read on public.app_settings for select
  using (public.is_admin());

-- 기본값. **이미 있으면 안 덮습니다** — 여러 번 실행해도 관리자가 바꿔둔
-- 값이 초기화되면 안 됩니다.
--
-- 지금은 **돈에 직결된 셋**만 둡니다. 더 필요해지면 여기에 키를 더하고
-- 아래 admin_setting_set 에 검사만 붙이면 됩니다.
insert into public.app_settings (key, value) values
  ('ai_limit',   '{"on": false, "day": 15, "trip": 30}'::jsonb),
  ('web_search', '{"on": true}'::jsonb),
  ('ai_model',   '{"name": "gemini-3.6-flash"}'::jsonb)
on conflict (key) do nothing;


-- ── 오늘의 한도 ──────────────────────────────────────────────────────
-- null = 한도 없음. 046 과 같고, 스위치를 표에서 읽는 것만 다릅니다.
create or replace function public.ai_limit(p_user uuid)
returns int
language plpgsql stable security definer set search_path = public as $$
declare
  v_cfg jsonb;
begin
  -- 관리자는 **설정과 상관없이** 늘 무제한입니다. 순서가 중요합니다 —
  -- 한도를 켜는 날에도 이 줄은 그대로 살아 있어야 합니다.
  --
  -- is_admin() 을 못 쓰는 이유: 그것은 auth.uid() 를 보는데, ai_take 는
  -- Edge Function 이 서비스 키로 부르므로 auth.uid() 가 비어 있습니다.
  if exists (select 1 from public.admins where user_id = p_user) then
    return null;
  end if;

  -- 표가 비어 있어도 앱이 멈추면 안 됩니다. 없으면 '한도 없음'으로 봅니다 —
  -- 설정을 못 읽었다고 사용자를 막아버리는 쪽이 더 나쁩니다.
  select value into v_cfg from public.app_settings where key = 'ai_limit';
  if v_cfg is null or not coalesce((v_cfg->>'on')::boolean, false) then
    return null;
  end if;

  return case when exists (
    select 1
      from public.trip_members m
      join public.trips t on t.id = m.trip_id
     where m.user_id = p_user and m.left_at is null
       and current_date between t.start_date and t.end_date
  ) then coalesce((v_cfg->>'trip')::int, 30)
    else coalesce((v_cfg->>'day')::int, 15) end;
end $$;


-- ── 화면에서 읽기 ────────────────────────────────────────────────────
create or replace function public.admin_settings()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 볼 수 있습니다.';
  end if;
  return coalesce(
    (select jsonb_object_agg(key, value) from public.app_settings),
    '{}'::jsonb);
end $$;
grant execute on function public.admin_settings() to authenticated;


-- ── 화면에서 바꾸기 ──────────────────────────────────────────────────
-- 키마다 **모양을 여기서 검사합니다.** 화면을 믿으면 안 됩니다 —
-- 콘솔에서 아무 값이나 넣어 부를 수 있고, 그러면 ai_limit 이 조용히
-- 이상한 값을 돌려주기 시작합니다.
create or replace function public.admin_setting_set(p_key text, p_value jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_day int; v_trip int;
begin
  if not public.is_admin() then
    raise exception '관리자만 바꿀 수 있습니다.';
  end if;

  if p_key = 'ai_limit' then
    if (p_value->>'on') is null or (p_value->>'on') not in ('true','false') then
      raise exception 'on 은 true 나 false 여야 합니다.';
    end if;
    v_day  := (p_value->>'day')::int;
    v_trip := (p_value->>'trip')::int;
    -- 0 을 넣으면 아무도 한 번도 못 씁니다. 그건 끄는 것과 다른 사고입니다.
    if v_day is null or v_day < 1 or v_day > 10000 then
      raise exception '하루 한도는 1 이상 10000 이하여야 합니다.';
    end if;
    if v_trip is null or v_trip < 1 or v_trip > 10000 then
      raise exception '여행 중 한도는 1 이상 10000 이하여야 합니다.';
    end if;
    p_value := jsonb_build_object(
      'on',   (p_value->>'on')::boolean,
      'day',  v_day,
      'trip', v_trip);

  elsif p_key = 'web_search' then
    if (p_value->>'on') is null or (p_value->>'on') not in ('true','false') then
      raise exception 'on 은 true 나 false 여야 합니다.';
    end if;
    p_value := jsonb_build_object('on', (p_value->>'on')::boolean);

  elsif p_key = 'ai_model' then
    -- **아무 글자나 받으면 안 됩니다.** 오타 하나면 모든 요청이 404 로 죽고,
    -- 화면에는 "AI 가 답을 못 했어요"로만 보여서 원인을 못 찾습니다.
    -- 쓸 수 있는 것만 적어둡니다. 새 모델이 나오면 여기에 한 줄 더합니다.
    if (p_value->>'name') not in ('gemini-3.6-flash', 'gemini-3.5-flash-lite') then
      raise exception '쓸 수 없는 모델입니다: %', coalesce(p_value->>'name', '(빈값)');
    end if;
    p_value := jsonb_build_object('name', p_value->>'name');

  else
    raise exception '모르는 설정입니다: %', p_key;
  end if;

  insert into public.app_settings (key, value, updated_at, updated_by)
  values (p_key, p_value, now(), auth.uid())
  on conflict (key) do update
    set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;

  return p_value;
end $$;
grant execute on function public.admin_setting_set(text, jsonb) to authenticated;


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '설정 표'::text as check,
         coalesce((select value::text from public.app_settings where key='ai_limit'),
                  '(없음)') as result
  union all
  select 2, '내 한도(관리자면 없음)',
         coalesce(public.ai_limit(auth.uid())::text, '없음')
  union all
  select 3, '남의 한도(스위치 확인용)',
         coalesce(public.ai_limit(
           '00000000-0000-0000-0000-000000000000'::uuid)::text || '회', '없음')
  union all
  select 4, '나는 관리자인가', public.is_admin()::text
) t order by ord;
