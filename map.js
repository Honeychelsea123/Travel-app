/* ── 세계지도 · 다녀온 국가 ──────────────────────────────────────────
 * 다녀온 곳을 세계지도에 칠하고, 나라별로 모아 보여주는 화면입니다.
 * 손가락으로 밀고 넓히는 것(핀치·휠)도 여기 있습니다.
 *
 * ── app.js 에서 떼어낸 두 번째 조각입니다(b322) ─────────────────────
 * persona.js(b321)와 같은 방식입니다. app.js 를 import 하지 않고,
 * app.js 만 아는 것은 `setMapCtx` 로 받습니다 — 그래야 고리가 안 생깁니다.
 * `me` 는 로그인할 때마다 바뀌므로 값이 아니라 **함수**로 받습니다.
 *
 * 지도 좌표(WORLD_PATHS)는 app.js 진입점이 `#worldland` 에 한 번 넣어둡니다.
 * 여기서는 그 자리에 그려진 것을 읽고 칠하기만 합니다 — 좌표를 두 곳에서
 * 넣으면 화면과 카드가 어긋납니다.
 *
 * 층: dom.js · db.js · cities.js · card.js · net.js 만 씁니다. */
import { $, esc, toast, flagOf, flagOk, emptyDo } from './dom.js?v=b401';
import { openCity } from './city.js?v=b401';
import { distKm } from './calc.js?v=b401';
import { sb } from './db.js?v=b401';
import { cities, countryName, continentOf } from './cities.js?v=b401';
import { PERSONA_ICON, shareCard } from './card.js?v=b401';

/* UN 회원 193 + 옵서버 2. 여행앱들이 쓰는 기준값입니다.
   **app.js 도 씁니다**(발자국 막대) — 두 곳에 적으면 언젠가 한쪽만 고칩니다.
   여기서 내보내고 app.js 가 가져다 씁니다. */
export const UN_COUNTRIES = 195;

let ctx = { me: () => null, loadCities: async () => {} };
export function setMapCtx(o){ ctx = { ...ctx, ...o }; }

/* ── 세계지도와 통계 ─────────────────────────────────────────────────
 * 숫자만 늘어놓으면 아무도 안 봅니다. 지도 위에 얹어야 채우고 싶어집니다.
 *
 * 퍼센트는 국가로만 셉니다. 도시는 우리가 가진 313곳이 분모라
 * "전 세계 도시의 몇 퍼센트"라고 말할 수가 없습니다.
 * 분모는 UN 기준 195개국(회원 193 + 옵서버 2)을 대륙별로 나눈 수입니다. */
const CONT = [['아시아', 48], ['유럽', 44], ['아프리카', 54],
              ['북아메리카', 23], ['남아메리카', 12], ['오세아니아', 14]];
/* 대륙별로 당겨 보는 자리. 가운데와 폭만 정하고 높이는 화면 비율에서 냅니다 —
   그래야 viewBox 비율이 화면과 같아져서 여백 없이 딱 맞고, 손가락 좌표를
   지도 좌표로 바꾸는 계산도 한 줄로 끝납니다. */
const CONT_VIEW = {
  '전체':      { cx:500, cy:212, w:1000 },
  '아시아':    { cx:750, cy:193, w:380 },
  '유럽':      { cx:549, cy:105, w:195 },
  '아프리카':  { cx:544, cy:248, w:225 },
  '북아메리카':{ cx:195, cy:145, w:360 },
  '남아메리카':{ cx:340, cy:307, w:160 },
  '오세아니아':{ cx:897, cy:328, w:215 } };

const px = v => (Number(v) + 180) * (1000 / 360);   /* 경도 → x */
const py = v => (90 - Number(v)) * (500 / 180);     /* 위도 → y */
let mapCities = [];

/* 확대하면 깃발이 같이 커집니다. 화면에서 늘 같은 크기로 보이게 다시 그립니다.
   깃발 원본은 9칸 높이라, 화면에서 원하는 픽셀 크기를 그걸로 나눠 배율을 냅니다. */
function drawPins(){
  const wpx = $('worldsvg').getBoundingClientRect().width || 360;
  const k = 16 / 11 * vb.w / wpx;      /* 깃발 원본이 11칸이라 화면에서 16픽셀쯤 */
  /* 깃대는 아래가 뾰족한 막대, 깃발은 끝이 제비꼬리인 사각형입니다.
     둘 다 모서리를 둥글게 이어 붙여 작게 그려도 뭉개지지 않습니다. */
  const POLE = 'M-.62 .6L0 1.5.62 .6V-10.4H-.62Z';
  const FLAG = 'M.3 -10.5H5.9L4.7 -8.7 5.9 -6.9H.3Z';
  $('pins').innerHTML = mapCities
    .filter(c => c.center_lat != null && c.center_lng != null)
    .map(c => `<g data-pin="${esc(c.id)}" transform="translate(${
        px(c.center_lng).toFixed(1)} ${py(c.center_lat).toFixed(1)}) scale(${k.toFixed(3)})">
        <title>${esc(c.name)}</title>
        <path class="mkpole" d="${POLE}"/>
        <path class="mkflag" d="${FLAG}"/>
      </g>`).join('');
}

/* 보이는 창. 가운데와 폭만 들고 있고 높이는 화면 비율에서 냅니다. */
let vb = { ...CONT_VIEW['전체'] };
const MAP_TOP = 15, MAP_BOT = 410;      /* 남극을 뺀 세로 범위 */

function applyView(){
  const el = $('worldsvg'), r = el.getBoundingClientRect();
  const aspect = (r.width && r.height) ? r.height / r.width : 0.4;
  vb.w = Math.min(1000, Math.max(40, vb.w));        /* 40 이면 도시 하나가 꽉 찹니다 */
  const h = vb.w * aspect;
  /* 세로가 지도보다 길면 위아래에 빈 자리를 둡니다.
     가로를 줄여 맞추던 것이 문제였습니다 — 손가락으로 키워도 여기서 도로
     계산해 버려서 크게 보기에서는 확대가 아예 안 먹었습니다. */
  const span = MAP_BOT - MAP_TOP, mid = (MAP_TOP + MAP_BOT) / 2;
  vb.cx = Math.min(1000 - vb.w / 2, Math.max(vb.w / 2, vb.cx));
  vb.cy = h >= span ? mid
        : Math.min(MAP_BOT - h / 2, Math.max(MAP_TOP + h / 2, vb.cy));
  el.setAttribute('viewBox',
    `${(vb.cx - vb.w / 2).toFixed(1)} ${(vb.cy - h / 2).toFixed(1)} ` +
    `${vb.w.toFixed(1)} ${h.toFixed(1)}`);
  drawPins();
}

function setMapView(name){
  /* 고른 이름을 mapView 에 적어두고 있었는데 **읽는 곳이 한 군데도 없었습니다.**
     대륙 칩을 뺄 때 읽는 쪽만 지우고 쓰는 쪽이 남은 것입니다. 걷어냈습니다. */
  vb = { ...(CONT_VIEW[name] || CONT_VIEW['전체']) };
  applyView();
}
/* 두 번 두드리면 세계 전체로 돌아옵니다. 대륙 칩을 뺐으니 되돌릴 길이 있어야 합니다. */
$('worldsvg').addEventListener('dblclick', () => setMapView('전체'));

/* 크게 보기 — 지도만 화면을 다 덮습니다. 손바닥만 한 지도에서는
   대륙을 파고들며 보기가 어렵습니다. */
/* 큰 지도를 켠 채로 화면을 벗어나면 어두운 판과 단추가 그대로 남아
   앱 전체를 덮어버립니다. 화면을 옮길 때마다 여기서 걷어냅니다. */
export function shutBigMap(){
  document.querySelector('.mapwrap')?.classList.remove('big');
  ['mapclose','mapzoombtns'].forEach(id => $(id)?.remove());
  document.body.classList.remove('sheeton');
}

$('mapbig').addEventListener('click', () => {
  const w = document.querySelector('.mapwrap');
  if (w.classList.contains('big')) return;
  w.classList.add('big');
  document.body.classList.add('sheeton');        /* 뒤가 밀리지 않게 */

  const add = (id, html, css) => {
    const el = document.createElement(id === 'mapzoombtns' ? 'div' : 'button');
    el.id = id; el.innerHTML = html; if (css) el.style.cssText = css;
    document.body.appendChild(el); return el;
  };
  const close = add('mapclose', '닫기');
  const zoom  = add('mapzoombtns',
    '<button data-z="in">+</button><button data-z="out">−</button>' +
    '<button data-z="fit">전체</button>');

  /* 손가락이 안 먹는 기기도 있고 마우스만 있는 화면도 있습니다.
     가운데를 잡고 폭만 줄이거나 늘립니다. */
  zoom.onclick = e => {
    const b = e.target.closest('[data-z]'); if (!b) return;
    if (b.dataset.z === 'fit'){ setMapView('전체'); return; }
    vb.w *= b.dataset.z === 'in' ? 1 / 1.45 : 1.45;
    applyView();
  };
  close.onclick = () => { shutBigMap(); setMapView('전체'); };

  /* 세로로 긴 화면에서 세계 전체를 펼치면 위아래가 텅 빕니다.
     열 때는 빈 곳 없이 꽉 차는 배율에서 시작하고, 전체는 단추로 봅니다. */
  applyView();
  const r = $('worldsvg').getBoundingClientRect();
  const aspect = (r.width && r.height) ? r.height / r.width : .4;
  vb.w = Math.min(1000, (MAP_BOT - MAP_TOP) / aspect);
  vb.cy = (MAP_TOP + MAP_BOT) / 2;
  /* 다녀온 곳이 있으면 그쪽을 가운데 둡니다 — 빈 바다를 보여줄 이유가 없습니다. */
  const xs = mapCities.filter(c => c.center_lng != null).map(c => px(c.center_lng));
  if (xs.length) vb.cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  applyView();
});

/* ── 손가락과 휠 ─────────────────────────────────────────────────────
 * 대륙 칩만으로는 원하는 데를 못 봅니다. 끌어서 옮기고 오므려서 키웁니다.
 * viewBox 비율을 화면 비율과 같게 맞춰뒀으므로 화면 픽셀 하나가
 * 지도 좌표 (폭/화면폭) 만큼입니다 — 변환이 곱셈 한 번입니다. */
{
  const el = $('worldsvg');
  const pts = new Map();          /* 지금 눌린 손가락들 */
  let last = null, moved = 0;

  const perPx = () => vb.w / (el.getBoundingClientRect().width || 1);
  const mid = () => {
    const a = [...pts.values()];
    return { x: a.reduce((s, p) => s + p.x, 0) / a.length,
             y: a.reduce((s, p) => s + p.y, 0) / a.length };
  };
  const spread = () => {
    const a = [...pts.values()];
    return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1;
  };

  el.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, { x:e.clientX, y:e.clientY });
    el.setPointerCapture(e.pointerId);
    el.classList.add('drag');
    moved = 0;
    last = pts.size === 2 ? { ...mid(), d: spread() } : { ...mid(), d: null };
  });

  el.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x:e.clientX, y:e.clientY });
    const m = mid();
    if (!last){ last = { ...m, d: pts.size === 2 ? spread() : null }; return; }

    const k = perPx();
    vb.cx -= (m.x - last.x) * k;         /* 끄는 방향과 지도가 같이 움직여야 합니다 */
    vb.cy -= (m.y - last.y) * k;
    moved += Math.abs(m.x - last.x) + Math.abs(m.y - last.y);

    if (pts.size === 2 && last.d){
      const d = spread();
      vb.w *= last.d / d;                /* 벌리면 폭이 줄고 = 확대 */
      last.d = d;
    }
    last.x = m.x; last.y = m.y;
    applyView();
  });

  const up = e => {
    pts.delete(e.pointerId);
    last = pts.size ? { ...mid(), d: pts.size === 2 ? spread() : null } : null;
    if (!pts.size) el.classList.remove('drag');
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);

  el.addEventListener('wheel', e => {
    e.preventDefault();
    const r = el.getBoundingClientRect(), k = perPx();
    /* 커서가 가리키던 지점이 제자리에 있어야 확대가 자연스럽습니다. */
    const ux = vb.cx + (e.clientX - r.left - r.width / 2) * k;
    const uy = vb.cy + (e.clientY - r.top - r.height / 2) * k;
    const f = e.deltaY > 0 ? 1.2 : 1 / 1.2;
    const before = vb.w;
    vb.w = Math.min(1000, Math.max(40, vb.w * f));
    const s = vb.w / before;
    vb.cx = ux + (vb.cx - ux) * s;
    vb.cy = uy + (vb.cy - uy) * s;
    applyView();
  }, { passive:false });

  /* 끌고 나서 손을 떼는 순간 핀이 눌리면 안 됩니다. */
  el.addEventListener('click', e => {
    if (moved > 8){ e.stopPropagation(); moved = 0; }
  }, true);

  addEventListener('resize', () => {
    if (!$('mappane').classList.contains('hide')) applyView();
  });
}

/* ── 다녀온 국가 ────────────────────────────────────────────────────
 * 사용자 지적: **"국가 눌러서 또 세계지도로 가고, 대륙별로 눌러야 어디 갔는지
 * 알 수 있잖아. 국가별로 어디 갔는지 한눈에 보이는 페이지가 있어야 해."**
 * 맞습니다. 지도 화면의 대륙 펴기는 파고드는 자리이고, 여기는 훑는 자리입니다.
 * 대륙으로 묶되 **나라는 전부 펼쳐 둡니다** — 한눈에 본다는 게 그 뜻입니다.
 *
 * 지도 화면과 같은 자료(my_visited)를 씁니다. 다른 데서 세면 두 화면의
 * 숫자가 언젠가 갈립니다. */
/* flagOk 는 dom.js 로 내렸습니다(b339, 맨 위 import). 짝인 flagOf 도 거기
   있습니다 — 아래에서 같은 계산을 인라인으로 한 번 더 적고 있었습니다. */

export async function openCountries(){
  $('profpane').classList.add('hide');
  $('ctrypane').classList.remove('hide');
  window.scrollTo({ top:0 });
  if (history.state?.t2 !== 'ctry') history.pushState({ t2:'ctry' }, '');

  $('ctrylist').innerHTML = '<div class="card"><div class="empty">' +
    '<span class="load">불러오는 중…</span></div></div>';
  await ctx.loadCities();
  const [vis, mine] = await Promise.all([
    sb.rpc('my_visited'),
    sb.from('city_ratings').select('city_id,stars').eq('user_id', ctx.me().id),
  ]);
  const ids  = new Set((vis.data || []).map(v => v.city_id));
  const list = (cities || []).filter(c => ids.has(c.id));
  const stars = Object.fromEntries((mine.data || [])
    .filter(r => r.stars != null).map(r => [r.city_id, Number(r.stars)]));

  const byC = {};
  list.forEach(c => (byC[c.country] = byC[c.country] || []).push(c));
  const codes = Object.keys(byC);
  $('ctrysum').textContent = `${codes.length}개국 · ${list.length}도시`;

  if (!codes.length){
    $('ctrylist').innerHTML =
      '<div class="card">' +
      emptyDo('아직 다녀온 곳이 없어요.', null, null,
              '도시에 별점을 매기거나 지난 여행을 넣으면 여기 쌓여요.') +
      '</div>';
    return;
  }

  /* 대륙 순서는 지도 화면(CONT)과 같게 둡니다. 두 화면이 다른 순서로
     늘어놓으면 같은 앱처럼 안 읽힙니다. 어디에도 안 걸리는 나라는 맨 뒤. */
  const order = [...CONT.map(([k]) => k), '기타'];
  const groups = {};
  codes.forEach(code => {
    const k = continentOf[code] || '기타';
    (groups[k] = groups[k] || []).push(code);
  });

  /* **나라만 보여줍니다.** 처음엔 나라마다 도시 칩을 다 펴뒀는데, 한국 24곳
     일본 9곳이 붙으니 한 대륙이 화면 두 개가 됐습니다. 사용자 지적:
     "도시 말고 내가 갔던 나라만 보고 싶은 건데."
     나라를 칩으로 촘촘히 깔면 27개국이 한 화면에 들어옵니다.
     도시는 없앤 게 아니라 **한 번 눌러야 나옵니다** — 궁금할 때만 봅니다. */
  const totalOf = Object.fromEntries(CONT);
  const pct = codes.length / UN_COUNTRIES * 100;

  /* **글자만 늘어놓으면 공유할 마음이 안 듭니다.** 국기를 답니다 —
     그림 파일을 스물일곱 장 받아올 필요가 없습니다. 나라 코드 두 글자를
     지역표시기호로 바꾸면 기기가 국기로 그려줍니다(KR → 🇰🇷).
     안 되는 기기에서는 그냥 두 글자가 보입니다 — 깨지지 않습니다. */
  /* **국기를 못 그리는 기기가 있습니다.** 윈도우는 지역표시기호 두 개를
     국기로 합치지 않고 `KR` 처럼 글자 두 개로 그립니다. 그러면 화면이
     "KR JP IT CH LV US…" 코드 나열이 되어 없느니만 못합니다.
     실기기에서 재보고 알았습니다(윈도우 크롬).
     합쳐지는지는 폭으로 압니다 — 합쳐지면 한 글자 폭, 아니면 두 글자 폭. */
  /* 국기 만들기는 dom.js 의 flagOf 하나입니다(b339). 여기 인라인으로
     같은 계산이 적혀 있었습니다 — 두 곳에 두면 언젠가 한쪽만 고칩니다. */
  const flag = code => flagOk() ? flagOf(code) : '';

  const head = `<div class="card ctryhero">
    <div class="big">${codes.length}<i>개국</i></div>
    <div class="sub">${UN_COUNTRIES}개국 중 ${pct.toFixed(1)}% · ${list.length}개 도시</div>
    <div class="track"><i style="width:${Math.min(pct, 100).toFixed(1)}%"></i></div>
    ${flagOk() ? `<div class="flags">${codes
      .sort((a, b) => byC[b].length - byC[a].length)
      .map(c => `<span title="${esc(countryName[c] || c)}">${flag(c)}</span>`).join('')}</div>`
      /* 국기를 못 그리는 기기에서는 대신 나라 수가 많은 순서로 이름을
         몇 개 적습니다. 빈 자리를 남기면 카드가 허전합니다. */
      : `<div class="memo">${esc(codes
          .sort((a, b) => byC[b].length - byC[a].length).slice(0, 6)
          .map(c => countryName[c] || c).join(' · '))}${
          codes.length > 6 ? ` 외 ${codes.length - 6}개국` : ''}</div>`}
    <button class="small" id="ctry_share" style="width:100%; margin-top:14px">
      공유하기</button>
  </div>`;

  $('ctrylist').innerHTML = head + order.filter(k => groups[k]?.length).map(k => {
    const cs = groups[k].sort((a, b) => byC[b].length - byC[a].length
                                     || (countryName[a] || a).localeCompare(countryName[b] || b, 'ko'));
    return `<div class="card">
      <h2><span class="grow">${esc(k)}</span>
        <span class="val">${cs.length}${totalOf[k] ? '/' + totalOf[k] : ''}개국</span></h2>
      <div class="cchips">${cs.map(code =>
        `<button data-ctry="${esc(code)}">${
          flag(code) ? flag(code) + ' ' : ''}${esc(countryName[code] || code)}${
          byC[code].length > 1 ? ` <i>${byC[code].length}</i>` : ''}</button>`).join('')}</div>
      ${cs.map(code => `<div class="hide" data-ctrycity="${esc(code)}"
             style="padding:10px 0 2px; border-top:1px solid var(--line); margin-top:10px">
        <div class="row" style="border:0; padding:0 0 6px; margin:0">
          <span class="label" style="font-weight:600">${
            esc(countryName[code] || code)}</span>
          <span class="val">${byC[code].length}곳</span></div>
        <div class="cchips">${byC[code].map(c =>
          `<button data-pin="${esc(c.id)}">${esc(c.name)}${
            stars[c.id] ? ` ★${stars[c.id]}` : ''}</button>`).join('')}</div>
      </div>`).join('')}
    </div>`;
  }).join('');

  /* 공유 카드. **세계지도를 그대로 씁니다** — 이 페이지에서 제일 자랑스러운
     것은 칠해진 지도이고, 그건 이미 그려져 있습니다(#worldland).
     지도 화면을 한 번도 안 열었으면 비어 있으므로 그때는 국기만 냅니다. */
  $('ctry_share').onclick = () => {
    const land = $('worldland')?.innerHTML || '';
    const top = codes.sort((a, b) => byC[b].length - byC[a].length).slice(0, 3);
    shareCard({
      g:'rare', icon: PERSONA_ICON.globe, sub:'다녀온 나라',
      big: String(codes.length), bigUnit:'개국',
      title:`${UN_COUNTRIES}개국 중 ${pct.toFixed(1)}%`,
      nums:`${list.length}개 도시 · ${Object.keys(groups).length}개 대륙`,
      /* 카드에도 국기를 깔지만, 못 그리는 기기에서는 캔버스에도 못 그립니다 —
         그림 파일로 저장되는 것이라 더 티가 납니다. 그때는 안 넣습니다. */
      note: flagOk() ? codes.map(c => flag(c)).join(' ') : '',
      listTitle: top.length ? '가장 많이 간 곳' : '',
      list: top.map(c => `${countryName[c] || c} ${byC[c].length}곳`),
      artRatio: 387 / 1000,
      art: land ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 19 1000 387">
              <style>path{fill:rgba(255,255,255,.16)} path.been{fill:#fff}</style>
              ${land}</svg>` : '',
    }, 'aitrip-다녀온나라');
  };
}
export function closeCountries(fromPop){
  if (!fromPop && history.state?.t2 === 'ctry'){ history.back(); return; }
  $('ctrypane').classList.add('hide');
  $('profpane').classList.remove('hide');
}
$('ctryback').addEventListener('click', () => closeCountries());
/* 도시 칩을 누르면 그 도시로. 지도 화면과 같은 규칙입니다. */
$('ctrypane').addEventListener('click', e => {
  /* 나라 칩을 누르면 그 나라의 도시가 펴집니다. 다시 누르면 접힙니다.
     **도시 칩보다 먼저 봅니다** — 펴진 도시 칩도 나라 칩 안에 있지 않으므로
     순서 문제는 없지만, 앞으로 겹칠 때를 대비해 좁은 쪽을 먼저 둡니다. */
  const p = e.target.closest('[data-pin]');
  if (p) return openCity(p.dataset.pin);
  const c = e.target.closest('[data-ctry]');
  if (c){
    const box = $('ctrypane').querySelector(
      `[data-ctrycity="${CSS.escape(c.dataset.ctry)}"]`);
    if (box) box.classList.toggle('hide');
    c.classList.toggle('on', box && !box.classList.contains('hide'));
  }
});

export async function openMap(){
  $('profpane').classList.add('hide');
  $('mappane').classList.remove('hide');
  window.scrollTo({ top:0 });
  if (history.state?.t2 !== 'map') history.pushState({ t2:'map' }, '');

  await ctx.loadCities();
  const [vis, mine] = await Promise.all([
    sb.rpc('my_visited'),
    sb.from('city_ratings').select('city_id,stars').eq('user_id', ctx.me().id)
  ]);
  const ids = new Set((vis.data || []).map(v => v.city_id));
  mapCities = (cities || []).filter(c => ids.has(c.id));
  const stars = Object.fromEntries((mine.data || [])
    .filter(r => r.stars != null).map(r => [r.city_id, Number(r.stars)]));

  /* 다녀온 나라를 칠합니다. 싱가포르나 홍콩처럼 이 축척에서 면이 없는 곳은
     칠할 자리가 없어 핀으로만 보입니다. */
  const gone = new Set(mapCities.map(c => c.country));
  document.querySelectorAll('#worldland path').forEach(p =>
    p.classList.toggle('been', gone.has(p.dataset.c)));
  setMapView('전체');

  /* ── 전체 ── */
  const conts = new Set(mapCities.map(c => continentOf[c.country]).filter(Boolean));
  const pct = gone.size / UN_COUNTRIES * 100;
  $('m_total').innerHTML =
    `<div class="stats" style="margin:0">
       <button style="cursor:default"><b>${gone.size}</b><span>국가</span></button>
       <button style="cursor:default"><b>${mapCities.length}</b><span>도시</span></button>
       <button style="cursor:default"><b>${conts.size}/6</b><span>대륙</span></button>
     </div>
     <div class="memo" style="text-align:center; margin-top:10px">
       ${UN_COUNTRIES}개국 중 <b>${gone.size}개국</b> · ${pct.toFixed(1)}%</div>
     <div class="fp"><i style="width:${Math.max(pct, 1.2).toFixed(1)}%"></i></div>
     <button class="ghost" id="fp_img" style="width:100%; margin-top:12px">
       공유하기</button>`;

  /* ── 발자국을 카드로 ──────────────────────────────────────────────
     **여기가 이 앱에서 제일 내보이고 싶은 그림입니다.** 성향 카드보다
     "몇 개국 다녀왔다"가 훨씬 자랑거리라, 공유가 유입으로 이어질 자리는
     여기입니다. 그런데 여태 공유가 아예 없었습니다.
     지도는 **화면에 그려져 있는 것을 그대로 빌려 씁니다** — 어느 나라를
     칠할지 다시 정하면 화면과 어긋납니다. 위에서 이미 .been 을 붙여뒀습니다.
     칠은 카드 배경(남색→보라) 위에 얹히므로 흰색 두 단계로만 씁니다. */
  $('fp_img').onclick = () => shareCard({
    g:'rare', icon: PERSONA_ICON.globe, sub:'내 발자국',
    title:`${gone.size}개국`,
    nums:`${UN_COUNTRIES}개국 중 ${pct.toFixed(1)}%`,
    note:`${mapCities.length}개 도시 · ${conts.size}개 대륙`,
    artRatio: 387 / 1000,
    art: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 19 1000 387">
            <style>path{fill:rgba(255,255,255,.16)}
                   path.been{fill:#fff}</style>
            ${$('worldland').innerHTML}</svg>`,
  }, 'aitrip-발자국');

  /* ── 대륙별 ── 퍼센트는 국가로만 셉니다 ── */
  /* **막대만 있고 어느 나라인지가 없었습니다.** "유럽 19/44국"을 보고 나면
     바로 드는 생각이 "어느 19개국이지?"인데 답할 자리가 없었습니다.
     아래 국가별 목록은 **도시**가 주인공이라 나라를 세려면 눈으로 세야 했습니다.
     줄을 누르면 그 대륙의 국가 이름이 펴집니다 — 한 겹 안에 두는 이유는
     여섯 대륙을 다 펴두면 그 카드가 화면 몇 개가 되기 때문입니다. */
  $('m_cont').innerHTML = CONT.map(([k, total]) => {
    const cs = mapCities.filter(c => continentOf[c.country] === k);
    const ns = [...new Set(cs.map(c => c.country))]
      .sort((a, b) => (countryName[a] || a).localeCompare(countryName[b] || b, 'ko'));
    const p = ns.length / total * 100;
    return `<div class="crow" data-cont="${esc(k)}" data-zoom="${esc(k)}">
      <span class="nm">${esc(k)}</span>
      <span class="bar"><i style="width:${p.toFixed(1)}%"></i></span>
      <span class="n">${ns.length}/${total}국 · ${cs.length}곳</span></div>` +
      `<div class="cchips hide" data-contlist="${esc(k)}"
            style="padding:0 0 10px">${
        ns.length ? ns.map(code => `<button data-czoom="${esc(code)}">${
            esc(countryName[code] || code)} ${
            cs.filter(c => c.country === code).length}</button>`).join('')
          : '<span class="memo">아직 없어요</span>'}</div>`;
  }).join('');

  /* ── 국가별 ── 많이 간 나라부터 ── */
  const byC = {};
  mapCities.forEach(c => (byC[c.country] = byC[c.country] || []).push(c));
  const order = Object.entries(byC).sort((a, b) => b[1].length - a[1].length);
  $('m_country').innerHTML = order.length
    ? order.map(([code, cs]) => `<div style="padding:9px 0; border-top:1px solid var(--line)">
        <div class="row" style="border:0; padding:0; margin:0">
          <span class="label" style="font-weight:600">${
            esc(countryName[code] || code)}</span>
          <span class="val">${cs.length}곳</span></div>
        <div class="cchips">${cs.map(c =>
          `<button data-pin="${esc(c.id)}">${esc(c.name)}${
            stars[c.id] ? ` ★${stars[c.id]}` : ''}</button>`).join('')}</div>
      </div>`).join('')
    : emptyDo('아직 다녀온 곳이 없어요.', null, null,
              '도시에 별점을 매기면 그 나라가 칠해져요.');

  /* ── 기록 ── 숫자를 곱씹게 만드는 자리 ── */
  const withPos = mapCities.filter(c => c.center_lat != null);
  const north = withPos.reduce((a, c) => !a || c.center_lat > a.center_lat ? c : a, null);
  const south = withPos.reduce((a, c) => !a || c.center_lat < a.center_lat ? c : a, null);
  /* 다녀온 도시 가운데 가장 멀리 떨어진 두 곳. 313곳이라 다 재도 금방입니다. */
  let far = null;
  for (let i = 0; i < withPos.length; i++)
    for (let j = i + 1; j < withPos.length; j++){
      const d = distKm(withPos[i].center_lat, withPos[i].center_lng,
                       withPos[j].center_lat, withPos[j].center_lng);
      if (!far || d > far.d) far = { d, a: withPos[i], b: withPos[j] };
    }
  const sv = Object.entries(stars).filter(([id]) => ids.has(id)).map(([, v]) => v);
  const avg = sv.length ? sv.reduce((a, b) => a + b, 0) / sv.length : null;
  const rows = [
    ['가장 많이 간 국가', order.length
      ? `${countryName[order[0][0]] || order[0][0]} · ${order[0][1].length}곳` : '–'],
    ['가장 북쪽', north ? north.name : '–'],
    ['가장 남쪽', south ? south.name : '–'],
    ['가장 먼 두 도시', far
      ? `${far.a.name} ~ ${far.b.name} · ${Math.round(far.d).toLocaleString()}km` : '–'],
    ['내 별점 평균', avg != null ? `★ ${avg.toFixed(2)}` : '–'],
    ['별 다섯을 준 곳', String(sv.filter(v => v === 5).length) + '곳'],
  ];
  $('m_fun').innerHTML = rows.map(([k, v]) =>
    `<div class="row"><span class="label">${esc(k)}</span>
       <span class="val" style="color:var(--ink); font-weight:600">${esc(v)}</span></div>`)
    .join('');
}

export function closeMap(fromPop){
  if (!fromPop && history.state?.t2 === 'map'){ history.back(); return; }
  shutBigMap();
  $('mappane').classList.add('hide');
  $('profpane').classList.remove('hide');
}
$('openmap').addEventListener('click', openMap);

/* 앱 자체를 권하는 자리. 여행 초대(그 여행에 들어오는 것)와는 다릅니다.
   휴대폰은 기본 공유창을 띄우고, 안 되는 브라우저는 주소만 복사합니다. */
/* 잠깐 뜨는 알림. 아이콘 버튼이라 글자를 바꿔 알릴 자리가 없습니다. */
/* toast 는 dom.js 로 옮겼습니다 (맨 위 import) — net.js 도 씁니다. */

$('shareapp').addEventListener('click', async () => {
  const url  = location.origin + location.pathname;
  /* ⚠ **앞뒤가 뒤집혀 있었습니다(b397).** 'AI가 여행 일정을 짜주고…' 였습니다.
     그런데 이 단추가 있는 자리가 **발자국 지도**입니다 — 평가로 만들어진
     것을 보다가 앱을 권하는데 일정 이야기가 먼저 나갔습니다.
     밖으로 퍼지는 것(성향 카드·발자국·영수증)은 전부 평가에서 나옵니다.
     index.html 의 og 와 **같은 말을 해야 합니다** — 한쪽만 고치면 같은 앱이
     두 가지로 소개됩니다. */
  const text = '다녀온 도시를 매기면 16가지 중 내 여행 성향이 나와요. 일정도 여기서 짜요.';
  const msg  = `${text}\n${url}`;

  /* 휴대폰은 기본 공유창을 씁니다. */
  if (navigator.share){
    try { await navigator.share({ title:'기로', text, url }); return; }
    catch (e){ if (e?.name === 'AbortError') return; }   /* 닫은 것은 실패가 아닙니다 */
  }
  /* 클립보드는 창이 포커스를 잃었거나 권한이 없으면 그냥 거절합니다.
     "복사하지 못했습니다"가 그래서 떴습니다. 옛 방식으로 한 번 더 해봅니다. */
  let ok = false;
  try { await navigator.clipboard.writeText(msg); ok = true; } catch {}
  if (!ok){
    try {
      const t = document.createElement('textarea');
      t.value = msg;
      t.style.cssText = 'position:fixed; top:-9999px; opacity:0';
      document.body.appendChild(t); t.select();
      ok = document.execCommand('copy');
      t.remove();
    } catch {}
  }
  /* 그래도 안 되면 주소를 눈앞에 띄워 직접 복사하게 합니다.
     실패했다고만 하고 끝나면 할 수 있는 것이 없습니다. */
  toast(ok ? '주소를 복사했어요' : url);
});
$('mapback').addEventListener('click', () => closeMap());

$('mappane').addEventListener('click', e => {
  /* 대륙 줄을 누르면 그 대륙의 국가 이름이 펴집니다. 지도도 그리로 당깁니다 —
     둘 다 "이 대륙을 보고 싶다"는 같은 뜻이라 한 번에 합니다.
     **국가 칩(data-czoom)이 먼저입니다** — 칩은 대륙 줄 밖에 있지만
     아래 data-zoom 이 그 위를 먼저 잡으면 칩이 안 눌립니다. */
  const cz = e.target.closest('[data-czoom]');
  if (cz){
    /* 그 나라의 도시들을 아래 '국가별' 목록에서 찾아 보여줍니다.
       지도를 나라 단위로 당기는 것은 setMapView 가 대륙까지만 알아서
       지금은 못 합니다 — 대륙으로만 당기고 목록으로 데려갑니다. */
    setMapView(continentOf[cz.dataset.czoom] || '전체');
    $('m_country')?.scrollIntoView({ behavior:'smooth', block:'start' });
    return;
  }
  const row = e.target.closest('[data-cont]');
  if (row){
    const list = $('mappane').querySelector(
      `[data-contlist="${CSS.escape(row.dataset.cont)}"]`);
    if (list) list.classList.toggle('hide');
  }
  const z = e.target.closest('[data-zoom]');
  if (z) return setMapView(z.dataset.zoom);
  const p = e.target.closest('[data-pin]');
  if (p) return openCity(p.dataset.pin);
});

/* 톱니를 누르면 설정, 뒤로 누르면 프로필. 설정을 프로필에 다 늘어놓으면
   정작 보러 온 숫자가 아래로 밀립니다. */
