-- =====================================================================
-- 알림 지우기
--
-- 알림을 읽어도 목록에 그대로 남아 있고 지울 길이 없었습니다.
-- 001 에 정책이 둘뿐입니다 — 내 것 보기(select), 읽음 표시(update).
-- 지우기가 빠져 있어서 화면에서 아무리 눌러도 안 없어집니다.
--
-- 내 알림만 지웁니다. 남의 알림함은 건드릴 수 없습니다.
-- 만드는 것은 여전히 서버(트리거)만 합니다 — insert 정책은 여기서도 안 만듭니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

drop policy if exists notif_del on public.notifications;
create policy notif_del on public.notifications for delete
  using (user_id = auth.uid());


-- ── 확인 ─────────────────────────────────────────────────────────────
select '지우기 정책' as item,
       exists (select 1 from pg_policies
                where schemaname='public' and tablename='notifications'
                  and policyname='notif_del') as ok
union all select '만드는 정책은 없어야 함',
  not exists (select 1 from pg_policies
               where schemaname='public' and tablename='notifications'
                 and cmd in ('INSERT','ALL'));
