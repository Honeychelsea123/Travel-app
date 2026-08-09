-- =====================================================================
-- 062. 지운 것이 일행에게 전파되게 + 초대 문구를 사용자 말로
--
-- 2026-08-08 에 두 탭으로 실시간을 실제로 재보다 나온 것들입니다.
-- 브라우저에서 이벤트를 직접 들어보니 이랬습니다:
--
--     INSERT ✓   UPDATE ✓   DELETE ✗
--
-- 넣고 고치는 것은 오는데 **지우는 것만 안 옵니다.**
--
-- ── 왜 안 오나 ───────────────────────────────────────────────────────
-- RLS 가 켜진 표에서 Postgres 는 기본으로 지운 행의 **기본키만** 복제 로그에
-- 남깁니다(replica identity = default). 그러면 Realtime 이 그 행에 대해
-- "이 사람이 볼 수 있는 행인가"를 판단할 재료가 없고, 우리가 건 필터
-- (trip_id=eq.…) 도 맞춰볼 수가 없습니다. 그래서 이벤트를 그냥 버립니다.
--
-- `replica identity full` 로 바꾸면 지운 행 **전체**가 로그에 남아서
-- 판단도 되고 필터도 걸립니다.
--
-- ── 실제로 어디가 아팠나 ─────────────────────────────────────────────
-- 앱의 일정·지출 삭제는 `deleted_at` 을 찍는 **소프트 삭제(UPDATE)** 라
-- 원래 잘 전파됩니다. 진짜로 하드 삭제를 쓰는 자리는 둘입니다:
--
--   trip_legs  구간 삭제  → 일행 화면에 **없앤 구간이 그대로 남습니다.**
--                          날짜 칩의 도시와 지출 통화가 구간에서 나오므로
--                          둘이 서로 다른 여행을 보게 됩니다.
--   trips      여행 삭제  → 일행이 **지워진 여행 안에 남습니다.**
--                          bump('trip') 이 와야 backToList 로 내보내는데
--                          그 이벤트가 안 옵니다.
--
-- 되살리기의 '완전 삭제'(plans·expenses·bookings)도 하드 삭제지만, 그건
-- 이미 소프트 삭제로 안 보이던 것이라 되살리기 목록만 늦게 갱신됩니다.
--
-- ── 비용 ─────────────────────────────────────────────────────────────
-- `full` 은 UPDATE 마다 옛 행 전체를 로그에 씁니다. 여기 표들은 한 여행에
-- 수십~수백 행이라 무시할 만합니다. **여러 사람이 같이 보는 표에만** 겁니다.
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

-- 실시간으로 듣는 표 전부. 지금 하드 삭제를 쓰지 않더라도, 나중에 누가
-- 하드 삭제를 넣었을 때 **조용히 안 오는 것**보다 미리 열어두는 편이 낫습니다.
alter table public.trips        replica identity full;
alter table public.trip_legs    replica identity full;
alter table public.trip_members replica identity full;
alter table public.plans        replica identity full;
alter table public.expenses     replica identity full;
alter table public.bookings     replica identity full;
alter table public.packing      replica identity full;
alter table public.links        replica identity full;
alter table public.candidates   replica identity full;


-- =====================================================================
-- 초대 문구를 사용자 말로
--
-- **이 문구들이 여태 사용자에게 안 갔습니다.** net.js 의 human() 이
-- P0001(=raise exception)을 못 알아보고 "잘 안 됐어요. 잠시 뒤 다시
-- 해보시고…"로 덮고 있었습니다. b244 에서 그대로 통과시키게 고쳤으므로
-- 이제 여기 적은 말이 그대로 화면에 뜹니다. 말투를 앱과 맞춥니다.
--
-- **"잠시 뒤 다시 해보세요"는 만료된 초대에는 틀린 안내였습니다** —
-- 기다려도 안 되는 것을 기다리라고 하고 있었습니다. 그래서 무엇이
-- 잘못됐는지와 **무엇을 하면 되는지**를 같이 적습니다.
-- 함수 본문은 001_schema.sql 그대로이고 문구만 바뀌었습니다.
-- =====================================================================
create or replace function public.redeem_invite(p_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v public.trip_invites%rowtype;
  v_new boolean := false;
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

  -- 이미 들어와 있으면 역할을 낮추지 않고 그대로 둡니다.
  -- 나갔다 다시 들어오면 left_at 을 지웁니다.
  insert into public.trip_members (trip_id, user_id, role)
  values (v.trip_id, auth.uid(), v.role)
  on conflict (trip_id, user_id) do update set left_at = null;

  get diagnostics v_new = row_count;
  if v_new then
    update public.trip_invites set uses = uses + 1 where code = v.code;
  end if;

  return v.trip_id;
end $$;


-- ── 확인 ─────────────────────────────────────────────────────────────
-- 아래를 같이 돌리면 제대로 걸렸는지 보입니다.
--   relreplident: d = 기본(기본키만) · f = full
select c.relname as "표",
       case c.relreplident when 'f' then 'full ✓' when 'd' then '기본 ✗'
                           else c.relreplident::text end as "복제 기준"
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname in ('trips','trip_legs','trip_members','plans','expenses',
                     'bookings','packing','links','candidates')
 order by c.relname;
