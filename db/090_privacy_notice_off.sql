-- ── 공지 띠를 내립니다 (b723, 사용자 결정) ────────────────────────────
--
-- ⚠ 089 로 띄운 공지를 내립니다. 사용자: 「공지글 떠야해? 그냥 약관만
--   바꾸면 되잖아」 — 맞습니다.
--
-- ⚠⚠ **왜 띄웠던 것인가.** 법이 요구하는 것은 «바뀐 내용을 공개»하는
--   것이고(개인정보 보호법 제30조 제3항), 그것은 방침 페이지 자체가
--   합니다 — 맨 위 상자에 무엇이 바뀌었는지 적어 뒀습니다.
--   띠를 띄운 이유는 «법»이 아니라 **방침 16항이 스스로 「앱 안에
--   알린다」고 적어 놨기 때문**이었습니다. b723 에 그 문장을 실제와
--   맞췄습니다(페이지 게재로 갈음. 다만 **불리한 변경이나 재동의가
--   필요한 변경은 여전히 시행 30일 전부터 앱 안에서 알립니다**).
--   → 약속이 달라졌으므로 띠를 내리는 것이 맞습니다.
--
-- ⚠ **줄을 지우지 않고 글만 비웁니다.** text 가 비면 안 띄웁니다(db/066).
--   줄을 지우면 public_flags() 가 기본값을 만들어 내야 하고, 관리자
--   화면(admin.js)도 없는 줄을 읽게 됩니다.
--
-- ⚠ 「다시 보지 않기」(b722)는 그대로 둡니다 — 다음 공지 때 쓰입니다.
--   끄는 열쇠를 글에서 뽑으므로, 새 공지가 오면 껐던 사람에게도 뜹니다.
--
-- 089 다음에 실행합니다. 여러 번 실행해도 안전합니다.

update public.app_settings
   set value = jsonb_build_object('text', '', 'tone', 'info')
 where key = 'notice';


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '공지 글'::text as 확인,
         case when coalesce((select value->>'text' from public.app_settings
                              where key='notice'), '') = ''
              then '비었습니다 — 띠가 안 뜹니다' else '⚠ 아직 있습니다' end as 결과
  union all
  select 2, '앱이 받아가는 값',
         case when coalesce(public_flags()->'notice'->>'text', '') = ''
              then '비었습니다' else '⚠ 아직 있습니다' end
  union all
  select 3, 'notice 줄이 남아 있나(남아야 맞습니다)',
         case when exists (select 1 from public.app_settings where key='notice')
              then '있습니다 — 맞습니다' else '⚠ 사라졌습니다' end
) z order by ord;
