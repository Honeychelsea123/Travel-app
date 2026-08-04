-- =====================================================================
-- 보관 기간 지키기
--
-- 개인정보처리방침에 "오류 기록 90일, 신고 1년"이라고 적었습니다.
-- **적어놓고 안 지우면 그게 위반입니다.** 지금은 지우는 장치가 하나도 없어서
-- client_errors 와 reports 가 영원히 쌓입니다.
--
-- pg_cron 이 없으니 037(search_cache)과 같은 방식을 씁니다 —
-- 앱이 오류를 보내거나 관리자가 대시보드를 열 때 한 번씩 부릅니다.
-- 따로 도는 장치가 없어도 표가 무한정 커지지 않습니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

create or replace function public.sweep_retention()
returns void
language sql security definer set search_path = public as $$
  -- 오류 기록 90일. 그보다 오래된 오류는 이미 고쳤거나 못 고칩니다.
  delete from public.client_errors where created_at < now() - interval '90 days';
  -- 신고·의견 1년.
  delete from public.reports       where created_at < now() - interval '365 days';
$$;

-- 로그인한 사람이면 누구나 부를 수 있습니다. 지우는 대상이 정해져 있어
-- 남의 것을 골라 지울 수는 없습니다.
grant execute on function public.sweep_retention() to authenticated;


-- ── 지금 한 번 돌립니다 ──────────────────────────────────────────────
select public.sweep_retention();


-- ── 확인 ─────────────────────────────────────────────────────────────
select '함수 생김' as item, to_regproc('public.sweep_retention') is not null as ok
union all select '90일 넘은 오류 (0 이어야 함)',
  (select count(*) = 0 from public.client_errors
    where created_at < now() - interval '90 days')
union all select '1년 넘은 신고 (0 이어야 함)',
  (select count(*) = 0 from public.reports
    where created_at < now() - interval '365 days');
