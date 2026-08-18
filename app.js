/* ── 진입점 ────────────────────────────────────────────────────────
 * 층은 이렇게 흐릅니다. 위가 아래에 기대고, 거꾸로는 없습니다(순환 참조 방지).
 *   dom.js · db.js · calc.js · stars.js   ← 아무것도 import 안 하는 잎
 *   net.js · ui.js   (dom.js 만)
 *   admin.js  (dom.js · db.js · net.js)
 *   app.js    ← 여기. 나머지 전부
 */
import { WORLD_PATHS } from './world.js';
import { sb } from './db.js?v=b322';

/* ── 초대 링크가 지나가는 자리 ────────────────────────────────────────
 * ⚠ **앱 주소가 아닙니다.** 앱은 GitHub Pages 에 올라간 정적 index.html
 *   한 장이라 `?join=` 을 붙여도 메신저 미리보기 카드가 안 바뀝니다 —
 *   크롤러는 자바스크립트를 안 돌리고 `<meta og:>` 만 읽습니다. 여행마다
 *   다른 카드를 만들려면 여행마다 다른 HTML 을 내주는 자리가 있어야 합니다.
 *   그 자리가 deno/join.ts 입니다. 사람은 눌러서 0.1초 만에 앱에 닿습니다.
 *
 * ⚠ **왜 Supabase 엣지 함수가 아닌가.** 처음엔 거기 올렸고 코드도 잘 돌았는데
 *   카톡에 카드가 아예 안 떴습니다. 응답 헤더에 `Server: cloudflare` 와
 *   `set-cookie: __cf_bm=`(봇 감지)이 있었습니다. 같은 링크를 github.io
 *   주소로 보내면 카드가 떴고요. Cloudflare 를 안 지나는 자리로 옮겼습니다.
 *   자세한 것은 deno/join.ts 머리말에.
 *
 * 예전에 보낸 `?join=` 링크도 그대로 됩니다 — 받는 쪽은 안 건드렸습니다. */
const JOIN_URL = 'https://loyal-bat-8481.honeychelsea123.deno.net/';
import { $, esc, toast, copyText } from './dom.js?v=b322';
import { starHtml, paintStars, markRated } from './stars.js?v=b322';
import { fail, offNote, cacheGet, cacheSet, netIsDown, netTimeout, isOffline,
         write, flushQueue, drawOffbar, setOnDrained,
         setErrLogger, setReadOnly, NOROW } from './net.js?v=b322';
import { loadAdmin } from './admin.js?v=b322';
/* 취향으로 다음 도시를 고르는 계산. **AI 를 안 씁니다** — 오프라인에서도
   돌아야 하고, 같은 자료에는 늘 같은 답이 나와야 합니다(rec.js 맨 위 참고). */
/* ⚠ **화면은 아직 이걸 하나도 안 씁니다.** `__recCheck` 만 씁니다.
   취향 계산은 재보니 무작위와 별 차이가 없었고(rec.js 맨 위),
   확실한 것만 고르는 `certainPicks` 는 홈에 카드로 붙였다가 뺐습니다(b291) —
   '가보고 싶은 곳' 보관함에 이미 있는 걸 홈에 한 번 더 보여줄 뿐이었습니다.
   계산 자체는 멀쩡하니 남겨둡니다. 쓸 자리가 생기면 여기서 가져다 쓰면 됩니다. */
import { recommend, tasteOf, scoreCity, certainPicks } from './rec.js?v=b322';
import { arm, disarm, syncSheets, setSheetCloser, onSwipeX } from './ui.js?v=b322';
/* 지금 열려 있는 여행. 이름은 **살아 있는 연결**이라 읽는 쪽은 예전 그대로입니다.
   값을 넣는 것은 set* 를 지나가야 합니다 — 여기서 `trip = x` 라고 쓰면
   브라우저가 문법 오류를 내고 앱이 아예 안 뜹니다. 그게 이 분리의 핵심입니다. */
import { trip, plans, legs, members, expenses, bookings, transitLines,
         pickedDay, tab, catFilter, settleOn, todayOn, editPlanId,
         setTrip, clearTrip, setTripCloser,
         setPlans, setLegs, setMembers, setExpenses, setBookings, setTransitLines,
         setPickedDay, setTab, setCatFilter, setSettleOn, setTodayOn,
         setEditPlanId } from './trip.js?v=b322';
/* 도시 평가. 네 화면이 같이 쓰는 자료라 한 곳이 어긋나면 넷이 같이 어긋납니다. */
import { myRates, cityStat, visited, justRated, rateFilter,
         setRateData, setVisited, applyRate, putCityStat,
         clearJustRated, putRateFilter, clearRates } from './rate.js?v=b322';
/* 도시 사전과 찾기. 한 번 받으면 안 바뀝니다 — 여행이 바뀌어도 사람이 바뀌어도. */
import { cities, countryName, countryInfo, continentOf,
         useCities, addCity, search } from './cities.js?v=b322';
/* 여행 비서가 방금 내놓은 카드. 화면의 번호가 여기를 찾아가므로 통째로 갈아끼웁니다. */
import { suggested, aiTripId,
         setSuggested, clearSuggested, setAiTripId } from './ai.js?v=b322';
/* 성향 카드 화면. app.js 에서 떼어낸 첫 조각입니다(b321) — persona.js 머리말 참고. */
import { openPersona, closePersona, setPersonaCtx } from './persona.js?v=b322';
/* 세계지도·다녀온 국가. app.js 에서 떼어낸 두 번째 조각입니다(b322) —
   map.js 머리말 참고. UN_COUNTRIES 도 거기서 내보냅니다(두 곳에 적으면
   언젠가 한쪽만 고칩니다). */
import { openMap, closeMap, openCountries, closeCountries,
         shutBigMap, flagOk, UN_COUNTRIES, setMapCtx } from './map.js?v=b322';
import { PERSONA_ICON, REPORT_ICON, PERSONA_BG, REPORT_BG,
         askImageSize, personaStats, judgePersona, cardImage } from './card.js?v=b322';
import { distKm, travel, hop, settleMath, dateRange, dayLabel, localTime, money,
         legAt, legNear, legFirst, travelMinutes, NO_CENTS } from './calc.js?v=b322';

/* persona.js 는 app.js 를 import 하지 않습니다 — 그러면 app → persona → app
   으로 고리가 생깁니다. app.js 만 아는 셋을 여기서 넣어줍니다.
   me 는 로그인할 때마다 바뀌므로 값이 아니라 함수로 줍니다. 값으로 주면
   로그인 전의 null 을 영영 들고 있게 됩니다.
   loadCities·showApp 은 함수 선언이라 여기서 참조해도 됩니다(끌어올려집니다). */
setPersonaCtx({ me: () => me, loadCities, showApp });
setMapCtx({ me: () => me, loadCities, openCity });

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
    /* 도시 고르개가 지금 무엇을 보여주고 있나. **여기 남긴 이유가 있습니다** —
       `pick()` 하나가 화면 여덟 곳을 씁니다. 떼면 그만큼을 다시 넣어줘야 해서
       얻는 것보다 잃는 것이 큽니다. 규칙이 있는 절반(search)만 cities.js 로
       보냈습니다. */
    picked = null, hitList = [], cursor = 0,
    channel = null, bumpTimer = null, bumpPending = null,
    appTab = 'home',
    lastHomeSig = '',
    tripFilter = 'up', rateShown = 80, rateObs = null, openReview = false, myAvatar = null, myReview = {}, cityOpen = null,
    /* 기록 목록을 마지막으로 그린 글자. 같으면 다시 안 그립니다 — 사진이
       깜빡이는 것을 막습니다(drawRatings 참고). **목록을 밖에서 건드리면
       반드시 '' 로 되돌립니다.** 안 그러면 "같으니 건드리지 말자"가
       화면과 어긋난 채로 굳습니다. */
    lastRateHtml = '';

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

/* ── 알림 설정 ──────────────────────────────────────────────────────
 * 끌 수 없는 알림은 결국 앱 자체를 지우게 만듭니다.
 * **화면에서 숨기는 것이 아니라 서버에서 아예 안 만듭니다** (035 의 notify_wants).
 * 화면에서 거르면 줄은 계속 쌓이고, 기기를 바꾸면 안 보이던 것이 우르르 나옵니다.
 *
 * 나중에 잠금화면 알림(푸시)을 붙일 때 이 스위치들을 그대로 씁니다 —
 * "무엇을 알릴지"는 여기서 정하고, 그때는 "어떻게 받을지" 하나만 더 붙입니다. */
/* 처음엔 종류별로 셋을 두었는데 알림이 셋뿐이라 설정이 알림보다 복잡했습니다.
   스위치 하나로 줄였습니다. **표의 종류별 칸(035)은 그대로 둡니다** —
   기본값이 켬이라 전체 스위치만 보면 되고, 나중에 다시 나누고 싶으면
   화면만 붙이면 됩니다. 안 쓰는 칸을 지우려고 마이그레이션을 또 돌릴 이유가 없습니다. */
async function loadNotifPrefs(){
  /* **`*` 를 씁니다.** 칸을 하나씩 적었더니 064·065 를 올릴 때마다 여기도
     고쳐야 했고, 한 번 빠뜨리면 "설정이 저장은 되는데 다시 열면 사라진다"가
     됩니다. 아직 안 올린 곳에서는 그 칸이 안 올 뿐 질의는 성공합니다 —
     칸 이름을 적으면 그때는 질의 자체가 실패해서 카드가 통째로 사라집니다. */
  const { data, error } = await sb.from('user_prefs')
    .select('*').eq('user_id', me.id).maybeSingle();
  /* 035 를 아직 안 올렸으면 칸이 없어서 질의가 실패합니다.
     그때는 설정 카드를 아예 숨깁니다 — 눌러도 저장이 안 되는 스위치를 두면 안 됩니다. */
  if (error){ $('notifprefcard').classList.add('hide'); return; }
  $('notifprefcard').classList.remove('hide');
  $('nf_all').checked = data ? data.notify_all !== false : true;
  /* 064 를 아직 안 올린 곳에서는 칸이 없습니다. 그때는 기본값으로 그립니다 —
     화면이 비는 것보다 낫고, 저장할 때 오류가 뜨면 그때 알게 됩니다. */
  putKinds(data?.notify_plan || 'first', data?.notify_flight !== false);
  saveHomeTz(data?.home_tz);
  drawPushRow();
}

/* **집이 어느 시간대인지 브라우저만 압니다.**
 * 출국편 알림이 1시간 일찍 오던 것을 여기서 막습니다 — 사람이 적는 출발
 * 시각은 표에 적힌 그대로, 즉 **출발 공항의 현지 시각**입니다. 그런데 우리는
 * 출발 공항을 모릅니다. 여행 첫날까지의 비행기는 집에서 뜬다고 보고(065),
 * 그 '집'이 어디인지를 여기서 알려줍니다.
 *
 * **바뀌었을 때만 씁니다.** 설정 화면을 열 때마다 upsert 하면 쓸 일 없는
 * 쓰기가 계속 나갑니다. 이사하거나 오래 머무는 곳이 바뀌면 그때 한 번입니다. */
async function saveHomeTz(now){
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch {}
  if (!tz || tz === now) return;
  /* 065 를 아직 안 올렸으면 칸이 없어 실패합니다. 조용히 넘어갑니다 —
     이건 사용자가 부탁한 일이 아니라 우리가 알아서 하는 일입니다. */
  await sb.from('user_prefs')
    .upsert({ user_id: me.id, home_tz: tz }, { onConflict:'user_id' });
}

/* 고른 것을 화면에 얹습니다. 저장한 뒤에도 이 함수로 다시 그립니다 —
   두 곳에서 따로 칠하면 한쪽만 고치게 됩니다. */
function putKinds(plan, flight){
  document.querySelectorAll('#nf_plan [data-pl]').forEach(b =>
    b.classList.toggle('on', b.dataset.pl === plan));
  $('nf_flight').checked = flight;
}

async function saveKinds(row){
  $('nferr').classList.add('hide');
  const r = await sb.from('user_prefs')
    .upsert({ user_id: me.id, ...row }, { onConflict:'user_id' })
    .select('notify_plan,notify_flight');
  if (r.error || !r.data?.length){
    await loadNotifPrefs();               /* 화면을 진짜 값으로 되돌립니다 */
    return fail(r.error || NOROW.save, 'nf');
  }
  putKinds(r.data[0].notify_plan, r.data[0].notify_flight);
  return true;
}

$('nf_plan').addEventListener('click', async e => {
  const b = e.target.closest('[data-pl]'); if (!b) return;
  /* 먼저 칠하고 저장합니다. 기다렸다 칠하면 누른 것이 안 눌린 것처럼 보입니다. */
  putKinds(b.dataset.pl, $('nf_flight').checked);
  if (await saveKinds({ notify_plan: b.dataset.pl }))
    toast({ all:'모든 일정을 알려드려요', first:'그날 첫 일정만 알려드려요',
            off:'일정 알림을 껐어요' }[b.dataset.pl]);
});

$('notifprefcard').addEventListener('change', async e => {
  if (e.target.id !== 'nf_flight') return;
  await saveKinds({ notify_flight: $('nf_flight').checked });
});

$('notifprefcard').addEventListener('change', async e => {
  if (e.target.id !== 'nf_all') return;
  $('nferr').classList.add('hide');
  const on = $('nf_all').checked;
  /* 설정 줄이 아직 없는 계정도 있어서 upsert 로 넣습니다. */
  const r = await sb.from('user_prefs')
    .upsert({ user_id: me.id, notify_all: on }, { onConflict:'user_id' })
    .select('user_id');
  if (r.error){ $('nf_all').checked = !on; return fail(r.error, 'nf'); }
  if (!r.data?.length){ $('nf_all').checked = !on;
                        return fail(NOROW.save, 'nf'); }
  toast(on ? '알림을 다시 받아요' : '알림을 껐어요');
  loadNotifs();          /* 껐으면 종에 남아 있던 개수도 다시 셉니다 */
});

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

/* ── 잠금화면 알림 (Web Push) ───────────────────────────────────────
 * `notify_all` 이 "무엇을 알릴지"이고, 여기는 "어떻게 받을지"입니다.
 * 스위치를 두 벌 두면 하나를 껐는데 다른 쪽으로 계속 옵니다 —
 * 그래서 이 스위치는 **기기 등록**만 맡습니다. 무엇을 보낼지는
 * 위 스위치가 정합니다(035 의 notify_wants).
 *
 * **아이폰은 홈 화면에 담아야만 됩니다.** 사파리 탭에서는 `PushManager`
 * 자체가 없습니다. 눌러도 안 되는 스위치를 두면 고장으로 보이므로,
 * 못 하는 자리에서는 왜 못 하는지 적어둡니다. */
const VAPID_PUB = 'BKHqArbSZ6R78C-rwKrRs42lvSgYadpp5LLGfJUh2Xg4jzbcJiUv_5NanYsyYoRaeJtGuD9w7cs51vP1xveNBqM';

/* base64url → 바이트. 브라우저가 이 꼴로만 키를 받습니다. */
function b64ToBytes(s){
  const p = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4);
  const raw = atob(p);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

const pushOk = () => 'serviceWorker' in navigator && 'PushManager' in window
                  && 'Notification' in window;

async function drawPushRow(){
  const sw = $('nf_push'), why = $('pushwhy');
  why.classList.add('hide');
  /* **종류 고르기는 켜져 있을 때만 보여줍니다.** 안 받는 사람에게 무엇을
     받을지 묻는 칸이 세 줄 서 있으면 설정이 알림보다 복잡해집니다. */
  const kinds = on => $('pushkinds').classList.toggle('hide', !on);
  kinds(false);
  if (!pushOk()){
    sw.checked = false; sw.disabled = true;
    why.textContent = matchMedia('(display-mode: standalone)').matches
      ? '이 기기는 잠금화면 알림을 지원하지 않아요.'
      : '홈 화면에 담아서 열면 잠금화면 알림을 켤 수 있어요. ' +
        '(공유 → 홈 화면에 추가)';
    why.classList.remove('hide');
    return;
  }
  if (Notification.permission === 'denied'){
    sw.checked = false; sw.disabled = true;
    why.textContent = '기기 설정에서 이 앱의 알림이 꺼져 있어요. 거기서 켜주세요.';
    why.classList.remove('hide');
    return;
  }
  sw.disabled = false;
  const reg = await navigator.serviceWorker.getRegistration();
  sw.checked = !!(await reg?.pushManager.getSubscription());
  kinds(sw.checked);
}

$('notifprefcard').addEventListener('change', async e => {
  if (e.target.id !== 'nf_push') return;
  const on = $('nf_push').checked;
  $('nferr').classList.add('hide');
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg){ $('nf_push').checked = false; return fail('앱을 새로고침한 뒤 다시 켜주세요.', 'nf'); }

  if (!on){
    const sub = await reg.pushManager.getSubscription();
    if (sub){
      /* **표에서 먼저 지우고 기기에서 뗍니다.** 순서가 반대면 표에 죽은
         주소가 남아 보낼 때마다 실패합니다. */
      await sb.from('push_subs').delete().eq('endpoint', sub.endpoint);
      await sub.unsubscribe();
    }
    toast('잠금화면 알림을 껐어요');
    return drawPushRow();
  }

  /* 허락은 **사용자가 스위치를 켠 그 순간**에만 물을 수 있습니다.
     앱을 열자마자 물으면 대부분 거절합니다. */
  const perm = await Notification.requestPermission();
  if (perm !== 'granted'){ $('nf_push').checked = false; return drawPushRow(); }

  let sub;
  try {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUB) });
  } catch (err){
    $('nf_push').checked = false;
    return fail('알림을 켜지 못했어요. 잠시 뒤 다시 눌러주세요.', 'nf');
  }

  const j = sub.toJSON();
  const r = await sb.from('push_subs').upsert({
    user_id: me.id, endpoint: sub.endpoint,
    p256dh: j.keys.p256dh, auth: j.keys.auth,
    ua: navigator.userAgent.slice(0, 200),
  }, { onConflict: 'endpoint' }).select('id');

  if (r.error || !r.data?.length){
    await sub.unsubscribe();          /* 표에 못 넣었으면 기기 등록도 물립니다 */
    $('nf_push').checked = false;
    return fail(r.error || NOROW.save, 'nf');
  }
  /* **집 시간대를 여기서도 씁니다.** 위의 loadNotifPrefs 가 이미 하지만,
     그건 "설정 화면을 열었다"에 기대고 있습니다. 스위치가 나중에 다른
     자리로 옮겨가면 집 시간대가 조용히 안 채워지고, 그러면 출국편 알림이
     다시 1시간 일찍 옵니다. 켜는 자리에서 챙기면 그 고리가 끊어집니다. */
  saveHomeTz();
  toast('이제 잠금화면으로 알려드려요');
  drawPushRow();
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
/* 대중교통 등급(transit_grade)은 더 이상 화면에 안 씁니다. 알아도 할 수 있는
   일이 없고, 정작 필요한 이동 시간은 일정 화면이 따로 알려줍니다.
   등급 자체는 그 계산의 재료라 DB 에는 그대로 있습니다. */

/* 뒤에서 다시 받아오는 중인지. 두 번 겹쳐 부르지 않으려고 둡니다. */
let citiesRefreshing = false;

async function loadCities(){
  if (cities) return;

  /* ── 담아둔 것이 있으면 그걸 먼저 씁니다 ──
     도시 313행에 설명 글까지 붙어 제법 무겁습니다. 그걸 다 받아야 홈도 여행도
     그려지니, 켤 때마다 그 시간을 통째로 기다리고 있었습니다.
     예전에는 이 캐시를 **연결이 끊겼을 때만** 꺼냈습니다. 그런데 도시 목록은
     하루 사이에 바뀌는 자료가 아닙니다. 바로 꺼내 쓰고 새것은 뒤에서 받습니다.
     서비스워커에서 배운 것과 같습니다 — 기다리는 설계가 집니다. */
  const cached = cacheGet('cities');
  if (cached?.cities?.length){
    applyCities(cached.cities, cached.countries);
    if (!citiesRefreshing && !netIsDown()){
      citiesRefreshing = true;
      /* 화면은 이미 그려졌습니다. 새것이 오면 조용히 갈아끼웁니다. */
      refreshCities().finally(() => { citiesRefreshing = false; });
    }
    return;
  }
  return refreshCities();
}

/* 실제로 받아오는 쪽. 위에서 캐시를 쓸 때는 이걸 뒤에서 돌립니다. */
async function refreshCities(){
  /* 새로 붙인 칸(사진·설명)이 아직 DB에 없을 수 있습니다. 그때 질의가 통째로
     실패하면 도시 목록이 아예 안 나옵니다 — 한 번 그렇게 비어 버렸습니다.
     없는 칸은 빼고 다시 물어봐서, 마이그레이션이 늦어도 화면은 살아 있게 합니다. */
  /* 좌표는 지도에 핀을 찍는 데 씁니다. 313행이라 무게는 무시할 만합니다. */
  const BASE = 'id,name,name_en,name_local,country,currency,timezone,transit_grade,' +
               'center_lat,center_lng';
  /* fame 은 성향 카드가 씁니다 (033). 없으면 그 판정만 건너뛰면 되므로
     아래 단계별 후퇴에서 제일 먼저 떨어져 나가게 둡니다. */
  /* pop_rank 는 새 여행 첫 화면의 추천 순서입니다 (051). 아직 없는 DB 가
     있을 수 있어 한 칸 따로 둡니다 — 같이 묶으면 이게 없다는 이유로
     fame 까지 떨어져 나가서 성향 카드가 조용히 망가집니다. */
  let cs = await netTimeout(sb.from('cities')
    /* `tags` 는 추천 계산이 씁니다(rec.js). **제일 앞 시도에만 넣습니다** —
       아직 db/068 을 안 돌린 곳에서는 이 줄이 실패하고 아래 단계별 후퇴가
       tags 없이 받아옵니다. 그러면 추천만 조용히 비고 앱은 그대로 돕니다. */
    .select(BASE + ',image_url,summary,summary_url,fame,pop_rank,tags').order('name'));
  if (cs.error && !isOffline(cs.error)) cs = await sb.from('cities')
    .select(BASE + ',image_url,summary,summary_url,fame').order('name');
  /* 연결 문제로 실패한 것이면 아래 단계별 후퇴를 돌 이유가 없습니다.
     세 번을 더 기다리면 그만큼 화면이 늦게 뜹니다. 바로 캐시로 갑니다. */
  if (cs.error && isOffline(cs.error)){
    const old = cacheGet('cities');
    if (old){ applyCities(old.cities, old.countries); drawOffbar(); return; }
  }
  if (cs.error) cs = await sb.from('cities')
    .select(BASE + ',image_url,summary,summary_url').order('name');
  if (cs.error) cs = await sb.from('cities').select(BASE + ',image_url').order('name');
  if (cs.error) cs = await sb.from('cities').select(BASE).order('name');

  let ns = await sb.from('countries')
    .select('code,name,currency,local_lang,default_timezone,continent').order('name');
  if (ns.error) ns = await sb.from('countries')
    .select('code,name,currency,local_lang,default_timezone').order('name');

  if (cs.error || ns.error){
    /* 못 받아왔으면 지난번 것을 씁니다. 도시 목록이 없으면 홈도 여행도 못 그립니다 —
       비행기모드에서 화면이 "불러오는 중…"에 멈춰 있던 곳이 여기였습니다. */
    /* 뒤에서 새로 받는 중이었다면 화면에는 이미 도시가 있습니다.
       그때 오류 상자를 띄우면 멀쩡한 화면 위에 빨간 줄만 얹힙니다. */
    if (cities) return;
    const old = cacheGet('cities');
    if (old){ applyCities(old.cities, old.countries); drawOffbar(); return; }
    fail(cs.error || ns.error, 'rate');
    return fail(cs.error || ns.error, 'form');
  }
  cacheSet('cities', { cities: cs.data, countries: ns.data });
  applyCities(cs.data, ns.data);
}

/* 받아온 것이든 캐시에서 꺼낸 것이든 여기서 한 번에 세웁니다.
   **사전 세우기와 검색 색인은 cities.js 가 합니다**(useCities). 여기는
   그 뒤에 화면을 맞추는 일만 합니다 — 나라 고르개, 많이 가는 곳. */
function applyCities(cityRows, countryRows){
  useCities(cityRows, countryRows);
  $('f_country').innerHTML =
    (countryRows || []).map(n => `<option value="${esc(n.code)}">${esc(n.name)}</option>`).join('');
  drawCountryNote();
  /* 도시가 새로 들어왔으면 '많이 가는 곳'도 다시 뽑습니다. */
  delete $('wizpop').dataset.done;
  drawPop();
}

/* 나라만 골랐을 때 무엇이 채워질지 미리 보여줍니다.
   시간대가 여럿인 나라는 그렇다고 적어줘야 오해가 없습니다. */
function drawCountryNote(){
  const n = countryInfo[$('f_country').value];
  if (!n) return;
  const many = cities && cities.filter(c => c.country === n.code)
                              .some(c => c.timezone !== n.default_timezone);
  $('c_note').textContent =
    `${n.currency} · ${n.default_timezone || '시간대 미정'}` +
    (many ? ' — 이 국가는 시간대가 여럿입니다. 정확히 하려면 도시를 고르세요.' : '');
}
$('f_country').addEventListener('change', drawCountryNote);

/* 찾기(search)는 cities.js 로 갔습니다 — 초성·시작 우선·40개 자르기 규칙은
   사전이 아는 것입니다. 부르는 쪽은 그대로입니다. */

/* ── 빈 화면 ──────────────────────────────────────────────────────────
 * "아직 지출이 없어요." 한 줄만 두면 처음 온 사람은 여기서 멈춥니다.
 * 추가 단추는 카드 오른쪽 위에 작게 있어서 눈이 안 갑니다.
 * **빈 화면은 앱이 처음 쓰는 사람을 가르칠 유일한 기회입니다.**
 * 무엇을 하면 되는지 그 자리에 큼직하게 둡니다. */
function emptyDo(text, label, btnId){
  return `<div class="empty emptydo">
    <div class="t">${esc(text)}</div>
    ${btnId ? `<button class="primary" data-go="${esc(btnId)}">${esc(label)}</button>` : ''}
  </div>`;
}
/* 빈 화면의 단추는 원래 있던 단추를 대신 눌러줍니다 — 여는 방법을 두 벌로
   만들면 한쪽만 고치는 날이 옵니다. */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-go]');
  if (b) $(b.dataset.go)?.click();
});

/* 나라 코드로 국기를 만듭니다. ISO 3166-1 두 글자를 지역표시기호로 옮기는
   규칙이라 나라마다 따로 적어둘 것이 없습니다 — 적어두면 언젠가 틀립니다. */
function flagOf(code){
  if (!/^[A-Za-z]{2}$/.test(code || '')) return '';
  return String.fromCodePoint(...[...code.toUpperCase()]
    .map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65));
}

/* 첫 화면에 깔아둘 '많이 가는 곳'. 순서는 DB 의 pop_rank 가 정합니다(051) —
   여기 적어두면 도시를 더 넣어도 이 목록만 옛날 것으로 남습니다.
   pop_rank 는 나라마다 한 곳씩만 매겨져 있습니다. fame 으로는 못 합니다.
   1등급만 79곳이라 이름순으로 잘리고, 그러면 일본 대표가 '교토'가 됩니다.

   국내는 뺍니다 — 어디로 나갈지 정하는 자리이고, 국내는 쳐서 바로 찾습니다. */
const POP_N = 8;
function drawPop(){
  const box = $('wizpop');
  const busy = $('f_q').value.trim() || picked;
  box.classList.toggle('hide', !!busy);
  if (busy || !cities || box.dataset.done) return;
  const top = cities.filter(c => c.pop_rank != null && c.country !== 'KR')
    .sort((a, b) => a.pop_rank - b.pop_rank).slice(0, POP_N);
  if (!top.length) return;              /* 051 을 아직 안 돌렸으면 조용히 접습니다 */
  /* **국기를 못 그리는 기기가 있습니다.** 윈도우는 지역표시기호 둘을 합치지
     않아서 `JP` `VN` `TH` 처럼 코드가 그대로 보입니다 — 여행을 시작하는
     첫 화면이 개발자 표기 나열이 됩니다. 오른쪽에 '일본'이라고 이미
     적혀 있으니 못 그릴 때는 아예 안 답니다.
     **판단은 `flagOk()` 한 곳에만 둡니다** — b265 에서 발자국 화면에
     만들어 둔 것을 그대로 씁니다. 그때 여기까지 안 고쳐서 이 화면만
     남아 있었습니다. 같은 판단을 두 벌로 적으면 한쪽만 고치게 됩니다. */
  const fl = flagOk();
  box.innerHTML = top.map(c =>
    `<button type="button" class="poprow" data-cid="${esc(c.id)}">
       ${fl ? `<span class="fl">${flagOf(c.country)}</span>` : ''}<b>${esc(c.name)}</b>
       <span class="c">${esc(countryName[c.country] || c.country)}</span></button>`).join('');
  box.dataset.done = '1';
}
$('wizpop').addEventListener('click', e => {
  const b = e.target.closest('[data-cid]'); if (!b) return;
  const c = cities?.find(x => String(x.id) === b.dataset.cid); if (!c) return;
  hitList = [c]; cursor = 0; pick(0);
});

function drawHits(){
  const box = $('hits'), q = $('f_q').value.trim();
  drawPop();
  if (!q){ box.classList.add('hide'); $('freewrap').classList.add('hide'); return; }

  box.classList.remove('hide');
  box.innerHTML = hitList.map((c, i) =>
    `<div class="hit${i === cursor ? ' on' : ''}" data-i="${i}">
       <b>${esc(c.name)}</b><span class="c">${esc(countryName[c.country] || c.country)}</span>
       <span class="r">${flagOf(c.country)}</span></div>`
  ).join('')
  + `<div class="hit${cursor === hitList.length ? ' on' : ''}" data-i="${hitList.length}">
       <b>${esc(q)}</b><span class="c">그대로 쓰기</span>
       <span class="r">국가만 고르면 됩니다</span></div>`;

  /* 아는 도시가 하나도 없으면 기다릴 것 없이 나라 고르기를 바로 띄웁니다.
     "목록에 없어요"를 찾아 누르게 하는 건 이상합니다 — 친 그대로 쓰면 됩니다. */
  if (!hitList.length) useFree();
  else $('freewrap').classList.add('hide');
}

/* 목록에 없는 곳. 도시 이름은 위 칸에 이미 쳤으니 나라만 더 받습니다. */
function useFree(){
  picked = null;
  $('picked').classList.add('hide');
  $('freewrap').classList.remove('hide');
  drawCountryNote();
}

function pick(i){
  if (i >= hitList.length){                    /* 친 그대로 쓰기 */
    $('hits').classList.add('hide');
    useFree();
    $('f_country').focus();
    return;
  }
  picked = hitList[i];
  $('freewrap').classList.add('hide');
  $('hits').classList.add('hide');
  $('f_q').classList.add('hide');
  $('wizpop').classList.add('hide');
  $('picked').classList.remove('hide');
  /* 사진이 없는 도시가 아직 많습니다. 그때는 첫 글자를 큼직하게 둡니다 —
     빈 회색 네모만 있으면 안 불러온 것인지 없는 것인지 모릅니다. */
  const im = $('pc_img');
  im.style.backgroundImage = picked.image_url ? `url("${picked.image_url}")` : '';
  im.textContent = picked.image_url ? '' : picked.name.slice(0, 1);
  $('p_name').textContent = picked.name;
  $('p_country').textContent =
    `${flagOf(picked.country)} ${countryName[picked.country] || picked.country}`.trim();
  $('p_note').textContent = picked.currency || '';
}

$('f_q').addEventListener('input', () => {
  hitList = search($('f_q').value); cursor = 0; drawHits();
});
$('f_q').addEventListener('keydown', e => {
  const max = hitList.length;                 /* 마지막 줄이 '목록에 없어요' */
  if (e.key === 'ArrowDown'){ cursor = Math.min(cursor + 1, max); drawHits(); e.preventDefault(); }
  else if (e.key === 'ArrowUp'){ cursor = Math.max(cursor - 1, 0); drawHits(); e.preventDefault(); }
  else if (e.key === 'Enter'){ if (!$('hits').classList.contains('hide')) pick(cursor);
                               e.preventDefault(); }
  else if (e.key === 'Escape'){ $('hits').classList.add('hide'); }
});
$('hits').addEventListener('click', e => {
  const el = e.target.closest('.hit'); if (el) pick(+el.dataset.i);
});
$('repick').addEventListener('click', () => {
  picked = null;
  $('picked').classList.add('hide');
  $('f_q').classList.remove('hide'); $('f_q').value = ''; $('f_q').focus();
  hitList = []; drawHits();
});

/* ── 여행 만들기 ────────────────────────────────────────────────────
 * 새 여행을 만드는 화면입니다. 홈의 '시작'에서만 옵니다.
 * 여행 탭의 '일정 추가'는 **다른 일**입니다 — 이미 있는 여행에 일정을
 * 채우는 것이라 초안 화면(openDraft)으로 갑니다. 둘을 갈라둡니다. */
async function openNew(){
  $('newcard').classList.remove('hide');
  await loadCities();
  /* 날짜는 미리 채우지 않습니다. 달력에서 직접 고르는 편이 빠르고,
     미리 채워두면 '오늘 출발'인 채로 지나쳐 버립니다. */
  drawPop();
  wizShow(1);
}

/* 여행 탭 '일정 추가' — 여행을 만드는 것이 아니라, 이미 있는 여행에
   일정을 채우는 자리입니다. 그래서 초안 화면을 그대로 엽니다. */
$('newbtn').addEventListener('click', () => openDraft());
/* '＋ 새 여행' — 어디로·언제부터 정하는 4단계 화면. 홈의 AI 카드가
   '다음 여행' 이야기를 하게 되면서 여기 말고는 갈 길이 없어졌습니다. */
$('newtripbtn').addEventListener('click', () => openNew());

$('cancel').addEventListener('click', () => {
  $('newcard').classList.add('hide');
  $('formerr').classList.add('hide');
});

/* ── 새 여행 단계 화면 ────────────────────────────────────────────────
 * 예전에는 제목·도시·나라·시작·끝을 한 화면에서 다 물었습니다. 빈 칸이
 * 여섯 개 있는 화면은 채우기 전에 닫게 됩니다. 한 번에 하나만 묻습니다.
 *
 *   1 어디로  2 언제  3 취향  4 이름과 갈래(AI / 직접)
 *
 * **제목은 안 묻습니다.** 도시를 고르면 "도쿄 여행"으로 지어두고 마지막에
 * 고칠 수 있게 합니다 — 물어볼 것이 하나 줄고, 대개는 그대로 씁니다.
 *
 * 취향 칸은 초안 화면과 **DOM 하나를 같이 씁니다**(movePrefs). 두 벌로
 * 만들면 언젠가 한쪽만 고칩니다. */
const WIZ_TITLES = {
  1: '어디로 가시나요?',
  2: '언제 가시나요?',
  3: '이름을 정해주세요',
  4: '어떤 여행이 좋으세요?',
};
let wizStep = 1;

/* 취향 칸 한 벌을 필요한 자리로 옮겨 담습니다. */
function movePrefs(slotId){
  const slot = $(slotId), block = $('prefblock');
  if (slot && block && block.parentElement !== slot) slot.appendChild(block);
}

function wizShow(n){
  wizStep = Math.min(4, Math.max(1, n));
  $('newcard').querySelectorAll('.wizstep').forEach(s =>
    s.classList.toggle('hide', +s.dataset.step !== wizStep));
  $('wiztitle').textContent = WIZ_TITLES[wizStep];
  $('wizfill').style.width = (wizStep * 25) + '%';
  $('wizback').classList.toggle('hide', wizStep === 1);
  /* 3단계에는 아래 '계속'이 없습니다 — 두 카드가 곧 결정입니다.
     그러면 아래 칸이 통째로 빌 수 있으니 구분선도 같이 걷습니다.
     4단계(취향)는 AI 를 고른 사람만 오므로 단추가 바로 '일정 짜기'입니다. */
  $('wiznext').classList.toggle('hide', wizStep === 3);
  $('wizfoot').classList.toggle('empty', wizStep === 3);
  $('wiznext').textContent = wizStep === 4 ? '일정 짜기' : '계속';
  $('formerr').classList.add('hide');
  /* 단계를 넘길 때마다 위로. 달력을 한참 내렸다가 다음으로 가면
     새 단계가 가운데쯤부터 보입니다. */
  $('newcard').querySelector('.wizbody').scrollTop = 0;
  wizDays();                          /* 2단계가 아니면 스스로 지웁니다 */
  if (wizStep === 2) wizCal(true);
  if (wizStep === 3) wizAutoTitle();
  if (wizStep === 4) movePrefs('wiz_prefslot');
}

/* 이름은 안 묻고 지어둡니다. 대개는 그대로 씁니다.
   비워둔 것을 손대지는 않습니다 — 직접 고쳐 쓴 이름을 덮으면 안 됩니다. */
function wizAutoTitle(){
  if ($('f_title').value.trim()) return;
  const dest = picked ? picked.name : $('f_q').value.trim();
  if (dest) $('f_title').value = `${dest} 여행`;
}

/* 다음으로 넘어가기 전에 그 단계에서 필요한 것만 봅니다.
   마지막에 몰아서 검사하면 어느 단계로 돌아가야 하는지 모릅니다. */
function wizCheck(n){
  if (n === 1){
    const dest = picked ? picked.name : $('f_q').value.trim();
    if (!dest) return '어디로 가는지 알려주세요.';
    if (!picked && !$('f_country').value) return '어느 나라인지 골라주세요.';
  }
  if (n === 2){
    const s = $('f_start').value, e = $('f_end').value;
    if (!s || !e) return '날짜를 골라주세요.';
    if (e < s)    return '끝나는 날이 시작보다 빨라요.';
    const days = Math.round((new Date(e) - new Date(s)) / 864e5) + 1;
    if (days > 365) return `${days}일은 너무 길어요. 날짜를 다시 봐주세요.`;
  }
  return '';
}

$('wiznext').addEventListener('click', () => {
  /* 4단계는 취향 화면입니다. 여기 단추는 '계속'이 아니라 '일정 짜기'라
     넘어갈 곳이 없습니다 — 만들고 바로 짜기 시작합니다. */
  if (wizStep === 4) return createTrip(true);
  const why = wizCheck(wizStep);
  if (why) return fail(why, 'form');
  wizShow(wizStep + 1);
});
$('wizback').addEventListener('click', () => wizShow(wizStep - 1));

/* ── 달력 ────────────────────────────────────────────────────────────
 * 날짜 칸 두 개는 기기 선택기를 두 번 열게 하고, 며칠짜리인지도 안 보입니다.
 * 여기서는 시작을 누르고 끝을 누릅니다. 고른 값은 숨은 f_start/f_end 에
 * 그대로 담기므로, 날짜를 읽는 쪽 코드는 하나도 안 바뀝니다.
 *
 * 오늘부터 14달을 한 번에 그려 세로로 굴립니다. 화살표로 달을 넘기게 하면
 * 월말에서 시작해 다음 달에 끝나는 여행이 두 화면에 걸립니다. */
const CAL_MONTHS = 14;
/* seek 를 주면 이미 고른 날이 보이는 자리로 굴려줍니다 — 뒤로 갔다 오면
   달력이 오늘 달부터 다시 시작해서 고른 날을 또 찾게 됩니다. */
function wizCal(seek){
  const today = new Date(); today.setHours(0,0,0,0);
  /* **로컬 자정을 ymd(UTC)로 돌리면 안 됩니다** — KST 에서는 하루 종일 전날이
     나와서 달력의 '오늘'이 늘 하루 앞을 가리켰습니다. 달력은 사람이 보는
     날짜이므로 로컬로 읽습니다. */
  const tkey  = todayYmd();
  const s = $('f_start').value, e = $('f_end').value;
  let html = '';
  for (let m = 0; m < CAL_MONTHS; m++){
    const first = new Date(today.getFullYear(), today.getMonth() + m, 1);
    const y = first.getFullYear(), mo = first.getMonth();
    const last = new Date(y, mo + 1, 0).getDate();
    let cells = '<span></span>'.repeat(first.getDay());
    for (let d = 1; d <= last; d++){
      const k = `${y}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      /* 지난 날은 못 고릅니다. 고를 수 있게 두면 나중에 "왜 지난 여행이
         다가오는 목록에 없냐"는 이야기가 됩니다. */
      const off = k < tkey;
      const cls = [
        off ? '' : (k === s ? 's' : ''), off ? '' : (k === e ? 'e' : ''),
        (!off && s && e && k > s && k < e) ? 'in' : '',
        k === tkey ? 'today' : '',
      ].filter(Boolean).join(' ');
      cells += `<button type="button" class="cd ${cls}" data-d="${k}"${off ? ' disabled' : ''}><i>${d}</i></button>`;
    }
    html += `<div class="calmon"><h3>${y}년 ${mo+1}월</h3><div class="calgrid">${cells}</div></div>`;
  }
  $('wizcal').innerHTML = html;
  wizDays();
  if (seek && s){
    const cell = $('wizcal').querySelector(`[data-d="${s}"]`);
    cell?.closest('.calmon')?.scrollIntoView({ block:'start' });
  }
}

/* 누를 때마다: 시작이 없거나 이미 둘 다 골랐으면 새로 시작합니다.
   시작보다 앞을 누르면 그 날이 새 시작이 됩니다 — "다시 처음부터"보다
   그쪽이 하려던 일에 가깝습니다. */
$('wizcal').addEventListener('click', ev => {
  const b = ev.target.closest('.cd'); if (!b || b.disabled) return;
  const k = b.dataset.d, s = $('f_start').value, e = $('f_end').value;
  if (!s || e || k < s){ $('f_start').value = k; $('f_end').value = ''; }
  else                   $('f_end').value = k;
  wizCal();
});

/* 며칠인지 바로 보여줍니다. 날짜 두 개를 머릿속으로 빼게 하지 않습니다.
   달력을 보고 있을 때만 적습니다 — 뒤 단계까지 따라다니면 그 자리에
   'AI가 짜줄게요'를 눌러야 하는데 날짜가 대신 앉아 있습니다. */
function wizDays(){
  const s = $('f_start').value, e = $('f_end').value;
  if (wizStep !== 2) return void ($('wizdays').textContent = '');
  $('wizdays').textContent =
    !s ? '' :
    !e ? `${s.slice(5).replace('-','월 ')}일 — 끝나는 날도 눌러주세요` :
         `${s.slice(5).replace('-','.')} – ${e.slice(5).replace('-','.')} · ` +
         `${Math.round((new Date(e) - new Date(s)) / 864e5) + 1}일`;
}

/* 갈래. 직접 채울 사람은 **여기서 끝납니다** — 취향을 물어봐야 쓸 데가
   없습니다. AI 에게 맡길 사람만 취향 화면으로 한 장 더 갑니다. */
$('wiz_manual').addEventListener('click', () => createTrip(false));
$('wiz_ai').addEventListener('click',     () => wizShow(4));

async function createTrip(withAi){
  /* 누른 단추에 '만드는 중…'을 겁니다. AI 쪽은 취향 화면의 '일정 짜기'가
     그 자리입니다 — 갈래 카드는 이미 지난 장이라 거기 걸면 안 보입니다. */
  const btn = withAi ? $('wiznext') : $('wiz_manual');
  $('formerr').classList.add('hide');

  const title = $('f_title').value.trim();
  /* 도시를 골랐으면 그 이름, 아니면 위 칸에 친 그대로. */
  const dest  = picked ? picked.name : $('f_q').value.trim();
  const start = $('f_start').value, end = $('f_end').value;

  /* 단계마다 이미 봤지만 여기서 한 번 더 봅니다. 단계를 건너뛸 길이
     생기더라도 (뒤로 갔다 오거나, 날짜 칸을 키보드로 직접 치거나)
     빈 여행이 만들어지지는 않게 합니다. */
  if (!title)                return fail('이름을 적어주세요.', 'form');
  const why = wizCheck(1) || wizCheck(2);
  if (why)                   return fail(why, 'form');

  /* 도시를 골랐으면 나라·시간대·통화·이동상수는 DB 트리거가 채웁니다.
     목록에 없는 곳이면 나라만 넘기고, 통화와 언어는 나라에서 옵니다.

     id 를 여기서 미리 정합니다. .select('id') 로 돌려받으려 하면
     "new row violates row-level security policy for table trips" 로 막힙니다.
     넣는 것 자체는 되는데 **돌려주는 줄을 읽을 권한이 그 순간에 없어서**입니다 —
     trips 읽기 정책이 can_read_trip(참여자인가)인데, 참여자 줄은 INSERT
     트리거가 끝난 뒤에 생깁니다. 방금 만든 여행도 그 찰나에는 못 읽습니다.
     id 를 미리 정하면 돌려받을 이유가 없어집니다. */
  const id = (crypto.randomUUID ? crypto.randomUUID()
                                : URL.createObjectURL(new Blob()).slice(-36));
  const row = { id, created_by: me.id,
                title, destination: dest, start_date: start, end_date: end };
  if (picked) row.city_id = picked.id;
  else        row.country = $('f_country').value;

  const label = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<span class="load">만드는 중…</span>';
  const { error } = await sb.from('trips').insert(row);
  btn.disabled = false; btn.innerHTML = label;
  if (error) return fail(error, 'form');

  wizReset();
  await loadTrips();

  /* 여기서 갈립니다. 직접 채우겠다면 만든 여행을 바로 열어줍니다 —
     목록으로 돌려보내면 방금 만든 것을 다시 찾아 눌러야 합니다.
     AI 에게 맡기겠다면 초안 화면을 그 여행으로 열고 바로 짜기 시작합니다.
     취향 칸은 같은 DOM 이라 고른 그대로 따라갑니다. */
  if (withAi){ await openDraft(id, true); $('d_go').click(); }
  else         openTrip(id);
}

/* 다음에 열 때 앞사람 흔적이 남아 있으면 안 됩니다. */
function wizReset(){
  $('newcard').classList.add('hide');
  $('f_title').value = ''; $('f_q').value = '';
  $('f_start').value = ''; $('f_end').value = '';
  $('wizdays').textContent = '';
  picked = null; hitList = []; cursor = 0;
  $('picked').classList.add('hide');
  $('f_q').classList.remove('hide');
  drawHits();                       /* 빈 값이면 후보와 나라 칸을 같이 접습니다 */
  wizStep = 1;                      /* 화면은 이미 닫혔으니 그리지 않고 자리만 되돌립니다 */
}

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
  $('cityview').classList.add('hide'); cityOpen = null;
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

const LVCOLOR = { 심각:'var(--bad)', 주의:'var(--k-food)', 참고:'var(--ink-48)' };

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

/* AI 는 마크다운으로 씁니다. 그대로 찍으면 별표가 글자로 보입니다.
   반드시 먼저 이스케이프하고 나서 태그로 바꿉니다 — 순서를 바꾸면
   AI 가 돌려준 글이 그대로 HTML 이 됩니다. */
function md(s){
  return esc(s)
    .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
    .replace(/^\s*[*-]\s+/gm, '· ')
    .replace(/^\s*(#{1,4})\s+(.+)$/gm, '<b>$2</b>')
    .replace(/\n/g, '<br>');
}

/* ── 기본 프로필 그림 ────────────────────────────────────────────────
 * 구글에서 사진을 안 받기로 했으니(041) 새로 가입하면 그림이 아예 없습니다.
 * src 가 빈 <img> 는 흰 네모나 깨진 아이콘으로 보입니다 — 실제로 그랬습니다.
 *
 * 이름 첫 글자를 그려 채웁니다. **글자로 만드는 것이라 저장소도 네트워크도
 * 안 씁니다** — 비행기모드에서도 나오고 사진 값도 안 듭니다.
 * 색은 계정 id 에서 뽑으므로 기기를 바꿔도 같은 사람은 같은 색입니다. */
const AV_BG = ['#4a7ebb', '#5a9367', '#b4794a', '#8a6bb1',
               '#c06a6a', '#3f8f93', '#a1783f', '#6b7fa8'];
function avatarOf(seed, label){
  const s = String(seed || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  /* 이모지는 서로게이트 쌍이라 [0] 으로 자르면 반쪽만 남아 깨집니다.
     영문은 대문자로 올립니다 — 한글·이모지는 대소문자가 없어 그대로입니다. */
  const ch = ([...String(label || '').trim()][0] || '·').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">`
    + `<rect width="64" height="64" rx="32" fill="${AV_BG[h % AV_BG.length]}"/>`
    + `<text x="32" y="34" fill="#fff" font-size="30" font-weight="600"`
    + ` text-anchor="middle" dominant-baseline="central"`
    + ` font-family="-apple-system,'Apple SD Gothic Neo',sans-serif">${esc(ch)}</text></svg>`;
  /* encodeURIComponent 가 따옴표까지 인코딩해서 그대로 속성에 넣어도 안전합니다. */
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
/* 올려둔 사진의 주소가 깨졌을 때 숨기면 흰 구멍이 남습니다. 기본 그림으로 되돌립니다. */
function avatarImg(url, seed, label, style, cls){
  const fb = avatarOf(seed, label);
  return `<img ${cls ? `class="${cls}" ` : ''}src="${esc(url || fb)}" alt="" data-fb="${fb}"
    onerror="this.onerror=null;this.src=this.dataset.fb"${style ? ` style="${style}"` : ''}>`;
}

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

/* ── 답을 기다리는 동안 ──────────────────────────────────────────────
 * 보내기 단추만 흐려지는 것으로는 "지금 무슨 일이 벌어지고 있다"가 안 읽힙니다.
 * 20초쯤 걸리는데 화면이 멈춘 것처럼 보이면 다시 누르게 됩니다.
 * 대화가 이어지는 자리, 곧 **AI 가 말할 자리에** 점 세 개를 띄웁니다.
 * 저장하지 않습니다 — 답이 오면 loadChats 가 화면을 다시 그리면서 사라집니다. */
function showTyping(){
  hideTyping();
  const box = $('chat');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'msg ai typing';
  el.id = 'typing';
  el.setAttribute('aria-label', '답변을 만드는 중');
  el.innerHTML = '<i></i><i></i><i></i>';
  box.appendChild(el);
  aiToBottom();
}
function hideTyping(){ document.getElementById('typing')?.remove(); }

/* 여러 줄 입력칸. 쓴 만큼 늘어나야 자기가 뭘 쓰는지 보입니다.
   height 를 먼저 비워야 줄어들 때도 따라 줄어듭니다 — 안 그러면 한 번 커진
   채로 안 돌아옵니다.

   **b173 에서 이 칸을 contenteditable 로 바꿨다가 b174 에서 되돌렸습니다.**
   iOS 가 textarea 위에 붙이는 ∧ ∨ ✓ 막대를 없애려던 것이었는데, 재보니
   contenteditable 에도 똑같이 붙습니다 — 홈 화면 앱 vv.h 가 424 에서 1px 도
   안 움직였습니다. 그러면 placeholder·글자수·한글 조합을 손으로 흉내 낸
   코드만 남습니다. 브라우저가 이미 맞게 해주는 것을 다시 만들 이유가 없습니다.
   **막대는 없앨 수 없습니다. 덮는 쪽으로 가야 합니다.** */
function growMsg(){
  const el = $('ai_msg');
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}
$('ai_msg').addEventListener('input', growMsg);

$('ai_msg').addEventListener('keydown', e => {
  /* 줄바꿈이 필요할 때가 있습니다. Enter 는 보내기, Shift+Enter 는 줄바꿈.
     한글 조합 중(isComposing)에 Enter 를 가로채면 마지막 글자가 잘려 나갑니다. */
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing){
    e.preventDefault(); $('ai_send').click();
  }
});

/* 빠른 질문(추천 문구 4개)은 b178 에서 걷어냈습니다. */

/* ── 사진 첨부 ──────────────────────────────────────────────────────
 * 간판·메뉴판·티켓을 찍어 물어보는 자리입니다. 글로 옮겨 적는 것보다 빠릅니다.
 * 그대로 보내면 4MB 짜리가 올라갑니다. 로밍에서 그건 안 됩니다.
 * 긴 쪽을 1024 로 줄이고 JPEG 로 다시 굽습니다 — 글자를 읽을 만큼은 남습니다.
 * 프로필 사진용 shrink 를 쓰지 않는 이유는 그건 정사각으로 잘라내기 때문입니다.
 * 메뉴판이 잘리면 물어볼 것이 사라집니다. */
/* 여러 장을 붙일 수 있습니다. 메뉴판이 두 장으로 나뉘어 있거나
   가게 앞과 안을 같이 보여줘야 할 때가 있습니다.
   대신 장수를 막습니다 — 한 번에 다 올리면 함수가 거절하고 요금도 그만큼 듭니다. */
const SHOT_MAX = 4;
let aiShots = [];                        /* [{mime, data(base64), url}] */

function fitJpeg(file, max = 1024){
  return new Promise((ok, no) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width  = Math.round(img.width  * s);
      cv.height = Math.round(img.height * s);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(img.src);
      /* dataURL 은 "data:image/jpeg;base64,...." 입니다. 쉼표 뒤가 알맹이입니다. */
      const url = cv.toDataURL('image/jpeg', 0.82);
      ok({ mime:'image/jpeg', data:url.slice(url.indexOf(',') + 1), url });
    };
    img.onerror = () => no(new Error('사진을 읽지 못했어요.'));
    img.src = URL.createObjectURL(file);
  });
}

$('ai_cam').addEventListener('click', () => $('ai_file').click());
function drawShot(){
  $('ai_shotwrap').classList.toggle('hide', !aiShots.length);
  $('ai_shotwrap').innerHTML = aiShots.map((s, i) =>
    `<span class="shot1"><img src="${s.url}" alt="">
       <button class="x" data-shotx="${i}" aria-label="빼기">×</button></span>`).join('') +
    (aiShots.length ? `<span class="shotn">${aiShots.length}/${SHOT_MAX}</span>` : '');
}
$('ai_shotwrap').addEventListener('click', e => {
  const b = e.target.closest('[data-shotx]'); if (!b) return;
  aiShots.splice(+b.dataset.shotx, 1);
  drawShot();
});
$('ai_file').addEventListener('change', async e => {
  const files = [...(e.target.files || [])];
  e.target.value = '';                   /* 같은 사진을 또 골라도 걸리게 */
  if (!files.length) return;
  $('aierr').classList.add('hide');
  for (const f of files){
    if (aiShots.length >= SHOT_MAX){ toast(`사진은 ${SHOT_MAX}장까지예요.`); break; }
    let s;
    try { s = await fitJpeg(f); } catch (err){ return fail(err, 'ai'); }
    /* 여기서도 너무 크면 함수가 거절합니다. 대략 1.4배로 부풀어 오릅니다. */
    if (s.data.length > 2_600_000){ toast('너무 큰 사진 한 장은 건너뛰었어요.'); continue; }
    aiShots.push(s);
  }
  drawShot();
});

/* ── 출처 ───────────────────────────────────────────────────────────
 * AI 가 무엇을 보고 답했는지 답니다. 인터넷 검색이 아니라 **이 앱의 자료** 중
 * 무엇을 근거로 삼았는지입니다 — 그건 우리가 확인할 수 있습니다.
 * "일반지식"이 붙었다면 우리가 확인해 준 것이 아무것도 없다는 뜻입니다. */
/* 넷을 더 답니다 — 서버가 AI 에게 일행 · 예약 · 준비물 · 내 별점을 같이
   넘기게 됐습니다(2026-08-10). **모르는 이름은 아래 filter 가 조용히 버리므로**
   서버만 고치고 여기를 안 고치면 근거 칩이 안 뜹니다. */
const SRC_KO = { plans:'이 여행 일정', expenses:'지출 기록', legs:'여행 구간',
                 trip:'여행 정보', members:'일행', bookings:'예약',
                 packing:'준비물', ratings:'내가 매긴 별점', prefs:'내 취향',
                 placerates:'내가 매긴 장소 별점', candidates:'담아둔 곳',
                 general:'일반 지식 — 직접 확인이 필요해요' };
function drawSources(list, web){
  const box = $('aisrc'); if (!box) return;
  const arr = (Array.isArray(list) ? list : []).filter(s => SRC_KO[s]);
  const links = Array.isArray(web) ? web.filter(w => w?.link) : [];
  box.classList.toggle('hide', !arr.length && !links.length);
  box.innerHTML =
    (arr.length ? '<b>근거</b>' + arr.map(s =>
       `<span class="srcchip${s === 'general' ? ' warn' : ''}">${esc(SRC_KO[s])}</span>`).join('')
     : '') +
    /* 검색해서 답한 경우에는 어디서 읽었는지 **링크째** 답니다.
       눌러서 직접 볼 수 있어야 "검색했다"는 말이 확인 가능한 말이 됩니다.
       영업시간·가격은 틀렸을 때 여행이 어긋나므로 특히 그렇습니다. */
    (links.length
      ? `<div class="weblinks"><b>검색해서 답했어요</b>` +
        links.map((w, i) => `<a href="${esc(w.link)}" target="_blank" rel="noopener">
             ${i + 1}. ${esc(w.title || w.link)}</a>`).join('') + '</div>'
      : '');
}

/* 예시를 누르면 **바로 보냅니다.** 입력칸에 넣어만 주면 한 번 더 눌러야 하고,
   그러면 예시가 "고르는 것"이 아니라 "지우고 다시 쓰는 것"이 됩니다.
   빈 화면에서만 보이므로 대화가 시작되면 저절로 사라집니다. */
$('chat').addEventListener('click', e => {
  const b = e.target.closest('[data-ask]'); if (!b) return;
  $('ai_msg').value = b.dataset.ask;
  $('ai_send').click();
});

$('ai_send').addEventListener('click', async () => {
  const shots = aiShots.slice();
  /* 사진만 보내도 됩니다. "이거 뭐야?"를 매번 타이핑하게 할 이유가 없습니다. */
  const msg = $('ai_msg').value.trim() ||
              (shots.length ? '이 사진에 대해 알려줘.' : '');
  const tripId = $('ai_trip').value;
  $('aierr').classList.add('hide');
  if (!msg) return;
  $('ai_msg').value = ''; growMsg();   /* 여러 줄로 늘어나 있던 것을 한 줄로 되돌립니다 */
  $('cards').innerHTML = '';
  aiShots = []; drawShot();
  $('aisrc').classList.add('hide');
  /* 글자를 갈아끼우면 안에 있는 비행기 그림이 사라집니다.
     흐리게만 하고 그림은 그대로 둡니다. */
  $('ai_send').disabled = true; $('ai_send').classList.add('sending');

  /* 물어본 것을 먼저 남깁니다. 답이 실패해도 무엇을 물었는지는 보여야 합니다.
     여행을 안 골랐으면 trip_id 를 비워 둡니다 — 그것도 남습니다 (029).
     사진 자체는 저장하지 않습니다 — 대화 기록이 금방 수십 MB 가 됩니다. */
  await sb.from('chats').insert({ trip_id: tripId || null, user_id: me.id,
                                  role: 'user',
                                  content: (shots.length ? `[사진 ${shots.length}장] ` : '') + msg });
  await loadChats(tripId);
  showTyping();          /* 답이 올 자리에 점 세 개. 화면이 멈춘 게 아니라는 표시 */

  /* 사진을 붙이면 점 세 개가 **영원히** 돌았습니다. 요청이 끝나지도, 실패하지도
     않으면 화면은 알 길이 없습니다 — 원인이 무엇이든 그 상태로 두면 안 됩니다.
     기다릴 시간을 정해두고, 넘으면 그렇다고 말합니다.
     사진은 올려 보내는 것 자체가 오래 걸려 넉넉히 줍니다. */
  const wait = shots.length ? 150000 : 90000;
  const { data, error } = await Promise.race([
    sb.functions.invoke('chat',
      { body: { trip_id: tripId || null, message: msg,
                /* 한 장만 보낼 때도 images 로 보냅니다. 서버가 옛 image 도 받아주지만
                   보내는 쪽이 두 갈래면 언젠가 한쪽만 고칩니다. */
                images: shots.map(s => ({ mime: s.mime, data: s.data })) } }),
    new Promise(r => setTimeout(() => r({ data:null, error:{ message:
      shots.length
        ? `사진을 읽는 데 ${Math.round(wait / 1000)}초를 넘겼어요. ` +
          '사진을 한 장으로 줄이거나 다시 찍어서 올려보세요.'
        : `답을 기다린 시간이 ${Math.round(wait / 1000)}초를 넘겼어요. 다시 물어봐주세요.`
    } }), wait)),
  ]);

  $('ai_send').disabled = false; $('ai_send').classList.remove('sending');
  hideTyping();          /* 실패해도 반드시 걷습니다. 남으면 영영 생각하는 척합니다 */

  if (error){
    /* 함수가 오류를 내면 본문에 이유가 들어 있습니다. 그대로 보여줍니다. */
    let why = error.message;
    try { why = (await error.context?.json())?.error || why; } catch {}
    /* 예전에는 'Failed to send'(요청이 도중에 끊김)까지 "함수가 안 올라갔다"로
       묶어놨습니다. 둘은 전혀 다릅니다 — 하나는 배포 문제고 하나는 서버가
       일하다 죽은 것입니다. 같은 문구를 내놓으니 엉뚱한 데를 보게 됩니다. */
    return fail(
      /not found|404/i.test(why)
        ? 'AI 기능이 아직 준비되지 않았어요. 만든 사람에게 알려주세요.'
      : /Failed to send|Load failed|NetworkError/i.test(why)
        ? '답을 만들다 끊겼어요. 글이 너무 길거나 링크가 무거우면 그럴 수 있어요. ' +
          '링크를 하나만 넣거나 글을 줄여서 다시 해보세요.'
      : why, 'ai');
  }
  if (data?.error) return fail(data.error, 'ai');

  await sb.from('chats').insert({ trip_id: tripId || null, user_id: me.id,
                                  role: 'model', content: data.reply });
  await loadChats(tripId);
  drawSources(data.sources, data.web);
  drawCards(data);
  /* drawChats 안에서 한 번 내리지만 그때는 출처와 제안 카드가 아직 없습니다.
     다 그리고 나서 한 번 더 내려야 새 답변의 끝이 보입니다. */
  aiToBottom();
});

/* ── 제안 카드 ──────────────────────────────────────────────────────
 * AI 는 직접 쓰지 않습니다 (문서 7장). 제안만 카드로 내고 담는 것은 사용자가 합니다.
 * 카드는 저장하지 않습니다 — 다음 질문을 하면 사라집니다.
 * 남겨두면 이미 담은 것을 또 담게 되고, 무엇이 최신인지 헷갈립니다. */
function drawCards(d){
  const acts = d?.actions || [];
  /* **같은 곳을 두 장으로 내지 않습니다.**
     "삼고정문 둘째날에 넣어줘" 처럼 한 곳을 말하면 AI 가 그것을 actions 에도
     places 에도 담아 보낼 때가 있습니다. 그러면 '일정으로 넣기' 아래 한 장,
     '갈 만한 곳에 담기' 아래 한 장 — **같은 장소가 카드 둘**로 뜨고
     사용자는 둘이 무엇이 다른지 알 수가 없습니다.
     일정 카드에는 이미 [일정에 넣기]와 [갈 만한 곳에 담기]가 **둘 다** 있으므로
     고를 것은 거기서 다 고를 수 있습니다. 이름이 겹치면 일정 카드만 남깁니다.
     (띄어쓰기·대소문자만 다른 것도 같은 곳으로 봅니다 — AI 가 매번 똑같이
      적어주지는 않습니다.) */
  /* **글자가 똑같은지로 보면 안 잡힙니다.** 실제로 온 것은
     일정 `쌍용각 식사` · 장소 `쌍용각` 이었습니다 — AI 는 일정에는 무엇을 하는지까지
     붙이고 장소에는 이름만 씁니다. 그래서 **한쪽이 다른 쪽에 들어 있으면** 같은 곳으로
     봅니다. 두 글자는 넘어야 합니다 — '역' 같은 한 글자는 아무 데나 걸립니다. */
  const 다듬기 = s => String(s ?? '').trim().replace(/\s+/g, '').toLowerCase();
  const 제목들 = acts.map(a => 다듬기(a.title)).filter(Boolean);
  const 같은곳 = name => {
    const n = 다듬기(name);
    if (n.length < 2) return false;
    return 제목들.some(t => t === n || t.includes(n) || (n.length >= 2 && n.includes(t)));
  };
  const places = (d?.places || []).filter(p => !같은곳(p.name));
  lastTake = [];                    /* 새 제안이 나오면 되돌릴 대상도 새로 시작합니다 */
  if (!acts.length && !places.length){ $('cards').innerHTML = ''; return; }

  /* **"지도에는 안 떠요 · 위치를 못 찾았어요"를 뺐습니다.**
     이 줄을 카드마다 달아뒀는데, 서버 프롬프트가 AI 에게 "좌표는 적지 않는다,
     우리가 나중에 채운다"고 시키고 있습니다. 그러니 AI 카드는 **거의 언제나**
     좌표가 없고, 이 줄은 카드마다 빠짐없이 떴습니다 — 실제로 받아보니
     다섯 장이 전부 달고 나왔습니다. 늘 켜져 있는 경고는 경고가 아니라 배경입니다.
     게다가 "못 찾았어요"는 찾아봤다는 뜻인데 아직 찾아보지도 않았습니다.
     좌표는 담은 뒤에 '좌표 채우기'가 붙입니다. 그때 못 찾으면 그쪽이 말합니다. */
  setSuggested({ actions: acts, places });

  /* 하나씩 누르게 하면 제안이 다섯이면 다섯 번을 누릅니다. 초안은 서른 번입니다.
     한 번에 담고, 아니다 싶으면 방금 담은 것만 되돌립니다.

     **날짜를 물어봅니다.** 개별로 넣을 때는 폼에서 날짜를 정하게 고쳤는데(b181)
     다 담기는 여전히 AI 가 붙인 날짜로 들어갔습니다. 그 날짜는 대개 여행 첫날일
     뿐 근거가 없습니다. 스무 개를 하나씩 정하게 할 수는 없으니 **한 번만** 묻습니다.
       그대로  — AI 가 적어준 날짜를 씁니다(예전 동작)
       특정일  — 고른 날짜에 다 넣습니다. 하루를 통째로 짜는 경우입니다 */
  const dayOpts = (trip && acts.length)
    ? (() => {
        /* **로컬 자정으로 만들어 UTC 로 잘라 읽고 있었습니다.** 한국(UTC+9)에서는
           9시간이 빠지면서 목록이 통째로 하루씩 앞으로 밀렸습니다 —
           8/14~8/16 여행인데 "Day 1 · 08-13" 이 나왔고, 그걸 고르면
           **여행 시작 전날에 일정이 들어갔습니다.** 실기기에서 확인했습니다.
           날짜 문자열을 다룰 때는 앱의 다른 곳과 같이 asDate(UTC 자정) + D1 로
           셈하고 ymd 로 되돌립니다. 둘이 짝이라 시간대를 안 탑니다. */
        const out = []; const e = trip.end_date;
        for (let d = asDate(trip.start_date), i = 1; ymd(d) <= e && i <= 60;
             d = new Date(d.getTime() + D1), i++){
          const v = ymd(d);
          out.push(`<option value="${v}">Day ${i} · ${v.slice(5)}</option>`);
        }
        return out.join('');
      })() : '';

  $('cards').innerHTML =
    (acts.length + places.length > 1
      ? `<div class="takeall">
           <button class="small" data-takeall="1">이 ${acts.length + places.length}개 다 담기</button>
           ${dayOpts ? `<select id="takeday" class="small" title="일정을 넣을 날">
                <option value="">날짜는 그대로</option>${dayOpts}</select>` : ''}
           <button class="ghost hide" id="undotake">방금 담은 것 되돌리기</button>
         </div>` : '') +
    /* **일정으로 온 것도 후보로 보낼 수 있어야 합니다.** 불러오기로 스무 개를
       읽어오면 그중 몇 개는 "갈지 말지 아직 모르겠는 곳"입니다. 지금까지는
       일정에 넣거나 버리거나 둘뿐이라, 애매한 것을 일정에 넣어놓고 나중에
       지우는 수밖에 없었습니다. 단추를 하나 더 답니다. */
    (acts.length ? `<div class="daysep">일정으로 넣기</div>` : '') +
    acts.map((a, i) => {
      const k = a.category ? 'k-' + a.category : '';
      /* 단추를 **제목 아래**로 내립니다. 오른쪽에 세워두었더니 제목이
         밀려 두 줄로 접히고, 좁은 자리에 단추 둘이 겹쳐 보였습니다. */
      /* **시각이 없으면 그 칸을 아예 안 그립니다.** 전에는 `–` 를 찍었는데,
         AI 제안은 시각이 없는 것이 흔해서 줄마다 뜻 없는 줄표가 하나씩
         서 있었습니다. 빈 칸을 남기면 제목이 50px 밀려 시작합니다. */
      return `<div class="plan">
        ${a.start_time ? `<div class="when">${esc(a.start_time)}</div>` : ''}
        <span class="kdot ${esc(k)}"></span>
        <div class="body"><b>${esc(a.title)}</b>
          <span class="memo">${esc(a.date)}${a.memo ? ' · ' + esc(a.memo) : ''}</span>
          <div class="takepair">
            <button class="small" data-take="a"  data-i="${i}"
                    data-label="일정에 넣기">일정에 넣기</button>
            <button class="small alt" data-take="ap" data-i="${i}"
                    data-label="갈 만한 곳에 담기">갈 만한 곳에 담기</button>
          </div>
        </div></div>`;
    }).join('') +
    (places.length ? `<div class="daysep">갈 만한 곳에 담기</div>` : '') +
    places.map((p, i) => {
      const k = p.category ? 'k-' + p.category : '';
      /* 위 일정 카드와 같은 자리에 둡니다 — 한쪽은 오른쪽, 한쪽은 아래면
         같은 목록 안에서 단추가 두 군데에 있는 셈이 됩니다. */
      /* **현지 이름은 우리말 이름과 다를 때만 답니다.** 국내 장소는 AI 가
         name_local 에 같은 이름을 되돌려주는데, 그대로 이어 붙이니
         "트리고 삼척해변점 / 트리고 삼척해변점 · 삼척해변 뷰가 멋진…" 처럼
         제목이 바로 아래 한 번 더 나왔습니다. 현지 이름이 쓸모 있는 때는
         택시 기사에게 보여줄 때처럼 **글자가 다를 때**뿐입니다. */
      const loc = p.name_local && p.name_local !== p.name ? p.name_local : null;
      return `<div class="plan">
        <span class="kdot ${esc(k)}"></span>
        <div class="body"><b>${esc(p.name)}</b>
          <span class="memo">${esc([loc, p.why].filter(Boolean).join(' · '))}</span>
          <div class="takepair">
            <button class="small" data-take="p" data-i="${i}"
                    data-label="갈 만한 곳에 담기">갈 만한 곳에 담기</button>
          </div>
        </div></div>`;
    }).join('');
}

/* 방금 담은 것들. 되돌리기가 이걸 봅니다.
   담을 때마다 새로 시작합니다 — 열 번 전에 담은 것까지 지우면 그건 사고입니다. */
let lastTake = [];

/* ── 카드를 일정 폼으로 보내기 ────────────────────────────────────────
 * 예전에는 '일정에 넣기'가 곧바로 저장했습니다. AI 가 정해준 날짜·시각
 * 그대로라서, 사용자가 보기에는 **아무 데나 들어간** 것이었습니다.
 * 손으로 넣을 때는 날짜와 시각을 고르는데 불러온 것만 그냥 꽂히는 셈입니다.
 * 이제 일정 추가 폼을 **미리 채워서** 열어줍니다. 정하는 것은 사용자가 합니다.
 *
 * 좌표는 폼에 칸이 없습니다. 여기 들고 있다가 저장할 때 같이 넣습니다 —
 * 안 그러면 이동시간 검사의 재료가 사라집니다. (후보 → 일정도 같은 구멍이
 * 있었습니다. 이 변수를 그쪽에서도 씁니다.) */
let planSeedGeo = null;

function openPlanForm(seed){
  /* 이미 열려 있으면 닫고 다시 엽니다. addplanbtn 이 toggle 이라
     열린 채로 누르면 오히려 닫힙니다. */
  $('plancard').classList.add('hide');
  $('addplanbtn').click();
  $('p_title').value = seed.title || '';
  $('p_cat').value   = seed.category || '';
  $('p_memo').value  = seed.memo || '';
  $('p_date').value  = seed.date || pickedDay || trip.start_date;
  $('p_start').value = seed.start_time || '';
  $('p_end').value   = seed.end_time || '';
  planSeedGeo = (seed.lat != null && seed.lng != null)
    ? { lat: seed.lat, lng: seed.lng } : null;
  $('plancard').scrollIntoView({ behavior:'smooth', block:'nearest' });
}

/* 카드 한 장을 담습니다. 담긴 줄의 id 를 돌려줍니다 (되돌리기용).
   day 를 주면 그 날짜로 넣습니다 — 다 담기에서 날짜를 하나로 고른 경우입니다. */
async function takeCard(kind, i, tripId, day){
  if (kind === 'a'){
    const a = suggested.actions[i];
    /* 날짜를 정해줬으면 그것을 씁니다. AI 가 적어준 날짜는 대개 여행 첫날일
       뿐 근거가 없어서, 하루를 통째로 짜는 경우에는 그쪽이 맞습니다.
       **시각은 그대로 둡니다** — 순서까지 뭉개면 오전·오후가 뒤섞입니다. */
    const date = day || a.date;
    /* 같은 날 맨 뒤로. 좌표가 있으면 같이 넣습니다 — 이동 시간 검사의 재료입니다. */
    const same = plans.filter(p => p.date === date);
    const r = await sb.from('plans').insert({
      trip_id: tripId, date, title: a.title,
      start_time: a.start_time || null, category: a.category,
      memo: a.memo, lat: a.lat, lng: a.lng,
      sort_order: same.length ? Math.max(...same.map(p => +p.sort_order)) + 1 : 0,
    }).select('id');
    if (r.error) throw r.error;
    if (!r.data?.length) throw new Error(NOROW.save);
    return { table:'plans', id:r.data[0].id };
  }
  /* 'ap' = 일정으로 온 것을 후보로 보냅니다. 날짜와 시각은 버립니다 —
     후보는 "언제 갈지 아직 안 정한 곳"이라 날짜가 있으면 뜻이 어긋납니다.
     대신 원래 며칠에 있던 것인지는 메모에 적어둡니다. 지우면 나중에
     "이게 왜 여기 있지"가 됩니다. */
  const src = kind === 'ap' ? suggested.actions[i] : suggested.places[i];
  const p = kind === 'ap'
    ? { name: src.title, name_local: null, category: src.category, lat: src.lat, lng: src.lng,
        why: [src.memo, src.date ? `불러올 때 ${src.date}` : ''].filter(Boolean).join(' · ') }
    : src;
  const r = await sb.from('candidates').insert({
    trip_id: tripId, title: p.name, title_local: p.name_local,
    category: p.category, memo: p.why, lat: p.lat, lng: p.lng,
    source: 'ai',
  }).select('id');
  if (r.error) throw r.error;
  if (!r.data?.length) throw new Error(NOROW.save);
  return { table:'candidates', id:r.data[0].id };
}

function showUndo(){
  const u = $('undotake'); if (!u) return;
  u.classList.toggle('hide', !lastTake.length);
  u.textContent = `방금 담은 ${lastTake.length}개 되돌리기`;
}

$('cards').addEventListener('click', async e => {
  const tripId = $('ai_trip').value;

  /* ── 되돌리기 ── 진짜로 지우지 않고 숨깁니다. 다른 삭제와 같은 방식입니다. */
  if (e.target.id === 'undotake'){
    const u = e.target;
    u.disabled = true; u.innerHTML = '<span class="load">되돌리는 중…</span>';
    for (const t of lastTake)
      await sb.from(t.table).update({ deleted_at: new Date().toISOString() }).eq('id', t.id);
    lastTake = [];
    u.disabled = false; showUndo();
    /* 단추마다 원래 글자가 다릅니다(일정에 · 후보로 · 담기).
       '담기'로 일괄 되돌리면 일정 카드의 단추 두 개가 똑같아집니다. */
    $('cards').querySelectorAll('button[data-take]').forEach(x => {
      x.disabled = false; x.textContent = x.dataset.label || '담기';
      x.classList.remove('hide');      /* 담을 때 감춘 짝 단추를 되살립니다 */
    });
    const all = $('cards').querySelector('button[data-takeall]');
    if (all){ all.disabled = false; all.textContent = all.dataset.orig || all.textContent; }
    toast('되돌렸어요.');
    await runReview(tripId);
    if (trip) await loadPlans();
    return;
  }

  /* ── 다 담기 ── */
  const all = e.target.closest('button[data-takeall]');
  if (all){
    all.dataset.orig = all.textContent;
    all.disabled = true;
    lastTake = [];
    /* 날짜를 골라뒀으면 일정은 전부 그 날로 갑니다. 비워두면 예전처럼
       AI 가 적어준 날짜를 씁니다. 후보는 날짜가 없으니 이 값과 무관합니다. */
    const day = $('takeday')?.value || '';
    const jobs = [
      ...suggested.actions.map((_, i) => ['a', i]),
      ...suggested.places.map((_, i) => ['p', i]),
    ];
    let done = 0;
    for (const [kind, i] of jobs){
      all.textContent = `담는 중… ${++done}/${jobs.length}`;
      try { lastTake.push(await takeCard(kind, i, tripId, day)); }
      catch (err){ all.disabled = false; all.textContent = all.dataset.orig;
                   showUndo(); return fail(err, 'ai'); }
    }
    all.textContent = `${jobs.length}개 담았어요`;
    /* 날짜를 바꿔 넣었으면 그 사실을 말해줍니다. 안 그러면 "왜 다 같은 날에
       있지"를 나중에 목록에서 발견하게 됩니다. */
    if (day) toast(`${day} 에 몰아넣었어요. 시각은 그대로예요.`);
    /* 다 담기는 일정은 일정으로, 후보는 후보로 넣습니다. 그러니 일정 카드의
       '후보로' 단추는 안 쓰인 것이라 글자를 바꾸지 않고 감춥니다. */
    $('cards').querySelectorAll('button[data-take]').forEach(x => {
      if (x.dataset.take === 'ap'){ x.disabled = true; x.classList.add('hide'); return; }
      x.disabled = true; x.textContent = '담았어요';
    });
    showUndo();
    await runReview(tripId);
    if (trip) await loadPlans();
    return;
  }

  /* ── 한 장씩 ── */
  const b = e.target.closest('button[data-take]'); if (!b) return;

  /* 일정으로 넣는 것만 폼을 거칩니다. 후보는 날짜가 없는 것이 본래 뜻이라
     고를 것이 없습니다 — 폼을 띄우면 오히려 한 단계가 늘 뿐입니다. */
  if (b.dataset.take === 'a'){
    const a = suggested.actions[+b.dataset.i];
    if (!a) return;
    if (!tripId) return fail('어느 여행인지 먼저 골라주세요.', 'ai');
    /* AI 시트를 닫고 폼을 엽니다. popstate 는 aiview 만 닫고 일정 폼은
       안 건드리므로 순서가 꼬이지 않습니다. */
    closeAi();
    openPlanForm(a);
    return;
  }

  b.disabled = true; b.innerHTML = '<span class="load">담는 중…</span>';
  try {
    lastTake.push(await takeCard(b.dataset.take, +b.dataset.i, tripId));
  } catch (err){
    b.disabled = false; b.textContent = b.dataset.label || '담기';
    return fail(err, 'ai');
  }
  b.textContent = '담았어요';
  /* 일정 카드에는 단추가 둘입니다. 하나를 담았으면 나머지도 잠급니다 —
     안 그러면 같은 것이 일정에도 후보에도 들어갑니다. */
  b.closest('.plan')?.querySelectorAll('button[data-take]').forEach(x => {
    if (x !== b){ x.disabled = true; x.classList.add('hide'); }
  });
  showUndo();
  await runReview(tripId);          /* 넣었으니 검토 배지도 다시 셉니다 */
});

/* 검토는 채팅을 가리지 않게 접어둡니다. 버튼에는 몇 건인지만 답니다. */
$('reviewbtn').addEventListener('click', () => {
  $('reviewcard').classList.toggle('hide');
  if (!$('reviewcard').classList.contains('hide'))
    $('reviewcard').scrollIntoView({ behavior:'smooth', block:'nearest' });
});
$('reviewclose').addEventListener('click', () => $('reviewcard').classList.add('hide'));

async function runReview(id){
  setAiTripId(id);
  /* 여행을 안 골랐으면 검토할 것이 없습니다. 배지도 지웁니다. */
  if (!id){
    $('review').innerHTML = '<div class="empty">여행을 고르면 일정을 검토해드립니다.</div>';
    $('reviewdot').classList.add('hide');
    $('reviewbtn').classList.add('hide');
    return;
  }
  $('reviewbtn').classList.remove('hide');
  const [{ data:t }, { data:ps }, { data:lg }] = await Promise.all([
    sb.from('trips').select('*').eq('id', id).maybeSingle(),
    sb.from('plans').select('date,start_time,end_time,category,title,lat,lng')
      .eq('trip_id', id).is('deleted_at', null).order('date'),
    sb.from('trip_legs').select('destination,start_date,end_date,walk_max_km,' +
      'walk_min_per_km,walk_base_min,transit_factor,transit_base_min')
      .eq('trip_id', id).order('start_date')
  ]);
  if (!t) return;
  const found = review(t, ps || [], lg || []);
  const noCoord = (ps || []).filter(p => p.lat == null).length;

  /* 버튼 배지는 짚어봐야 할 것만 셉니다. "비어 있습니다"까지 세면
     새 여행에서 숫자가 크게 뜨는데 실은 아무 문제도 아닙니다. */
  const n = found.filter(f => f.lv !== '참고').length;
  $('reviewdot').textContent = n;
  $('reviewdot').classList.toggle('hide', !n);
  $('reviewdot').style.color = found.some(f => f.lv === '심각')
    ? 'var(--bad)' : 'var(--k-food)';

  $('review').innerHTML = found.length
    ? found.map(f => `<div class="plan">
        <span class="kdot" style="background:${LVCOLOR[f.lv]}"></span>
        <div class="body"><b>${esc(f.t)}</b>
          <span class="memo">${esc(f.s)}</span></div>
        <span class="badge" style="color:${LVCOLOR[f.lv]}">${esc(f.lv)}</span></div>`).join('')
      + (noCoord ? `<div class="empty" style="text-align:left; padding:12px 0 0">
           좌표가 없는 일정 ${noCoord}개는 이동 시간을 못 쟀어요.</div>` : '')
    : `<div class="empty">문제를 못 찾았어요.<br>지금 일정은 무리가 없어 보입니다.</div>`;
}

/* ── 평가 ───────────────────────────────────────────────────────────
 * 일정 앱은 1년에 두 번 열립니다. 돌아올 이유를 만드는 자리입니다.
 * 추천은 하지 않습니다 — 예상 별점은 근거보다 세게 들리고,
 * 여행은 틀렸을 때 대가가 영화와 다릅니다.
 * 남들 평균은 예측이 아니라 사실이라 보여주되 몇 명이 매겼는지 같이 답니다. */
/* starHtml · paintStars · markRated 는 stars.js 로 옮겼습니다 (맨 위 import).
   다섯 화면이 같은 모양으로 그려야 하는 것이라 한곳에 모았습니다. */

/* ── 남들 평균 한 조각 ────────────────────────────────────────────────
 * `· 평균 4.2 (7명)` 을 만듭니다. 기록 탭과 보관함이 같이 씁니다 —
 * 두 곳에 따로 적어두면 한쪽만 고치게 됩니다.
 *
 * ⚠ **`n_rated` 에는 나도 들어 있습니다.** 그래서 나 말고 한 명이라도
 *   더 매겼을 때만 답니다. 안 그러면 내가 매긴 도시 목록에서 `★★★☆☆`
 *   바로 옆에 `평균 3.0 (1명)` 이 붙습니다 — 내 별점을 숫자로 한 번 더
 *   읽어주는 것이라 아무 말도 안 하는 것과 같습니다.
 *   기록 탭처럼 내가 안 매긴 도시가 섞인 목록에서는 `n_rated` 가 1이어도
 *   그건 남 한 명이므로 그대로 나옵니다. 그래서 숫자를 빼서 셉니다. */
function avgTail(stat, mine){
  const others = (stat?.n_rated || 0) - (mine?.stars != null ? 1 : 0);
  return others > 0
    ? ` · 평균 ${Number(stat.avg_stars).toFixed(1)} (${stat.n_rated}명)` : '';
}

/* ── 평가 자료를 받는 곳은 여기 하나입니다 ────────────────────────────
 * myRates · cityStat · visited 는 **네 화면이 같이 쓰는 자료**입니다
 * (평가 화면 · 보관함 · 홈 발자국 · 별점 저장).
 * 전에는 같은 질의가 그 네 곳에 손으로 베껴져 있었고 **이미 서로 달랐습니다**:
 *   - 보관함만 updated_at 을 받아왔습니다 (정렬에 쓰므로)
 *   - **보관함은 오류를 확인하지 않았습니다.** 질의가 실패하면 myRates 가
 *     {} 가 되어 "평가가 하나도 없음"으로 보이고, 공유 자료라 평가 화면까지
 *     같이 비었습니다. 조용한 실패라 아무도 몰랐습니다.
 * 배지 버그(my_footprint 를 my_counts 가 베껴 적은 것)와 같은 모양입니다.
 *
 * 칸은 두 화면이 쓰는 것을 **합쳐서** 받습니다 — 한쪽만 늘리면 다른 쪽이
 * 조용히 빈 값을 씁니다.
 * **실패하면 아무것도 안 바꿉니다.** 반쯤 지워진 자료가 빈 화면보다 나쁩니다. */
async function loadRateData(){
  const [mine, stats, vis] = await Promise.all([
    sb.from('city_ratings').select('city_id,stars,want,comment,updated_at')
      .eq('user_id', me.id),
    sb.rpc('city_stats'),
    sb.rpc('my_visited'),
  ]);
  if (mine.error) return { error: mine.error };
  /* 넣는 것은 rate.js 가 합니다 — 셋을 한 번에 맞추고, 못 받은 것은 안 건드립니다. */
  setRateData({ mine, stats, vis });
  return {};
}

/* 다녀온 곳만 다시 셉니다. 별점을 지웠을 때와 홈 발자국이 씁니다.
   **응답을 통째로 넘깁니다.** 전에는 `v.data || []` 로 넘어가서, 못 받아오면
   다녀온 곳이 통째로 빈 Set 이 됐습니다 — 홈 발자국이 이걸 부르므로 그때
   세계지도가 하얘졌습니다. rate.js 가 오류면 아무것도 안 바꿉니다. */
async function refreshVisited(){
  setVisited(await netTimeout(sb.rpc('my_visited')));
}

async function loadRatings(){
  /* 도시 목록은 받아둔 것이 있어도 **내 별점은 서버에서** 옵니다.
     별점 없이 도시만 늘어놓으면 뭘 매겼는지 모르고, 눌러도 저장이 안 됩니다.
     오프라인이면 아예 안 물어보고 알립니다. */
  if (netIsDown()){
    $('ratelist').innerHTML =
      `<div class="empty" style="padding:26px 12px">
         연결이 없어 기록은 지금 볼 수 없어요.<br>
         <span class="memo">별점과 평가는 서버에 저장됩니다.</span></div>`;
    lastRateHtml = '';          /* 안내로 갈아끼웠으니 다음엔 반드시 다시 그립니다 */
    $('r_head').textContent = '도시';
    $('addcity').classList.add('hide');
    drawOffbar(); return;
  }
  $('rateerr').classList.add('hide');
  await loadCities();
  fillCityList();

  /* ⚠ **네트워크 셋을 다 기다린 뒤에야 그리고 있었습니다** (실기기에서 지적받음).
     `loadRateData` 는 city_ratings · city_stats · my_visited 셋을 받아옵니다.
     탭을 누를 때마다 그 왕복이 끝나야 첫 글자가 나오니, 두 번째부터도
     매번 빈 화면을 보게 됩니다 — **이미 다 아는 내용인데도요.**
     별점 · 통계 · 다녀온 곳은 rate.js 에 그대로 살아 있습니다(탭을 옮겨도
     안 비웁니다). 있으면 **그것으로 먼저 그리고** 새것은 뒤에서 받습니다.
     받아온 뒤 달라진 게 없으면 위 `lastRateHtml` 이 다시 그리는 것을 막으므로
     사진도 안 깜빡입니다. */
  const warm = !!(myRates && Object.keys(myRates).length);
  if (warm) drawRatings();

  const r = await loadRateData();
  /* 이미 그려둔 것이 있으면 오류로 그것을 지우지 않습니다 —
     연결이 잠깐 끊긴 것 때문에 멀쩡히 보던 목록이 사라지면 안 됩니다. */
  if (r.error) return warm ? undefined : fail(r.error, 'rate');
  clearJustRated();       /* 다시 들어왔으니 매긴 것은 이제 목록에서 뺍니다 */
  drawRatings();
}

/* 칩으로 놔둔 것은 둘뿐입니다. 나머지는 프로필 보관함에서 걸러 들어옵니다.
   그때는 무엇으로 걸렀는지 알려주고 풀 길을 같이 줍니다. */
const NARROW = { todo:'아직 안 매긴 다녀온 도시', been:'다녀온 도시', mine:'내가 매긴 곳' };

/* 여행 카드·히어로의 밑줄. **여행 이름이 대표 도시와 같으면 도시를 뺍니다** —
   여행을 도시 이름으로 짓는 일이 흔한데, 그러면 "도쿄 / 도쿄 · 9월 12일 –
   15일 · 4일" 처럼 같은 말이 바로 위아래로 두 번 나옵니다.
   두 화면이 같은 규칙을 써야 하므로 여기 한 곳에 둡니다. */
const tripSub = (t, days) =>
  (t.destination && t.destination !== t.title ? `${t.destination} · ` : '') +
  `${dateRange(t.start_date, t.end_date)} · ${days}일`;

function setRateFilter(f){
  putRateFilter(f);
  document.querySelectorAll('#r_filter button').forEach(x =>
    x.classList.toggle('on', x.dataset.rf === f));
  $('r_narrow').classList.toggle('hide', !NARROW[f]);
  if (NARROW[f]) $('r_narrowtext').textContent = `${NARROW[f]}만 보는 중`;
  drawRatings();
  $('r_q').scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function drawRatings(){
  const q = $('r_q').value.trim().toLowerCase();
  const cho = /^[ㄱ-ㅎ]+$/.test(q);
  let list = (cities || []).filter(c => {
    if (q && !(cho ? c._cho.includes(q) : c._hay.includes(q))) return false;
    const r = myRates[c.id];
    if (rateFilter === 'todo') return visited.has(c.id) && r?.stars == null;
    if (rateFilter === 'been') return visited.has(c.id);
    if (rateFilter === 'want') return !!r?.want;
    if (rateFilter === 'mine') return r?.stars != null;
    if (rateFilter === 'comment') return !!r?.comment;
    /* 기본 목록에는 아직 안 매긴 곳만 둡니다. 매긴 것이 계속 쌓여 있으면
       남은 게 안 보여서 더 안 매기게 됩니다. 매긴 것은 프로필에서 봅니다.
       방금 매긴 것은 남겨둡니다 — 잘못 눌렀을 때 그 자리에서 고쳐야 합니다. */
    return r?.stars == null || justRated.has(c.id);
  });
  /* 아직 안 매긴 다녀온 곳을 맨 위로, 그다음 높은 별점 순.
     기록 화면에 왔으면 "매길 게 남았나"가 먼저 궁금합니다.
     **매길 게 없으면 가나다순이 됩니다.** 그러면 첫 화면이 가고시마·가나자와·
     가마쿠라… 로 시작하는 사전이 됩니다. 매긴 곳이 49개인 사람에게도
     그랬습니다 — 이름을 알고 찾아오는 게 아니면 아무 쓸모가 없습니다.
     그래서 그 자리는 이름난 곳 순으로 채웁니다. 찾아서 오는 사람은
     위의 검색칸을 씁니다(초성도 됩니다).
     **fame 은 1이 이름난 쪽입니다** — 파리·로마·도쿄가 1, 겐트·공주가 3.
     처음에 큰 값을 앞에 두었더니 목록이 겐트·골웨이·공주로 시작했습니다.
     값이 없으면 맨 뒤로 보냅니다. */
  const rank = c => (visited.has(c.id) && myRates[c.id]?.stars == null) ? 999
                  : (myRates[c.id]?.stars ?? -1);
  list.sort((a, b) => rank(b) - rank(a)
                   || (a.fame ?? 9) - (b.fame ?? 9)
                   || a.name.localeCompare(b.name, 'ko'));

  $('r_head').textContent = { been:'다녀온 곳', want:'가보고 싶은 곳',
                              mine:'내가 매긴 곳', comment:'한줄평 남긴 곳',
                              todo:'매길 곳' }[rateFilter] || '도시';

  /* 찾는 이름이 목록에 없으면 직접 넣을 수 있게 안내합니다. */
  const exact = q && (cities || []).some(c => c.name.toLowerCase() === q);
  const canAdd = q.length >= 2 && !cho && !exact;
  $('addcity').classList.toggle('hide', !canAdd);
  if (canAdd) $('ac_hint').textContent =
    `"${$('r_q').value.trim()}" 을(를) 이 국가의 도시로 넣어요.`;

  if (!list.length && !canAdd){
    $('ratelist').innerHTML = '<div class="empty">찾는 도시가 없어요.</div>';
    lastRateHtml = '';
    return;
  }

  /* 끝까지 내리면 더 불러옵니다. 80곳에서 자르고 "검색하세요" 라고만 하면
     222곳이 영영 안 보입니다. */
  const html = list.slice(0, rateShown).map(c => {
    const r = myRates[c.id] || {}, s = cityStat[c.id];
    const todo = visited.has(c.id) && r.stars == null;
    /* 사진이나 이름을 누르면 그 도시 페이지가 열립니다.
       별과 하트는 아래 처리에서 먼저 걸러지므로 여기 걸리지 않습니다. */
    return `<div class="rrow" data-cityopen="${esc(c.id)}">
      ${c.image_url
        ? `<img class="thumb" src="${esc(c.image_url)}" alt="" loading="lazy"
               onerror="this.replaceWith(Object.assign(document.createElement('span'),
                 {className:'thumb ph', textContent:'${esc(c.name.slice(0,1))}'}))">`
        : `<span class="thumb ph">${esc(c.name.slice(0,1))}</span>`}
      <div class="t"><b>${esc(c.name)}</b>
        ${todo ? '<span class="ktag" style="--kc:#f5a623">평가 대기</span>' : ''}
        <span class="memo">${esc(countryName[c.country] || c.country)}${
          visited.has(c.id) ? ' · 다녀옴' : ''}${avgTail(s, r)}</span>
      </div>
      <span class="stars" data-city="${esc(c.id)}">${starHtml(r.stars)}</span>
      <button class="ghost want${r.want ? ' on' : ''}" data-want="${esc(c.id)}"
              title="가보고 싶어요">♡</button>
    </div>`;
  }).join('') + (list.length > rateShown
    ? '<div class="empty" id="ratemore">더 불러오는 중…</div>' : '');

  /* ⚠ **같은 것을 다시 그리면 사진이 깜빡입니다** (실기기에서 지적받음).
     `showApp('rate')` 가 탭을 누를 때마다 `loadRatings()` 를 부르고, 여기가
     `innerHTML` 을 갈아끼웁니다. 글자는 똑같이 다시 그려도 티가 안 나는데
     **`<img>` 80개는 통째로 버려졌다가 새로 만들어져서** 빈 칸이 보였다가
     채워집니다. 같은 주소인데도 그렇습니다 — 요소가 새것이라 처음부터
     다시 그리는 것이라서요.
     → **글자가 한 자도 안 달라졌으면 손대지 않습니다.** 그러면 사진 요소가
       그대로 살아 있어 깜빡일 일이 없습니다.
     비교는 우리가 만든 글자끼리 합니다 — `el.innerHTML` 을 도로 읽으면
     브라우저가 따옴표와 속성 순서를 제 식대로 바꿔 놓아서 **늘 다르다고 나옵니다.** */
  if (html !== lastRateHtml){
    $('ratelist').innerHTML = html;
    lastRateHtml = html;
  }
  /* 바닥에 닿으면 더 그립니다. 스크롤 값을 재는 것보다 어긋날 자리가 적습니다. */
  const more = $('ratemore');
  if (more){
    rateObs?.disconnect();
    rateObs = new IntersectionObserver(es => {
      if (!es[0].isIntersecting) return;
      rateShown += 60; rateObs.disconnect(); drawRatings();
    }, { rootMargin:'400px' });
    rateObs.observe(more);
  }
}

$('ac_add').addEventListener('click', async () => {
  const name = $('r_q').value.trim();
  if (name.length < 2) return;
  $('rateerr').classList.add('hide');
  $('ac_add').disabled = true;

  /* 나라만 넘기면 통화·언어·시간대는 004 의 트리거가 채웁니다.
     좌표와 이동 등급은 비워 둡니다 — 나중에 채우면 이동시간 검사가 좋아집니다. */
  const { data, error } = await sb.from('cities')
    .insert({ name, country: $('ac_country').value, created_by: me.id })
    .select('id,name,name_en,name_local,country,currency,timezone,transit_grade,image_url')
    .maybeSingle();
  $('ac_add').disabled = false;

  if (error){
    return fail(/duplicate|unique/i.test(error.message)
      ? '그 나라에 같은 이름의 도시가 이미 있어요.' : error, 'rate');
  }
  if (!data) return fail(NOROW.save, 'rate');

  /* 목록 뭉치에 바로 끼워 넣습니다. 다시 받아오면 화면이 한 번 껌뻑입니다. */
  /* **색인 만드는 식을 여기 다시 적지 않습니다.** 전에는 useCities 의 식을
     그대로 베껴 적어 두 벌이었습니다 — 규칙을 바꿀 때 한쪽만 고치면 새로 만든
     도시만 검색에서 사라집니다. cities.js 가 같은 식으로 색인해 끼웁니다. */
  addCity(data);
  $('r_q').value = data.name;
  drawRatings();
});

$('r_q').addEventListener('input', drawRatings);
for (const id of ['r_filter', 'r_narrow'])
  $(id).addEventListener('click', e => {
    const b = e.target.closest('button[data-rf]');
    if (b) setRateFilter(b.dataset.rf);
  });

$('ratelist').addEventListener('click', async e => {
  /* 별 왼쪽 절반은 반 개, 오른쪽 절반은 한 개 — 왓챠피디아와 같은 방식입니다. */
  const st = e.target.closest('.st');
  if (st){
    const wrap = st.closest('.stars'), cityId = wrap.dataset.city;
    const box = st.getBoundingClientRect();
    const v = +st.dataset.n - ((e.clientX - box.left) < box.width / 2 ? 0.5 : 0);
    /* 같은 점수를 다시 누르면 지웁니다. 잘못 누른 것을 되돌릴 길이 있어야 합니다.
       "다녀옴"은 따로 켜지 않습니다 — 별점이 있으면 다녀온 것으로 계산됩니다. */
    const cur = myRates[cityId]?.stars;
    const next = Number(cur) === v ? null : v;
    /* 저장을 기다리지 않고 먼저 칠합니다. 여기서는 줄을 옮기지도 지우지도 않습니다. */
    paintStars(wrap, next, true);
    markRated(st.closest('.rrow'), next);
    /* 줄을 직접 손댔습니다(별 칠하기 · ★기록 딱지). 만든 글자에는 그 딱지가
       없으므로, 여기서 무효로 해두지 않으면 다음 그리기가 "같다"고 건너뛰어
       화면과 어긋난 채로 남습니다. */
    lastRateHtml = '';
    await saveRate(cityId, { stars: next }, true);
    return;
  }
  const w = e.target.closest('button[data-want]');
  if (w) return saveRate(w.dataset.want, { want: !myRates[w.dataset.want]?.want });

  /* 별과 하트가 아니면 도시 페이지를 엽니다. */
  const row = e.target.closest('[data-cityopen]');
  if (row) await openCity(row.dataset.cityopen);
});

async function saveRate(cityId, patch, quiet){
  const r = await sb.from('city_ratings')
    .upsert({ user_id: me.id, city_id: cityId, ...patch },
            { onConflict: 'user_id,city_id' })
    .select('city_id,stars,want,comment').maybeSingle();
  if (r.error) return fail(r.error, 'rate');
  /* 별점 · 방금 매긴 것 · 다녀온 곳을 **한 번에** 맞춥니다(rate.js).
     셋을 따로 적으면 그중 하나를 빠뜨립니다. 별을 지운 경우만 다녀온 곳을
     여기서 못 정합니다 — 지난 여행 기록이 있으면 그대로 다녀온 곳이라
     서버에 다시 물어야 합니다. 물어야 하는지는 rate.js 가 알려줍니다. */
  if (applyRate(cityId, r.data, patch).recount) await refreshVisited();
  /* 평균은 남들 것까지 합친 값이라 다시 받아야 맞습니다. */
  const s = await sb.rpc('city_stats', { p_city: cityId });
  putCityStat(cityId, s.data?.[0]);
  /* 조용히 저장할 때는 다시 그리지 않습니다 — 누른 줄이 제자리에 있어야 합니다. */
  if (!quiet) drawRatings();
}

/* ── 도시 상세 ──────────────────────────────────────────────────────
 * 왓챠는 포스터를 누르면 작품 페이지가 열립니다. 여행앱에서는 그보다 쓸모가
 * 있는데, **내가 그 도시에서 뭘 했는지**를 같이 보여줄 수 있기 때문입니다.
 * 일정에 이미 다 적혀 있으니 새로 입력받을 것이 없습니다. */
async function openCity(id){
  const c = (cities || []).find(x => x.id === id);
  if (!c) return;
  cityOpen = c;
  if (history.state?.t2 !== 'city') history.pushState({ t2:'city' }, '');

  /* 홈에서도 지도에서도 도시를 열 수 있습니다 — 열린 탭이 뭐든 다 덮어야 합니다.
     setview 안쪽(프로필/지도/설정) 상태는 건드리지 않아서 닫으면 그대로 돌아옵니다. */
  $('rateview').classList.add('hide');
  $('homeview').classList.add('hide');
  $('setview').classList.add('hide');
  $('cityview').classList.remove('hide');
  window.scrollTo({ top:0 });

  const r = myRates[id] || {}, s = cityStat[id];
  $('cv_hero').style.backgroundImage = c.image_url ? `url("${c.image_url}")` : '';
  $('cv_hero').classList.toggle('ph', !c.image_url);
  $('cv_hero').textContent = c.image_url ? '' : c.name.slice(0, 1);
  $('cv_name').textContent = c.name;
  $('cv_sub').textContent = [countryName[c.country] || c.country, c.name_local,
                             visited.has(id) ? '다녀옴' : null].filter(Boolean).join(' · ');
  $('cv_avg').textContent  = s?.n_rated ? Number(s.avg_stars).toFixed(1) : '–';
  $('cv_avgn').textContent = s?.n_rated ? `${s.n_rated}명이 매김` : '아직 아무도 안 매김';
  $('cv_stars').innerHTML  = starHtml(r.stars);
  $('cv_want').classList.toggle('on', !!r.want);
  $('cv_note').value = r.comment || '';
  cvNoteDirty();

  /* 위키백과 요약. 없는 도시는 아래 사실만 보여줍니다. */
  $('cv_about').classList.toggle('hide', !c.summary);
  if (c.summary){
    $('cv_summary').textContent = c.summary;
    $('cv_src').href = c.summary_url || '#';
  }
  /* API 없이 이미 아는 것들 — 나라·대륙·통화·시간대.
     '다니기'(대중교통 등급)는 걷어냈습니다. 등급을 알아도 할 수 있는 일이
     없고, 정작 필요한 것은 이동 시간인데 그건 일정 화면이 따로 말해줍니다.
     transit_grade 자체는 그 계산에 계속 쓰이므로 DB 에는 그대로 둡니다. */
  $('cv_facts').innerHTML = [
    ['대륙', continentOf[c.country]],
    ['통화', c.currency],
    ['현지 시각', (localTime(c.timezone) || '').replace('현지 ', '')],
  ].filter(([, v]) => v).map(([k, v]) =>
    `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');

  /* 남들 한줄평. 별점만 매긴 사람은 여기 안 나옵니다 — 이름이 걸리니까요. */
  const { data: cm } = await sb.rpc('city_comments', { p_city: id });
  const others = (cm || []).filter(x => x.user_id !== me.id);
  $('cv_comments').innerHTML = others.length
    ? `<div class="daysep">다른 사람들</div>` + others.map(x =>
        `<div class="rrow" style="padding:10px 0">
           ${avatarImg(x.avatar_url, x.user_id, x.name,
                       'width:36px; height:36px; border-radius:50%; object-fit:cover', 'thumb')}
           <div class="t"><b>${esc(x.name)}</b>
             <span class="memo">${esc(x.comment)}</span>
             <span class="stars" style="pointer-events:none">${starHtml(x.stars)}</span></div>
         </div>`).join('')
    : '';

  /* 이 도시를 구간으로 가진 내 여행들. RLS 가 내 것만 내려줍니다. */
  const { data: lg, error } = await sb.from('trip_legs')
    .select('trip_id,start_date,end_date,trips(id,title,start_date,end_date)')
    .eq('city_id', id).order('start_date', { ascending:false });
  if (error) return fail(error, 'cv');

  if (!lg?.length){
    $('cv_trips').innerHTML =
      '<div class="empty">아직 이 도시로 간 여행이 없어요.</div>';
    return;
  }
  /* 그 구간 날짜에 걸린 일정만 가져옵니다 — 다른 도시 일정이 섞이면 안 됩니다. */
  const { data: ps } = await sb.from('plans')
    .select('trip_id,date,start_time,category,title')
    .in('trip_id', lg.map(l => l.trip_id))
    .is('deleted_at', null).order('date').order('start_time');

  $('cv_trips').innerHTML = lg.map(l => {
    const t = l.trips;
    const mine = (ps || []).filter(p => p.trip_id === l.trip_id
                    && p.date >= l.start_date && p.date <= l.end_date);
    return `<div style="margin-bottom:var(--s-md)">
      <div class="row" style="border:0; padding:0; margin:0; cursor:pointer"
           data-cvtrip="${esc(t.id)}">
        <span class="label"><b>${esc(t.title)}</b>
          <div class="memo">${esc(dateRange(l.start_date, l.end_date))} · ${mine.length}곳</div>
        </span><span class="val">여행 보기 ›</span></div>
      ${mine.map(p => {
        const k = p.category ? 'k-' + p.category : '';
        return `<div class="plan" style="padding:7px 0">
          <span class="kdot ${esc(k)}"></span>
          <div class="body"><b>${esc(p.title)}</b>
            <span class="memo">${esc(p.date)}${
              p.start_time ? ' ' + hm(p.start_time) : ''}</span></div></div>`;
      }).join('')}
    </div>`;
  }).join('');
}

function closeCity(fromPop){
  if (!fromPop && history.state?.t2 === 'city'){ history.back(); return; }
  cityOpen = null;
  $('cityview').classList.add('hide');
  /* 열었던 탭으로 돌아갑니다. 홈에서 열고 기록 탭에 떨어지면 이상합니다. */
  if (appTab === 'home'){ $('homeview').classList.remove('hide'); loadHome(); }
  else if (appTab === 'set') $('setview').classList.remove('hide');
  else { $('rateview').classList.remove('hide'); drawRatings(); }
}

$('cityview').addEventListener('click', async e => {
  const t = e.target.closest('[data-cvtrip]');
  if (t){ closeCity(); return openTrip(t.dataset.cvtrip); }

  const st = e.target.closest('#cv_stars .st');
  if (st){
    const box = st.getBoundingClientRect();
    const v = +st.dataset.n - ((e.clientX - box.left) < box.width / 2 ? 0.5 : 0);
    const cur = myRates[cityOpen.id]?.stars;
    await saveRate(cityOpen.id, { stars: Number(cur) === v ? null : v });
    return openCity(cityOpen.id);
  }
  if (e.target.closest('#cv_want')){
    await saveRate(cityOpen.id, { want: !myRates[cityOpen.id]?.want });
    $('cv_want').classList.toggle('on', !!myRates[cityOpen.id]?.want);
  }
});
/* 쓴 것이 저장된 것과 다를 때만 버튼이 살아납니다 —
   눌러도 아무 일 없는 버튼이 켜져 있으면 저장됐는지 헷갈립니다. */
function cvNoteDirty(){
  const now   = $('cv_note').value.trim();
  const saved = (myRates[cityOpen?.id]?.comment || '').trim();
  const b = $('cv_save');
  b.disabled = now === saved;
  b.textContent = now ? '등록' : '지우기';
}
$('cv_note').addEventListener('input', cvNoteDirty);
$('cv_save').addEventListener('click', async () => {
  const v = $('cv_note').value.trim() || null;
  $('cv_save').disabled = true;
  await saveRate(cityOpen.id, { comment: v });
  $('cv_save').textContent = v ? '등록했어요' : '지웠어요';
  /* 남들 한줄평 목록에 내 것이 바로 끼어들어야 남긴 느낌이 납니다. */
  await openCity(cityOpen.id);
});

/* ── 홈 ─────────────────────────────────────────────────────────────
 * 세 덩어리입니다.
 *   ① 히어로   — 다음 여행을 도시 사진 위에. 여행이 없으면 가고 싶은 곳.
 *   ② 가봤어요 — 안 매긴 도시 한 곳에 별을 매깁니다.
 *   ③ 발자국   — 195개국 중 몇 곳인지.
 *
 * ①은 1년에 두세 번만 의미가 있습니다. 나머지 360일을 ②③이 채웁니다.
 * 일정과 검토는 홈에서 뺐습니다 — 여행 탭과 AI 탭에 이미 있습니다. */

/* 사진은 구간에 붙은 도시에서 가져옵니다.
   예전에 만든 여행은 trips.city_id 가 비어 있어서 구간을 먼저 봅니다. */
async function tripPhoto(t){
  /* **나라도 같이 받아옵니다.** 아래 대체 사진이 나라를 알아야 하는데,
     `t.country` 는 부르는 두 곳(buildHome · pendingTrip)의 select 에 **없습니다**
     (재봄). 부르는 쪽을 둘 다 고치는 대신, 구간에서 가져옵니다 —
     구간에는 늘 나라가 붙어 있고 여기서 이미 한 번 물어보고 있습니다. */
  const lg = await netTimeout(sb.from('trip_legs')
    .select('city_id, country, cities(image_url)').eq('trip_id', t.id).order('start_date'));
  const hit = (lg.data || []).find(l => l.cities?.image_url);
  if (hit) return hit.cities.image_url;
  const country = (lg.data || []).find(l => l.country)?.country || t.country;
  /* 구간에 도시가 안 붙어 있으면 이름으로 마지막 한 번 찾아봅니다. */
  const c = await netTimeout(sb.from('cities').select('image_url')
    .eq('name', t.destination).not('image_url', 'is', null).limit(1));
  if (c.data?.[0]?.image_url) return c.data[0].image_url;

  /* ── 그래도 없으면 **같은 나라의 대표 도시** 사진을 빌립니다 ──────────
   * '삼척'처럼 우리 목록에 없는 곳으로 만든 여행은 여기까지 옵니다.
   * 그때 색만 깔면 화면에서 제일 큰 자리가 빈 덩어리가 됩니다(b281).
   * 도시는 몰라도 **나라는 압니다.** 그 나라에서 한 곳을 빌려 옵니다.
   *
   * 고르는 순서: `pop_rank`(나라마다 한 곳씩 매겨둔 대표) → 없으면
   * `fame` 이 낮은 것(1 이 누구나 아는 곳). **pop_rank 는 88개국 중
   * 16개국에만 있어서** 그것만으로는 대부분의 나라에서 못 고릅니다.
   * 이름순을 마지막 기준으로 둡니다 — 같은 여행이 열 때마다 다른 사진이면
   * "내 여행"으로 안 읽힙니다. **늘 같은 것이 나와야 합니다.**
   *
   * ⚠ **이 사진은 그 사람이 가는 곳이 아닙니다.** 삼척 여행에 강릉 사진이
   * 걸립니다(같은 강원도 동해안이라 그럴듯하지만, 프랑스 시골 여행에 파리
   * 사진이 걸리는 경우도 있습니다). 그래서 **제목과 밑줄은 늘 진짜 목적지**를
   * 적습니다 — 사진은 분위기고, 어디로 가는지는 글자가 말합니다.
   * 지역까지 맞추려면 구간에 좌표가 있어야 하는데, 직접 쳐서 만든 구간은
   * `center_lat` 이 비어 있어(재봄) 거리로는 못 고릅니다. */
  if (!country) return null;
  const n = await netTimeout(sb.from('cities')
    .select('image_url,pop_rank,fame,name')
    .eq('country', country).not('image_url', 'is', null)
    .order('pop_rank', { ascending: true, nullsFirst: false })
    .order('fame',     { ascending: true, nullsFirst: false })
    .order('name').limit(1));
  return n.data?.[0]?.image_url || null;
}

/* ── 사진이 없을 때의 히어로 ──────────────────────────────────────────
 * 도시 사진은 469곳에 다 있지만 **'삼척 여행'처럼 목록에 없는 곳으로 만든
 * 여행은 사진이 없습니다.** 그때 밋밋한 회색 판이 떴는데, 홈에서 제일 큰
 * 자리가 회색이면 앱이 덜 만들어진 것처럼 보입니다.
 *
 * 색을 이름에서 뽑습니다 — **같은 여행은 늘 같은 색**이라야 "내 여행"으로
 * 읽힙니다. 무작위면 열 때마다 달라져서 오히려 거슬립니다.
 * 색표는 성향 카드가 쓰는 것을 그대로 빌립니다(card.js 의 PERSONA_BG) —
 * 앱 안에서 색이 두 벌이 되면 같은 앱처럼 안 보입니다. */
const HERO_BG = ['rare', 'deep', 'taste', 'size', 'plan', 'spend', 'speed'];
function heroTint(seed){
  const s = String(seed || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PERSONA_BG[HERO_BG[h % HERO_BG.length]];
}

function heroHtml(photo, dd, title, memo, btn){
  /* 사진이 없으면 색을 깝니다. `.hero::after` 가 위에 어둡게 덮으므로
     글자는 사진이 있을 때와 똑같이 읽힙니다.
     **`noimg` 를 같이 답니다** — 사진이 없으면 236px 을 채울 것이 없어서
     위쪽 절반이 빈 색 덩어리로 남습니다(사용자 지적). 높이 규칙을 갈라야
     하는데, 그건 CSS 가 알아야 하므로 클래스로 알려줍니다. */
  const tint = photo ? '' : ` style="background:${heroTint(title + memo)}"`;
  return `<div class="hero${photo ? '' : ' noimg'}" id="hero"${tint}>
    ${photo ? `<img src="${esc(photo)}" alt="" onerror="this.remove()">` : ''}
    ${dd ? `<div class="dd">${esc(dd)}</div>` : ''}
    <div class="ht">${esc(title)}</div>
    <div class="hm">${esc(memo)}</div>
    ${btn ? `<button class="hbtn" id="herobtn">${esc(btn)}</button>` : ''}
  </div>`;
}

/* 홈은 받아올 것이 여럿입니다(도시·다음 여행·평가·발자국).
   하나라도 실패하면 그대로 멈춰서 "불러오는 중…"만 남았습니다.
   중간에 죽어도 화면에는 뭐라도 남기고, 왜 그런지 말합니다. */
async function loadHome(){
  /* **오프라인이라고 미리 포기하지 않습니다 (b242).**
     전에는 `if (netIsDown()) return offHome();` 로 시작했습니다. "어차피 하나도
     못 오니 물어보지 말고 바로 알리자"는 뜻이었는데, buildHome 은 다음 여행을
     **캐시에서 꺼내 그릴 줄 압니다**(cacheGet('nexttrip')).
     그래서 비행기모드에서 처음 열면 D-35 히어로가 멀쩡히 나오는데,
     여행 탭에 갔다 오면 그때는 netIsDown() 이 참이 되어 있어서 같은 화면이
     "홈은 지금 볼 수 없어요"로 바뀌었습니다 — **뒤로 갈수록 못 보게 되는 셈**이라
     사용자가 바로 알아챘습니다.
     이제 질의가 전부 netTimeout 을 지나고, netTimeout 은 끊긴 걸 알면 **요청을
     아예 안 만들고 즉시 돌아옵니다.** 기다릴 것이 없으니 미리 포기할 이유도
     없어졌습니다. 그려보고, 정말 아무것도 못 그렸을 때만 안내합니다. */
  /* 오프라인 안내는 한 곳에서만 만듭니다. 아래 두 군데가 같은 말을 해야 하는데
     따로 적으면 갈립니다. */
  const offHome = () => {
    $('home').innerHTML =
      `<div class="card"><div class="empty" style="padding:26px 12px">
         연결이 없어 홈은 지금 볼 수 없어요.<br>
         <span class="memo">다음 여행 · 평가 · 발자국은 서버에서 가져옵니다.</span>
         <div style="margin-top:14px; font-size:var(--f-lg)">
           <b>여행</b> 탭은 지금도 쓸 수 있어요.<br>
           <span class="memo">한 번이라도 열어본 여행은 일정 · 지출 · 준비물까지
           그대로 보입니다.</span></div>
         <div style="margin-top:16px">
           <button class="primary" id="hometotrip">여행 보러 가기</button></div>
       </div></div>`;
    $('hometotrip').onclick = () => showApp('trips');
    drawOffbar();
  };
  /* 그린 것이 있나. **자리표시자("불러오는 중…")는 그린 것이 아닙니다** —
     그게 남아 있으면 계속 돌기만 하고 사용자는 곧 뜰 줄 압니다. */
  const 그렸나 = () => !$('home').querySelector('.load') &&
                       !!$('home').querySelector('.hero, .card, .rvbar');
  try {
    await buildHome();
    if (!그렸나()) offHome();
    else if (netIsDown()) drawOffbar();   /* 캐시로 그렸으면 그렇다고 띠를 띄웁니다 */
  }
  catch (e){
    if (그렸나()) return drawOffbar();    /* 도중에 죽었어도 뭔가 남았으면 둡니다 */
    if (netIsDown()) return offHome();
    $('home').innerHTML =
      `<div class="card"><div class="empty">홈을 불러오지 못했어요.<br>
         <button class="small" id="homeretry" style="margin-top:10px">다시 시도</button>
       </div></div>`;
    $('homeretry').onclick = loadHome;
    drawOffbar();
  }
}

async function buildHome(){
  const today = todayYmd();
  await loadCities();          /* 나라 이름과 도시 페이지에 필요합니다. 한 번만 받습니다. */

  /* 다녀왔는데 아직 별점을 안 매긴 여행. 앞으로 갈 여행이 먼저이므로
     그때는 히어로 아래 얇은 띠로만 붙입니다 — 위가 두 덩어리가 되면 무겁습니다. */
  const pend = await pendingTrip();
  const rvBar = () => {
    if (!pend) return;
    const b = document.createElement('div');
    b.className = 'rvbar';
    b.innerHTML = `<span class="t"><b>${esc(pend.trip.title)} 어땠어요?</b>
        <span>다녀오신 곳을 평가해주세요${
          pend.places.length ? ` · ${pend.places.length}곳` : ''}</span></span>
      <span class="go">평가 ›</span>`;
    b.onclick = () => openReviewTrip(pend.trip.id);
    $('home').appendChild(b);
  };

  let { data, error } = await netTimeout(sb.from('trips')
    .select('id,title,destination,start_date,end_date,currency,timezone')
    .gte('end_date', today)
    .order('start_date').limit(1));
  /* 다음 여행은 여행 중에 제일 보고 싶은 것입니다. 캐시로라도 보여줍니다. */
  if (error){
    data = cacheGet('nexttrip');
    if (!data) throw error;
    drawOffbar();
  } else cacheSet('nexttrip', data);

  /* 앞으로 갈 여행이 없고 평가만 남았으면, 그때는 평가를 크게 겁니다. */
  if (!data.length && pend){
    const photo = await tripPhoto(pend.trip);
    $('home').innerHTML = heroHtml(photo, '',
      `${pend.trip.title} 어땠어요?`,
      '다녀오신 곳을 평가해주세요' +
      (pend.places.length ? ` · ${pend.places.length}곳` : ''), '평가하기');
    $('hero').onclick = () => openReviewTrip(pend.trip.id);
    $('herobtn').onclick = e => { e.stopPropagation(); openReviewTrip(pend.trip.id); };
    renderAiCard(null, 0);
  await renderQuiz(); await renderFoot();
    return;
  }

  if (!data.length){
    /* 여행이 없으면 가고 싶다고 표시한 곳을 겁니다. 그것도 없으면 아무 곳이나 —
       빈 화면보다는 사진 한 장이 훨씬 낫습니다. */
    const w = await netTimeout(sb.from('city_ratings').select('cities(id,name,country,image_url)')
      .eq('user_id', me.id).eq('want', true).limit(20));
    const pool = (w.data || []).map(r => r.cities).filter(c => c?.image_url);
    let pick = pool[Math.floor(Math.random() * pool.length)] || null;
    const wanted = !!pick;
    if (!pick){
      const any = await netTimeout(sb.from('cities').select('id,name,country,image_url')
        .not('image_url', 'is', null).limit(60));
      const l = any.data || [];
      pick = l[Math.floor(Math.random() * l.length)] || null;
    }
    /* **히어로에는 단추를 안 답니다.** 예전에는 여기에도 '새 여행'이 있어서
       바로 아래 AI 카드의 '시작'과 같은 일을 하는 단추가 둘이었습니다.
       홈에서 여행을 만드는 길은 4단계 카드 하나입니다.
       이 사진은 "여기 어때요?" 하는 자리고, 누르면 그 도시를 보여줍니다. */
    $('home').innerHTML = heroHtml(
      pick?.image_url, '',
      pick ? `${pick.name}, 어때요?` : '아직 잡아둔 여행이 없어요',
      !pick   ? '아래에서 첫 여행을 만들어보세요'
      : wanted ? '가보고 싶다고 표시해둔 곳이에요'
               : (countryName[pick.country] || pick.country),
      '');
    if (pick?.id) $('hero').onclick = () => openCity(pick.id);
    /* 여행이 없으면 AI 로 시작하는 것이 첫 걸음입니다. 맨 위에 둡니다. */
    renderAiCard(null, 0);
  await renderQuiz(); await renderFoot();
    return;
  }

  const t = data[0];
  const dday = Math.round((asDate(t.start_date) - asDate(today)) / D1);
  const days = Math.round((asDate(t.end_date) - asDate(t.start_date)) / D1) + 1;
  /* 여행 중이면 남은 날이 아니라 며칠째인지가 궁금합니다.
     사진 위에 크게 올라가는 자리라 짧아야 합니다. */
  const badge = dday > 0 ? `D-${dday}`
              : dday === 0 ? 'D-DAY'
              : `Day ${Math.round((asDate(today) - asDate(t.start_date)) / D1) + 1}`;

  /* 여행 중이면 오늘 몇 개인지만 한 줄로 얹습니다.
     일정 목록 자체는 여행 탭에 있으니 홈에서 또 늘어놓지 않습니다. */
  const [photo, cnt, all] = await Promise.all([
    tripPhoto(t),
    netTimeout(sb.from('plans').select('id', { count:'exact', head:true })
      .eq('trip_id', t.id).is('deleted_at', null).eq('date', today)),
    /* 이 여행에 일정이 하나라도 있나. 아래 AI 카드가 무슨 말을 할지 정합니다 —
       일정이 비어 있으면 그게 지금 제일 급한 일입니다. */
    netTimeout(sb.from('plans').select('id', { count:'exact', head:true })
      .eq('trip_id', t.id).is('deleted_at', null)),
  ]);

  const n = cnt.count || 0;

  /* ── 자료가 그대로면 홈을 아예 다시 그리지 않습니다 ──────────────────
     홈은 히어로를 `innerHTML` 로 지우고 그 뒤에 평가·새여행·퀴즈·발자국을
     **덧붙이는** 구조라, 목록 하나만 지키는 방식(putHtml)으로는 안 됩니다.
     히어로를 지우는 순간 뒤에 붙은 것이 전부 같이 날아가기 때문입니다.
     그래서 **그릴 내용이 같은지를 먼저 보고** 같으면 통째로 건너뜁니다.
     사용자가 "홈의 평가·지도가 아직 깜빡인다"고 한 것이 이것입니다.

     지문에 넣을 것은 **화면에 실제로 나오는 값**입니다. 퀴즈에 뜬 도시와
     별점·다녀온 곳 수까지 넣어야 합니다 — 기록 탭에서 별을 매기고 홈으로
     오면 발자국 숫자와 퀴즈 줄이 달라져야 하니까요. */
  const sig = [photo, badge, t.id, t.title, days, n, all.count,
               pend?.trip?.id || '', quizPool.slice(0, QUIZ_ROWS).map(c => c.id).join(),
               visited.size, Object.keys(myRates || {}).length,
               /* '가보고 싶어요' 를 누르면 아래 '확실한 것' 카드가 달라져야 합니다. */
               Object.values(myRates || {}).filter(r => r.want).length].join('|');
  if (sig === lastHomeSig && $('home').querySelector('.hero')) return;
  lastHomeSig = sig;

  $('home').innerHTML = heroHtml(photo, badge, t.title,
    tripSub(t, days) +
    (dday <= 0 ? (n ? ` · 오늘 ${n}개` : ' · 오늘은 비어 있어요') : ''), '');
  $('hero').onclick = () => openTrip(t.id);
  rvBar();                    /* 평가할 여행이 남아 있으면 얇은 띠로 붙습니다 */

  /* ── 순서는 여행이 언제냐가 정합니다 ──
     36일 전인 사람에게 제일 급한 것은 일정이지, 다녀온 도시 평가가 아닙니다.
     평가와 발자국은 다녀온 뒤에 보는 것이라 여행이 남아 있으면 아래로 내립니다.
     반대로 여행이 끝났거나 없으면 그것들이 이 앱의 남은 재미입니다. */
  renderAiCard(t, all.count || 0);
  /* **새 여행으로 가는 길을 홈에 남겨둡니다.** AI 카드가 '다음 여행' 이야기를
     하게 되면서, 여행이 이미 있는 사람은 홈에서 새 여행을 못 만들게 됐습니다.
     카드를 하나 더 크게 얹으면 위가 무거워지므로 얇은 줄로 답니다. */
  const nt = document.createElement('div');
  nt.className = 'newtripbar';
  nt.innerHTML = `<span class="ic">＋</span>
    <span class="tx"><b>다음에 어디 갈까요?</b>
      <span>어디로 언제 가는지만 정하면 돼요</span></span>
    <span class="go">새 여행</span>`;
  nt.onclick = () => openNew();
  $('home').appendChild(nt);

  await renderQuiz();
  await renderFoot();
}

/* ── 여행 끝난 뒤 ────────────────────────────────────────────────────
 * 다녀오고 나면 앱을 안 엽니다. 그때 물어보는 것이 이 앱의 두 번째 축입니다.
 * 끝났는데 아직 별점을 안 매긴 여행이 있으면 홈 맨 위를 그것으로 채웁니다. */
let rvTrip = null, shelfKind = 'mine';

async function pendingTrip(){
  const today = todayYmd();
  /* **netTimeout 을 지나야 합니다.** 여기가 홈에서 제일 먼저 기다리는 질의인데
     맨몸으로 나가고 있었습니다. 비행기모드에서는 응답이 안 오고 실패도 안 나서
     여기서 멈췄고, 화면은 index.html 의 "불러오는 중…" 그대로 남았습니다.
     사용자가 "계속 도니까 실제로 불러와지는 줄 안다"고 한 것이 이것입니다. */
  const { data } = await netTimeout(sb.from('trips')
    .select('id,title,destination,start_date,end_date')
    .lt('end_date', today)
    .order('end_date', { ascending:false }).limit(5));
  if (!data?.length) return null;

  for (const t of data){
    const [lg, ps, cr, pr] = await Promise.all([
      netTimeout(sb.from('trip_legs').select('city_id').eq('trip_id', t.id).not('city_id','is',null)),
      netTimeout(sb.from('plans').select('id').eq('trip_id', t.id).is('deleted_at', null)
        .in('category', ['식사','카페'])),
      netTimeout(sb.from('city_ratings').select('city_id').eq('user_id', me.id).not('stars','is',null)),
      netTimeout(sb.from('plan_ratings').select('plan_id').eq('user_id', me.id).not('stars','is',null)),
    ]);
    const rated = new Set((cr.data || []).map(r => r.city_id));
    const done  = new Set((pr.data || []).map(r => r.plan_id));
    const cities = [...new Set((lg.data || []).map(l => l.city_id))].filter(id => !rated.has(id));
    const places = (ps.data || []).filter(p => !done.has(p.id)).map(p => p.id);
    if (cities.length || places.length) return { trip: t, cities, places };
  }
  return null;
}

/* 리포트로 가는 길이 홈의 "평가 안 한 여행" 띠 하나뿐이었습니다.
   평가를 마치면 그 띠가 사라지고 **리포트를 다시 볼 수 없었습니다.**
   공유 카드를 만들어 두고 정작 열 길이 없으면 소용이 없습니다.
   다녀온 여행 목록에서 바로 열 수 있게 합니다. */
async function openTripReport(id){
  rvTrip = id;
  ['homeview','listview','rateview','aiview','setview','cityview','draftview','reviewview']
    .forEach(v => $(v).classList.add('hide'));
  $('reviewview').classList.remove('hide');
  if (history.state?.t2 !== 'rv') history.pushState({ t2:'rv' }, '');
  await loadCities();
  await drawReport(id);
}

async function openReviewTrip(id){
  rvTrip = id;
  ['homeview','listview','rateview','aiview','setview','cityview','draftview','reviewview']
    .forEach(v => $(v).classList.add('hide'));
  $('reviewview').classList.remove('hide');
  $('rv_report').classList.add('hide');
  $('rv_rate').classList.remove('hide');
  window.scrollTo({ top:0 });
  if (history.state?.t2 !== 'rv') history.pushState({ t2:'rv' }, '');

  await loadCities();
  const [t, lg, ps, cr, pr] = await Promise.all([
    sb.from('trips').select('title,start_date,end_date').eq('id', id).maybeSingle(),
    sb.from('trip_legs').select('city_id').eq('trip_id', id).not('city_id','is',null),
    sb.from('plans').select('id,title,category,date').eq('trip_id', id)
      .is('deleted_at', null).in('category', ['식사','카페','관광','쇼핑']).order('date'),
    sb.from('city_ratings').select('city_id,stars').eq('user_id', me.id),
    sb.from('plan_ratings').select('plan_id,stars').eq('user_id', me.id),
  ]);
  const cs = Object.fromEntries((cr.data || []).map(r => [r.city_id, r.stars]));
  const psr = Object.fromEntries((pr.data || []).map(r => [r.plan_id, r.stars]));

  $('rv_head').textContent = `${t.data?.title || '여행'} 어땠어요?`;
  $('rv_sub').textContent  = '다녀오신 곳을 평가해주세요. 건너뛰어도 괜찮아요.';

  const ids = [...new Set((lg.data || []).map(l => l.city_id))];
  $('rvt_cities').innerHTML = ids.length
    ? '<div class="daysep">도시</div>' + ids.map(cid => {
        const c = (cities || []).find(x => x.id === cid); if (!c) return '';
        return `<div class="rrow">
          ${c.image_url ? `<img class="thumb" src="${esc(c.image_url)}" alt="">`
                        : `<span class="thumb ph">${esc(c.name.slice(0,1))}</span>`}
          <div class="t"><b>${esc(c.name)}</b>
            <span class="memo">${esc(countryName[c.country] || c.country)}</span></div>
          <span class="stars" data-city="${esc(cid)}">${starHtml(cs[cid])}</span>
        </div>`;
      }).join('') : '';

  /* 먹은 곳과 본 곳을 나눠 묻습니다. 리포트에서 둘을 견줘 보여주려면
     따로 받아야 합니다 — "5만엔 오마카세보다 라멘에 별을 더 줬다" 같은 것. */
  const ICON = { 식사:'🍽', 카페:'☕', 관광:'📸', 쇼핑:'🛍' };
  const group = (title, list) => list.length
    ? `<div class="daysep">${title}</div>` + list.map(p => `<div class="rrow">
        <span class="thumb ph">${ICON[p.category] || '📍'}</span>
        <div class="t"><b>${esc(p.title)}</b><span class="memo">${esc(p.date)}</span></div>
        <span class="stars" data-plan="${esc(p.id)}">${starHtml(psr[p.id])}</span>
      </div>`).join('') : '';
  const all = ps.data || [];
  $('rv_places').innerHTML =
    group('먹은 곳', all.filter(p => ['식사','카페'].includes(p.category))) +
    group('본 곳',   all.filter(p => ['관광','쇼핑'].includes(p.category)));
}

function closeReview(fromPop){
  if (!fromPop && history.state?.t2 === 'rv'){ history.back(); return; }
  $('reviewview').classList.add('hide');
  showApp('home');
}
$('rvback').addEventListener('click', () => closeReview());

/* 평가 줄. 도시는 city_ratings, 맛집은 plan_ratings 로 갑니다. */
$('rv_rate').addEventListener('click', async e => {
  const st = e.target.closest('.st'); if (!st) return;
  const wrap = st.closest('.stars');
  const box = st.getBoundingClientRect();
  const v = +st.dataset.n - ((e.clientX - box.left) < box.width / 2 ? 0.5 : 0);
  paintStars(wrap, v, true);
  if (wrap.dataset.city) await saveRate(wrap.dataset.city, { stars: v }, true);
  else await sb.from('plan_ratings').upsert(
    { user_id: me.id, plan_id: wrap.dataset.plan, stars: v },
    { onConflict: 'user_id,plan_id' });
});

/* ── 리포트 ──────────────────────────────────────────────────────────
 * 평가까지 마쳤으면 뭔가 남는 것이 있어야 합니다. 옆으로 넘겨 보는 카드로 냅니다. */
$('rv_done').addEventListener('click', () => drawReport(rvTrip));

let rpt = null;                       /* 공유와 이미지 저장에서 다시 씁니다 */

/* ── 여행 리포트의 한 줄평 ───────────────────────────────────────────
 * 성향 카드와 같은 방식입니다. **계산으로만 정하고 AI 를 안 씁니다** —
 * 같은 여행을 다시 열면 같은 문구가 나와야 합니다.
 * 위에서부터 검사해 처음 걸리는 것을 씁니다.
 *
 * 같은 사람이라도 여행마다 다르게 나옵니다. 도쿄에서는 먹기만 하고
 * 파리에서는 걷기만 할 수 있습니다. 그게 오히려 재밌습니다.
 *
 * 자료가 모자라면 그 문구는 아예 건너뜁니다. 억지로 판정하면 틀린 말이 됩니다.
 *   - 예산을 안 적었으면 예산 문구를 건너뜁니다
 *   - 평가를 절반도 안 했으면 별점 문구를 건너뜁니다
 *   - 2박 이하면 속도 문구를 건너뜁니다 (하루 이틀은 값이 심하게 흔들립니다)
 */
const REPORT_RULES = [
  /* 특이한 결과 — 희소해서 재밌습니다 */
  { id:'adhoc', g:'rare', ic:'bolt', t:'즉흥이 더 좋았던 여행',
    f:r => r.rated && r.adhocN >= 3 && r.adhocRating != null && r.plannedRating != null
        && r.adhocRating - r.plannedRating >= 0.8 },
  { id:'oneArea', g:'rare', ic:'pinheart', t:'한 동네에 눌러앉은 여행',
    f:r => r.days >= 3 && r.areaCount > 0 && r.areaCount <= 2 },
  { id:'asPlanned', g:'rare', ic:'stamp', t:'계획대로 다 해낸 여행',
    f:r => r.rated && r.plannedN >= 10 && r.planRate >= 0.95 },

  /* 지출 성향 */
  { id:'food',   g:'spend', ic:'fork', t:'먹으러 간 여행',      f:r => r.spend > 0 && r.foodRatio >= 0.55 },
  { id:'shop',   g:'spend', ic:'bag2', t:'쇼핑하러 간 여행',    f:r => r.spend > 0 && r.shopRatio >= 0.35 },
  { id:'over',   g:'spend', ic:'wallet', t:'지갑이 열린 여행',    f:r => r.budgetRatio != null && r.budgetRatio >= 1.3 },
  { id:'under',  g:'spend', ic:'coin', t:'알뜰하게 다녀온 여행', f:r => r.budgetRatio != null && r.budgetRatio <= 0.8 },

  /* 속도 */
  { id:'nonstop',g:'speed', ic:'run', t:'하루도 안 쉰 여행', f:r => r.speedOk && r.perDay >= 7 },
  { id:'walked', g:'speed', ic:'shoe', t:'많이 걸은 여행',    f:r => r.speedOk && r.kmPerDay >= 12 },
  { id:'rest',   g:'speed', ic:'cup', t:'쉬러 간 여행',      f:r => r.speedOk && r.perDay <= 4 && r.cafeCount >= 3 },
  { id:'slow',   g:'speed', ic:'moon', t:'느긋했던 여행',     f:r => r.speedOk && r.perDay <= 4 },

  /* 취향이 드러난 결과 */
  { id:'eatWin', g:'taste', ic:'fork', t:'미식이 전부였던 여행',
    f:r => r.rated && r.eatAvg != null && r.seeAvg != null && r.eatAvg - r.seeAvg >= 1.5 },
  { id:'seeWin', g:'taste', ic:'camera', t:'눈이 즐거웠던 여행',
    f:r => r.rated && r.eatAvg != null && r.seeAvg != null && r.seeAvg - r.eatAvg >= 1.5 },
  { id:'cafe',   g:'taste', ic:'cup', t:'카페 투어', f:r => r.cafeCount >= r.days && r.cafeCount >= 3 },

  /* 어디에도 안 걸렸을 때 */
  { id:'even',   g:'even', ic:'bag', t:'골고루 다녀온 여행', f:() => true },
];

async function drawReport(id){
  $('rv_rate').classList.add('hide');
  $('rv_report').classList.remove('hide');
  $('rv_report').innerHTML = '<div class="card"><div class="empty"><span class="load">만드는 중…</span></div></div>';
  window.scrollTo({ top:0 });

  const [t, lg, pl, ex, cr, pr] = await Promise.all([
    /* budget 은 034 에서 붙였습니다. 아직 안 올렸으면 아래에서 한 번 더 물어봅니다. */
    sb.from('trips').select('title,destination,start_date,end_date,home_currency,budget')
      .eq('id', id).maybeSingle(),
    sb.from('trip_legs').select('city_id').eq('trip_id', id).order('start_date'),
    /* created_at 으로 "출발 전에 넣은 것"과 "가서 넣은 것"을 가릅니다.
       즉흥이 더 좋았는지 보려면 이 구분이 있어야 합니다. */
    sb.from('plans').select('id,title,category,lat,lng,date,start_time,created_at')
      .eq('trip_id', id).is('deleted_at', null).order('date').order('start_time'),
    sb.from('expenses').select('title,amount,amount_home,currency,category')
      .eq('trip_id', id).is('deleted_at', null),
    sb.from('city_ratings').select('city_id,stars').eq('user_id', me.id),
    sb.from('plan_ratings').select('plan_id,stars').eq('user_id', me.id),
  ]);
  /* 034 를 아직 안 올렸으면 budget 이 없다고 질의가 통째로 실패합니다.
     리포트가 통째로 안 뜨는 것보다는 예산 문구만 빠지는 편이 낫습니다. */
  if (t.error) Object.assign(t, await sb.from('trips')
    .select('title,destination,start_date,end_date,home_currency')
    .eq('id', id).maybeSingle());
  const T = t.data || {};
  const days   = Math.round((asDate(T.end_date) - asDate(T.start_date)) / D1) + 1;
  const plans_ = pl.data || [];
  const exps   = ex.data || [];
  const psr = Object.fromEntries((pr.data || []).map(r => [r.plan_id, Number(r.stars)]));

  /* 움직인 거리. 좌표가 있는 일정 사이만 더합니다 —
     모르는 구간을 지어내느니 빼는 편이 낫습니다. */
  let km = 0; const byDay = {};
  plans_.forEach(p => (byDay[p.date] = byDay[p.date] || []).push(p));
  Object.values(byDay).forEach(list => {
    for (let i = 0; i < list.length - 1; i++){
      const d = distKm(list[i].lat, list[i].lng, list[i+1].lat, list[i+1].lng);
      if (d != null) km += d;
    }
  });

  const PLACE = ['식사','카페','관광','쇼핑','기타'];
  const spots = plans_.filter(p => PLACE.includes(p.category));
  const eats  = spots.filter(p => ['식사','카페'].includes(p.category));
  const sees  = spots.filter(p => ['관광','쇼핑'].includes(p.category));
  const avg = a => a.length ? a.reduce((s,v) => s+v, 0) / a.length : null;
  const st  = list => avg(list.map(p => psr[p.id]).filter(v => v != null));
  const eatAvg = st(eats), seeAvg = st(sees);

  const money = e => Number(e.amount_home) || 0;
  const spend = exps.reduce((s,e) => s + money(e), 0);
  const foodPct = spend ? Math.round(
    exps.filter(e => ['식사','카페'].includes(e.category)).reduce((s,e)=>s+money(e),0)
    / spend * 100) : 0;
  const shopPct = spend ? Math.round(
    exps.filter(e => e.category === '쇼핑').reduce((s,e)=>s+money(e),0) / spend * 100) : 0;
  const won = n => Math.round(n).toLocaleString();
  const cur = T.home_currency || '';

  /* ── 한 줄 정의에 쓰는 값들 ──
     AI 를 안 부릅니다. 공짜이고 즉시 나오고, 같은 여행이면 언제나 같습니다. */

  /* 동네 수. "동네"라는 자료가 따로 없어서 좌표를 0.02°(약 2km) 칸으로 묶습니다.
     좌표가 없는 일정은 못 셉니다 — 그래서 좌표가 아예 없으면 이 문구를 건너뜁니다. */
  const areas = new Set(spots.filter(p => p.lat != null && p.lng != null)
    .map(p => `${Math.round(p.lat / 0.02)},${Math.round(p.lng / 0.02)}`));

  /* 출발 전에 넣은 것 = 계획, 가서 넣은 것 = 즉흥.
     created_at 은 시각까지 있으므로 출발일 0시를 경계로 봅니다. */
  const startTs = asDate(T.start_date).getTime();
  const planned = spots.filter(p => new Date(p.created_at).getTime() <  startTs);
  const adhoc   = spots.filter(p => new Date(p.created_at).getTime() >= startTs);

  const cafeCount = spots.filter(p => p.category === '카페').length;
  const ratedN = spots.filter(p => psr[p.id] != null).length;

  const R = {
    days,
    perDay: spots.length / days,
    kmPerDay: km / days,
    areaCount: areas.size,
    cafeCount,
    spend,
    foodRatio: spend ? exps.filter(e => ['식사','카페'].includes(e.category))
                           .reduce((s,e)=>s+money(e),0) / spend : 0,
    shopRatio: spend ? exps.filter(e => e.category === '쇼핑')
                           .reduce((s,e)=>s+money(e),0) / spend : 0,
    /* 예산을 안 적었으면 null 입니다. null 이면 그 문구를 건너뜁니다 — 0 으로 두면
       "알뜰하게 다녀온 여행"이 늘 걸립니다. */
    budgetRatio: (T.budget && spend) ? spend / Number(T.budget) : null,
    plannedN: planned.length,
    adhocN: adhoc.length,
    plannedRating: st(planned),
    adhocRating: st(adhoc),
    /* 계획한 곳 중 별점을 남긴 비율. "갔다"를 따로 안 적으므로 별점이 그 표시입니다. */
    planRate: planned.length
      ? planned.filter(p => psr[p.id] != null).length / planned.length : 0,
    eatAvg, seeAvg,
    /* 절반도 평가 안 했으면 별점 기반 문구는 근거가 약합니다. */
    rated: spots.length ? ratedN / spots.length >= 0.5 : false,
    /* 1박 2일은 하루 일정 수가 심하게 흔들립니다. 3일부터만 속도를 말합니다. */
    speedOk: days >= 3,
  };
  const rule = REPORT_RULES.find(r => r.f(R));
  const label = rule.t;

  const defLine = [
    foodPct ? `식비 ${foodPct}%` : null,
    eatAvg != null ? `식당 평균 ★${eatAvg.toFixed(1)}` : null,
    seeAvg != null ? `관광지 평균 ★${seeAvg.toFixed(1)}` : null,
  ].filter(Boolean).join(' · ');

  const five = spots.filter(p => psr[p.id] === 5).map(p => p.title);
  const top  = spots.filter(p => psr[p.id] != null)
                    .sort((a,b) => psr[b.id] - psr[a.id])[0];
  const pricey = exps.slice().sort((a,b) => money(b) - money(a))[0];

  /* 하루별 흐름. 점 개수가 일정 수, 옆이 그날 평균 별점입니다. */
  const dayRows = Object.keys(byDay).sort().map((d, i) => {
    const list = byDay[d].filter(p => PLACE.includes(p.category));
    const s = st(list);
    return { i:i+1, n:list.length, s };
  });
  const busiest = dayRows.reduce((a,b) =>
    (!a || b.n > a.n || (b.n === a.n && (b.s ?? 9) < (a.s ?? 9))) ? b : a, null);
  const hard = busiest && busiest.n >= 6 && (busiest.s == null || busiest.s <= 3.6)
             ? busiest.i : null;

  rpt = { title:T.title, dest:T.destination, from:T.start_date, to:T.end_date,
          days, spend, cur, spots:spots.length, km:Math.round(km), label, defLine };

  const stat = (big, sub) =>
    `<div class="rs"><div class="b">${esc(big)}</div><div class="s">${esc(sub)}</div></div>`;

  /* ── 공유용 카드 ──
     리포트에는 하루별 흐름과 AI 문단이 있는데 그건 **내가 볼 것**이지
     남에게 보여줄 것이 아닙니다. 개인적이고 길기도 합니다.
     그래서 공유용은 따로 만듭니다 — 한 줄평 · 숫자 셋 · ★5 준 곳만.
     성향 카드와 같은 부품(.pcard)을 씁니다. 둘이 한 벌로 보여야 합니다. */
  const shareCard = `
    <div class="pcard tcard" style="background:${REPORT_BG[rule.g]}">
      <div class="tdest">${esc(T.destination || T.title || '여행')}
        <span>· ${days - 1}박 ${days}일</span></div>

      <svg class="pic" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">${
             REPORT_ICON[rule.ic] || PERSONA_ICON[rule.ic] || ''}</svg>

      <div class="ptitle">${esc(label)}</div>

      <div class="pnums">${spend ? won(spend) + (cur ? cur : '') : '–'}
        <i>·</i> ${spots.length}곳${km ? ` <i>·</i> 약 ${Math.round(km)}km` : ''}</div>
      ${foodPct ? `<div class="pconts" style="margin-top:8px">식비 ${foodPct}%</div>` : ''}

      ${five.length ? `<div class="pbest">
        <div class="pl">★5를 준 곳</div>
        ${five.slice(0, 3).map(n => `<div class="pb">${esc(n)}</div>`).join('')}
      </div>` : ''}

      <div class="pbrand">기로</div>
    </div>`;

  $('rv_report').innerHTML = shareCard +
    `<div class="card rpt1" id="rptcard">
       <div class="hd">
         <div class="ti">${esc(T.destination || T.title || '여행')}</div>
         <div class="dt">${esc(T.from || T.start_date)} – ${esc(T.end_date)}
           · ${days - 1}박 ${days}일</div>
       </div>

       <div class="rstats">
         ${stat(spend ? won(spend) + (cur ? ' ' + cur : '') : '–', '쓴 돈')}
         ${stat(spots.length + '곳', '다녀온 곳')}
         ${stat(km ? Math.round(km) + 'km' : '–', '움직인 거리')}
       </div>

       <div class="rdef">
         <div class="q">"${esc(label)}"</div>
         ${defLine ? `<div class="d">${esc(defLine)}</div>` : ''}
       </div>

       ${five.length ? `<div class="rsec"><div class="h">★5를 준 곳</div>
         <div class="v">${esc(five.slice(0,6).join(' · '))}</div></div>` : ''}

       <div class="rtwo">
         <div class="rsec"><div class="h">가장 비쌌던 곳</div>
           <div class="v">${pricey ? esc(pricey.title) : '–'}</div>
           <div class="m">${pricey ? esc(won(money(pricey)) + ' ' + cur) : ''}</div></div>
         <div class="rsec"><div class="h">가장 만족한 곳</div>
           <div class="v">${top ? esc(top.title) : '–'}</div>
           <div class="m">${top ? '★' + psr[top.id] : ''}</div></div>
       </div>

       <div class="rsec"><div class="h">하루별 흐름</div>
         ${dayRows.map(r => `<div class="rday">
           <span class="dd">Day ${r.i}</span>
           <span class="dots">${'●'.repeat(Math.min(r.n, 12))}</span>
           <span class="dn">${r.n}곳</span>
           <span class="ds">${r.s != null ? '★' + r.s.toFixed(1) : ''}</span>
           ${hard === r.i ? '<span class="dw">무리했던 날</span>' : ''}
         </div>`).join('')}
       </div>

       <div id="rv_ai" class="rsec hide"></div>
       <button class="ghost" id="rv_askai" style="width:100%; margin-top:12px">
         AI 한마디 듣기</button>

       <div style="display:flex; gap:8px; margin-top:8px">
         <button class="ghost" id="rv_img" style="flex:1">이미지로 저장</button>
         <button class="ghost" id="rv_share" style="flex:1">공유</button>
       </div>
       <button class="ghost" id="rv_home" style="width:100%; margin-top:6px">홈으로</button>
     </div>`;

  $('rv_home').onclick  = () => closeReview();
  $('rv_share').onclick = () => shareReport();
  /* 이미지는 위 공유 카드와 같은 내용으로 뽑습니다 —
     하루별 흐름과 AI 문단은 빠집니다. 그건 내가 볼 것이지 남에게 보일 것이 아닙니다. */
  $('rv_img').onclick   = () => askImageSize({
    g: rule.g, icon: REPORT_ICON[rule.ic] || PERSONA_ICON[rule.ic] || '',
    title: label,
    sub: `${T.destination || T.title || '여행'} · ${days - 1}박 ${days}일`,
    nums: [spend ? won(spend) + cur : null, `${spots.length}곳`,
           km ? `약 ${Math.round(km)}km` : null].filter(Boolean).join(' · '),
    note: foodPct ? `식비 ${foodPct}%` : '',
    listTitle: five.length ? '★5를 준 곳' : '',
    list: five.slice(0, 3),
  }, 'aitrip-리포트');
  $('rv_askai').onclick = () => askReportAi(id, { label, defLine, dayRows, hard,
                                                  spend, cur, days, top, pricey, psr });
}

function reportText(){
  if (!rpt) return '';
  return [
    `${rpt.dest || rpt.title} ${rpt.from} – ${rpt.to} · ${rpt.days}일`,
    `"${rpt.label}"`,
    [rpt.spend ? `쓴 돈 ${Math.round(rpt.spend).toLocaleString()}${rpt.cur}` : null,
     `다녀온 곳 ${rpt.spots}곳`,
     rpt.km ? `움직인 거리 ${rpt.km}km` : null].filter(Boolean).join(' · '),
    rpt.defLine,
  ].filter(Boolean).join('\n');
}

async function shareReport(){
  const url = location.origin + location.pathname;
  const text = reportText();
  if (navigator.share){
    try { await navigator.share({ title:'여행 리포트', text, url }); return; }
    catch (e){ if (e?.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); toast('복사했어요'); }
  catch { toast(text); }
}

/* AI 한마디. 계산해 둔 사실만 넘기고 문장만 받습니다 —
   AI 가 숫자를 다시 세면 틀립니다. 부를 때만 부르므로 횟수도 아낍니다. */
async function askReportAi(id, f){
  const b = $('rv_askai');
  b.disabled = true; b.innerHTML = '<span class="load">듣는 중…</span>';
  const facts = [
    `여행 ${f.days}일, 다녀온 곳 ${rpt.spots}곳, 움직인 거리 ${rpt.km}km`,
    f.spend ? `쓴 돈 ${Math.round(f.spend).toLocaleString()}${f.cur}, 하루 평균 ${
      Math.round(f.spend / f.days).toLocaleString()}${f.cur}` : null,
    f.defLine, `한 줄 정의는 "${f.label}"`,
    f.hard ? `Day ${f.hard}이 가장 빡빡했고 그날 평가가 낮았다` : null,
    f.top ? `가장 만족한 곳은 ${f.top.title} ★${f.psr[f.top.id]}` : null,
    f.pricey ? `가장 비쌌던 곳은 ${f.pricey.title}` : null,
  ].filter(Boolean).join('\n');

  const { data, error } = await sb.functions.invoke('chat', { body: { trip_id: id,
    message: '아래는 이번 여행을 계산한 결과다. 숫자를 새로 세지 말고 이 사실만 써서 ' +
             '3~4문장으로 소감과 다음 여행 조언을 해요체로 써줘. ' +
             '마지막 문장은 다음 여행에 쓸 수 있는 구체적인 제안으로 끝낼 것. ' +
             'places 와 actions 는 빈 배열로 둘 것.\n\n' + facts } });
  b.disabled = false; b.textContent = 'AI 한마디 다시 듣기';
  if (error || data?.error){
    let why = data?.error || error.message;
    try { why = (await error?.context?.json())?.error || why; } catch {}
    return toast(why);
  }
  $('rv_ai').classList.remove('hide');
  $('rv_ai').innerHTML = `<div class="h">AI 한마디</div>
    <div class="v" style="font-weight:400; line-height:1.7">${md(data.reply || '')}</div>`;
}

/* AI 일정 만들기 — 이 앱이 내세우는 기능이라 홈 위쪽에 둡니다. */
function renderAiCard(nextTrip, nextPlans){
  /* ── 무엇을 권할지는 그 사람의 여행이 정합니다 ──
     "AI와 함께 떠나볼까요?" 하나만 늘 띄우면, 다음 주에 도쿄 가는 사람에게도
     일정이 텅 빈 사람에게도 같은 말을 합니다. 지금 제일 급한 것을 말합니다.
       · 곧 가는데 일정이 비었다 → 그 여행을 짜자 (제일 급합니다)
       · 곧 가는데 일정이 있다   → 다듬거나 물어보자
       · 여행이 없다             → 새로 만들자 */
  const ai = !nextTrip
    ? { title:'AI와 함께 떠나볼까요?', sub:'뭘 좋아하는지만 알려주세요',
        go:'시작', go2:() => openNew() }
    : nextPlans === 0
    ? { title:`${nextTrip.title} 일정이 비어 있어요`,
        sub:'AI가 하루씩 짜드릴게요', go:'짜기',
        go2:() => openDraft(nextTrip.id, true) }
    /* **여기는 초안 화면이 아니라 비서로 보냅니다.** 처음에 초안으로 보냈더니
       "빈 시간에 넣을 곳을 찾아드려요"라고 해놓고 일정을 통째로 다시 짜는
       화면이 떴습니다. 이미 31개가 들어 있는 여행에서요. 말과 행동이 달랐습니다.
       뭘 더 넣을지 물어보는 자리는 비서입니다. */
    : { title:`${nextTrip.title}, 뭐 더 넣을까요?`,
        sub:'빈 시간에 넣을 곳을 찾아드려요', go:'물어보기',
        go2:async () => { openAi(); $('ai_trip').value = nextTrip.id;
                          await loadChats(nextTrip.id); } };

  const box = document.createElement('div');
  box.className = 'aicard';
  box.id = 'homeaicard';
  box.innerHTML =
    `<span class="ic">
       <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
         <path d="M11 2l1.8 5.2L18 9l-5.2 1.8L11 16l-1.8-5.2L4 9l5.2-1.8L11 2z"/>
         <path d="M18.5 13.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z"
               opacity=".75"/>
       </svg>
     </span>
     <span class="tx">
       <b>${esc(ai.title)}</b>
       <span>${esc(ai.sub)}</span>
     </span>
     <span class="go">${esc(ai.go)}</span>`;
  /* 예전에는 초안 화면(openDraft)을 바로 열었습니다. 그런데 거기에도
     '새 여행'이 따로 있어서, 여행을 만드는 길이 두 개가 됐습니다 —
     한쪽은 단계 화면, 한쪽은 옛날 폼이라 모양도 달랐습니다.
     여기서는 단계 화면을 엽니다. 마지막에 'AI가 짜줄게요'를 고르면
     그 초안 화면으로 이어집니다. 길은 하나로 모입니다. */
  box.onclick = ai.go2;
  $('home').appendChild(box);
}

/* ── 여기 가봤어요? ──────────────────────────────────────────────────
 * 안 매긴 도시를 몇 곳씩 늘어놓고 아는 곳에만 별을 답니다.
 * 한 곳씩 크게 물어보면 모르는 도시가 나왔을 때 할 일이 없습니다.
 * 줄 모양은 기록 탭과 같게 맞춥니다.
 * 전부 받아오면 무거우니 임의의 구간에서 스무 곳만 집어 씁니다. */
const QUIZ_ROWS = 5;
let quizPool = [], quizFilling = false, quizFilled = 0;

/* 처음 보이는 다섯 곳이 스플리트 · 브뤼헤 · 크레타뿐이면
   "나 이런 데 안 가봤는데" 하고 바로 닫습니다.
   누구나 이름은 아는 곳을 먼저 내보내고, 다른 도시 보기를 누를수록
   생소한 곳이 나오게 합니다. 유행이 아니라 인지도 기준입니다. */
const FAMOUS = new Set([
  'seoul','busan','jeju','gyeongju','jeonju','gangneung','sokcho',
  'tokyo','osaka','kyoto','fukuoka','sapporo','okinawa','nagoya','hakone','nara',
  'beijing','shanghai','xian','hongkong','macau','taipei','qingdao',
  'bangkok','chiangmai','phuket','pattaya','singapore','kualalumpur','bali','jakarta',
  'hanoi','hochiminh','danang','nhatrang','phuquoc','siemreap','manila','cebu','boracay',
  'guam','saipan','male','kathmandu','delhi','mumbai','agra','jaipur','colombo',
  'dubai','abudhabi','doha','istanbul','cappadocia','cairo','telaviv','petra',
  'paris','nice','london','edinburgh','dublin','rome','venice','florence','milan','naples',
  'barcelona','madrid','seville','granada','lisbon','porto','amsterdam','brussels',
  'berlin','munich','frankfurt','prague','vienna','salzburg','budapest','zurich',
  'interlaken','lucerne','zermatt','copenhagen','stockholm','helsinki','oslo','reykjavik',
  'athens','santorini','dubrovnik','krakow','warsaw',
  'newyork','losangeles','sanfrancisco','lasvegas','honolulu','seattle','chicago',
  'boston','washington','orlando','miami','toronto','vancouver','banff',
  'mexicocity','cancun','rio','buenosaires','lima','cusco',
  'sydney','melbourne','goldcoast','brisbane','cairns','auckland','queenstown',
  'capetown','marrakech','nairobi',
]);

async function fillQuiz(){
  if (quizFilling) return;
  quizFilling = true;
  try {
    /* 기록 탭에서 별점을 매겨도 여기 남아 있던 것을 막습니다.
       주머니를 들고 있다가 그대로 다시 그려서 이미 매긴 곳이 또 나왔습니다.
       매번 매긴 목록을 받아 걸러냅니다. */
    {
      const r = await sb.from('city_ratings').select('city_id')
        .eq('user_id', me.id).not('stars', 'is', null);
      const done = new Set((r.data || []).map(x => x.city_id));
      quizPool = quizPool.filter(c => !done.has(c.id));
    }
    if (quizPool.length >= QUIZ_ROWS) return;
    /* 도시는 이미 다 받아 두었습니다. 서버에서 잘라 오면 id 순으로 붙어 있는
       구간이 나와서 오타루 · 오타와 · 옥스퍼드처럼 이름이 몰립니다.
       여기서 통째로 섞습니다. */
    await loadCities();
    const mine = await sb.from('city_ratings').select('city_id').eq('user_id', me.id);
    const rated = new Set((mine.data || []).map(r => r.city_id));
    const have  = new Set(quizPool.map(c => c.id));
    let pool = (cities || []).filter(c => !rated.has(c.id) && !have.has(c.id));
    /* 사진 있는 곳을 먼저 씁니다. 사진 칸을 못 받아온 경우에는 그냥 다 씁니다. */
    const withImg = pool.filter(c => c.image_url);
    if (withImg.length) pool = withImg;
    /* 피셔–예이츠. sort(() => Math.random()-0.5) 로 섞으면 앞쪽이 덜 움직입니다. */
    for (let i = pool.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    /* 처음 채울 때만 유명한 곳을 앞으로 당깁니다. 안에서는 여전히 무작위라
       열 때마다 다른 도시가 나옵니다. 다 보고 나면 다음부터는 치우침 없이
       뽑히므로, 다른 도시 보기를 누를수록 생소한 곳이 나옵니다. */
    if (!quizFilled)
      pool.sort((a, b) => (FAMOUS.has(b.id) ? 1 : 0) - (FAMOUS.has(a.id) ? 1 : 0));
    quizFilled++;
    quizPool = quizPool.concat(pool.slice(0, 40));
  } finally { quizFilling = false; }
}

const quizRow = c => `<div class="rrow" data-cityopen="${esc(c.id)}">
  ${c.image_url
    ? `<img class="thumb" src="${esc(c.image_url)}" alt="" loading="lazy"
           onerror="this.replaceWith(Object.assign(document.createElement('span'),
             {className:'thumb ph', textContent:'${esc(c.name.slice(0,1))}'}))">`
    : `<span class="thumb ph">${esc(c.name.slice(0,1))}</span>`}
  <div class="t"><b>${esc(c.name)}</b>
    <span class="memo">${esc(countryName[c.country] || c.country)}</span></div>
  <span class="stars" data-city="${esc(c.id)}">${starHtml(null)}</span>
  <button class="ghost want" data-want="${esc(c.id)}" title="가보고 싶어요">♡</button>
</div>`;

async function renderQuiz(){
  await fillQuiz();
  const list = quizPool.slice(0, QUIZ_ROWS);
  const box = document.createElement('div');
  /* quiet — 위 두 색카드(이번 여행 · 다음 여행)는 지금 할 일이고,
     이건 훑어보는 자료입니다. 같은 흰 카드로 두면 위계가 안 갈립니다. */
  box.className = 'card quiet';
  box.innerHTML = `<h2>여기 가보셨어요?</h2>
    <div id="quizlist">${
      list.length ? list.map(quizRow).join('')
                  : '<div class="empty">물어볼 도시를 다 봤어요.</div>'}</div>
    ${list.length ? `<button class="ghost" id="quizmore" style="width:100%; margin-top:6px">
        다른 도시 보기</button>` : ''}`;
  $('home').appendChild(box);
}

async function renderFoot(){
  const [{ data: f }] = await Promise.all([
    netTimeout(sb.rpc('my_footprint')),
    refreshVisited(),              /* 작은 지도를 칠하려면 어디를 갔는지 알아야 합니다 */
  ]);
  if (!f) return;
  const pct = Math.min(100, f.countries / UN_COUNTRIES * 100);
  const box = document.createElement('div');
  box.className = 'card quiet'; box.id = 'homefp'; box.style.cursor = 'pointer';
  box.innerHTML =
    `<div class="row" style="border:0; padding:0; margin:0">
       <span class="label" style="font-weight:600">내 발자국</span>
       <span class="val">더보기 ›</span></div>
     <div style="margin-top:8px; font-size:calc(15px * var(--ts))">${
       f.countries
         ? `${UN_COUNTRIES}개국 중 <b>${f.countries}개국</b> · ${pct.toFixed(1)}%`
         : '별점을 매기면 여기에 쌓여요.'}</div>
     ${f.countries ? `<div class="fp"><i style="width:${Math.max(pct, 1.5)}%"></i></div>` : ''}
     <!-- 막대 아래에 지도도 같이. 숫자보다 칠해진 면적이 더 와닿습니다.
          지도 좌표는 이미 문서에 있으니 그대로 빌려 씁니다. -->
     <div class="minimap"><svg viewBox="0 19 1000 387"
       preserveAspectRatio="xMidYMid meet">${$('worldland').innerHTML}</svg></div>`;
  /* 다녀온 나라를 칠합니다. 누르면 큰 지도로 갑니다. */
  const gone = new Set((cities || []).filter(c => visited.has(c.id)).map(c => c.country));
  box.querySelectorAll('.minimap path').forEach(p =>
    p.classList.toggle('been', gone.has(p.dataset.c)));
  box.onclick = () => { showApp('set'); openMap(); };
  $('home').appendChild(box);
}

/* 별을 매긴 줄은 빠지고 그 자리에 다음 도시가 들어옵니다.
   화면을 통째로 다시 그리지 않아야 매기던 흐름이 안 끊깁니다. */
$('home').addEventListener('click', async e => {
  const st = e.target.closest('#quizlist .st');
  if (st){
    const wrap = st.closest('.stars'), row = st.closest('.rrow');
    const cityId = wrap.dataset.city;
    const box = st.getBoundingClientRect();
    const v = +st.dataset.n - ((e.clientX - box.left) < box.width / 2 ? 0.5 : 0);
    if (row.dataset.done) return;          /* 밀려나는 중에 또 누르는 것을 막습니다 */
    row.dataset.done = '1';

    /* 별이 차는 것을 보여주고 밀어냅니다.
       0.62초는 너무 짧았습니다 — 손이 미끄러져도 고칠 새가 없었습니다.
       1.5초 두었다가 밀어냅니다. 그동안 다시 누르면 점수가 바뀝니다. */
    paintStars(wrap, v, true);
    markRated(row, v);
    row.classList.add('rated');
    await saveRate(cityId, { stars: v }, true);
    quizPool = quizPool.filter(c => c.id !== cityId);

    clearTimeout(row._go);                 /* 고쳐 누르면 시계를 다시 겁니다 */
    row.dataset.done = '';
    row._go = setTimeout(() => {
      row.dataset.done = '1';
      row.classList.add('gone');
      setTimeout(async () => {
        row.remove();
        await fillQuiz();
        const shown = new Set([...document.querySelectorAll('#quizlist .rrow')]
          .map(r => r.dataset.cityopen));
        const nx = quizPool.find(c => !shown.has(c.id));
        if (nx) $('quizlist').insertAdjacentHTML('beforeend', quizRow(nx));
      }, 280);
    }, 1500);
    return;
  }
  const w = e.target.closest('#quizlist button[data-want]');
  if (w){
    const on = !myRates[w.dataset.want]?.want;
    await saveRate(w.dataset.want, { want: on });
    w.classList.toggle('on', on);
    return;
  }
  /* 다섯 곳 다 모르는 곳일 수 있습니다. 통째로 갈아치웁니다.
     예전에는 loadHome() 을 불러 홈 전체를 다시 그렸습니다. 그러면 히어로 사진과
     다음 여행까지 새로 그려지면서 화면이 맨 위로 튀어 올랐습니다.
     바꿔야 하는 것은 이 목록뿐이므로 여기만 갈아 끼웁니다 — 스크롤이 그대로 있습니다. */
  const more = e.target.closest('#quizmore');
  if (more){
    more.disabled = true;
    /* 지금 보이는 줄은 매긴 것까지 포함해 전부 물러납니다. */
    const seen = new Set([...document.querySelectorAll('#quizlist .rrow')]
      .map(r => r.dataset.cityopen));
    quizPool = quizPool.filter(c => !seen.has(c.id));
    await fillQuiz();
    const list = quizPool.slice(0, QUIZ_ROWS);
    $('quizlist').innerHTML = list.length
      ? list.map(quizRow).join('')
      : '<div class="empty">물어볼 도시를 다 봤어요.</div>';
    more.disabled = false;
    more.classList.toggle('hide', !list.length);
    return;
  }
  const row = e.target.closest('#quizlist .rrow');
  if (row) return openCity(row.dataset.cityopen);
});

/* ── 알림 ── 만드는 쪽은 아직 없습니다. 읽는 자리를 먼저 잡아둡니다. */
/* ── 내 발자국 ──────────────────────────────────────────────────────
 * 왓챠의 "696 평가 · 27 코멘트" 줄을 여행판으로 옮긴 것입니다.
 * 대륙별로 쪼개면 어디가 비었는지 보이고, 진행률은 채우고 싶게 만듭니다. */

async function loadFootprint(){
  /* 발자국 숫자는 서버가 셉니다. 오프라인이면 그대로 둡니다 —
     0 으로 덮으면 다녀온 곳이 사라진 것처럼 보입니다. */
  if (netIsDown()) return;
  const { data, error } = await sb.rpc('my_footprint');
  if (error || !data) return;
  const f = data;
  $('s_country').textContent = f.countries;
  /* `f.cities`(다녀온 도시)를 쓰던 타일은 걷었습니다 — '매긴 곳'과 늘 같은
     숫자로 보였습니다(index.html 의 그 자리에 왜 그런지 적어뒀습니다).
     ⚠ 이제 **화면 어디서도 `f.cities` 를 안 씁니다.** 지도와 발자국은
       `my_visited()` 를 직접 부릅니다(4487·4630줄). my_footprint 는 그대로
       두는데, 지우려면 서버 함수를 고쳐야 하고 `countries` 는 여기서 씁니다. */
  $('s_rated').textContent   = f.rated;
  /* 한줄평 수는 my_footprint 에 없습니다. 개수만 따로 셉니다. */
  sb.from('city_ratings').select('city_id', { count:'exact', head:true })
    .eq('user_id', me.id).not('comment', 'is', null)
    .then(r => { $('s_comment').textContent = r.count ?? 0; });
  $('s_rated2').textContent  = f.rated;
  /* 맛집은 일정 줄에 매기므로 my_footprint 에 없습니다. 따로 셉니다.
     평가 화면에서 관광지도 매기게 했더니 그것까지 세어 18 로 나왔습니다.
     목록은 식사·카페만 보여주므로 세는 것도 같은 기준이어야 합니다. */
  for (const [box, cats] of [['s_place', ['식사','카페']], ['s_spot', ['관광','쇼핑']]])
    sb.from('plan_ratings')
      .select('plan_id, plans!inner(category)', { count:'exact', head:true })
      .eq('user_id', me.id).not('stars', 'is', null)
      .in('plans.category', cats)
      .then(r => { $(box).textContent = r.count ?? 0; });
  $('s_want').textContent    = f.wants;
  /* 후기를 남긴 여행 수. 목록과 같은 함수를 써야 숫자와 목록이 안 어긋납니다. */
  sb.rpc('my_reviews')
    .then(r => { $('s_review').textContent = (r.data || []).length; })
    .catch(() => {});
  /* 받은 배지 수. 여기서 부르는 김에 새로 받은 것도 기록됩니다 —
     배지 화면을 안 열어봐도 받은 시각이 남습니다. */
  sb.rpc('my_badges')
    .then(r => { $('s_badge').textContent =
      (r.data || []).filter(b => b.earned_at).length; })
    .catch(() => {});

  const pct = Math.min(100, f.countries / UN_COUNTRIES * 100);
  $('s_prog').innerHTML = f.countries
    ? `${UN_COUNTRIES}개국 중 <b>${f.countries}개국</b> · ${pct.toFixed(1)}%
       <div class="bar"><i style="width:${Math.max(pct, 1.5)}%"></i></div>`
    : '다녀온 곳을 표시하면 여기에 쌓여요.';

  const by = f.by_continent || {};
  $('s_cont').innerHTML = Object.entries(by)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `<span class="day" style="cursor:default">${esc(k)}
       <span class="n">${n}</span></span>`).join('');
}


/* ── 후보와 빈 시간 ──────────────────────────────────────────────────
 * 도쿄 앱에서 가장 잘 굴러가던 기능입니다. 가고 싶은 곳을 모아두고,
 * 일정 사이에 뜬 시간에 "여기 넣을 수 있어요"라고 알려줍니다.
 *
 * 도쿄에서 겪은 세 가지를 그대로 가져와 막습니다.
 *   1. 밤에서 아침으로 걸친 구간을 빈 시간으로 잡던 것 (Day2 02:38~10:00)
 *      → 낮 시간대로 잘라내고, 그러고도 한 시간이 남을 때만 씁니다.
 *   2. 앞뒤 일정과 사실상 같은 자리를 또 제안하던 것
 *      (우에노 공원을 우에노 온시 공원 옆에)  → 0.3km 안쪽이면 거릅니다.
 *   3. 체류 시간으로 자르면 아무것도 안 남던 것
 *      → 오가는 시간을 뺀 "머물 수 있는 시간"을 보여주고 사용자가 정하게 합니다.
 *
 * 이동 시간은 도쿄의 고정식 대신 v2 의 구간별 상수를 씁니다. 이쪽이 낫습니다. */
const STAY = { 카페:40, 식사:60, 관광:90, 쇼핑:60, 이동:30, 숙소:0, 기타:60 };
const stayMin = c => STAY[c] ?? 60;
const DAY_START = 9 * 60, DAY_END = 21 * 60;   /* 이 밖은 자거나 쉬는 시간으로 봅니다 */
const SAME_KM = 0.3;                           /* 이보다 가까우면 사실상 같은 자리 */
let cands = [], fitList = [];

const toMin = t => { const m = String(t || '').match(/^(\d{1,2}):(\d{2})/);
                     return m ? +m[1] * 60 + +m[2] : 9999; };
const hhmm = m => { m = Math.max(0, Math.round(m));
                    return ('0' + Math.floor(m / 60) % 24).slice(-2) +
                           ':' + ('0' + (m % 60)).slice(-2); };
/* legOf/tmin 은 calc.js 로 옮겼습니다(legFirst/travelMinutes) — legs 를 매개변수로
   받게 바뀌어서 여기서는 모듈 전역 legs 를 넘겨주는 한 줄 래퍼만 둡니다. */
const legOf = d => legFirst(legs, d);
const tmin = (km, d) => travelMinutes(legs, km, d);

function planGaps(){
  const byDay = {}, out = [];
  (plans || []).forEach(p => (byDay[p.date] = byDay[p.date] || []).push(p));
  Object.keys(byDay).forEach(d => {
    const list = byDay[d].slice().sort((a, b) => toMin(a.start_time) - toMin(b.start_time));
    for (let i = 0; i < list.length - 1; i++){
      const a = list[i], b = list[i + 1];
      const t1 = toMin(a.start_time), t2 = toMin(b.start_time);
      if (t1 >= 9999 || t2 >= 9999) continue;
      /* v2 는 끝 시각을 받으므로 있으면 그걸 씁니다. 도쿄는 없어서 늘 어림했습니다. */
      const e = toMin(a.end_time);
      const aEnd = e < 9999 ? e : t1 + stayMin(a.category);
      if (t2 - aEnd < 60) continue;              /* 한 시간도 안 남으면 넣을 자리가 아닙니다 */
      const from = Math.max(aEnd, DAY_START), to = Math.min(t2, DAY_END);
      if (to - from < 60) continue;
      out.push({ date:d, after:a, before:b, from, to });
    }
  });
  return out;
}

function findFits(){
  const gaps = planGaps();
  const cs = cands.filter(c => c.lat != null && c.lng != null);
  const best = {};
  gaps.forEach(g => {
    if (g.after.lat == null || g.before.lat == null) return;
    cs.forEach(c => {
      const dA = distKm(g.after.lat, g.after.lng, c.lat, c.lng);
      const dB = distKm(c.lat, c.lng, g.before.lat, g.before.lng);
      if (dA == null || dB == null) return;
      if (dA < SAME_KM || dB < SAME_KM) return;
      const go = tmin(dA, g.date), back = tmin(dB, g.date);
      const avail = (g.to - g.from) - go - back;
      if (avail < 40) return;                    /* 40분도 안 되면 갈 만하지 않습니다 */
      if (best[c.id] && best[c.id].avail >= avail) return;
      best[c.id] = { cand:c, date:g.date, at:g.from + go, go, back, avail,
                     tight: avail < stayMin(c.category), after:g.after.title };
    });
  });
  return Object.values(best)
    .sort((a, b) => (b.avail - a.avail) || (a.go - b.go)).slice(0, 3);
}

function drawCands(){
  fitList = findFits();
  $('fits').innerHTML = fitList.length
    ? `<div class="daysep">빈 시간에 넣기 좋은 곳</div>` + fitList.map((f, i) =>
        `<div class="picked" style="align-items:flex-start; margin-bottom:8px">
           <div class="p" style="min-width:0">
             <b>${esc(f.cand.title)}</b>
             <div class="c">${esc(dayLabel(f.date, trip))} · ${hhmm(f.at)}쯤</div>
             <div class="c">${esc(f.after)}에서 ${f.go}분 · 머물 수 있는 시간
               <b>${f.avail}분</b> · 다음까지 ${f.back}분${
               f.tight ? ' · 짧게 보고 나와야 해요' : ''}</div>
           </div>
           <button class="small" data-fit="${i}">넣기</button>
         </div>`).join('')
    : '';

  $('cands').innerHTML = cands.length
    /* 한 줄로 늘어놓으니 답답했습니다. 카드로 펼치고 할 수 있는 일을 다 답니다 —
       일정에 넣기 · 지도 · 삭제. 도쿄 앱의 후보 여행지와 같은 구성입니다. */
    ? cands.map(c => {
        const ml = mapLinks(c, trip?.destination);
        /* '좌표 없음'은 개발자 말입니다. 사용자에게 뜻하는 것은 하나뿐입니다 —
           이 곳은 지도에 안 뜬다. 아래 '좌표 채우기'가 채워줍니다. */
        /* 현지 이름은 **우리말 이름과 다를 때만** 답니다. 국내 장소는 둘이
           같아서 "삼고정문 / 식사 · 삼고정문"처럼 이름이 두 번 나왔습니다. */
        const loc = c.title_local && c.title_local !== c.title ? c.title_local : null;
        const sub = [c.category, loc].filter(Boolean);
        return `<div class="cdc">
          <div class="t"><b>${esc(c.title)}</b>${
            c.lat == null ? ' <span class="val">지도에 아직 안 떠요</span>' : ''}</div>
          ${sub.length ? `<div class="s">${sub.map(esc).join(' · ')}</div>` : ''}
          ${c.memo ? `<div class="m">${esc(c.memo)}</div>` : ''}
          <div class="a">
            <button class="ghost" data-candplan="${esc(c.id)}"
                    style="color:var(--primary)">일정에 넣기</button>
            <a href="${esc(ml.see)}" target="_blank" rel="noopener">지도</a>
            <button class="ghost" data-canddel="${esc(c.id)}"
                    style="color:var(--bad); margin-left:auto">삭제</button>
          </div>
        </div>`;
      }).join('')
    : '<div class="empty">갈 만한 곳이 아직 없어요.<br>AI 제안에서 담거나 아래에 적어보세요.</div>';
  drawGeoBtn();
}

/* ── 좌표 채우기 ─────────────────────────────────────────────────────
 * 좌표가 없으면 빈 시간 계산과 이동 어림에서 그 줄이 통째로 빠집니다.
 * 도쿄 앱처럼 OpenStreetMap 을 씁니다 — 키도 한도도 없고 AI 횟수도 안 씁니다.
 * 다만 초당 한 번이 그쪽 규칙이라 사이를 띄우고, 실패하면 더 두드리지 않습니다. */
let geoBusy = false;

/* 일정 제목은 장소 이름이 아닌 게 많습니다.
 * "호텔 ➡️ 콜로세움 이동"은 두 지점이고 "트라스테베레 산책 & 저녁"은 할 일입니다.
 * 찾을 만한 이름을 뽑아 넓혀가며 시도합니다.
 * 이동 줄은 도착지를 씁니다 — 그 일정이 끝났을 때 서 있는 자리가 도착지입니다. */
function geoQueries(title){
  const t = String(title || '').replace(/[➡→⇒]️?|->/g, '>').replace(/\s+/g, ' ').trim();
  const out = [];
  const add = s => { s = String(s || '').replace(/\s+/g, ' ').trim();
                     if (s && !out.includes(s)) out.push(s); };
  const main = t.includes('>') ? t.split('>').pop() : t;
  add(main.replace(/\s*이동\s*$/, ''));
  if (!t.includes('>')) add(t);
  const base = main.split(/[&/·,]/)[0]
    .replace(/(쇼핑|점심|저녁|아침|브런치|산책|구경|관람|투어|체험|픽업|이동|출발|도착|입국|출국|체크인|체크아웃)/g, ' ');
  add(base);
  add(base.trim().split(' ')[0]);
  return out.slice(0, 3);
}

async function osmLookup(q){
  const u = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' +
            encodeURIComponent(q);
  try {
    const r = await fetch(u, { headers: { 'Accept-Language': 'ko,en' } });
    if (!r.ok) return r.status === 429 ? 'stop' : null;
    const a = await r.json();
    if (!a?.length) return null;
    const lat = Number(a[0].lat), lng = Number(a[0].lon);
    return (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) ? { lat, lng } : null;
  } catch { return null; }
}

/* 좌표가 없는 것들. 일정과 후보를 한 목록으로 다룹니다 —
   버튼을 따로 두면 두 번 눌러야 하고 어느 쪽이 남았는지도 헷갈립니다. */
const needCoord = () => [
  ...(plans || []).filter(p => p.lat == null)
    .map(p => ({ kind:'plans', id:p.id, title:p.title, date:p.date })),
  ...(cands || []).filter(c => c.lat == null)
    .map(c => ({ kind:'candidates', id:c.id, title:c.title })),
];

function drawGeoBtn(){
  const list = needCoord();
  const np = list.filter(x => x.kind === 'plans').length;
  const b = $('geobtn');
  b.classList.toggle('hide', !list.length && !geoBusy);
  /* 일정 몇 곳인지 같이 적습니다. 후보가 비어 있으면 왜 뜨는지 모릅니다. */
  b.textContent = geoBusy ? '중단하기'
    : `좌표 채우기 · ${list.length}곳` + (np ? ` (일정 ${np}곳 포함)` : '');
}

$('geobtn').addEventListener('click', async () => {
  if (geoBusy){ geoBusy = false; return; }
  const list = needCoord();
  if (!list.length) return;
  geoBusy = true; drawGeoBtn();
  let done = 0, miss = 0;

  for (const it of list){
    if (!geoBusy) break;
    /* 도시 이름을 붙여야 같은 이름이 여러 나라에 있을 때 엉뚱한 데로 안 갑니다. */
    const city = (legOf(it.date) || (legs || [])[0])?.destination || trip?.destination || '';
    let hit = null;
    for (const q of geoQueries(it.title)){
      hit = await osmLookup(city && !q.includes(city) ? `${q} ${city}` : q);
      if (hit === 'stop'){ geoBusy = false; break; }
      if (hit) break;
      await new Promise(r => setTimeout(r, 1100));   /* 초당 한 번이 그쪽 규칙입니다 */
    }
    if (!geoBusy) break;
    if (hit && hit !== 'stop'){
      const r = await sb.from(it.kind).update({ lat: hit.lat, lng: hit.lng })
        .eq('id', it.id).select('id');
      if (!r.error && r.data?.length) done++;
    } else miss++;
    $('geobtn').textContent = `채우는 중… ${done + miss}/${list.length}`;
    await new Promise(r => setTimeout(r, 1100));
  }

  geoBusy = false;
  await loadPlans();
  await loadCands();
  if (miss) fail(`${done}곳을 채웠어요. ${miss}곳은 못 찾았어요 — ` +
                 `이름을 장소 이름으로 고치면 찾을 수 있어요.`, 'cand');
}, false);

async function loadCands(){
  if (!trip) return;
  const r = await netTimeout(sb.from('candidates')
    .select('id,title,title_local,category,memo,lat,lng')
    .eq('trip_id', trip.id).is('deleted_at', null).order('created_at'));
  if (r.error){
    if (isOffline(r.error)){ offNote('cands'); drawOffbar(); return; }
    return fail(r.error, 'cand'); }
  cands = r.data || [];
  drawCands();
}

/* ── 후보를 AI 에게 추천받기 ─────────────────────────────────────────
 * 그냥 "추천해줘"라고 물으면 이미 담아둔 곳을 또 말합니다.
 * 담긴 것과 일정에 넣은 것을 같이 적어 보내 겹치지 않게 합니다.
 *
 * 답은 AI 시트에서 받습니다. 여기서 따로 그리면 담기 카드와 되돌리기를
 * 두 벌로 만들게 되고, 언젠가 한쪽만 고칩니다. */
$('c_ai').addEventListener('click', async () => {
  if (!trip) return;
  const taken = [...cands.map(c => c.title),
                 ...plans.map(p => p.title)].filter(Boolean);
  /* 너무 길면 물음이 목록에 묻힙니다. 앞쪽 40개면 겹침을 막기에 충분합니다. */
  const list = [...new Set(taken)].slice(0, 40);

  const leg = legs.length ? legs[0] : null;
  const where = leg?.destination || trip.destination || '';
  const msg = `${where} 에서 가볼 만한 곳을 추천해줘.` +
    (list.length ? ` 다만 이미 담아뒀거나 일정에 넣은 곳은 빼줘: ${list.join(', ')}` : '');

  /* 후보 시트를 닫고 AI 시트를 엽니다. 둘이 겹쳐 있으면 답을 못 봅니다. */
  $('card-cand').classList.add('hide');
  syncSheets();
  openAi();
  $('ai_trip').value = trip.id;
  await loadChats(trip.id);
  $('ai_msg').value = msg;
  $('ai_send').click();
});

$('candbtn').addEventListener('click', async () => {
  $('card-cand').classList.remove('hide');
  $('card-cand').scrollIntoView({ behavior:'smooth', block:'nearest' });
  await loadCands();
});
$('candclose').addEventListener('click', () => $('card-cand').classList.add('hide'));

$('c_add').addEventListener('click', async () => {
  const t = $('c_title').value.trim();
  if (!t) return;
  /* 좌표는 안 받습니다. AI 제안으로 담으면 좌표가 같이 옵니다.
     손으로 적은 것은 좌표가 없어 빈 시간 계산에서는 빠집니다. */
  const r = await sb.from('candidates')
    .insert({ trip_id: trip.id, title: t, source: 'manual' }).select('id');
  if (r.error) return fail(r.error, 'cand');
  if (!r.data?.length) return fail(NOROW.save, 'cand');
  $('c_title').value = '';
  await loadCands();
});
$('c_title').addEventListener('keydown', e => { if (e.key === 'Enter') $('c_add').click(); });

$('card-cand').addEventListener('click', async e => {
  const f = e.target.closest('[data-fit]');
  if (f){
    /* 제안한 자리 그대로 일정 칸을 채워 엽니다. 날짜와 시각까지 미리 넣습니다. */
    const x = fitList[+f.dataset.fit]; if (!x) return;
    /* 후보의 좌표도 같이 넘깁니다. 예전에는 폼을 거치면서 사라져서,
       빈 시간을 좌표로 계산해 놓고 정작 넣은 일정에는 좌표가 없었습니다. */
    openPlanForm({
      title: x.cand.title, category: x.cand.category, memo: x.cand.memo,
      date: x.date, start_time: hhmm(x.at),
      end_time: hhmm(x.at + Math.min(x.avail, stayMin(x.cand.category))),
      lat: x.cand.lat, lng: x.cand.lng,
    });
    $('card-cand').classList.add('hide');
    return;
  }
  /* 후보를 일정으로. 빈 시간 제안을 안 거치고 바로 넣고 싶을 때 씁니다. */
  const cp = e.target.closest('[data-candplan]');
  if (cp){
    const c = cands.find(x => x.id === cp.dataset.candplan); if (!c) return;
    openPlanForm({ title: c.title, category: c.category, memo: c.memo,
                   lat: c.lat, lng: c.lng });
    $('card-cand').classList.add('hide');
    return;
  }

  const d = e.target.closest('[data-canddel]');
  if (d){
    const r = await sb.from('candidates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', d.dataset.canddel).select('id');
    if (r.error) return fail(r.error, 'cand');
    if (!r.data?.length) return fail(NOROW.del, 'cand');
    await loadCands();
  }
});

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

/* ── 보관함 ──────────────────────────────────────────────────────────
 * 기록 탭으로 보내면 그 탭이 걸린 목록으로 바뀝니다. 그러면 새로 매길 곳을
 * 찾을 수가 없습니다 — 기록 탭은 안 매긴 곳을 보여주는 자리입니다.
 * 프로필 안에서 펼치고, 여기서도 바로 별점을 고칠 수 있게 합니다. */
/* **been 이 빠져 있었습니다.** 프로필의 '국가'·'도시' 타일을 누르면 제목이
   그냥 '보관함'으로 떠서 무슨 목록인지 알 수가 없었습니다.
   그리고 '다녀온 곳'이 도시(been)와 관광지(spot) 둘을 가리키고 있었습니다 —
   보관함 안에 '다녀온 맛집' 옆에 '다녀온 곳'이 나란히 있으니 더 헷갈립니다.
   도시는 '다녀온 도시', 관광지는 '다녀온 관광지'로 갈랐습니다. */
const SHELF = { been:'다녀온 도시', want:'가보고 싶은 곳', mine:'내가 매긴 곳',
                comment:'한줄평 남긴 곳', place:'다녀온 맛집', spot:'다녀온 관광지',
                review:'여행 후기', badge:'여행 배지' };
/* 맛집과 관광지는 같은 방식으로 다룹니다 — 분류만 다릅니다. */
const SHELF_CAT = { place:['식사','카페'], spot:['관광','쇼핑'] };

/* ── 보관함 정렬·거르기 ─────────────────────────────────────────────
 * 매긴 것이 쌓이면 목록이 길어져 찾을 수가 없습니다.
 * 별점이 없는 보관함(가보고 싶은 곳)에서는 아예 안 나옵니다 — 거를 것이 없습니다. */
let shelfSort = 'new';
const HAS_STARS = k => k === 'mine' || k === 'comment' || k === 'place' || k === 'spot';

/* 목록을 정렬 규칙에 맞게 세웁니다.
   at 은 마지막으로 손댄 시각입니다 — 없으면 최신순에서 뒤로 갑니다.
   별점 칸(★5 · ★4점대 …)도 만들어 봤는데 줄이 둘이 되면서 답답했습니다.
   목록이 짧아서 정렬만으로 충분합니다. */
function shelfArrange(list){
  const by = {
    new:  (a, b) => String(b.at || '').localeCompare(String(a.at || '')),
    high: (a, b) => (b.stars ?? -1) - (a.stars ?? -1),
    low:  (a, b) => (a.stars ?? 99) - (b.stars ?? 99),
  }[shelfSort];
  return [...list].sort((a, b) => by(a, b) || String(a.name).localeCompare(String(b.name), 'ko'));
}

$('shelffilter').addEventListener('click', e => {
  const s = e.target.closest('[data-ssort]');
  if (s){ shelfSort = s.dataset.ssort; openShelf(shelfKind); }
});

/* 도시가 아니라 일정 줄에 답니다. 일정 짤 때 이미 넣은 것이라
   따로 적게 하지 않고, 다녀온 여행의 그 분류만 모아 별점을 받습니다. */
async function openPlaceShelf(kind){
  const today = todayYmd();
  const cats = SHELF_CAT[kind] || SHELF_CAT.place;
  const [ps, rs] = await Promise.all([
    sb.from('plans').select('id,title,memo,category,date,trip_id,trips(title,end_date)')
      .in('category', cats).is('deleted_at', null)
      .order('date', { ascending:false }).limit(300),
    /* updated_at 은 최신순에 씁니다. select 에 안 적으면 undefined 로 와서
       전부 같은 값이 되고 최신순이 이름순처럼 보입니다. */
    sb.from('plan_ratings').select('plan_id,stars,updated_at').eq('user_id', me.id),
  ]);
  if (ps.error) return fail(ps.error, 'trip');
  const rate = Object.fromEntries((rs.data || []).map(r => [r.plan_id, r.stars]));
  const rateAt = Object.fromEntries((rs.data || []).map(r => [r.plan_id, r.updated_at]));
  /* 아직 안 끝난 여행은 뺍니다 — 가보지도 않고 별점을 매길 수는 없습니다.
     다만 이미 매긴 것은 남깁니다. 매겼다는 것은 갔다는 뜻이고,
     프로필의 숫자와 여기 목록이 어긋나면 어느 쪽을 믿어야 할지 모릅니다. */
  const all = (ps.data || []).filter(p =>
    rate[p.id] != null || (p.trips?.end_date || p.date) < today)
    .map(p => ({ ...p, stars: rate[p.id] ?? null, at: rateAt[p.id] || p.date, name: p.title }));

  const list = shelfArrange(all);

  /* 도시 목록과 같은 이유로 평균을 같이 적습니다(위 주석 참고).
     여기는 아직 안 매긴 장소가 섞여 있어 **매긴 것만으로** 셉니다. */
  {
    const st = list.map(p => rate[p.id]).filter(s => s != null);
    const avg = st.length ? (st.reduce((a, b) => a + b, 0) / st.length) : null;
    $('shelfcount').textContent = !list.length ? ''
      : avg != null ? `${list.length}곳 · 평균 ★${avg.toFixed(1)}` : `${list.length}곳`;
  }
  $('shelflist').innerHTML = list.length
    ? list.map(p => `<div class="rrow">
        <span class="thumb ph">${({ 식사:'🍽', 카페:'☕', 관광:'📸', 쇼핑:'🛍' })[p.category] || '📍'}</span>
        <div class="t"><b>${esc(p.title)}</b>
          <span class="memo">${esc(p.trips?.title || '')} · ${esc(p.date)}</span></div>
        <span class="stars" data-plan="${esc(p.id)}">${starHtml(rate[p.id])}</span>
        ${rate[p.id] != null
          ? `<button class="ghost" data-pdel="${esc(p.id)}"
                     style="color:var(--bad); flex:none">×</button>`
          : '<span style="width:26px; flex:none"></span>'}
      </div>`).join('')
    : `<div class="empty">다녀온 여행에 ${esc(cats.join(' · '))} 일정이 아직 없어요.<br>
           일정에 넣어두면 여행이 끝난 뒤 여기서 평가할 수 있어요.</div>`;
}

/* 다녀온 여행에 남긴 것을 모아 봅니다. 여행 화면 안에만 두면 그 여행을
   다시 찾아 들어가야 다시 볼 수 있습니다 — 후기는 다시 보라고 쓰는 것입니다.
   별점·글·사진 중 하나라도 남긴 여행만 나옵니다(db/052 의 my_reviews). */
async function openReviewShelf(){
  const { data, error } = await sb.rpc('my_reviews');
  if (error) return fail(error, 'trip');
  const list = data || [];
  $('shelfcount').textContent = list.length ? `${list.length}개` : '';
  if (!list.length){
    $('shelflist').innerHTML =
      `<div class="empty">아직 남긴 후기가 없어요.<br>
         여행이 끝나면 그 여행 화면에서 별점과 글, 사진을 남길 수 있어요.</div>`;
    return;
  }
  /* 표지 사진은 비공개 통에 있습니다. 잠깐 열리는 주소를 한 번에 받습니다. */
  const paths = list.map(r => r.cover).filter(Boolean);
  let by = {};
  if (paths.length){
    const { data: urls } = await sb.storage.from('trip-photos')
      .createSignedUrls(paths, 3600);
    by = Object.fromEntries((urls || []).map(u => [u.path, u.signedUrl]));
  }
  $('shelflist').innerHTML = list.map(r => `
    <div class="rvcard" data-rvtrip="${esc(r.trip_id)}">
      ${r.cover ? `<img src="${esc(by[r.cover] || '')}" alt="" loading="lazy">` : ''}
      <div class="b">
        <div class="t"><b>${esc(r.title)}</b>
          <span class="c">${esc(r.end_date)}</span></div>
        ${r.stars != null ? `<span class="stars">${starHtml(r.stars)}</span>` : ''}
        ${r.comment ? `<div class="m">${esc(r.comment)}</div>` : ''}
        ${r.photos ? `<div class="c">사진 ${r.photos}장</div>` : ''}
      </div>
    </div>`).join('');
}

/* 후기 카드를 누르면 그 여행을 엽니다. 고치는 것은 거기서 합니다 —
   여기서도 고치게 하면 같은 폼이 두 벌이 됩니다. */
$('shelflist').addEventListener('click', e => {
  const c = e.target.closest('[data-rvtrip]');
  if (c) openTrip(c.dataset.rvtrip);
});

/* ── 여행 배지 ───────────────────────────────────────────────────────
 * 세는 것은 전부 DB 가 합니다(db/053). 화면에서 세면 기기마다 다르게
 * 나오고, 나중에 조건을 바꿔도 옛날 기기는 옛 조건으로 셉니다.
 *
 * **못 받은 것도 보여줍니다.** 받은 것만 늘어놓으면 다음에 뭘 하면
 * 되는지 알 수가 없습니다 — 배지는 받은 자랑이자 다음 목표입니다. */
async function openBadgeShelf(){
  const { data, error } = await sb.rpc('my_badges');
  if (error) return fail(error, 'trip');
  const list = data || [];
  const got = list.filter(b => b.earned_at);
  $('shelfcount').textContent = `${got.length} / ${list.length}`;

  /* 지금 내 숫자를 맨 위에 한 줄로 적습니다. 이게 없으면 "왜 이 배지가
     안 들어오지"를 알 길이 없습니다 — 실제로 국가 27인데 배지가 안 켜지는
     일이 있었고, 그때 어디가 틀렸는지 볼 자리가 없었습니다.
     갈래마다 재는 것이 하나씩이라 배지 목록에서 그대로 뽑아 씁니다. */
  /* 갈래의 **마지막** 배지 값을 씁니다. '여행'만 첫 칸이 여행 횟수고
     나머지가 일수라, 첫 칸을 쓰면 "여행 3일"처럼 엉뚱하게 나옵니다. */
  const now = {};
  for (const b of list) now[b.cat] = b.have;
  const line = Object.entries(now)
    .map(([c, v]) => `${c} ${v}${{ '평가':'곳', '다녀온 곳':'개국',
                                   '여행':'일', '후기':'개' }[c] || ''}`)
    .join(' · ');

  /* 갈래끼리 묶습니다. 스물일곱 개를 한 줄로 늘어놓으면 훑을 수가 없습니다. */
  const cats = [];
  for (const b of list){
    const last = cats[cats.length - 1];
    if (last && last.cat === b.cat) last.items.push(b);
    else cats.push({ cat: b.cat, items: [b] });
  }
  $('shelflist').innerHTML = `<div class="memo bdnow">${esc(line)}</div>` +
    cats.map(g => {
    const n = g.items.filter(b => b.earned_at).length;
    return `<div class="daysep">${esc(g.cat)}
      <span class="dstat">${n}/${g.items.length}</span></div>
      ${/* 이름과 설명을 따로 뒀더니 둘이 같은 말이었습니다 — '첫 해외'와
            '다른 나라에 한 곳 다녀왔어요'. 조건 그 자체를 이름으로 씁니다.
            한 줄이면 무슨 배지인지 한 번에 읽힙니다. 받았는지는 색으로 압니다. */''}
      <div class="bdgrid">${g.items.map(b => `
        <div class="bdg${b.earned_at ? ' on' : ''}"
             title="${esc(b.earned_at ? String(b.earned_at).slice(0,10) + ' 받음'
                                      : b.have + ' / ' + b.need)}">
          <span class="i">${esc(b.icon)}</span>
          <b>${esc(b.name)}</b>
        </div>`).join('')}</div>`;
  }).join('');
}

async function openShelf(kind){
  shelfKind = kind;
  $('profpane').classList.add('hide');
  $('mappane').classList.add('hide');
  $('shelfpane').classList.remove('hide');
  window.scrollTo({ top:0 });
  if (history.state?.t2 !== 'shelf') history.pushState({ t2:'shelf' }, '');
  $('shelfhead').textContent = SHELF[kind] || '보관함';
  /* 별점이 없는 보관함에서는 정렬 칸을 숨깁니다. 거를 것이 없습니다.
     넘어올 때 걸려 있던 조건도 풀어둡니다 — 다른 보관함의 조건이 남아 있으면
     왜 목록이 짧은지 알 수가 없습니다. */
  $('shelffilter').classList.toggle('hide', !HAS_STARS(kind));
  if (!HAS_STARS(kind)) shelfSort = 'new';
  $('shelffilter').querySelectorAll('[data-ssort]').forEach(b =>
    b.classList.toggle('on', b.dataset.ssort === shelfSort));

  if (kind === 'place' || kind === 'spot') return openPlaceShelf(kind);
  if (kind === 'review') return openReviewShelf();
  if (kind === 'badge')  return openBadgeShelf();

  await loadCities();
  /* 전에는 여기서 오류를 안 봤습니다. 실패하면 평가가 하나도 없는 것처럼
     보이고, 공유 자료라 평가 화면까지 같이 비었습니다. 보고 있는 자리에 적습니다. */
  const rd = await loadRateData();
  if (rd.error){
    $('shelfcount').textContent = '';
    $('shelflist').innerHTML =
      `<div class="empty">평가를 못 받아왔어요.<br>
         <span class="memo">${esc(rd.error.message || rd.error)}</span></div>`;
    return;
  }

  const all = (cities || []).filter(c => {
    const r = myRates[c.id];
    if (kind === 'been')    return visited.has(c.id);
    if (kind === 'want')    return !!r?.want;
    if (kind === 'mine')    return r?.stars != null;
    if (kind === 'comment') return !!r?.comment;
    return false;
  }).map(c => ({ ...c, stars: myRates[c.id]?.stars ?? null,
                        at: myRates[c.id]?.updated_at || '' }));

  const list = HAS_STARS(kind) ? shelfArrange(all)
    : [...all].sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  /* **개수만 있고 평균이 없었습니다.** 74곳을 매겼다는 것보다 "평균 몇 점을
     주는 사람인가"가 자기 기록을 볼 때 더 궁금합니다 — 후하게 주는 편인지
     짜게 주는 편인지가 거기서 드러납니다.
     ⚠ **별점이 있는 목록에만 답니다.** '가보고 싶은 곳'은 별점이 없어서
       평균이 NaN 이 되거나 0점으로 보입니다. */
  {
    const st = list.map(c => myRates[c.id]?.stars).filter(s => s != null);
    const avg = st.length ? (st.reduce((a, b) => a + b, 0) / st.length) : null;
    $('shelfcount').textContent =
      !list.length ? '' :
      (HAS_STARS(kind) && avg != null)
        ? `${list.length}곳 · 평균 ★${avg.toFixed(1)}`
        : `${list.length}곳`;
  }
  $('shelflist').innerHTML = list.length
    ? list.map(c => {
        const r = myRates[c.id] || {};
        return `<div class="rrow" data-cityopen="${esc(c.id)}">
          ${c.image_url
            ? `<img class="thumb" src="${esc(c.image_url)}" alt="" loading="lazy">`
            : `<span class="thumb ph">${esc(c.name.slice(0,1))}</span>`}
          <div class="t"><b>${esc(c.name)}</b>
            <span class="memo">${esc(countryName[c.country] || c.country)}${
              avgTail(cityStat[c.id], r)}</span></div>
          <span class="stars" data-city="${esc(c.id)}">${starHtml(r.stars)}</span>
          <button class="ghost want${r.want ? ' on' : ''}" data-want="${esc(c.id)}">♡</button>
        </div>` +
        /* 한줄평은 한줄평 탭에서만 펼칩니다. 내 평가 목록에서는 별점만 봅니다 —
           어떤 줄만 두 줄이 되면 목록이 들쭉날쭉해집니다. */
        /* ⚠ **들여쓰기를 여기서 px 로 적지 않습니다.** 예전엔 `padding-left:60px`
           이었는데, 썸네일이 56 → 76px 로 커지면서(b270) 25px 이 어긋났습니다.
           재보니 실제로는 0px 에서 시작해 **85px 이 밀려 있었습니다.**
           줄 안의 자리는 `.rrow` 격자가 알고 있으므로 CSS 에서 맞춥니다 —
           숫자를 두 곳에 적으면 한쪽만 고치게 됩니다. */
        (kind === 'comment' && r.comment
          ? `<div class="rcmt">${esc(r.comment)}</div>` : '');
      }).join('')
    : `<div class="empty">아직 없어요.</div>`;
}

function closeShelf(fromPop){
  if (!fromPop && history.state?.t2 === 'shelf'){ history.back(); return; }
  $('shelfpane').classList.add('hide');
  $('profpane').classList.remove('hide');
  loadFootprint();                  /* 여기서 매긴 것이 숫자에 바로 반영되게 */
}
$('shelfback').addEventListener('click', () => closeShelf());

/* 지운 줄을 빼는 자리. 곧바로 없애면 눌리자마자 사라져서 뭘 지웠는지 못 봅니다.
   0.7초 두었다가 밀어냅니다 — 지웠다는 것은 보이고, 기다린다는 느낌은 안 듭니다. */
function dropRow(row){
  if (!row) return;
  setTimeout(() => {
    row.classList.add('gone');
    setTimeout(() => {
      row.remove();
      const n = $('shelflist').querySelectorAll('.rrow').length;
      $('shelfcount').textContent = n ? `${n}곳` : '';
      if (!n) $('shelflist').innerHTML = '<div class="empty">아직 없어요.</div>';
    }, 260);
  }, 700);
}

/* 여기서도 별점을 고칠 수 있습니다. 기록 탭과 같은 방식입니다. */
$('shelflist').addEventListener('click', async e => {
  /* 별점을 지우는 길. 별을 0으로 만들 수는 없어서 따로 둡니다.
     지우면 목록에서 빠지고, 다시 남기고 싶으면 여행 탭에서 그 일정에 별을 답니다. */
  const del = e.target.closest('[data-pdel]');
  if (del){
    if (del.dataset.armed !== '1'){ arm(del, '정말 지울까요?'); return; }
    const r = await sb.from('plan_ratings').delete()
      .eq('user_id', me.id).eq('plan_id', del.dataset.pdel).select('plan_id');
    if (r.error) return fail(r.error, 'trip');
    loadFootprint();
    return openShelf(shelfKind);
  }

  const st = e.target.closest('.st');
  /* 식당·카페는 일정 줄에 답니다. 도시 별점과 저장하는 표가 다릅니다. */
  const pw = st?.closest('.stars[data-plan]');
  if (pw){
    const box = st.getBoundingClientRect();
    const v = +st.dataset.n - ((e.clientX - box.left) < box.width / 2 ? 0.5 : 0);
    const cur = [...pw.querySelectorAll('.st i')]
      .reduce((s, i) => s + parseFloat(i.style.width) / 100, 0);
    const next = Math.abs(cur - v) < .01 ? null : v;
    /* 같은 점수를 다시 누르면 아예 지웁니다. 별점 없는 줄을 남겨두면
       "지웠는데 그대로 있다"가 됩니다. */
    if (next == null){
      const r = await sb.from('plan_ratings').delete()
        .eq('user_id', me.id).eq('plan_id', pw.dataset.plan).select('plan_id');
      if (r.error) return fail(r.error, 'trip');
      loadFootprint();
      return openShelf(shelfKind);
    }
    paintStars(pw, next, true);
    const r = await sb.from('plan_ratings')
      .upsert({ user_id: me.id, plan_id: pw.dataset.plan, stars: next },
              { onConflict: 'user_id,plan_id' }).select('plan_id');
    if (r.error) return fail(r.error, 'trip');
    loadFootprint();
    return;
  }
  if (st){
    const wrap = st.closest('.stars'), cityId = wrap.dataset.city;
    const row = st.closest('.rrow');
    const box = st.getBoundingClientRect();
    const v = +st.dataset.n - ((e.clientX - box.left) < box.width / 2 ? 0.5 : 0);
    const next = Number(myRates[cityId]?.stars) === v ? null : v;
    paintStars(wrap, next, true);
    markRated(row, next);
    await saveRate(cityId, { stars: next }, true);

    /* 지웠으면 목록에서도 빼야 합니다. 저장은 되는데 줄이 그대로 남아 있어서
       "안 지워진다"로 보였습니다 — 새로고침해야 사라졌습니다.
       여기는 "내 평가"이므로 별점이 없으면 있을 자리가 아닙니다.
       다시 그리지 않고 그 줄만 빼는 이유는, 다시 그리면 화면이 맨 위로 튀기 때문입니다. */
    if (next == null && shelfKind === 'mine') dropRow(row);
    loadFootprint();                 /* 프로필 숫자도 같이 맞춥니다 */
    return;
  }
  const w = e.target.closest('button[data-want]');
  if (w){
    const on = !myRates[w.dataset.want]?.want;
    await saveRate(w.dataset.want, { want: on }, true);
    w.classList.toggle('on', on);
    /* 별점과 같은 이유입니다 — "가보고 싶은 곳"에서 하트를 끄면 그 줄도 빠져야 합니다. */
    if (!on && shelfKind === 'want') dropRow(w.closest('.rrow'));
    return;
  }
  const row = e.target.closest('[data-cityopen]');
  if (row) await openCity(row.dataset.cityopen);
});

/* AI 는 어디서든 한 번에 갑니다. 여행을 보고 있었으면 그 여행을 물어볼
   대상으로 미리 골라둡니다 — 들어가서 또 고르게 하면 안 씁니다. */
/* 여행 비서는 페이지를 옮기지 않고 보던 화면 위에 올라옵니다.
   일정을 보다가 물어보고 그 자리로 돌아가야 합니다. */
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

/* ── 프로필 사진 ────────────────────────────────────────────────────
 * 폰 사진은 5MB 가 넘기도 합니다. 그대로 올리면 통을 낭비하고 목록도 느려집니다.
 * 256px 정사각으로 줄여서 올립니다 — 88px 로 그리는 자리라 그 이상은 필요 없습니다. */
function shrink(file, size = 256){
  return new Promise((ok, no) => {
    const img = new Image();
    img.onload = () => {
      /* 가운데를 정사각으로 잘라냅니다. 안 그러면 세로 사진이 찌그러집니다. */
      const s = Math.min(img.width, img.height);
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      cv.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2,
                                    s, s, 0, 0, size, size);
      cv.toBlob(b => b ? ok(b) : no(new Error('사진을 바꾸지 못했어요.')),
                'image/jpeg', 0.85);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => no(new Error('사진을 읽지 못했어요.'));
    img.src = URL.createObjectURL(file);
  });
}

$('avatarbtn').addEventListener('click', () => $('avatarfile').click());

$('avatarfile').addEventListener('change', async e => {
  const f = e.target.files?.[0];
  e.target.value = '';                     /* 같은 파일을 또 골라도 걸리게 */
  if (!f) return;
  $('avaerr').classList.add('hide');
  if (!/^image\//.test(f.type)) return fail('사진 파일만 올릴 수 있어요.', 'ava');

  const before = $('avatar').src;
  $('avatar').style.opacity = '.4';
  try {
    const blob = await shrink(f);
    /* 파일 이름을 고정해 옛 사진이 쌓이지 않게 합니다. */
    const path = `${me.id}/avatar.jpg`;
    const up = await sb.storage.from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (up.error) throw up.error;

    /* 이름이 같으니 주소도 같습니다. 그대로 두면 옛 사진이 캐시에서 나옵니다. */
    const url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl
              + '?v=' + Date.now();
    const r = await sb.from('profiles').update({ avatar_url: url })
      .eq('id', me.id).select('avatar_url').maybeSingle();
    if (r.error) throw r.error;
    if (!r.data) throw new Error(NOROW.save);

    $('avatar').src = url;
    myAvatar = url;
  } catch (err) {
    $('avatar').src = before;
    fail(/bucket|not found/i.test(err.message || '')
      ? '사진 저장 공간이 아직 준비되지 않았어요. 만든 사람에게 알려주세요.'
      : err, 'ava');
  }
  $('avatar').style.opacity = '';
});

/* ── 이름 ── profiles.display_name 은 모든 여행에서 쓰는 이름입니다.
   여행마다 다르게 부르고 싶으면 그 여행의 trip_members.nickname 을 씁니다. */
$('editname').addEventListener('click', () => {
  $('namebox').classList.toggle('hide');
  if ($('namebox').classList.contains('hide')) return;
  $('n_name').value = $('name').textContent;
  $('n_name').focus();
});
$('n_cancel').addEventListener('click', () => $('namebox').classList.add('hide'));
$('n_save').addEventListener('click', async () => {
  const v = $('n_name').value.trim();
  if (!v) return fail('이름을 적어주세요.', 'trip');
  const r = await sb.from('profiles').update({ display_name: v })
    .eq('id', me.id).select('id');
  if (r.error) return fail(r.error, 'trip');
  if (!r.data?.length) return fail(NOROW.edit, 'trip');
  $('name').textContent = v;
  /* 사진을 안 올린 사람은 첫 글자가 곧 프로필 그림입니다. 이름을 바꿨으면 같이 바뀝니다. */
  if (!myAvatar) $('avatar').src = avatarOf(me.id, v);
  $('namebox').classList.add('hide');
});

/* ── 글자 크기 ──────────────────────────────────────────────────────
 * 사람마다 다릅니다. 도쿄 앱은 공유값이라 한 명이 키우면 전원 화면이 커졌습니다.
 * 기기에도 저장해서 다음에 열 때 깜빡이지 않고 바로 그 크기로 뜨게 합니다. */
function applyTs(v){
  document.documentElement.style.setProperty('--ts', v);
  document.querySelectorAll('#tsbtns button').forEach(b =>
    b.classList.toggle('on', Number(b.dataset.ts) === Number(v)));
}
$('tsbtns').addEventListener('click', async e => {
  const b = e.target.closest('button[data-ts]'); if (!b) return;
  const v = Number(b.dataset.ts);
  applyTs(v);
  localStorage.setItem('t2:ts', v);
  const r = await sb.from('user_prefs')
    .update({ text_scale: v, updated_at: new Date().toISOString() })
    .eq('user_id', me.id).select('user_id');
  if (r.error) fail(r.error, 'trip');
});

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
const D1 = 864e5;
/* 날짜는 UTC 자정으로 다뤄야 합니다.
   'T00:00:00' 으로 파싱하면 한국 시각 자정이 되고, toISOString() 이 UTC 로
   되돌리면서 하루 앞으로 밀립니다. 그래서 여행 첫날 앞에 유령 칩이 하나 생겼습니다.
   시각이 아니라 날짜를 다루는 자리이므로 처음부터 UTC 로 통일합니다. */
const asDate = s => new Date(s + 'T00:00:00Z');
/* **날짜 문자열을 만드는 함수가 둘입니다. 섞으면 하루가 어긋납니다.**
 *
 * `asDate` 가 **UTC 자정**을 쓰므로(위 줄), 날짜 계산으로 만든 Date 를 다시
 * 문자열로 돌릴 때는 UTC 로 읽어야 짝이 맞습니다. 그게 `ymd` 입니다.
 *   ymd(asDate('2026-08-14'))  →  '2026-08-14'   (어느 시간대에서나)
 *
 * 그런데 **"오늘이 며칠인가"는 UTC 로 물으면 안 됩니다.** `new Date()` 는
 * 지금 이 순간이고, 그것을 UTC 로 자르면 한국(UTC+9)에서는
 * **자정부터 오전 9시까지 어제가 나옵니다.** 실측(b248):
 *   00:30 KST → 08-08   05:00 → 08-08   08:59 → 08-08   09:01 → 08-09
 * 하루의 9시간 동안 앱이 어제를 오늘로 알고 있었습니다 — '오늘 화면',
 * 지난 여행 판정, 지출 날짜 기본값이 다 여기에 걸려 있습니다.
 *
 * 달력의 '오늘' 표시는 더 나빴습니다. 로컬 자정을 만들어 ymd 로 돌렸는데
 * 그건 KST 에서 **하루 종일** 전날입니다.
 *
 * 그래서 "오늘"은 따로 둡니다. 여기는 달력이 보여주는 날짜라 로컬이 맞습니다. */
const ymd = d => d.toISOString().slice(0,10);
const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-` +
         `${String(d.getDate()).padStart(2, '0')}`;
};
const hm  = t => t ? String(t).slice(0,5) : '';

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
  cityOpen = null;
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

/* ── 여행 후기 ──────────────────────────────────────────────────────
 * 끝난 여행에만 나옵니다. 일정을 쓰던 사람이 그대로 평가로 넘어가는 자리라,
 * 기록 탭을 따로 찾아가게 하지 않습니다.
 * 같은 여행도 사람마다 느낌이 다르므로 후기는 한 사람에 한 줄입니다. */
async function loadReview(){
  const ended = trip.end_date < todayYmd();
  $('reviewbox').classList.toggle('hide', !ended);
  if (!ended) return;

  const ids = legs.map(l => l.city_id).filter(Boolean);
  const [mine, rates, all] = await Promise.all([
    sb.from('trip_reviews').select('stars,comment')
      .eq('trip_id', trip.id).eq('user_id', me.id).maybeSingle(),
    ids.length ? sb.from('city_ratings').select('city_id,stars')
                   .eq('user_id', me.id).in('city_id', ids)
               : Promise.resolve({ data: [] }),
    sb.from('trip_reviews').select('user_id,stars,comment').eq('trip_id', trip.id),
  ]);

  myReview = mine.data || {};
  $('rv_when').textContent = `${trip.end_date} 종료`;
  $('rv_stars').innerHTML = starHtml(myReview.stars);
  $('rv_note').value = myReview.comment || '';
  growNote();
  loadPhotos();          /* 사진은 안 기다립니다 — 글과 별점이 먼저 떠야 합니다 */

  const got = Object.fromEntries((rates.data || []).map(r => [r.city_id, r.stars]));
  $('rv_cities').innerHTML = ids.length
    ? `<div class="daysep">다녀온 곳</div>` + legs.filter(l => l.city_id).map(l =>
        `<div class="rrow" style="padding:9px 0">
           <div class="t"><b>${esc(l.destination)}</b>
             <span class="stars" data-rvcity="${esc(l.city_id)}">${
               starHtml(got[l.city_id])}</span></div>
         </div>`).join('')
    : '';

  /* 일행이 남긴 후기. 같이 간 사람끼리는 서로 봅니다. */
  const others = (all.data || []).filter(r => r.user_id !== me.id && (r.stars || r.comment));
  $('rv_others').innerHTML = others.length
    ? `<div class="daysep">일행의 후기</div>` + others.map(r =>
        `<div class="rrow" style="padding:9px 0">
           <div class="t"><b>${esc(nameOf(r.user_id))}</b>
             ${r.comment ? `<span class="memo">${esc(r.comment)}</span>` : ''}
             <span class="stars" style="pointer-events:none">${starHtml(r.stars)}</span></div>
         </div>`).join('')
    : '';
}

async function saveReview(patch){
  const r = await sb.from('trip_reviews')
    .upsert({ trip_id: trip.id, user_id: me.id, ...myReview, ...patch },
            { onConflict: 'trip_id,user_id' })
    .select('stars,comment').maybeSingle();
  if (r.error) return fail(r.error, 'rv');
  myReview = r.data || myReview;
  $('rv_stars').innerHTML = starHtml(myReview.stars);
}

$('reviewbox').addEventListener('click', async e => {
  /* 사진 지우기 — 한 번 더 묻습니다. 통에서도 같이 지웁니다. */
  const del = e.target.closest('[data-rvdel]');
  if (del){
    if (del.dataset.armed !== '1'){ arm(del, '정말 지울까요?'); return; }
    const p = rvPhotos.find(x => x.id === del.dataset.rvdel);
    if (!p) return;
    del.disabled = true;
    const r = await sb.from('trip_photos').delete().eq('id', p.id).select('id');
    del.disabled = false; disarm(del); del.textContent = '×';
    if (r.error) return fail(r.error, 'rv');
    /* 표에서 지운 뒤 통에서도 지웁니다. 순서가 반대면 파일만 사라지고
       줄이 남아 깨진 사진이 뜹니다. 통 쪽이 실패해도 화면은 맞습니다. */
    await sb.storage.from('trip-photos').remove([p.path]);
    await loadPhotos();
    return;
  }

  const st = e.target.closest('.st'); if (!st) return;
  const wrap = st.closest('.stars');
  const box = st.getBoundingClientRect();
  const v = +st.dataset.n - ((e.clientX - box.left) < box.width / 2 ? 0.5 : 0);

  if (wrap.dataset.rvcity){
    /* 여기서 매긴 것이 곧 기록 탭의 도시 별점입니다. 두 벌로 두지 않습니다. */
    const cur = [...wrap.querySelectorAll('.st i')]
      .reduce((s, i) => s + parseFloat(i.style.width) / 100, 0);
    const next = Math.abs(cur - v) < 0.01 ? null : v;
    const up = await sb.from('city_ratings')
      .upsert({ user_id: me.id, city_id: wrap.dataset.rvcity, stars: next },
              { onConflict: 'user_id,city_id' }).select('stars').maybeSingle();
    if (up.error) return fail(up.error, 'rv');
    wrap.innerHTML = starHtml(next);
    return;
  }
  if (wrap.id === 'rv_stars'){
    const next = Number(myReview.stars) === v ? null : v;
    await saveReview({ stars: next });
  }
});

/* 후기 글은 칸을 벗어날 때 저장합니다. 글자마다 보내면 요청이 쏟아집니다. */
$('rv_note').addEventListener('change', () =>
  saveReview({ comment: $('rv_note').value.trim() || null }));
/* 쓴 만큼 칸이 자랍니다. 두 줄에 고정해두면 긴 글을 좁은 구멍으로 씁니다. */
function growNote(){
  const t = $('rv_note');
  t.style.height = 'auto';
  t.style.height = Math.min(t.scrollHeight, 320) + 'px';
}
$('rv_note').addEventListener('input', growNote);

/* ── 후기 사진 ───────────────────────────────────────────────────────
 * 통은 **비공개**입니다. 주소를 알아도 그냥은 안 열립니다(db/052).
 * 그래서 볼 때마다 잠깐 열리는 주소를 받아 씁니다(createSignedUrl).
 *
 * 폰 사진은 5MB 가 넘기도 합니다. 그대로 올리면 통도 낭비하고 여행지에서
 * 데이터도 씁니다. 긴 변 1280 으로 줄여 올립니다 — 화면에서 보는 크기의
 * 두 배쯤이라 확대해도 뭉개지지 않습니다. */
const RV_MAX = 30;           /* 여행 하나에 이만큼. 통이 무한하지 않습니다 */
let rvPhotos = [];

function fitImage(file, max = 1280, q = 0.82){
  return new Promise((ok, no) => {
    const img = new Image();
    img.onload = () => {
      /* 가로세로 비를 지킵니다. 정사각으로 자르는 avatar 쪽(shrink)과 다릅니다 —
         여행 사진은 잘라내면 정작 찍은 것이 잘려 나갑니다. */
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width  = Math.round(img.width  * s);
      cv.height = Math.round(img.height * s);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(img.src);
      cv.toBlob(b => b ? ok(b) : no(new Error('사진을 못 읽었어요')), 'image/jpeg', q);
    };
    img.onerror = () => no(new Error('사진을 못 읽었어요'));
    img.src = URL.createObjectURL(file);
  });
}

async function loadPhotos(){
  const { data, error } = await sb.from('trip_photos')
    .select('id,path,user_id,created_at').eq('trip_id', trip.id).order('created_at');
  if (error){ $('rv_shots').innerHTML = ''; return fail(error, 'rv'); }
  rvPhotos = data || [];
  await drawPhotos();
}

async function drawPhotos(){
  const box = $('rv_shots');
  if (!rvPhotos.length){ box.innerHTML = ''; $('rv_shotnote').textContent = ''; return; }
  /* 주소를 하나씩 받으면 사진 수만큼 왕복합니다. 한 번에 받습니다. */
  const { data: urls } = await sb.storage.from('trip-photos')
    .createSignedUrls(rvPhotos.map(p => p.path), 3600);
  const by = Object.fromEntries((urls || []).map(u => [u.path, u.signedUrl]));
  box.innerHTML = rvPhotos.map(p =>
    `<div class="rvshot">
       <img src="${esc(by[p.path] || '')}" alt="" loading="lazy">
       ${p.user_id === me.id
         ? `<button class="x" data-rvdel="${esc(p.id)}" aria-label="지우기">×</button>` : ''}
     </div>`).join('');
  $('rv_shotnote').textContent = `${rvPhotos.length}장`;
}

$('rv_file').addEventListener('change', async e => {
  const files = [...(e.target.files || [])];
  e.target.value = '';                    /* 같은 사진을 다시 골라도 걸리게 */
  if (!files.length) return;
  const room = RV_MAX - rvPhotos.length;
  if (room <= 0) return fail(`사진은 여행 하나에 ${RV_MAX}장까지예요.`, 'rv');
  const take = files.slice(0, room);
  if (files.length > room)
    toast(`${RV_MAX}장까지라서 ${take.length}장만 넣었어요.`);

  const lab = $('rv_add').querySelector('span');
  const orig = lab.textContent;
  let done = 0;
  for (const f of take){
    lab.textContent = `올리는 중… ${++done}/${take.length}`;
    try {
      const blob = await fitImage(f);
      /* 경로 맨 앞이 여행 id 여야 통 정책이 참여자인지 가릅니다(db/052). */
      const name = (crypto.randomUUID ? crypto.randomUUID()
                                      : String(Date.now()) + Math.random()).slice(0, 36);
      const path = `${trip.id}/${me.id}/${name}.jpg`;
      const up = await sb.storage.from('trip-photos')
        .upload(path, blob, { contentType:'image/jpeg' });
      if (up.error) throw up.error;
      const r = await sb.from('trip_photos')
        .insert({ trip_id: trip.id, user_id: me.id, path });
      if (r.error){
        /* 표에 못 넣었으면 통에 남은 파일도 치웁니다 — 안 그러면 아무도
           모르는 사진이 통에만 쌓입니다. */
        await sb.storage.from('trip-photos').remove([path]);
        throw r.error;
      }
    } catch (err){
      lab.textContent = orig;
      return fail(err, 'rv');
    }
  }
  lab.textContent = orig;
  await loadPhotos();
});

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
  if (cityOpen) return closeCity(true);
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

/* ── 일정 지도 ───────────────────────────────────────────────────────
 * 목록만 보면 오늘 얼마나 흩어져 다니는지 안 보입니다. 위에 지도를 얹습니다.
 * 좌표가 있는 일정만 찍고, 하나도 없으면 통째로 접습니다.
 * 글자는 영어 지도를 씁니다 — 현지 문자로만 나오면 어디가 어딘지 못 읽습니다. */
let lmap = null, lmarks = null;

/* ── Leaflet 은 쓸 때 불러옵니다 ──────────────────────────────────────
 * 전에는 index.html 의 head 에 defer 로 걸려 있었습니다. 그런데 defer
 * 스크립트와 모듈 스크립트는 **문서 순서대로** 실행됩니다. unpkg 가 느리거나
 * 매달리면 뒤에 있는 app.js 가 아예 실행되지 않고, 그러면 __t2booted 가
 * 안 켜져 부팅 실패 상자만 남습니다. **캐시가 멀쩡해도 그렇습니다** —
 * 재현해서 확인했습니다. 지도 하나가 앱 전체를 붙잡을 이유가 없습니다.
 *
 * 여기서 부르면 늦어도 지도만 늦습니다. 못 받아오면 지도만 안 나옵니다.
 * 실패하면 약속을 지워 다음에 다시 해봅니다 — 한 번 끊겼다고 영영 포기하면
 * 연결이 돌아와도 지도가 안 나옵니다. */
let leafletP = null, leafletWaiting = false;
function ensureLeaflet(){
  if (window.L) return Promise.resolve(true);
  if (leafletP) return leafletP;
  leafletP = new Promise(resolve => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload  = () => resolve(true);
    s.onerror = () => { leafletP = null; resolve(false); };
    document.head.appendChild(s);
  });
  return leafletP;
}

/* **지도는 기본으로 접습니다.** 재보니 앱 폭 480px 에서 첫 일정 줄이
   3일 여행 560px, 11일 여행 722px 아래에서 시작했습니다. 아이폰 홈 화면
   앱의 세로 여유가 780px 안팎이라 긴 여행은 일정이 한 줄도 안 보였습니다.
   지도는 190px 을 먹는데, 여는 목적이 대개 "오늘 뭐 하지"라 매번 필요하진
   않습니다. 고른 것은 기기에 남겨서 지도를 즐겨 보는 사람은 한 번만 켜면
   됩니다. */
let mapOpen = localStorage.getItem('t2:map') === '1';

function drawMapBtn(pts){
  const b = $('mapbtn');
  /* 찍을 게 없으면 단추도 없앱니다 — 눌러서 빈 지도를 보게 할 이유가 없습니다. */
  b.classList.toggle('hide', !pts);
  b.classList.toggle('on', mapOpen && !!pts);
}

$('mapbtn').addEventListener('click', () => {
  mapOpen = !mapOpen;
  localStorage.setItem('t2:map', mapOpen ? '1' : '0');
  drawPlanMap();
});

function drawPlanMap(){
  const box = $('planmap');
  /* **찍을 것을 먼저 세고 나서 Leaflet 을 부릅니다.** 전에는 순서가 반대라,
     지도를 볼 생각이 없어도 열기만 하면 CDN 에서 스크립트와 CSS 를
     받아왔습니다. 이제 접혀 있으면 아예 안 받습니다. */
  let show = pickedDay ? plans.filter(p => p.date === pickedDay) : plans;
  if (catFilter) show = show.filter(p => p.category === catFilter);
  const pts = show.filter(p => p.lat != null && p.lng != null);
  drawMapBtn(pts.length);
  if (!pts.length || !mapOpen){ box.classList.add('hide'); return; }

  /* 아직 안 왔으면 자리를 감춰두고 불러옵니다. 오면 그때 다시 그립니다 —
     그래서 부르는 쪽(열 곳)은 이 함수가 기다리는지 몰라도 됩니다. */
  if (!window.L){
    box.classList.add('hide');
    if (!leafletWaiting){
      leafletWaiting = true;
      ensureLeaflet().then(ok => { leafletWaiting = false; if (ok) drawPlanMap(); });
    }
    return;
  }
  box.classList.remove('hide');

  if (!lmap){
    lmap = L.map(box, { zoomControl:false, attributionControl:false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      { maxZoom:19, subdomains:'abcd' }).addTo(lmap);
    L.control.attribution({ prefix:false })
      .addAttribution('&copy; OpenStreetMap &copy; CARTO').addTo(lmap);
    lmarks = L.layerGroup().addTo(lmap);
  }
  lmarks.clearLayers();

  /* 번호를 붙여야 그날 어떤 차례로 도는지 보입니다. */
  pts.forEach((p, i) => {
    const m = L.marker([p.lat, p.lng], { icon: L.divIcon({
      className:'pmk', iconSize:[26,26], iconAnchor:[13,13],
      html:`<span>${i + 1}</span>` }) });
    m.bindPopup(`<b>${esc(p.title)}</b>` +
      (p.start_time ? `<br>${esc(hm(p.start_time))}` : ''));
    m.addTo(lmarks);
  });
  /* 하루만 보고 있으면 다니는 순서를 선으로 잇습니다. */
  if (pickedDay && pts.length > 1)
    L.polyline(pts.map(p => [p.lat, p.lng]),
      { color:'#0066cc', weight:2, opacity:.5, dashArray:'4 4' }).addTo(lmarks);

  const b = L.latLngBounds(pts.map(p => [p.lat, p.lng]));
  lmap.fitBounds(b, { padding:[28,28], maxZoom:15 });
  setTimeout(() => lmap.invalidateSize(), 50);   /* 접혀 있다 펴지면 크기를 다시 잽니다 */
}

/* ── 메모 쪼개기 ─────────────────────────────────────────────────────
 * 메모 한 덩어리를 그대로 뿌리면 읽히지 않습니다. 실제 메모는 이런 꼴입니다.
 *   "🚇 이동방법: 신바시역 ➡️ [긴자선] 탑승 / 💰 교통비: 약 210엔 / 7번 출구 도보 4분"
 * 슬래시로 자르되 괄호 안의 슬래시는 건드리지 않습니다.
 * "이동방법:" "교통비:" 처럼 앞에 이름이 붙은 조각은 따로 모읍니다. */
function splitParts(s){
  const raw = String(s).split(/\s+\/\s+/), out = [];
  let buf = '', depth = 0;
  for (const piece of raw){
    buf = buf ? buf + ' / ' + piece : piece;
    depth += (piece.match(/[([]/g) || []).length - (piece.match(/[)\]]/g) || []).length;
    if (depth <= 0){ out.push(buf); buf = ''; depth = 0; }
  }
  if (buf) out.push(buf);
  return out;
}
/* ── 지도 링크 ───────────────────────────────────────────────────────
 * '지도에서 보기'가 **제목만으로 검색**하고 있었습니다
 * (`?api=1&query=아카리조명`). 이름이 같은 가게는 세계에 여럿이라 구글이
 * 아무 곳이나 고릅니다 — 사용자가 "엉뚱한 곳이 나온다"고 한 것이 이것입니다.
 *
 * 그런데 우리는 **더 정확한 것을 이미 둘이나 갖고 있었습니다.**
 *   1. 메모에 붙여넣은 지도 주소 — 사용자가 직접 그 자리를 짚어준 것
 *   2. 좌표(`lat`·`lng`) — 재보니 100개 중 89개에 들어 있는데 한 번도 안 썼습니다
 * 둘 다 버리고 이름으로 검색하고 있었습니다.
 *
 * **순서는 메모의 주소가 먼저입니다.** 좌표는 '좌표 채우기'가 짐작해 넣은
 * 것이고 메모의 주소는 사람이 손으로 짚은 것입니다. 짐작보다 사람이 먼저입니다.
 * 좌표만 있으면 `/@lat,lng,17z` 로 **그 자리를 보면서 이름을 찾게** 합니다 —
 * `query=lat,lng` 로 핀만 찍으면 정확은 해도 가게 정보(영업시간·후기)가
 * 통째로 사라집니다. 이 꼴이면 이름을 못 찾아도 **지도는 옳은 자리**에 섭니다.
 * 둘 다 없으면 이름에 **그 구간의 도시**를 붙입니다 — 그것만으로도 나라를
 * 건너뛰는 일은 없어집니다. */

/* 어느 앱에서 복사했는지는 사용자가 정할 일입니다. 구글·애플·네이버·카카오를
   다 받습니다. 짧은 주소(maps.app.goo.gl)는 우리가 펴볼 수 없으므로 그대로 엽니다 —
   펴보려고 남의 서버에 물어보면 응답이 달라지는 문제가 생깁니다(b265 에서 겪음). */
const MAP_URL = new RegExp('^https?://(?:' + [
  'maps\\.app\\.goo\\.gl', 'goo\\.gl/maps', 'maps\\.google\\.[a-z.]+',
  '(?:www\\.)?google\\.[a-z.]+/maps', 'maps\\.apple\\.com',
  'naver\\.me', '(?:m\\.)?map\\.naver\\.com', 'place\\.map\\.kakao\\.com', 'kko\\.to',
].join('|') + ')(?:[/?]|$)', 'i');

function memoMapUrl(...texts){
  for (const t of texts)
    for (const m of String(t || '').matchAll(/https?:\/\/[^\s<>"']+/g))
      /* 문장 끝의 문장부호가 주소에 딸려 들어옵니다 */
      if (MAP_URL.test(m[0])) return m[0].replace(/[),.;]+$/, '');
  return null;
}

/* 한 줄(일정 또는 후보)에서 '지도에서 보기'·'길찾기' 주소를 만듭니다.
   `city` 는 이름만으로는 어느 나라인지 모를 때 붙일 도시 이름입니다. */
function mapLinks(o, city){
  const geo = o.lat != null && o.lng != null;
  const name = encodeURIComponent(o.title_local || o.title || '');
  const q = encodeURIComponent([o.title_local || o.title, city].filter(Boolean).join(' '));
  const url = memoMapUrl(o.memo, o.move_note);
  const see = url ? url
    : geo ? (name ? `https://www.google.com/maps/search/${name}/@${o.lat},${o.lng},17z`
                  : `https://www.google.com/maps/search/?api=1&query=${o.lat},${o.lng}`)
    : `https://www.google.com/maps/search/?api=1&query=${q}`;
  /* 길찾기는 **목적지를 알아야** 합니다. 짧은 주소로는 알 수 없으므로
     좌표가 있으면 좌표로, 없으면 이름+도시로 갑니다. */
  const go = `https://www.google.com/maps/dir/?api=1&travelmode=transit&destination=${
    geo ? `${o.lat},${o.lng}` : q}`;
  return { see, go };
}

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
/* money/NO_CENTS 는 calc.js 로 옮겼습니다 (맨 위 import) — drawSettle 이
   정산 단위를 고를 때도 같은 NO_CENTS 를 씁니다. */
/* ── 환율 ───────────────────────────────────────────────────────────
 * 유럽중앙은행이 매일 내는 값을 씁니다. 키가 없어도 되고 공개 자료입니다.
 *
 * **쓴 날의 환율을 지출에 못박아 저장합니다.** 볼 때마다 새로 받아오면
 * 오늘 본 사람과 내일 본 사람의 "너 나한테 얼마"가 달라집니다.
 * 정산은 사람마다 같은 숫자가 나와야 합니다.
 *
 * 실패하면 환산을 안 하고 통화별로 나눠 보여줍니다. 틀린 숫자를 내놓느니
 * 안 내놓는 편이 낫습니다. */
/* 기준을 EUR 로 고정합니다.
   from=KRW 로 받으면 EUR 이 0.0006 처럼 네 자리로 잘려 와서 되돌릴 때
   1,667원이 됩니다. 실제는 1,658원 — 0.5% 가 틀어집니다.
   EUR 기준이면 KRW=1657.99 로 제대로 옵니다. */
/* 주소가 api.frankfurter.app 에서 api.frankfurter.dev/v1 로 옮겨갔습니다.
   옛 주소도 301 로 넘겨주긴 하는데 **그 301 응답에 CORS 헤더가 없습니다.**
   브라우저는 리다이렉트를 따라가기 전에 그걸 보고 막아버립니다 — 그래서
   통화와 상관없이 환율이 전부 실패했습니다. 화면에는 "유럽중앙은행이 안 내는
   통화일 수 있다"고 떴는데, GBP 는 당연히 내는 통화입니다. 틀린 진단이었습니다.
   (curl 로는 멀쩡히 보여서 더 헷갈립니다. curl 은 CORS 를 안 봅니다.) */
const FX_API = 'https://api.frankfurter.dev/v1';

/* 왜 실패했는지 부르는 쪽이 알아야 안내를 제대로 씁니다. */
let fxLastFail = '';

async function fxFor(date){
  const key = `t2:fx:${date}`;
  const hit = localStorage.getItem(key);
  if (hit){ try { return JSON.parse(hit); } catch { localStorage.removeItem(key); } }

  /* 아직 환율이 안 나온 날짜(미래·오늘·주말)는 404 입니다. 그럴 땐 최신값을 씁니다. */
  for (const d of [date, 'latest']){
    try {
      const r = await fetch(`${FX_API}/${d}?base=EUR`);
      if (!r.ok) continue;
      const j = await r.json();
      if (!j?.rates) continue;
      const v = { date: j.date, rates: j.rates };
      try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
      fxLastFail = '';
      return v;
    } catch { fxLastFail = 'net'; }   /* 연결 자체가 안 된 것 */
  }
  if (!fxLastFail) fxLastFail = 'net';
  return null;
}

/* 현지 통화 1 = 집 통화 얼마. 못 구하면 null 이고 환산하지 않습니다. */
async function rateOf(cur, home, date){
  if (cur === home) return 1;
  const fx = await fxFor(date);
  if (!fx) return null;
  const at = c => c === 'EUR' ? 1 : fx.rates[c];   /* 기준이 EUR 이라 EUR 은 1 */
  const a = at(cur), b = at(home);
  return (a && b) ? b / a : null;
}

/* 일행 이름. **사람을 가리켜야 합니다.**
   전에는 이름이 없으면 '아직 이름을 안 정했어요' 였습니다. 일행 목록에서는
   말이 되지만 정산의 송금 줄에 들어가면 이렇게 됩니다:

       아직 이름을 안 정했어요 → 첼시꿀  ₩10,000

   **누가 보내야 하는지를 말하는 자리인데 사람을 못 가리킵니다.** 게다가 이름을
   안 정한 사람이 둘이면 줄이 통째로 똑같아져서 구분이 아예 안 됩니다.
   들어온 순서로 번호를 붙입니다 — loadMembers 가 joined_at 으로 정렬하므로
   다시 열어도 같은 사람이 같은 번호입니다.
   **이름을 만드는 곳은 여기 하나뿐입니다** — 일행 목록도 이걸 씁니다.
   전에는 같은 문구가 두 곳에 베껴져 있었습니다. */
const nameOf = id => {
  const i = members.findIndex(x => x.user_id === id);
  if (i < 0) return '알 수 없음';
  const m = members[i];
  return m.nickname || m.profiles?.display_name || `일행 ${i + 1}`;
};

async function loadExpenses(){
  $('experr').classList.add('hide');
  const { data, error } = await netTimeout(sb.from('expenses')
    /* expense_shares 는 "이건 나랑 지훈만" 같은 지출에만 줄이 생깁니다.
       비어 있으면 참여자 균등입니다. 표는 처음부터 있었는데 아무도 안 읽고 있었습니다. */
    .select('id,date,title,amount,currency,amount_home,fx_rate,category,payer_id,memo,' +
            'plan_id,expense_shares(user_id,weight)')
    .eq('trip_id', trip.id)
    .is('deleted_at', null)
    .order('date', { ascending:false }).order('created_at', { ascending:false }));
  if (error){
    if (isOffline(error)){ offNote('expenses'); $('exptotal').innerHTML = ''; drawOffbar(); return; }
    $('expenses').innerHTML = ''; return fail(error, 'exp'); }
  setExpenses(data);
  drawExpenses();
  drawSettle();
  /* **일정 줄이 지출을 씁니다**(plan_id 로 붙은 금액). 둘은 같이 출발해서
     어느 쪽이 먼저 올지 모르므로, 지출이 늦게 오면 일정을 다시 그립니다.
     안 그러면 여행을 연 첫 화면에서만 금액이 안 붙어 있습니다. */
  if ((plans || []).length) drawPlans();
}

function drawExpenses(){
  if (!expenses.length){
    $('exptotal').innerHTML = '';
    $('expenses').innerHTML = emptyDo('아직 지출이 없어요.', '첫 지출 넣기', 'addexpbtn');
    return;
  }
  const byCur = {};
  for (const e of expenses) byCur[e.currency] = (byCur[e.currency] || 0) + Number(e.amount);
  const detail = Object.entries(byCur).map(([c, v]) => money(v, c)).join(' · ');

  /* 환산된 것만 합칩니다. 못 구한 환율을 짐작해 채우면 틀린 총액이 나옵니다. */
  const done = expenses.filter(e => e.amount_home != null);
  const missing = expenses.length - done.length;
  const total = done.reduce((s, e) => s + Number(e.amount_home), 0);

  /* 분류별로 얼마나 썼는지. 숫자만 늘어놓으면 어디에 많이 쓴 건지 안 보입니다.
     환산된 것만 셉니다 — 못 구한 환율을 섞으면 비중이 틀립니다. */
  const byCat = {};
  done.forEach(e => {
    const k = e.category || '기타';
    byCat[k] = (byCat[k] || 0) + Number(e.amount_home);
  });
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const bar = total > 0
    ? `<div class="cbar">${cats.map(([k, v]) =>
        `<i class="k-${esc(k)}" style="width:${(v / total * 100).toFixed(2)}%"></i>`).join('')}</div>
       <div class="clegend">${cats.map(([k, v]) =>
        `<span><i class="k-${esc(k)}"></i>${esc(k)}
           <b>${esc(money(v, trip.home_currency))}</b>
           <em>${Math.round(v / total * 100)}%</em></span>`).join('')}</div>`
    : '';

  $('exptotal').innerHTML =
    `<div class="picked" style="margin-bottom:var(--s-sm); display:block">
       <div class="c">모두 합쳐</div>
       ${done.length
         ? `<b style="font-size:calc(21px * var(--ts))">${esc(money(total, trip.home_currency))}</b>`
         : ''}
       <div class="c">${esc(detail)}</div>
       ${missing ? `<div class="c" style="color:var(--bad); margin-top:6px">
            환율을 못 구한 지출 ${missing}건은 합계에서 빠졌어요.
            <button class="ghost" id="fxfill" style="padding:2px 8px; color:var(--primary)">
              환율 채우기</button></div>` : ''}
       ${bar}
     </div>`;
  if (missing) $('fxfill').onclick = fillRates;

  let html = '', last = null;
  for (const e of expenses){
    if (e.date !== last){
      html += `<div class="daysep">${esc(dayLabel(e.date, trip))}</div>`;
      last = e.date;
    }
    const k = e.category ? 'k-' + e.category : '';
    /* 몫이 따로 적힌 지출은 그렇다고 적어줍니다. 안 적으면 정산 숫자만 보고
       왜 나만 많이 나왔는지 알 수가 없습니다. */
    const sh = (e.expense_shares || []).length;
    const sub = [e.payer_id ? nameOf(e.payer_id) + ' 결제' : '결제자 없음',
                 sh ? `${sh}명이 나눠 냄` : null, e.memo]
                .filter(Boolean).join(' · ');
    html += `<div class="plan">
      <span class="kdot ${esc(k)}"></span>
      <div class="body"><b>${esc(e.title)}</b>
        ${e.category ? `<span class="ktag ${esc(k)}">${esc(e.category)}</span>` : ''}
        ${sub ? `<span class="memo">${esc(sub)}</span>` : ''}</div>
      <div class="amt">
        <b>${esc(money(Number(e.amount), e.currency))}</b>
        ${e.currency !== trip.home_currency && e.amount_home != null
          ? `<div class="memo">${
              esc(money(Number(e.amount_home), trip.home_currency))}</div>` : ''}</div>
      ${trip.myRole === 'viewer' ? '' :
        `<button class="ghost" data-xact="del" data-id="${esc(e.id)}"
                 style="color:var(--bad); align-self:start; padding:2px 6px">×</button>`}</div>`;
  }
  $('expenses').innerHTML = html;
}

/* 정산 — 비어 있으면 전원 균등입니다 (문서의 expense_shares 규칙).
   나간 사람도 셈에 넣습니다. 빼면 그 사람이 낸 돈이 갈 곳이 없어집니다.
   집 통화 하나로 정산합니다 — 실제로 "너 나한테 12만원" 하고 보내지,
   유로 따로 프랑 따로 보내지 않습니다. */
/* settleMath 는 calc.js 로 옮겼습니다 (맨 위 import, 그대로 옮겼습니다 — 규칙과
   자투리 처리 설명은 거기 있습니다). b231 에서 __settleCheck 도 그리로 갔습니다 —
   셈과 그 검사가 다른 파일에 있으면 둘은 반드시 어긋납니다. */

function drawSettle(){
  const active = members.filter(m => !m.left_at);
  /* 애매한 것이 하나라도 섞이면 합이 안 맞습니다. 쓸 수 있는 것만 씁니다. */
  const rows    = expenses.filter(e => e.amount_home != null && e.payer_id);
  const noFx    = expenses.filter(e => e.amount_home == null).length;
  const noPayer = expenses.filter(e => e.amount_home != null && !e.payer_id).length;

  if (!rows.length || members.length < 2){
    setSettleOn(false); $('settlecard').classList.add('hide'); return;
  }
  setSettleOn(true);
  $('settlecard').classList.toggle('hide', tab !== 'exp');

  const cur = trip.home_currency;
  /* 화면이 찍는 자리와 같은 단위로 셈해야 숫자끼리 아귀가 맞습니다. */
  const { total, bal, moves } =
    settleMath(rows, active, NO_CENTS.includes(cur) ? 1 : 0.01);

  const skipped = [
    noFx    ? `환율을 못 구한 ${noFx}건` : '',
    noPayer ? `누가 냈는지 안 적은 ${noPayer}건` : '',
  ].filter(Boolean).join(' · ');

  /* .row 로 늘어놓았더니 이름·금액이 다 17px 이라 한 사람이 세 줄을 먹고,
     정작 중요한 "누가 누구에게 얼마"가 스크롤 아래로 밀렸습니다.
     대시보드와 같은 촘촘한 줄(.arow)을 씁니다 — 금액은 자릿수를 맞춰 훑히게. */
  $('settle').innerHTML =
    `<div class="stltop">
       <span class="v">${esc(money(total, cur))}</span>
       <span class="k">${active.length}명이 나눠요</span></div>

     <div class="agrp">누가 얼마</div>
     ${bal.slice().reverse().map(b => `<div class="arow">
        <span class="k"><b>${esc(nameOf(b.id))}</b>
          <span class="m">낸 돈 ${esc(money(b.paid, cur))} ·
               쓴 돈 ${esc(money(b.owed, cur))}</span></span>
        <span class="v" style="color:${b.v >= 0 ? 'var(--ok)' : 'var(--bad)'}">${
          b.v >= 0 ? '+' : '−'}${esc(money(Math.abs(b.v), cur))}</span>
      </div>`).join('')}

     <div class="agrp">이렇게 보내면 끝나요</div>
     ${moves.length
       ? moves.map(m => `<div class="arow stlmove">
            <span class="k"><b>${esc(nameOf(m.from))}</b>
              <span class="ar">→</span> <b>${esc(nameOf(m.to))}</b></span>
            <span class="v">${esc(money(m.v, cur))}</span></div>`).join('')
       : '<div class="empty" style="padding:10px 0">딱 맞아요. 주고받을 것이 없어요.</div>'}

     ${skipped ? `<div class="snote" style="color:var(--bad)">
          ${esc(skipped)}은 이 정산에 안 들어갔어요.</div>` : ''}`;
}

/* 환율이 비어 있는 지출을 그날 환율로 채웁니다.
   과거 날짜는 그날 값을, 아직 안 나온 날짜는 가장 최근 값을 씁니다. */
async function fillRates(){
  const btn = $('fxfill');
  btn.disabled = true; btn.innerHTML = '<span class="load">채우는 중…</span>';
  let ok = 0, fail_ = 0;
  for (const e of expenses.filter(x => x.amount_home == null)){
    const r = await rateOf(e.currency, trip.home_currency, e.date);
    if (r == null){ fail_++; continue; }
    const up = await sb.from('expenses')
      .update({ fx_rate: r, amount_home: Number(e.amount) * r })
      .eq('id', e.id).select('id');
    if (up.error || !up.data?.length) fail_++; else ok++;
  }
  await loadExpenses();
  /* 예전에는 실패하면 무조건 "유럽중앙은행이 안 내는 통화"라고 했습니다.
     실제로는 환율 서비스에 아예 연결이 안 되고 있었는데 그 안내를 보고
     통화 탓을 하게 됩니다. 무엇이 안 됐는지 갈라서 말합니다. */
  if (fail_) fail(fxLastFail === 'net'
    ? `${ok}건을 채웠어요. ${fail_}건은 환율 서비스에 연결하지 못했어요. ` +
      `잠시 뒤 다시 눌러보시고, 계속 안 되면 금액을 직접 적어주세요.`
    : `${ok}건을 채웠어요. ${fail_}건은 환율이 없어요 ` +
      `(유럽중앙은행이 안 내는 통화입니다).`, 'exp');
}

$('addexpbtn').addEventListener('click', () => {
  $('expcard').classList.toggle('hide');
  if ($('expcard').classList.contains('hide')) return;
  /* 통화는 그날 있는 곳이 기본입니다. 구간마다 나라가 다르면 통화도 다릅니다.
     집 통화도 함께 둡니다 — 한국에서 미리 결제한 것들 때문입니다. */
  const curs = [...new Set([...legs.map(l => l.currency),
                            trip.currency, trip.home_currency, 'USD', 'EUR'])];
  $('x_cur').innerHTML = curs.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  $('x_payer').innerHTML = members.map(m =>
    `<option value="${esc(m.user_id)}"${m.user_id === me.id ? ' selected' : ''}>` +
    `${esc(nameOf(m.user_id))}${m.left_at ? ' (탈퇴함)' : ''}</option>`).join('') +
    `<option value="">공동 (결제자 없음)</option>`;
  $('x_date').value = pickedDay || todayYmd();
  drawExpPlans();
  drawShareChips();
  syncExpCur();
  $('x_title').focus();
});

/* ── 지출을 일정에 붙이기 ───────────────────────────────────────────
 * `expenses.plan_id` 는 **처음부터 표에 있었는데 채울 길이 없었습니다**
 * (001_schema 439줄). expense_shares 와 같은 경우입니다.
 *
 * 붙여두면 일정 줄에서 그날 그 자리에 얼마 썼는지가 바로 보입니다 —
 * 지출 탭으로 건너가 제목을 눈으로 짝지을 일이 없어집니다.
 *
 * **고른 날의 일정만 내놓습니다.** 11일치를 다 늘어놓으면 고를 수가 없고,
 * 다른 날 일정에 붙으면 그 줄의 합계가 엉뚱해집니다.
 * 날짜를 바꾸면 목록도 따라 바뀝니다 — 안 그러면 8/14 일정을 고른 채로
 * 날짜만 8/16 으로 바꿔 저장하는 일이 생깁니다. */
function drawExpPlans(){
  const d = $('x_date').value;
  const list = (plans || []).filter(p => p.date === d);
  const keep = $('x_plan').value;
  $('x_plan').innerHTML = '<option value="">안 고름</option>' +
    list.map(p => `<option value="${esc(p.id)}">${
      p.start_time ? esc(hm(p.start_time)) + ' · ' : ''}${esc(p.title)}</option>`).join('');
  /* 날짜가 그대로면 고른 것을 지키고, 바뀌었으면 저절로 '안 고름'이 됩니다. */
  if (keep && list.some(p => p.id === keep)) $('x_plan').value = keep;
  const none = !list.length;
  $('x_plan').disabled = none;
  $('x_plan').previousElementSibling.textContent =
    none ? '어디서 (이 날은 일정이 없어요)' : '어디서 (선택)';
}
$('x_date').addEventListener('change', drawExpPlans);

/* ── 누가 나눠 내나 ─────────────────────────────────────────────────
 * expense_shares 표는 처음부터 있었는데 채울 길이 없었습니다. 여기가 그 길입니다.
 * 처음에는 전원이 켜져 있습니다 — 대부분은 손댈 일이 없고, 손대지 않으면
 * 아무 줄도 안 만들어 균등으로 둡니다. 있는 그대로가 기본값입니다.
 * 혼자 가는 여행에서는 아예 안 보여줍니다. */
function drawShareChips(){
  const active = members.filter(m => !m.left_at);
  $('x_sharebox').classList.toggle('hide', active.length < 2);
  $('x_shares').innerHTML = active.map(m =>
    `<button class="day on" data-share="${esc(m.user_id)}">${esc(nameOf(m.user_id))}</button>`
  ).join('');
}
$('x_shares').addEventListener('click', e => {
  const b = e.target.closest('[data-share]'); if (!b) return;
  b.classList.toggle('on');
  /* 아무도 없으면 나눌 수가 없습니다. 마지막 하나는 못 끄게 합니다. */
  if (!$('x_shares').querySelector('.on')){
    b.classList.add('on');
    toast('적어도 한 명은 있어야 해요.');
  }
});
const pickedShares = () =>
  [...$('x_shares').querySelectorAll('[data-share].on')].map(b => b.dataset.share);
/* 날짜를 바꾸면 그날 있는 곳의 통화로 맞춥니다. */
function syncExpCur(){
  const l = legFor($('x_date').value);
  if (l) $('x_cur').value = l.currency;
}
$('x_date').addEventListener('change', syncExpCur);
$('x_cancel').addEventListener('click', () => {
  $('expcard').classList.add('hide'); $('expformerr').classList.add('hide');
});

$('x_create').addEventListener('click', async () => {
  const btn = $('x_create');
  $('expformerr').classList.add('hide');
  const title = $('x_title').value.trim();
  /* 12,000 처럼 쉼표를 넣는 사람이 많습니다. 그대로 받으면 NaN 이 됩니다. */
  const amount = Number($('x_amount').value.replace(/[,\s]/g, ''));
  const date = $('x_date').value;

  if (!title)                    return fail('무엇에 썼는지 적어주세요.', 'expform');
  if (!isFinite(amount) || amount <= 0)
                                 return fail('금액을 숫자로 적어주세요.', 'expform');
  if (!date)                     return fail('날짜를 골라주세요.', 'expform');

  btn.disabled = true; btn.innerHTML = '<span class="load">넣는 중…</span>';
  /* 쓴 날 환율을 여기서 못박습니다. 나중에 볼 때마다 새로 받아오면
     사람마다 정산 금액이 달라집니다. */
  const cur = $('x_cur').value;
  const rate = await rateOf(cur, trip.home_currency, date);

  const r = await write({ table:'expenses', action:'insert', row:{
    trip_id: trip.id, title, amount, date, currency: cur,
    fx_rate: rate, amount_home: rate == null ? null : amount * rate,
    category: $('x_cat').value || null,
    plan_id: $('x_plan').value || null,
    payer_id: $('x_payer').value || null,
    memo: $('x_memo').value.trim() || null
  }});
  btn.disabled = false; btn.textContent = '넣기';

  if (!r.ok) return fail(r.why, 'expform');

  /* 몫을 손대지 않았으면(전원 켜짐) 아무 줄도 안 만듭니다 — 그게 곧 균등입니다.
     줄을 만들어 두면 나중에 일행이 늘었을 때 그 사람이 빠집니다. */
  const active = members.filter(m => !m.left_at);
  const picked = $('x_sharebox').classList.contains('hide') ? [] : pickedShares();
  const partial = picked.length && picked.length < active.length;

  $('x_title').value = ''; $('x_amount').value = ''; $('x_memo').value = '';
  $('expcard').classList.add('hide');

  if (r.queued){
    /* 큐에 쌓인 지출은 아직 id 가 없어서 몫을 붙일 수가 없습니다.
       조용히 균등으로 두면 나중에 정산이 틀립니다. 그래서 말합니다. */
    return toast(partial
      ? '연결이 없어 들고 있어요. 나눠 낼 사람은 연결된 뒤 다시 지정해주세요.'
      : '연결이 없어 들고 있어요. 터지면 바로 보냅니다.');
  }
  if (partial && r.id){
    const sh = await sb.from('expense_shares')
      .insert(picked.map(uid => ({ expense_id: r.id, user_id: uid, weight: 1 })))
      .select('user_id');
    if (sh.error) fail(sh.error, 'exp');
  }
  await loadExpenses();
});

$('expenses').addEventListener('click', async e => {
  const b = e.target.closest('button[data-xact]'); if (!b) return;
  if (b.dataset.armed !== '1'){
    arm(b, '정말 지울까요?'); return;
  }
  b.disabled = true;
  const r = await write({ table:'expenses', action:'delete', id: b.dataset.id });
  b.disabled = false;
  if (!r.ok) return fail(r.why, 'exp');
  if (r.queued){ b.closest('.plan, .ev')?.remove(); return toast('연결이 없어 들고 있어요.'); }
  await loadExpenses();
});

/* ── 예약 ───────────────────────────────────────────────────────────
 * 여행 중에 제일 자주 열어보는 것입니다 — 항공편 번호, 숙소 예약번호.
 * 읽기 전용 공유 링크에는 절대 안 나갑니다 (get_shared_trip 에 아예 없습니다). */
const KIND_K = { 항공:'이동', 기차:'이동', 렌터카:'이동', 숙소:'숙소',
                 식당:'식사', 티켓:'관광', 기타:'기타' };

async function loadBookings(){
  $('bookerr').classList.add('hide');
  let { data, error } = await netTimeout(sb.from('bookings')
    .select('id,kind,title,ref,start_date,start_time,end_date,end_time,address,tel,memo')
    .eq('trip_id', trip.id).is('deleted_at', null)
    .order('start_date', { nullsFirst:false }).order('start_time', { nullsFirst:false }));
  /* 항공편 번호와 호텔 예약번호는 **여행 중에 제일 자주 여는 것**입니다.
     공항에서 연결이 안 된다고 못 보면 그때가 제일 곤란합니다. 받아둡니다. */
  const bck = 'book:' + trip.id;
  if (error){
    const old = cacheGet(bck);
    if (!old){ offNote('bookings'); drawOffbar(); return; }
    setBookings(old); drawOffbar();
  } else { cacheSet(bck, data); setBookings(data); }
  data = bookings;

  $('bookings').innerHTML = data.length ? data.map(b => {
    const k = 'k-' + (KIND_K[b.kind] || '기타');
    const when = [b.start_date, hm(b.start_time)].filter(Boolean).join(' ') +
      (b.end_date && b.end_date !== b.start_date
        ? ' ~ ' + b.end_date + (b.end_time ? ' ' + hm(b.end_time) : '')
        : b.end_time ? '~' + hm(b.end_time) : '');
    const sub = [when, b.address, b.tel, b.memo].filter(Boolean).join(' · ');
    return `<div class="plan">
      <span class="kdot ${esc(k)}"></span>
      <div class="body"><b>${esc(b.title)}</b>
        <span class="ktag ${esc(k)}">${esc(b.kind)}</span>
        ${b.ref ? `<span class="refno">${esc(b.ref)}</span>` : ''}
        ${sub ? `<span class="memo">${esc(sub)}</span>` : ''}</div>
      ${trip.myRole === 'viewer' ? '' :
        `<button class="ghost" data-bact="del" data-id="${esc(b.id)}"
                 style="color:var(--bad); align-self:start; padding:2px 6px">×</button>`}</div>`;
  }).join('') : '<div class="empty">항공권·숙소 예약을 넣어두면 여행 중에 찾기 쉬워요.</div>';
}

/* ── 여행 서류 ──────────────────────────────────────────────────────
 * 공항 카운터·호텔 프런트에서 여는 화면입니다. **이미 받아둔 예약만
 * 그립니다** — 여기서 새로 질의하면 로밍이 안 되는 그 순간에 빈 화면이
 * 됩니다. 예약은 `loadBookings` 가 `book:<여행>` 으로 담아두므로
 * 비행기모드에서 앱을 켜도 그대로 나옵니다.
 *
 * 준비 탭 목록과 **같은 자료를 다르게 보여줍니다.** 목록은 훑는 것이고
 * 여기는 한 건을 보여주는 것입니다 — 그래서 예약번호가 제일 큽니다. */
const DOC_LABEL = { 항공:'항공권', 숙소:'숙소', 식당:'식당', 티켓:'티켓', 기타:'예약' };

function drawDocs(){
  const list = bookings || [];
  $('docsub').textContent = list.length ? `${list.length}건 · 연결 없이도 보여요`
                                        : '연결 없이도 보여요';
  if (!list.length){
    $('docs').innerHTML =
      '<div class="empty">넣어둔 예약이 없어요. 준비 탭에서 항공권·숙소를 넣어두면 ' +
      '공항에서 연결이 안 돼도 여기서 볼 수 있어요.</div>';
    return;
  }
  const 줄 = (k, v, href) => v
    ? `<div class="dl"><b>${esc(k)}</b><span>${
        href ? `<a href="${esc(href)}">${esc(v)}</a>` : esc(v)}</span></div>` : '';

  $('docs').innerHTML = list.map(b => {
    /* 날짜와 시각을 한 줄로 붙이면 훑을 때는 편한데 확인할 때는 어디가
       시작이고 끝인지 헷갈립니다. 여기서는 갈라 적습니다. */
    const 시작 = [b.start_date, hm(b.start_time)].filter(Boolean).join(' ');
    const 끝   = [b.end_date, hm(b.end_time)].filter(Boolean).join(' ');
    return `<div class="doccard">
      <div class="dk">${esc(DOC_LABEL[b.kind] || b.kind)}</div>
      <div class="dt">${esc(b.title)}</div>
      ${b.ref ? `<button class="dref" data-copy="${esc(b.ref)}">${esc(b.ref)}</button>` : ''}
      ${줄(b.kind === '숙소' ? '체크인' : '시작', 시작)}
      ${끝 && 끝 !== 시작 ? 줄(b.kind === '숙소' ? '체크아웃' : '끝', 끝) : ''}
      ${줄('주소', b.address)}
      ${줄('전화', b.tel, b.tel ? 'tel:' + String(b.tel).replace(/[^\d+]/g, '') : '')}
      ${줄('메모', b.memo)}
    </div>`;
  }).join('');
}

function openDocs(){
  $('docview').classList.remove('hide');
  scrollTo(0, 0);
  if (history.state?.t2 !== 'docs') history.pushState({ t2:'docs' }, '');
  drawDocs();
}
function closeDocs(fromPop){
  if (!fromPop && history.state?.t2 === 'docs'){ history.back(); return; }
  $('docview').classList.add('hide');
}
$('docbtn').addEventListener('click', openDocs);
$('docback').addEventListener('click', () => closeDocs());

/* 예약번호는 옮겨 적다 틀리는 자리입니다. 눌러서 베낍니다. */
$('docs').addEventListener('click', async e => {
  const b = e.target.closest('[data-copy]'); if (!b) return;
  try { await navigator.clipboard.writeText(b.dataset.copy); toast('예약번호를 베꼈어요'); }
  catch { toast('길게 눌러서 복사해 주세요'); }
});

$('addbookbtn').addEventListener('click', () => {
  $('bookcard').classList.toggle('hide');
  if ($('bookcard').classList.contains('hide')) return;
  if (!$('b_sdate').value) $('b_sdate').value = trip.start_date;
  $('b_title').focus();
});
$('b_cancel').addEventListener('click', () => {
  $('bookcard').classList.add('hide'); $('bookformerr').classList.add('hide');
});

$('b_create').addEventListener('click', async () => {
  const btn = $('b_create');
  $('bookformerr').classList.add('hide');
  const title = $('b_title').value.trim();
  if (!title) return fail('무엇을 예약했는지 적어주세요.', 'bookform');

  btn.disabled = true; btn.innerHTML = '<span class="load">넣는 중…</span>';
  const { data, error } = await sb.from('bookings').insert({
    trip_id: trip.id, kind: $('b_kind').value, title,
    ref: $('b_ref').value.trim() || null,
    start_date: $('b_sdate').value || null, start_time: $('b_stime').value || null,
    end_date: $('b_edate').value || null,   end_time: $('b_etime').value || null,
    address: $('b_addr').value.trim() || null,
    tel: $('b_tel').value.trim() || null,
    memo: $('b_memo').value.trim() || null,
  }).select('id');
  btn.disabled = false; btn.textContent = '넣기';
  if (error) return fail(error, 'bookform');
  if (!data?.length) return fail(NOROW.save, 'bookform');

  ['b_title','b_ref','b_addr','b_tel','b_memo','b_stime','b_etime','b_edate']
    .forEach(id => $(id).value = '');
  $('bookcard').classList.add('hide');
  await loadBookings();
});

$('bookings').addEventListener('click', e => softDel(e, 'bact', 'bookings', loadBookings, 'book'));

/* ── 준비물 ─────────────────────────────────────────────────────────
 * 담당을 참여자와 이어야 "내가 챙길 것"만 볼 수 있습니다.
 * 도쿄 앱은 문자열이라 그게 안 됐습니다. */
async function loadPacking(){
  $('packerr').classList.add('hide');
  let { data, error } = await netTimeout(sb.from('packing')
    .select('id,title,done,assignee_id,category')
    .eq('trip_id', trip.id).is('deleted_at', null)
    .order('sort_order').order('created_at'));
  const pck = 'pack:' + trip.id;
  if (error){
    const old = cacheGet(pck);
    if (!old){ offNote('packing'); $('packcount').textContent = ''; drawOffbar(); return; }
    data = old; drawOffbar();
  } else cacheSet(pck, data);

  const done = data.filter(p => p.done).length;
  $('packcount').textContent = data.length ? `${done}/${data.length}` : '';
  /* 다 채우는 맛이 있어야 계속 씁니다. */
  $('packbar').classList.toggle('hide', !data.length);
  $('packbar').firstElementChild.style.width =
    data.length ? (done / data.length * 100).toFixed(1) + '%' : '0%';

  $('k_who').innerHTML = `<option value="">담당 없음</option>` + members
    .filter(m => !m.left_at)
    .map(m => `<option value="${esc(m.user_id)}">${esc(nameOf(m.user_id))}</option>`).join('');
  if (!$('k_cat').options.length)
    $('k_cat').innerHTML = PACK_CATS.map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('');

  /* 빈 목록에서 하나씩 적기 시작하는 것이 제일 귀찮습니다. */
  $('k_seed').classList.toggle('hide', data.length > 0 || trip.myRole === 'viewer');

  /* 분류로 묶습니다. 스무 개가 한 줄로 늘어서면 뭘 챙겼는지 안 보입니다.
     칸은 처음부터 있었는데 화면이 안 쓰고 있었습니다. */
  const g = {};
  data.forEach(p => (g[p.category || '기타'] = g[p.category || '기타'] || []).push(p));
  const order = PACK_CATS.filter(k => g[k])
    .concat(Object.keys(g).filter(k => !PACK_CATS.includes(k)));

  $('packing').innerHTML = data.length
    ? order.map(k => `<div class="daysep">${esc(k)}
         <span class="dstat">${g[k].filter(p => p.done).length}/${g[k].length}</span></div>` +
        g[k].map(p =>
          `<div class="row"><input type="checkbox" data-pk="${esc(p.id)}"
              ${p.done ? 'checked' : ''} ${trip.myRole === 'viewer' ? 'disabled' : ''}
              style="width:auto; flex:none; margin:0">
            <span class="label"${p.done ? ' style="opacity:.45; text-decoration:line-through"' : ''}>
              ${esc(p.title)}</span>
            ${p.assignee_id ? `<span class="badge">${esc(nameOf(p.assignee_id))}</span>` : ''}
            ${trip.myRole === 'viewer' ? '' :
              `<button class="ghost" data-kact="del" data-id="${esc(p.id)}"
                       style="color:var(--bad); padding:2px 6px">×</button>`}</div>`).join('')
      ).join('')
    : '<div class="empty">챙길 것을 적어두세요.</div>';
}

/* 분류는 짐 싸는 순서대로 둡니다 — 없으면 못 가는 것부터. */
const PACK_CATS = ['서류', '전자기기', '옷', '세면·약', '기타'];
/* 어느 여행에나 해당하는 것만 넣습니다. 나라별로 다른 것(어댑터 모양 같은)은
   AI 에게 물어보는 편이 낫습니다. */
const PACK_SEED = [
  ['서류', ['여권', '항공권 · 탑승권', '숙소 예약 확인서', '여행자보험', '해외 되는 카드']],
  ['전자기기', ['휴대폰 충전기', '보조배터리', '멀티 어댑터', '이어폰']],
  ['옷', ['속옷 · 양말', '잠옷', '겉옷', '편한 신발']],
  ['세면·약', ['세면도구', '상비약', '자외선 차단제']],
];

$('k_seed').addEventListener('click', async () => {
  const b = $('k_seed');
  b.disabled = true; b.innerHTML = '<span class="load">넣는 중…</span>';
  const rows = PACK_SEED.flatMap(([cat, items], gi) =>
    items.map((title, i) => ({ trip_id: trip.id, category: cat, title,
                               sort_order: gi * 100 + i })));
  const r = await sb.from('packing').insert(rows).select('id');
  b.disabled = false; b.textContent = '기본 준비물 한 번에 넣기';
  if (r.error) return fail(r.error, 'pack');
  if (!r.data?.length) return fail(NOROW.save, 'pack');
  toast(`${r.data.length}개를 넣었어요`);
  await loadPacking();
});

$('k_add').addEventListener('click', async () => {
  const t = $('k_title').value.trim();
  if (!t) return;
  $('packerr').classList.add('hide');
  $('k_add').disabled = true;
  const { data, error } = await sb.from('packing').insert({
    trip_id: trip.id, title: t, assignee_id: $('k_who').value || null,
    category: $('k_cat').value || null,
  }).select('id');
  $('k_add').disabled = false;
  if (error) return fail(error, 'pack');
  if (!data?.length) return fail(NOROW.save, 'pack');
  $('k_title').value = '';
  await loadPacking();
});
$('k_title').addEventListener('keydown', e => {
  if (e.key === 'Enter'){ e.preventDefault(); $('k_add').click(); }
});
$('packing').addEventListener('change', async e => {
  const c = e.target.closest('input[data-pk]'); if (!c) return;
  const r = await sb.from('packing').update({ done: c.checked })
    .eq('id', c.dataset.pk).select('id');
  if (r.error){ c.checked = !c.checked; return fail(r.error, 'pack'); }
  await loadPacking();
});
$('packing').addEventListener('click', e => softDel(e, 'kact', 'packing', loadPacking, 'pack'));

/* ── 링크 ── 예약 확인 페이지, 블로그, 지도 같은 것 */
async function loadLinks(){
  $('linkerr').classList.add('hide');
  let { data, error } = await netTimeout(sb.from('links')
    .select('id,title,url,category').eq('trip_id', trip.id)
    .is('deleted_at', null).order('created_at'));
  const lck = 'link:' + trip.id;
  if (error){
    const old = cacheGet(lck);
    if (!old){ offNote('links'); drawOffbar(); return; }
    data = old; drawOffbar();
  } else cacheSet(lck, data);
  $('links').innerHTML = data.length ? data.map(l =>
    `<div class="row"><span class="label">
        <a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"
           style="color:var(--primary)"><b>${esc(l.title)}</b></a>
        <div class="memo" style="word-break:break-all">${esc(l.url)}</div></span>
      ${trip.myRole === 'viewer' ? '' :
        `<button class="ghost" data-lkact="del" data-id="${esc(l.id)}"
                 style="color:var(--bad); padding:2px 6px">×</button>`}</div>`).join('')
    : '<div class="empty">예약 확인 페이지나 블로그를 담아두세요.</div>';
}

$('l_add').addEventListener('click', async () => {
  const t = $('l_title').value.trim(), u = $('l_url').value.trim();
  $('linkerr').classList.add('hide');
  if (!u) return fail('주소를 넣어주세요.', 'link');
  /* http 없이 붙여넣는 일이 많습니다. 그대로 두면 앱 안 경로로 열립니다. */
  const url = /^https?:\/\//i.test(u) ? u : 'https://' + u;
  $('l_add').disabled = true;
  const { data, error } = await sb.from('links')
    .insert({ trip_id: trip.id, title: t || url, url }).select('id');
  $('l_add').disabled = false;
  if (error) return fail(error, 'link');
  if (!data?.length) return fail(NOROW.save, 'link');
  $('l_title').value = ''; $('l_url').value = '';
  await loadLinks();
});
$('l_url').addEventListener('keydown', e => {
  if (e.key === 'Enter'){ e.preventDefault(); $('l_add').click(); }
});
$('links').addEventListener('click', e => softDel(e, 'lkact', 'links', loadLinks, 'link'));

/* 세 곳이 지우는 방식이 같습니다. 한 번 묻고, 진짜로 안 지우고 숨깁니다. */
async function softDel(e, attr, table, reload, errBox){
  const b = e.target.closest(`button[data-${attr}]`); if (!b) return;
  if (b.dataset.armed !== '1'){
    arm(b, '정말 지울까요?'); return;
  }
  b.disabled = true;
  const r = await sb.from(table).update({ deleted_at: new Date().toISOString() })
    .eq('id', b.dataset.id).select('id');
  b.disabled = false;
  if (r.error) return fail(r.error, errBox);
  if (!r.data?.length) return fail(NOROW.edit, errBox);
  await reload();
}

/* ── 일행 ───────────────────────────────────────────────────────── */
/* 화면에는 한국어만 씁니다. 여행 목록 배지가 'OWNER' 로 떠 있었습니다. */
/* 권한 이름은 여기 하나로 정합니다. 전에는 배지가 '편집'인데 바로 옆
   드롭다운은 '편집자'였고, owner 는 배지에서 '호스트'인데 오류 문구에서는
   '소유자'였습니다. 같은 사람을 두 이름으로 부르면 사용자가 헷갈립니다. */
const ROLE_KO = { owner:'만든 사람', editor:'편집자', viewer:'보기만' };

async function loadMembers(){
  $('memerr').classList.add('hide');
  const { data, error } = await netTimeout(sb.from('trip_members')
    .select('user_id,role,nickname,left_at,joined_at,profiles(display_name,avatar_url)')
    .eq('trip_id', trip.id)
    .order('joined_at'));
  if (error){
    if (isOffline(error)){ offNote('members'); drawOffbar(); return; }
    $('members').innerHTML = ''; return fail(error, 'mem'); }
  setMembers(data);

  const owner = trip.myRole === 'owner';
  $('members').innerHTML = data.map(m => {
    const p = m.profiles || {};
    /* 위 nameOf 하나만 씁니다 — 여기 따로 적으면 정산과 일행 목록에서
       같은 사람이 다른 이름으로 보입니다. */
    const name = nameOf(m.user_id);
    const self = m.user_id === me.id;
    const gone = !!m.left_at;
    /* 나간 사람도 지웁니다가 아니라 남깁니다 — 빼면 정산이 어긋납니다. */
    const tag = gone ? '<span class="badge">탈퇴함</span>'
                     : `<span class="badge">${esc(ROLE_KO[m.role] || m.role)}</span>`;
    /* 소유자만 남의 권한을 바꾸거나 내보냅니다. 자기 자신은 못 건드립니다. */
    const admin = (owner && !self && !gone)
      ? `<select data-mrole="${esc(m.user_id)}" style="width:auto; padding:4px 8px;
                 font-size:calc(12px * var(--ts))">
           <option value="editor"${m.role === 'editor' ? ' selected' : ''}>편집자</option>
           <option value="viewer"${m.role === 'viewer' ? ' selected' : ''}>보기만</option>
         </select>
         <!-- '내보내기'라고 적혀 있었습니다. 그 말은 보통 자료를 파일로
              빼는 것을 뜻하고, 이 앱에도 '내려받기'가 따로 있습니다.
              사람을 여행에서 빼는 되돌리기 어려운 동작이라 헷갈리면 안 됩니다. -->
         <button class="ghost" data-mact="kick" data-id="${esc(m.user_id)}"
                 data-name="${esc(name)}" style="color:var(--bad)">일행에서 빼기</button>`
      : '';
    const mine = self && !gone
      ? `<button class="ghost" data-mact="nick" data-nick="${esc(m.nickname || '')}">별명</button>`
      : '';
    return `<div class="trip" style="cursor:default">
      ${avatarImg(p.avatar_url, m.user_id, name,
                  'width:32px;height:32px;border-radius:50%;object-fit:cover;flex:none')}
      <div class="t"><b style="${gone ? 'opacity:.5' : ''}">${esc(name)}${self ? ' (나)' : ''}</b>
        <div style="margin-top:2px">${mine}${admin}</div></div>${tag}</div>`;
  }).join('');

  /* 초대는 소유자만 만듭니다. */
  $('invbtn').classList.toggle('hide', !owner);
}

$('invbtn').addEventListener('click', () => {
  $('invitebox').classList.toggle('hide');
  $('i_result').classList.add('hide');
  if (!$('invitebox').classList.contains('hide')) drawInvites();
});
$('i_cancel').addEventListener('click', () => $('invitebox').classList.add('hide'));

/* ── 만들어 둔 초대 링크 ─────────────────────────────────────────────
 * 링크는 한 번 만들면 14일간 살아 있고 스무 번까지 쓰입니다.
 * 그런데 만들고 나면 화면에서 사라져서, 단톡방에 흘린 링크를 거둘 길이 없었습니다.
 * 여기 늘어놓고 지울 수 있게 합니다. 지우면 그 링크로는 못 들어옵니다. */
async function drawInvites(){
  const { data, error } = await sb.from('trip_invites')
    .select('code,role,expires_at,max_uses,uses')
    .eq('trip_id', trip.id).order('created_at', { ascending:false });
  if (error) return fail(error, 'mem');

  const now = new Date();
  const live = (data || []).filter(i => new Date(i.expires_at) > now && i.uses < i.max_uses);
  const dead = (data || []).length - live.length;

  $('i_list').innerHTML = live.length
    ? `<div class="daysep">살아 있는 링크</div>` + live.map(i => {
        const days = Math.max(0, Math.ceil((new Date(i.expires_at) - now) / 86400000));
        return `<div class="row">
          <span class="label"><b style="font-family:ui-monospace,monospace">${esc(i.code)}</b>
            <div class="memo">${esc(ROLE_KO[i.role] || i.role)} ·
              ${i.uses}/${i.max_uses}명 · ${days}일 남음</div></span>
          <button class="ghost" data-ikill="${esc(i.code)}"
                  style="color:var(--bad)">지우기</button></div>`;
      }).join('') +
      (dead ? `<div class="memo" style="padding-top:8px">만료됐거나 다 쓴 링크 ${dead}개는
                 이미 못 씁니다.</div>` : '')
    : (data || []).length
      ? `<div class="memo">만들어 둔 링크가 다 만료됐어요.</div>` : '';
}

$('i_list').addEventListener('click', async e => {
  const b = e.target.closest('[data-ikill]'); if (!b) return;
  if (b.dataset.armed !== '1'){ arm(b, '정말 지울까요?'); return; }
  b.disabled = true;
  const r = await sb.from('trip_invites').delete()
    .eq('code', b.dataset.ikill).select('code');
  b.disabled = false;
  if (r.error) return fail(r.error, 'mem');
  if (!r.data?.length) return fail('일행에서 빼지 못했어요. 만든 사람만 뺄 수 있어요.', 'mem');
  toast('그 링크로는 이제 못 들어와요.');
  drawInvites();
});

$('i_make').addEventListener('click', async () => {
  const btn = $('i_make');
  $('memerr').classList.add('hide');
  btn.disabled = true; btn.innerHTML = '<span class="load">만드는 중…</span>';
  const { data, error } = await sb.from('trip_invites')
    .insert({ trip_id: trip.id, role: $('i_role').value })
    .select('code').maybeSingle();
  btn.disabled = false; btn.textContent = '초대 링크 만들기';
  if (error) return fail(error, 'mem');
  if (!data)  return fail('초대 링크를 만들지 못했어요. 만든 사람만 만들 수 있어요.', 'mem');

  const link = JOIN_URL + '?c=' + data.code;
  $('i_link').textContent = link;
  $('i_result').classList.remove('hide');
  /* 공유 시트를 열 수 있는 기기에서만 보내기 버튼을 답니다.
     없는데 눌러 놓으면 아무 일도 안 일어나 고장으로 보입니다. */
  $('i_share').classList.toggle('hide', !navigator.share);
  drawInvites();
});

$('i_share').addEventListener('click', async () => {
  /* 복사해서 어디에 붙이라고 하는 것보다 쓰던 메신저로 바로 보내는 편이 빠릅니다. */
  const url = $('i_link').textContent;
  /* **`url` 을 따로 주면 카톡이 우리 글을 버립니다.** URL 이 있으면 메신저는
     보낸 사람의 글 대신 제 미리보기 카드만 만듭니다 — 그래서 받는 사람 화면에
     "기로 / 여기를 눌러 링크를 확인하세요" 만 떴고, **무슨 여행인지 알 수가
     없었습니다.** 주소를 글 안에 넣고 url 은 안 줍니다. 그러면 메신저는 이걸
     그냥 글로 받아 그대로 보여주고, 주소는 알아서 링크가 됩니다.
     (미리보기 카드는 여전히 뜨는데, 그 내용은 index.html 의 og: 태그입니다.) */
  const text = `${trip.title} 같이 가실까요?\n` +
               `${trip.destination} · ${dateRange(trip.start_date, trip.end_date)}\n` +
               `아래 링크로 들어오면 일정을 같이 볼 수 있어요.\n${url}`;
  try {
    await navigator.share({ title: `${trip.title} 같이 가요`, text });
  } catch {}   /* 취소를 누르면 거절로 옵니다. 오류가 아닙니다. */
});

/* 복사는 두 번 시도합니다.
   navigator.clipboard 는 내장 브라우저나 iframe 에서 막히는 일이 있는데,
   그럴 때 옛 execCommand 방식은 대개 통합니다. 한 번 실패했다고 포기하면
   사용자가 손으로 긁어야 합니다. */
/* copyText 는 dom.js 로 옮겼습니다 (맨 위 import) — admin.js 도 씁니다. */

$('i_copy').addEventListener('click', async () => {
  const ok = await copyText($('i_link').textContent);
  $('i_copy').textContent = ok ? '복사했어요' : '아래 글자를 복사하세요';
  if (!ok){
    /* 둘 다 막혔으면 최소한 긁어는 놓습니다. 그대로 Ctrl+C 면 됩니다. */
    const r = document.createRange(); r.selectNodeContents($('i_link'));
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  setTimeout(() => { $('i_copy').textContent = '복사'; }, 2000);
});

$('members').addEventListener('click', async e => {
  const b = e.target.closest('button[data-mact]'); if (!b) return;

  /* prompt 도 confirm 과 같이 내장 브라우저에서 막힙니다. 화면 안에서 받습니다. */
  if (b.dataset.mact === 'nick'){
    b.outerHTML =
      `<input id="nickin" value="${esc(b.dataset.nick)}" maxlength="20"
              placeholder="비우면 계정 이름" style="width:auto; max-width:160px;
              padding:4px 10px; font-size:calc(12px * var(--ts))">
       <button class="ghost" data-mact="nicksave">저장</button>`;
    $('nickin').focus();
    return;
  }
  if (b.dataset.mact === 'nicksave'){
    b.disabled = true;
    const r = await sb.from('trip_members')
      .update({ nickname: $('nickin').value.trim() || null })
      .eq('trip_id', trip.id).eq('user_id', me.id).select('user_id');
    b.disabled = false;
    if (r.error) return fail(r.error, 'mem');
    return loadMembers();
  }

  if (b.dataset.mact === 'kick'){
    if (b.dataset.armed !== '1'){       /* 확인창을 안 쓰는 이유는 앞과 같습니다 */
      arm(b, `정말 ${b.dataset.name} 빼기?`); return;
    }
    b.disabled = true;
    /* 지우지 않고 나간 것으로 표시합니다. 지출에 이름이 남아야 정산이 맞습니다. */
    const r = await sb.from('trip_members')
      .update({ left_at: new Date().toISOString() })
      .eq('trip_id', trip.id).eq('user_id', b.dataset.id).select('user_id');
    b.disabled = false;
    if (r.error) return fail(r.error, 'mem');
    if (!r.data?.length) return fail(NOROW.edit, 'mem');
    return loadMembers();
  }
});

$('members').addEventListener('change', async e => {
  const s = e.target.closest('select[data-mrole]'); if (!s) return;
  const r = await sb.from('trip_members').update({ role: s.value })
    .eq('trip_id', trip.id).eq('user_id', s.dataset.mrole).select('user_id');
  if (r.error) return fail(r.error, 'mem');
  if (!r.data?.length) return fail(NOROW.edit, 'mem');
  await loadMembers();
});

/* ── 초대 링크로 들어왔을 때 ────────────────────────────────────── */
async function handleJoin(){
  const code = sessionStorage.getItem('t2:join');
  if (!code) return false;
  sessionStorage.removeItem('t2:join');

  const { data, error } = await sb.rpc('redeem_invite', { p_code: code });
  if (error){ fail(error, 'trip'); return false; }
  await loadTrips();
  await openTrip(data);
  return true;
}

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
    clearRates(); lastRateHtml = ''; lastHomeSig = ''; dropHtml('trips');

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
  clearRates(); lastRateHtml = ''; lastHomeSig = ''; dropHtml('trips');
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
  myAvatar = '';
  /* 사진을 올린 적이 없으면 여기서 끝입니다. src 를 비워두면 흰 네모가 됩니다 —
     이름 첫 글자를 그려 넣습니다. 아래에서 진짜 사진이 오면 갈아 끼웁니다. */
  $('avatar').src = avatarOf(me.id, $('name').textContent);

  sb.from('profiles').select('avatar_url,display_name').eq('id', me.id).maybeSingle()
    .then(r => {
      if (!r.data) return;
      if (r.data.display_name) $('name').textContent = r.data.display_name;
      if (r.data.avatar_url){ myAvatar = r.data.avatar_url; $('avatar').src = myAvatar; }
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
