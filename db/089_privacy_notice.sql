-- ── 개인정보처리방침이 바뀐다고 앱 안에서 알립니다 (b721) ────────────
--
-- ⚠⚠ **방침이 스스로 약속한 것입니다.** privacy.html 16항 —
--   「이 방침이 바뀌면 시행 7일 전부터 앱 안에 알립니다.」
--   b720 에 방침을 고치면서 그 약속을 아직 안 지키고 있었습니다.
--   페이지에만 적어 두는 것은 「앱 안에 알린다」가 아닙니다.
--
-- ⚠ **공지(notice)가 사용자에게 말을 걸 유일한 수단입니다**(066 머리말).
--   화면 맨 위 띠 하나로 뜹니다(flags.js 의 drawNotice).
-- ⚠ **`textContent` 라 링크를 못 넣습니다.** 그래서 어디서 볼 수 있는지를
--   글로 적습니다 — 설정의 「약속」 칸입니다.
-- ⚠ tone 은 'info' 입니다. 'warn' 은 빨간 띠라 「일이 터졌다」는 뜻이고,
--   이건 미리 알리는 것이지 사고가 아닙니다.
--
-- ⚠⚠ **9월 14일이 지나면 내려야 합니다.** 시행된 뒤에도 「바뀝니다」가
--   떠 있으면 거짓말이 됩니다. 맨 아래에 내리는 문장을 같이 적어 뒀습니다 —
--   그날 그 한 줄만 돌리십시오(관리자 화면에서 지워도 같습니다).
--
-- 088 다음에 실행합니다. 여러 번 실행해도 안전합니다.

-- ① 띄우기 ────────────────────────────────────────────────────────────
insert into public.app_settings (key, value)
values ('notice', jsonb_build_object(
  'text', '9월 14일부터 개인정보처리방침이 바뀝니다. 잠금화면 알림과 일기를 항목에 새로 적고, 한줄평이 누구에게나 보인다는 것을 분명히 했어요. 새로 받는 정보는 없어요 — 설정의 「약속」에서 미리 볼 수 있어요.',
  'tone', 'info'))
on conflict (key) do update set value = excluded.value;


-- ② 확인 ──────────────────────────────────────────────────────────────
-- 1번이 지금 띄운 글, 2번이 「앱이 실제로 받아가는 값」입니다.
-- 둘이 같아야 합니다 — public_flags() 는 로그인 전에도 부르는 길이라
-- 여기서 안 나오면 화면에도 안 뜹니다.
select * from (
  select 1 as ord, '지금 공지'::text as 확인,
         coalesce((select value->>'text' from public.app_settings where key='notice'),
                  '없음') as 결과
  union all
  select 2, '앱이 받아가는 값',
         coalesce(public_flags()->'notice'->>'text', '없음')
  union all
  select 3, '띠 색(tone)',
         coalesce((select value->>'tone' from public.app_settings where key='notice'), '없음')
) z order by ord;


-- ③ 9월 14일에 내리기 ─────────────────────────────────────────────────
-- ⚠ 아래 한 줄만 따로 돌리십시오. text 가 비면 띠가 안 뜹니다(066 주석).
--
-- update public.app_settings
--    set value = jsonb_build_object('text', '', 'tone', 'info')
--  where key = 'notice';
