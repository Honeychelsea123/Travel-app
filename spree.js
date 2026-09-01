/* ── 연속 평가 — 쭉 매기기 ────────────────────────────────────────────
 * **한 화면에서 계속 넘기며 매깁니다(b409).** 사진 한 장 · 별 다섯 · 넘기기,
 * 매기면 바로 다음 도시가 올라옵니다.
 *
 * ⚠ **홈에서도 매길 수 있는데 왜 따로 만드나.** 홈의 히어로는 한 곳이고
 *   그 아래에 목록·발자국이 섞여 있어 **"쭉 매기는 흐름" 으로 안 읽힙니다.**
 *   여기는 화면에 그것 하나만 둡니다 — 다섯 곳이 30초입니다.
 *   재료는 이미 다 있습니다: 469곳에 사진과 설명이 붙어 있습니다.
 *
 * ⚠ **홈을 다시 그리지 않습니다.** 매길 때마다 `loadHome()` 을 부르면 화면이
 *   튀고 사진이 깜빡입니다. 여기서는 **지문만 비우고**(resetHomeSig) 나갈 때
 *   한 번 다시 그립니다. 홈에서 배운 것과 같습니다(b405).
 *
 * ⚠ **자기 우물을 씁니다.** 홈의 `quizPool` 을 같이 쓰면 두 화면이 서로의
 *   목록을 갉아먹습니다. 여기서 매긴 것은 서버에 남으므로 홈이 다음에
 *   그릴 때 자연히 빠집니다 — 그것으로 충분합니다.
 *
 * 층: dom.js · db.js · cities.js · citysearch.js · stars.js · rateui.js ·
 *     rate.js · rating.js · home.js(지문 비우기만). */
import { $, esc } from './dom.js?v=b604';
import { sb } from './db.js?v=b604';
import { cities } from './cities.js?v=b604';
import { loadCities } from './citysearch.js?v=b604';
import { paintStars } from './stars.js?v=b604';
import { rateHero, starValue } from './rateui.js?v=b604';
import { saveRate } from './rating.js?v=b604';
import { resetHomeSig } from './home.js?v=b604';

/* ⚠ showApp 은 **기본값에도 둡니다.** 없으면 위 돌아가기() 가 조용히
   아무 일도 안 하는데, 그게 b423~b425 동안 그대로 나가 있었습니다. */
let ctx = { me: () => null, showApp: () => {} };
export function setSpreeCtx(o){ ctx = { ...ctx, ...o }; }

let 주머니 = [], 지금 = null, 센것 = 0, 도는중 = false;
/* ⚠ **센것과 건드림은 다릅니다(b413).** 센것은 **별을 준 곳**만 셉니다 —
   화면에 보여줄 숫자라 「안 가봤어요」를 스무 번 누른 것을 「20곳 매김」
   이라고 쓸 수는 없습니다. 건드림은 **자료가 바뀌었는가**입니다.
   skip·want 도 city_ratings 에 줄을 남깁니다(아래 누르기 참고).
   나갈 때 이걸로 갈라야 합니다 — 센것으로 가드를 걸었더니 「안 가봤어요」
   만 누르고 나온 사람의 홈이 **옛것 그대로**였습니다. */
let 건드림 = false;

/* ── 물어볼 도시 ─────────────────────────────────────────────────────
 * ⚠ **이미 답한 곳은 서버에 물어서 뺍니다.** 별점이든 ♡ 든 「안 가봤어요」든
 *   줄이 있으면 다시 안 묻습니다(홈의 fillQuiz 와 같은 규칙).
 * ⚠ **이름난 곳부터.** 처음 쭉 매기는 사람에게 생소한 곳을 먼저 주면 넘기다
 *   지칩니다. 유명도 안에서만 섞어 열 때마다 순서가 달라지게 합니다. */
async function 채우기(){
  await loadCities();
  const r = await sb.from('city_ratings').select('city_id').eq('user_id', ctx.me().id);
  if (r.error) return;
  const 답한것 = new Set((r.data || []).map(x => x.city_id));
  주머니 = (cities || []).filter(c => c.image_url && !답한것.has(c.id));
  주머니.sort((a, b) => (a.fame ?? 9) - (b.fame ?? 9));
  for (let i = 주머니.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    if ((주머니[i].fame ?? 9) === (주머니[j].fame ?? 9))
      [주머니[i], 주머니[j]] = [주머니[j], 주머니[i]];
  }
}

function 그리기(){
  const box = $('spreebox');
  if (!box) return;
  지금 = 주머니[0] || null;
  if (!지금){
    box.innerHTML = `<div class="card"><div class="empty" style="padding:28px 12px">
      물어볼 도시를 다 봤어요.${센것 ? `<br>
      <span class="memo">${센것}곳을 매기셨어요</span>` : ``}</div></div>`;
    /* ⚠ 0 일 때는 그 줄을 안 씁니다 — 「안 가봤어요」만 누르고 끝낸 사람에게
       「0곳을 매기셨어요」는 잘했다는 말도 아니고 뭘 하라는 말도 아닙니다. */
    return;
  }
  /* 홈·맛보기와 **같은 히어로**입니다(rateui.js). 안 그러면 같은 일을 하는
     화면이 앱 안에서 셋으로 갈립니다. */
  box.innerHTML = rateHero(지금, { id:'spreehero', ask:'다녀오셨다면 별점을 남겨주세요',
    /* ⚠ 이 화면은 이것 하나뿐이라 세로가 통째로 남습니다. 사진을 정방형으로
       키우고 글자·별을 사진 밖으로 뺍니다 — 여기서 사진은 장식이 아니라
       **판단 근거**입니다(rateui.js 의 모양 주석). */
    모양:'square' });
}

/* 몇 곳 매겼는지. **이게 없으면 언제 그만둘지 모릅니다** — 끝이 없는 화면은
   금방 지칩니다. 숫자가 올라가는 것이 그만두게도 하고 더 하게도 합니다. */
function 세기(){
  const el = $('spreecount');
  if (el) el.textContent = 센것 ? `${센것}곳 매김` : '';
}

/* 다음으로. 별을 매겼든 넘겼든 여기로 옵니다. */
function 다음(){
  주머니 = 주머니.filter(c => c.id !== 지금?.id);
  그리기();
}

export async function openSpree(){
  if (도는중) return;
  도는중 = true;
  $('tabdeck').classList.add('hide');   /* 덱 한 덩어리로(b474) */
  $('spreeview').classList.remove('hide');
  /* ⚠ **탭 바를 진짜로 숨겨야 합니다(b410).** `hastab` 은 본문 아래 **여백**만
     없앱니다 — 탭 바는 `position:fixed` 라 그대로 떠 있고, 여백만 없애면
     내용이 그 밑으로 깔립니다. 재보고 알았습니다(#appbar 가 화면에 남아
     있었습니다). 이 화면은 나가는 길이 「그만」 하나뿐이라 숨겨도 갇히지
     않습니다. 닫을 때 반드시 되돌립니다 — 안 되돌리면 앱을 못 씁니다. */
  $('appbar').classList.add('hide');
  document.body.classList.remove('hastab');    /* 화면에 이것 하나만 둡니다 */
  window.scrollTo({ top:0 });
  if (history.state?.t2 !== 'spree') history.pushState({ t2:'spree' }, '');
  센것 = 0; 건드림 = false; 세기();
  $('spreebox').innerHTML =
    `<div class="empty"><span class="load">불러오는 중…</span></div>`;
  await 채우기();
  그리기();
}

/* ── 나가면 **들어온 자리**로 돌아갑니다(b423) ────────────────────────
 * 홈의 「쭉 매기기」 줄로 들어와서 「그만」 을 누르면 **기록 탭에 떨어졌습니다.**
 * 홈에서 여는 길이 `ctx.showApp('rate')` 로 기록 탭에 간 뒤 거기 있는 시작
 * 단추를 누르는 방식이라, 닫을 때는 이미 기록 탭이 제자리였기 때문입니다.
 * 들어온 사람 입장에서는 **엉뚱한 화면으로 떨어진** 것입니다.
 *
 * ⚠ **home.js 가 이걸 직접 부르지 않습니다.** 그러면 spree → home
 *   (resetHomeSig) → spree 로 **고리**가 생깁니다. app.js 가 둘 다 알고
 *   있으므로 거기서 home 의 ctx 에 넣어 줍니다(setHomeCtx).
 * ⚠ 한 번 쓰고 **바로 비웁니다.** 남겨두면 다음에 기록 탭에서 연 사람도
 *   홈으로 튕깁니다. */
let 돌아갈곳 = null;
export function spreeBackTo(tab){ 돌아갈곳 = tab; }
function 돌아가기(){
  const t = 돌아갈곳; 돌아갈곳 = null;
  if (t) ctx.showApp?.(t);
}

export function closeSpree(fromPop){
  if (!fromPop && history.state?.t2 === 'spree'){ history.back(); return; }
  도는중 = false;
  $('spreeview').classList.add('hide');
  $('tabdeck').classList.remove('hide');
  /* 숨긴 것을 반드시 되돌립니다 — 여기서 빠뜨리면 앱에 탭 바가 영영 없습니다. */
  $('appbar').classList.remove('hide');
  document.body.classList.add('hastab');
  /* 매긴 것이 있으면 홈과 기록을 다시 그리게 합니다 — **지문만 비웁니다.**
     여기서 직접 부르면 안 보이는 화면을 그리느라 나가는 길이 느려집니다. */
  if (건드림) { resetHomeSig(); ctx.afterSpree?.(); }
  /* ⚠ **지문을 비운 뒤에 옮깁니다.** 순서가 반대면 홈으로 가서 옛 화면을
     한 번 보여준 다음 다시 그립니다 — 숫자가 눈앞에서 바뀝니다. */
  돌아가기();
}

$('spreeclose')?.addEventListener('click', () => closeSpree());

/* ── 누르기 ──────────────────────────────────────────────────────────
 * 상자 하나에만 답니다. 안쪽은 매번 갈아끼웁니다. */
$('spreebox')?.addEventListener('click', async e => {
  const st = e.target.closest('.st');
  if (st){
    const wrap = st.closest('.stars');
    const v = starValue(st, e.clientX);
    paintStars(wrap, v, true);
    센것++; 건드림 = true; 세기();
    /* ⚠ **기다렸다 넘기지 않습니다.** 홈은 1.5초를 두고 되돌릴 틈을 줍니다만,
       여기는 **쭉 매기는 것이 목적**이라 그 1.5초가 다섯 번이면 7초입니다.
       잘못 눌렀으면 기록 탭에서 고칠 수 있습니다. */
    saveRate(wrap.dataset.city, { stars: v }, true);   /* 안 기다립니다 */
    setTimeout(다음, 260);
    return;
  }
  const b = e.target.closest('[data-rate]');
  if (!b || !지금) return;
  /* 「안 가봤어요」는 **별점 없는 줄**을 남깁니다 — 다시 안 묻기 위한 것입니다.
     홈과 같은 규칙입니다(home.js 의 herobar 주석). */
  saveRate(지금.id, b.dataset.rate === 'want' ? { want: true } : { stars: null }, true);
  건드림 = true;
  다음();
});
