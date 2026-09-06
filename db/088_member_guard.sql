-- ── 일행 줄을 서버에서 잠급니다 (b698 점검) ──────────────────────────
--
-- 구멍 둘을 막습니다. **둘 다 화면에는 길이 없지만 서버가 안 막던 것**입니다.
-- 곧 앱을 안 거치고 REST 로 직접 부르면 그대로 됐습니다.
--
-- ⚠⚠ ① **「보기만」인 사람이 자기를 「만든 사람」으로 올릴 수 있었습니다.**
--   001_schema.sql:265 의 정책이 이렇습니다 —
--     create policy members_self_update on public.trip_members
--       for update using (user_id = auth.uid()) with check (user_id = auth.uid());
--   바로 위 주석은 「별명은 자기 것만 고칩니다」인데, **RLS 는 «어느 칸»인지를
--   못 가립니다.** 자기 줄이기만 하면 role 이든 left_at 이든 다 열립니다.
--     update trip_members set role='owner' where user_id = <나>;   ← 통했습니다
--   게다가 with check 가 user_id 만 보므로 **trip_id 를 남의 여행으로 바꿔**
--   초대 없이 그 여행에 들어앉는 것도 막히지 않았습니다.
--
-- ⚠⚠ ② **내보낸 사람이 옛 초대 링크로 그대로 돌아왔습니다.**
--   062 의 redeem_invite 가 `on conflict … do update set left_at = null` 입니다.
--   주석은 「나갔다 다시 들어오면」인데 — **이 앱에는 「스스로 나가기」가 없습니다.**
--   member.js 를 다 훑어도 left_at 을 찍는 곳은 249~262 줄의 「빼기」 하나뿐이고,
--   그건 만든 사람만 누릅니다. 곧 left_at 이 찍힌 사람은 **전부 «내보내진» 사람**이고,
--   그 줄을 되살리는 것은 내보내기를 무르는 일이었습니다.
--   주인이 막을 길은 초대 링크를 «전부» 지우는 것뿐이었습니다.
--
-- ⚠ **왜 칸 단위 권한(revoke update (role) …)이 아니라 트리거인가.**
--   칸 권한은 «역할»에 걸립니다 — authenticated 에서 role 칸을 빼앗으면
--   만든 사람의 「권한 바꾸기」(member.js:265)도 같이 죽습니다. 둘 다
--   같은 authenticated 이기 때문입니다. 누가 하느냐로 갈라야 하므로 트리거입니다.


-- ① 일행 줄 지킴이 ────────────────────────────────────────────────────
-- ⚠ 만든 사람은 다 됩니다(권한 바꾸기·내보내기). 나머지는 **별명만**입니다.
-- ⚠ auth.uid() 가 없으면(서버·service_role) 그냥 보냅니다 — 그 자리는 RLS 가
--   아예 안 열어 주므로 여기까지 오지 않습니다. 오면 서버가 하는 일입니다.
-- ⚠ 계정 삭제 때의 «주인 넘기기»(036/044 의 `set role='owner'`)는 그대로 됩니다 —
--   그때 auth.uid() 는 아직 owner 인 «떠나는 사람»이라 아래 is_owner 가 참입니다.
create or replace function public.trip_members_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare is_owner boolean;
begin
  -- 키를 바꾸는 것은 «남의 여행으로 옮겨 타는» 일입니다. 아무도 못 합니다.
  if new.trip_id is distinct from old.trip_id
     or new.user_id is distinct from old.user_id then
    raise exception '일행 줄의 여행·사람은 바꿀 수 없습니다';
  end if;

  if auth.uid() is null then return new; end if;

  select exists (
    select 1 from public.trip_members
     where trip_id = old.trip_id and user_id = auth.uid()
       and role = 'owner' and left_at is null
  ) into is_owner;

  if is_owner then return new; end if;

  if new.role is distinct from old.role then
    raise exception '권한은 여행을 만든 사람만 바꿀 수 있습니다';
  end if;
  if new.left_at is distinct from old.left_at then
    raise exception '일행에서 넣고 빼는 것은 여행을 만든 사람만 할 수 있습니다';
  end if;
  if new.joined_at is distinct from old.joined_at then
    raise exception '참여한 때는 바꿀 수 없습니다';
  end if;

  return new;   -- 남는 것은 nickname 하나입니다
end $$;

drop trigger if exists trip_members_guard on public.trip_members;
create trigger trip_members_guard
  before update on public.trip_members
  for each row execute function public.trip_members_guard();


-- ② 내보낸 사람은 옛 링크로 못 돌아옵니다 ─────────────────────────────
-- ⚠ 바뀐 곳은 둘입니다.
--   ⓐ left_at 이 찍힌 사람은 **거절**합니다(위 ②의 사연).
--   ⓑ `do update set left_at = null` → `do nothing`.
--      덤으로 **인원수 세기도 같이 고쳐집니다** — 전에는 이미 들어와 있는 사람이
--      링크를 다시 눌러도 update 가 한 줄을 세어 uses 가 올라갔습니다.
--      스무 번 누르면 「인원을 다 채웠어요」가 됐습니다. 이제는 진짜 새로
--      들어온 사람만 셉니다.
-- ⚠ 나중에 「스스로 나가기」를 만든다면 **여기를 반드시 다시 보십시오.**
--   그때는 「스스로 나간 것」과 「내보내진 것」을 가를 칸이 하나 필요합니다.
create or replace function public.redeem_invite(p_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v      public.trip_invites%rowtype;
  v_out  boolean;
  v_cnt  int := 0;
begin
  if auth.uid() is null then raise exception '로그인하면 참여할 수 있어요.'; end if;

  select * into v from public.trip_invites
   where code = upper(trim(p_code)) for update;

  if not found then
    raise exception '이 초대 링크를 찾을 수 없어요. 링크가 맞는지 확인해주세요.';
  end if;
  if v.expires_at < now() then
    raise exception '만료된 초대예요. 새 링크를 다시 받아주세요.';
  end if;
  if v.uses >= v.max_uses then
    raise exception '이 링크는 받을 수 있는 인원을 다 채웠어요. 새 링크를 받아주세요.';
  end if;

  -- 내보내진 사람인지 «먼저» 봅니다.
  select (m.left_at is not null) into v_out
    from public.trip_members m
   where m.trip_id = v.trip_id and m.user_id = auth.uid();

  if coalesce(v_out, false) then
    raise exception '이 여행에서 빠지셨어요. 만든 사람에게 다시 초대해달라고 해주세요.';
  end if;

  -- 이미 들어와 있으면 역할을 낮추지 않고 그대로 둡니다.
  insert into public.trip_members (trip_id, user_id, role)
  values (v.trip_id, auth.uid(), v.role)
  on conflict (trip_id, user_id) do nothing;

  get diagnostics v_cnt = row_count;
  if v_cnt > 0 then
    update public.trip_invites set uses = uses + 1 where code = v.code;
  end if;

  return v.trip_id;
end $$;


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '지킴이 트리거가 붙었나'::text as 확인,
         coalesce((select string_agg(tgname, ' ')
                     from pg_trigger
                    where tgrelid = 'public.trip_members'::regclass
                      and not tgisinternal), '없음') as 결과
  union all
  select 2, 'redeem_invite 가 left_at 을 지우나',
         case when (select pg_get_functiondef(p.oid) from pg_proc p
                     join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname = 'public' and p.proname = 'redeem_invite')
                   like '%left_at = null%'
              then '⚠ 아직 지웁니다' else '안 지웁니다 — 맞습니다' end
  union all
  select 3, 'redeem_invite 가 내보낸 사람을 막나',
         case when (select pg_get_functiondef(p.oid) from pg_proc p
                     join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname = 'public' and p.proname = 'redeem_invite')
                   like '%이 여행에서 빠지셨어요%'
              then '막습니다' else '⚠ 안 막습니다' end
  union all
  select 4, '지금 내보내진 사람 수',
         (select count(*)::text from public.trip_members where left_at is not null)
  union all
  select 5, 'members_self_update 정책(그대로 둡니다)',
         coalesce((select 'using ' || pg_get_expr(polqual, polrelid)
                     from pg_policy
                    where polrelid = 'public.trip_members'::regclass
                      and polname = 'members_self_update'), '없음')
) z order by ord;
