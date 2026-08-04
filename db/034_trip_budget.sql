-- =====================================================================
-- 여행 예산
--
-- 리포트 카드에 "지갑이 열린 여행" · "알뜰하게 다녀온 여행" 문구가 있는데,
-- 예산을 적어둘 칸이 없어서 둘 다 영영 안 나오는 상태였습니다.
-- 성향 카드에서 규모 문구가 한 번도 안 나오던 것과 같은 종류의 구멍입니다.
--
-- 정산 통화(home_currency) 기준입니다. 지출의 amount_home 과 같은 단위라야
-- 나눗셈이 맞습니다.
--
-- 안 적어도 됩니다. 비어 있으면 그 두 문구만 건너뜁니다.
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

alter table public.trips add column if not exists budget numeric
  check (budget is null or budget > 0);

comment on column public.trips.budget is
  '여행 예산. 정산 통화(home_currency) 기준. null 이면 예산 문구를 건너뜀';

-- ── 확인 ─────────────────────────────────────────────────────────────
select 'trips.budget 칸' as item,
       exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='trips'
                  and column_name='budget') as ok;
