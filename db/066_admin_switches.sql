-- =====================================================================
-- 배포 없이 손을 쓸 수 있는 스위치들
--
-- 047 의 셋(AI 한도·웹 검색·모델)은 전부 **돈**입니다. 남에게 열기
-- 시작하면 필요한 것은 종류가 다릅니다 — **일이 터졌을 때 배포를
-- 기다리지 않아도 되는 것**입니다. 배포는 몇 분 걸리고 그 사이에도
-- 돈이 나가거나 잘못된 알림이 계속 갑니다.
--
--   ai_on       AI 통째로 끄기 (비상). 한도만으로는 못 끕니다
--   signup_on   가입 받기. 쓰던 사람은 그대로 두고 새 유입만 막습니다
--   push_on     알림 보내기. 잘못 나가기 시작하면 즉시 멈춥니다
--   notice      공지 한 줄. **사용자에게 말을 걸 유일한 수단입니다**
--   readonly    점검 모드. SQL 을 돌리는 동안 쓰기를 막습니다
--   features    기능 스위치. 되돌리는 배포 없이 새 기능만 끕니다
--
-- **공지(notice)만 누구나 읽습니다.** 나머지는 관리자만 봅니다 —
-- 다만 앱이 판단해야 하는 것들은 아래 `public_flags()` 가 판정만 냅니다.
--
-- 065 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

insert into public.app_settings (key, value) values
  ('ai_on',     '{"on": true}'::jsonb),
  ('signup_on', '{"on": true}'::jsonb),
  ('push_on',   '{"on": true}'::jsonb),
  -- text 가 비면 안 띄웁니다. tone 은 색만 정합니다.
  ('notice',    '{"text": "", "tone": "info"}'::jsonb),
  ('readonly',  '{"on": false}'::jsonb),
  -- 기능 스위치. **여기 없는 이름은 켜진 것으로 봅니다** — 새 기능을
  -- 넣을 때마다 이 줄을 고쳐야 하면 언젠가 잊습니다.
  ('features',  '{"push": true, "docs": true, "reorder": true, "maplink": true}'::jsonb)
on conflict (key) do nothing;


-- ── 앱이 알아야 하는 것만 ────────────────────────────────────────────
-- 로그인 전에도 부를 수 있어야 합니다(가입 막힘 안내·공지).
-- **값을 통째로 주지 않습니다** — 예산이나 한도 숫자는 남이 알 이유가 없습니다.
create or replace function public.public_flags()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'notice',   coalesce((select value from public.app_settings where key='notice'),
                         '{"text":"","tone":"info"}'::jsonb),
    'signup',   coalesce((select (value->>'on')::boolean
                            from public.app_settings where key='signup_on'), true),
    'readonly', coalesce((select (value->>'on')::boolean
                            from public.app_settings where key='readonly'), false),
    -- chat 함수가 이걸 보고 스스로 멈춥니다. 켬/끔뿐이라 숨길 것이 없습니다.
    'ai',       coalesce((select (value->>'on')::boolean
                            from public.app_settings where key='ai_on'), true),
    'features', coalesce((select value from public.app_settings where key='features'),
                         '{}'::jsonb)
  );
$$;
grant execute on function public.public_flags() to anon, authenticated;


-- ── 가입 막기 ────────────────────────────────────────────────────────
-- **여기가 진짜 관문입니다.** 화면에서 로그인 단추를 감추는 것은 안내일
-- 뿐이고, 구글 로그인은 우리 화면을 안 거치고도 돌아올 수 있습니다.
-- 가입 트리거(001 의 handle_new_user)가 도는 자리에서 막습니다.
--
-- **이미 있는 사람은 안 막습니다** — 트리거는 새로 만들어질 때만 돕니다.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not coalesce((select (value->>'on')::boolean
                     from public.app_settings where key='signup_on'), true) then
    raise exception '지금은 새로 가입할 수 없어요. 잠시 뒤 다시 시도해 주세요.';
  end if;
  -- **아래는 001 의 본문 그대로입니다.** 스위치 검사만 위에 얹었습니다.
  -- 다시 쓰다가 full_name·picture 폴백을 빠뜨릴 뻔했습니다 — 그러면 구글로
  -- 들어온 사람의 이름과 사진이 조용히 비었을 것입니다.
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',
             new.raw_user_meta_data->>'name',
             split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'avatar_url',
             new.raw_user_meta_data->>'picture')
  ) on conflict (id) do nothing;
  insert into public.user_prefs (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;


-- ── 모양 검사 ────────────────────────────────────────────────────────
-- 047 의 admin_setting_set 에 새 키를 더합니다. **화면을 믿으면 안 됩니다** —
-- 콘솔에서 아무 값이나 넣어 부를 수 있습니다.
create or replace function public.admin_setting_set(p_key text, p_value jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_day int; v_trip int; v_txt text; v_tone text; v_f jsonb; v_k text;
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
    if v_day is null or v_day < 1 or v_day > 10000 then
      raise exception '하루 한도는 1 이상 10000 이하여야 합니다.';
    end if;
    if v_trip is null or v_trip < 1 or v_trip > 10000 then
      raise exception '여행 중 한도는 1 이상 10000 이하여야 합니다.';
    end if;
    p_value := jsonb_build_object('on', (p_value->>'on')::boolean,
                                  'day', v_day, 'trip', v_trip);

  elsif p_key = 'ai_model' then
    if (p_value->>'name') not in ('gemini-3.6-flash', 'gemini-3.5-flash-lite') then
      raise exception '쓸 수 없는 모델입니다: %', coalesce(p_value->>'name', '(빈값)');
    end if;
    p_value := jsonb_build_object('name', p_value->>'name');

  elsif p_key = 'notice' then
    -- 공지는 **모두에게 보입니다.** 길이를 막아둡니다 — 긴 글은 앱 위에
    -- 띄울 것이 아니라 다른 방법으로 알려야 합니다.
    v_txt := btrim(coalesce(p_value->>'text', ''));
    if length(v_txt) > 200 then
      raise exception '공지는 200자까지예요. 지금 %자입니다.', length(v_txt);
    end if;
    v_tone := coalesce(p_value->>'tone', 'info');
    if v_tone not in ('info','warn') then
      raise exception '색은 info 나 warn 이어야 합니다.';
    end if;
    p_value := jsonb_build_object('text', v_txt, 'tone', v_tone);

  elsif p_key = 'features' then
    if jsonb_typeof(p_value) <> 'object' then
      raise exception '기능 스위치는 객체여야 합니다.';
    end if;
    -- 아는 이름만 받습니다. 오타로 만든 키가 쌓이면 무엇이 진짜인지 모릅니다.
    v_f := '{}'::jsonb;
    foreach v_k in array array['push','docs','reorder','maplink'] loop
      v_f := v_f || jsonb_build_object(
        v_k, coalesce((p_value->>v_k)::boolean, true));
    end loop;
    p_value := v_f;

  elsif p_key in ('web_search','ai_on','signup_on','push_on','readonly') then
    -- 켬/끔 하나뿐인 것들은 같은 검사를 씁니다.
    if (p_value->>'on') is null or (p_value->>'on') not in ('true','false') then
      raise exception 'on 은 true 나 false 여야 합니다.';
    end if;
    p_value := jsonb_build_object('on', (p_value->>'on')::boolean);

  else
    raise exception '모르는 설정입니다: %', p_key;
  end if;

  insert into public.app_settings (key, value, updated_at, updated_by)
  values (p_key, p_value, now(), auth.uid())
  on conflict (key) do update
    set value = excluded.value, updated_at = now(), updated_by = auth.uid();

  return p_value;
end $$;
grant execute on function public.admin_setting_set(text, jsonb) to authenticated;


-- ── 알림도 스위치를 봅니다 ───────────────────────────────────────────
-- 065 의 due_pushes 를 감쌉니다. 끄면 **서버가 아예 안 만듭니다** —
-- 보내는 쪽에서 거르면 이미 push_log 에 적힌 뒤라 되돌릴 수 없습니다.
create or replace function public.due_pushes(p_window interval default '20 minutes')
returns table (user_id uuid, kind text, ref_id uuid,
               title text, body text, url text)
language sql security definer set search_path = public as $$
  -- **`on` 은 예약어라 컬럼 이름으로 못 씁니다.** `select on from sw` 가
  -- 42601 로 죽었습니다. 설정 키 안의 'on' 은 jsonb 열쇠라 괜찮지만
  -- SQL 이름으로 꺼내는 순간 걸립니다.
  with sw as (
    select coalesce((select (value->>'on')::boolean
                       from public.app_settings where key='push_on'), true) as enabled
  ),
  mine as (
    select m.user_id, t.id as trip_id, t.title as trip_title,
           t.start_date as trip_start,
           coalesce(nullif(t.timezone, ''), 'UTC') as tz,
           coalesce(nullif(p.home_tz, ''), nullif(t.timezone, ''), 'UTC') as home_tz,
           coalesce(p.notify_plan, 'first') as want_plan,
           coalesce(p.notify_flight, true)  as want_flight
      from public.trip_members m
      join public.trips t on t.id = m.trip_id
      left join public.user_prefs p on p.user_id = m.user_id
     where m.left_at is null
       and coalesce(p.notify_all, true)
       and (select enabled from sw)
  ),
  p as (
    select mine.user_id, 'plan'::text as kind, pl.id as ref_id,
           pl.title as title,
           to_char((pl.date + pl.start_time), 'HH24:MI') || ' · ' || mine.trip_title as body,
           ((pl.date + pl.start_time) at time zone mine.tz) as at,
           mine.trip_id, pl.date as on_date, mine.want_plan,
           row_number() over (partition by mine.user_id, pl.trip_id, pl.date
                              order by pl.start_time) as nth
      from public.plans pl
      join mine on mine.trip_id = pl.trip_id
     where pl.deleted_at is null and pl.start_time is not null
       and mine.want_plan <> 'off'
  ),
  f as (
    select mine.user_id, 'flight'::text as kind, b.id as ref_id,
           b.title as title,
           to_char((b.start_date + b.start_time), 'HH24:MI') || ' 출발' as body,
           ((b.start_date + b.start_time) at time zone
              case when b.start_date <= mine.trip_start then mine.home_tz
                   else coalesce((select coalesce(nullif(c.timezone, ''), mine.tz)
                                    from public.trip_legs l
                                    join public.cities c on c.id = l.city_id
                                   where l.trip_id = mine.trip_id
                                     and b.start_date between l.start_date and l.end_date
                                   order by l.start_date limit 1), mine.tz)
              end) as at,
           mine.trip_id, b.start_date as on_date
      from public.bookings b
      join mine on mine.trip_id = b.trip_id
     where b.deleted_at is null and b.kind = '항공'
       and b.start_date is not null and b.start_time is not null
       and mine.want_flight
  ),
  all_rows as (
    select user_id, kind, ref_id, title, body, trip_id, on_date,
           at - interval '30 minutes' as fire
      from p where want_plan = 'all' or nth = 1
    union all
    select user_id, kind, ref_id, title, body, trip_id, on_date,
           at - interval '3 hours' as fire
      from f
  )
  select a.user_id, a.kind, a.ref_id,
         a.title,
         a.body || case when a.kind = 'plan' then ' · 30분 뒤예요'
                                             else ' · 슬슬 나가실 시간이에요' end,
         './?t=' || a.trip_id::text || '&d=' || a.on_date::text
    from all_rows a
   where a.fire <= now() and a.fire > now() - p_window
     and not exists (select 1 from public.push_log g
                      where g.user_id = a.user_id and g.kind = a.kind
                        and g.ref_id = a.ref_id);
$$;
revoke execute on function public.due_pushes(interval) from anon, authenticated;


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '새 스위치'::text as check,
         case when (select count(*) from public.app_settings
                     where key in ('ai_on','signup_on','push_on','notice',
                                   'readonly','features')) = 6
              then 'OK' else 'X' end as result,
         'ai_on · signup_on · push_on · notice · readonly · features'::text as note
  union all
  select 2, '앱이 읽는 통로',
         case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                            where n.nspname='public' and p.proname='public_flags')
              then 'OK' else 'X' end,
         '로그인 전에도 읽힙니다. 예산·한도 숫자는 안 나갑니다'
  union all
  select 3, '가입 관문',
         case when (select prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                     where n.nspname='public' and p.proname='handle_new_user')
                   like '%signup_on%' then 'OK' else 'X' end,
         '화면이 아니라 트리거에서 막습니다. 이미 있는 사람은 안 막힙니다'
  union all
  select 4, '지금 값',
         'OK',
         (select string_agg(key || '=' || value::text, ' · ' order by key)
            from public.app_settings
           where key in ('ai_on','signup_on','push_on','readonly'))
) t order by ord;
