/* ── 분석 탭 ─────────────────────────────────────────────────────────
 * **이 앱의 가장 큰 무기가 사는 곳입니다(b439 신설 · b447 채움).**
 * 전에는 성향 카드가 프로필 → 「여행 성향」 → 「보기」로 **두 번 들어가야**
 * 나왔습니다. 앱 얼굴이 「나는 어떤 여행자일까」인데 그 답이 제일 깊은
 * 곳에 있었습니다.
 *
 * ⚠ **화면을 새로 만들지 않습니다.** 성향 카드(persona.js)와 세계지도
 *   (map.js)는 이미 있고 잘 돕니다. 여기는 **들어가기 전에 보는 요약**이고,
 *   누르면 그 화면으로 보냅니다. 카드를 여기서 또 그리면 두 벌이 되어
 *   언젠가 갈라집니다(card.js 머리말과 같은 이유).
 *
 * ⚠ **문턱은 5곳입니다.** persona.js · try.js 와 같은 값이어야 합니다 —
 *   여기서만 낮추면 "성향 보기" 를 눌렀는데 "아직" 이 나옵니다.
 *
 * 층: dom.js · db.js · cities.js · card.js · map.js 만 씁니다.
 *     app.js 는 import 하지 않습니다 — ctx 로 받습니다(persona.js 머리말). */
import { $, esc } from './dom.js?v=b447';
import { sb } from './db.js?v=b447';
import { cities, continentOf } from './cities.js?v=b447';
import { personaAxes, personaRank, PERSONA16, AXIS_NAME } from './card.js?v=b447';
import { UN_COUNTRIES, CONT } from './map.js?v=b447';

let ctx = { me: () => null, showApp: () => {} };
export function setAnalCtx(o){ ctx = { ...ctx, ...o }; }

const 문턱 = 5;

/* 줄 하나. 홈·프로필과 **같은 부품**(.fprow)입니다 — 새로 만들면 리듬이
   또 갈립니다(app.css 의 「내가 쌓은 것」 주석). */
function 줄(제목, 밑, 오른쪽, 눌렀을때){
  const el = document.createElement('div');
  el.className = 'fprow';
  el.innerHTML = `<span class="t"><b>${esc(제목)}</b><span>${esc(밑)}</span></span>
    <span class="go">${esc(오른쪽)} ›</span>`;
  el.onclick = 눌렀을때;
  return el;
}

export async function loadAnal(){
  const box = $('analbox');
  if (!box || !ctx.me()) return;

  /* ⚠ **제 질의를 합니다.** `myRates` 는 평가 탭을 열어야 채워집니다 —
     분석 탭만 열고 온 사람에게는 비어 있습니다(home.js 의 renderFoot 에서
     겪은 것과 같은 함정). */
  const [{ data: f }, 별점] = await Promise.all([
    sb.rpc('my_footprint'),
    sb.from('city_ratings').select('city_id,stars')
      .eq('user_id', ctx.me().id).not('stars', 'is', null),
  ]);

  const 매긴것 = 별점?.data || [];
  const 나라 = f?.countries ?? 0;
  const pct = Math.min(100, 나라 / UN_COUNTRIES * 100);
  box.innerHTML = '';

  /* ── ① 성향 ── 이 탭의 주인공 ────────────────────────────────────
     문턱을 넘었으면 **네 축을 막대로** 펼칩니다. 한 줄짜리 「FMDP ›」로는
     무엇을 보러 온 탭인지 안 읽힙니다 — 들어오자마자 내가 어떤 사람인지
     보여야 합니다. 못 넘었으면 빈손으로 돌려보내지 않고 몇 곳 남았는지
     적습니다(persona.js 의 「문턱은 벽이 아니라 눈금입니다」와 같은 태도). */
  const 성향 = document.createElement('div');
  성향.className = 'card quiet';
  if (매긴것.length >= 문턱){
    const ax = personaAxes(매긴것, { cities });
    const 유형 = PERSONA16[ax.code];
    const 나라수 = new Set(매긴것
      .map(r => (cities || []).find(c => c.id === r.city_id)?.country)
      .filter(Boolean)).size;
    성향.appendChild(줄('내 성향',
      유형 ? `${ax.code} ${유형.n}` : ax.code,
      personaRank(나라수),
      () => { ctx.showApp('set'); $('openpersona')?.click(); }));

    const 값 = [ax.개척, ax.단골, ax.모험, ax.만족];
    const 막대 = document.createElement('div');
    막대.className = 'axbars';
    막대.innerHTML = AXIS_NAME.map((n, i) => `
      <div class="axrow"><span class="axn">${esc(n)}</span>
        <span class="axbar"><i style="width:${Math.max(값[i], 2)}%"></i></span>
        <span class="axv">${값[i]}</span></div>`).join('');
    /* ⚠ 막대는 **보기만** 합니다. 누르는 것은 위 줄 하나로 충분합니다 —
       같은 곳으로 가는 입구가 둘이면 어느 쪽이 무엇인지 헷갈립니다. */
    성향.appendChild(막대);
  } else {
    성향.appendChild(줄('내 성향',
      `${문턱 - 매긴것.length}곳만 더 매기면 유형이 나와요`, '매기러 가기',
      () => ctx.showApp('rate')));
  }
  box.appendChild(성향);

  /* ── ② 발자국 ── 지도를 바로 보여줍니다 ──────────────────────────
     ⚠ 홈에도 지도가 있습니다(사용자 결정 — 중복을 알고 둡니다).
       been 도 홈에 지도가 있고 Visualize 탭에 더 많은 시각화가 있습니다. */
  const 발 = document.createElement('div');
  발.className = 'card quiet';
  발.appendChild(줄('내 발자국',
    나라 ? `${UN_COUNTRIES}개국 중 ${나라}개국 · ${pct.toFixed(1)}%`
         : '별점을 매기면 여기에 쌓여요',
    '지도', () => { ctx.showApp('set'); $('openmap')?.click(); }));

  const mm = document.createElement('div');
  mm.className = 'minimap';
  mm.style.cursor = 'pointer';
  /* 홈과 **같은 viewBox** 입니다(home.js 의 「왜 이 viewBox 인가」 참고) —
     대륙에 딱 맞추고 아무 나라도 안 자릅니다. */
  mm.innerHTML = `<svg viewBox="20 16 976 392"
    preserveAspectRatio="xMidYMid meet">${$('worldland').innerHTML}</svg>`;
  const gone = new Set((cities || [])
    .filter(c => 매긴것.some(r => r.city_id === c.id)).map(c => c.country));
  mm.querySelectorAll('path').forEach(p =>
    p.classList.toggle('been', gone.has(p.dataset.c)));
  mm.onclick = () => { ctx.showApp('set'); openMapSafe(); };
  발.appendChild(mm);

  /* 대륙별 진행도. 지도만 있으면 "얼마나 남았나" 가 안 보입니다 —
     칠할 곳이 어디인지 알려주는 것이 다음 여행을 만듭니다. */
  const 대륙셈 = {};
  (cities || []).forEach(c => {
    if (!gone.has(c.country)) return;
    const k = continentOf[c.country]; if (!k) return;
    (대륙셈[k] = 대륙셈[k] || new Set()).add(c.country);
  });
  const 대륙 = document.createElement('div');
  대륙.className = 'contbars';
  대륙.innerHTML = CONT.map(([이름, 전체]) => {
    const n = 대륙셈[이름]?.size || 0;
    return `<div class="axrow"><span class="axn">${esc(이름)}</span>
      <span class="axbar"><i style="width:${(n / 전체 * 100).toFixed(1)}%"></i></span>
      <span class="axv">${n}/${전체}</span></div>`;
  }).join('');
  발.appendChild(대륙);
  box.appendChild(발);
}

/* 지도를 여는 길. `openMap` 을 직접 import 하면 map.js ↔ anal.js 고리가
   생기지는 않지만(map 은 anal 을 모릅니다), 단추를 누르는 쪽이 이미 있어
   그것을 씁니다 — 여는 절차가 두 벌이 되지 않게. */
function openMapSafe(){ $('openmap')?.click(); }
