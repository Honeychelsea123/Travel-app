# app.js 쪼개기 — 어디까지 했고 어떻게 이어가나

2026-08-18. `app.js` 9,169 → 6,936줄. 일곱 조각이 나갔다.

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
`UN_COUNTRIES`→`map.js` · `LVCOLOR`→`cards.js`

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
- `heredoc` 으로 정규식을 쓰면 **역슬래시가 먹힌다**. 두 번 당했다
  (`check-app.mjs`, `check-refs.mjs`). 이스케이프가 필요 없는 형태로 쓴다.

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
일정 하나, 지출 하나… 로 나눠야 한다.

## 아직 눈으로 못 본 것

크롬에서 눌러본 것: 보관함 · 도시 화면 · 세계지도 · 다녀온 국가 · 성향 카드.
**안 본 것: 리포트, AI 제안 카드.** 리포트는 다녀온 여행이 있어야 열리고
제안 카드는 AI 를 한 번 돌려야 나온다. CI 는 로그아웃 상태로 '앱이 뜨는가'
까지만 본다 — **로그인해야 보이는 것은 검사가 못 본다.**
