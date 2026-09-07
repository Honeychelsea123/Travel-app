-- ── 공지 다시 씀 — 「바뀝니다」 → 「바뀌었습니다」 (b722) ─────────────
--
-- ⚠ 089 는 시행일이 2026-09-14 일 때 쓴 글입니다. 그 뒤 사용자 결정으로
--   방침 16항의 「시행 7일 전부터 알린다」를 뺐고, 그래서 개정이
--   **2026-09-07 에 바로 시행**됩니다. 089 의 글은 이제 틀립니다.
-- ⚠ 089 를 고치지 않고 새 파일로 둡니다 — db/ 의 sql 은 «이미 돌린 기록»이라
--   나중에 고치면 그때 무엇을 돌렸는지 알 수 없게 됩니다.
-- ⚠ b722 부터 공지 띠에 **「다시 보지 않기」**가 붙습니다(flags.js).
--   끄는 열쇠를 **글에서 뽑기** 때문에, 글이 달라지는 이 갱신은 089 를
--   이미 끈 사람에게도 **다시 뜹니다.** 그것이 맞습니다 — 내용이 달라졌습니다.
--
-- 089 다음에 실행합니다. 여러 번 실행해도 안전합니다.

update public.app_settings
   set value = jsonb_build_object(
     'text', '개인정보처리방침이 2026년 9월 7일에 바뀌었어요. 잠금화면 알림과 일기를 항목에 새로 적고, 한줄평이 누구에게나 보인다는 것을 분명히 했어요. 새로 받는 정보는 없어요 — 설정의 「약속」에서 볼 수 있어요.',
     'tone', 'info')
 where key = 'notice';


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '지금 공지'::text as 확인,
         coalesce((select value->>'text' from public.app_settings where key='notice'),
                  '없음') as 결과
  union all
  select 2, '앱이 받아가는 값',
         coalesce(public_flags()->'notice'->>'text', '없음')
  union all
  select 3, '아직 「바뀝니다」가 남았나',
         case when coalesce((select value->>'text' from public.app_settings
                              where key='notice'), '') like '%바뀝니다%'
              then '⚠ 남았습니다' else '없음 — 맞습니다' end
) z order by ord;


-- ── 나중에 내리기 ─────────────────────────────────────────────────────
-- ⚠ 이제는 「미리 알리는 것」이 아니라 「바뀌었다고 알리는 것」이라
--   급히 내릴 이유는 없습니다. 한두 주 뒤 아래 한 줄로 내리십시오.
--   (「다시 보지 않기」를 누른 사람에게는 이미 안 보입니다.)
--
-- update public.app_settings
--    set value = jsonb_build_object('text', '', 'tone', 'info')
--  where key = 'notice';
