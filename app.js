/* ── 진입점 ────────────────────────────────────────────────────────
 * 층은 이렇게 흐릅니다. 위가 아래에 기대고, 거꾸로는 없습니다(순환 참조 방지).
 *   dom.js · db.js · calc.js · stars.js   ← 아무것도 import 안 하는 잎
 *   net.js · ui.js   (dom.js 만)
 *   admin.js  (dom.js · db.js · net.js)
 *   app.js    ← 여기. 나머지 전부
 */
import { WORLD_PATHS } from './world.js';
import { sb } from './db.js?v=b398';

/* JOIN_URL 은 member.js 로 옮겼습니다(b337) — 쓰는 곳이 거기 한 줄뿐이라
   여기 둘 이유가 없었습니다. 왜 앱 주소가 아닌지도 같이 옮겼습니다. */
import { $, esc, toast, copyText, md, avatarOf, avatarImg, emptyDo,
         putHtml, dropHtml } from './dom.js?v=b398';
import { starHtml, paintStars, markRated } from './stars.js?v=b398';
import { fail, offNote, cacheGet, cacheSet, netIsDown, netTimeout, isOffline,
         write, flushQueue, drawOffbar, setOnDrained,
         setErrLogger, setReadOnly, NOROW } from './net.js?v=b398';
import { loadAdmin } from './admin.js?v=b398';
/* 취향으로 다음 도시를 고르는 계산. **AI 를 안 씁니다** — 오프라인에서도
   돌아야 하고, 같은 자료에는 늘 같은 답이 나와야 합니다(rec.js 맨 위 참고). */
/* ⚠ **화면은 아직 이걸 하나도 안 씁니다.** `__recCheck` 만 씁니다.
   취향 계산은 재보니 무작위와 별 차이가 없었고(rec.js 맨 위),
   확실한 것만 고르는 `certainPicks` 는 홈에 카드로 붙였다가 뺐습니다(b291) —
   '가보고 싶은 곳' 보관함에 이미 있는 걸 홈에 한 번 더 보여줄 뿐이었습니다.
   계산 자체는 멀쩡하니 남겨둡니다. 쓸 자리가 생기면 여기서 가져다 쓰면 됩니다. */
import { recommend, tasteOf, scoreCity, certainPicks } from './rec.js?v=b398';
import { arm, disarm, syncSheets, setSheetCloser, onSwipeX } from './ui.js?v=b398';
/* 지금 열려 있는 여행. 이름은 **살아 있는 연결**이라 읽는 쪽은 예전 그대로입니다.
   값을 넣는 것은 set* 를 지나가야 합니다 — 여기서 `trip = x` 라고 쓰면
   브라우저가 문법 오류를 내고 앱이 아예 안 뜹니다. 그게 이 분리의 핵심입니다. */
import { trip, plans, legs, members, expenses, bookings, transitLines,
         pickedDay, tab, catFilter, settleOn, todayOn, editPlanId,
         setTrip, clearTrip, setTripCloser,
         setPlans, setLegs, setMembers, setExpenses, setBookings, setTransitLines,
         setPickedDay, setTab, setCatFilter, setSettleOn, setTodayOn,
         setEditPlanId, setPlanSeedGeo, nameOf } from './trip.js?v=b398';
/* 도시 평가. 네 화면이 같이 쓰는 자료라 한 곳이 어긋나면 넷이 같이 어긋납니다. */
import { myRates, cityStat, visited, justRated, rateFilter, avgTail,
         setRateData, setVisited, applyRate, putCityStat,
         clearJustRated, putRateFilter, clearRates } from './rate.js?v=b398';
/* 도시 사전과 찾기. 한 번 받으면 안 바뀝니다 — 여행이 바뀌어도 사람이 바뀌어도. */
import { cities, countryName, countryInfo, continentOf,
         useCities, addCity, search } from './cities.js?v=b398';
/* 여행 비서가 방금 내놓은 카드. 화면의 번호가 여기를 찾아가므로 통째로 갈아끼웁니다. */
import { suggested, aiTripId,
         setSuggested, clearSuggested, setAiTripId } from './ai.js?v=b398';
/* 성향 카드 화면. app.js 에서 떼어낸 첫 조각입니다(b321) — persona.js 머리말 참고. */
import { openPersona, closePersona, setPersonaCtx } from './persona.js?v=b398';
/* 세계지도·다녀온 국가. app.js 에서 떼어낸 두 번째 조각입니다(b322) —
   map.js 머리말 참고. UN_COUNTRIES 도 거기서 내보냅니다(두 곳에 적으면
   언젠가 한쪽만 고칩니다). */
import { openMap, closeMap, openCountries, closeCountries,
         shutBigMap, UN_COUNTRIES, setMapCtx } from './map.js?v=b398';
/* 보관함·배지. app.js 에서 떼어낸 세 번째 조각입니다(b323) — shelf.js 머리말 참고. */
import { openShelf, closeShelf, setShelfCtx } from './shelf.js?v=b398';
/* 도시 한 곳 화면. app.js 에서 떼어낸 네 번째 조각입니다(b324) — city.js 머리말 참고.
   map.js·shelf.js 도 openCity 를 쓰는데, 이제 ctx 로 넘기지 않고 그쪽이 직접
   import 합니다. 떼어낼수록 얽힘이 줄어드는 자리였습니다. */
import { openCity, closeCity, setCityCtx,
         isCityOpen, clearCityOpen } from './city.js?v=b398';
/* AI 대화 화면의 부품(점 세 개·사진 첨부·출처). 다섯 번째 조각입니다(b326) —
   aiui.js 머리말 참고. AI 덩어리 전체는 여행 상태와 얽혀 있어 못 뗐고,
   얽힘이 적은 앞부분만 가져왔습니다. */
import { showTyping, hideTyping, growMsg, fitJpeg, drawShot, drawSources,
         aiShots, SHOT_MAX, SRC_KO, setAiUiCtx } from './aiui.js?v=b398';
/* 여행 리포트. app.js 에서 떼어낸 여섯 번째 조각입니다(b333) — report.js 머리말 참고.
   이 화면은 끝에서 다른 화면으로 이어져서 ctx 가 깁니다(함수 다섯). */
import { drawReport, renderAiCard, setReportCtx } from './report.js?v=b398';
/* AI 제안 카드. app.js 에서 떼어낸 일곱 번째 조각입니다(b334) — cards.js 머리말 참고.
   LVCOLOR(검토 등급 색)도 거기서 내보냅니다 — 두 곳에 적으면 한쪽만 고칩니다. */
import { drawCards, openPlanForm, runReview,
         LVCOLOR, setCardsCtx } from './cards.js?v=b398';
import { loadExpenses, setExpenseCtx } from './expense.js?v=b398';
import { loadBookings, loadPacking, loadLinks, closeDocs } from './prep.js?v=b398';
import { loadMembers, handleJoin, ROLE_KO, setMemberCtx } from './member.js?v=b398';
import { drawPlanMap, mapLinks, memoMapUrl, splitParts, ensureLeaflet } from './planmap.js?v=b398';
import { loadCities, drawHits, drawPop, pick, picked, resetPick } from './citysearch.js?v=b398';
import { applyTs, setMyAvatar, setProfileCtx } from './profile.js?v=b398';
import { loadReview, setReviewCtx } from './review.js?v=b398';
import { loadRateData, loadRatings, drawRatings, saveRate, refreshVisited,
         setRateFilter, tripSub, resetRateHtml, setRatingCtx } from './rating.js?v=b398';
import { loadNotifPrefs, loadNotifs, setNotifyCtx } from './notify.js?v=b398';
import { openNew, movePrefs, setNewTripCtx } from './newtrip.js?v=b398';
import { loadHome, loadFootprint, heroTint, tripPhoto, closeReview,
         openTripReport, resetHomeSig, setHomeCtx } from './home.js?v=b398';
import { hhmm, osmLookup, setCandsCtx } from './cands.js?v=b398';
import './selfcheck.js?v=b398';
import { guessCat, setBringCtx } from './bring.js?v=b398';
import { loadTrash, TAB_TRASH, setTrashCtx } from './trash.js?v=b398';
import { review, mins, STAY_MIN, loadAi, setPlanCheckCtx } from './plancheck.js?v=b398';
import { openAi, closeAi, loadChats, aiToBottom, setAiScreenCtx } from './aiscreen.js?v=b398';
import { setAccountCtx } from './account.js?v=b398';
import { openDraft, closeDraft, setDraftCtx } from './draft.js?v=b398';
import { loadTrips, tripFilter, setTripFilter, setTripListCtx } from './triplist.js?v=b398';
import { inTrip, showTab, setTabsCtx } from './tabs.js?v=b398';
import { drawPlans, openPlans, setPlanViewCtx } from './planview.js?v=b398';
import { resetGeo, setGeocodeCtx } from './geocode.js?v=b398';
import { loadLegs, legIn, legFor, fillCityList, setLegsCtx } from './legs.js?v=b398';
import { drawDays, loadPlans, backToList, setTripViewCtx } from './tripview.js?v=b398';
import { drawToday } from './today.js?v=b398';
import { openTrip, fetchTrip, drawTripHeader, unwatch, setOpenTripCtx } from './opentrip.js?v=b398';
import { flags, featOn, loadFlags } from './flags.js?v=b398';
import { setSwRegCtx } from './swreg.js?v=b398';
import { drawCats, parseMemo, nice, lineChips, dayStat,
         catsOpen, setCatsOpen, setPlanLineCtx } from './planline.js?v=b398';
import { distKm, travel, hop, settleMath, dateRange, dayLabel, localTime, money,
         legAt, legNear, legFirst, travelMinutes, NO_CENTS, D1, asDate, hm, ymd, todayYmd } from './calc.js?v=b398';

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
setPlanViewCtx({ loadPlans });
/* 빈 일정 화면의 「AI 로 하루씩 짜기」. 보이지 않는 단추를 `data-go` 가
   대신 누릅니다(planview.js 의 emptyDo). 초안을 아는 곳이 여기라 여기서 잇습니다. */
$('draftbtn')?.addEventListener('click', () => { if (trip?.id) openDraft(trip.id, true); });
setGeocodeCtx({ drawDays, loadPlans });
setLegsCtx({ drawDays, drawTripHeader, fetchTrip });
setTripViewCtx({ appTab: () => appTab, showApp, openTrip, drawToday });
setOpenTripCtx({ me: () => me, appTab: () => appTab });
setSwRegCtx({ logError });
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


/* ── 서비스 워커 ──────────────────────────────────────────────────────
 * 등록과 새 판 확인은 swreg.js 로 옮겼습니다(b361, 서른일곱 번째 조각).
 * ctx 는 하나(logError)이고 내보내는 것이 없습니다 — 스스로 등록하고
 * 스스로 지켜봅니다. */
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
/* ── 만든 사람이 켜고 끄는 것들 ───────────────────────────────────────
 * flags.js 로 옮겼습니다(b360, 서른여섯 번째 조각). 딸린 것이 없습니다.
 * planview.js 와 geocode.js 가 ctx 로 받던 featOn·flags 를 이제 직접
 * import 합니다 — 그쪽 ctx 가 각각 둘씩 줄었습니다. */
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
/* ── 여행 열기 · 실시간 ───────────────────────────────────────────────
 * openTrip · fetchTrip · drawTripHeader 와 실시간(watch/unwatch)은
 * opentrip.js 로 옮겼습니다(b359, 서른다섯 번째 조각).
 * ctx 는 둘(me · appTab)입니다. channel · bumpTimer · bumpPending 도
 * 그리로 갔습니다 — 실시간의 상태입니다. */
/* ── 구간 ─────────────────────────────────────────────────────────────
 * 구간(날짜를 도시로 나눈 것)과 도시 고르개 채우기는 legs.js 로
 * 옮겼습니다(b356, 서른두 번째 조각).
 * ctx 는 셋(drawDays · drawTripHeader · fetchTrip)입니다. */
/* ── 여행 후기 ────────────────────────────────────────────────────────
 * 후기·후기 사진은 review.js 로 옮겼습니다(b340, 열네 번째 조각).
 * ctx 는 하나(me)입니다. `myReview` 도 그리로 갔습니다 — 쓰는 곳이
 * 거기뿐이었습니다. */
/* ── 여행 상세의 뼈대 ─────────────────────────────────────────────────
 * 날짜 줄(drawDays) · 일정 받아오기(loadPlans) · 정보 수정 · 목록으로
 * 돌아가기(backToList)는 tripview.js 로 옮겼습니다
 * (b357, 서른세 번째 조각). ctx 는 넷(appTab · showApp · openTrip · drawToday). */
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
/* ── 오늘 화면 ────────────────────────────────────────────────────────
 * 날씨와 '오늘' 카드는 today.js 로 옮겼습니다(b358, 서른네 번째 조각).
 * **딸린 것이 없어 ctx 가 없습니다.** */
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
  $('p_formtitle').textContent = '일정 추가';   /* 고치기에서 돌아올 때 되돌립니다 */
  /* 손으로 새로 여는 것이므로 앞서 카드에서 들고 온 좌표는 버립니다.
     openPlanForm 은 이 뒤에 다시 채웁니다. */
  setPlanSeedGeo(null);
  /* 앞서 붙여넣은 링크의 결과도 같이 버립니다. 안 그러면 다음 일정에
     엉뚱한 위치가 딸려 들어갑니다 — 조용히 틀리는 종류입니다. */
  resetGeo();
  $('plancard').classList.toggle('hide');
  if ($('plancard').classList.contains('hide')) return;
  $('p_date').value = pickedDay || trip.start_date;
  $('p_date').min = '';                    /* 여행 기간 밖도 넣을 수 있어야 합니다 */
  $('p_cat').dataset.touched = '';         /* 새 폼이니 짐작을 다시 켭니다 */
  /* ⚠ **여기서 아무것도 스크롤하지 않습니다. 초점도 주지 않습니다**(b366).
     전에는 `$('p_title').focus()` 가 있었고, 그것이 두 가지를 하고 있었습니다 —
     키보드를 띄우고, 겸사겸사 폼으로 화면을 끌어가고.

     **그런데 끌어갈 곳이 문서 맨 아래였습니다.** `#plancard` 는 일정 목록
     전체를 지나 있습니다. 그래서 `추가` 를 누르면 화면이 맨 밑으로
     굴러갔습니다 — 사용자가 그렇게 말해줬고, 재보니 스크롤 0 → 5881 이었습니다.

     끌어갈 필요가 애초에 없습니다. `plancard` 는 `SHEETS` 에 있어서
     `syncSheets` 가 `.assheet`(`position:fixed`, 화면 바닥)로 바꿉니다.
     **다만 그 변환은 MutationObserver 라 한 박자 늦게 옵니다** — 누르는
     순간에는 아직 문서 아래의 보통 요소라, 그때 스크롤하면 맨 밑으로 갑니다.
     재서 확인했습니다(누른 직후 `position: static`, 잠시 뒤 `fixed`).
     **시트로 뜨는 것에는 scrollIntoView 를 걸지 마십시오.**

     초점도 안 줍니다. 열자마자 키보드가 화면 절반을 덮으면, 날짜나 분류를
     먼저 정하려던 사람은 그것부터 내려야 합니다. 칸을 누르면 그때 올라옵니다. */
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
