-- =====================================================================
-- 100 · 이름(닉네임)이 겹치지 않게 (b783)
--
-- 사용자 결정(2026-09-27): 「이름 하나를 유일하게」 — 한국 앱에 흔한
-- 「닉네임 중복확인」. 나중에 팔로우를 넣으면 이름으로 사람을 찾을 수
-- 있어야 하는데, 이름이 겹치면 사칭을 못 막습니다(팔로우 설계 때 검색을
-- 뺀 이유가 이것이었습니다).
--
-- 무엇을 «같은 이름»으로 보나
--   대소문자 · 띄어쓰기 · 전각/반각 · 보이지 않는 글자는 무시합니다.
--   「Minji」 = 「minji」 = 「min ji」 = 「ｍｉｎｊｉ」.
--
-- 어디서 막나 — **DB 가 진짜 관문입니다.**
--   화면에서만 물어보면 두 사람이 같은 순간에 저장할 때 둘 다 통과합니다.
--   겹치면 unique 색인(5번)이, 못 쓰는 이름은 트리거(4번)가 거절합니다.
--   화면은 name_free()(7번)로 미리 물어 「쓸 수 있어요 / 이미 있어요」만 보여 줍니다.
--
-- ⚠ 이미 겹친 이름이 있으면 **3번에서 멈춥니다.** 오류 글에 겹친 이름이
--   나옵니다 — 한쪽을 바꾼 뒤 다시 실행하세요. 여러 번 실행해도 안전합니다.
-- ⚠ 가입 트리거도 고칩니다(6번). 새 사람의 첫 이름은 메일 앞부분인데,
--   그게 이미 있으면 색인이 거절해서 **가입이 통째로 실패**합니다. 겹치면
--   비워 둡니다 — 남에게는 「이름 없음」, 본인 화면에는 메일 앞부분이 보입니다.
-- =====================================================================


-- ── 1. 「같은 이름」의 열쇠 ─────────────────────────────────────────────
-- NFKC: 전각→반각, 풀어 쓴 한글→모아 쓴 한글. 그다음 공백과 보이지 않는
-- 글자(소프트 하이픈 · 한글 채움 문자 · 폭 없는 공백 …)를 빼고 소문자로.
-- 빈 것은 null — 이름이 없는 사람끼리는 겹친다고 치지 않습니다.
-- ⚠ 화면(profile.js 의 `이름열쇠`)도 같은 규칙입니다. 바꾸면 둘 다.
create or replace function public.name_key(n text)
returns text language sql immutable parallel safe as $$
  select nullif(lower(regexp_replace(normalize(coalesce(n, ''), NFKC),
           '[[:space:]­ᅟᅠ᠎​-‏⁠ㅤ﻿ﾠ]+',
           '', 'g')), '')
$$;


-- ── 2. 못 쓰는 이름 ─────────────────────────────────────────────────────
-- 사칭이 가장 아픈 자리 — 앱 자신과 운영하는 사람. 「기로」는 흔한 낱말
-- (「기로에 서다」)이라 통째로 같을 때만, 관리자·운영자·admin·keyro 는
-- 들어만 가도 막습니다. 관리자 본인(admins 표)은 4번·7번에서 풀어 줍니다.
create or replace function public.name_reserved(n text)
returns boolean language sql immutable parallel safe as $$
  select coalesce(
           k in ('기로','keyro','기로팀','기로공식','공식기로','관리자','운영자','운영팀',
                 '운영진','admin','administrator','공식','official','system','시스템',
                 '고객센터','staff')
           or k like '%관리자%' or k like '%운영자%' or k like '%운영팀%'
           or k like '%admin%'  or k like '%keyro%',
         false)
    from (select public.name_key(n) as k) s
$$;


-- ── 3. 이미 겹친 이름이 있으면 여기서 멈춥니다 ──────────────────────────
do $$
declare r record; v_msg text := '';
begin
  for r in
    select public.name_key(display_name) as k, count(*) as n,
           string_agg(display_name, ' / ' order by created_at) as names
      from public.profiles
     where public.name_key(display_name) is not null
     group by 1 having count(*) > 1
  loop
    v_msg := v_msg || E'\n  · ' || r.names || ' (' || r.n || '명)';
  end loop;
  if v_msg <> '' then
    raise exception '겹치는 이름이 있어 멈췄습니다. 한쪽 이름을 바꾼 뒤 다시 실행하세요.%', v_msg;
  end if;
end $$;


-- ── 4. 이름 지키미(트리거) ─────────────────────────────────────────────
-- 앞뒤 공백을 걷고, 빈 이름은 null 로. 30자가 넘으면 거절(화면 입력칸도 30).
-- 못 쓰는 이름은 관리자가 아니면 거절.
-- ⚠ **이름을 바꿀 때만** 돕니다(`update of display_name`). 사진만 바꾸는
--   사람을 옛 이름 때문에 막으면 안 됩니다.
create or replace function public.profiles_name_guard()
returns trigger language plpgsql as $$
begin
  new.display_name := nullif(btrim(new.display_name), '');
  if new.display_name is not null then
    if char_length(new.display_name) > 30 then
      raise exception using errcode = '22001', message = '이름은 30자까지 쓸 수 있어요.';
    end if;
    if public.name_reserved(new.display_name) and not public.is_admin() then
      raise exception using errcode = '23514', message = '쓸 수 없는 이름이에요.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_name_guard on public.profiles;
create trigger profiles_name_guard
  before insert or update of display_name on public.profiles
  for each row execute function public.profiles_name_guard();


-- ── 5. 겹치지 않게 — 진짜 관문 ───────────────────────────────────────────
-- 겹치면 23505(unique_violation) 로 거절됩니다. 화면은 이 번호를 보고
-- 「이미 있는 이름이에요」라고 말합니다(profile.js).
create unique index if not exists profiles_name_key_uniq
  on public.profiles (public.name_key(display_name))
  where public.name_key(display_name) is not null;


-- ── 6. 가입 트리거: 첫 이름이 겹치면 비워 둡니다 ─────────────────────────
-- **066 의 본문 그대로에** 첫 이름 고르기만 얹었습니다(signup_on 검사,
-- full_name·name·picture 폴백 유지). 첫 이름(대개 메일 앞부분)이 이미 있거나,
-- 못 쓰는 이름이거나, 30자가 넘으면 null 로 넣습니다.
-- 같은 순간 둘이 같은 이름으로 가입하는 드문 경우는 색인이 거절하므로 한 번
-- 더 받아서 null 로 넣습니다 — 그 한 번 때문에 가입이 실패하면 안 됩니다.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text := coalesce(new.raw_user_meta_data->>'full_name',
                          new.raw_user_meta_data->>'name',
                          split_part(new.email,'@',1));
  v_ava  text := coalesce(new.raw_user_meta_data->>'avatar_url',
                          new.raw_user_meta_data->>'picture');
begin
  if not coalesce((select (value->>'on')::boolean
                     from public.app_settings where key='signup_on'), true) then
    raise exception '지금은 새로 가입할 수 없어요. 잠시 뒤 다시 시도해 주세요.';
  end if;
  v_name := nullif(btrim(v_name), '');
  if v_name is not null and (char_length(v_name) > 30
       or public.name_reserved(v_name)
       or exists (select 1 from public.profiles p
                   where public.name_key(p.display_name) = public.name_key(v_name))) then
    v_name := null;
  end if;
  begin
    insert into public.profiles (id, display_name, avatar_url)
    values (new.id, v_name, v_ava) on conflict (id) do nothing;
  exception when unique_violation then
    insert into public.profiles (id, display_name, avatar_url)
    values (new.id, null, v_ava) on conflict (id) do nothing;
  end;
  insert into public.user_prefs (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;


-- ── 7. 화면에서 미리 묻기 ───────────────────────────────────────────────
-- 남의 프로필은 RLS 로 안 보이므로(같은 여행 사람만) security definer 로
-- «겹치나»만 답합니다. **누구 이름인지는 안 돌려줍니다.** 내 이름은 빼고 봅니다
-- (내 이름을 그대로 다시 저장해도 「이미 있어요」가 나오면 안 되니까요).
-- 답: ok · taken · reserved · long · empty · login
create or replace function public.name_free(n text)
returns text language plpgsql stable security definer set search_path = public as $$
declare k text := public.name_key(n);
begin
  if auth.uid() is null then return 'login'; end if;
  if k is null then return 'empty'; end if;
  if char_length(btrim(n)) > 30 then return 'long'; end if;
  if public.name_reserved(n) and not public.is_admin() then return 'reserved'; end if;
  if exists (select 1 from public.profiles p
              where public.name_key(p.display_name) = k and p.id <> auth.uid()) then
    return 'taken';
  end if;
  return 'ok';
end $$;
revoke all on function public.name_free(text) from public, anon;
grant execute on function public.name_free(text) to authenticated;


-- ── 확인 ────────────────────────────────────────────────────────────────
-- 기대값: minji · minji · true · false · profiles_name_key_uniq · (숫자)
select 1 as 순서, '열쇠: 「 Min Ji 」' as 항목, public.name_key(' Min Ji ') as 값
union all select 2, '열쇠: 전각 ｍｉｎｊｉ', public.name_key('ｍｉｎｊｉ')
union all select 3, '못 쓰는 이름: 기로', public.name_reserved('기로')::text
union all select 4, '못 쓰는 이름: 인생의기로', public.name_reserved('인생의기로')::text
union all select 5, '색인', (select indexname::text from pg_indexes
                              where schemaname = 'public' and indexname = 'profiles_name_key_uniq')
union all select 6, '이름이 있는 사람', (select count(*)::text from public.profiles
                                         where display_name is not null)
order by 순서;
