# app.js 쪼개기 — 어디까지 했고 어떻게 이어가나

2026-08-18. `app.js` 9,169 → 6,898줄. 일곱 조각이 나갔다.

## 왜 하나

한 파일에 로그인·여행·지출·평가·지도·AI·카드가 다 있었다. 한 곳을 고치면
먼 곳이 깨지고, 그걸 **실기기에서야** 알게 됐다. 실제로 그렇게 두 번 배포했다
(b311 백틱 하나로 앱 전체 정지, b323 `todayYmd` 로 앱 전체 정지).

## 지금까지 뗀 것

| 파일 | 줄 | 무엇 | ctx |
|---|---|---|---|
| `map.js` | 597 | 세계지도 · 다녀온 국가 | me, loadCities |
| `report.js` | 412 | 여행 리포트 | me, openAi, openDraft, openNew, closeReview, loadChats |
| `shelf.js` | 391 | 보관함 · 배지 | me, loadCities, loadRateData, loadFootprint, todayYmd, saveRate, openTrip |
| `cards.js` | 369 | AI 제안 카드 | me, closeAi, loadPlans, review, ymd |
| `persona.js` | 258 | 성향 카드 | me, loadCities, showApp |
| `aiui.js` | 235 | AI 화면 부품(점·사진·출처) | me, aiToBottom, loadChats, drawCards |
| `city.js` | 173 | 도시 한 곳 | me, saveRate, drawRatings, openTrip, loadHome, appTab |

아래층으로 내린 것: `avgTail`→`rate.js` · `D1`·`asDate`→`calc.js` ·
`UN_COUNTRIES`→`map.js` · `LVCOLOR`→`cards.js` ·
`md`·`avatarOf`·`avatarImg`→`dom.js` · `hm`→`calc.js` (b335)

## ⚠ 떼어낸 일곱 조각에 **열두 개**가 숨어 있었다 (b335)

떼어낸 코드가 `import` 없이 남의 이름을 쓰고 있었다. 그 화면을 열면
`ReferenceError` 로 죽는 것들이다. 전부 **한 줄도 안 고친 채** 배포돼 있었다.

| 파일 | 없던 것 | 어디서 와야 했나 |
|---|---|---|
| `city.js` | `avatarImg` `hm` `dateRange` | dom.js · calc.js · calc.js |
| `report.js` | `md` `PERSONA_ICON` | dom.js · card.js |
| `cards.js` | `asDate` `D1` `suggested` `setSuggested` `setAiTripId` `NOROW` `pickedDay` | calc.js · ai.js · net.js · trip.js |

**왜 아무도 몰랐나 — 세 겹으로 가려져 있었다.**

1. 문법은 멀쩡하다. `check-syntax` 가 못 본다.
2. 그 줄은 **로그인해서 그 화면을 열어야** 돈다. `check-app` 은 로그아웃
   상태로 '앱이 뜨는가' 까지만 본다.
3. **`check-refs` 는 템플릿 문자열을 통째로 지우고 있었다.** 그런데 이 앱은
   화면을 전부 템플릿으로 그린다 — 즉 **이름을 제일 많이 부르는 자리가
   통째로 사각지대**였다. 열두 개가 전부 거기 있었다.

`check-refs.mjs` 를 두 군데 고쳤다.

- 글자열을 지우되 **`${...}` 안은 남긴다.** 거기는 글자가 아니라 코드다.
  (정규식 리터럴도 가려낸다 — `esc` 의 `/[&<>"]/` 안의 따옴표를 글자열
  시작으로 읽으면 그 뒤가 통째로 사라진다.)
- '**app.js 것을 들고 나왔나**' 에서 '**어디에도 import 안 하고 쓰나**' 로
  넓혔다. 실제 사고의 절반이 `calc.js`·`ai.js`·`net.js` 에서 와야 하는데
  안 가져온 것이었다. app.js 안에서는 형제였던 이름들이라 원인은 똑같다.

**잡음이 이 검사의 목숨이다.** 범위를 넓히면서 조건은 하나로 좁혀뒀다 —
**이 저장소 어딘가가 그 이름을 내보낼 때만** 말한다. `rgba`·`var`·`Image`
같은 것은 애초에 후보가 아니다. 지금 잡음 0개다.

## 방법 (그대로 따라 하면 된다)

1. **덩어리를 고른다.** `grep -n '^/\* ── ' app.js` 로 머리말을 본다.
   줄 수가 아니라 **하는 일**로 자른다 — 보관함 옆에 AI 열기와 알림이
   붙어 있었는데 상관없는 것이라 두고 왔다.
2. **딸린 것을 센다.** 그 블록이 쓰는 이름 중 `app.js` 맨 바깥 것을 찾는다.
   `tools/check-refs.mjs` 가 하는 계산과 같다.
3. **새 파일에 옮긴다.** 머리말에 *왜 이 조각을 골랐는지* 를 적는다.
4. **`app.js` 를 import 하지 않는다.** 고리가 생긴다. 필요한 것은
   `setXxxCtx({...})` 로 받는다. **`me` 는 값이 아니라 함수로** —
   로그인할 때마다 바뀐다.
5. **`bump.sh` 는 손댈 것 없다.** `ls` 로 있는 대로 쓴다.
6. **확인**: 로컬 브라우저로 `#sub` 가 '불러오는 중…' 에서 벗어났는지 →
   push → CI 네 단계.

## 겪은 함정 (다 한 번씩 당했다)

- `const` 화살표는 **끌어올려지지 않는다**. `setShelfCtx({ ..., todayYmd })` 로
  적었다가 앱이 통째로 안 떴다. `function` 선언은 괜찮다. 화살표로 감싼다.
- **옮기기 전에 받는 쪽에 이미 있는지 본다.** `D1` 을 `calc.js` 로 옮기다가
  거기 이미 있는 줄 모르고 셋째 사본을 만들었다.
- 템플릿 문자열 안에 **백틱을 쓰지 않는다**. 설명은 템플릿 밖에.
- **`heredoc` 은 역슬래시 두 개를 하나로 먹는다. 세 번 당했다**
  (`check-app.mjs`, `check-refs.mjs` 두 번). 홑 역슬래시는 살아남으니 정규식은
  대개 무사한데, **글자열 안에 역슬래시를 넣은 자리가 깨진다** — 두 개짜리가
  하나가 되면서 따옴표를 잡아먹어, 파일 전체가 문법 오류가 된다.
  역슬래시가 들어가는 파일은 **Write 도구로 쓴다.** 쓰고 나서 `grep` 으로
  그 줄을 눈으로 본다. 이 문서도 방금 그렇게 한 줄 깨져서 다시 썼다.

## 이 PC 에는 node 가 없다 — 검사를 브라우저에서 돌린다

`tools/*.mjs` 를 여기서 못 돌린다. CI 에 올려 보고 아는 것은 너무 늦다.
**로컬 서버를 띄우고 브라우저에서 그 파일 자체를 돌리면 된다:**

1. `.claude/launch.json` 의 `travel-v2` 로 서버를 띄운다(PowerShell HttpListener).
2. 검사할 `.js` 를 전부 `fetch` 해서 이름→내용 map 을 만든다.
3. `check-refs.mjs` 를 `fetch` 해서 `import ... node:fs` 줄만 지운다.
4. `new Function('readFileSync','readdirSync','console','process', 소스)` 로
   부른다. `readFileSync` 는 2번 map 조회, `process.exit` 는 `throw`.

**고친 뒤 반드시 일부러 깨뜨려 본다.** import 한 줄을 지운 사본을 넣어
검사가 정말 빨간불을 내는지 본다 — 통과만 확인하면 '아무것도 안 보는 검사'
와 구별이 안 된다. b335 에서 이렇게 12개를 다시 잡는 것까지 보고 넣었다.

⚠ `fetch` 는 **서비스워커가 가로챈다**(`ignoreSearch:true` 라 `?t=랜덤` 도
소용없다). 반드시 `caches.delete` 후 `fetch(url, {cache:'reload'})` 로 받는다.
이걸 안 해서 고친 파일을 두 번 헛읽었다.

## 남은 것 (큰 순서)

| 덩어리 | 어림 | 메모 |
|---|---|---|
| 여행 상세(일정·지출·준비·일행) | 1,000+ | **제일 크다.** 화면 단위로 더 잘게 잘라야 한다 |
| 프로필 | ~300 | 사진·이름·글자 크기 |
| AI 일정 초안 | ~250 | `draftTrip`·`draftOut` 상태를 같이 옮긴다 |
| 홈 | ~250 | 히어로·발자국 |
| 여행 만들기·달력 | ~330 | `wizStep` 등 단계 상태 |
| 여기 가봤어요 | ~200 | `quizPool` |
| 후보와 빈 시간 | ~120 | `cands`·`fitList` |

여행 상세가 제일 크고, `trip.js` 가 가진 상태를 가장 많이 쓴다.
일정 하나, 지출 하나… 로 나눠야 한다. **다음은 지출**(`app.js` 의
'지출'~'예약' 사이, 환율·일정에 붙이기·나눠 내기까지 한 덩어리, 약 410줄).

## 아직 눈으로 못 본 것

크롬에서 눌러본 것: 보관함 · 도시 화면 · 세계지도 · 다녀온 국가 · 성향 카드.
**안 본 것: 리포트, AI 제안 카드.** 리포트는 다녀온 여행이 있어야 열리고
제안 카드는 AI 를 한 번 돌려야 나온다. CI 는 로그아웃 상태로 '앱이 뜨는가'
까지만 본다 — **로그인해야 보이는 것은 검사가 못 본다.**

b335 에서 고친 12개도 **바로 그 두 화면에 몰려 있었다**(report.js 2개,
cards.js 7개). 우연이 아니다 — 아무도 안 열어본 화면이 제일 많이 깨져 있다.
로그인해서 리포트와 제안 카드를 한 번씩 열어보는 것이 지금 제일 값싼 확인이다.
