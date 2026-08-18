# app.js 쪼개기 — 어디까지 했고 어떻게 이어가나

2026-08-18. `app.js` 9,169 → 6,462줄. 여덟 조각이 나갔다.

## 왜 하나

한 파일에 로그인·여행·지출·평가·지도·AI·카드가 다 있었다. 한 곳을 고치면
먼 곳이 깨지고, 그걸 **실기기에서야** 알게 됐다. 실제로 그렇게 두 번 배포했다
(b311 백틱 하나로 앱 전체 정지, b323 `todayYmd` 로 앱 전체 정지).

## 지금까지 뗀 것

| 파일 | 줄 | 무엇 | ctx |
|---|---|---|---|
| `map.js` | 597 | 세계지도 · 다녀온 국가 | me, loadCities |
| `expense.js` | 419 | 지출 · 환율 · 정산 | **me, drawPlans** |
| `report.js` | 412 | 여행 리포트 | me, openAi, openDraft, openNew, closeReview, loadChats |
| `shelf.js` | 391 | 보관함 · 배지 | me, loadCities, loadRateData, loadFootprint, saveRate, openTrip |
| `cards.js` | 369 | AI 제안 카드 | me, closeAi, loadPlans, review |
| `persona.js` | 258 | 성향 카드 | me, loadCities, showApp |
| `aiui.js` | 235 | AI 화면 부품(점·사진·출처) | me, aiToBottom, loadChats, drawCards |
| `city.js` | 173 | 도시 한 곳 | me, saveRate, drawRatings, openTrip, loadHome, appTab |

아래층으로 내린 것: `avgTail`→`rate.js` · `D1`·`asDate`→`calc.js` ·
`UN_COUNTRIES`→`map.js` · `LVCOLOR`→`cards.js` ·
`md`·`avatarOf`·`avatarImg`·`emptyDo`→`dom.js` ·
`hm`·`ymd`·`todayYmd`→`calc.js` · `nameOf`→`trip.js` (b335)

**ctx 는 줄어들어야 정상입니다.** 지출을 떼면서 딸린 것이 여섯이었는데,
넷을 아래층으로 내리니 둘이 됐습니다. 덤으로 `shelf.js` 에서 `todayYmd` 가,
`cards.js` 에서 `ymd` 가 빠졌습니다 — **떼어낼수록 얽힘이 줄어드는 자리를
고르는 것이 요령입니다.** 한 조각을 위해 내린 것이 이미 나간 조각들의
ctx 도 같이 줄입니다.

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

| 덩어리 | 줄 | 메모 |
|---|---|---|
| 일정(끌어서 순서·불러오기·오늘 화면·탭·쓸어넘기기) | ~700 | 여행 상세에 남은 것 중 제일 크다. 여기서 또 잘라야 한다 |
| 여행 정보 수정 · 후기 · 후기 사진 | ~400 | 4169~4500 근처. 저장 경로가 셋이라 같이 봐야 한다 |
| 붙여넣은 지도 링크에서 위치 찾기 | ~180 | 6102~6282. 혼자 닫혀 있어 **가장 쉬운 다음 칼** |
| 준비물 · 서류 · 예약 · 링크 | ~310 | 5544~5851. 넷이 닮은 목록이라 한 파일이 맞다 |
| 일행 · 초대 링크 | ~210 | 5851~6072. `nameOf` 가 이미 trip.js 로 갔다 |
| 프로필 | ~300 | 사진·이름·글자 크기 |
| AI 일정 초안 | ~250 | `draftTrip`·`draftOut` 상태를 같이 옮긴다 |
| 홈 | ~250 | 히어로·발자국 |
| 여행 만들기·달력 | ~330 | `wizStep` 등 단계 상태 |
| 여기 가봤어요 | ~200 | `quizPool` |
| 후보와 빈 시간 | ~120 | `cands`·`fitList` |

### 지출을 떼어보고 알게 된 것 (b335, 여덟 번째)

**여행 상세는 통째로는 못 떼고, 화면 단위로는 잘 떼진다.** 지출이 그 증거다 —
1,000줄짜리 덩어리 안에서 419줄이 ctx 둘만 남기고 깨끗하게 빠졌다.
잘 닫혀 있어서다: 자기 자료(`expenses`)를 자기가 받아오고, 자기 화면만
그리고, **밖에서 부르는 길이 `loadExpenses` 하나뿐**이었다.

그러니 다음 칼도 같은 것을 먼저 재라 — `grep` 으로 **밖이 그 블록의 이름을
몇 개나 부르는지** 센다. 하나나 둘이면 뗄 자리다. 지출은 둘이었는데
(`loadExpenses`·`nameOf`) 그중 `nameOf` 는 애초에 지출 것이 아니었다.

**딸린 것(ctx)이 많아 보이면 내릴 수 있는 것부터 본다.** 처음 센 여섯 중
넷이 아래층으로 갈 것이었다(`nameOf`·`todayYmd`·`emptyDo`, 그리고 `legFor` 는
`legNear(legs, …)` 한 줄이라 래퍼를 버렸다). **ctx 여섯은 "이 조각은 아직
못 뗀다" 가 아니라 "아래층에 갈 것이 섞여 있다" 는 뜻일 때가 많다.**

## 아직 눈으로 못 본 것

크롬에서 눌러본 것: 보관함 · 도시 화면 · 세계지도 · 다녀온 국가 · 성향 카드.
**안 본 것: 리포트, AI 제안 카드.** 리포트는 다녀온 여행이 있어야 열리고
제안 카드는 AI 를 한 번 돌려야 나온다. CI 는 로그아웃 상태로 '앱이 뜨는가'
까지만 본다 — **로그인해야 보이는 것은 검사가 못 본다.**

b335 에서 고친 12개도 **바로 그 두 화면에 몰려 있었다**(report.js 2개,
cards.js 7개). 우연이 아니다 — 아무도 안 열어본 화면이 제일 많이 깨져 있다.
로그인해서 리포트와 제안 카드를 한 번씩 열어보는 것이 지금 제일 값싼 확인이다.

지출은 로그인 없이도 **빈 화면까지는** 돌려봤다. trip.js 에 가짜 여행과
일행을 넣고 `loadExpenses()` 를 직접 불렀더니 '아직 지출이 없어요' 가 떴다.
그 한 번으로 새 import 가 다 맞는지 확인된다(`emptyDo`·`nameOf`·`drawOffbar`).

```js
const t = await import('./trip.js?v=b335'), e = await import('./expense.js?v=b335');
t.setTrip({ id:'…', start_date:'2026-09-12', end_date:'2026-09-18', home_currency:'KRW' });
t.setMembers([{ user_id:'u1', nickname:'서희' }]); t.setLegs([]); t.setPlans([]);
await e.loadExpenses();
```

**아직 못 본 것: 지출이 실제로 있을 때** — 환율 못박기, 정산 송금 줄,
일정에 붙이기. 로그인해서 지출 두 건을 서로 다른 통화로 넣어보면 한 번에 본다.
