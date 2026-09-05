/* ── 나라 지도 화면 ────────────────────────────────────────────────────
 *
 * 사용자 요청: 「지구본에서 미국을 클릭하면 미국만 보여주는 화면으로 들어가고
 *   거기서 도시별로 색이 칠해져 있고 그 도시를 누르면 카드가 뜨는 방식」
 *   → 「점으로 찍지말고 도시도 영역으로 나눠서」
 *   → 「영역으로 하고 도시있는 조각으로 가면 돼」
 *
 * ── 도시를 «영역»으로 나누는 법 ──────────────────────────────────────
 * ⚠⚠ **행정구역(시도·주)으로는 못 합니다.** 우리 도시가 행정단위가 아닙니다 —
 *   한국은 시도가 17개인데 우리 도시는 50곳, 일본은 도도부현 47개인데 50곳.
 *   한 도(道)에 도시가 여럿이라 **영역을 눌러도 어느 도시인지 못 고릅니다.**
 *   게다가 200개국 행정구역 자료는 메가바이트라 오프라인 앱에 안 맞습니다.
 *
 * → 대신 **「가장 가까운 도시의 땅」**으로 나눕니다(보로노이).
 *   · 자료가 «하나도» 안 듭니다 — 이미 있는 좌표만 씁니다.
 *   · 도시 하나에 영역 하나가 **정확히** 대응합니다.
 *   · 겹침이 **원리상 불가능**합니다. 점으로 찍던 때의 가장 큰 문제
 *     (한국 125짝 · 일본 264짝이 손가락 44px 안에서 겹침)가 사라집니다.
 *   · **이름을 넣을 자리**가 생깁니다. 점은 이름을 옆에 달아야 해서 서로
 *     부딪치는데, 영역은 «안»에 넣습니다.
 *   · 해안선 자르기는 **SVG clipPath 가 공짜로** 해줍니다.
 *
 * ── 지도는 나라별로 «따로» 받습니다(50m) ─────────────────────────────
 * ⚠⚠ world.js 는 Natural Earth **110m** 이라 작은 섬을 통째로 지웠습니다.
 *   실측(점-다각형 8곳): 제주·서귀포·울릉도·완도·거제·오키나와·이시가키·
 *   발리가 모두 제 나라 다각형 «밖»이었습니다 — **0/8**. 한국은 조각 1개,
 *   점 19개뿐이라 나라 화면으로 확대하면 19각형입니다.
 * → `map50/XX.js`(50m)를 **이 화면에 들어올 때만** 받습니다. 실측 8/8.
 *   한국 2.2KB(조각 11·점 260) · 일본 8.8KB · 가운데값 1.9KB.
 * ⚠ **지구본과 평면 지도는 110m 그대로입니다.** 50m 전체는 점 99,539개라
 *   매 프레임 그것을 다 도는 지구본이 못 버팁니다(지금 9,879개).
 * ⚠ 50m 도 해안선이 거칠어 통영·홍콩·마카오·모나코는 2~3km 바다에 떨어집니다.
 *   그래서 **누르기는 다각형 맞히기가 아니라 「가장 가까운 도시」**로 합니다.
 * ⚠ 버전 딱지가 `?m=` 인 이유: 이 파일들은 **다시 구울 때만** 바뀝니다.
 *   `?v=bNNN` 을 달면 빌드마다 199개가 새로 내려갑니다(bump.sh 가 다 바꿉니다).
 *
 * ── 이 화면을 여는 조건 ──────────────────────────────────────────────
 * **도시가 하나라도 있으면 지도를 먼저 폅니다**(b683, 사용자 결정:
 * 「도시 1~2곳인 나라도 무조건 지도가 먼저 뜨게해줘」).
 * ⚠ b682 에는 「셋 이상만」이었습니다. 그때 든 이유는 「점 한둘짜리 지도는
 *   볼 것이 없다」였는데, **영역 방식에서는 틀린 말이었습니다** — 도시가
 *   하나면 그 나라 «전체»가 그 도시의 땅으로 칠해집니다. 싱가포르·홍콩·
 *   마카오·괌처럼 나라가 곧 도시인 곳에서는 그 편이 오히려 맞습니다.
 * ⚠ 지도가 아예 없는 나라(투발루)만 카드로 내려갑니다.
 */

import { $, esc, flagOf, flagOk, flagSprite } from './dom.js?v=b685';
import { cities, countryName, countryInfo } from './cities.js?v=b685';
import { myRates, visited } from './rate.js?v=b685';

const MAP_V = '?m=1';          /* map50 자료를 다시 구웠을 때만 올립니다 */
export const CMAP_MIN = 1;     /* 이 수보다 적으면 지도를 안 엽니다(b683: 하나면 충분) */

let ctx = { 나라카드: async () => {} };
export function setCtryMapCtx(o){ ctx = { ...ctx, ...o }; }

/* ── 좌표 ─────────────────────────────────────────────────────────────
   world.js 와 같은 칸입니다: x = (경도+180)/360*1000 · y = (90-위도)/180*500 */
const PX = 경도 => (Number(경도) + 180) / 360 * 1000;
const PY = 위도 => (90 - Number(위도)) / 180 * 500;

/* ⚠⚠ **도시 좌표 칸은 `center_lat`·`center_lng` 입니다**(citysearch.js 의 BASE).
   `lat`/`lng` 로 읽으면 **한 곳도 안 잡혀** 나라 지도가 통째로 안 열립니다 —
   b683 이 그렇게 나갔습니다(사용자 신고: 「러시아를 눌렀는데 바로 카드가 나온다」).
   ⚠ 내가 만든 시험 자료는 `lat`/`lng` 였고 그래서 검사를 통과했습니다.
     **자료 이름은 지어내지 말고 실물에서 확인할 것.**
   ⚠ `lat`/`lng` 도 받쳐 둡니다 — 일정·후보처럼 다른 칸 이름을 쓰는 곳에서
     넘어온 줄이 섞일 수 있습니다. */
const 위 = c => c?.center_lat ?? c?.lat;
const 경 = c => c?.center_lng ?? c?.lng;

/* ── 나라 땅 ──────────────────────────────────────────────────────────
   한 번 받으면 안 버립니다. null 은 「받아봤는데 없더라」입니다 — 그래야
   없는 나라(투발루)에서 매번 다시 시도하지 않습니다. */
const 땅캐시 = {};

function 조각내기(d){
  const 조각 = [];
  if (!d) return 조각;
  for (const s of String(d).matchAll(/M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)([^M]*)/g)){
    let x = +s[1], y = +s[2];
    const 점 = [[x, y]];
    let x0 = x, x1 = x, y0 = y, y1 = y;
    const 수 = s[3].match(/-?\d*\.?\d+/g) || [];
    for (let i = 0; i + 1 < 수.length; i += 2){
      x += +수[i]; y += +수[i + 1];
      점.push([x, y]);
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    조각.push({ 점, x0, x1, y0, y1, 넓이: (x1 - x0) * (y1 - y0) });
  }
  return 조각;
}

/* 110m 은 이미 화면에 들어 있습니다(app.js 가 #worldland 에 넣습니다).
   다시 파싱할 필요가 없으니 거기서 꺼내 씁니다. */
const 성긴땅 = cc => 조각내기(
  $('worldland')?.querySelector(`path[data-c="${cc}"]`)?.getAttribute('d'));

async function 나라땅(cc){
  if (땅캐시[cc] !== undefined) return 땅캐시[cc];
  try {
    const m = await import(`./map50/${cc}.js${MAP_V}`);
    땅캐시[cc] = 조각내기(m.default);
  } catch {
    /* 없는 나라(투발루)이거나, 비행기모드에서 «처음» 여는 나라입니다.
       성긴 지도라도 그리는 편이 빈 화면보다 낫습니다. */
    땅캐시[cc] = null;
  }
  return 땅캐시[cc];
}

/* ── 점이 그 조각 안인가 ──────────────────────────────────────────────
   ⚠ 오른쪽으로 반직선을 쏘아 만나는 횟수를 셉니다(홀수면 안). 그래서 상자로
     건너뛸 때 «오른쪽에 있는 조각»은 건너뛰면 안 됩니다 — 그 조각이 바로
     반직선이 지나가는 곳입니다. `x > q.x1` 만 건너뜁니다. */
function 조각안에(q, x, y){
  if (y < q.y0 || y > q.y1 || x > q.x1) return false;
  const p = q.점;
  let 안 = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++){
    const xi = p[i][0], yi = p[i][1], xj = p[j][0], yj = p[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) 안 = !안;
  }
  return 안;
}
const 상자거리 = (q, x, y) =>
  Math.hypot(Math.max(0, q.x0 - x, x - q.x1), Math.max(0, q.y0 - y, y - q.y1));

/* ── 보로노이: 「가장 가까운 도시의 땅」 ───────────────────────────────
   한 도시의 땅 = 다른 모든 도시와의 수직이등분선 중 내 쪽 반평면을 다 겹친 것.
   ⚠ 반평면을 계속 자르므로 결과는 **언제나 볼록**입니다 — 오목 다각형
     자르기의 어려움이 없습니다. */
function 반평면자르기(poly, a, b, c){
  const out = [];
  const n = poly.length;
  for (let i = 0; i < n; i++){
    const P = poly[i], Q = poly[(i + 1) % n];
    const dp = a * P[0] + b * P[1] - c;
    const dq = a * Q[0] + b * Q[1] - c;
    const p안 = dp <= 1e-9, q안 = dq <= 1e-9;
    if (p안) out.push(P);
    if (p안 !== q안){
      const t = dp / (dp - dq);
      out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]);
    }
  }
  return out;
}
function 보로노이(사이트, 상자){
  const [X0, Y0, X1, Y1] = 상자;
  return 사이트.map((s, i) => {
    let poly = [[X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1]];
    for (let j = 0; j < 사이트.length && poly.length; j++){
      if (j === i) continue;
      const t = 사이트[j];
      const a = t[0] - s[0], b = t[1] - s[1];
      if (a === 0 && b === 0) continue;          /* 좌표가 같은 도시 */
      const c = (t[0] * t[0] + t[1] * t[1] - s[0] * s[0] - s[1] * s[1]) / 2;
      poly = 반평면자르기(poly, a, b, c);
    }
    return poly;
  });
}

/* ── 판 ───────────────────────────────────────────────────────────────
   ⚠ `#gsheet` 와 같은 수법으로 **여기서 만들어 body 에 붙입니다.** 탭 덱
     (`#tabdeck`) 안에 두면 가로 스크롤에 딸려갑니다. 카드 시트가 이 위에
     열려야 하므로 z-index 는 그보다 «아래»입니다(1180 < 1200). */
function 판만들기(){
  let 판 = $('cmappane');
  if (판) return 판;
  판 = document.createElement('div');
  판.id = 'cmappane';
  판.className = 'hide';
  /* ── 짜임새(b685) ────────────────────────────────────────────────
   * 지도가 위, **국가 카드**가 아래입니다(사용자: 「레퍼 이미지 같은 국가
   * 카드가 다 있어야해」).
   * ⚠ 카드가 «빈 자리»를 씁니다. 세로 폰에서 한국·일본처럼 네모난 나라는
   *   지도가 화면의 절반도 안 차서 아래가 통째로 비었습니다(b682 에서 잼).
   * ⚠ 참고한 앱은 나라 단위로 been/lived/wish 를 찍지만 **우리는 도시
   *   단위**입니다(별점·가보고 싶어요). 그래서 카드의 일은 「고르게 하는
   *   것」입니다 — 얼마나 다녀왔는지 보여주고 도시 카드로 보냅니다.
   * ⚠ 뒤로 단추는 지도 «위에» 얹습니다. 머리줄을 따로 두면 그만큼 지도가
   *   줄어듭니다. */
  판.innerHTML =
    '<div class="cmbox"></div>' +
    '<button type="button" class="cmback" aria-label="뒤로">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M15 5l-7 7 7 7"/></svg></button>' +
    '<div class="cmcard">' +
      '<div class="cmtop"><span class="cmflag"></span><b class="cmname"></b>' +
        '<span class="cmcount"></span></div>' +
      '<div class="cmbar"><i></i></div>' +
      '<div class="cmmeta"></div>' +
      '<div class="cmfar hide"></div>' +
      '<button type="button" class="cmgo">도시 카드 보기</button>' +
    '</div>';
  document.body.appendChild(판);
  판.querySelector('.cmback').onclick = () => 닫기();
  판.querySelector('.cmgo').onclick = () => { if (지금) ctx.나라카드(지금.cc); };
  return 판;
}

/* 깃발 하나. 기기가 이모지 깃발을 그리면 그것으로 끝내고(0바이트), 못 그리면
   (윈도우 크롬 등) 그림판을 받아 씁니다. 그것도 안 되면 나라 코드를 적습니다.
   ⚠ 356KB 짜리 그림판을 «깃발 하나 때문에» 먼저 받지 않습니다. */
async function 깃발넣기(칸, cc){
  if (flagOk()){ 칸.textContent = flagOf(cc); return; }
  칸.textContent = cc;
  if (await flagSprite()){
    칸.innerHTML = `<svg class="cmfg" aria-hidden="true"><use href="#f-${
      String(cc).toLowerCase()}"/></svg>`;
  }
}

let 지금 = null;               /* { cc, 점들, 배, 판 } — 누를 때 씁니다 */

/* ── 그리기 ───────────────────────────────────────────────────────────*/
const 문턱 = 3;   /* 3u ≈ 120km. 제 나라 해안에서 이보다 멀면 「그 땅이 아니다」 */

function 그리기(cc, 조각0, 도시들, 폭px, 높px){
  let 점들 = 도시들.map(c => ({ c, x: PX(경(c)), y: PY(위(c)) }));

  /* ① **날짜변경선을 폅니다.** 안 하면 러시아 상자가 «지도 한 바퀴»(1000)가
       되고, 미국은 알류샨 열도 때문에 -62~1076 이 됩니다(실측). 그러면 본토
       도시가 0.4px 로 뭉갭니다.
     ⚠ 조각은 «조각째» 밉니다 — 꼭짓점마다 따로 밀면 선을 넘는 섬이 찢어집니다.
       (Natural Earth 는 ±180 에서 이미 잘라 두므로 한 조각이 선을 넘지 않습니다.)
     ⚠ 기준은 도시 x 의 **가운데값**입니다. 평균이면 멀리 있는 한 곳이 기준을
       끌고 갑니다. */
  const xs = 점들.map(d => d.x).sort((a, b) => a - b);
  const 가운데 = xs.length ? xs[xs.length >> 1] : 500;
  const 밀기 = x => (x - 가운데 > 500 ? -1000 : (가운데 - x > 500 ? 1000 : 0));
  점들 = 점들.map(d => ({ ...d, x: d.x + 밀기(d.x) }));
  const 조각 = 조각0.map(q => {
    /* ⚠⚠ **고리 «자체»가 선을 넘습니다.** 러시아 50m 은 점 4,894개짜리 고리
       하나가 x 0 에서 999.6 까지 갑니다(실측). 조각째 미는 것으로는 못 폅니다 —
       b684 에서 러시아 화면에 «지도를 가로지르는 띠»가 나온 원인입니다.
       → 고리를 따라 걸으며, 이웃한 두 점이 500 넘게 벌어지면 그 자리가
         「넘은 자리」이므로 거기서부터 ±1000 을 «누적»해 이어 붙입니다.
       ⚠ 500u = 180°입니다. 진짜 해안선에 그만큼 벌어진 이웃 점은 없습니다. */
    let 누적 = 0, 이전 = null;
    const 점 = [];
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of q.점){
      if (이전 !== null){
        const d = x + 누적 - 이전;
        if (d > 500) 누적 -= 1000; else if (d < -500) 누적 += 1000;
      }
      const nx = x + 누적;
      이전 = nx;
      점.push([nx, y]);
      if (nx < x0) x0 = nx; if (nx > x1) x1 = nx;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    const s = 밀기((x0 + x1) / 2);          /* 편 고리를 도시 쪽으로 */
    return s ? { 점: 점.map(([x, y]) => [x + s, y]),
                 x0: x0 + s, x1: x1 + s, y0, y1, 넓이: (x1 - x0) * (y1 - y0) }
             : { 점, x0, x1, y0, y1, 넓이: (x1 - x0) * (y1 - y0) };
  });

  /* ② 도시를 조각에 붙입니다.
     ⚠ 50m 해안선도 거칠어 도시가 2~3km 바다에 떨어집니다(통영 0.05u ·
       홍콩 0.09 · 마카오 0.07 · 모나코 0.06 — 실측). 그런 것은 «제일 가까운
       조각»에 붙입니다.
     ⚠ 그런데 **문턱보다 멀면 붙이지 않습니다.** 우리는 나라를 모국(cc)으로
       접기 때문에(db/076) 괌·사이판이 미국, 타히티가 프랑스로 옵니다. 그것을
       붙이면 미국 조각에 태평양이 딸려오고 프랑스에 과들루프가 딸려옵니다. */
  const 붙임 = 점들.map(d => {
    const 안 = 조각.findIndex(q => 조각안에(q, d.x, d.y));
    if (안 >= 0) return 안;
    let 가깝 = -1, best = Infinity;
    조각.forEach((q, i) => { const v = 상자거리(q, d.x, d.y);
      if (v < best){ best = v; 가깝 = i; } });
    return best <= 문턱 ? 가깝 : -1;
  });

  /* ③ 규칙 ③ — **도시가 있는 조각만**(사용자 결정).
     씨앗은 «도시가 제일 많은 조각»입니다. 거기서 한계 안에 있는 조각만 함께
     씁니다 — 그래야 프랑스가 레위니옹까지 벌어지지 않습니다. */
  const 세기 = new Map();
  붙임.forEach(i => { if (i >= 0) 세기.set(i, (세기.get(i) || 0) + 1); });
  let 씨 = -1;
  for (const [i, n] of 세기){
    if (씨 < 0 || n > 세기.get(씨) || (n === 세기.get(씨) && 조각[i].넓이 > 조각[씨].넓이)) 씨 = i;
  }
  if (씨 < 0){                       /* 붙은 도시가 하나도 없으면 제일 큰 조각 */
    씨 = 조각.reduce((m, q, i) => q.넓이 > 조각[m].넓이 ? i : m, 0);
  }
  const S = 조각[씨];
  const 한계 = Math.max(S.x1 - S.x0, S.y1 - S.y0, 100);
  const 씀 = new Set([씨]);
  for (const i of 세기.keys()){
    if (i === 씨) continue;
    const q = 조각[i];
    const dx = Math.max(0, S.x0 - q.x1, q.x0 - S.x1);
    const dy = Math.max(0, S.y0 - q.y1, q.y0 - S.y1);
    if (Math.hypot(dx, dy) <= 한계) 씀.add(i);
  }
  const 쓸것 = [...씀].sort((a, b) => a - b).map(i => 조각[i]);

  /* ④ 쓴 조각에 못 낀 도시는 지도 아래 «먼 곳» 칩으로 뺍니다.
     실측: 이 규칙으로 726곳 중 세 곳만 떨어집니다(괌·사이판·타히티). */
  const 안것 = [], 먼것 = [];
  점들.forEach((d, i) => (씀.has(붙임[i]) ? 안것 : 먼것).push(d));

  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const q of 쓸것){
    x0 = Math.min(x0, q.x0); x1 = Math.max(x1, q.x1);
    y0 = Math.min(y0, q.y0); y1 = Math.max(y1, q.y1);
  }
  /* ⑤ 남은 도시로 상자를 넓힙니다 — 안 넓히면 해안에서 살짝 벗어난 도시가
     화면 가장자리에 걸립니다. */
  for (const d of 안것){
    x0 = Math.min(x0, d.x); x1 = Math.max(x1, d.x);
    y0 = Math.min(y0, d.y); y1 = Math.max(y1, d.y);
  }

  /* ④ 화면 비율에 맞춥니다. 안 맞추면 한쪽이 잘립니다. */
  const 폭 = Math.max(x1 - x0, 0.4), 높 = Math.max(y1 - y0, 0.4);
  const 여 = Math.max(폭, 높) * 0.10;
  const 비 = 높px / 폭px;
  let vw = 폭 + 여 * 2, vh = 높 + 여 * 2;
  if (vh / vw < 비) vh = vw * 비; else vw = vh / 비;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const vx = cx - vw / 2, vy = cy - vh / 2;
  const 배 = 폭px / vw;                     /* 지도 한 칸이 화면 몇 px 인가 */
  const 선 = 0.4 / 배;

  /* ⑤ 이웃 나라를 흐리게. 나라 하나만 그리면 허공에 뜬 것처럼 보입니다.
     ⚠ 110m 을 그대로 씁니다 — 배경이라 정밀할 필요가 없고, 이미 화면에
       들어 있어 파싱이 공짜입니다. */
  let 이웃 = '';
  const 밭 = $('worldland');
  if (밭) for (const p of 밭.querySelectorAll('path[data-c]')){
    if (p.getAttribute('data-c') === cc) continue;
    이웃 += `<path d="${p.getAttribute('d')}" class="cm-far2"/>`;
  }

  const 길 = q => 'M' + q.점.map(([x, y]) => x.toFixed(2) + ' ' + y.toFixed(2)).join('L') + 'Z';
  const 다각 = poly => 'M' + poly.map(([x, y]) => x.toFixed(2) + ' ' + y.toFixed(2)).join('L') + 'Z';
  const 나라길 = 조각.map(길).join(' ');

  /* ⑥ 영역. 사이트에는 **화면 밖 도시도** 넣습니다 — 안 넣으면 가장자리
     도시의 땅이 이웃 몫까지 집어삼킵니다. */
  const 셀 = 보로노이(안것.map(d => [d.x, d.y]),
                      [vx - vw * 2, vy - vh * 2, vx + vw * 3, vy + vh * 3]);
  const 갔나 = c => visited?.has?.(c.id) || myRates?.[c.id]?.stars != null;

  const 칠 = [], 그릴것 = [];
  안것.forEach((d, i) => {
    const poly = 셀[i];
    if (!poly || poly.length < 3) return;
    칠.push(`<path d="${다각(poly)}" class="${갔나(d.c) ? 'cm-on' : 'cm-off'}" ` +
            `stroke-width="${(선 * 1.3).toFixed(3)}"/>`);
    let a = Infinity, b = -Infinity, c2 = Infinity, d2 = -Infinity;
    for (const pt of poly){
      if (pt[0] < a) a = pt[0]; if (pt[0] > b) b = pt[0];
      if (pt[1] < c2) c2 = pt[1]; if (pt[1] > d2) d2 = pt[1];
    }
    그릴것.push({ d, w: (b - a) * 배, h: (d2 - c2) * 배 });
  });

  /* ⑦ 이름은 «자리가 될 때만». 자리를 두 가지로 봅니다 —
       ① 제 영역이 그만큼 넓은가 ② 이미 놓은 이름과 안 부딪치는가.
     ⚠ 유명한 곳(다녀온 곳)부터 놓습니다. 오는 순서대로 놓으면 이름을 얻는
       도시가 자료 순서에 따라 달라집니다.
     ⚠ 이름은 clipPath **밖**에 그립니다. 안에 넣으면 해안 도시의 이름이
       바다에서 잘려 「목포」가 「포」로 나옵니다.
     ⚠⚠ **글자는 «화면 자」로 그립니다(따로 무리를 지어 되돌립니다).**
       지도 칸으로 그리면 font-size 가 0.43 «px» 이 되는데, 크롬이 그 크기
       에서 글자 사이 간격을 0 으로 반올림합니다 — 「서귀포」 석 자가 한
       자리에 겹쳐 찍혀 **한 글자처럼** 보였습니다(실측: 글자 폭 0.436 =
       한 글자 폭). 무리에 `scale(1/배)` 를 걸고 «안에서는 10px» 로 적으면
       자간이 제대로 잡힌 뒤에 줄어듭니다. */
  const 글 = [], 놓은것 = [];
  const 화면 = d => [(d.x - vx) * 배, (d.y - vy) * 배];
  그릴것.slice()
    .sort((p, q) => (갔나(q.d.c) - 갔나(p.d.c)) || ((p.d.c.fame || 9) - (q.d.c.fame || 9))
                    || (q.w * q.h - p.w * p.h))
    .forEach(o => {
      const 글자 = o.d.c.name || '';
      const lw = 글자.length * 10 + 6, lh = 13;
      let [sx, sy] = 화면(o.d);
      /* ⚠ 가장자리 도시의 이름이 화면 밖으로 나가 잘립니다(이시가키에서 겪음).
         상자 안으로 당깁니다 — 지도에서 흔히 하는 대로입니다. */
      if (lw + 4 < 폭px) sx = Math.min(Math.max(sx, lw / 2 + 2), 폭px - lw / 2 - 2);
      sy = Math.min(Math.max(sy, lh / 2 + 2), 높px - lh / 2 - 2);
      const L = sx - lw / 2, T = sy - lh / 2;
      const 부딪침 = 놓은것.some(r => L < r.L + r.w + 2 && L + lw + 2 > r.L &&
                                      T < r.T + r.h + 2 && T + lh + 2 > r.T);
      if (글자 && o.w >= lw * 0.55 && o.h >= 16 && !부딪침){
        놓은것.push({ L, T, w: lw, h: lh });
        글.push(`<text x="${sx.toFixed(1)}" y="${(sy + 3.4).toFixed(1)}" ` +
          `class="cm-nm">${esc(글자)}</text>`);
      } else {
        글.push(`<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="1.8" class="cm-dot"/>`);
      }
    });

  const cid = 'cmclip';
  const svg =
    `<svg viewBox="${vx.toFixed(2)} ${vy.toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}" ` +
    `preserveAspectRatio="xMidYMid meet">` +
    `<defs><clipPath id="${cid}"><path d="${나라길}"/></clipPath></defs>` +
    /* ⚠ 날짜변경선을 편 나라(러시아·미국)는 창이 0 또는 1000 을 넘어갑니다.
       이웃은 0~1000 자리에 있으므로 한 벌 더 옮겨 그려야 그쪽이 안 빕니다. */
    [0, ...(vx < 0 ? [-1000] : []), ...(vx + vw > 1000 ? [1000] : [])].map(s =>
      `<g class="cm-far" stroke-width="${선.toFixed(3)}"` +
      (s ? ` transform="translate(${s} 0)"` : '') + `>${이웃}</g>`).join('') +
    `<g clip-path="url(#${cid})">` +
      `<path d="${나라길}" class="cm-land"/>${칠.join('')}</g>` +
    `<path d="${나라길}" class="cm-edge" stroke-width="${(선 * 1.8).toFixed(3)}"/>` +
    `<g transform="translate(${vx.toFixed(2)} ${vy.toFixed(2)}) scale(${(1 / 배).toFixed(6)})">` +
      글.join('') + `</g></svg>`;

  return { svg, 배, vx, vy, vw, vh, 안것, 먼것 };
}

/* ── 한 번 칠하기 ─────────────────────────────────────────────────────
   ⚠ 칸 크기를 «그때» 재서 그립니다. 폰을 돌리면 칸 비율이 통째로 달라지고
     (세로 375×764 → 가로 764×375) viewBox 비율이 안 맞아 지도가 조그맣게
     가운데 박힙니다. 그래서 창이 바뀌면 이 함수를 다시 부릅니다. */
function 칠하기(cc, 조각, 도시들){
  const 판 = 판만들기();
  const 칸 = 판.querySelector('.cmbox');
  const r = 칸.getBoundingClientRect();
  const 결과 = 그리기(cc, 조각, 도시들, r.width || 360, r.height || 520);
  칸.innerHTML = 결과.svg;

  /* ── 국가 카드 ─────────────────────────────────────────────────── */
  const 간것 = 도시들.filter(c => visited?.has?.(c.id) || myRates?.[c.id]?.stars != null).length;
  판.querySelector('.cmcount').textContent = `${간것} / ${도시들.length}곳`;
  판.querySelector('.cmbar i').style.width =
    도시들.length ? `${Math.round(간것 / 도시들.length * 100)}%` : '0%';
  /* 대륙 · 통화 · 언어 · 시차 — 이미 받아 둔 나라 표에 있는 것만 적습니다.
     ⚠ 없는 칸을 빈칸으로 두면 「· ·」 가 남습니다. 있는 것만 이어 붙입니다. */
  const 나라 = countryInfo[cc] || {};
  판.querySelector('.cmmeta').textContent =
    [나라.continent, 나라.currency, 나라.local_lang, 나라.default_timezone]
      .filter(Boolean).join(' · ');

  /* 떼어낸 먼 곳은 카드 안 칩으로. 없애면 괌이 «사라진» 것이 됩니다. */
  const 먼칸 = 판.querySelector('.cmfar');
  if (결과.먼것.length){
    먼칸.innerHTML = '<span class="cmfarlab">먼 곳</span>' +
      결과.먼것.map(d => `<button type="button" class="cmchip" data-city="${esc(d.c.id)}">` +
        `${esc(d.c.name)}</button>`).join('');
    먼칸.classList.remove('hide');
    먼칸.querySelectorAll('.cmchip').forEach(b => {
      b.onclick = () => 도시열기(cc, b.dataset.city);
    });
  } else {
    먼칸.innerHTML = ''; 먼칸.classList.add('hide');
  }
  지금 = { cc, 결과, 칸, 조각, 도시들 };
}

/* 창이 바뀌면 다시 그립니다(회전·키보드·주소창). 연달아 오므로 한 번만. */
let 다시타이머 = null;
window.addEventListener('resize', () => {
  if (!지금 || !isCountryMapOpen()) return;
  clearTimeout(다시타이머);
  const { cc, 조각, 도시들 } = 지금;
  다시타이머 = setTimeout(() => { if (isCountryMapOpen()) 칠하기(cc, 조각, 도시들); }, 150);
});

/* ── 열기 ─────────────────────────────────────────────────────────────*/
export async function openCountryMap(cc){
  const 도시들 = (cities || []).filter(c => c.cc === cc && 위(c) != null && 경(c) != null);
  if (도시들.length < CMAP_MIN) return false;

  const 판 = 판만들기();
  const 이름 = countryName[cc] || cc;
  판.querySelector('.cmname').textContent = 이름;
  판.querySelector('.cmcount').textContent = '여는 중…';
  깃발넣기(판.querySelector('.cmflag'), cc);
  판.querySelector('.cmbox').innerHTML = '';
  판.classList.remove('hide');
  document.body.classList.add('cmapopen');

  /* ⚠ **자료를 기다리기 «전»에 판을 띄웁니다.** 처음 여는 나라는 파일을
     받아야 하는데(한국 2.2KB), 그 사이 아무 일도 안 일어나면 눌러도 안
     되는 줄 알고 다시 누릅니다. */
  let 조각 = await 나라땅(cc);
  if (!조각 || !조각.length){
    조각 = 성긴땅(cc);            /* 50m 이 없으면 110m 이라도 */
  }
  if (!조각.length){
    /* 지도가 아예 없는 나라입니다. 판을 닫고 카드로 넘깁니다 —
       빈 화면을 띄우느니 하던 대로 하는 편이 낫습니다. */
    닫기(true);
    return false;
  }

  칠하기(cc, 조각, 도시들);

  const 칸 = 판.querySelector('.cmbox');
  칸.onclick = e => {
    if (!지금) return;
    const box = 칸.getBoundingClientRect();
    const { vx, vy, vw, vh } = 지금.결과;
    /* 화면 좌표 → 지도 좌표. viewBox 를 칸 비율에 맞춰 두었으므로 한 줄입니다. */
    const mx = vx + (e.clientX - box.left) / box.width * vw;
    const my = vy + (e.clientY - box.top) / box.height * vh;
    let 고른것 = null, best = Infinity;
    for (const d of 지금.결과.안것){
      const v = Math.hypot(d.x - mx, d.y - my);
      if (v < best){ best = v; 고른것 = d; }
    }
    /* ⚠ **다각형을 맞히지 않습니다.** 50m 해안선도 2~3km 어긋나고, 영역이
       한 손가락보다 좁은 도시도 있습니다. 「가장 가까운 도시」가 언제나
       답이 있고 손가락에 관대합니다. 너무 먼 곳(90px 밖)만 무시합니다. */
    if (고른것 && best * 지금.결과.배 <= 90) 도시열기(지금.cc, 고른것.c.id);
  };

  if (history.state?.t2 !== 'cmap') history.pushState({ t2:'cmap' }, '');
  return true;
}

/* 도시를 누르면 그 도시가 «맨 앞»인 카드 시트를 엽니다.
   ⚠ 시트는 이 판 «위»에 얹힙니다 — 판을 닫지 않습니다. 뒤로가기 한 번이면
     시트만 닫히고 지도로 돌아옵니다(tripview 의 사슬 차례). */
function 도시열기(cc, id){ ctx.나라카드(cc, id); }

export const isCountryMapOpen = () =>
  !!$('cmappane') && !$('cmappane').classList.contains('hide');

export function closeCountryMap(뒤로){ 닫기(뒤로); }

function 닫기(뒤로){
  const 판 = $('cmappane');
  if (!판 || 판.classList.contains('hide')) return;
  판.classList.add('hide');
  document.body.classList.remove('cmapopen');
  지금 = null;
  if (!뒤로 && history.state?.t2 === 'cmap') history.back();
}
