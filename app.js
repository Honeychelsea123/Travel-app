/* ── 진입점 ────────────────────────────────────────────────────────
 * 층은 이렇게 흐릅니다. 위가 아래에 기대고, 거꾸로는 없습니다(순환 참조 방지).
 *   dom.js · db.js · calc.js · stars.js   ← 아무것도 import 안 하는 잎
 *   net.js · ui.js   (dom.js 만)
 *   admin.js  (dom.js · db.js · net.js)
 *   app.js    ← 여기. 나머지 전부
 */
import { WORLD_PATHS } from './world.js';
import { sb } from './db.js?v=b356';

/* JOIN_URL 은 member.js 로 옮겼습니다(b337) — 쓰는 곳이 거기 한 줄뿐이라
   여기 둘 이유가 없었습니다. 왜 앱 주소가 아닌지도 같이 옮겼습니다. */
import { $, esc, toast, copyText, md, avatarOf, avatarImg, emptyDo,
         putHtml, dropHtml } from './dom.js?v=b356';
import { starHtml, paintStars, markRated } from './stars.js?v=b356';
import { fail, offNote, cacheGet, cacheSet, netIsDown, netTimeout, isOffline,
         write, flushQueue, drawOffbar, setOnDrained,
         setErrLogger, setReadOnly, NOROW } from './net.js?v=b356';
import { loadAdmin } from './admin.js?v=b356';
/* 취향으로 다음 도시를 고르는 계산. **AI 를 안 씁니다** — 오프라인에서도
   돌아야 하고, 같은 자료에는 늘 같은 답이 나와야 합니다(rec.js 맨 위 참고). */
/* ⚠ **화면은 아직 이걸 하나도 안 씁니다.** `__recCheck` 만 씁니다.
   취향 계산은 재보니 무작위와 별 차이가 없었고(rec.js 맨 위),
   확실한 것만 고르는 `certainPicks` 는 홈에 카드로 붙였다가 뺐습니다(b291) —
   '가보고 싶은 곳' 보관함에 이미 있는 걸 홈에 한 번 더 보여줄 뿐이었습니다.
   계산 자체는 멀쩡하니 남겨둡니다. 쓸 자리가 생기면 여기서 가져다 쓰면 됩니다. */
import { recommend, tasteOf, scoreCity, certainPicks } from './rec.js?v=b356';
import { arm, disarm, syncSheets, setSheetCloser, onSwipeX } from './ui.js?v=b356';
/* 지금 열려 있는 여행. 이름은 **살아 있는 연결**이라 읽는 쪽은 예전 그대로입니다.
   값을 넣는 것은 set* 를 지나가야 합니다 — 여기서 `trip = x` 라고 쓰면
   브라우저가 문법 오류를 내고 앱이 아예 안 뜹니다. 그게 이 분리의 핵심입니다. */
import { trip, plans, legs, members, expenses, bookings, transitLines,
         pickedDay, tab, catFilter, settleOn, todayOn, editPlanId,
         setTrip, clearTrip, setTripCloser,
         setPlans, setLegs, setMembers, setExpenses, setBookings, setTransitLines,
         setPickedDay, setTab, setCatFilter, setSettleOn, setTodayOn,
         setEditPlanId, nameOf } from './trip.js?v=b356';
/* 도시 평가. 네 화면이 같이 쓰는 자료라 한 곳이 어긋나면 넷이 같이 어긋납니다. */
import { myRates, cityStat, visited, justRated, rateFilter, avgTail,
         setRateData, setVisited, applyRate, putCityStat,
         clearJustRated, putRateFilter, clearRates } from './rate.js?v=b356';
/* 도시 사전과 찾기. 한 번 받으면 안 바뀝니다 — 여행이 바뀌어도 사람이 바뀌어도. */
import { cities, countryName, countryInfo, continentOf,
         useCities, addCity, search } from './cities.js?v=b356';
/* 여행 비서가 방금 내놓은 카드. 화면의 번호가 여기를 찾아가므로 통째로 갈아끼웁니다. */
import { suggested, aiTripId,
         setSuggested, clearSuggested, setAiTripId } from './ai.js?v=b356';
/* 성향 카드 화면. app.js 에서 떼어낸 첫 조각입니다(b321) — persona.js 머리말 참고. */
import { openPersona, closePersona, setPersonaCtx } from './persona.js?v=b356';
/* 세계지도·다녀온 국가. app.js 에서 떼어낸 두 번째 조각입니다(b322) —
   map.js 머리말 참고. UN_COUNTRIES 도 거기서 내보냅니다(두 곳에 적으면
   언젠가 한쪽만 고칩니다). */
import { openMap, closeMap, openCountries, closeCountries,
         shutBigMap, UN_COUNTRIES, setMapCtx } from './map.js?v=b356';
/* 보관함·배지. app.js 에서 떼어낸 세 번째 조각입니다(b323) — shelf.js 머리말 참고. */
import { openShelf, closeShelf, setShelfCtx } from './shelf.js?v=b356';
/* 도시 한 곳 화면. app.js 에서 떼어낸 네 번째 조각입니다(b324) — city.js 머리말 참고.
   map.js·shelf.js 도 openCity 를 쓰는데, 이제 ctx 로 넘기지 않고 그쪽이 직접
   import 합니다. 떼어낼수록 얽힘이 줄어드는 자리였습니다. */
import { openCity, closeCity, setCityCtx,
         isCityOpen, clearCityOpen } from './city.js?v=b356';
/* AI 대화 화면의 부품(점 세 개·사진 첨부·출처). 다섯 번째 조각입니다(b326) —
   aiui.js 머리말 참고. AI 덩어리 전체는 여행 상태와 얽혀 있어 못 뗐고,
   얽힘이 적은 앞부분만 가져왔습니다. */
import { showTyping, hideTyping, growMsg, fitJpeg, drawShot, drawSources,
         aiShots, SHOT_MAX, SRC_KO, setAiUiCtx } from './aiui.js?v=b356';
/* 여행 리포트. app.js 에서 떼어낸 여섯 번째 조각입니다(b333) — report.js 머리말 참고.
   이 화면은 끝에서 다른 화면으로 이어져서 ctx 가 깁니다(함수 다섯). */
import { drawReport, renderAiCard, setReportCtx } from './report.js?v=b356';
/* AI 제안 카드. app.js 에서 떼어낸 일곱 번째 조각입니다(b334) — cards.js 머리말 참고.
   LVCOLOR(검토 등급 색)도 거기서 내보냅니다 — 두 곳에 적으면 한쪽만 고칩니다. */
import { drawCards, openPlanForm, runReview,
         LVCOLOR, setCardsCtx } from './cards.js?v=b356';
import { loadExpenses, setExpenseCtx } from './expense.js?v=b356';
import { loadBookings, loadPacking, loadLinks, closeDocs } from './prep.js?v=b356';
import { loadMembers, handleJoin, ROLE_KO, setMemberCtx } from './member.js?v=b356';
import { drawPlanMap, mapLinks, memoMapUrl, splitParts, ensureLeaflet } from './planmap.js?v=b356';
import { loadCities, drawHits, drawPop, pick, picked, resetPick } from './citysearch.js?v=b356';
import { applyTs, setMyAvatar, setProfileCtx } from './profile.js?v=b356';
import { loadReview, setReviewCtx } from './review.js?v=b356';
import { loadRateData, loadRatings, drawRatings, saveRate, refreshVisited,
         setRateFilter, tripSub, resetRateHtml, setRatingCtx } from './rating.js?v=b356';
import { loadNotifPrefs, loadNotifs, setNotifyCtx } from './notify.js?v=b356';
import { openNew, movePrefs, setNewTripCtx } from './newtrip.js?v=b356';
import { loadHome, loadFootprint, heroTint, tripPhoto, closeReview,
         openTripReport, resetHomeSig, setHomeCtx } from './home.js?v=b356';
import { hhmm, osmLookup, setCandsCtx } from './cands.js?v=b356';
import './selfcheck.js?v=b356';
import { guessCat, setBringCtx } from './bring.js?v=b356';
import { loadTrash, TAB_TRASH, setTrashCtx } from './trash.js?v=b356';
import { review, mins, STAY_MIN, loadAi, setPlanCheckCtx } from './plancheck.js?v=b356';
import { openAi, closeAi, loadChats, aiToBottom, setAiScreenCtx } from './aiscreen.js?v=b356';
import { setAccountCtx } from './account.js?v=b356';
import { openDraft, closeDraft, setDraftCtx } from './draft.js?v=b356';
import { loadTrips, tripFilter, setTripFilter, setTripListCtx } from './triplist.js?v=b356';
import { inTrip, showTab, setTabsCtx } from './tabs.js?v=b356';
import { drawPlans, openPlans, setPlanViewCtx } from './planview.js?v=b356';
import { resetGeo, setGeocodeCtx } from './geocode.js?v=b356';
import { loadLegs, legIn, legFor, fillCityList, setLegsCtx } from './legs.js?v=b356';
import { drawCats, parseMemo, nice, lineChips, dayStat,
         catsOpen, setCatsOpen, setPlanLineCtx } from './planline.js?v=b356';
import { PERSONA_ICON, REPORT_ICON, PERSONA_BG, REPORT_BG,
         askImageSize, personaStats, judgePersona, cardImage } from './card.js?v=b356';
import { distKm, travel, hop, settleMath, dateRange, dayLabel, localTime, money,
         legAt, legNear, legFirst, travelMinutes, NO_CENTS, D1, asDate, hm, ymd, todayYmd } from './calc.js?v=b356';

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
setNotifyCtx({ me: () => me });
setAiScreenCtx({ me: () => me });
setAccountCtx({ me: () => me, logError });
setDraftCtx({ me: () => me, fillCityList, showApp, openTrip });
setTripListCtx({ me: () => me, openTrip, logError });
setTabsCtx({ appTab: () => appTab, showApp });
setPlanLineCtx({ drawDays, drawPlans });
/* ⚠ featOn 은 const 화살표라 이 줄에서는 아직 없습니다 — 그대로 적으면
   앱이 통째로 안 뜹니다(Cannot access before initialization).
   SPLIT.md '겪은 함정' 1번을 그대로 밟았습니다. 부를 때 찾게 미룹니다. */
setPlanViewCtx({ featOn: k => featOn(k), flags: () => flags, loadPlans });
setGeocodeCtx({ drawDays, featOn: k => featOn(k), loadPlans });
setLegsCtx({ drawDays, drawTripHeader, fetchTrip });
setNewTripCtx({ me: () => me, loadTrips, openTrip, openDraft });
setHomeCtx({ me: () => me, openTrip, showApp });
setCandsCtx({ loadPlans, openAi, loadChats });
setBringCtx({ openAi, loadChats, loadPlans });
setTrashCtx({ loadPlans });
setPlanCheckCtx({ loadChats });

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
    appTab = 'home';

/* 기기에 저장해 둔 글자 크기를 그리기 전에 먼저 씌웁니다 — 안 그러면 한 번 깜빡입니다. */
{
  const v = localStorage.getItem('t2:ts');
  if (v) document.documentElement.style.setProperty('--ts', v);
}

/* lastHtml · putHtml · dropHtml 은 dom.js 로 내렸습니다(b351, 맨 위 import).
   $ 하나만 쓰는 것이라 거기가 맞고, 네 화면이 쓰므로 app.js 에 두면
   떼어낸 조각마다 ctx 가 두 줄씩 늘어납니다. */

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

/* ── 내 계정 ──────────────────────────────────────────────────────────
 * 탈퇴 · 버그 신고 · 내 자료 내려받기는 account.js 로 옮겼습니다
 * (b349, 스물다섯 번째 조각). ctx 는 둘(me · logError)이고 **내보내는 것이
 * 없습니다** — 셋 다 자기 단추에 자기가 붙습니다. */
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
  setTripFilter(b.dataset.f);
  document.querySelectorAll('#tripfilter button').forEach(x =>
    x.classList.toggle('on', x.dataset.f === tripFilter));
  loadTrips();
});

/* ── 일정 검토 ────────────────────────────────────────────────────────
 * 계산만으로 하는 일정 검토는 plancheck.js 로 옮겼습니다
 * (b347, 스물세 번째 조각). ctx 는 하나(loadChats)입니다.
 * `loadAi`(AI 남은 횟수)도 그 범위에 섞여 있어 같이 갔습니다 — 여기
 * 홀로 남길 20줄이 아니라서지, 거기가 옳은 자리라서는 아닙니다. */
/* ── AI 대화 ──────────────────────────────────────────────────────────
 * AI 화면 여닫기와 대화 그리기는 aiscreen.js 로 옮겼습니다
 * (b348, 스물네 번째 조각). ctx 는 하나(me)입니다. */
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
/* ── AI 일정 초안 ─────────────────────────────────────────────────────
 * draft.js 로 옮겼습니다(b350, 스물여섯 번째 조각).
 * ctx 는 넷(me · fillCityList · showApp · openTrip)입니다.
 * **아래 showProfile 부터는 화면 전환 가족이라 남겼습니다** — 위 머리말이
 * 그것까지 덮고 있었을 뿐입니다. */

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

/* 내 자료 내려받기도 account.js 로 갔습니다(b349). 아래 '보관함·지도 열기'
   손잡이는 **여기 남깁니다** — 바로 붙어 있었지만 화면 넘기기입니다. */

/* 보관함과 숫자를 누르면 평가 탭으로 걸러서 보냅니다. */
$('setview').addEventListener('click', e => {
  /* 국가 타일은 세계지도로. 보관함은 도시가 주인공이라 "어느 나라를 갔나"에
     답을 못 합니다 — 그 답은 지도 화면의 대륙별·국가별에 있습니다. */
  if (e.target.closest('button[data-openmap]')) return openCountries();
  const b = e.target.closest('button[data-shelf]'); if (!b) return;
  /* 다녀온 여행 칸은 없앴습니다. 여행 탭에 이미 있습니다. */
  openShelf(b.dataset.shelf);
});
/* ── AI 화면 여닫기 ───────────────────────────────────────────────────
 * openAi · closeAi · 대화 지우기는 aiscreen.js 로 갔습니다(b348).
 * 바로 아래 있던 **종 알림은 notify.js 로** 갔습니다 — 옆줄에 있었을 뿐
 * 상관없는 것이었습니다. */
/* ── 프로필 ───────────────────────────────────────────────────────────
 * 사진·이름·글자 크기는 profile.js 로 옮겼습니다(b340, 열세 번째 조각).
 * ctx 는 하나(me)입니다. `myAvatar` 도 그리로 갔습니다 — 아래 로그인
 * 직후에 채우는 자리는 setMyAvatar 로 넣습니다. */
/* ── 여행 목록 ────────────────────────────────────────────────────────
 * 여행 목록과 카드 사진 채우기는 triplist.js 로 옮겼습니다
 * (b351, 스물일곱 번째 조각). ctx 는 셋(me · openTrip · logError)입니다.
 * `tripFilter` 도 그리로 갔습니다 — 아래 거르개 단추는 setTripFilter 로
 * 넣습니다(밖에서 `=` 로 넣으면 import 한 값은 안 바뀝니다). */
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

/* ── 구간 ─────────────────────────────────────────────────────────────
 * 구간(날짜를 도시로 나눈 것)과 도시 고르개 채우기는 legs.js 로
 * 옮겼습니다(b356, 서른두 번째 조각).
 * ctx 는 셋(drawDays · drawTripHeader · fetchTrip)입니다. */
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
/* catsOpen 은 planline.js 로 갔습니다(b353) — 읽는 곳이 거기 drawCats
   뿐입니다. 누르는 손잡이는 여기 남아 setCatsOpen 으로 넣습니다. */
$('days').addEventListener('click', e => {
  if (!e.target.closest('[data-catstoggle]')) return;
  setCatsOpen(!catsOpen);
  if (!catsOpen && catFilter) setCatFilter('');
  drawDays(); drawCats(); drawPlans(); drawPlanMap();
});

$('days').addEventListener('change', e => {
  if (e.target.id !== 'daysel') return;
  setPickedDay(e.target.value || null);
  drawDays(); drawCats(); drawPlans(); drawPlanMap();
});

/* ── 일정 줄 그리기 부품 ──────────────────────────────────────────────
 * drawCats · parseMemo · nice · lineChips · dayStat 는 planline.js 로
 * 옮겼습니다(b353, 스물아홉 번째 조각). ctx 는 둘(drawDays · drawPlans).
 * b345 에 '추천 검사' 머리말 아래 섞여 있던 것을 그때는 두고 갔던 것입니다. */
/* ── 일정 화면 ────────────────────────────────────────────────────────
 * 일정 그리기(drawPlans)와 끌어서 순서 바꾸기는 planview.js 로 옮겼습니다
 * (b354, 서른 번째 조각). ctx 는 셋(featOn · flags · loadPlans).
 * `openPlans`(펼친 줄) 도 그리로 갔습니다 — Set 이라 아래 손잡이가
 * add/delete 해도 저쪽이 같은 것을 봅니다. */
/* ── 일정 불러오기 ────────────────────────────────────────────────────
 * 분류 짐작과 파일·사진에서 불러오기는 bring.js 로 옮겼습니다
 * (b346, 스물한 번째 조각). ctx 는 셋(openAi · loadChats · loadPlans)입니다. */
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

/* 펼친 줄(openPlans)은 planview.js 로 갔습니다(b354) — 그리는 쪽이 거깁니다. */
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

/* ── 지운 것 되살리기 ─────────────────────────────────────────────────
 * trash.js 로 옮겼습니다(b346, 스물두 번째 조각). ctx 는 하나(loadPlans).
 * TAB_TRASH 도 그리로 갔습니다 — 아래 탭 구역이 거기서 가져다 씁니다. */
/* ── 탭 ───────────────────────────────────────────────────────────────
 * 여행 상세의 네 구역(일정·지출·준비·일행)과 좌우 쓸어 넘기기는
 * tabs.js 로 옮겼습니다(b352, 스물여덟 번째 조각).
 * ctx 는 둘(appTab · showApp)입니다. */
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
  resetGeo();
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

/* ── 붙여넣은 지도 링크에서 위치 찾기 ─────────────────────────────────
 * geocode.js 로 옮겼습니다(b355, 서른한 번째 조각).
 * ctx 는 셋(drawDays · featOn · loadPlans)입니다.
 * `planGeo`·`geoAsked` 도 그리로 갔습니다 — 위 일정 칸이 비우던 자리는
 * `resetGeo()` 로 바뀌었습니다. */
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
