/* ── 만든 사람이 켜고 끄는 것들 ───────────────────────────────────────
 * 서버(`app_flags`)에 적어두고 앱이 뜰 때 한 번 읽습니다. 배포하지 않고도
 * 기능을 끄거나 안내를 띄울 수 있습니다 — 문제가 생겼을 때 **되돌리기보다
 * 끄는 것이 빠릅니다.**
 *
 *   `flags.features`  기능별 스위치. **없으면 켜진 것으로 봅니다**(`featOn`) —
 *                     새 기능을 낼 때마다 서버에 줄을 넣어야 하면 잊습니다.
 *   `flags.readonly`  읽기 전용. 고치는 단추를 다 잠급니다.
 *   `flags.signup`    새 가입을 받을지.
 *   `flags.notice`    화면 위에 띄우는 안내 한 줄.
 *
 * ── app.js 에서 떼어낸 서른여섯 번째 조각입니다(b360) ────────────────
 * **딸린 것이 0 입니다.** 58줄로 작지만 뗀 값이 따로 있습니다 —
 * `planview.js` 와 `geocode.js` 가 `featOn`·`flags` 를 **ctx 로 받고**
 * 있었는데 이제 직접 import 합니다. 그쪽 ctx 가 각각 둘씩 줄었습니다.
 * **작은 것을 아래로 내리면 위쪽 여럿이 가벼워집니다**(b351 의 putHtml 과 같은 꼴).
 *
 * 층: db.js · net.js · dom.js 만 씁니다. */
import { sb } from './db.js?v=b618';
import { netTimeout, setReadOnly } from './net.js?v=b618';
/* `$` 를 안 가져온 채로 b360 에 나갔습니다. drawNotice 와 applyFeatures 가
   async 안에서 도는 터라 조용한 unhandledrejection 으로만 남았고, 화면에는
   아무 표시도 안 났습니다 — 공지줄·기능 스위치·읽기전용이 통째로 안 걸린
   채였습니다. check-refs 가 `$` 를 못 보고 있었습니다(b362 에서 고침). */
import { $ } from './dom.js?v=b618';

/* ── 만든 사람이 켜고 끄는 것들 ─────────────────────────────────────
 * 일이 터졌을 때 **배포를 기다리지 않아도 되게** 하는 값들입니다(db/066).
 * 배포는 몇 분 걸리고 그 사이에도 돈이 나가거나 잘못된 알림이 계속 갑니다.
 *
 * **못 읽으면 전부 켜진 것으로 봅니다.** "설정을 못 읽었으니 다 꺼둔다"는
 * 앱을 멈추는 것과 같습니다 — 오프라인에서 특히 그렇습니다.
 * 066 을 아직 안 올린 곳에서도 같은 이유로 그대로 돕니다. */
export let flags = { notice:{ text:'' }, signup:true, readonly:false, features:{} };
export const featOn = k => flags.features?.[k] !== false;

/* ⚠ **부팅에 두 번 불립니다.** 로그인 화면용으로 한 번(맨 아래 `loadFlags().then`),
   로그인이 끝나고 또 한 번. 이미 들어와 있는 사람은 둘이 나란히 나갑니다 —
   재보니 **685ms + 701ms**, 둘 다 첫 화면을 기다리게 하는 자리였습니다.
   부르는 쪽 둘 다 이유가 있어서 어느 하나를 지우기보다, **돌고 있으면 그 약속을
   같이 씁니다.** 끝나면 비우므로 나중에 다시 부르면 새로 받아옵니다
   (관리자가 스위치를 바꾸고 새로고침하는 길이 살아 있어야 합니다). */
let flagsP = null;
export function loadFlags(){
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
  /* 탭 좌우 스와이프(b491). 끄면 **손가락 스와이프만** 죽습니다 —
     #tabdeck 은 overflow-x:hidden 이어도 여전히 스크롤 칸이라 하단바로
     옮기는 scrollLeft·스냅·부드러운 이동은 다 남습니다(app.css). */
  document.body.classList.toggle('noswipe', !featOn('swipe'));
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


/* ── 관리자 화면에서 바꾸면 그 자리에서 먹게 ──────────────────────────
 * 전에는 서버에만 쓰고 화면은 그대로였습니다. 스위치를 껐는데 아무 일도
 * 안 일어나니 **안 먹은 줄 알고** 다시 누르게 됩니다 — 새로고침해야
 * 달라졌습니다. 기능 스위치 전부에 해당합니다(b491).
 * ⚠ 서버에 **먼저 쓰고 나서** 부릅니다. 화면부터 바꾸면 저장이 실패했을
 *   때 화면과 서버가 갈립니다. */
export function reapplyFeatures(row){
  flags.features = { ...(flags.features || {}), ...(row || {}) };
  applyFeatures();
}
