/* ── 진입점 ────────────────────────────────────────────────────────
 * 층은 이렇게 흐릅니다. 위가 아래에 기대고, 거꾸로는 없습니다(순환 참조 방지).
 *   dom.js · db.js · calc.js · stars.js   ← 아무것도 import 안 하는 잎
 *   net.js · ui.js   (dom.js 만)
 *   admin.js  (dom.js · db.js · net.js)
 *   app.js    ← 여기. 나머지 전부
 */
import { WORLD_PATHS } from './world.js';
import { sb } from './db.js?v=b344';

/* JOIN_URL 은 member.js 로 옮겼습니다(b337) — 쓰는 곳이 거기 한 줄뿐이라
   여기 둘 이유가 없었습니다. 왜 앱 주소가 아닌지도 같이 옮겼습니다. */
import { $, esc, toast, copyText, md, avatarOf, avatarImg, emptyDo } from './dom.js?v=b344';
import { starHtml, paintStars, markRated } from './stars.js?v=b344';
import { fail, offNote, cacheGet, cacheSet, netIsDown, netTimeout, isOffline,
         write, flushQueue, drawOffbar, setOnDrained,
         setErrLogger, setReadOnly, NOROW } from './net.js?v=b344';
import { loadAdmin } from './admin.js?v=b344';
/* 취향으로 다음 도시를 고르는 계산. **AI 를 안 씁니다** — 오프라인에서도
   돌아야 하고, 같은 자료에는 늘 같은 답이 나와야 합니다(rec.js 맨 위 참고). */
/* ⚠ **화면은 아직 이걸 하나도 안 씁니다.** `__recCheck` 만 씁니다.
   취향 계산은 재보니 무작위와 별 차이가 없었고(rec.js 맨 위),
   확실한 것만 고르는 `certainPicks` 는 홈에 카드로 붙였다가 뺐습니다(b291) —
   '가보고 싶은 곳' 보관함에 이미 있는 걸 홈에 한 번 더 보여줄 뿐이었습니다.
   계산 자체는 멀쩡하니 남겨둡니다. 쓸 자리가 생기면 여기서 가져다 쓰면 됩니다. */
import { recommend, tasteOf, scoreCity, certainPicks } from './rec.js?v=b344';
import { arm, disarm, syncSheets, setSheetCloser, onSwipeX } from './ui.js?v=b344';
/* 지금 열려 있는 여행. 이름은 **살아 있는 연결**이라 읽는 쪽은 예전 그대로입니다.
   값을 넣는 것은 set* 를 지나가야 합니다 — 여기서 `trip = x` 라고 쓰면
   브라우저가 문법 오류를 내고 앱이 아예 안 뜹니다. 그게 이 분리의 핵심입니다. */
import { trip, plans, legs, members, expenses, bookings, transitLines,
         pickedDay, tab, catFilter, settleOn, todayOn, editPlanId,
         setTrip, clearTrip, setTripCloser,
         setPlans, setLegs, setMembers, setExpenses, setBookings, setTransitLines,
         setPickedDay, setTab, setCatFilter, setSettleOn, setTodayOn,
         setEditPlanId, nameOf } from './trip.js?v=b344';
/* 도시 평가. 네 화면이 같이 쓰는 자료라 한 곳이 어긋나면 넷이 같이 어긋납니다. */
import { myRates, cityStat, visited, justRated, rateFilter, avgTail,
         setRateData, setVisited, applyRate, putCityStat,
         clearJustRated, putRateFilter, clearRates } from './rate.js?v=b344';
/* 도시 사전과 찾기. 한 번 받으면 안 바뀝니다 — 여행이 바뀌어도 사람이 바뀌어도. */
import { cities, countryName, countryInfo, continentOf,
         useCities, addCity, search } from './cities.js?v=b344';
/* 여행 비서가 방금 내놓은 카드. 화면의 번호가 여기를 찾아가므로 통째로 갈아끼웁니다. */
import { suggested, aiTripId,
         setSuggested, clearSuggested, setAiTripId } from './ai.js?v=b344';
/* 성향 카드 화면. app.js 에서 떼어낸 첫 조각입니다(b321) — persona.js 머리말 참고. */
import { openPersona, closePersona, setPersonaCtx } from './persona.js?v=b344';
/* 세계지도·다녀온 국가. app.js 에서 떼어낸 두 번째 조각입니다(b322) —
   map.js 머리말 참고. UN_COUNTRIES 도 거기서 내보냅니다(두 곳에 적으면
   언젠가 한쪽만 고칩니다). */
import { openMap, closeMap, openCountries, closeCountries,
         shutBigMap, UN_COUNTRIES, setMapCtx } from './map.js?v=b344';
/* 보관함·배지. app.js 에서 떼어낸 세 번째 조각입니다(b323) — shelf.js 머리말 참고. */
import { openShelf, closeShelf, setShelfCtx } from './shelf.js?v=b344';
/* 도시 한 곳 화면. app.js 에서 떼어낸 네 번째 조각입니다(b324) — city.js 머리말 참고.
   map.js·shelf.js 도 openCity 를 쓰는데, 이제 ctx 로 넘기지 않고 그쪽이 직접
   import 합니다. 떼어낼수록 얽힘이 줄어드는 자리였습니다. */
import { openCity, closeCity, setCityCtx,
         isCityOpen, clearCityOpen } from './city.js?v=b344';
/* AI 대화 화면의 부품(점 세 개·사진 첨부·출처). 다섯 번째 조각입니다(b326) —
   aiui.js 머리말 참고. AI 덩어리 전체는 여행 상태와 얽혀 있어 못 뗐고,
   얽힘이 적은 앞부분만 가져왔습니다. */
import { showTyping, hideTyping, growMsg, fitJpeg, drawShot, drawSources,
         aiShots, SHOT_MAX, SRC_KO, setAiUiCtx } from './aiui.js?v=b344';
/* 여행 리포트. app.js 에서 떼어낸 여섯 번째 조각입니다(b333) — report.js 머리말 참고.
   이 화면은 끝에서 다른 화면으로 이어져서 ctx 가 깁니다(함수 다섯). */
import { drawReport, renderAiCard, setReportCtx } from './report.js?v=b344';
/* AI 제안 카드. app.js 에서 떼어낸 일곱 번째 조각입니다(b334) — cards.js 머리말 참고.
   LVCOLOR(검토 등급 색)도 거기서 내보냅니다 — 두 곳에 적으면 한쪽만 고칩니다. */
import { drawCards, openPlanForm, runReview,
         LVCOLOR, setCardsCtx } from './cards.js?v=b344';
import { loadExpenses, setExpenseCtx } from './expense.js?v=b344';
import { loadBookings, loadPacking, loadLinks, closeDocs } from './prep.js?v=b344';
import { loadMembers, handleJoin, ROLE_KO, setMemberCtx } from './member.js?v=b344';
import { drawPlanMap, mapLinks, memoMapUrl, splitParts, ensureLeaflet } from './planmap.js?v=b344';
import { loadCities, drawHits, drawPop, pick, picked, resetPick } from './citysearch.js?v=b344';
import { applyTs, setMyAvatar, setProfileCtx } from './profile.js?v=b344';
import { loadReview, setReviewCtx } from './review.js?v=b344';
import { loadRateData, loadRatings, drawRatings, saveRate, refreshVisited,
         setRateFilter, tripSub, resetRateHtml, setRatingCtx } from './rating.js?v=b344';
import { loadNotifPrefs, setNotifyCtx } from './notify.js?v=b344';
import { openNew, movePrefs, setNewTripCtx } from './newtrip.js?v=b344';
import { loadHome, loadFootprint, heroTint, tripPhoto, closeReview,
         openTripReport, resetHomeSig, setHomeCtx } from './home.js?v=b344';
import { hhmm, osmLookup, setCandsCtx } from './cands.js?v=b344';
import { PERSONA_ICON, REPORT_ICON, PERSONA_BG, REPORT_BG,
         askImageSize, personaStats, judgePersona, cardImage } from './card.js?v=b344';
import { distKm, travel, hop, settleMath, dateRange, dayLabel, localTime, money,
         legAt, legNear, legFirst, travelMinutes, NO_CENTS, D1, asDate, hm, ymd, todayYmd } from './calc.js?v=b344';

/* persona.js 는 app.js 를 import 하지 않습니다 — 그러면 app → persona → app
   으로 고리가 생깁니다. app.js 만 아는 셋을 여기서 넣어줍니다.
   me 는 로그인할 때마다 바뀌므로 값이 아니라 함수로 줍니다. 값으로 주면
   로그인 전의 null 을 영영 들고 있게 됩니다.
   loadCities·showApp 은 함수 선언이라 여기서 참조해도 됩니다(끌어올려집니다). */
setPersonaCtx({ me: () => me, loadCities, showApp });
setMapCtx({ me: () => me, loadCities });
/* ⚠ 전에는 여기 `todayYmd: () => todayYmd()` 처럼 화살표로 감싼 줄이 있었습니다.
   `const` 화살표는 끌어올려지지 않아서 이 줄에서는 아직 없었기 때문입니다
   (Cannot access 'todayYmd' before initialization — 앱이 통째로 안 떴습니다).
   b335 에서 `ymd`·`todayYmd` 를 calc.js 로 내리면서 그 걱정이 사라졌습니다 —
   import 는 끌어올려지고, 쓰는 쪽이 직접 가져오니 ctx 에서 아예 빠집니다. */
setShelfCtx({ me: () => me, loadFootprint, openTrip });
setCityCtx({ me: () => me, saveRate, drawRatings, openTrip,
             loadHome, appTab: () => appTab });
setAiUiCtx({ me: () => me, aiToBottom, loadChats, drawCards });
setReportCtx({ me: () => me, openAi, openDraft, openNew, closeReview, loadChats });
setCardsCtx({ me: () => me, closeAi, loadPlans, review });
/* 지출은 app.js 에서 둘만 알면 됩니다 — 누가 로그인했나, 일정을 다시 그려라.
   (지출이 일정 줄에 금액으로 붙어서 지출을 고치면 일정도 다시 그려야 합니다.) */
setExpenseCtx({ me: () => me, drawPlans });
setMemberCtx({ me: () => me, loadTrips, openTrip });
setProfileCtx({ me: () => me });
setReviewCtx({ me: () => me });
setRatingCtx({ me: () => me, fillCityList, showApp });
setNotifyCtx({ me: () => me, loadNotifs });
setNewTripCtx({ me: () => me, loadTrips, openTrip, openDraft });
setHomeCtx({ me: () => me, openTrip, showApp });
setCandsCtx({ loadPlans, openAi, loadChats });

/* 지도 좌표를 제자리에 넣습니다. 쓰는 쪽(핀 · 발자국 미니지도)보다 먼저여야 합니다.
   **이 줄은 진입점에 있어야 합니다** — 모듈이 아니라 화면에 쓰는 일이고,
   world.js 를 쓰는 곳이 여기뿐입니다. */
document.getElementById('worldland').innerHTML = WORLD_PATHS;

const t0 = performance.now();
/* **여행 하나에 딸린 것은 여기 없습니다** — trip.js 가 지킵니다(맨 위 import).
   읽기는 예전과 똑같이 `trip.id`·`plans.length` 로 씁니다(살아 있는 연결).
   값을 넣을 때만 `setPlans(...)` 처럼 문을 지나갑니다.
   아래 남은 것은 **여행과 상관없이 앱 전체가 쓰는 것**들입니다 —
   로그인한 사람, 도시 목록, 어느 앱 탭인지, 평가 화면 상태. */
let me = null,
    /* picked · hitList · cursor 는 citysearch.js 로 옮겼습니다(b339) —
       pick() 이 그리로 가면서 여기 남길 이유가 없어졌습니다. */
    channel = null, bumpTimer = null, bumpPending = null,
    appTab = 'home',

    tripFilter = 'up', openReview = false;

/* 기기에 저장해 둔 글자 크기를 그리기 전에 먼저 씌웁니다 — 안 그러면 한 번 깜빡입니다. */
{
  const v = localStorage.getItem('t2:ts');
  if (v) document.documentElement.style.setProperty('--ts', v);
}

/* ── 같은 것을 다시 그리지 않습니다 ──────────────────────────────────
 * **탭을 누를 때마다 목록을 통째로 갈아끼우고 있었습니다.** 글자는 똑같이
 * 다시 그려도 티가 안 나는데 **사진은 요소가 버려졌다 새로 만들어져서**
 * 빈 칸이 보였다 채워집니다. 주소가 같아도 그렇습니다 — 요소가 새것이라
 * 처음부터 다시 그리기 때문입니다.
 *
 * b276 에서 기록 탭만 고쳤는데 사용자가 **홈의 평가·지도와 여행 목록도
 * 그대로 깜빡인다**고 했습니다. 같은 구조가 네 곳인데 한 곳만 봤던 것입니다.
 * 그래서 규칙을 여기 한 곳에 둡니다.
 *
 * ⚠ **비교는 우리가 만든 글자끼리** 합니다. `el.innerHTML` 을 도로 읽으면
 *   브라우저가 따옴표와 속성 순서를 제 식대로 바꿔 놓아 **늘 다르다고 나옵니다.**
 * ⚠ **밖에서 그 상자를 손대면 반드시 `dropHtml` 로 무효로** 하십시오.
 *   안 그러면 "같으니 건드리지 말자"가 화면과 어긋난 채로 굳습니다. */
const lastHtml = {};
function putHtml(id, html){
  if (lastHtml[id] === html) return false;      /* 안 바뀌었으면 손대지 않습니다 */
  $(id).innerHTML = html;
  lastHtml[id] = html;
  return true;
}
const dropHtml = id => { delete lastHtml[id]; };

/* 자체 점검 표시(`mark`)와 그것을 채우던 질의 셋을 걷었습니다 (b278).
   "부르는 곳이 여러 군데라 함수는 남겨둔다"고 적혀 있었는데 **세어보니
   부르는 곳은 자체 점검 하나뿐이었고**, 값을 쓰는 자리(`#d0`·`#v0`)는
   어느 파일에도 없었습니다. 즉 `mark` 는 늘 첫 줄에서 되돌아왔고
   **점검 결과는 아무도 못 보는 채로 버려지고 있었습니다.**
   그런데도 부팅마다 countries · cities · transit_grades 개수를 세러
   서버에 세 번 다녀왔습니다.
   다시 필요하면 **관리자 대시보드에 자리를 만들고** 거기서 부르십시오 —
   보는 자리 없이 되살리면 같은 일이 반복됩니다. */

/* 여기까지 왔으면 화면 코드가 살아 있다는 뜻입니다.
   index.html 의 "화면을 못 불러왔어요" 상자를 걷습니다. */
window.__t2booted = true;
document.getElementById('bootfail')?.remove();

/* 오프라인 큐가 다 나간 뒤에 무엇을 다시 받아올지는 여기가 압니다.
   net.js 는 trip 도 loadPlans 도 몰라야 하므로 넣어줍니다. */
setOnDrained(async () => {
  if (trip && !$('listview').classList.contains('hide')) await loadPlans();
});

/* fail() 이 서버 오류를 한국어로 바꿔 보여주고 **원문은 여기로** 보냅니다.
   원문이 필요한 것은 사용자가 아니라 고치는 사람입니다. */
setErrLogger((msg, src) => logError(msg, src));

/* ui.js 의 시트는 AI 시트 닫는 법을 모릅니다(뒤로가기 기록을 같이 다룹니다).
   넣어줍니다. closeAi 는 function 선언이라 아래에 있어도 여기서 잡힙니다. */
setSheetCloser(() => closeAi());

/* trip.js 는 실시간 구독을 모릅니다(서버를 모르는 파일입니다). 넣어줍니다 —
   이제 여행을 닫을 때 구독 끊는 것을 따로 기억할 필요가 없습니다.
   전에는 네 곳에서 `unwatch(); trip = null;` 을 각자 적고 있었습니다. */
/* 여행을 닫을 때 딸려 닫혀야 하는 것들. **여기 한 곳에 모읍니다** —
   여행을 닫는 길이 넷이었고 이미 서로 달랐던 것이 trip.js 를 만든 이유입니다.
   서류는 여행 위를 덮는 판이라, 안 닫으면 여행을 나갔는데 앞 여행의
   예약번호가 화면에 남습니다. */
setTripCloser(() => { unwatch(); $('docview').classList.add('hide'); });


/* ── 서비스 워커 ────────────────────────────────────────────────────
 * 이게 있어야 비행기모드에서 앱이 열립니다.
 * 화면은 캐시로 즉시 엽니다(기다리면 오프라인에서 집니다). 그러면 새 빌드가
 * 한 박자 늦게 보이므로, 열고 나서 조용히 확인하고 바뀌었으면 한 번만 새로고침합니다.
 *
 * 아이폰 홈 화면 앱은 앱 전환기에서 되살릴 때 load 가 다시 안 돕니다.
 * 그래서 화면이 보일 때마다도 확인합니다 — 안 그러면 며칠씩 옛 빌드에 묶입니다. */
async function checkBuild(){
  try {
    const t = await (await fetch('./index.html', { cache:'no-store' })).text();
    const now = t.match(/id="build">(b\d+)</)?.[1];
    const mine = $('build')?.textContent.trim();
    if (!now || !mine || now === mine) return;

    /* **새 파일이 다 받아진 뒤에만 새로고침합니다.**
       전에는 번호만 보고 바로 새로고침했습니다. 그러면 새 index.html 은 받았는데
       짝인 app.js 는 아직 없는 순간이 생기고, 그때 연결이 끊기면
       화면이 통째로 안 뜹니다. 실제로 비행기모드에서 그렇게 됐습니다.

       **파일 이름을 나열하지 않습니다.** 전에는 (app|world|calc) 처럼 적어뒀는데,
       모듈을 새로 만들 때마다 여기 더하는 것을 잊으면 그 파일만 안 받아진 채로
       새로고침이 걸립니다 — 위에 적은 바로 그 사고입니다. ?v= 가 붙은 우리 파일은
       전부 짝이므로 이름을 묻지 않고 다 받습니다. */
    const refs = [...t.matchAll(/(?:src|href)="([\w.-]+\.[a-z]+\?v=[^"]+)"/g)]
      .map(m => './' + m[1]);
    /* 캐시 이름에 sw.js 의 VER 을 그대로 박아두면 sw.js 를 고칠 때 여기도 같이
       고쳐야 하는데 잊기 쉽습니다(실제로 v7 인데 v6 로 박혀 있었습니다).
       't2-shell-' 로 시작하는 캐시를 찾아서 쓰면 그럴 일이 없습니다. */
    const shellKey = (await caches.keys()).find(k => k.startsWith('t2-shell-'));
    const box = shellKey ? await caches.open(shellKey).catch(() => null) : null;
    /* **담는 일은 서비스워커에게 맡깁니다.** 아래 fetch 는 워커의 `?v=` 갈래를
       지나가고, 거기서 담은 **뒤에** 같은 파일의 옛 판을 지웁니다(sw.js 의
       dropOldVersions). 전에는 여기서 한 번 더 `box.put` 을 했는데, 그러면
       담기는 하되 **정리를 건너뛴 채로** 담깁니다. 그래서 셸에 옛 판이
       쌓였습니다 — 프로덕션에서 `app.js?v=b218` 이 b232 옆에 있는 것을 봤습니다.
       (여기서 지우는 코드를 또 적으면 규칙이 두 곳이 됩니다. 한쪽만 고치게 되는
        것이 이 앱에서 이미 두 번 난 사고입니다.)

       워커가 아직 이 화면을 안 맡았을 때만 우리가 담습니다 — 그때는 fetch 가
       워커를 안 지나가므로 아무도 안 담습니다. 옛 판도 없으니 지울 것도 없습니다. */
    const swOn = !!navigator.serviceWorker?.controller;
    for (const u of refs){
      if (box && await box.match(u)) continue;
      const r = await fetch(u);          /* 못 받으면 여기서 던지고 새로고침 안 합니다 */
      if (!r.ok) return;
      if (box && !swOn) await box.put(u, r.clone());
    }

    /* 같은 번호로 두 번 새로고침하지 않습니다. 캐시가 아직 안 바뀌었으면
       무한히 돌 수 있습니다 — 그때는 다음에 열 때 따라잡습니다. */
    const k = 't2:reloaded:' + now;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, '1');
    location.reload();
  } catch {}
}
if ('serviceWorker' in navigator){
  addEventListener('load', () => {
    /* **삼키지 않습니다.** 전에는 .catch(() => {}) 였습니다. sw.js 에 문법
       오류를 내면 등록이 'script evaluation failed' 로 조용히 실패하고,
       화면은 멀쩡히 도니까(네트워크로 다 받으므로) **오프라인이 통째로
       죽은 줄을 아무도 모릅니다.** 실제로 그렇게 만들 뻔했습니다.
       오류 기록으로 보냅니다 — 관리자 대시보드의 '최근 신고와 오류'에 뜹니다. */
    navigator.serviceWorker.register('./sw.js').catch(e => {
      console.error('서비스워커 등록 실패 — 오프라인이 안 됩니다:', e);
      logError('서비스워커 등록 실패: ' + (e?.message || e), 'sw.js');
    });
    setTimeout(checkBuild, 1800);        /* 워커가 뒤에서 새 화면을 받아둘 틈 */

    /* Leaflet 을 뒤에서 미리 받아둡니다. **부팅과는 상관없습니다** — 화면이
       다 뜨고 한가할 때 시작하고, 안 와도 아무 일도 안 일어납니다.
       이걸 안 하면 지도를 한 번도 안 연 사람은 비행기모드에서 지도가 안 나옵니다
       (전에는 head 에 있어서 열 때마다 받아졌습니다). 부팅을 안 막으면서
       그 성질만 되찾습니다. 서비스워커가 셸에 담아두므로 한 번이면 됩니다. */
    const warm = () => { if (navigator.onLine) ensureLeaflet(); };
    if (window.requestIdleCallback) requestIdleCallback(warm, { timeout:8000 });
    else setTimeout(warm, 4000);
  });
  addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    navigator.serviceWorker.getRegistration('./').then(r => r?.update()).catch(() => {});
    checkBuild();
  });
}

/* ── 오류 남기기 ────────────────────────────────────────────────────
 * 남이 쓰기 시작하면 "안 돼요" 한 마디만 오고 무엇이 터졌는지 알 길이 없습니다.
 * 화면에서 터진 것을 조용히 남겨둡니다.
 *
 * 남기는 것: 메시지 · 어느 파일 몇 줄 · 스택 앞부분 · 빌드 번호 · 브라우저.
 * 안 남기는 것: 일정 · 지출 · 대화 내용. 오류를 고치는 데 필요 없습니다.
 *
 * 조심할 것 둘:
 *   1. 로그인 전에는 못 보냅니다(RLS 가 user_id = auth.uid() 를 요구). 그냥 넘어갑니다.
 *   2. 오류 하나가 무한히 반복될 수 있습니다 — 같은 메시지는 한 번만,
 *      한 번 켤 때 최대 다섯 개까지만 보냅니다. 안 그러면 오류가 오류를 부릅니다. */
const errSeen = new Set();
let errSent = 0;
async function logError(message, source, stack){
  if (!me?.id || errSent >= 5) return;
  const key = String(message).slice(0, 120);
  if (errSeen.has(key)) return;
  errSeen.add(key); errSent++;
  try {
    await sb.from('client_errors').insert({
      user_id: me.id,
      build: $('build')?.textContent || '',
      message: String(message).slice(0, 500),
      source: String(source || '').slice(0, 300),
      stack: String(stack || '').slice(0, 2000),
      ua: navigator.userAgent.slice(0, 300),
    });
  } catch {}   /* 오류를 남기다 터지면 그건 그냥 놓아줍니다 */
}
addEventListener('error', e => {
  /* 이미지가 안 불러와진 것도 여기로 옵니다. 그건 오류가 아니라 흔한 일입니다. */
  if (e.target && e.target !== window) return;
  logError(e.message, `${e.filename}:${e.lineno}:${e.colno}`, e.error?.stack);
});
addEventListener('unhandledrejection', e => {
  const r = e.reason;
  logError(r?.message || String(r), 'promise', r?.stack);
});

/* ── 알림 설정 ────────────────────────────────────────────────────────
 * 알림 설정과 잠금화면 알림(Web Push)은 notify.js 로 옮겼습니다
 * (b342, 열여섯 번째 조각). ctx 는 둘(me · loadNotifs)입니다.
 * **그 둘 사이에 있던 '만든 사람이 켜고 끄는 것들'과 '알림을 눌렀을 때'는
 * 여기 남깁니다** — 앞은 앱 껍데기고 뒤는 여행 화면을 부릅니다. */
/* ── 만든 사람이 켜고 끄는 것들 ─────────────────────────────────────
 * 일이 터졌을 때 **배포를 기다리지 않아도 되게** 하는 값들입니다(db/066).
 * 배포는 몇 분 걸리고 그 사이에도 돈이 나가거나 잘못된 알림이 계속 갑니다.
 *
 * **못 읽으면 전부 켜진 것으로 봅니다.** "설정을 못 읽었으니 다 꺼둔다"는
 * 앱을 멈추는 것과 같습니다 — 오프라인에서 특히 그렇습니다.
 * 066 을 아직 안 올린 곳에서도 같은 이유로 그대로 돕니다. */
let flags = { notice:{ text:'' }, signup:true, readonly:false, features:{} };
const featOn = k => flags.features?.[k] !== false;

/* ⚠ **부팅에 두 번 불립니다.** 로그인 화면용으로 한 번(맨 아래 `loadFlags().then`),
   로그인이 끝나고 또 한 번. 이미 들어와 있는 사람은 둘이 나란히 나갑니다 —
   재보니 **685ms + 701ms**, 둘 다 첫 화면을 기다리게 하는 자리였습니다.
   부르는 쪽 둘 다 이유가 있어서 어느 하나를 지우기보다, **돌고 있으면 그 약속을
   같이 씁니다.** 끝나면 비우므로 나중에 다시 부르면 새로 받아옵니다
   (관리자가 스위치를 바꾸고 새로고침하는 길이 살아 있어야 합니다). */
let flagsP = null;
function loadFlags(){
  if (flagsP) return flagsP;
  flagsP = (async () => {
    const r = await netTimeout(sb.rpc('public_flags'), 4000);
    if (r.error || !r.data) return;        /* 조용히 지금 값을 지킵니다 */
    flags = { ...flags, ...r.data };
    drawNotice();
    applyFeatures();
  })().finally(() => { flagsP = null; });
  return flagsP;
}

function drawNotice(){
  const t = String(flags.notice?.text || '').trim();
  const el = $('noticebar');
  el.classList.toggle('hide', !t);
  el.classList.toggle('warn', flags.notice?.tone === 'warn');
  el.textContent = t;
}

/* 기능 스위치. **화면에서 감추기만 합니다** — 진짜로 막는 것은 서버 쪽
   함수입니다(AI·알림). 여기서 감추는 것은 "눌러도 안 되는 단추를 두지
   않기 위해서"입니다. */
function applyFeatures(){
  $('pushrow')?.classList.toggle('hide', !featOn('push'));
  $('pushkinds')?.classList.toggle('hide', !featOn('push'));
  $('docbtn')?.classList.toggle('hide', !featOn('docs'));
  document.body.classList.toggle('noreorder', !featOn('reorder'));
  document.body.classList.toggle('readonly', !!flags.readonly);
  /* **진짜로 막는 것은 여기입니다.** 화면에서 단추를 흐리게 하는 것은
     안내일 뿐이고, 저장은 write() 한 곳을 지나므로 거기서 막습니다. */
  setReadOnly(!!flags.readonly);
  /* 점검 중이면 왜 안 되는지 위에 띄웁니다. 공지가 따로 있으면 그쪽이
     먼저입니다 — 만든 사람이 적은 말이 더 정확합니다. */
  if (flags.readonly && !String(flags.notice?.text || '').trim()){
    $('noticebar').classList.remove('hide');
    $('noticebar').classList.add('warn');
    $('noticebar').textContent = '지금은 점검 중이에요. 보기만 되고 저장은 잠시 뒤에 돼요.';
  }
}

/* ── 알림을 눌렀을 때 ───────────────────────────────────────────────
 * 알림에 `./?t=<여행>&d=<날짜>` 를 실어 보냅니다(065). 오는 길이 둘입니다.
 *   · 앱이 꺼져 있었다 → 그 주소로 새로 열립니다. 부팅 뒤에 읽습니다
 *   · 앱이 켜져 있었다 → 서비스워커가 postMessage 로 일러줍니다.
 *     **새로 불러오지 않습니다** — 보던 것이 날아가면 안 됩니다
 *
 * **주소는 읽고 나서 지웁니다.** 안 지우면 새로고침할 때마다 같은 여행이
 * 다시 열리고, 뒤로가기가 이상해집니다. */
async function openFromUrl(href){
  let u; try { u = new URL(href, location.href); } catch { return; }
  const t = u.searchParams.get('t'), d = u.searchParams.get('d');
  if (!t) return;
  history.replaceState(history.state, '', location.pathname);
  await openTrip(t);
  /* 그 날만 보여줍니다 — 열흘짜리 여행에서 오늘을 다시 찾게 하면
     알림으로 데려온 뜻이 없습니다. */
  if (d && (plans || []).some(p => p.date === d)){
    setPickedDay(d);
    drawDays(); drawCats(); drawPlans(); drawPlanMap();
  }
}
navigator.serviceWorker?.addEventListener('message', e => {
  if (e.data?.t2 === 'open') openFromUrl(e.data.url);
});

/* ── 탈퇴 ───────────────────────────────────────────────────────────
 * 이메일·이름·사진을 모으고 있으니 지울 길이 반드시 있어야 합니다.
 *
 * 세 가지를 지킵니다.
 *   1. **무엇이 지워지는지 누르기 전에 보여줍니다.** "정말요?"만 묻고 실행하면
 *      무엇을 잃는지 모른 채 누르게 됩니다.
 *   2. **글자를 적게 합니다.** 버튼 두 번으로 계정이 사라지면 안 됩니다.
 *   3. **일행이 있는 여행은 안 지웁니다.** 내 계정 하나 지우자고 남의 일정을
 *      없앨 수는 없습니다. 나만 빠지고 주인이면 다음 사람에게 넘깁니다.
 */
const DEL_WORD = '탈퇴합니다';

$('delbtn').addEventListener('click', async () => {
  const box = $('delbox');
  if (!box.classList.contains('hide')){ box.classList.add('hide'); return; }
  box.classList.remove('hide');
  $('delerr').classList.add('hide');
  $('del_word').value = ''; $('del_go').disabled = true;

  const { data, error } = await sb.rpc('delete_preview');
  if (error){
    /* 036 을 아직 안 올렸으면 함수가 없습니다. 세는 것만 건너뛰고 나머지는 그대로. */
    $('delwhat').innerHTML =
      `<div class="empty" style="text-align:left">무엇이 지워지는지 세지 못했어요.<br>
         <span class="memo">${esc(error.message || '')}</span></div>`;
    return;
  }
  const d = data || {};
  const row = (k, v, m) => v ? `<div class="row"><span class="label">${esc(k)}
      ${m ? `<div class="memo">${esc(m)}</div>` : ''}</span>
      <span class="val"><b>${v}</b></span></div>` : '';
  $('delwhat').innerHTML =
    `<div class="daysep">지워지는 것</div>` +
    row('나 혼자인 여행', d.solo_trips, '그 안의 일정·지출·예약까지 함께') +
    row('일정', d.plans) +
    row('지출', d.expenses) +
    row('도시 별점', d.city_ratings) +
    row('가보고 싶은 곳', d.wants) +
    row('맛집·관광지 별점', d.plan_ratings) +
    row('AI 대화', d.chats) +
    `<div class="row"><span class="label">계정
       <div class="memo">이름 · 이메일 · 프로필 사진</div></span>
       <span class="val"><b>삭제</b></span></div>` +
    (d.shared_trips
      ? `<div class="daysep">남는 것</div>
         <div class="row"><span class="label">일행이 있는 여행
           <div class="memo">일정은 그대로 두고 나만 빠져요. 제가 주인이면
             다음 일행에게 넘어가요. 제가 낸 지출은 남지만 결제자 칸이 비워져요</div></span>
           <span class="val"><b>${d.shared_trips}</b></span></div>` : '');
});

$('del_cancel').addEventListener('click', () => {
  $('delbox').classList.add('hide'); $('delerr').classList.add('hide');
});
/* 정확히 적었을 때만 열립니다. 앞뒤 공백은 봐줍니다 — 자동완성이 붙일 때가 있습니다. */
$('del_word').addEventListener('input', () => {
  $('del_go').disabled = $('del_word').value.trim() !== DEL_WORD;
});

$('del_go').addEventListener('click', async () => {
  if ($('del_word').value.trim() !== DEL_WORD) return;
  const b = $('del_go');
  $('delerr').classList.add('hide');
  b.disabled = true; b.innerHTML = '<span class="load">지우는 중…</span>';

  const { data, error } = await sb.functions.invoke('delete-me',
    { body: { confirm: 'DELETE' } });

  if (error || data?.error){
    b.disabled = false; b.textContent = '영구 삭제';
    let why = data?.error || error?.message || '';
    try { why = (await error?.context?.json())?.error || why; } catch {}
    return fail(/not found|Failed to send/i.test(why)
      ? '탈퇴 기능이 아직 준비되지 않았어요. 만든 사람에게 알려주세요.'
      : why, 'del');
  }

  /* 계정이 없어졌으니 남은 토큰도 버리고 첫 화면으로 보냅니다.
     캐시에 남은 내 자료도 지웁니다 — 안 지우면 다음 사람이 그걸 봅니다. */
  try {
    Object.keys(localStorage).filter(k => k.startsWith('t2:'))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
  await sb.auth.signOut().catch(() => {});
  alert('탈퇴가 끝났어요. 그동안 고마웠어요.');
  location.replace(location.pathname);
});

/* ── 버그 신고 ──────────────────────────────────────────────────────
 * 앱이 스스로 터진 것(client_errors)만 모으면 절반만 압니다.
 * 제일 흔한 문제는 안 터집니다 — "눌러도 아무 일이 안 나요".
 * 그건 사람이 적어줘야 알 수 있습니다. */
$('rpbtn').addEventListener('click', () => {
  $('rpbox').classList.toggle('hide');
  $('rperr').classList.add('hide');
  if (!$('rpbox').classList.contains('hide')) $('rp_body').focus();
});
$('rp_cancel').addEventListener('click', () => $('rpbox').classList.add('hide'));
$('rpkind').addEventListener('click', e => {
  const b = e.target.closest('[data-rk]'); if (!b) return;
  $('rpkind').querySelectorAll('.day').forEach(x => x.classList.toggle('on', x === b));
});

$('rp_send').addEventListener('click', async () => {
  const b = $('rp_send');
  $('rperr').classList.add('hide');
  const body = $('rp_body').value.trim();
  if (body.length < 5) return fail('무엇이 불편했는지 조금만 더 적어주세요.', 'rp');

  b.disabled = true; b.innerHTML = '<span class="load">보내는 중…</span>';
  const r = await netTimeout(sb.from('reports').insert({
    user_id: me.id,
    kind: $('rpkind').querySelector('.on')?.dataset.rk || '버그',
    body,
    /* 어느 빌드에서 났는지가 제일 중요한 단서입니다. 기기 종류도 같이.
       일정·지출 내용은 안 보냅니다 — 고치는 데 필요 없습니다. */
    build: $('build')?.textContent || '',
    ua: navigator.userAgent.slice(0, 300),
  }).select('id'));
  b.disabled = false; b.textContent = '보내기';

  if (r.error) return fail(r.error, 'rp');
  /* 040 을 안 올렸으면 표가 없어 0건이 됩니다. 그건 만든 사람이 할 일이라
     화면에는 안 적습니다 — 사용자는 마이그레이션 번호를 모릅니다. */
  if (!r.data?.length){
    logError('버그 신고 저장 0건 — db/040 미적용 가능성', 'report');
    return fail('보내지 못했어요. 잠시 뒤 다시 해주세요.', 'rp');
  }
  $('rp_body').value = '';
  $('rpbox').classList.add('hide');
  toast('보냈어요. 읽고 고칠게요.');
});


/* 초성('ㄷㅋ'→도쿄)과 찾기는 cities.js 로 갔습니다 (맨 위 import) —
   사전이 아는 규칙이라 사전 옆에 있어야 하고, 거기서는 로그인 없이도
   콘솔에서 돌려볼 수 있습니다(__citiesCheck). */

/* ── 로그인 ─────────────────────────────────────────────────────── */
$('login').addEventListener('click', async () => {
  $('login').disabled = true;
  /* 돌아올 주소를 명시합니다. Supabase 의 Redirect URLs 에 이 주소가
     등록돼 있어야 하고, 없으면 Site URL 로 튕겨 엉뚱한 데로 갑니다. */
  /* **이메일만 받습니다.**
     범위를 안 적으면 구글에 profile 까지 달라고 해서 이름과 프로필 사진이 딸려 옵니다.
     그건 기본값이라 그랬을 뿐, 우리가 필요해서 요청한 게 아니었습니다.
     이름은 본인이 정하고 사진도 본인이 올립니다 — 둘 다 앱 안에 이미 있습니다.
     안 쓰는 남의 정보를 갖고 있을 이유가 없습니다. */
  /* ⚠ **어느 계정으로 들어갈지 늘 물어봅니다.**
     안 적으면 구글은 브라우저에 로그인된 계정이 하나일 때 **묻지 않고**
     그걸로 들어갑니다. 그래서 우리 앱에서 로그아웃하고 다시 눌러도
     방금 나온 그 계정으로 되돌아왔습니다 — 우리 로그아웃은 우리 세션만
     끊고 구글 세션은 그대로라, 사용자 눈에는 로그아웃이 안 된 것처럼
     보입니다. 계정이 둘 이상인 사람에게는 원래 물어봐서, 계정 하나로
     시험하면 이 문제가 안 보입니다.
     `select_account` 는 계정만 다시 고르게 합니다 — `consent` 와 달리
     권한 동의 화면을 매번 띄우지 않습니다. */
  const { error } = await sb.auth.signInWithOAuth({
    provider:'google',
    options:{ redirectTo: location.origin + location.pathname,
              scopes: 'openid email',
              queryParams:{ prompt: 'select_account' } }
  });
  if (error){ $('login').disabled = false; fail(error); }
});

/* 가입을 막아뒀으면 **로그인 화면에서 미리 알려줍니다.** 진짜 관문은 서버
   트리거지만(db/066), 거기까지 갔다 오면 구글을 한 바퀴 돌고 나서
   "알 수 없는 오류"만 봅니다. 이미 쓰던 사람은 그대로 들어옵니다 —
   막히는 것은 **새로 만들어지는 계정**뿐이라 단추는 안 감춥니다. */
loadFlags().then(() => {
  if (flags.signup === false && $('signedout') && !$('signedout').classList.contains('hide')){
    const p = document.createElement('p');
    p.className = 'memo';
    p.style.cssText = 'text-align:center; margin-top:12px';
    p.textContent = '지금은 새로 가입할 수 없어요. 이미 쓰시던 분은 그대로 들어오실 수 있어요.';
    $('login').after(p);
  }
});

$('logout').addEventListener('click', async () => {
  /* **잠금화면 알림부터 뗍니다.** 안 떼면 이 기기는 계속 이 사람의 일정을
     알립니다 — 같은 기기를 다음 사람이 써도요. 로그아웃한 계정의 일정이
     남의 잠금화면에 뜨면 그건 자료가 새는 것입니다.
     로그아웃 뒤에는 RLS 때문에 표에서 지울 수가 없으니 **먼저** 합니다. */
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager?.getSubscription();
    if (sub){
      await sb.from('push_subs').delete().eq('endpoint', sub.endpoint);
      await sub.unsubscribe();
    }
  } catch {}
  await sb.auth.signOut();
  location.replace(location.pathname);      /* 주소에 붙은 토큰 조각을 지웁니다 */
});

/* ── 도시 검색 ──────────────────────────────────────────────────── */
/* 도시 검색·'많이 가는 곳'·도시 자료 받아오기는 citysearch.js 로 옮겼습니다
   (b339, 열두 번째 조각). **딸린 것이 없어 ctx 가 없습니다.**
   flagOf 는 그 김에 dom.js 로 내렸습니다 — map.js 가 같은 계산을 인라인으로
   한 번 더 갖고 있었습니다. */
/* ── 여행 만들기 ──────────────────────────────────────────────────────
 * 네 단계 마법사(어디로 · 언제 · 취향 · 이름)와 달력은 newtrip.js 로
 * 옮겼습니다(b343, 열일곱 번째 조각). ctx 는 넷입니다 —
 * me · loadTrips · openTrip · openDraft. 뒤의 셋은 **다 만든 다음에**
 * 가는 곳이라 그 조각이 알 필요가 없는 것들입니다. */
/* ── 여행 목록 ──────────────────────────────────────────────────── */
/* ── 앱 하단바 ─────────────────────────────────────────────────────
 * 여행 안에서는 일정/지출/일행 탭바가, 밖에서는 이 바가 나옵니다.
 * 로그아웃과 보관함이 목록 위에 얹혀 있던 것을 여기로 내렸습니다. */
function showApp(t){
  appTab = t;
  shutBigMap();
  /* 여행이 열려 있으면 먼저 닫습니다. 안 닫으면 여행 화면이 탭 화면 아래에
     그대로 남습니다 — 홈에서 발자국을 누르면 프로필 밑에 여행이 붙어 있었습니다.
     backToList 가 이미 닫고 부르는 경우에도 다시 해서 탈은 없습니다. */
  if (trip) clearTrip();
  $('tripview').classList.add('hide'); inTrip(false);

  $('draftview').classList.add('hide');
  $('reviewview').classList.add('hide');
  /* 국가 목록은 프로필 위에 얹히는 판입니다. 탭을 옮기면 같이 걷습니다 —
     안 걷으면 홈으로 나갔는데 국가 목록이 그대로 덮고 있습니다. */
  $('ctrypane').classList.add('hide');
  $('homeview').classList.toggle('hide', t !== 'home');
  $('listview').classList.toggle('hide', t !== 'trips');
  $('rateview').classList.toggle('hide', t !== 'rate');
  $('cityview').classList.add('hide'); clearCityOpen();
  $('aiview').classList.add('hide');   /* 비서는 탭이 아니라 시트입니다 */
  $('setview').classList.toggle('hide',  t !== 'set');
  $('newcard').classList.add('hide');
  $('namebox').classList.add('hide');
  document.querySelectorAll('#appbar button').forEach(b =>
    b.classList.toggle('is-on', b.dataset.a === t));
  if (t === 'home')      loadHome();
  else if (t === 'set')  { showProfile(false); loadNotifs(); loadFootprint(); }
  else if (t === 'ai')   loadAi();
  else if (t === 'rate') loadRatings();
  else                   loadTrips();
  window.scrollTo({ top:0, behavior:'smooth' });
}
$('appbar').addEventListener('click', e => {
  const b = e.target.closest('button[data-a]');
  if (b) showApp(b.dataset.a);
});

$('tripfilter').addEventListener('click', e => {
  const b = e.target.closest('button[data-f]'); if (!b) return;
  tripFilter = b.dataset.f;
  document.querySelectorAll('#tripfilter button').forEach(x =>
    x.classList.toggle('on', x.dataset.f === tripFilter));
  loadTrips();
});

/* ── 일정 검토 ──────────────────────────────────────────────────────
 * 계산만 합니다. AI 를 안 부르므로 공짜이고 비행기모드에서도 됩니다.
 * 문서가 "계산 검사가 공짜라 가능한 구조"라고 한 그것이고,
 * 남들이 생성만 하고 안 하는 부분입니다.
 *
 * 지금은 이동 시간을 못 잽니다 — 일정에 좌표가 안 붙어 있습니다.
 * 좌표가 붙으면 trips 의 이동 상수로 "이 하루가 물리적으로 가능한가"까지 봅니다. */
const STAY_MIN = { 식사:60, 카페:40, 관광:60, 쇼핑:60, 이동:0, 숙소:0, 기타:30 };
const mins  = t => { const [h,m] = String(t).split(':'); return +h*60 + +m; };
const fmtM  = v => String(Math.floor(v/60)).padStart(2,'0') + ':' +
                   String(v%60).padStart(2,'0');

/* distKm/travel/hop 은 calc.js 로 옮겼습니다 (맨 위 import). 순수 계산이라
   이름·시그니처 그대로 옮길 수 있었습니다 — 여기서 부르는 자리는 안 바뀝니다. */

function review(t, ps, lgs){
  const out = [];
  const byDay = {};
  ps.forEach(p => (byDay[p.date] ||= []).push(p));

  /* 여행 기간인데 아무것도 없는 날 */
  for (let d = asDate(t.start_date); ymd(d) <= t.end_date; d = new Date(d.getTime() + D1)){
    const k = ymd(d);
    if (!byDay[k]) out.push({ lv:'참고',
      t:`${dayLabel(k, t).split(' · ')[0]}이 비어 있어요`,
      s:'아직 아무것도 안 잡혔어요.' });
  }

  for (const [d, list] of Object.entries(byDay)){
    const lab = dayLabel(d, t).split(' · ')[0];

    /* 문서: 하루 4~5개만. 8~10개를 욱여넣는 것이 "그럴듯한데 못 쓴다"의 원인이다. */
    if (list.length >= 6) out.push({ lv:'주의',
      t:`${lab}에 ${list.length}개가 잡혀 있어요`,
      s:'하루 4~5개를 넘기면 대개 못 지켜요. 빈 시간을 남기는 편이 나아요.' });

    const timed = list.filter(p => p.start_time)
                      .sort((a,b) => a.start_time.localeCompare(b.start_time));

    for (let i = 0; i < timed.length; i++){
      const p = timed[i];
      const st = mins(p.start_time), en = p.end_time ? mins(p.end_time) : null;

      if (en !== null && en < st) out.push({ lv:'심각',
        t:`${p.title} — 끝나는 시각이 시작보다 빨라요`,
        s:`${hm(p.start_time)} → ${hm(p.end_time)}` });

      /* 도쿄 앱이 실제로 잡아낸 사고입니다 — 체크인 15시인데 11시 35분에 잡혀 있었습니다. */
      if (p.category === '숙소' && /체크인|check\s*-?in/i.test(p.title) && st < 15*60)
        out.push({ lv:'주의',
          t:`${lab} 체크인이 ${hm(p.start_time)}로 잡혀 있어요`,
          s:'체크인은 대개 15시부터예요. 짐만 맡기는 것이면 괜찮아요.' });

      const nx = timed[i+1];
      if (nx){
        const nst = mins(nx.start_time);
        /* 끝 시각이 없으면 분류별 최소 체류 시간으로 어림합니다. */
        const guessed = en === null;
        const end = en ?? st + (STAY_MIN[p.category] ?? 30);
        if (nst < end) out.push({ lv:'심각',
          t:`${p.title} 과 ${nx.title} 이 겹칩니다`,
          s:`${hm(p.start_time)}~${guessed ? '(어림 ' + fmtM(end) + ')' : hm(p.end_time)}` +
            ` 인데 다음이 ${hm(nx.start_time)}에 시작합니다.` });
        else {
          /* 여기가 남들이 안 하는 자리입니다 — 두 곳 사이를 실제로 가 볼 수 있는가.
             좌표가 둘 다 있어야 잽니다. */
          const h = hop(p, nx, lgs);
          const gap = nst - end;
          if (h && gap < h.min) out.push({
            lv: gap < h.min - 15 ? '심각' : '주의',
            t: `${p.title} → ${nx.title} 이동 시간이 모자랍니다`,
            /* 음수면 "-20분밖에 없어요"가 됩니다. 앞 일정이 이미 넘겼다는 뜻입니다. */
            s: `${h.km.toFixed(1)}km · ${h.walk ? '도보' : '이동'} 약 ${h.min}분인데 ` +
               (gap < 0 ? '앞 일정이 이미 넘겼어요.' : `${gap}분밖에 없어요.`) +
               (guessed ? ' (앞 일정 끝 시각이 없어 어림잡았어요)' : '') });
          else if (!h && gap === 0) out.push({ lv:'주의',
            t:`${p.title} 다음에 이동할 시간이 없어요`,
            s:`끝나자마자 ${nx.title} 이 시작합니다.` });
        }
      }
    }

    const noTime = list.length - timed.length;
    if (list.length >= 3 && noTime > list.length / 2) out.push({ lv:'참고',
      t:`${lab}은 시각이 대부분 비어 있어요`,
      s:'시각을 넣어야 겹침과 이동을 검사할 수 있어요.' });
  }

  const rank = { 심각:0, 주의:1, 참고:2 };
  return out.sort((a,b) => rank[a.lv] - rank[b.lv]);
}


async function loadAi(){
  const { data, error } = await sb.from('trips')
    .select('id,title').order('start_date');
  if (error) return fail(error, 'trip');

  /* 여행을 안 고르고도 물어볼 수 있어야 합니다. 어디로 갈지 정하기 전에
     묻는 것이 오히려 더 많습니다. 그때는 여행 자료 없이 그냥 답합니다. */
  /* 첫 줄이 곧 이 고르개의 이름표입니다 — 아무것도 안 골랐을 때 '여행 선택'
     이라고 보입니다. 전에는 '여행 없이 물어보기'였는데, 머리말 한 줄에
     같이 앉히기엔 너무 길어 옆 단추를 밀어냈습니다. 여행을 고르면 그
     이름이 그대로 보이므로 무슨 이야기 중인지도 여기서 알 수 있습니다. */
  $('ai_trip').innerHTML =
    `<option value="">여행 선택</option>` +
    (data || []).map(t => `<option value="${esc(t.id)}">${esc(t.title)}</option>`).join('');
  $('ai_trip').value = (aiTripId && data.some(t => t.id === aiTripId)) ? aiTripId : '';
  /* 들어올 때는 채팅부터 보입니다. 홈에서 "자세히"로 온 경우만 펼칩니다. */
  $('reviewcard').classList.toggle('hide', !openReview);
  openReview = false;
  await runReview($('ai_trip').value);
  await loadChats($('ai_trip').value);
}
$('ai_trip').addEventListener('change', () => {
  runReview($('ai_trip').value);
  loadChats($('ai_trip').value);
});

/* ── AI 대화 ────────────────────────────────────────────────────────
 * 키는 화면에 없습니다. Edge Function 뒤에 있고 우리는 그 함수만 부릅니다.
 * 대화는 사람별로 나눠 저장합니다 — 섞이면 AI 가 남의 질문을 맥락으로 씁니다
 * ("아까 말한 그 라멘집"이 다른 사람 대화일 수 있습니다). */
async function loadChats(tripId){
  /* AI 는 서버가 있어야 합니다. 오프라인이면 물어봐도 답이 안 옵니다.
     "불러오는 중…"을 남겨두면 하루 종일 기다리게 됩니다. 못 쓴다고 적습니다.
     입력칸도 막습니다 — 쓸 수 있게 두면 써 보고 나서야 안 되는 걸 압니다. */
  if (netIsDown()){
    $('chat').innerHTML = '<div class="empty">연결이 없어 AI 는 지금 쓸 수 없어요.<br>' +
      '일정과 지출은 그대로 보실 수 있어요.</div>';
    $('ai_msg').disabled = true; $('ai_send').disabled = true;
    return;
  }
  $('ai_msg').disabled = false; $('ai_send').disabled = false;

  /* 여행을 안 골랐을 때 나눈 대화도 남깁니다 (029). trip_id 가 비어 있는 줄입니다.
     eq 로는 null 을 못 찾습니다 — is 를 써야 합니다. */
  let q = sb.from('chats').select('role,content').eq('user_id', me.id);
  q = tripId ? q.eq('trip_id', tripId) : q.is('trip_id', null);
  const { data } = await netTimeout(q.order('created_at').limit(40));
  drawChats(data || []);
  /* 쓴 횟수와 **남은 횟수를 따로** 적습니다. 전에는 "3/15회"였는데,
     이건 읽는 사람이 빼야 남은 수가 나옵니다 — 정작 궁금한 쪽을 안 알려준
     셈입니다. 한도가 없으면 limit 이 null 로 옵니다(db/046). 그때 그대로
     찍으면 "3/null회"가 되므로 남은 자리에는 '무제한'을 적습니다. */
  const { data: left } = await sb.rpc('ai_left');
  if (left) $('ai_left').textContent = left.limit == null
    ? `오늘 ${left.used}회 · 남은 횟수 무제한`
    : `오늘 ${left.used}회 · 남은 ${Math.max(0, left.limit - left.used)}회`;
}

/* md · avatarOf · avatarImg 는 dom.js 로 내렸습니다(b335, 맨 위 import).
   여기 있는 동안 city.js 와 report.js 가 import 없이 쓰고 있었습니다 —
   둘 다 템플릿 문자열 안이라 검사가 못 봤습니다. */

function drawChats(rows){
  /* 이름표를 떼고 좌우로 갈랐습니다. 누가 한 말인지 읽지 않아도 보입니다.
     답변마다 붙는 'AI 생성' 꼬리표는 멋이 아니라 의무입니다 —
     인공지능기본법(2026.1.22 시행) 제31조가 생성형 AI 결과물에 그 사실을
     표시하라고 정합니다. 화면에 한 번만 적어두는 것으로는 '결과물 표시'가
     아니라서, 답변 하나하나에 답니다. */
  /* 빈 상태일 때만 대화칸을 키워 안내와 예시를 가운데 세웁니다.
     **스크롤 상자(.aiscroll)는 건드리지 않습니다** — 거기를 손댔다가
     aiToBottom 이 엉뚱한 상자를 굴리던 사고가 이미 한 번 있었습니다. */
  $('chat').classList.toggle('isempty', !rows.length);
  $('chat').innerHTML = rows.length
    ? rows.map(m => m.role === 'user'
        ? `<div class="msg me">${md(m.content)}</div>`
        : `<div class="msg ai">${md(m.content)}<div class="aitag">AI가 생성한 답변입니다 · 영업시간·요금은 직접 확인해 주세요</div></div>`
      ).join('')
    /* 빈 화면에 붙던 안내(생성형 AI · 미국 Google 서버 전송)는 b178 에서
       뺐습니다. **답변마다 붙는 aitag 는 그대로 둡니다** — 인공지능기본법
       제31조가 요구하는 것은 결과물 표시라서 저 안내로는 대신할 수 없습니다.
       국외 이전 고지는 개인정보처리방침 7번에 그대로 있습니다. */
    /* **처음 열면 411px 가 빈 흰 자리였습니다** (실제 화면에서 잼).
       안내 한 줄만 있고 그 아래가 통째로 비었습니다. 대화창의 제일 큰 벽은
       "뭘 물어야 하지"인데, 그 벽 앞에 빈 화면을 내주고 있었던 것입니다.
       **눌러서 바로 보내지는 예시를 깝니다.** 한 번 눌러보면 어떤 것을
       물을 수 있는지 알게 되고, 다음부터는 자기 말로 칩니다.
       여행을 고른 상태면 그 여행에 대한 것을 묻습니다 — 고르개가 바로
       위에 있는데 예시가 일반적인 이야기면 둘이 따로 놉니다. */
    : `<div class="empty">${aiTripId ? '이 여행에 대해 물어보세요.' : '어디로 갈지, 뭘 챙길지 아무거나 물어보세요.'}</div>
       <div class="asks">${(aiTripId
          ? ['비 오면 뭐 하지?', '이 일정 너무 빡빡한가?', '근처 맛집 알려줘', '뭘 챙겨야 해?']
          : ['3박 4일로 어디가 좋을까?', '지금 가기 좋은 곳은?', '혼자 가기 좋은 도시', '예산 100만원이면?']
        ).map(q => `<button type="button" class="ask" data-ask="${esc(q)}">${esc(q)}</button>`).join('')}</div>`;
  aiToBottom();
}

/* 새 답변이 와도 화면이 그대로라 스크롤을 내려야만 읽을 수 있었습니다.
   **#chat 을 굴리고 있었는데 그건 스크롤 상자가 아닙니다.** 대화·근거·제안 카드를
   한 덩어리로 묶으면서 스크롤이 바깥 .aiscroll 로 옮겨졌는데(app.css),
   굴리는 코드는 옛 상자에 그대로 남아 있었습니다. 아무 일도 안 일어난 것입니다.
   답변 뒤에는 출처와 제안 카드가 더 붙으므로, 그것들이 그려진 **다음 프레임**에
   한 번 더 내립니다. 안 그러면 카드 높이만큼 모자랍니다. */
function aiToBottom(){
  const box = document.querySelector('.aichat .aiscroll');
  if (!box) return;
  const go = () => { box.scrollTop = box.scrollHeight; };
  go();
  requestAnimationFrame(go);
}

/* ── 평가 ───────────────────────────────────────────────────────────
 * 일정 앱은 1년에 두 번 열립니다. 돌아올 이유를 만드는 자리입니다.
 * 추천은 하지 않습니다 — 예상 별점은 근거보다 세게 들리고,
 * 여행은 틀렸을 때 대가가 영화와 다릅니다.
 * 남들 평균은 예측이 아니라 사실이라 보여주되 몇 명이 매겼는지 같이 답니다. */
/* starHtml · paintStars · markRated 는 stars.js 로 옮겼습니다 (맨 위 import).
   다섯 화면이 같은 모양으로 그려야 하는 것이라 한곳에 모았습니다. */


/* ── 평가 ─────────────────────────────────────────────────────────────
 * 평가 화면과 평가 자료 받아오기는 rating.js 로 옮겼습니다
 * (b341, 열다섯 번째 조각). ctx 는 셋(me · fillCityList · showApp)입니다.
 * `rateShown`·`rateObs` 도 그리로 갔습니다 — 쓰는 곳이 거기뿐이었습니다. */
/* ── 홈 ───────────────────────────────────────────────────────────────
 * 홈 · 여기 가봤어요 · 내 발자국은 home.js 로 옮겼습니다
 * (b344, 열여덟 번째 조각). 셋이 서로를 부르므로 한 파일입니다.
 * ctx 는 셋(me · openTrip · showApp)입니다. */
/* ── 갈 만한 곳 · 빈 시간 ─────────────────────────────────────────────
 * 후보 모으기 · 좌표 채우기 · 빈 시간 찾기는 cands.js 로 옮겼습니다
 * (b344, 열아홉 번째 조각). ctx 는 셋(loadPlans · openAi · loadChats)입니다. */
/* ── AI 일정 초안 ────────────────────────────────────────────────────
 * 문서가 "P를 끌어오는 핵심"이라고 한 자리입니다.
 * 짜준 것을 바로 넣지 않습니다. 계산으로 한 번 검사해서 보여주고,
 * 넣을지는 사람이 정합니다 — AI 는 쓰지 않고 제안만 합니다. */
let draftTrip = null, draftOut = null;

/* 짜준 것을 기기에 남겨둡니다. 화면을 나갔다 오면 사라지던 것을 막습니다 —
   AI 횟수를 써서 받은 결과인데 넣기도 전에 날리면 안 됩니다.
   서버에 두지 않는 것은 아직 내 것도 아닌 초안이기 때문입니다.
   넣거나 지우면 그때 없앱니다. */
const DKEY = id => 't2:draft:' + id;
function saveDraft(id, out){
  try { localStorage.setItem(DKEY(id), JSON.stringify({ ...out, at: Date.now() })); }
  catch {}                              /* 저장 공간이 꽉 차도 초안 자체는 살아 있습니다 */
}
function readDraft(id){
  try {
    const s = localStorage.getItem(DKEY(id));
    if (!s) return null;
    const d = JSON.parse(s);
    /* 두 주가 지난 초안은 여행 날짜가 지났을 수 있습니다. 붙들고 있지 않습니다. */
    if (!d?.actions?.length || Date.now() - (d.at || 0) > 14 * 864e5){
      localStorage.removeItem(DKEY(id)); return null;
    }
    return d;
  } catch { return null; }
}
const dropDraft = id => { try { localStorage.removeItem(DKEY(id)); } catch {} };

/* preselect 를 주면 그 여행을 고른 채로 엽니다 — 새 여행 마지막 단계에서
   'AI 가 짜줄게요' 로 들어올 때 씁니다.
   lean 이면 묻는 칸(d_ask)을 접습니다. 거기서 방금 다 고르고 왔으니까요. */
async function openDraft(preselect, lean){
  const today = todayYmd();
  const { data } = await sb.from('trips')
    .select('id,title,destination,start_date,end_date')
    .gte('end_date', today).order('start_date').limit(20);

  ['homeview','listview','rateview','aiview','setview','cityview']
    .forEach(v => $(v).classList.add('hide'));
  $('draftview').classList.remove('hide');
  movePrefs('d_prefslot');        /* 새 여행 화면에 가 있었다면 도로 가져옵니다 */
  window.scrollTo({ top:0 });
  if (history.state?.t2 !== 'draft') history.pushState({ t2:'draft' }, '');

  /* 여행이 하나도 없으면 새로 만드는 쪽이 처음부터 열려 있어야 합니다. */
  const list = data || [];
  if (preselect) draftTrip = preselect;
  else draftTrip = list.some(t => t.id === draftTrip) ? draftTrip
                 : (list[0]?.id || 'new');
  $('d_trips').innerHTML = list.map(t => {
    const n = Math.round((asDate(t.end_date) - asDate(t.start_date)) / D1) + 1;
    return `<span class="day${t.id === draftTrip ? ' on' : ''}" data-dtrip="${esc(t.id)}">
      ${esc(t.title)} <span class="n">${n}일</span></span>`;
  }).join('') +
    `<span class="day" data-dtrip="new">＋ 새 여행</span>`;

  /* 새 여행에서 넘어왔으면 묻는 칸을 접고, 제목을 그 여행 이름으로 답니다.
     'AI 일정 만들기'라고 적혀 있으면 아직 만드는 중인 줄 압니다. */
  const mine = list.find(t => t.id === draftTrip);
  $('d_ask').classList.toggle('hide', !!lean);
  $('d_more').classList.toggle('hide', !lean);
  $('d_title').textContent = lean && mine ? mine.title : 'AI 일정 만들기';

  await loadCities();
  fillCityList();
  /* 접혀 있던 옛날 폼(어디로·시작·며칠)은 이제 안 씁니다. 여행 만들기는
     새 여행 화면 한 군데서만 합니다 — '새 여행' 칩이 그리로 보냅니다. */
  $('d_new').classList.add('hide');
  $('drafterr').classList.add('hide');
  showSavedDraft();
}

/* 저장해 둔 초안이 있으면 되살립니다. 없으면 결과 자리를 비웁니다. */
function showSavedDraft(){
  const d = draftTrip && draftTrip !== 'new' ? readDraft(draftTrip) : null;
  if (d){ draftOut = d; drawDraft(); $('d_go').textContent = '다시 짜기'; }
  else  { draftOut = null; $('d_result').innerHTML = ''; $('d_go').textContent = '일정 짜기'; }
}

function closeDraft(fromPop){
  if (!fromPop && history.state?.t2 === 'draft'){ history.back(); return; }
  $('draftview').classList.add('hide');
  $('reviewview').classList.add('hide');
  showApp('home');
}
$('draftback').addEventListener('click', () => closeDraft());

/* 접어둔 것을 도로 펼칩니다. 다시 짜고 싶을 때 취향을 바꿀 길입니다. */
$('d_more').addEventListener('click', () => {
  $('d_ask').classList.remove('hide');
  $('d_more').classList.add('hide');
  $('d_ask').scrollIntoView({ behavior:'smooth', block:'nearest' });
});

$('draftview').addEventListener('click', e => {
  const t = e.target.closest('[data-dtrip]');
  if (!t) return;
  /* 여기서도 여행을 만들 수 있게 옛날 폼(d_new)이 접혀 있었습니다. 그러면
     만드는 길이 셋이 됩니다 — 홈, 여행 탭, 그리고 여기. 모양도 다 다릅니다.
     그 화면으로 보냅니다. 만들고 나면 'AI가 짜줄게요'로 여기 다시 옵니다. */
  if (t.dataset.dtrip === 'new'){ openNew(); return; }
  draftTrip = t.dataset.dtrip;
  document.querySelectorAll('#d_trips .day').forEach(x =>
    x.classList.toggle('on', x.dataset.dtrip === draftTrip));
  showSavedDraft();            /* 여행마다 초안이 따로 있습니다 */
});

/* 칩 고르기. 속도와 아침은 하나만, 뭘 위주로는 여러 개입니다.
   **prefblock 자신에 답니다.** 이 칸들은 새 여행 3단계와 초안 화면을
   오가므로, 바깥 화면에 걸어두면 옮겨간 쪽에서 안 눌립니다. */
$('prefblock').addEventListener('click', e => {
  for (const [box, key] of [['d_pace','pace'], ['d_morning','morning']]){
    const one = e.target.closest(`#${box} [data-${key}]`);
    if (one){
      document.querySelectorAll(`#${box} .day`).forEach(x => x.classList.remove('on'));
      one.classList.add('on');
      return;
    }
  }
  const f = e.target.closest('#d_focus [data-focus]');
  if (f) f.classList.toggle('on');
});

$('d_go').addEventListener('click', async () => {
  if (!draftTrip) return fail('여행을 골라주세요.', 'draft');
  /* 여행이 하나도 없으면 'new' 가 골라져 있습니다. 짤 여행이 없으니
     만드는 화면으로 보냅니다 — 여기서 만들지는 않습니다. */
  if (draftTrip === 'new') return openNew();
  $('drafterr').classList.add('hide');
  $('d_go').disabled = true; $('d_go').textContent = '짜는 중… 20초쯤 걸립니다';
  $('d_result').innerHTML = '';

  const prefs = {
    pace:    document.querySelector('#d_pace .on')?.dataset.pace || 'normal',
    morning: document.querySelector('#d_morning .on')?.dataset.morning || 'early',
    focus:   [...document.querySelectorAll('#d_focus .on')].map(x => x.dataset.focus),
  };
  const { data, error } = await sb.functions.invoke('chat',
    { body: { trip_id: draftTrip, mode: 'draft', prefs,
              message: $('d_note').value.trim() || null } });

  $('d_go').disabled = false; $('d_go').textContent = '다시 짜기';

  if (error){
    let why = error.message;
    try { why = (await error.context?.json())?.error || why; } catch {}
    return fail(/not found|Failed to send/i.test(why)
      ? 'AI 기능이 아직 준비되지 않았어요. 만든 사람에게 알려주세요.'
      : why, 'draft');
  }
  if (data?.error) return fail(data.error, 'draft');
  if (!data?.actions?.length)
    return fail('일정을 만들지 못했습니다. 다시 눌러보세요.', 'draft');

  draftOut = data;
  saveDraft(draftTrip, data);
  drawDraft();
});

function drawDraft(){
  const acts = [...(draftOut.actions || [])]
    .sort((a, b) => (a.date + (a.start_time || '99:99'))
                     .localeCompare(b.date + (b.start_time || '99:99')));
  /* 짜준 것을 그대로 믿지 않습니다. 우리 계산기로 한 번 훑습니다 — 공짜입니다. */
  const t = { start_date: acts[0].date, end_date: acts[acts.length - 1].date };
  const found = review(t, acts.map(a => ({ ...a, id: 'x' })), legs || []);
  const bad = found.filter(f => f.lv === '심각');

  const days = draftOut.days || [...new Set(acts.map(a => a.date))].sort();
  const empty = days.filter(d => !acts.some(a => a.date === d));

  const byDay = {};
  acts.forEach(a => (byDay[a.date] = byDay[a.date] || []).push(a));

  $('d_result').innerHTML =
    `<div class="card">
       <h2>이렇게 짜봤어요 <span class="val">${acts.length}개</span></h2>
       ${draftOut.reply ? `<div class="memo" style="margin-bottom:10px">${
         esc(draftOut.reply).slice(0, 400)}</div>` : ''}
       ${bad.length || empty.length
         ? `<div class="row" style="border:0; padding:0 0 10px; margin:0">
              <span class="kdot" style="margin-top:6px; background:var(--bad)"></span>
              <span class="label"><b>넣기 전에 봐주세요</b>
                <div class="memo">${esc([
                  ...bad.slice(0, 3).map(f => f.t),
                  empty.length ? `${empty.length}일이 비어 있어요` : ''
                ].filter(Boolean).join(' · '))}</div></span>
            </div>`
         : `<div class="memo" style="margin-bottom:10px">
              겹치거나 무리한 일정은 없어요.</div>`}

       ${days.map(d => `<div style="margin-top:10px">
         <div class="label" style="font-weight:600">${esc(dayLabel(d, { start_date: days[0] }))}</div>
         ${(byDay[d] || []).map(a => `<div class="plan">
            <div class="when">${esc(a.start_time || '–')}</div>
            <span class="kdot ${a.category ? 'k-' + esc(a.category) : ''}"></span>
            <div class="body"><b>${esc(a.title)}</b>${
              a.memo ? `<span class="memo">${esc(a.memo)}</span>` : ''}</div>
          </div>`).join('') || '<div class="empty">이 날은 비어 있어요.</div>'}
       </div>`).join('')}

       <button class="primary" id="d_apply" style="width:100%; margin-top:14px">
         이대로 ${acts.length}개 넣기</button>
       <button class="ghost" id="d_drop" style="width:100%; margin-top:6px">
         이 초안 지우기</button>
       <div class="memo" style="text-align:center; margin-top:8px">
         넣은 뒤에도 하나씩 고치거나 지울 수 있어요.
         넣기 전까지는 이 초안이 기기에 남아 있어요.</div>
     </div>`;

  $('d_drop').onclick = () => { dropDraft(draftTrip); showSavedDraft(); };

  $('d_apply').onclick = async () => {
    $('d_apply').disabled = true; $('d_apply').innerHTML = '<span class="load">넣는 중…</span>';
    const rows = acts.map(a => ({
      trip_id: draftTrip, date: a.date, start_time: a.start_time,
      title: a.title, category: a.category, memo: a.memo,
      lat: a.lat, lng: a.lng, created_by: me.id,
    }));
    /* RLS 에 막히면 오류가 아니라 0행이 돌아옵니다. 넣은 수를 반드시 세야 합니다. */
    const r = await sb.from('plans').insert(rows).select('id');
    if (r.error){ $('d_apply').disabled = false; return fail(r.error, 'draft'); }
    if (!r.data?.length){
      $('d_apply').disabled = false;
      return fail('하나도 넣지 못했습니다. 이 여행에 쓸 권한이 있는지 확인해주세요.', 'draft');
    }
    dropDraft(draftTrip);          /* 넣었으니 더 들고 있을 이유가 없습니다 */
    closeDraft();
    openTrip(draftTrip);
  };
}

function showProfile(setting){
  shutBigMap();
  $('shelfpane').classList.add('hide');
  $('personapane').classList.add('hide');
  $('mappane').classList.add('hide');        /* 지도가 열려 있었으면 같이 닫습니다 */
  $('ctrypane').classList.add('hide');       /* 국가 목록도 같이 */
  /* 대시보드는 설정 위에 한 겹 더 얹힌 화면입니다. 안 닫으면 프로필로 나갔다
     들어와도 통계가 그대로 남아 있습니다. */
  $('admpane').classList.add('hide');
  $('profpane').classList.toggle('hide', setting);
  $('setpane').classList.toggle('hide', !setting);
  window.scrollTo({ top:0, behavior:'smooth' });
}
/* loadAdmin 을 여기서 불러야 합니다. 안 그러면 **영영 안 열립니다** —
   프로필 아이콘(#dashbtn)을 켤지 말지가 여기 결과로 정해집니다.
   설정을 열 때도 한 번 더 부릅니다 — 숫자가 오래되면 안 되니까요.
   관리자가 아니면 서버가 막고 아이콘은 숨은 채로 남습니다. */
$('gear').addEventListener('click', () => {
  showProfile(true); loadNotifPrefs(); loadAdmin();
});

/* 상단 홈 단추. 여행 안이든 보관함이든 성향 카드든 한 번에 빠져나옵니다.
   showApp 이 여행을 닫고 큰 지도도 걷어내므로 따로 치울 것이 없습니다.
   깊이 들어간 화면들은 뒤로가기 기록을 쌓아뒀으니 그것부터 비워야
   홈에서 뒤로가기를 눌렀을 때 다시 그 안으로 들어가지 않습니다. */
$('setback').addEventListener('click', () => showProfile(false));

/* ── 내 자료 내려받기 ────────────────────────────────────────────────
 * 데이터베이스에는 되돌리기가 없습니다. 잘못 지우면 그냥 사라집니다.
 * 서버 열쇠를 쓰지 않고 내 권한으로만 읽습니다 — RLS 가 내 것만 내줍니다.
 * 남의 여행에 초대돼 있으면 그 여행도 같이 받습니다. 볼 수 있는 것이 곧 내 자료입니다. */
$('dumpbtn').addEventListener('click', async () => {
  const b = $('dumpbtn');
  $('dumperr').classList.add('hide');
  b.disabled = true; b.innerHTML = '<span class="load">모으는 중…</span>';

  /* 표마다 조건이 다르지 않습니다. RLS 가 이미 걸러 주므로 통째로 받습니다. */
  const TABLES = ['trips', 'trip_legs', 'trip_members', 'plans', 'expenses',
                  'expense_shares', 'bookings', 'packing', 'links', 'candidates',
                  'city_ratings', 'plan_ratings', 'trip_reviews', 'chats',
                  'profiles', 'user_prefs'];
  /* 표 이름을 한국어로 옮기는 짝. **위로 올려두었습니다** — 아래 목록만
     쓰고 있었고, 정작 오류 문구는 `city_ratings(PGRST301)` 처럼 표 이름과
     오류 코드를 그대로 내보내고 있었습니다. 둘이 같은 짝을 써야 합니다. */
  const NAME = { trips:'여행', trip_legs:'구간', trip_members:'일행', plans:'일정',
                 expenses:'지출', expense_shares:'분담', bookings:'예약',
                 packing:'준비물', links:'링크', candidates:'후보',
                 city_ratings:'도시 별점', plan_ratings:'맛집 별점',
                 trip_reviews:'여행 후기', chats:'AI 대화',
                 profiles:'프로필', user_prefs:'설정' };
  const out = { app:'기로', savedAt:new Date().toISOString(), user:me.id, data:{} };
  const failed = [];
  for (const t of TABLES){
    const r = await sb.from(t).select('*');
    if (r.error){
      failed.push(NAME[t] || t);
      logError(`내려받기 실패 ${t}: ${r.error.code || ''} ${r.error.message || ''}`, 'dump');
      continue;
    }
    out.data[t] = r.data || [];
  }
  /* 도시 목록은 우리가 만든 자료라 안 넣습니다 — 잃어버릴 것은 내가 쓴 것뿐입니다. */

  const n = Object.values(out.data).reduce((s, v) => s + v.length, 0);
  const blob = new Blob([JSON.stringify(out, null, 1)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `aitrip-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(a.href);

  b.disabled = false; b.textContent = '다시 받기';
  /* 총합만 보면 맞는지 알 수가 없습니다. 표마다 몇 개인지 늘어놓습니다 —
     "일정 0" 같은 것이 눈에 띄어야 빈 백업을 붙들고 있지 않습니다. */
  $('dumplist').classList.remove('hide');
  $('dumplist').innerHTML =
    `<div class="daysep">받은 것 · 모두 ${n.toLocaleString()}개</div>` +
    TABLES.map(t => `<div class="row" style="padding:5px 0">
        <span class="label memo">${esc(NAME[t] || t)}</span>
        <span class="val"${(out.data[t]?.length ? '' : ' style="color:var(--ink-48)"')}>${
          out.data[t] == null ? '못 읽었어요' : out.data[t].length.toLocaleString()}</span>
      </div>`).join('');
  toast(`${n.toLocaleString()}개를 저장했어요`);
  if (failed.length)
    fail('일부는 못 받았어요: ' + failed.join(', ') + '. 잠시 뒤 다시 받아주세요.', 'dump');
});

/* 보관함과 숫자를 누르면 평가 탭으로 걸러서 보냅니다. */
$('setview').addEventListener('click', e => {
  /* 국가 타일은 세계지도로. 보관함은 도시가 주인공이라 "어느 나라를 갔나"에
     답을 못 합니다 — 그 답은 지도 화면의 대륙별·국가별에 있습니다. */
  if (e.target.closest('button[data-openmap]')) return openCountries();
  const b = e.target.closest('button[data-shelf]'); if (!b) return;
  /* 다녀온 여행 칸은 없앴습니다. 여행 탭에 이미 있습니다. */
  openShelf(b.dataset.shelf);
});

function openAi(){
  if (trip) setAiTripId(trip.id);
  $('notifpanel').classList.add('hide');
  $('aiview').classList.remove('hide');
  $('sheetbg').classList.remove('hide');
  document.body.classList.add('sheeton');
  if (history.state?.t2 !== 'ai') history.pushState({ t2:'ai' }, '');
  loadAi();
}
function closeAi(fromPop){
  if (!fromPop && history.state?.t2 === 'ai'){ history.back(); return; }
  $('aiview').classList.add('hide');
  /* 다른 시트가 열려 있을 수도 있으니 뒷판은 그쪽 규칙에 맡깁니다. */
  syncSheets();
}
$('aibtn').addEventListener('click', openAi);
$('ai_close').addEventListener('click', () => closeAi());

/* 대화 지우기. 여행 없이 나눈 것은 trip_id 가 비어 있어 is 로 지웁니다. */
$('ai_wipe').addEventListener('click', async e => {
  const b = e.currentTarget;
  if (b.dataset.armed !== '1'){ arm(b, '정말 지울까요?'); return; }
  const id = $('ai_trip').value;
  let q = sb.from('chats').delete().eq('user_id', me.id);
  q = id ? q.eq('trip_id', id) : q.is('trip_id', null);
  const r = await q.select('id');
  disarm(b);
  if (r.error) return fail(r.error, 'ai');
  await loadChats(id);
  /* 대화만 지우고 **제안 카드는 그대로 뒀습니다.** 화면에서 보면 지우기를
     눌렀는데 일정 목록이 안 없어지는 것이라 고장으로 보입니다.
     카드는 그 대화에 딸린 것이니 같이 걷습니다. 출처 줄도 마찬가지입니다. */
  $('cards').innerHTML = '';
  $('aisrc').classList.add('hide');
  /* null 로 두면 안 됩니다 — 다른 곳이 suggested.actions 를 그대로 읽습니다.
     처음 모양(빈 배열 둘)으로 되돌립니다. */
  clearSuggested();
  lastTake = [];
  toast(`${r.data?.length ?? 0}개를 지웠어요`);
});

/* 종을 누르면 그 자리에서 펼쳐집니다. 프로필로 넘어가게 하면
   보던 화면을 잃고 돌아오기도 번거롭습니다. */
$('bell').addEventListener('click', async e => {
  e.stopPropagation();
  const open = $('notifpanel').classList.toggle('hide');
  if (open) return;
  await loadNotifs();
  /* 목록을 열었으면 읽은 것입니다. 종에 붙은 숫자를 지웁니다.
     전에는 "모두 읽음"을 따로 눌러야만 지워져서, 봤는데도 계속 1 이 붙어 있었습니다.
     1.2초 뒤에 처리하는 이유는 **어느 것이 새 것이었는지 보이게** 하려는 것입니다 —
     열자마자 전부 흐려지면 뭐가 새로 온 건지 알 수가 없습니다. */
  clearTimeout(readTimer);
  readTimer = setTimeout(async () => {
    if ($('notifpanel').classList.contains('hide')) return;   /* 벌써 닫았으면 그만 */
    const r = await netTimeout(sb.from('notifications')
      .update({ read_at: new Date().toISOString() }).is('read_at', null).select('id'));
    if (!r.error && r.data?.length) loadNotifs();
  }, 1200);
});
let readTimer = null;
/* 바깥을 누르면 닫힙니다. */
document.addEventListener('click', e => {
  if (!$('notifpanel').classList.contains('hide') &&
      !e.target.closest('#notifpanel')) $('notifpanel').classList.add('hide');
});

async function loadNotifs(){
  /* 알림은 서버에만 있습니다. 오프라인이면 종 숫자도 못 셉니다. */
  if (netIsDown()){
    $('notifs').innerHTML = '<div class="empty">연결이 없어 알림은 지금 볼 수 없어요.</div>';
    $('readall').classList.add('hide');
    return;
  }
  const { data, error } = await sb.from('notifications')
    .select('id,kind,body,created_at,read_at')
    .order('created_at', { ascending:false }).limit(30);
  const unread = (data || []).filter(n => !n.read_at).length;
  $('belldot').textContent = unread > 9 ? '9+' : unread;
  $('belldot').classList.toggle('hide', !unread);

  if (error || !data?.length){
    $('notifs').innerHTML = '<div class="empty">알림이 없어요.</div>';
    $('readall').classList.add('hide');
    return;
  }
  /* 읽은 것만 있으면 "모두 읽음" 대신 "지우기"를 답니다.
     읽어도 목록에 계속 쌓이면 결국 아무도 안 봅니다. */
  $('readall').classList.remove('hide');
  $('readall').textContent = unread ? '모두 읽음' : '지우기';
  $('readall').dataset.act = unread ? 'read' : 'clear';

  $('notifs').innerHTML = data.map(n =>
    `<div class="row"><span class="label"${n.read_at ? ' style="opacity:.55"' : ''}>
       ${esc(n.body)}</span>
     <span class="val">${esc(n.created_at.slice(5,10))}</span></div>`).join('');
}
$('readall').addEventListener('click', async e => {
  e.stopPropagation();
  const b = $('readall');
  if (b.dataset.act === 'clear'){
    /* 읽은 것만 지웁니다. 안 읽은 것이 사이에 있으면 그건 남깁니다. */
    const r = await netTimeout(sb.from('notifications').delete()
      .not('read_at', 'is', null).select('id'));
    if (r.error) return fail(r.error);
    /* 039 를 안 올렸으면 정책이 없어 0건이 지워집니다. 조용히 넘어가면
       버튼이 고장 난 것처럼 보입니다. */
    if (!r.data?.length) return toast('지우지 못했어요. 잠시 뒤 다시 해주세요.');
  } else {
    const r = await netTimeout(sb.from('notifications')
      .update({ read_at: new Date().toISOString() }).is('read_at', null).select('id'));
    if (r.error) return fail(r.error);
  }
  loadNotifs();
});

/* ── 프로필 ───────────────────────────────────────────────────────────
 * 사진·이름·글자 크기는 profile.js 로 옮겼습니다(b340, 열세 번째 조각).
 * ctx 는 하나(me)입니다. `myAvatar` 도 그리로 갔습니다 — 아래 로그인
 * 직후에 채우는 자리는 setMyAvatar 로 넣습니다. */
/* ── 여행 목록의 사진 ────────────────────────────────────────────────
 * 전에는 `t.cities?.image_url` **하나만** 봤습니다. 그건 여행에 직접 붙은
 * 도시(`trips.city_id`)의 사진이라, 우리 목록에 없는 곳으로 만든 여행은
 * ('삼척') 늘 비어서 색 칸에 첫 글자만 떴습니다.
 *
 * 고르는 순서는 `tripPhoto()` 와 **같습니다**(구간 도시 › 나라 대표).
 * 목적지 이름으로 찾는 단계는 뺐습니다 — 이름이 맞으면 애초에 `city_id` 가
 * 붙어 있어서 첫 줄에서 걸립니다.
 *
 * ⚠ **줄마다 부르지 않습니다.** `tripPhoto()` 는 여행 하나에 질의를 최대
 *   3번 합니다. 목록이 열 개면 서른 번입니다. 여기서는 빠진 것만 모아
 *   **두 번**에 끝냅니다(구간 한 번, 나라 대표 한 번).
 *
 * ⚠ 이 사진은 그 사람이 가는 곳이 아닐 수 있습니다 — 삼척 여행에 강릉
 *   사진이 걸립니다. 사진은 분위기고, 어디로 가는지는 **글자**가 말합니다.
 *   `tripPhoto()` 머리말에 같은 이야기를 적어뒀습니다. */
async function fillTripPhotos(rows){
  const need = (rows || []).filter(t => !t.cities?.image_url);
  if (!need.length) return;

  const lg = await netTimeout(sb.from('trip_legs')
    .select('trip_id,country,start_date,cities(image_url)')
    .in('trip_id', need.map(t => t.id)).order('start_date'));

  const byTrip = {}, legCountry = {};
  for (const l of (lg.data || [])){
    if (!byTrip[l.trip_id] && l.cities?.image_url) byTrip[l.trip_id] = l.cities.image_url;
    if (!legCountry[l.trip_id] && l.country)       legCountry[l.trip_id] = l.country;
  }

  /* 구간에서 못 찾은 것만 나라로 갑니다. 나라는 겹치므로 한 번에 묻습니다. */
  const rest = need.filter(t => !byTrip[t.id]);
  const countries = [...new Set(rest.map(t => legCountry[t.id] || t.country).filter(Boolean))];
  const rep = {};
  if (countries.length){
    /* 같은 여행은 열 때마다 같은 사진이어야 합니다 — 다르면 "내 여행"으로
       안 읽힙니다. pop_rank › fame › 이름 순으로 **늘 같은 것**을 고릅니다. */
    const c = await netTimeout(sb.from('cities')
      .select('country,image_url,pop_rank,fame,name')
      .in('country', countries).not('image_url', 'is', null)
      .order('pop_rank', { ascending:true, nullsFirst:false })
      .order('fame',     { ascending:true, nullsFirst:false })
      .order('name',     { ascending:true }));
    for (const row of (c.data || [])) if (!rep[row.country]) rep[row.country] = row.image_url;
  }

  for (const t of need) t._photo = byTrip[t.id] || rep[legCountry[t.id] || t.country] || null;
}

async function loadTrips(){
  /* RLS 가 참여 중인 것만 내려줍니다. 만든 사람이 owner 로 자동 등록되지
     않으면 방금 만든 여행조차 여기 안 나옵니다. */
  const today = todayYmd();
  let q = sb.from('trips')
    .select('id,title,destination,start_date,end_date,currency,timezone,' +
            /* `country` 는 사진 대체에 씁니다(아래 fillTripPhotos). */
    'transit_factor,city_id,country,cities(image_url),' +
            'trip_members(user_id,role),trip_reviews(user_id,stars)');
  /* 날짜가 지나면 저절로 "다녀온"으로 넘어갑니다 — 손으로 옮길 일이 없습니다. */
  if (tripFilter === 'past')
    q = q.lt('end_date', today)
         .order('start_date', { ascending:false });
  else
    q = q.gte('end_date', today)
         .order('start_date', { ascending:true });
  let { data, error } = await netTimeout(q);

  /* 못 받아왔으면 지난번 목록을 씁니다. 여행 목록이 안 나오면 여행 중에
     일정으로 들어갈 길 자체가 없어집니다. */
  const ck = 'trips:' + tripFilter;
  if (error){
    const old = cacheGet(ck);
    if (!old){ dropHtml('trips'); $('trips').innerHTML = '<div class="empty">불러오지 못했어요</div>';
               return fail(error); }
    data = old; error = null; drawOffbar();
  } else {
    await fillTripPhotos(data);
    cacheSet(ck, data);   /* 사진까지 담아둡니다 — 비행기모드에서도 같은 줄이 나옵니다 */
    /* 목록에 있는 여행은 **열어본 적 없어도** 비행기모드에서 열려야 합니다.
       한 줄씩 미리 담아둡니다 — 목록을 받을 때 이미 필요한 값이 다 왔습니다.
       이걸 안 하면 "열어본 적 있는 여행만 열림"이 되는데,
       그건 정작 여행 가서 처음 여는 순간에 안 열린다는 뜻입니다. */
    for (const t of data){
      const k = 'trip:' + t.id;
      if (!cacheGet(k)) cacheSet(k, { ...t, home_currency: t.currency || 'KRW' });
    }
  }

  if (!data.length){
    dropHtml('trips'); $('trips').innerHTML =
      tripFilter === 'past' ? '<div class="empty">아직 다녀온 여행이 없어요.</div>' :
      '<div class="empty">앞으로 갈 여행이 없어요.<br>새 여행을 눌러 만들어보세요.</div>';
    return;
  }
  const tripsHtml = data.map(t => {
    const role = (t.trip_members || []).find(m => m.user_id === me.id)?.role || '';
    const days = Math.round((new Date(t.end_date) - new Date(t.start_date)) / 864e5) + 1;
    const a = `data-id="${esc(t.id)}" data-title="${esc(t.title)}"`;
    /* 소유자만 지웁니다. 일행은 나갈 뿐입니다 — 남의 여행을 지울 수는 없습니다.
       (RLS 도 같은 규칙을 걸어두었으니 버튼을 숨기는 건 안내일 뿐입니다.) */
    /* 보관은 뺐습니다. 날짜가 지나면 저절로 "다녀온"으로 넘어가는데
       거기서 또 손으로 치우게 하면 두 곳에 나뉘어 어디 있는지 헷갈립니다. */
    /* 일정 화면 위에서 사진과 정보를 걷어냈으니 고치는 길이 여기 있어야 합니다. */
    /* 다녀온 여행에는 리포트로 가는 길을 답니다. 전에는 홈의 "평가 안 한 여행" 띠
       하나뿐이라, 평가를 마치고 나면 리포트를 다시 볼 방법이 없었습니다. */
    const report = t.end_date < today
      ? `<button class="ghost" data-act="report" ${a}
                 style="color:var(--primary)">리포트</button>` : '';
    /* **지우기를 상시로 두지 않습니다.** 줄마다 빨간 '삭제'가 손가락 닿는
       자리에 늘 있었습니다. 되돌릴 수 없는 것을 스치기 쉬운 곳에 둘 이유가
       없습니다. ⋯ 뒤로 넣고, 누르면 그 줄에서만 펼칩니다. */
    const more = (role === 'owner'
      ? `<button class="ghost" data-act="edit" ${a}>수정</button>` +
        `<button class="ghost" data-act="delete" ${a} style="color:var(--bad)">삭제</button>`
      : `<button class="ghost" data-act="leave" ${a}>나가기</button>`);
    const acts = report +
      `<button class="ghost" data-act="more" ${a} aria-label="더보기">더보기</button>` +
      `<span class="tmore hide">${more}</span>`;
    /* 글자만 있으면 어느 여행인지 한눈에 안 들어옵니다.
       그 여행의 첫 도시 사진을 왼쪽에 답니다. 없으면 첫 글자만. */
    /* `_photo` 는 fillTripPhotos 가 채웁니다 — 우리 도시 목록에 없는 곳으로
       만든 여행('삼척')이 늘 빈 칸이던 것을 메웁니다. */
    const img = t.cities?.image_url || t._photo;
    /* **사진이 없으면 회색 칸에 '삼' 한 글자만 떠 있었습니다.** 글자 하나가
       제목 왼쪽에 덩그러니 놓이면 제목을 두 번 읽는 것처럼 보입니다.
       홈 히어로가 쓰는 색(heroTint)을 그대로 깔면 같은 여행은 어디서나
       같은 색이라 목록에서도 눈으로 짚입니다. */
    const tint = ` style="background:${heroTint(t.title)}; color:#fff"`;
    return `<div class="trip" data-open="${esc(t.id)}">
      ${img ? `<img class="thumb" src="${esc(img)}" alt="" loading="lazy"
                   onerror="this.replaceWith(Object.assign(document.createElement('span'),
                     {className:'thumb ph', textContent:'${esc(t.title.slice(0,1))}',
                      style:'background:${heroTint(t.title)}; color:#fff'}))">`
            : `<span class="thumb ph"${tint}>${esc(t.title.slice(0,1))}</span>`}
      <div class="t">
      <b>${esc(t.title)}</b>
      <span class="meta">${esc(tripSub(t, days))}</span>
      <div style="margin-top:4px">${acts}</div>
    </div>${
      /* 다녀왔는데 아직 후기를 안 남긴 여행. 여기가 평가로 들어가는 입구입니다. */
      t.end_date < today && !(t.trip_reviews || []).some(r => r.user_id === me.id)
        ? '<span class="badge" style="background:#fdf3e6; color:#f5a623; font-weight:600">' +
          '후기 전</span>'
        /* 'OWNER' 만 영어로 떠 있었습니다. 앱 전체가 한국어입니다. */
        : `<span class="badge">${esc(ROLE_KO[role] || role)}</span>`}</div>`;
  }).join('');
  /* 기록 탭과 **같은 이유**입니다(drawRatings 참고). 탭을 누를 때마다
     `loadTrips` 가 돌고 여기서 목록을 통째로 갈아끼우면, 글자는 티가 안 나도
     **여행 사진이 버려졌다 새로 만들어져** 빈 칸이 보였다 채워집니다.
     한 자도 안 달라졌으면 손대지 않습니다. */
  putHtml('trips', tripsHtml);
}

/* 줄마다 버튼을 달면 목록을 다시 그릴 때마다 이벤트를 다시 붙여야 합니다.
   상자 하나에만 붙이고 눌린 버튼을 찾아 씁니다. */
$('trips').addEventListener('click', async e => {
  const b = e.target.closest('button[data-act]');
  if (!b){
    /* 버튼이 아니면 줄을 누른 것입니다 — 그 여행을 엽니다. */
    const row = e.target.closest('.trip[data-open]');
    if (row) await openTrip(row.dataset.open);
    return;
  }
  const { act, id, title } = b.dataset;

  if (act === 'cancelact') return loadTrips();

  /* ⋯ — 그 줄에서만 펼칩니다. 다른 줄이 열려 있으면 접습니다.
     여러 줄이 동시에 펼쳐져 있으면 어느 여행의 삭제인지 헷갈립니다. */
  if (act === 'more'){
    const wrap = b.nextElementSibling;
    const open = wrap.classList.contains('hide');
    document.querySelectorAll('#trips .tmore').forEach(x => x.classList.add('hide'));
    document.querySelectorAll('#trips [data-act="more"]').forEach(x => x.textContent = '더보기');
    wrap.classList.toggle('hide', !open);
    b.textContent = open ? '닫기' : '더보기';
    return;
  }

  /* 고치기 — 여행을 열고 수정 칸을 바로 펼칩니다. */
  if (act === 'report') return openTripReport(id);
  if (act === 'edit'){ await openTrip(id); $('editbtn').click(); return; }

  /* 되돌릴 수 없는 일은 그 자리에서 한 번 더 묻습니다.
     window.confirm 은 내장 브라우저나 iframe 안에서 조용히 막혀 false 를
     돌려줍니다. 그러면 요청도 안 보내고 아무 말도 없이 끝납니다 —
     실제로 그래서 "삭제가 안 먹는다"가 됐습니다. 화면 안에서 묻습니다. */
  if ((act === 'delete' || act === 'leave') && b.dataset.armed !== '1'){
    const wrap = b.parentElement;
    const msg = act === 'delete'
      ? '일정 · 지출 · 예약 · 준비물 · 사진이 함께 사라져요. 되돌릴 수 없어요.'
      : '목록에서 사라져요. 넣은 지출은 정산을 위해 남아요.';
    wrap.innerHTML =
      `<div style="color:var(--bad); font-size:calc(12px * var(--ts)); margin-bottom:4px">
         ${esc(msg)}</div>
       <button class="ghost" data-act="cancelact">취소</button>
       <button class="ghost" data-act="${esc(act)}" data-armed="1"
               data-id="${esc(id)}" data-title="${esc(title)}"
               style="color:var(--bad); font-weight:600">
         정말 ${act === 'delete' ? '삭제' : '나가기'}</button>`;
    return;
  }

  b.disabled = true;
  $('triperr').classList.add('hide');

  /* .select() 를 붙여 실제로 몇 줄이 바뀌었는지 받습니다.
     RLS 가 막으면 Postgres 는 오류를 내지 않고 0건을 처리합니다.
     이걸 안 세면 "눌러도 아무 일도 안 일어남"이 되고 원인을 알 수 없습니다. */
  let r;
  if (act === 'delete')          r = await sb.from('trips').delete().eq('id', id).select('id');
  else if (act === 'leave')      r = await sb.from('trip_members')
                                      .update({ left_at: new Date().toISOString() })
                                      .eq('trip_id', id).eq('user_id', me.id).select('trip_id');
  b.disabled = false;

  if (r?.error) return fail(r.error, 'trip');
  if (!r?.data?.length){
    /* 여행 id(UUID)와 동작 이름을 화면에 적고 있었습니다. 사용자가 볼 것이
       아니라 고치는 사람이 볼 것이므로 기록으로 보냅니다. */
    logError(`여행 ${act} 0건 — trip=${id}`, 'trip');
    return fail(act === 'leave'
      ? '이 여행에서 나가지 못했어요. 잠시 뒤 다시 해주세요.'
      : '이 여행을 지울 권한이 없어요. 만든 사람만 지울 수 있어요.', 'trip');
  }
  await loadTrips();
});

/* ── 여행 상세 ──────────────────────────────────────────────────── */
/* ymd · todayYmd 는 calc.js 로 내렸습니다(b335, 맨 위 import). 왜 둘인지,
   왜 하나는 UTC 고 하나는 로컬인지는 거기 적어뒀습니다. shelf.js·cards.js 가
   ctx 로 받던 것도 걷었습니다 — 이제 각자 import 합니다. */
/* hm 은 calc.js 로 내렸습니다(b335, 맨 위 import). city.js 도 씁니다. */

/* 문서의 표시 규칙 그대로입니다.
     여행 기간 안  Day 1 · 9월 12일 토요일
     시작 전       9월 5일 · 여행 전
     끝난 뒤       9월 18일 · 여행 후
   Day 번호는 start_date 로 계산합니다. 저장하지 않습니다. */
/* ── 날짜 적는 법 ─────────────────────────────────────────────────────
 * `2026-09-12 ~ 2026-09-15` 는 기계가 쓰는 모양입니다. 사람은 이렇게 안 씁니다.
 * 게다가 화면마다 달랐습니다 — 목록은 `2026-09-12 ~ 2026-09-15`,
 * 여행 안은 `09-12 ~ 09-15`. 같은 정보가 두 모양이면 읽는 사람이 두 번 읽습니다.
 *
 * 여기 하나로 모읍니다.
 *   같은 달        9월 12일 – 15일
 *   달이 다름      9월 28일 – 10월 3일
 *   해가 다르면    2027년 1월 3일 – 6일   (올해면 해를 안 적습니다)
 */

/* dateRange/dayLabel 은 calc.js 로 옮겼습니다 (맨 위 import). */

async function fetchTrip(id){
  const { data, error } = await netTimeout(sb.from('trips')
    .select('*, trip_members(user_id,role)').eq('id', id).maybeSingle());
  /* 여행 한 줄을 못 받으면 그 안으로 아예 못 들어갑니다 — 일정도 지출도 그 뒤입니다.
     캐시는 그 여행을 **한 번 열었을 때** 생깁니다. 비행기모드에서 목록에는 셋이 보이는데
     열어본 적 없는 것을 누르면 "여행을 열지 못했습니다"가 났습니다.
     그래서 목록 캐시에서 최소한을 꺼내 만들어서라도 엽니다 —
     제목·날짜·목적지는 거기 다 있습니다. 빈 화면보다 낫습니다. */
  if (error){
    let old = cacheGet('trip:' + id);
    if (!old){
      const listed = [...(cacheGet('trips:up') || []), ...(cacheGet('trips:past') || [])]
        .find(t => t.id === id);
      if (listed) old = { ...listed, home_currency: listed.currency || 'KRW' };
    }
    if (!old){ fail(error, 'trip'); return false; }
    setTrip(old);
    trip.myRole = (old.trip_members || []).find(m => m.user_id === me.id)?.role || '';
    drawOffbar();
    return true;
  }
  /* 행이 안 오면 내보내졌거나 여행이 지워진 것입니다. RLS 가 그렇게 만듭니다. */
  if (!data) return false;
  cacheSet('trip:' + id, data);
  setTrip(data);
  trip.myRole = (data.trip_members || []).find(m => m.user_id === me.id)?.role || '';
  return true;
}

/* localTime 은 calc.js 로 옮겼습니다 (맨 위 import). */

function drawTripHeader(){
  const days = Math.round((asDate(trip.end_date) - asDate(trip.start_date)) / D1) + 1;
  $('t_title').textContent = trip.title;
  const now = localTime(trip.timezone);
  /* 한 줄로 붙입니다. 지도가 더 잘 보여야 하는 자리라 머리말은 짧을수록 낫습니다.
     연도는 뻔하니 뺍니다 — 목록에서 이미 봤습니다. */
  $('t_meta').textContent = [
    /* 제목과 목적지가 같으면 한 번만 씁니다 — "도쿄 / 도쿄 · 09-12…"는 군더더기입니다. */
    trip.destination === trip.title ? null : trip.destination,
    `${dateRange(trip.start_date, trip.end_date)} · ${days}일`,
    trip.currency, now,
  ].filter(Boolean).join(' · ');
  /* 보기만 가능한 사람에겐 고치는 버튼을 숨깁니다. 막는 것은 RLS 입니다. */
  $('addplanbtn').classList.toggle('hide', trip.myRole === 'viewer');
  $('addexpbtn').classList.toggle('hide', trip.myRole === 'viewer');
  $('editbtn').classList.toggle('hide', trip.myRole === 'viewer');
}

async function openTrip(id){
  if (!await fetchTrip(id))
    return fail(!netIsDown()
      ? '여행을 열지 못했어요.'
      : '연결이 없어서 못 열어요. 한 번이라도 열어본 여행은 비행기모드에서도 열립니다.',
      'trip');
  setPickedDay(null);
  /* 기록을 하나 쌓아야 화면 밀어서 뒤로 가기가 됩니다.
     이미 여행 안이면(다른 여행으로 건너뛴 경우) 또 쌓지 않습니다. */
  if (history.state?.t2 !== 'trip') history.pushState({ t2:'trip' }, '');

  /* 여행은 어느 탭에서든 열립니다 — 홈에서 열면 홈이 아래에 그대로 남아 있었습니다.
     앱 단계 화면은 하나도 빠짐없이 덮습니다. 돌아갈 탭은 appTab 이 기억합니다. */
  ['homeview','listview','rateview','aiview','setview','cityview','draftview','reviewview']
    .forEach(v => $(v).classList.add('hide'));
  clearCityOpen();
  /* 하단바는 그대로 둡니다. 여행은 '여행' 탭 안쪽이므로 거기에 불을 켭니다 —
     지금 앱의 어디에 있는지가 계속 보여야 합니다. */
  document.querySelectorAll('#appbar button').forEach(b =>
    b.classList.toggle('is-on', b.dataset.a === 'trips'));
  /* 상단바에 여행 안 구역을 띄우고 앱 이름을 접습니다 (app.css 의 .tstrip). */
  inTrip(true);
  $('tripview').classList.remove('hide');
  $('plancard').classList.add('hide');
  $('editcard').classList.add('hide');
  $('expcard').classList.add('hide');
  $('invitebox').classList.add('hide');

  drawTripHeader();
  document.body.classList.add('hastab');
  showTab('plans');
  /* 여기가 여행을 여는 체감 속도를 정합니다. 예전에는 왕복 다섯 번을 **차례로**
     기다렸습니다 — 여행 → 구간 → 검토 → 나머지 → 지출·준비물.
     서울 서버라도 휴대폰에서 한 번에 100ms 안팎이라 그대로 쌓입니다.
     서로 필요 없는 것끼리는 같이 보냅니다.

     남겨둔 순서 두 가지는 이유가 있습니다.
       · 구간(legs) 먼저 — 날짜 칩에 도시 이름이 붙고 지출 통화가 여기서 정해집니다.
         나중에 오면 칩을 한 번 그린 뒤 다시 그려야 합니다.
       · 일행 먼저 — 지출과 준비물이 사람 이름을 씁니다.
     대신 일행은 구간을 기다릴 이유가 없어 **같이 출발**시킵니다. */
  const membersP = loadMembers();
  const citiesP  = loadCities();
  await loadLegs();
  await Promise.all([
    loadPlans(), loadBookings(), loadLinks(), citiesP,
    membersP.then(() => Promise.all([loadExpenses(), loadPacking()])),
  ]);
  fillCityList();
  watch();
  /* 일정 검토 배지는 숫자 하나입니다. 이걸 기다리느라 화면 전체가 늦을 이유가
     없습니다. 뒤로 보냅니다 — 늦게 와도 배지만 나중에 켜집니다. */
  loadReview();
}

/* ── 실시간 ─────────────────────────────────────────────────────────
 * 도쿄 앱은 8초마다 getRevision 을 물어보고 다르면 화면을 통째로 덮었습니다.
 * 여기서는 바뀐 표만 듣고 그 부분만 다시 그립니다. REV 는 없앴습니다.
 * 여러 변경이 몰아쳐 올 때 매번 다시 그리면 화면이 떨리므로 잠깐 모았다 한 번 그립니다. */
function watch(){
  unwatch();
  const f = 'trip_id=eq.' + trip.id;
  channel = sb.channel('trip:' + trip.id)
    .on('postgres_changes', { event:'*', schema:'public', table:'plans',        filter:f },
        () => bump('plans'))
    .on('postgres_changes', { event:'*', schema:'public', table:'expenses',     filter:f },
        () => bump('expenses'))
    .on('postgres_changes', { event:'*', schema:'public', table:'bookings',     filter:f },
        () => bump('prep'))
    .on('postgres_changes', { event:'*', schema:'public', table:'packing',      filter:f },
        () => bump('prep'))
    .on('postgres_changes', { event:'*', schema:'public', table:'links',        filter:f },
        () => bump('expenses'))
    .on('postgres_changes', { event:'*', schema:'public', table:'trip_legs',    filter:f },
        () => bump('legs'))
    .on('postgres_changes', { event:'*', schema:'public', table:'trip_members', filter:f },
        () => bump('members'))
    .on('postgres_changes', { event:'*', schema:'public', table:'trips',
                              filter:'id=eq.' + trip.id },
        () => bump('trip'))
    .subscribe(st => {
      $('live').classList.toggle('hide', st !== 'SUBSCRIBED');
    });
}
function unwatch(){
  if (channel){ sb.removeChannel(channel); channel = null; }
  clearTimeout(bumpTimer); bumpPending = null;
  $('live').classList.add('hide');
}
function bump(what){
  (bumpPending ||= new Set()).add(what);
  clearTimeout(bumpTimer);
  bumpTimer = setTimeout(async () => {
    const s = bumpPending; bumpPending = null;
    if (!trip) return;
    if (s.has('trip')){
      /* 여행 자체가 바뀌었습니다. 내가 빠졌거나 지워졌으면 목록으로 돌려보냅니다. */
      if (!await fetchTrip(trip.id)){
        backToList();
        return fail('이 여행에서 나갔거나 여행이 지워졌어요.', 'trip');
      }
      drawTripHeader();
    }
    /* 구간이 바뀌면 날짜 칩의 도시와 지출 통화가 따라 바뀝니다. */
    if (s.has('legs')){ await loadLegs(); await loadReview(); }
    if (s.has('trip')) await loadReview();   /* 날짜가 바뀌면 끝난 여행인지도 바뀝니다 */
    if (s.has('plans') || s.has('trip') || s.has('legs')) await loadPlans();
    /* 일행이 바뀌면 지출에 찍힌 이름과 정산 인원도 따라 바뀝니다. */
    if (s.has('members')) { await loadMembers(); await loadExpenses(); await loadPacking(); }
    else if (s.has('expenses')) await loadExpenses();
    if (s.has('prep'))
      await Promise.all([loadBookings(), loadPacking(), loadLinks()]);
  }, 250);
}

/* ── 구간 ───────────────────────────────────────────────────────────
 * 여행 하나가 여러 도시·나라를 도는 경우입니다.
 * 일정과 지출은 날짜로 저절로 구간에 붙습니다 — 하나하나 고를 필요가 없습니다. */
async function loadLegs(){
  const { data, error } = await netTimeout(sb.from('trip_legs')
    /* 도보 상수 둘을 빼먹어서 "도보 약 NaN분" 이 나왔습니다.
       travel() 이 쓰는 다섯 개를 다 가져와야 합니다. */
    .select('id,city_id,destination,country,start_date,end_date,timezone,currency,' +
            'walk_max_km,walk_min_per_km,walk_base_min,transit_factor,transit_base_min')
    .eq('trip_id', trip.id).order('start_date'));
  /* 구간이 없으면 날짜 칩에 도시가 안 붙고 이동 시간도 못 잽니다. 캐시로 버팁니다. */
  const ck = 'legs:' + trip.id;
  if (error){
    const old = cacheGet(ck);
    if (!old) return fail(error, 'leg');
    setLegs(old); setTransitLines(cacheGet('lines:' + trip.id));
    drawOffbar(); drawDays(); return;
  }
  cacheSet(ck, data || []);
  setLegs(data);
  /* 노선 딱지 색. 그 여행에 나오는 도시 것만 받습니다. */
  const ids = [...new Set(legs.map(l => l.city_id).filter(Boolean))];
  if (ids.length){
    const r = await sb.from('transit_lines').select('name,color,dark_text').in('city_id', ids);
    /* 못 받아오면 지난번 것. 노선 딱지 색이라 없어도 죽지는 않지만,
       위 구간 캐시가 이걸 꺼내 쓰므로 저장은 해둬야 합니다. */
    setTransitLines(r.error ? cacheGet('lines:' + trip.id) : r.data);
    if (!r.error) cacheSet('lines:' + trip.id, transitLines);
  } else setTransitLines([]);
  drawLegs();
}

/* legIn/legFor 는 calc.js 로 옮겼습니다(legAt/legNear — 왜 폴백이 다른지는 거기 적어
   뒀습니다). legs 를 매개변수로 받게 바뀌어서 여기서는 한 줄 래퍼만 둡니다. */
function legIn(date){ return legAt(legs, date); }
function legFor(date){ return legNear(legs, date); }

function drawLegs(){
  /* 구간 날짜가 여행 날짜 밖에 있으면 날짜 칩에 도시가 안 붙습니다.
     **그걸 조용히 넘기면 "왜 Day 1 에 도시가 없지"가 됩니다.**
     실제로 구간이 9월 7~17일, 여행이 9월 29일~10월 9일인 자료가 있었고,
     그때는 11일 전부에 엉뚱한 도시가 붙어 있었습니다. 말해줍니다. */
  const off = legs.filter(l =>
    l.end_date < trip.start_date || l.start_date > trip.end_date);
  const warn = off.length
    ? `<div class="memo" style="color:var(--bad); margin-top:8px">
         ${esc(off.map(l => l.destination).join(' · '))} 구간이 여행 날짜
         (${esc(dateRange(trip.start_date, trip.end_date))}) 밖이에요.
         <button class="ghost" id="legfix"
                 style="color:var(--primary); padding:2px 6px">고치기</button></div>`
    : '';

  /* 헤더에는 둘 이상일 때만 보여줍니다. 하나면 위 줄이 이미 그 도시입니다. */
  $('t_legs').innerHTML = (legs.length > 1
    ? legs.map(l => `<span class="day" style="cursor:default">${esc(l.destination)}
        <span class="n">${esc(dateRange(l.start_date, l.end_date))}</span></span>`).join('')
    : '') + warn;
  if ($('legfix')) $('legfix').onclick = () => $('editbtn').click();

  $('legs').innerHTML = legs.map(l =>
    `<div class="row"><span class="label"><b>${esc(l.destination)}</b>
       <div class="memo">${esc(dateRange(l.start_date, l.end_date))} ·
         ${esc(l.currency)}</div></span>
     ${legs.length > 1
       ? `<button class="ghost" data-lact="del" data-id="${esc(l.id)}"
                  style="color:var(--bad)">×</button>` : ''}</div>`).join('')
    || '<div class="empty">구간이 없어요.</div>';
}

/* 도시 목록은 native datalist 로 답니다. 폼이 여럿이라 직접 만든 검색을
   또 붙이면 코드가 두 벌이 됩니다. 모바일에서도 native 가 더 편합니다. */
function fillCityList(){
  if (!cities) return;
  $('citylist').innerHTML = cities.map(c =>
    `<option value="${esc(c.name)}">${esc(countryName[c.country] || c.country)}</option>`).join('');
  const opts = Object.entries(countryName)
    .sort((a,b) => a[1].localeCompare(b[1], 'ko'))
    .map(([code, nm]) => `<option value="${esc(code)}">${esc(nm)}</option>`).join('');
  $('g_country').innerHTML = opts;
  $('ac_country').innerHTML = opts;    /* 도시를 직접 넣을 때 고르는 나라 */
}

/* 목록에 없는 도시를 치면 나라를 물어봅니다. */
$('g_dest').addEventListener('input', () => {
  const v = $('g_dest').value.trim();
  const hit = cities?.find(c => c.name === v);
  $('g_countrywrap').classList.toggle('hide', !v || !!hit);
});

$('g_add').addEventListener('click', async () => {
  $('legerr').classList.add('hide');
  const v = $('g_dest').value.trim();
  const s = $('g_start').value, e = $('g_end').value;
  if (!v)        return fail('도시를 적어주세요.', 'leg');
  if (!s || !e)  return fail('구간 날짜를 골라주세요.', 'leg');
  if (e < s)     return fail('끝나는 날이 시작보다 빨라요.', 'leg');

  const hit = cities?.find(c => c.name === v);
  const row = { trip_id: trip.id, destination: v, start_date: s, end_date: e };
  if (hit) row.city_id = hit.id;
  else     row.country = $('g_country').value;

  const btn = $('g_add');
  btn.disabled = true; btn.innerHTML = '<span class="load">넣는 중…</span>';
  const { data, error } = await sb.from('trip_legs').insert(row).select('id');
  btn.disabled = false; btn.textContent = '구간 넣기';
  if (error) return fail(error, 'leg');
  if (!data?.length) return fail(NOROW.save, 'leg');

  $('g_dest').value = ''; $('g_countrywrap').classList.add('hide');
  await loadLegs();
  await loadReview();
  await fetchTrip(trip.id); drawTripHeader();   /* 대표값이 바뀌었을 수 있습니다 */
  drawDays(); drawCats(); drawPlans(); drawPlanMap();
});

$('legs').addEventListener('click', async e => {
  const b = e.target.closest('button[data-lact]'); if (!b) return;
  if (b.dataset.armed !== '1'){
    arm(b, '정말 지울까요?'); return;
  }
  b.disabled = true;
  /* 구간은 진짜로 지웁니다. 일정과 지출은 날짜로 붙으므로 같이 사라지지 않습니다. */
  const r = await sb.from('trip_legs').delete().eq('id', b.dataset.id).select('id');
  b.disabled = false;
  if (r.error) return fail(r.error, 'leg');
  if (!r.data?.length) return fail(NOROW.edit, 'leg');
  await loadLegs();
  await loadReview();
  await fetchTrip(trip.id); drawTripHeader();
  drawDays(); drawCats(); drawPlans(); drawPlanMap();
});

/* ── 여행 후기 ────────────────────────────────────────────────────────
 * 후기·후기 사진은 review.js 로 옮겼습니다(b340, 열네 번째 조각).
 * ctx 는 하나(me)입니다. `myReview` 도 그리로 갔습니다 — 쓰는 곳이
 * 거기뿐이었습니다. */
/* ── 여행 정보 수정 ─────────────────────────────────────────────── */
$('editbtn').addEventListener('click', () => {
  $('editcard').classList.toggle('hide');
  $('editerr').classList.add('hide');
  if ($('editcard').classList.contains('hide')) return;
  $('e_title').value = trip.title;
  $('e_start').value = trip.start_date;
  $('e_end').value   = trip.end_date;
  /* 예산은 정산 통화 기준입니다. 어느 돈인지 안 적으면 엔인지 원인지 모릅니다. */
  $('e_budget').value = trip.budget ? Number(trip.budget).toLocaleString('ko-KR') : '';
  $('e_budgetcur').textContent = trip.home_currency ? `· ${trip.home_currency}` : '';
  $('e_shift').checked = true;
  syncShiftText();
  fillCityList();
  /* 새 구간 기본값: 마지막 구간 다음 날부터 여행 끝까지 */
  const last = legs[legs.length - 1];
  $('g_start').value = last ? ymd(new Date(asDate(last.end_date).getTime() + D1))
                            : trip.start_date;
  $('g_end').value = trip.end_date;
});
$('e_cancel').addEventListener('click', () => {
  $('editcard').classList.add('hide'); $('editerr').classList.add('hide');
});

/* 며칠 밀리는지 미리 보여줍니다. 체크만 있고 숫자가 없으면
   무슨 일이 일어날지 모른 채 누르게 됩니다. */
function shiftDays(){
  if (!$('e_start').value) return 0;
  return Math.round((asDate($('e_start').value) - asDate(trip.start_date)) / D1);
}
function syncShiftText(){
  const n = shiftDays();
  $('e_end').min = $('e_start').value || '';
  $('e_shifttext').textContent = n === 0
    ? '일정도 같이 옮기기 (날짜를 바꾸면 켜집니다)'
    : `일정 ${plans.length}개를 ${Math.abs(n)}일 ${n > 0 ? '뒤로' : '앞으로'} 옮기기`;
}
$('e_start').addEventListener('change', () => {
  /* 시작을 옮기면 끝도 같이 끌고 갑니다. 기간을 유지하는 쪽이 흔한 뜻입니다. */
  const n = shiftDays();
  if (n !== 0) $('e_end').value = ymd(new Date(asDate(trip.end_date).getTime() + n * D1));
  syncShiftText();
});
$('e_end').addEventListener('change', syncShiftText);

$('e_save').addEventListener('click', async () => {
  const btn = $('e_save');
  $('editerr').classList.add('hide');
  const title = $('e_title').value.trim();
  const start = $('e_start').value, end = $('e_end').value;

  if (!title)       return fail('제목을 적어주세요.', 'edit');
  if (!start || !end) return fail('날짜를 골라주세요.', 'edit');
  if (end < start)  return fail('끝나는 날이 시작보다 빨라요.', 'edit');
  const days = Math.round((asDate(end) - asDate(start)) / D1) + 1;
  if (days > 365)   return fail(`${days}일은 너무 길어요. 날짜를 다시 봐주세요.`, 'edit');

  /* 1,500,000 처럼 쉼표를 넣는 사람이 많습니다. 지출 칸과 같은 방식으로 걸러냅니다. */
  const braw = $('e_budget').value.replace(/[,\s]/g, '');
  const budget = braw === '' ? null : Number(braw);
  if (budget !== null && (!isFinite(budget) || budget <= 0))
    return fail('예산을 숫자로 적어주세요. 비워두셔도 됩니다.', 'edit');

  const n = shiftDays();
  btn.disabled = true; btn.innerHTML = '<span class="load">저장 중…</span>';

  let up = await sb.from('trips')
    .update({ title, start_date: start, end_date: end, budget }).eq('id', trip.id)
    .select('id');
  /* 034 를 아직 안 올렸으면 budget 칸이 없어서 통째로 실패합니다.
     그때는 예산만 빼고 나머지는 저장되게 합니다. */
  if (up.error && /budget/i.test(up.error.message || '')){
    up = await sb.from('trips')
      .update({ title, start_date: start, end_date: end }).eq('id', trip.id).select('id');
    if (!up.error) toast('예산은 아직 저장되지 않아요. 곧 됩니다.');
  }

  if (!up.error && up.data?.length && n !== 0 && $('e_shift').checked && plans.length){
    /* 한 줄씩 고치면 요청이 여러 번 나가고 중간에 끊기면 반만 옮겨집니다.
       서버 함수 하나로 한 번에 처리합니다. */
    const sh = await sb.rpc('shift_trip_days', { p_trip: trip.id, p_days: n });
    if (sh.error){ btn.disabled = false; btn.textContent = '저장';
                   return fail(sh.error, 'edit'); }
  }

  btn.disabled = false; btn.textContent = '저장';
  if (up.error) return fail(up.error, 'edit');
  if (!up.data?.length)
    return fail(NOROW.edit, 'edit');

  $('editcard').classList.add('hide');
  setPickedDay(null);
  await openTrip(trip.id);
});

/* 여행에 들어갈 때 브라우저 기록을 하나 쌓아 뒀습니다(openTrip).
   그래야 아이폰에서 화면을 밀어 뒤로 가기가 됩니다.
   ← 버튼도 같은 길로 보내야 기록과 화면이 어긋나지 않습니다. */
function backToList(fromPop){
  if (!fromPop && history.state?.t2 === 'trip'){ history.back(); return; }
  clearTrip();
  $('tripview').classList.add('hide'); inTrip(false);
  showApp(appTab === 'set' ? 'trips' : appTab);
}
$('backbtn').addEventListener('click', () => backToList());
/* 뒤로 갈 때는 **위에 얹힌 것부터** 닫습니다. 순서가 곧 화면의 층입니다.
   여기 순서가 뒤집혀 있어서, 여행 안에서 여행 비서를 열고 닫으면 비서가 아니라
   **여행이 닫혔습니다** — trip 검사가 aiview 검사보다 위에 있어서 그 줄까지
   가지도 못했습니다. 시트는 여행 위에 뜨는 것이니 항상 먼저 봅니다. */
window.addEventListener('popstate', () => {
  /* 1) 화면 위에 떠 있는 것 */
  if (!$('aiview').classList.contains('hide')) return closeAi(true);
  /* 2) 통째로 덮는 화면 */
  /* 서류가 제일 위입니다 — 여행 안에서 열리고 그 위를 다 덮습니다. */
  if (!$('docview').classList.contains('hide')) return closeDocs(true);
  if (isCityOpen()) return closeCity(true);
  if (!$('reviewview').classList.contains('hide')) return closeReview(true);
  if (!$('draftview').classList.contains('hide')) return closeDraft(true);
  if (!$('shelfpane').classList.contains('hide')) return closeShelf(true);
  if (!$('personapane').classList.contains('hide')) return closePersona(true);
  if (!$('ctrypane').classList.contains('hide')) return closeCountries(true);
  if (!$('mappane').classList.contains('hide')) return closeMap(true);
  /* 3) 마지막이 여행입니다. 위의 것들이 다 닫힌 뒤에야 여기로 옵니다. */
  if (trip) return backToList(true);
});

async function loadPlans(){
  $('planerr').classList.add('hide');
  const { data, error } = await netTimeout(sb.from('plans')
    .select('id,date,start_time,end_time,category,title,memo,move_note,sort_order,lat,lng')
    .eq('trip_id', trip.id)
    .is('deleted_at', null)                     /* 숨긴 것은 빼고 봅니다 */
    .order('date').order('start_time', { nullsFirst:false }).order('sort_order'));

  /* 못 받아왔을 때 마지막으로 받아둔 것을 씁니다.
     여행 중에 데이터가 끊겼다고 일정이 빈 화면이 되면 안 됩니다.
     대신 오래된 것을 보고 있다고 위에 띄웁니다 (offbar). */
  const ck = 't2:cache:plans:' + trip.id;
  if (error){
    let old = null;
    try { old = JSON.parse(localStorage.getItem(ck) || 'null'); } catch {}
    if (!old){ $('plans').innerHTML = ''; return fail(error, 'plan'); }
    setPlans(old); drawDays(); drawCats(); drawPlans(); drawPlanMap(); drawOffbar();
    return;
  }
  try { localStorage.setItem(ck, JSON.stringify(data)); } catch {}
  setPlans(data);
  drawDays();
  drawCats();
  drawPlans();
  drawPlanMap();
  drawToday();       /* 여행 중이면 맨 위에 오늘 카드 */
}

function shortLabel(d){
  const lab = dayLabel(d, trip);
  const base = lab.startsWith('Day') ? lab.split(' · ')[0]
                                     : lab.split(' · ')[1] + ' ' + d.slice(5).replace('-','/');
  /* 도시를 여럿 도는 여행이면 Day 번호만으로는 어디인지 모릅니다.
     **그 날이 실제로 들어 있는 구간만** 씁니다. 가장 가까운 구간으로
     떨어뜨리면 어느 날이든 도시 이름이 붙는데, 그게 틀린 이름이면
     "Day 1 · 바젤" 같은 것이 나옵니다. 모르면 안 적는 편이 낫습니다. */
  const l = legs.length > 1 ? legIn(d) : null;
  return l ? `${base} · ${l.destination}` : base;
}

function drawDays(){
  /* 여행 기간의 날짜 + 기간 밖에 일정이 있는 날짜를 합칩니다.
     한국에서 미리 산 항공권처럼 기간 밖 일정이 실제로 생깁니다. */
  const set = new Set();
  for (let d = asDate(trip.start_date);
       ymd(d) <= trip.end_date; d = new Date(d.getTime() + D1)) set.add(ymd(d));
  plans.forEach(p => set.add(p.date));
  const list = [...set].sort();

  /* 그냥 '전체'라고만 적혀 있었습니다. 바로 아래 분류 칩도 '전체'로 시작해서
     같은 글자가 두 줄에 나란히 놓였고, 어느 것이 날짜고 어느 것이 분류인지
     알 수가 없었습니다. 라벨을 따로 붙이면 세로가 더 길어지므로
     (칩 줄이 이미 화면을 많이 먹습니다) 칩 자신이 말하게 합니다. */
  const all = `<button class="day${pickedDay === null ? ' on' : ''}" data-day="">모든 날</button>`;

  /* 짧은 여행은 칩이 한눈에 들어와서 낫습니다.
     길어지면 칩이 벽이 됩니다 — 29일짜리는 세 줄을 잡아먹었습니다.
     그때는 고르는 칸 하나로 바꿉니다. */
  /* **분류 칩은 접어둡니다.** 늘 펼쳐 두면 한 줄(36px)을 늘 먹는데,
     실제로 거르는 일은 가끔입니다. 대신 상태를 숨기지는 않습니다 —
     거르는 중이면 칩에 그 분류 이름이 적히고 켜진 채로 남습니다.
     여기에 다는 이유는 날짜 칩 줄이 이미 옆으로 굴러가서 자리가 공짜라서입니다. */
  const used = new Set(plans.map(p => p.category).filter(Boolean));
  const catChip = used.size < 2 ? '' :
    `<button class="day${catFilter || catsOpen ? ' on' : ''}" data-catstoggle="1">` +
    `${catFilter ? esc(catFilter) : '분류'}</button>`;

  if (list.length <= 12){
    $('days').innerHTML = all + list.map(d =>
      `<button class="day${pickedDay === d ? ' on' : ''}" data-day="${esc(d)}">` +
      `${esc(shortLabel(d))}</button>`).join('') + catChip;
  } else {
    $('days').innerHTML = all +
      `<select id="daysel"><option value="">날짜 고르기…</option>` +
      list.map(d => `<option value="${esc(d)}"${pickedDay === d ? ' selected' : ''}>` +
                    `${esc(dayLabel(d, trip))}</option>`).join('') +
      `</select>` + catChip;
  }
  /* 옆으로 굴러가는 줄이라, 고른 날이 화면 밖이면 안 보입니다.
     Day 9 를 골라두고 돌아왔을 때 어디가 켜져 있는지 알 수가 없습니다. */
  const on = $('days').querySelector('.day.on[data-day]');
  if (on) on.scrollIntoView({ block:'nearest', inline:'center' });
}

/* 분류 칩 줄을 폈는지. 거르는 중이면 강제로 펴 둡니다 — 접힌 채로 걸러지면
   왜 목록이 짧은지 알 길이 없습니다. */
let catsOpen = false;
$('days').addEventListener('click', e => {
  if (!e.target.closest('[data-catstoggle]')) return;
  catsOpen = !catsOpen;
  if (!catsOpen && catFilter) setCatFilter('');
  drawDays(); drawCats(); drawPlans(); drawPlanMap();
});

$('days').addEventListener('change', e => {
  if (e.target.id !== 'daysel') return;
  setPickedDay(e.target.value || null);
  drawDays(); drawCats(); drawPlans(); drawPlanMap();
});

/* ── 일정 지도 · 지도 링크 ────────────────────────────────────────────
 * 지도(Leaflet)·메모 쪼개기·지도 링크는 planmap.js 로 옮겼습니다
 * (b338, 열한 번째 조각). **딸린 것이 없어 ctx 가 없습니다.**
 * 여기서는 맨 위에서 넷을 가져다 쓰기만 합니다. */

/* 지도 주소는 **틀려도 화면에서는 멀쩡해 보입니다** — 눌러서 딴 데가 나와야
   압니다. 그래서 눌러보지 않고도 알 수 있게 검사를 답니다. */
/* ── 디자인 규칙 검사 ────────────────────────────────────────────────
 * **같은 뒤집힘을 세 번 만났습니다** — 홈(b268) · 일정/지출(b270) ·
 * 여행 목록(b279). 뿌리는 늘 같습니다: `b` 에 크기를 안 적으면 본문
 * 기본값(17px/700)을 받아 **항목 이름이 카드 제목을 이깁니다.**
 * 눈으로 훑어서는 세 번 다 못 잡았고, 재보고서야 잡았습니다.
 * 그래서 규칙을 코드에 둡니다. 화면을 새로 만들면 콘솔에서 돌리십시오.
 *
 *   카드 제목 17/700 › 구역 머리 15/700 › 항목 15/600 › 설명 13/400
 *
 * 배율(--ts)을 걷어내고 **설계값으로** 잽니다 — 사용자가 '작게'로 보고
 * 있으면 모든 수가 0.9배로 나와서 규칙과 안 맞습니다. */
window.__designCheck = () => {
  const ts = parseFloat(getComputedStyle(document.documentElement)
               .getPropertyValue('--ts')) || 1;
  const out = [], seen = new Set();
  for (const e of document.querySelectorAll('main *, #aiview *')){
    if (!e.offsetParent) continue;
    const box = e.getBoundingClientRect(); if (box.height < 6) continue;
    /* 자기가 직접 글자를 갖고 있는 것만 봅니다. 감싸는 상자는 자식의
       크기를 물려받아 보여서 엉뚱하게 걸립니다. */
    if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const g = getComputedStyle(e);
    const fs = Math.round(parseFloat(g.fontSize) / ts), fw = +g.fontWeight;
    const tag = e.tagName, key = tag + '.' + (e.className || '-');
    const say = (rule, why) => { const k = rule + key; if (seen.has(k)) return;
      seen.add(k); out.push({ 규칙:rule, 자리:key, 값:`${fs}px/${fw}`,
        글자:e.textContent.trim().replace(/\s+/g, ' ').slice(0, 20), 왜:why }); };

    /* 히어로 숫자(D-3)와 카드 제목은 일부러 큽니다 — 빼고 봅니다.
       ⚠ **계단을 벌리면서 눈금도 같이 올렸습니다**(b293). 카드 제목이
         17 › 21, 항목 이름이 15 › 17 이 됐는데, 눈금을 17 에 두면 이제
         **항목 이름이 전부 걸립니다.** 규칙이 화면보다 옛것이면 매번
         걸리는 것을 무시하게 되고, 그러면 진짜가 섞여도 안 보입니다. */
    const big = fs >= 21 && fw >= 700;
    /* `.dd`(D-1 숫자)와 `.ht`(그 아래 여행 이름)는 히어로입니다 — 사진 위에
       크게 얹는 자리라 카드 제목 규격을 안 따릅니다. 빼고 봅니다. */
    const 제목 = /^H[12]$/.test(tag) || e.closest('h1,h2')
                 || e.classList.contains('dd') || e.classList.contains('ht');
    if (big && !제목) say('①제목처럼 큼', tag === 'B'
      ? 'b 에 크기를 안 적어 본문 기본값을 받았습니다 → 17/600'
      : '21/700 은 카드 제목 자리입니다');
    /* 굵기는 셋뿐입니다(400·600·700). 650·750 은 폰트에 없어서 브라우저가
       흉내 내고, 선명해지는 대신 뭉갭니다. 새로 끼어들면 여기서 걸립니다. */
    if (![400, 600, 700].includes(fw)) say('④굵기 셋 밖', `${fw} — 400·600·700 만 씁니다`);
    if (e.classList.contains('memo') && (fs > 13 || fw >= 600))
      say('②설명 규격밖', '설명은 13/400 회색입니다');
    /* ③ 은 **이미 보고 그대로 두기로 한 것입니다** (2026-08-11, 사용자 결정).
       머리줄의 작은 단추 여덟이 31~36px 로 44 에 못 미칩니다. 다 키우면
       머리줄이 통째로 두꺼워져 사진 중심 방향과 어긋나서, 실기기에서 눌러보고
       답답할 때 손보기로 했습니다. **아래 결과가 나와도 할 일이 아닙니다** —
       새로 생긴 것이 있는지 보는 눈금으로만 쓰십시오. */
    if ((tag === 'BUTTON' || tag === 'A') && box.height < 44 && e.textContent.trim())
      say('③손가락 자리(둘 것)', `${Math.round(box.width)}×${Math.round(box.height)} — 44 미만`);
  }
  if (out.length) console.table(out); else console.log('디자인 규칙 위반 없음 ✅');
  return { 위반:out.length, 항목:out };
};

/* ── 추천 검사 ───────────────────────────────────────────────────────
 * 점수식은 **틀려도 화면에서는 그럴듯해 보입니다** — 도시 이름이 나오니까요.
 * 실제로 만들면서 두 번 틀렸고 둘 다 눈으로는 못 잡았습니다:
 *   1) 기저율로 안 나눠서 `도시`(48%에 붙음)가 취향 1등이 됐습니다
 *   2) 싫어한 도시가 5곳뿐인데 그대로 반영해 `미식`이 "내 30% vs 전체 25%"
 *      인데도 음수로 나왔습니다
 * 그래서 **지어낸 사람**으로 돌려봅니다. 실제 자료로만 보면 내 취향 하나만
 * 확인하게 되고, 그건 표본 하나입니다. */
window.__recCheck = () => {
  const T = [];
  const t = (name, ok, detail) => T.push({ 검사:name, 결과: ok ? 'OK' : '틀림', detail });
  /* 태그가 다른 가짜 도시들 */
  const mk = (id, tags, fame = 2) =>
    ({ id, name:id, country:id.slice(0, 2), tags, fame, image_url:'x' });
  const world = [
    mk('a1', ['해변']), mk('a2', ['해변']), mk('a3', ['해변']), mk('a4', ['해변']),
    mk('b1', ['미술']), mk('b2', ['미술']),
    mk('c1', ['도시']), mk('c2', ['도시']), mk('c3', ['도시']), mk('c4', ['도시']),
    mk('d1', ['자연']), mk('d2', ['자연']),
  ];
  /* ① 흔한 태그가 취향으로 둔갑하지 않는가 — 위 1) 을 막는 검사 */
  {
    /* 도시(4곳)와 미술(2곳) 을 똑같이 하나씩 좋아했다. 비율로 보면 미술이 세다. */
    const r = [{ city_id:'c1', stars:5 }, { city_id:'b1', stars:5 }];
    const ts = tasteOf(world, r);
    t('흔한 태그가 취향으로 둔갑하지 않는다', ts['미술'] > ts['도시'],
      `미술 ${ts['미술'].toFixed(3)} vs 도시 ${ts['도시'].toFixed(3)}`);
  }
  /* ② 싫어함이 적을 때 과하게 반영되지 않는가 — 위 2) 를 막는 검사 */
  {
    const many = [...Array(15)].map((_, i) => ({ city_id:'a' + (i % 4 + 1), stars:5 }));
    const one  = [...many, { city_id:'b1', stars:1 }];
    const A = tasteOf(world, many), B = tasteOf(world, one);
    t('싫어함 한 건이 취향을 뒤집지 못한다',
      Math.abs(B['해변'] - A['해변']) < 0.25,
      `해변 ${A['해변'].toFixed(3)} → ${B['해변'].toFixed(3)}`);
  }
  /* ③ 아무것도 안 매긴 사람에게 터지지 않는가 */
  {
    const r = recommend(world, [], {});
    t('별점이 하나도 없어도 안 터진다', Array.isArray(r.main), `${r.main.length}곳`);
  }
  /* ④ 이미 매긴 곳·다녀온 곳이 추천에 안 나오는가 */
  {
    const r = recommend(world, [{ city_id:'a1', stars:5 }], { visited:new Set(['a2']) });
    const ids = [...r.main, ...r.other].map(x => x.city.id);
    t('매긴 곳·다녀온 곳은 빠진다', !ids.includes('a1') && !ids.includes('a2'), ids.join(','));
  }
  /* ⑤ 같은 나라가 두 번 나오지 않는가 */
  {
    const same = [...Array(6)].map((_, i) => mk('kr' + i, ['미술']));
    const r = recommend([...world, ...same], [{ city_id:'b1', stars:5 }], {});
    const cs = [...r.main, ...r.other].map(x => x.city.country);
    t('같은 나라가 두 번 안 나온다', cs.length === new Set(cs).size, cs.join(','));
  }
  /* ⑥ 태그가 없는 도시는 점수를 못 낸다(그대로 두면 0 점으로 섞입니다) */
  t('태그 없는 도시는 점수가 없다', scoreCity({ tags:[] }, {}) === null, '');
  /* ⑦ 이유가 붙는가 — 이유 없는 추천은 무작위와 구별되지 않습니다 */
  {
    const r = recommend(world, [{ city_id:'b1', stars:5 }], {});
    t('왜 나왔는지가 붙는다', r.main.every(x => Array.isArray(x.why)),
      r.main[0] ? r.main[0].why.join('·') : '-');
  }
  const bad = T.filter(x => x.결과 !== 'OK');
  console.table(T);
  bad.forEach(x => console.error('✗ ' + x.검사 + ' — ' + x.detail));
  return { 전체:T.length, 틀림:bad.length };
};

window.__mapCheck = () => {
  const T = [];
  const t = (name, got, want) => T.push({ name, ok: got === want, got, want });
  const S = 'https://www.google.com/maps/search/';

  /* 1. 사용자가 손으로 짚은 주소가 제일 먼저다 — 좌표가 있어도 */
  t('메모의 짧은 주소를 그대로 연다',
    mapLinks({ title:'아카리조명', memo:'https://maps.app.goo.gl/vykxwqgPhrYdhTf16?g_st=ipc' }, '도쿄').see,
    'https://maps.app.goo.gl/vykxwqgPhrYdhTf16?g_st=ipc');
  t('메모의 주소가 좌표를 이긴다',
    mapLinks({ title:'아카리조명', lat:35.6, lng:139.7, memo:'https://maps.app.goo.gl/x' }, '도쿄').see,
    'https://maps.app.goo.gl/x');

  /* 2. 좌표가 있으면 그 자리를 보면서 이름을 찾는다 */
  t('좌표는 @lat,lng 로 자리를 잡는다',
    mapLinks({ title:'콜로세오', lat:41.8902, lng:12.4922 }, '로마').see,
    S + '%EC%BD%9C%EB%A1%9C%EC%84%B8%EC%98%A4/@41.8902,12.4922,17z');
  t('이름이 없으면 좌표에 핀만 찍는다',
    mapLinks({ title:'', lat:41.8902, lng:12.4922 }, '로마').see,
    S + '?api=1&query=41.8902,12.4922');

  /* 3. 둘 다 없으면 이름 + 도시 — 이것이 '엉뚱한 곳'을 막는 마지막 그물 */
  t('좌표도 주소도 없으면 도시를 붙인다',
    mapLinks({ title:'아카리조명' }, '도쿄').see,
    S + '?api=1&query=%EC%95%84%EC%B9%B4%EB%A6%AC%EC%A1%B0%EB%AA%85%20%EB%8F%84%EC%BF%84');

  /* 4. 길찾기는 짧은 주소로 못 간다 — 목적지를 알아야 하므로 좌표/이름으로 */
  t('길찾기는 좌표를 쓴다',
    mapLinks({ title:'콜로세오', lat:41.89, lng:12.49, memo:'https://maps.app.goo.gl/x' }, '로마').go,
    'https://www.google.com/maps/dir/?api=1&travelmode=transit&destination=41.89,12.49');

  /* 5. 지도가 아닌 주소는 안 물어야 한다 — 블로그 링크를 메모에 적는 일이 잦다 */
  t('블로그 주소는 지도로 안 쓴다',
    memoMapUrl('참고 https://blog.naver.com/abc/123'), null);
  t('문장 끝의 마침표는 주소에서 뗀다',
    memoMapUrl('여기다 https://maps.app.goo.gl/abc.'), 'https://maps.app.goo.gl/abc');
  t('구글 지도 긴 주소도 받는다',
    memoMapUrl('https://www.google.com/maps/place/Tokyo/@35.6,139.7,12z'),
    'https://www.google.com/maps/place/Tokyo/@35.6,139.7,12z');
  t('goo.gl 이라도 지도가 아니면 안 쓴다', memoMapUrl('https://goo.gl/abcd'), null);

  const bad = T.filter(x => !x.ok);
  console.table(T.map(x => ({ 검사:x.name, 결과:x.ok ? 'OK' : '틀림' })));
  bad.forEach(x => console.error(`✗ ${x.name}\n  나온 것: ${x.got}\n  나와야: ${x.want}`));
  return { 전체:T.length, 틀림:bad.length };
};

function parseMemo(memo){
  const out = { move:'', cost:'', notes:[] };
  if (!memo) return out;
  for (const part of splitParts(memo)){
    /* 앞에 붙은 이모지와 기호를 걷어냅니다. */
    const s = part.replace(/^[^가-힣A-Za-z0-9([]+/, '').trim();
    if (!s) continue;
    const m = s.match(/^([^:：]{1,16})\s*[:：]\s*([\s\S]+)$/);
    if (m){
      const k = m[1].replace(/\s/g, '');
      if (/이동|가는법/.test(k) && !/비|요금|가격/.test(k)){
        out.move = out.move ? out.move + ' · ' + m[2] : m[2]; continue;
      }
      if (/가격|비용|요금|교통비|입장료|점심|디저트|간식|커피|음료/.test(k)){
        out.cost = out.cost ? out.cost + ' · ' + m[2] : m[2]; continue;
      }
    }
    out.notes.push(s);
  }
  return out;
}
/* 화살표 이모지를 글자로 바꿉니다. 줄 안에서 크기가 들쭉날쭉해 보입니다. */
const nice = s => String(s ?? '').replace(/\s*[➡→⇒]️?\s*/g, ' → ').replace(/\s{2,}/g, ' ').trim();

/* 노선 딱지. 색은 transit_lines 에서 옵니다 — 도쿄 역 안내판과 같은 색입니다. */
function lineChips(text){
  const t = String(text || '');
  let hit = (transitLines || []).filter(L => t.includes(L.name));
  /* "세이부 신주쿠선"이 걸리면 "신주쿠선"은 버립니다 — 같은 노선을 두 번 세는 것입니다. */
  hit = hit.filter(L => !hit.some(O => O !== L && O.name.includes(L.name)));
  return hit.slice(0, 3).map(L =>
    `<span class="ln" style="background:${esc(L.color)}${
      L.dark_text ? '; color:#1c1c1e' : ''}">${esc(L.name)}</span>`).join('');
}

/* 분류 칩. 실제로 쓰인 분류만 내놓습니다 — 없는 칸을 눌러 빈 목록을 보게 할
   이유가 없습니다. */
function drawCats(){
  const used = [...new Set(plans.map(p => p.category).filter(Boolean))];
  /* 날짜 칩 줄 끝의 '분류'로 폅니다. 거르는 중이면 접히지 않습니다. */
  $('cats').classList.toggle('hide', used.length < 2 || !(catsOpen || catFilter));
  /* 일정 카드는 분류마다 색점(kdot)이 찍히는데, 이 칩은 전부 같은 회색이라
     "관광 색이 뭐였지"를 다시 찾아야 했습니다. 카드에서 본 색이 칩에도
     그대로 있으면 눈으로 바로 짝지어집니다 — 카드와 같은 --kc 변수를 씁니다. */
  /* 위 날짜 칩과 마찬가지로 '전체' 대신 무엇의 전체인지 적습니다. */
  $('cats').innerHTML = [['모든 분류', ''], ...used.map(k => [k, k])].map(([label, v]) => {
    const dot = v ? `<i class="k-${esc(v)}"></i>` : '';
    return `<span class="day${catFilter === v ? ' on' : ''}" data-cat="${esc(v)}">${dot}${
      esc(label)}</span>`;
  }).join('');
}
$('cats').addEventListener('click', e => {
  const b = e.target.closest('[data-cat]'); if (!b) return;
  setCatFilter(b.dataset.cat);
  /* 날짜 줄 끝의 칩이 지금 거르는 분류를 적으므로 그쪽도 다시 그립니다.
     안 그리면 '식사'만 보는 중인데 칩에는 '분류'라고 적혀 있습니다. */
  drawDays(); drawCats(); drawPlans(); drawPlanMap();
});

/* 그날 몇 곳을 다니고 이동에 얼마나 쓰는지. 좌표가 있는 구간만 셉니다. */
function dayStat(date){
  const list = plans.filter(p => p.date === date);
  let min = 0, km = 0;
  for (let i = 0; i < list.length - 1; i++){
    const h = hop(list[i], list[i+1], legs);
    if (h){ min += h.min; km += h.km; }
  }
  /* fmtM 은 시:분 표기라 걸리는 시간에는 안 맞습니다. "2시간 10분"으로 적습니다. */
  const dur = m => m >= 60 ? `${Math.floor(m/60)}시간${m % 60 ? ' ' + (m%60) + '분' : ''}`
                           : `${m}분`;
  return [ `${list.length}곳`,
           min ? `이동 ${dur(min)}` : null,
           km  ? `${km.toFixed(1)}km` : null ].filter(Boolean).join(' · ');
}

/* ── 끌어서 순서 바꾸기 ─────────────────────────────────────────────
 * **목록은 `date · start_time · sort_order` 로 줄을 세웁니다**(loadPlans).
 * 그래서 `sort_order` 만 바꾸면 시각이 있는 줄은 **놓자마자 제자리로
 * 돌아갑니다.** 순서를 손으로 바꾸려면 시각을 같이 다뤄야 합니다.
 *
 * 규칙은 하나입니다 — **시각은 그 자리에 그대로 있고 일정만 자리를 옮깁니다.**
 * 하루의 시각들을 자리표로 보고, 새 순서에 앞에서부터 다시 나눠 줍니다.
 *   09:00 A · 12:00 B · 15:00 C   에서 A 를 맨 뒤로 끌면
 *   09:00 B · 12:00 C · 15:00 A
 * 하루의 뼈대(언제 움직이는가)가 안 흔들리고, 도로 끌면 그대로 되돌아옵니다.
 * 시각이 없는 줄은 없는 채로 남고 `sort_order` 만 따라갑니다.
 *
 * **분류로 거르는 중에는 손잡이를 안 답니다.** 걸러진 목록에서 끌면
 * 화면에 없는 줄의 시각까지 섞여 돌아갑니다 — 보이지 않는 것이 바뀝니다. */
const canReorder = () =>
  trip?.myRole !== 'viewer' && !catFilter && featOn('reorder') && !flags.readonly;

let dragOn = null;      /* {el, hole, id, date, dy, ids} */

function evRows(date){
  return [...$('plans').querySelectorAll(`.ev[data-d="${CSS.escape(date)}"]`)];
}

$('plans').addEventListener('pointerdown', e => {
  const grip = e.target.closest('[data-grip]');
  if (!grip || dragOn) return;
  const el = grip.closest('.ev');
  const r  = el.getBoundingClientRect();

  e.preventDefault();
  /* 손가락을 붙잡아 둡니다. 안 그러면 목록 밖(지도 위 등)으로 나가는 순간
     움직임이 끊깁니다. **못 붙잡아도 그냥 갑니다** — 붙잡기는 나아지자고
     하는 것이지 없으면 못 하는 일이 아닙니다. */
  try { grip.setPointerCapture(e.pointerId); } catch {}
  document.body.classList.add('reordering');

  /* 빈 칸은 **같은 높이**로 만들어 둡니다. 안 그러면 들어올리는 순간
     목록이 위로 솟아서 손가락 밑이 딴 곳이 됩니다. */
  el.style.width  = r.width + 'px';
  el.style.height = r.height + 'px';
  const hole = el.cloneNode(true);
  hole.classList.add('hole');
  hole.removeAttribute('data-ev');
  el.after(hole);

  el.classList.add('lift');
  el.style.left = r.left + 'px';
  el.style.top  = r.top + 'px';

  dragOn = { el, hole, grip, id: el.dataset.ev, date: el.dataset.d,
             dy: e.clientY - r.top, top: r.top };
}, false);

$('plans').addEventListener('pointermove', e => {
  if (!dragOn) return;
  e.preventDefault();
  const y = e.clientY - dragOn.dy;
  dragOn.el.style.top = y + 'px';

  /* 화면 끝에 닿으면 목록을 굴려 줍니다. 안 그러면 하루가 길 때
     화면 밖으로는 아예 못 옮깁니다. */
  const edge = 90;
  if (e.clientY < edge)                 scrollBy(0, -12);
  else if (e.clientY > innerHeight - edge) scrollBy(0, 12);

  /* **같은 날 안에서만 옮깁니다.** 날을 옮기는 것은 수정 폼의 날짜 칸이
     할 일입니다 — 끌어서 넘기면 어느 날에 놓였는지 확인할 자리가 없습니다. */
  const mid  = y + dragOn.el.offsetHeight / 2;
  const rows = evRows(dragOn.date).filter(r => r !== dragOn.el && r !== dragOn.hole);
  if (!rows.length) return;

  /* **줄과 줄 사이에는 빈 자리가 있습니다** — 날짜 머리글, 이동 시간 줄.
     거기에 놓으면 걸리는 줄이 없어서 아무 일도 안 일어났습니다.
     실제로 끌어보고 알았습니다: 아래로는 되는데 **위로는 안 갔습니다**.
     첫 줄 위는 날짜 머리글 자리라 그 위에 놓을 방법이 아예 없었습니다.
     그래서 위아래 끝은 따로 봅니다. */
  const first = rows[0].getBoundingClientRect();
  const last  = rows[rows.length - 1].getBoundingClientRect();
  if (mid < first.top + first.height / 2) return void rows[0].before(dragOn.hole);
  if (mid > last.top + last.height / 2)   return void rows[rows.length - 1].after(dragOn.hole);

  for (const row of rows){
    const rr = row.getBoundingClientRect();
    if (mid > rr.top && mid < rr.bottom){
      row[mid > rr.top + rr.height / 2 ? 'after' : 'before'](dragOn.hole);
      break;
    }
  }
}, false);

async function dropOrder(){
  const d = dragOn; if (!d) return;
  dragOn = null;
  document.body.classList.remove('reordering');
  d.el.classList.remove('lift');
  d.el.removeAttribute('style');
  d.hole.replaceWith(d.el);

  /* 화면에 보이는 새 순서 그대로 읽습니다. */
  const ids = evRows(d.date).map(x => x.dataset.ev);
  const day = plans.filter(p => p.date === d.date);
  if (ids.length !== day.length) return drawPlans();   /* 어긋나면 다시 그립니다 */

  const slots = day.map(p => ({ s:p.start_time, e:p.end_time }));
  const next  = ids.map(id => day.find(p => p.id === id));
  if (next.some(p => !p)) return drawPlans();

  /* 바뀐 것만 씁니다. 안 바뀐 줄까지 쓰면 실시간이 남에게 열 번 튑니다. */
  const jobs = [];
  next.forEach((p, i) => {
    const s = slots[i].s, e = slots[i].e;
    if (p.start_time === s && p.end_time === e && +p.sort_order === i) return;
    p.start_time = s; p.end_time = e; p.sort_order = i;
    jobs.push({ table:'plans', action:'update', id:p.id,
                row:{ start_time:s, end_time:e, sort_order:i } });
  });
  if (!jobs.length) return;

  /* 먼저 화면부터 맞춥니다 — 저장을 기다리는 동안 손을 뗀 자리에 그대로
     있어야 옮겨진 것으로 보입니다. */
  setPlans([...plans].sort((a, b) =>
    a.date.localeCompare(b.date)
    || (a.start_time || '99:99').localeCompare(b.start_time || '99:99')
    || (+a.sort_order) - (+b.sort_order)));
  drawPlans(); drawPlanMap();

  for (const j of jobs){
    const r = await write(j);
    if (!r.ok){ await loadPlans(); return fail(r.why, 'plan'); }
  }
}
$('plans').addEventListener('pointerup', dropOrder, false);
$('plans').addEventListener('pointercancel', dropOrder, false);

function drawPlans(){
  let show = pickedDay ? plans.filter(p => p.date === pickedDay) : plans;
  if (catFilter) show = show.filter(p => p.category === catFilter);
  if (!show.length){
    $('plans').innerHTML = pickedDay
      ? '<div class="empty">이 날은 비어 있어요.</div>'
      : emptyDo('아직 일정이 없어요.', '첫 일정 넣기', 'addplanbtn');
    return;
  }
  let html = '', last = null, prev = null;
  for (const p of show){
    /* 앞 일정과 이 일정 사이에 얼마나 걸리는지. 좌표가 둘 다 있어야 잽니다.
       시간이 모자라면 빨갛게 — 이게 "이 하루가 물리적으로 가능한가"입니다. */
    if (prev && prev.date === p.date){
      const h = hop(prev, p, legs);
      if (h){
        let warn = '';
        if (prev.start_time && p.start_time){
          const end = prev.end_time ? mins(prev.end_time)
                    : mins(prev.start_time) + (STAY_MIN[prev.category] ?? 30);
          const gap = mins(p.start_time) - end;
          /* 음수면 "-20분밖에 없어요"가 됩니다. 앞 일정이 이미 넘겼다는 뜻입니다. */
          if (gap < h.min)
            warn = gap < 0 ? ' · 앞 일정이 이미 넘겼어요' : ` · ${gap}분밖에 없어요`;
        }
        html += `<div class="hopline${warn ? ' bad' : ''}">
          ${h.walk ? '도보' : '이동'} 약 ${h.min}분 · ${h.km.toFixed(1)}km${esc(warn)}</div>`;
      }
    }
    prev = p;

    if (p.date !== last){                       /* 전체 보기에서 날짜가 바뀌면 머리글 */
      if (!pickedDay){
        const l = legs.length > 1 ? legFor(p.date) : null;
        /* 날짜 옆에 그날 요약을 답니다 — 어느 날이 빡빡한지 여기서 바로 보입니다. */
        html += `<div class="daysep">${esc(dayLabel(p.date, trip))}` +
                `${l ? ' · ' + esc(l.destination) : ''}` +
                `<span class="dstat">${esc(dayStat(p.date))}</span></div>`;
      }
      last = p.date;
    }
    const when = p.start_time ? hm(p.start_time) + (p.end_time ? `<br>~${hm(p.end_time)}` : '')
                              : '<span style="opacity:.45">–</span>';
    /* 분류는 색으로 먼저 읽히게 합니다 — 메모를 안 읽어도 눈으로 찾게 됩니다. */
    const k = p.category ? 'k-' + p.category : '';
    const mm = parseMemo([p.memo, p.move_note].filter(Boolean).join(' / '));
    /* 그 자리에서 실제로 쓴 돈. **예상(메모의 cost)과 갈라 적습니다** —
       "예상 3,000엔"과 "쓴 돈 3,400엔"은 다른 이야기고, 여행 중에 궁금한
       것은 뒤쪽입니다. 환산값이 없는 줄(환율을 못 받은 날)은 빼고 셉니다.
       한 푼도 안 쓴 일정에는 아무것도 안 답니다 — ₩0 이 줄마다 붙으면
       실제로 쓴 줄이 안 보입니다. */
    const spent = (expenses || [])
      .filter(x => x.plan_id === p.id && x.amount_home != null)
      .reduce((s, x) => s + Number(x.amount_home), 0);
    /* 부제에는 분류와 값만. 자세한 것은 펼쳐야 나옵니다. */
    const sub = [p.category, mm.cost ? mm.cost.split(/[·,]/)[0].trim() : null,
                 spent ? money(spent, trip.home_currency) : null]
                  .filter(Boolean).join(' · ');
    /* 이름만으로는 어느 나라인지 모릅니다. 그날 구간의 도시를 같이 넘깁니다
       (구간이 하나뿐이면 여행의 대표 도시). */
    const ml = mapLinks(p, legFor(p.date)?.destination || trip?.destination);
    const open = openPlans.has(p.id);

    html += `<div class="ev${open ? ' is-open' : ''}" data-ev="${esc(p.id)}"
                  data-d="${esc(p.date)}">
      <div class="ev__row">
        <div class="when">${when}</div>
        <span class="kdot ${esc(k)}"></span>
        <div class="body"><b>${esc(p.title)}</b>
          <span class="memo">${esc(sub)}${
            /* 노선은 이동 메모에 적혀 있습니다. 제목에도 있을 수 있어 같이 봅니다. */
            ''}${lineChips((mm.move || '') + ' ' + (p.title || ''))}</span></div>
        <span class="ev__chev">›</span>${canReorder() ? `
        <span class="grip" data-grip aria-label="끌어서 순서 바꾸기">≡</span>` : ''}
      </div>
      <div class="detail">
        ${mm.move ? `<div class="drow"><b>이동</b> ${esc(nice(mm.move))}</div>` : ''}
        ${mm.cost ? `<div class="drow"><b>예상</b> ${esc(nice(mm.cost))}</div>` : ''}
        ${mm.notes.map(n => `<div class="dnote">${esc(nice(n))}</div>`).join('')}
        <div class="dacts">
          <a href="${esc(ml.see)}" target="_blank" rel="noopener">지도에서 보기</a>
          <a href="${esc(ml.go)}" target="_blank" rel="noopener">길찾기</a>
          ${trip.myRole === 'viewer' ? '' :
            `<button class="ghost" data-pact="edit" data-id="${esc(p.id)}">수정</button>
             <button class="ghost" data-pact="del" data-id="${esc(p.id)}"
                     style="color:var(--bad); margin-left:auto">삭제</button>`}
        </div>
      </div>
    </div>`;
  }
  $('plans').innerHTML = html;
}

/* ── 분류 짐작 ──────────────────────────────────────────────────────
 * "라멘"이라고 적었으면 분류는 식사입니다. 매번 고르게 할 이유가 없습니다.
 * 다만 **짐작일 뿐이라 사용자가 고른 것을 덮지 않습니다.**
 * 한 번이라도 직접 골랐으면 그때부터는 손대지 않습니다 —
 * 자동으로 바꿔버리면 고쳐도 고쳐도 되돌아가는 것처럼 느껴집니다. */
const CAT_HINTS = [
  ['카페', /커피|카페|디저트|라떼|아메리카노|빵집|베이커리|케이크|아이스크림|젤라또|스타벅스|블루보틀/],
  ['식사', /라멘|스시|초밥|식당|맛집|점심|저녁|아침|브런치|디너|런치|장어|야키니쿠|야키토리|규카츠|카레|덮밥|정식|코스|오마카세|이자카야|국수|파스타|피자|버거|타코|쌀국수|딤섬|훠궈|바비큐|스테이크|해산물|시장|포차|술집|바\b/],
  ['숙소', /호텔|숙소|체크인|체크아웃|료칸|게스트하우스|에어비앤비|민박|리조트|숙박/],
  ['이동', /공항|기차|신칸센|버스|지하철|전철|페리|렌터카|택시|이동|환승|입국|출국|탑승|고속철|KTX|열차/i],
  ['쇼핑', /쇼핑|백화점|아울렛|면세|마트|드럭스토어|기념품|상점가|편집샵|서점/],
  ['관광', /신사|절|사원|성\b|박물관|미술관|공원|전망대|타워|궁|유적|해변|해수욕장|산\b|호수|폭포|온천|테마파크|동물원|수족관|야경|다리|광장|성당|모스크/],
];
function guessCat(text){
  const t = String(text || '');
  for (const [cat, re] of CAT_HINTS) if (re.test(t)) return cat;
  return '';
}

/* ── 일정 불러오기 ──────────────────────────────────────────────────
 * 이미 짜둔 일정을 손으로 옮겨 적는 것이 제일 귀찮은 일입니다.
 * 사진·파일·붙여넣은 글 아무 것으로나 받아서 AI 가 읽고 카드로 만듭니다.
 *
 * **바로 저장하지 않습니다.** AI 가 잘못 읽을 수 있고, 남의 일정이 통째로
 * 들어가면 되돌리기가 번거롭습니다. 카드로 보여주고 담는 것은 사용자가 합니다
 * (담기·되돌리기는 AI 시트에 이미 있는 것을 그대로 씁니다).
 *
 * 엑셀(.xlsx)은 그대로 못 읽습니다. 압축된 XML 덩어리라 읽으려면 400KB 짜리
 * 라이브러리를 붙여야 하는데, 표를 복사해서 붙여넣으면 탭으로 나뉜 글이 그대로
 * 들어옵니다. 그게 더 빠르고 가볍습니다. */
let impShots = [], impFiles = [];

/* 엑셀은 압축된 XML 덩어리라 그냥은 못 읽습니다. 읽으려면 도구가 필요한데,
   그걸 늘 받아두면 앱이 1MB 가까이 무거워집니다. 엑셀을 고른 순간에만 받습니다.
   한 번 받으면 서비스워커가 담아둬서 다음부터는 비행기모드에서도 됩니다. */
let xlsxLib = null;
async function loadXlsx(){
  if (xlsxLib) return xlsxLib;
  await new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    s.onload = ok;
    s.onerror = () => no(new Error('엑셀 읽는 도구를 못 받았어요. 연결을 확인해주세요.'));
    document.head.appendChild(s);
  });
  xlsxLib = window.XLSX;
  if (!xlsxLib) throw new Error('엑셀 읽는 도구를 못 받았어요.');
  return xlsxLib;
}

/* 엑셀을 글자로 바꿉니다. 시트가 여럿이면 시트 이름을 붙여 이어 씁니다 —
   "숙소" 시트와 "일정" 시트가 나뉘어 있는 파일이 흔합니다. */
async function xlsxToText(file){
  const X = await loadXlsx();
  const wb = X.read(await file.arrayBuffer(), { type:'array' });
  return wb.SheetNames.map(name =>
    `[${name}]\n` + X.utils.sheet_to_csv(wb.Sheets[name])).join('\n\n').slice(0, 8000);
}

$('impbtn').addEventListener('click', () => {
  $('importcard').classList.toggle('hide');
  $('imperr').classList.add('hide');
  if ($('importcard').classList.contains('hide')) return;
  impShots = []; impFiles = [];
  $('imp_text').value = '';
  drawImpPicked();
});
$('imp_cancel').addEventListener('click', () => $('importcard').classList.add('hide'));
$('imp_pick').addEventListener('click', () => $('imp_file').click());

function drawImpPicked(){
  $('imp_shots').classList.toggle('hide', !impShots.length);
  $('imp_shots').innerHTML = impShots.map((s, i) =>
    `<span class="shot1"><img src="${s.url}" alt="">
       <button class="x" data-impx="${i}" aria-label="빼기">×</button></span>`).join('');
  $('imp_files').classList.toggle('hide', !impFiles.length);
  $('imp_files').textContent = impFiles.length
    ? '파일 ' + impFiles.map(f => f.name).join(' · ') : '';
}
$('imp_shots').addEventListener('click', e => {
  const b = e.target.closest('[data-impx]'); if (!b) return;
  impShots.splice(+b.dataset.impx, 1); drawImpPicked();
});

$('imp_file').addEventListener('change', async e => {
  const files = [...(e.target.files || [])];
  e.target.value = '';
  $('imperr').classList.add('hide');
  for (const f of files){
    if (f.type.startsWith('image/')){
      if (impShots.length >= SHOT_MAX){ toast(`사진은 ${SHOT_MAX}장까지예요.`); continue; }
      try { impShots.push(await fitJpeg(f)); } catch (err){ fail(err, 'imp'); }
      continue;
    }
    if (/\.xlsx?$/i.test(f.name)){
      toast('엑셀을 읽는 중…');
      try { impFiles.push({ name: f.name, text: await xlsxToText(f) }); }
      catch (err){ fail(err, 'imp'); }
      continue;
    }
    if (/\.pdf$/i.test(f.name)){
      fail('PDF 는 아직 못 읽어요. 화면을 캡처해서 사진으로 올려주세요.', 'imp');
      continue;
    }
    /* 나머지는 글자 파일로 봅니다. CSV·TSV·메모장이 여기 들어옵니다. */
    try {
      const text = await f.text();
      impFiles.push({ name: f.name, text: text.slice(0, 8000) });
    } catch { fail(`${f.name} 을 읽지 못했어요.`, 'imp'); }
  }
  drawImpPicked();
});

$('imp_go').addEventListener('click', async () => {
  const b = $('imp_go');
  $('imperr').classList.add('hide');
  const typed = $('imp_text').value.trim();
  const fileText = impFiles.map(f => `[${f.name}]\n${f.text}`).join('\n\n');
  const text = [typed, fileText].filter(Boolean).join('\n\n');
  if (!text && !impShots.length)
    return fail('사진이나 파일을 고르거나, 일정을 붙여넣어주세요.', 'imp');

  /* 20~30초가 걸리는 일입니다. "읽는 중…" 하나만 두면 멈춘 줄 알고 다시 누릅니다.
     지금 무엇을 하고 있는지 단계로 바꿔 보여줍니다. 진짜 진행률은 알 수 없지만
     **글자가 바뀌는 것만으로도 살아 있다는 신호가 됩니다.** */
  /* 문구에 '블로그'를 박아두면 구글 지도 링크를 넣었을 때 틀린 말이 됩니다.
     읽는 대상이 무엇이든 맞는 말로 둡니다. */
  const hasLink = /https?:\/\//.test(text);
  const steps = [
    [0,     hasLink ? '링크를 여는 중…' : '읽는 중…'],
    [4000,  hasLink ? '링크 안을 읽는 중…' : '내용을 살펴보는 중…'],
    [9000,  '날짜와 장소를 골라내는 중…'],
    [16000, '거의 다 됐어요…'],
    [26000, '조금만 더요. 글이 길면 오래 걸려요…'],
  ];
  const timers = steps.map(([ms, msg]) => setTimeout(
    () => { b.innerHTML = `<span class="load">${esc(msg)}</span>`; }, ms));

  b.disabled = true; b.innerHTML = `<span class="load">${esc(steps[0][1])}</span>`;
  const { data, error } = await sb.functions.invoke('chat', {
    body: { trip_id: trip.id, mode: 'import', message: text.slice(0, 8000),
            images: impShots.map(s => ({ mime: s.mime, data: s.data })) },
  });
  timers.forEach(clearTimeout);
  b.disabled = false; b.textContent = '읽어오기';

  /* 링크를 줬는데 못 읽었으면 그 사실을 말해줍니다. 조용히 넘어가면
     "링크를 왜 무시하지?"만 알고 이유를 모릅니다. */
  const bad = (data?.blogs || []).filter(x => !x.ok);
  if (bad.length)
    toast(bad.length === 1 ? '링크 1개는 못 읽었어요 (로그인이 필요하거나 막힌 글)'
                           : `링크 ${bad.length}개는 못 읽었어요`);

  if (error || data?.error){
    let why = data?.error || error?.message || '';
    try { why = (await error?.context?.json())?.error || why; } catch {}
    return fail(why, 'imp');
  }
  /* **후보(places)만 나올 수 있습니다.** 구글 지도 링크처럼 날짜가 없는 것은
     일정이 아니라 후보로 옵니다. actions 만 세면 멀쩡히 읽어놓고
     "일정을 못 찾았어요"로 튕깁니다. */
  const got = (data.actions?.length || 0) + (data.places?.length || 0);
  if (!got)
    return fail(bad.length
      ? '링크를 못 읽었어요. 로그인이 필요한 글이거나 막아둔 블로그일 수 있어요. ' +
        '글을 복사해서 아래 칸에 붙여넣으면 그대로 읽어드려요.'
      : '일정을 못 찾았어요. 사진이 흐리거나 형식이 낯설 수 있어요.', 'imp');

  /* 결과는 AI 시트에서 봅니다. 담기·되돌리기가 거기 이미 있습니다 —
     여기서 또 만들면 두 벌이 되고 언젠가 한쪽만 고칩니다. */
  $('importcard').classList.add('hide');
  syncSheets();
  openAi();
  $('ai_trip').value = trip.id;
  await loadChats(trip.id);
  drawSources(data.sources, data.web);
  drawCards(data);
  toast(`${got}개를 읽었어요. 확인하고 담아주세요.`);
});

/* ── 날씨 ───────────────────────────────────────────────────────────
 * open-meteo 는 키가 없어도 됩니다. 키를 받아 어딘가에 두는 순간
 * 그 키가 새는 걱정이 하나 늘어납니다.
 * 30분 담아둡니다 — 날씨는 그 사이에 안 바뀌고, 탭을 옮길 때마다 부르면 낭비입니다.
 * 못 받아오면 조용히 없는 대로 갑니다. 날씨 때문에 오늘 화면이 안 뜨면 안 됩니다. */
const WMO = [
  [[0], '맑음', '☀'], [[1,2], '구름 조금', '🌤'], [[3], '흐림', '☁'],
  [[45,48], '안개', '🌫'], [[51,53,55,56,57], '이슬비', '🌦'],
  [[61,63,65,66,67], '비', '🌧'], [[71,73,75,77], '눈', '🌨'],
  [[80,81,82], '소나기', '🌦'], [[85,86], '눈 소나기', '🌨'],
  [[95,96,99], '뇌우', '⛈'],
];
async function getWeather(lat, lng){
  if (lat == null || lng == null) return null;
  const key = `t2:wx:${lat.toFixed(2)},${lng.toFixed(2)}`;
  try {
    const old = JSON.parse(localStorage.getItem(key) || 'null');
    if (old && Date.now() - old.at < 1800_000) return old.v;
  } catch {}
  try {
    const r = await fetch('https://api.open-meteo.com/v1/forecast' +
      `?latitude=${lat}&longitude=${lng}&current_weather=true`);
    if (!r.ok) return null;
    const w = (await r.json())?.current_weather;
    if (!w) return null;
    const hit = WMO.find(([codes]) => codes.includes(w.weathercode));
    const v = { c: Math.round(w.temperature), t: hit?.[1] || '', i: hit?.[2] || '' };
    try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), v })); } catch {}
    return v;
  } catch { return null; }
}

/* ── 오늘 화면 ──────────────────────────────────────────────────────
 * 여행 중에 앱을 여는 이유는 사실상 하나입니다: 지금 뭘 할 시간인가.
 * 그런데 지금까지는 전체 일정에서 오늘을 눈으로 찾아야 했습니다.
 *
 * 여행 기간 안일 때만 나옵니다. 여행 전이나 다녀온 뒤에는 쓸모가 없고,
 * 안 지우면 "오늘 일정 없음"이 계속 붙어 있어 자리만 먹습니다.
 *
 * 이동 안내는 **지금과 다음 구간에만** 답니다. 하루 전체에 다 달면 소음입니다. */
function todayDayNo(){
  const today = todayYmd();
  if (!trip || today < trip.start_date || today > trip.end_date) return null;
  return { date: today,
           n: Math.round((asDate(today) - asDate(trip.start_date)) / D1) + 1 };
}

async function drawToday(){
  const box = $('card-today');
  const t = todayDayNo();
  if (!t){ setTodayOn(false); box.classList.add('hide'); box.innerHTML = ''; return; }

  const list = plans.filter(p => p.date === t.date);
  if (!list.length){ setTodayOn(false); box.classList.add('hide'); box.innerHTML = ''; return; }
  setTodayOn(true);

  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();
  const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2,'0')}:${
                     String(m % 60).padStart(2,'0')}`;

  /* 시각이 없는 일정은 순서를 못 매기니 아래에 따로 둡니다. */
  const timed = list.filter(p => p.start_time);
  const blank = list.filter(p => !p.start_time);

  let cur = -1;
  timed.forEach((p, i) => { if (mins(p.start_time) <= nowM) cur = i; });
  const next = cur + 1 < timed.length ? cur + 1 : -1;

  const leg = legFor(t.date);
  const wx = await getWeather(leg?.center_lat ?? trip.center_lat,
                             leg?.center_lng ?? trip.center_lng);

  /* 맨 위 한 줄: 다음 일정까지 얼마나 남았는지. 이게 제일 궁금한 것입니다. */
  let head = '';
  if (next >= 0){
    const d = mins(timed[next].start_time) - nowM;
    const when = d <= 0 ? '곧' : d < 60 ? `${d}분 후`
               : `${Math.floor(d / 60)}시간 ${d % 60}분 후`;
    head = `<div class="tdnext"><b>${esc(hm(timed[next].start_time))}
        ${esc(timed[next].title)}</b><span>${esc(when)}</span></div>`;
  } else if (cur >= 0){
    head = `<div class="tdnext"><b>오늘 일정은 여기까지예요</b></div>`;
  }

  const rows = timed.map((p, i) => {
    const done = i < cur, isCur = i === cur, isNext = i === next;
    const tag = isCur ? '지금' : isNext ? '다음' : '';
    let h = `<div class="tdrow${done ? ' is-done' : ''}${isCur ? ' is-cur' : ''}${
        isNext ? ' is-next' : ''}">
      <div class="tt">${esc(hm(p.start_time))}${
        tag ? `<span class="tg">${tag}</span>` : ''}</div>
      <span class="kdot ${p.category ? 'k-' + esc(p.category) : ''}"></span>
      <div class="tb">${esc(p.title)}</div></div>`;

    /* 지금·다음 구간에만. 시간이 모자라면 빨갛게 — 여기가 하루가 깨지는 자리입니다. */
    const nx = timed[i + 1];
    if (nx && (isCur || isNext)){
      const mv = hop(p, nx, legs);
      if (mv){
        const end = p.end_time ? mins(p.end_time)
                  : mins(p.start_time) + (STAY_MIN[p.category] ?? 30);
        const gap = mins(nx.start_time) - end;
        /* 남은 시간이 음수면 "-20분밖에 없어요"가 됩니다. 말이 안 되는 문장입니다.
           앞 일정이 이미 다음 시작을 넘겼다는 뜻이니 그렇게 적습니다. */
        const tight = gap < mv.min;
        const why = gap < 0 ? '앞 일정이 이미 넘겼어요'
                  : tight   ? `${gap}분밖에 없어요` : '';
        h += `<div class="tdmv${tight ? ' bad' : ''}">${mv.walk ? '도보' : '이동'}
          약 ${mv.min}분 · ${mv.km.toFixed(1)}km${why ? ' · ' + why : ''}</div>`;
      }
    }
    return h;
  }).join('');

  box.classList.remove('hide');
  box.innerHTML =
    `<div class="tdhead">
       <b>Day ${t.n}</b>
       <span>지금 ${hhmm(nowM)}</span>
       ${leg?.destination ? `<span>${esc(leg.destination)}</span>` : ''}
       ${wx ? `<span class="tdwx">${wx.i} ${wx.c}° ${esc(wx.t)}</span>` : ''}
     </div>
     ${head}
     <div class="tdlist">${rows}</div>
     ${blank.length ? `<div class="tdblank">시각 없는 일정 ${blank.length}개 ·
        ${esc(blank.map(p => p.title).slice(0, 3).join(' · '))}</div>` : ''}`;
}

/* 펼친 줄은 기억해 둡니다. 지우거나 고쳐서 다시 그려도 그대로 열려 있어야 합니다. */
const openPlans = new Set();
$('plans').addEventListener('click', e => {
  if (e.target.closest('a, button')) return;      /* 링크와 버튼은 각자 일합니다 */
  /* 손잡이를 눌렀다 뗀 것은 '펼치기'가 아닙니다. 끌지 않고 톡 눌러도
     여기까지 오는데, 그러면 순서를 바꾸려다 줄이 펼쳐집니다. */
  if (e.target.closest('[data-grip]')) return;
  const row = e.target.closest('[data-ev]'); if (!row) return;
  const id = row.dataset.ev;
  if (openPlans.has(id)) openPlans.delete(id); else openPlans.add(id);
  row.classList.toggle('is-open');
});

$('days').addEventListener('click', e => {
  const b = e.target.closest('.day'); if (!b) return;
  setPickedDay(b.dataset.day || null);
  drawDays(); drawCats(); drawPlans(); drawPlanMap();
});

/* ── 지운 것 되살리기 ────────────────────────────────────────────────
 * 지울 때 deleted_at 만 찍고 진짜로는 안 지워 왔습니다. 그런데 되살리는 길이
 * 없어서 결국 영영 지운 것과 같았습니다. 여기가 그 길입니다.
 * 표 셋(일정·지출·예약)을 각각 물으면 화면 코드가 세 배가 되므로
 * 032 의 deleted_items 가 한 번에 모아 줍니다. */
const TRASH_KO = { plan:'일정', expense:'지출', booking:'예약' };
$('trashhead').addEventListener('click', () => {
  const open = $('trash').classList.toggle('hide');
  $('trashcaret').textContent = open ? '펴기' : '접기';
});
const TRASH_TABLE = { plan:'plans', expense:'expenses', booking:'bookings' };

async function loadTrash(){
  const card = $('card-trash');
  const kind = TAB_TRASH[tab];
  /* 되살릴 것이 없으면 카드를 아예 안 보여줍니다. "지운 것이 없어요"만 적힌
     빈 카드는 매번 자리만 먹고, 그걸 보려고 탭을 여는 사람은 없습니다. */
  const hideCard = () => card.classList.add('hide');
  if (!kind) return hideCard();

  $('trasherr').classList.add('hide');
  const { data, error } = await netTimeout(sb.rpc('deleted_items', { p_trip: trip.id }));
  if (error){
    /* 못 불러오면 조용히 접습니다. 되살리기는 급한 기능이 아니라
       여기서 오류 상자를 띄우면 정작 보러 온 일정 위에 얹힙니다. */
    if (isOffline(error)) drawOffbar();
    return hideCard();
  }

  const rows = (data || []).filter(r => r.kind === kind);
  if (!rows.length) return hideCard();

  card.classList.remove('hide');
  $('trashtitle').textContent = `지운 ${TRASH_KO[kind]}`;
  $('trashcount').textContent = `${rows.length}개`;
  /* 탭을 옮기면 다시 접습니다. 한 번 편 채로 따라다니면 접은 뜻이 없습니다. */
  $('trash').classList.add('hide');
  $('trashcaret').textContent = '펴기';
  /* 되살리기 옆에 '완전 삭제'를 둡니다. 지운 것이 여기 계속 쌓이면
     목록이 길어져 정작 되살릴 것을 못 찾습니다. 진짜로 지우는 것이라
     한 번 더 물어봅니다(arm) — 되살릴 길이 그때는 없습니다. */
  $('trash').innerHTML = rows.map(r => `<div class="arow">
      <span class="k"><b>${esc(r.title)}</b>
        <span class="m">${esc(r.sub || '')}</span></span>
      ${trip.myRole === 'viewer' ? ''
        : `<button class="ghost" data-undel="${esc(r.kind)}:${esc(r.id)}"
                   style="color:var(--primary); padding:4px 6px">되살리기</button>
           <button class="ghost" data-zap="${esc(r.kind)}:${esc(r.id)}"
                   style="color:var(--bad, #c0392b); padding:4px 6px">완전 삭제</button>`}
      </div>`).join('');
}

/* 되살렸든 지웠든 원래 자리도 다시 그려야 합니다. */
async function afterTrash(kind){
  await loadTrash();
  if (kind === 'plan')    await loadPlans();
  if (kind === 'expense') await loadExpenses();
  if (kind === 'booking') await loadBookings();
}

$('trash').addEventListener('click', async e => {
  const z = e.target.closest('[data-zap]');
  if (z){
    /* 한 번 더 묻습니다. 여기서 지우면 정말 없어집니다. */
    if (z.dataset.armed !== '1'){ arm(z, '정말 지울까요?'); return; }
    const [kind, id] = z.dataset.zap.split(':');
    z.disabled = true; z.innerHTML = '<span class="load">지우는 중…</span>';
    /* 이미 지운 것만 지웁니다. deleted_at 조건을 빼면, 그 사이 딴 기기에서
       되살려 놓은 줄까지 여기서 없앨 수 있습니다. */
    const r = await sb.from(TRASH_TABLE[kind]).delete()
      .eq('id', id).not('deleted_at', 'is', null).select('id');
    z.disabled = false; disarm(z); z.textContent = '완전 삭제';
    if (r.error) return fail(r.error, 'trash');
    if (!r.data?.length) return fail(NOROW.del, 'trash');
    toast('완전히 지웠어요.');
    return afterTrash(kind);
  }

  const b = e.target.closest('[data-undel]'); if (!b) return;
  const [kind, id] = b.dataset.undel.split(':');
  b.disabled = true; b.innerHTML = '<span class="load">되살리는 중…</span>';
  const r = await sb.from(TRASH_TABLE[kind])
    .update({ deleted_at: null }).eq('id', id).select('id');
  b.disabled = false; b.textContent = '되살리기';
  if (r.error) return fail(r.error, 'trash');
  if (!r.data?.length) return fail('되살리지 못했어요. 다시 눌러주세요.', 'trash');
  toast('되살렸어요.');
  await afterTrash(kind);
});

/* ── 탭 ─────────────────────────────────────────────────────────────
 * 카드를 한 화면에 다 쌓아두면 예약·준비물까지 붙였을 때 감당이 안 됩니다.
 * DOM 순서는 그대로 두고 보이는 것만 고릅니다 — display:none 이라 사이가 안 벌어집니다. */
/* 지운 것(card-trash)이 일행 탭에 있었습니다. 일행과 아무 상관이 없고,
   **지운 것은 지운 자리에서 되살리는 것이 맞습니다.** 세 탭에 같이 걸고
   내용은 그 탭 것만 보여줍니다. DOM 에서는 맨 끝에 있어서 어느 탭에 나와도
   그 탭 카드들 뒤에 붙습니다 — 자리를 옮기지 않아도 됩니다. */
const TABS = {
  plans: ['card-today', 'card-plans', 'card-cand', 'plancard', 'importcard', 'card-trash'],
  exp:   ['card-exp', 'expcard', 'settlecard', 'card-trash'],
  prep:  ['card-book', 'bookcard', 'card-pack', 'card-link', 'card-trash'],
  mem:   ['card-mem'],
};
/* 어느 탭이 어떤 것을 되살리는가 */
const TAB_TRASH = { plans:'plan', exp:'expense', prep:'booking' };
/* 탭을 옮기면 열려 있던 폼은 닫습니다 */
const FORMS = ['plancard', 'expcard', 'bookcard', 'card-cand', 'importcard'];

function showTab(t){
  /* 어느 쪽에서 들어오는지. 알약에 적힌 순서를 그대로 읽습니다 —
     여기 따로 적어두면 index.html 에서 순서를 바꿀 때 어긋납니다. */
  const seq = [...document.querySelectorAll('#tstrip button[data-t]')].map(b => b.dataset.t);
  const back = seq.indexOf(t) < seq.indexOf(tab);
  setTab(t);
  /* 한 id 가 여러 탭에 걸리게 되면서, 예전처럼 탭마다 따로 끄면 뒤 탭 차례에
     방금 켠 것이 다시 꺼집니다. 켤 것을 먼저 모아두고 한 번에 정합니다. */
  const on = new Set(TABS[t].filter(id => !FORMS.includes(id)));
  if (!settleOn) on.delete('settlecard');
  /* 오늘 일정도 같습니다. drawToday 가 비어서 숨겨도 여기서 다시 켜고 있었습니다 —
     지도 위에 **내용 없는 흰 카드**가 하나 떠 있던 것이 이것입니다. */
  if (!todayOn) on.delete('card-today');
  /* 지운 것은 있을 때만 켭니다. loadTrash 가 세어보고 다시 정합니다 —
     여기서는 일단 끄고, 되살릴 게 있으면 그쪽에서 켭니다. */
  on.delete('card-trash');

  for (const ids of Object.values(TABS))
    for (const id of ids) $(id).classList.toggle('hide', !on.has(id));

  $('editcard').classList.add('hide');
  document.querySelectorAll('#tstrip button').forEach(b =>
    b.classList.toggle('is-on', b.dataset.t === t));
  /* 지운 것은 열 때만 받아옵니다. 대부분은 볼 일이 없어서 미리 받으면 낭비입니다. */
  if (TAB_TRASH[t]) loadTrash();
  window.scrollTo({ top:0, behavior:'smooth' });

  /* 옆에서 들어오는 모양. **두 클래스를 먼저 걷고 한 박자 쉬어야** 같은 방향으로
     연달아 넘길 때 애니메이션이 다시 시작됩니다 — 안 걷으면 두 번째부터
     아무 일도 안 일어난 것처럼 보입니다. */
  const v = $('tripview');
  v.classList.remove('tabin', 'tabin-r');
  void v.offsetWidth;
  v.classList.add(back ? 'tabin-r' : 'tabin');
}
$('tstrip').addEventListener('click', e => {
  const b = e.target.closest('button[data-t]');
  if (b) showTab(b.dataset.t);
});

/* ── 좌우로 쓸어 구역 넘기기 ──────────────────────────────────────────
 * 구역 알약이 화면 **왼쪽 위**에 있어서 한 손으로 들면 엄지가 안 닿습니다.
 * 손가락이 이미 있는 자리에서 넘길 수 있게 합니다. 알약은 그대로 둡니다 —
 * 쓸기는 알려주지 않으면 아무도 모르므로, 보이는 길이 사라지면 안 됩니다.
 *
 * **순서는 알약에 적힌 순서를 그대로 읽어옵니다.** 여기 따로 적어두면
 * index.html 에서 순서를 바꿀 때 쓸기만 옛 순서로 남습니다.
 * 끝에서 더 밀면 안 넘어갑니다 — 돌아 나오면 지금 어디인지 감이 사라집니다. */
{
  const order = () => [...document.querySelectorAll('#tstrip button[data-t]')]
    .map(b => b.dataset.t);
  const step = d => {
    const o = order(), i = o.indexOf(tab);
    if (i < 0) return;
    const next = o[i + d];
    if (next && next !== tab) showTab(next);
  };
  /* **`#tripview` 가 아니라 화면 전체에 겁니다.** 처음에 tripview 에 걸었더니
     카드가 끝나는 데서 tripview 도 끝나서, **그 아래 회색 빈 자리에서는
     아무 일도 안 일어났습니다**(지출이 비면 화면의 3분의 2가 그 자리입니다).
     사용자가 보기에 그 회색도 여행 화면이므로 거기서도 넘어가야 합니다.
     화면 전체에 걸어도 되는 이유는 `body.intrip` 이 있기 때문입니다 —
     showApp 이 다른 탭으로 갈 때 여행을 닫으면서 늘 끕니다. */
  onSwipeX(document, {
    /* 시트가 위에 열려 있으면 화면이 보여도 넘기면 안 됩니다.
       **하단바 위에서 시작한 것은 넘깁니다** — 거기는 앱 탭(홈·여행·기록·프로필)
       차례입니다. 아래에서 따로 듣습니다. */
    active: () => document.body.classList.contains('intrip') &&
                  !$('tripview').classList.contains('hide') &&
                  !document.body.classList.contains('sheeton'),
    skip:    e => !!e.target.closest?.('#appbar'),
    onLeft:  () => step(1),      /* 왼쪽으로 쓸면 다음 구역이 따라 들어옵니다 */
    onRight: () => step(-1),
  });
}

/* ── 하단바도 좌우로 쓸어 넘기기 ──────────────────────────────────────
 * 사용자 요청. 탭이 넷이라 끝에서 끝으로 갈 때 손가락이 화면을 가로지릅니다.
 * 바 위에서 쓸면 옆 탭으로 갑니다 — 손가락을 옮길 필요가 없습니다.
 *
 * **여행 안에서도 바 위에서는 앱 탭이 바뀝니다.** 바에 그려진 것이 앱 탭이니
 * 거기서 쓸면 그것이 움직이는 게 맞습니다(위 여행 구역 쓸기는 바를 건너뜁니다).
 * 순서는 index.html 의 단추에서 읽습니다 — 코드에 또 적으면 어긋납니다. */
{
  const order = () => [...document.querySelectorAll('#appbar button[data-a]')]
    .map(b => b.dataset.a);
  const step = d => {
    const o = order(), i = o.indexOf(appTab);
    if (i < 0) return;
    const next = o[i + d];
    /* 끝에서 더 밀어도 안 돌아 나옵니다 — 돌면 지금 어디인지 감이 사라집니다. */
    if (next && next !== appTab) showApp(next);
  };
  /* **하단바만이 아니라 화면 전체입니다.** 처음에 바 위에서만 되게 했더니
     사용자가 바로 "홈화면 슬라이드 안된다"고 했습니다 — 당연합니다.
     여행 안에서는 화면 아무 데나 쓸면 구역이 넘어가는데, 여행 밖에서만
     좁은 띠를 정확히 짚어야 한다면 그건 같은 앱이 두 규칙으로 도는 것입니다.
     **여행 밖이면 화면 전체가 앱 탭 차례입니다.**
     (여행 안에서는 위쪽 쓸기가 구역을 넘기고, 하단바에서만 앱 탭이 넘어갑니다.) */
  onSwipeX(document, {
    active: () => !$('appbar').classList.contains('hide') &&
                  !document.body.classList.contains('sheeton') &&
                  !document.body.classList.contains('intrip'),
    onLeft:  () => step(1),
    onRight: () => step(-1),
  });
  /* 여행 안에서는 위가 구역 차례라 화면 전체로는 못 겁니다. 바만 따로 듣습니다. */
  onSwipeX($('appbar'), {
    active: () => !$('appbar').classList.contains('hide') &&
                  !document.body.classList.contains('sheeton') &&
                  document.body.classList.contains('intrip'),
    onLeft:  () => step(1),
    onRight: () => step(-1),
  });
}

/* 여행 안이냐 밖이냐. 상단바가 이걸 보고 모양을 바꿉니다 —
   안이면 구역 넷이 나오고 앱 이름이 접힙니다. */
function inTrip(on){
  document.body.classList.toggle('intrip', on);
  $('tstrip').classList.toggle('hide', !on);
}

/* ── 지출 ───────────────────────────────────────────────────────── */
/* 지출·환율·정산은 expense.js 로 옮겼습니다(b335, 여덟 번째 조각).
   nameOf 는 지출 것이 아니라 일행 것이라 trip.js 로 내렸습니다 — 후기·
   준비물·일행 화면도 그것을 씁니다. */
/* ── 여행 준비 ────────────────────────────────────────────────────────
 * 예약·서류·준비물·링크는 prep.js 로 옮겼습니다(b336, 아홉 번째 조각).
 * **딸린 것이 하나도 없어서 ctx 가 없습니다** — 여기서 넘겨줄 것이 없습니다.
 * 밖에서 부르는 길 넷만 맨 위에서 가져옵니다. */
/* ── 일행 · 초대 링크 ─────────────────────────────────────────────────
 * 일행 목록·권한, 초대 링크 만들기·거두기, 링크로 들어온 사람 넣기는
 * member.js 로 옮겼습니다(b337, 열 번째 조각). ctx 셋을 넘깁니다.
 * ROLE_KO 는 거기서 내보냅니다 — 여행 목록 배지도 같은 것을 씁니다. */
/* ── 일정 추가 · 삭제 ───────────────────────────────────────────── */
$('addplanbtn').addEventListener('click', () => {
  setEditPlanId(null); $('p_create').textContent = '넣기';
  /* 손으로 새로 여는 것이므로 앞서 카드에서 들고 온 좌표는 버립니다.
     openPlanForm 은 이 뒤에 다시 채웁니다. */
  planSeedGeo = null;
  /* 앞서 붙여넣은 링크의 결과도 같이 버립니다. 안 그러면 다음 일정에
     엉뚱한 위치가 딸려 들어갑니다 — 조용히 틀리는 종류입니다. */
  planGeo = null; geoAsked = ''; $('p_geonote').classList.add('hide');
  $('plancard').classList.toggle('hide');
  if ($('plancard').classList.contains('hide')) return;
  $('p_date').value = pickedDay || trip.start_date;
  $('p_date').min = '';                    /* 여행 기간 밖도 넣을 수 있어야 합니다 */
  $('p_cat').dataset.touched = '';         /* 새 폼이니 짐작을 다시 켭니다 */
  $('p_title').focus();
});

/* 제목·메모를 치는 대로 분류를 짐작해 미리 골라둡니다.
   직접 고른 적이 있으면 그때부터 안 건드립니다. */
$('p_cat').addEventListener('change', () => { $('p_cat').dataset.touched = '1'; });
for (const id of ['p_title', 'p_memo'])
  $(id).addEventListener('input', () => {
    if ($('p_cat').dataset.touched === '1') return;
    const g = guessCat($('p_title').value + ' ' + $('p_memo').value);
    if (g) $('p_cat').value = g;
  });
$('p_cancel').addEventListener('click', () => {
  $('plancard').classList.add('hide'); $('planformerr').classList.add('hide');
});

/* ── 붙여넣은 지도 링크에서 위치 찾기 ───────────────────────────────
 * 사용자가 실제로 하던 일: 구글 지도에서 '공유'로 링크를 복사해 메모에
 * 붙여넣습니다. 그런데 그건 **글자로만 남았습니다** — 지도에는 안 뜨고,
 * 좌표를 채우려면 어느 탭에 숨어 있는지도 모르는 단추를 찾아야 했습니다.
 *
 * **짧은 주소(maps.app.goo.gl)는 브라우저에서 못 폅니다.** 리다이렉트를
 * 읽어야 하는데 구글이 CORS 를 안 줍니다. 서버(chat 함수의 mode:'map')가
 * 폅니다 — 거기 이미 펴고 뽑는 코드가 있고, AI 는 안 씁니다(한도 안 닳음).
 *
 * 같은 링크를 두 번 묻지 않습니다. 글자를 고칠 때마다 나가면 안 됩니다. */
let planGeo = null, geoAsked = '';
const MAPURL = /https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|(?:www\.)?google\.[a-z.]+\/maps)\S*/i;

async function sniffMapLink(){
  if (!featOn('maplink')) return;
  const hit = ($('p_memo').value + ' ' + $('p_title').value).match(MAPURL);
  const note = $('p_geonote');
  if (!hit){ geoAsked = ''; planGeo = null; note.classList.add('hide'); return; }
  const url = hit[0];
  if (url === geoAsked) return;
  geoAsked = url;

  note.classList.remove('hide');
  note.textContent = '지도에서 위치를 찾는 중…';
  const r = await sb.functions.invoke('chat', { body:{ mode:'map', message:url } });
  if (r.error || r.data?.error){
    planGeo = null;
    note.textContent = '이 링크를 읽지 못했어요. 그냥 넣어도 괜찮아요.';
    return;
  }

  let { name, lat, lng } = r.data || {};
  /* **주소는 나오는데 좌표는 없는 링크가 많습니다.** 실제로 재봤습니다:
       maps.app.goo.gl/18Sbe4… → 이름 "OZEKI Tokyo Gallery, 1 Chome-2-6 …"
       좌표 null
     구글이 짧은 주소를 펼 때 좌표 없이 주소만 실어 보내는 판이 있습니다.
     그러면 우리에게는 **주소 한 줄**이 남는데, 그건 이미 좌표로 바꿀 수
     있습니다 — 앱이 '좌표 채우기'에서 쓰는 그 검색입니다. 이어 붙입니다. */
  if (lat == null && name){
    note.textContent = '주소로 위치를 찾는 중…';
    const hit = await osmLookup(name);
    if (hit && hit !== 'stop'){ lat = hit.lat; lng = hit.lng; }
  }

  if (lat == null){
    planGeo = null;
    /* **못 찾아도 넣기는 됩니다.** 위치가 없을 뿐입니다 — 막으면 안 됩니다. */
    note.textContent = name
      ? `${name} · 지도 위치는 못 찾았어요. 그냥 넣어도 괜찮아요.`
      : '이 링크에서는 위치를 못 찾았어요. 그냥 넣어도 괜찮아요.';
    if (name && !$('p_title').value.trim()) $('p_title').value = name.split(',')[0].trim();
    return;
  }
  planGeo = { lat, lng };
  note.textContent = name ? `위치를 찾았어요 · ${name.split(',')[0].trim()}`
                          : '위치를 찾았어요';
  /* 제목이 비어 있으면 채워줍니다. 링크만 붙여넣고 이름을 또 치게 할
     이유가 없습니다. 이미 적었으면 안 건드립니다. */
  if (r.data.name && !$('p_title').value.trim()) $('p_title').value = r.data.name;
}
let geoTimer = null;
['p_memo', 'p_title'].forEach(id => $(id).addEventListener('input', () => {
  clearTimeout(geoTimer); geoTimer = setTimeout(sniffMapLink, 500);
}));

$('p_create').addEventListener('click', async () => {
  $('planformerr').classList.add('hide');
  /* 붙여넣고 바로 눌렀을 수 있습니다. 아직 안 물어봤으면 여기서 물어봅니다. */
  await sniffMapLink();
  const title = $('p_title').value.trim(), date = $('p_date').value;
  const st = $('p_start').value, et = $('p_end').value;

  if (!title) return fail('무엇을 하는지 적어주세요.', 'planform');
  if (!date)  return fail('날짜를 골라주세요.', 'planform');
  if (st && et && et < st) return fail('끝나는 시각이 시작보다 빨라요.', 'planform');

  /* 같은 날 맨 뒤로 보냅니다. 소수를 쓰면 나중에 둘 사이에 끼울 때
     그 둘만 건드리면 됩니다 — 같이 편집할 때 서로의 순서를 안 덮습니다. */
  const sameDay = plans.filter(p => p.date === date);
  const sort = sameDay.length ? Math.max(...sameDay.map(p => +p.sort_order)) + 1 : 0;

  const row = {
    title, date,
    start_time: st || null, end_time: et || null,
    category: $('p_cat').value || null,
    memo: $('p_memo').value.trim() || null,
  };
  /* ── 낙관적 저장 ──
     서버 대답을 기다리는 동안 화면을 붙잡아 두지 않습니다. 먼저 반영하고 뒤에서 보냅니다.
     여행지에서는 이 기다림이 5초씩 걸립니다. 그동안 앱이 멈춘 것처럼 보였습니다.
     실패하면 되돌립니다 — 되돌릴 수 있게 이전 모습을 들고 있습니다. */
  const editing = editPlanId;
  const before  = editing ? { ...plans.find(p => p.id === editing) } : null;
  const tmpId   = 'tmp:' + Math.random().toString(36).slice(2);

  /* 카드나 후보에서 넘어온 좌표. 폼에는 칸이 없어서 따로 들고 있었습니다.
     **고치는 중일 때는 쓰지 않습니다** — 그 일정이 이미 가진 좌표를 덮습니다. */
  /* **붙여넣은 지도 링크가 먼저입니다.** 방금 사람이 직접 준 위치라
     카드에서 딸려온 것보다 확실합니다. 고치는 중이어도 링크를 새로
     붙여넣었으면 그건 "여기로 바꿔달라"는 뜻이므로 씁니다. */
  const geo = planGeo || ((!editing && planSeedGeo) ? planSeedGeo : null);

  if (editing){
    const i = plans.findIndex(p => p.id === editing);
    if (i >= 0) plans[i] = { ...plans[i], ...row };
  } else {
    plans.push({ id: tmpId, trip_id: trip.id, sort_order: sort,
                 lat: geo?.lat ?? null, lng: geo?.lng ?? null,
                 move_note:null, ...row });
  }
  plans.sort((a, b) => a.date.localeCompare(b.date)
    || String(a.start_time ?? '~').localeCompare(String(b.start_time ?? '~'))
    || (+a.sort_order) - (+b.sort_order));

  $('p_title').value = ''; $('p_memo').value = '';
  $('p_start').value = ''; $('p_end').value = '';
  setEditPlanId(null);
  $('plancard').classList.add('hide');
  drawDays(); drawCats(); drawPlans(); drawPlanMap();

  planSeedGeo = null;               /* 한 번 쓰고 비웁니다. 다음 일정에 묻으면 안 됩니다 */
  /* **고칠 때도 좌표를 같이 보냅니다.** 전에는 넣을 때만 실려서, 이미 있는
     일정에 지도 링크를 붙여넣어도 지도에 안 떴습니다 — 그 일정을 지우고
     다시 만들어야 했습니다. 링크를 새로 붙여넣은 경우(planGeo)만 덮습니다. */
  const r = await write(editing
    ? { table:'plans', action:'update', id:editing,
        row:{ ...row, ...(planGeo || {}) } }
    : { table:'plans', action:'insert',
        row:{ trip_id: trip.id, sort_order: sort, ...row, ...(geo || {}) } });

  if (!r.ok){
    /* 되돌립니다. 저장 안 된 것이 화면에 남아 있으면 여행 중에 그걸 믿고 움직입니다. */
    if (editing){ const i = plans.findIndex(p => p.id === editing); if (i >= 0) plans[i] = before; }
    else setPlans(plans.filter(p => p.id !== tmpId));
    drawDays(); drawCats(); drawPlans(); drawPlanMap();
    $('plancard').classList.remove('hide');
    return fail(r.why, 'planform');
  }
  if (r.queued) return toast('연결이 없어 들고 있어요. 터지면 바로 보냅니다.');
  await loadPlans();                       /* 임시 id 를 진짜 id 로 바꿉니다 */
});

$('plans').addEventListener('click', async e => {
  const b = e.target.closest('button[data-pact]'); if (!b) return;
  const id = b.dataset.id;

  /* 고치기 — 일정 칸을 그 줄 내용으로 채워 엽니다. 새로 적게 하지 않습니다. */
  if (b.dataset.pact === 'edit'){
    const p = plans.find(x => x.id === id); if (!p) return;
    $('addplanbtn').click();
    $('p_title').value = p.title || '';
    $('p_date').value  = p.date || '';
    $('p_start').value = p.start_time ? p.start_time.slice(0,5) : '';
    $('p_end').value   = p.end_time ? p.end_time.slice(0,5) : '';
    $('p_cat').value   = p.category || '';
    $('p_memo').value  = p.memo || '';
    setEditPlanId(id);
    $('p_create').textContent = '고치기';
    return;
  }

  if (b.dataset.armed !== '1'){          /* 확인창을 안 쓰는 이유는 목록 쪽과 같습니다 */
    arm(b, '정말 지울까요?'); return;
  }
  /* 지우는 것도 먼저 화면에서 뺍니다. 진짜로 지우지는 않고 숨깁니다 —
     여럿이 쓰면 남이 지운 것을 되살릴 방법이 필요합니다. */
  const gone = plans.find(p => p.id === id);
  setPlans(plans.filter(p => p.id !== id));
  drawDays(); drawCats(); drawPlans(); drawPlanMap();

  const r = await write({ table:'plans', action:'delete', id });
  if (!r.ok){
    if (gone) plans.push(gone);
    drawDays(); drawCats(); drawPlans(); drawPlanMap();
    return fail(r.why, 'plan');
  }
  if (r.queued) return toast('연결이 없어 들고 있어요. 터지면 바로 보냅니다.');
  await loadPlans();
});

/* ── 첫 화면 사진 ────────────────────────────────────────────────────
 * 앱을 처음 보는 사람이 제일 먼저 보는 화면인데 도시 사진을 469장
 * 가지고도 한 장을 안 쓰고 채도 높은 그러데이션을 깔고 있었습니다.
 *
 * **한 번 고른 도시를 캐시에 담아둡니다.** 열 때마다 바뀌면 같은 앱으로
 * 안 보이고, 무엇보다 로그인 전에는 이 화면이 전부라 연결이 없을 때도
 * 뭐라도 나와야 합니다. 못 받으면 그냥 안 깝니다 — `.hello` 의 짙은
 * 바탕이 이미 흰 글자를 읽히게 하므로 화면이 깨지지 않습니다.
 *
 * `cities` 는 anon 으로도 읽힙니다(로그인 전에 부르는 이유). */
async function helloPhoto(){
  const box = $('hellopic');
  if (!box) return;                     /* onerror 로 자기를 지우고 갈 수 있습니다 */
  let c = cacheGet('hellocity');
  if (!c?.image_url){
    const { data } = await netTimeout(sb.from('cities')
      .select('name,image_url').not('image_url', 'is', null).limit(60));
    const l = data || [];
    c = l[Math.floor(Math.random() * l.length)] || null;
    if (c?.image_url) cacheSet('hellocity', c);
  }
  if (!c?.image_url || !$('hellopic')) return;
  box.src = c.image_url;
  box.classList.remove('hide');
  $('hellowhere').textContent = c.name;
}

/* ── 화면 전환 ──────────────────────────────────────────────────── */
async function render(session){
  /* 스플래시를 걷습니다. **여기가 맞는 자리입니다** — 어느 화면을 보여줄지
     정해진 순간이라, 걷고 나면 빈 화면이 아니라 실제 화면이 나옵니다.
     더 일찍(코드가 살아난 시점) 걷으면 로그인 화면인지 홈인지 정하기 전이라
     한 번 깜빡입니다. 다음 칠에 걷어서 아래의 class 갈아끼우기가 먼저
     화면에 반영되게 합니다.
     안 불려도 index.html 이 3.2초면 스스로 걷습니다 — 끄는 길이 둘입니다. */
  requestAnimationFrame(() => window.__hideSplash?.());
  if (!session){
    clearTrip(); document.body.classList.remove('hastab');
    $('signedin').classList.add('hide'); $('signedout').classList.remove('hide');
    $('errcard').classList.add('hide'); $('bell').classList.add('hide');
    $('aibtn').classList.add('hide');
    $('sub').textContent = '로그인하면 여행을 만들 수 있어요.';
    me = null;
    helloPhoto();               /* 기다리지 않습니다 — 사진 때문에 로그인이 늦으면 안 됩니다 */
    /* **앞사람 것을 남기지 않습니다.** 별점·다녀온 곳은 사람마다 다른데
       여태 로그아웃에도 로그인에도 비우는 코드가 없었습니다. 같은 기기에서
       계정을 바꾸면 앞사람 별점이 화면에 남았습니다. */
    clearRates(); resetRateHtml(); resetHomeSig(); dropHtml('trips');

    /* 초대 링크로 왔으면 어떤 여행인지 먼저 보여줍니다.
       아직 참여자가 아니라 trips 를 못 읽으므로 이름과 날짜만 주는 함수를 씁니다. */
    const code = sessionStorage.getItem('t2:join');
    if (code){
      const { data } = await sb.rpc('peek_invite', { p_code: code });
      if (data){
        $('joinnote').classList.remove('hide');
        $('joinname').textContent = data.title;
        $('joinwhen').textContent = data.expired
          ? '만료된 초대예요'
          : `${data.destination} · ${dateRange(data.start_date, data.end_date)} · ` +
            `${ROLE_KO[data.role] || data.role}로 참여`;
      }
    }
    return;
  }
  if (me?.id === session.user.id) return;      /* 토큰 갱신마다 다시 그리지 않습니다 */
  /* **여기까지 왔으면 다른 사람입니다**(같은 사람이면 위에서 돌아갑니다).
     로그아웃을 안 거치고 바로 갈아타는 길도 있으므로 여기서도 비웁니다. */
  clearRates(); resetRateHtml(); resetHomeSig(); dropHtml('trips');
  /* 사람이 바뀌면 앞사람 화면을 반드시 다시 그립니다 */
  me = session.user;

  $('signedout').classList.add('hide'); $('signedin').classList.remove('hide');
  clearTrip();
  $('tripview').classList.add('hide'); inTrip(false);  /* 다시 그릴 때는 목록부터 */
  $('appbar').classList.remove('hide');
  document.body.classList.add('hastab');
  $('sub').textContent = '';

  const meta = me.user_metadata || {};
  $('mail').textContent = me.email || '';
  /* 우리 통에 올린 사진과 바꾼 이름을 먼저 씁니다. 없으면 구글 것.
     이름을 구글 것만 보고 있어서, 바꿔도 다시 열면 되돌아왔습니다. */
  /* 이름·사진·글자 크기는 **기다리지 않습니다.**
     비행기모드에서 부팅이 14초 걸렸습니다. 화면은 캐시로 진작 나와 있는데
     이 질의들을 기다리느라 앱이 멈춰 있었습니다.
     먼저 아는 값(구글 계정 정보, 지난번 글자 크기)으로 그려두고,
     서버 값이 오면 그때 덮어씁니다. 안 와도 앱은 돕니다. */
  /* 구글에서 이름·사진을 안 받습니다(위 로그인 범위 참고).
     처음에는 이메일 앞부분을 이름으로 씁니다. 본인이 바꾸면 그게 남습니다. */
  $('name').textContent = (me.email || '').split('@')[0];
  applyTs(localStorage.getItem('t2:ts') || 1);
  setMyAvatar('');
  /* 사진을 올린 적이 없으면 여기서 끝입니다. src 를 비워두면 흰 네모가 됩니다 —
     이름 첫 글자를 그려 넣습니다. 아래에서 진짜 사진이 오면 갈아 끼웁니다. */
  $('avatar').src = avatarOf(me.id, $('name').textContent);

  sb.from('profiles').select('avatar_url,display_name').eq('id', me.id).maybeSingle()
    .then(r => {
      if (!r.data) return;
      if (r.data.display_name) $('name').textContent = r.data.display_name;
      if (r.data.avatar_url){ setMyAvatar(r.data.avatar_url); $('avatar').src = r.data.avatar_url; }
      else $('avatar').src = avatarOf(me.id, $('name').textContent);  /* 별명이 늦게 와도 맞게 */
    }).catch(() => {});

  /* 다른 기기에서 바꾼 글자 크기가 있으면 그걸 따릅니다. 늦게 와도 됩니다. */
  sb.from('user_prefs').select('text_scale').eq('user_id', me.id).maybeSingle()
    .then(r => {
      if (!r.data?.text_scale) return;
      applyTs(r.data.text_scale);
      localStorage.setItem('t2:ts', r.data.text_scale);
    }).catch(() => {});

  /* 대시보드 아이콘은 프로필 화면에 있습니다. 설정을 열 때 켜면 프로필을 봐도
     안 보입니다 — 로그인하자마자 한 번 확인합니다. 관리자가 아니면 서버가
     막고 아이콘은 숨은 채로 남습니다. */
  loadAdmin();

  $('bell').classList.remove('hide'); $('aibtn').classList.remove('hide');
  /* 빌드 번호는 만든 사람만 봅니다. 앱 안에서는 아무도 자기를 관리자로 못 만듭니다 —
     admins 표에 쓰기 정책이 아예 없어서 SQL 편집기로만 넣을 수 있습니다 (038). */
  sb.rpc('is_admin').then(r => {
    const admin = r.data === true;
    $('foot').classList.toggle('hide', !admin);
  }).catch(() => {});
  /* 출발 하루 전 알림. 시간이 되면 저절로 도는 장치가 없어서 앱을 열 때 확인합니다.
     여러 번 불러도 한 번만 생깁니다 (032 의 ensure_trip_reminders). */
  sb.rpc('ensure_trip_reminders').then(() => loadNotifs()).catch(() => loadNotifs());
  /* 만든 사람이 켜고 끈 것들. 기다리지 않습니다 — 못 읽어도 전부 켜진
     것으로 보고 그대로 돕니다(db/066). */
  loadFlags();
  /* 지난번에 못 보낸 저장이 남아 있을 수 있습니다. 켜자마자 흘려보냅니다. */
  drawOffbar(); flushQueue();
  /* 오프라인이면 홈이 어차피 "볼 수 없어요"입니다. 그럴 땐 여행 목록으로 엽니다 —
     받아둔 일정이 거기 있습니다. 열자마자 쓸 수 있는 화면을 보여주는 것이 맞습니다. */
  showApp(netIsDown() ? 'trips' : 'home');
  /* 초대 링크로 들어왔으면 로그인 직후 그 여행으로 바로 보냅니다.
     목록만 보여주면 어디로 가야 하는지 몰라 헤맵니다.
     기다리지 않습니다 — 초대 코드가 없으면 아무 일도 안 하는데,
     오프라인에서 이걸 기다리느라 첫 화면이 늦어졌습니다. */
  handleJoin();
  /* 알림을 눌러서 앱이 꺼진 채로 열렸으면 주소에 여행이 실려 있습니다.
     `showApp` 뒤에 부릅니다 — 먼저 부르면 홈이 그 위를 덮습니다. */
  openFromUrl(location.href);
}

/* ── 시작 ───────────────────────────────────────────────────────── */
/* 초대 링크(?join=CODE)로 들어왔을 수 있습니다. 로그인을 거쳐야 쓸 수 있으므로
   먼저 담아두고 주소는 지웁니다 — 구글에 다녀오는 동안 사라지면 안 됩니다. */
{
  const code = new URLSearchParams(location.search).get('join');
  if (code){
    sessionStorage.setItem('t2:join', code.trim().toUpperCase());
    history.replaceState(null, '', location.pathname);
  }
}

/* 로그인 확인을 무한정 기다리지 않습니다.
   오프라인에서 토큰이 만료돼 있으면 supabase 가 새로 받으러 나가는데,
   그게 안 돌아와서 화면이 "불러오는 중…"에 멈춰 있었습니다.
   3초 안에 답이 없으면 저장해 둔 로그인 정보를 그대로 씁니다 —
   토큰이 낡았어도 화면은 캐시로 돌아가고, 연결되면 알아서 갱신됩니다. */
function storedSession(){
  try {
    const s = JSON.parse(localStorage.getItem('t2-auth') || 'null');
    return s?.access_token && s?.user ? s : null;
  } catch { return null; }
}
/* 끊긴 걸 이미 아는 상태면 물어보지도 않습니다. 저장해 둔 것을 바로 씁니다.
   3초를 기다렸다 캐시를 쓰나, 바로 캐시를 쓰나 결과가 같은데
   앞의 3초는 화면이 멈춰 있는 시간입니다. 그게 "처음 열 때 느리다"의 정체였습니다. */
const session = !netIsDown()
  ? await Promise.race([
      sb.auth.getSession().then(r => r.data.session).catch(() => storedSession()),
      new Promise(r => setTimeout(() => r(storedSession()), 3000)),
    ])
  : storedSession();
await render(session);
sb.auth.onAuthStateChange((_e, s) => { render(s); });

$('ms').textContent = Math.round(performance.now() - t0) + 'ms';
