/* ── 분석 탭 ─────────────────────────────────────────────────────────
 * **이 앱의 가장 큰 무기가 사는 곳입니다(b439).**
 * 전에는 성향 카드가 프로필 → 「여행 성향」 → 「보기」로 **두 번 들어가야**
 * 나왔습니다. 앱 얼굴이 「나는 어떤 여행자일까」인데 그 답이 제일 깊은
 * 곳에 있었습니다. 탭으로 올렸습니다.
 *
 * ⚠ **화면을 새로 만들지 않습니다.** 성향 카드(persona.js)와 세계지도
 *   (map.js)는 이미 있고 잘 돕니다. 여기는 **그 둘로 가는 입구**이고,
 *   들어가기 전에 볼 요약만 그립니다. 카드를 여기서 또 그리면 두 벌이
 *   되어 언젠가 갈라집니다(card.js 머리말과 같은 이유).
 *
 * ⚠ **문턱은 5곳입니다.** persona.js · try.js 와 같은 값이어야 합니다 —
 *   여기서만 낮추면 "성향 보기" 를 눌렀는데 "아직" 이 나옵니다.
 *
 * 층: dom.js · db.js · cities.js · card.js · map.js 만 씁니다.
 *     app.js 는 import 하지 않습니다 — ctx 로 받습니다(persona.js 머리말). */
import { $, esc } from './dom.js?v=b443';
import { sb } from './db.js?v=b443';
import { cities } from './cities.js?v=b443';
import { personaAxes, personaRank, PERSONA16 } from './card.js?v=b443';
import { UN_COUNTRIES } from './map.js?v=b443';

let ctx = { me: () => null, showApp: () => {} };
export function setAnalCtx(o){ ctx = { ...ctx, ...o }; }

const 문턱 = 5;

/* 줄 하나. 프로필·홈과 **같은 부품**(.fprow)입니다 — 새로 만들면 리듬이
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

  /* ⚠ **제 질의를 합니다.** `myRates` 는 기록 탭을 열어야 채워집니다 —
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

  /* ── 성향이 주인공입니다 ──────────────────────────────────────────
     문턱을 넘었으면 유형을 크게 보여주고, 못 넘었으면 **몇 곳 남았는지**를
     그 자리에 적습니다. 빈손으로 돌려보내지 않습니다(persona.js 의
     「문턱은 벽이 아니라 눈금입니다」와 같은 태도). */
  const 카드 = document.createElement('div');
  카드.className = 'card quiet';
  if (매긴것.length >= 문턱){
    const ax = personaAxes(매긴것, { cities });
    const 유형 = PERSONA16[ax.code];
    const 나라수 = new Set(매긴것
      .map(r => (cities || []).find(c => c.id === r.city_id)?.country)
      .filter(Boolean)).size;
    카드.appendChild(줄('내 성향',
      유형 ? `${ax.code} ${유형.n}` : ax.code,
      personaRank(나라수),
      () => { ctx.showApp('set'); $('openpersona')?.click(); }));
  } else {
    const 남은 = 문턱 - 매긴것.length;
    카드.appendChild(줄('내 성향',
      `${남은}곳만 더 매기면 유형이 나와요`, '매기러 가기',
      () => ctx.showApp('rate')));
  }
  카드.appendChild(줄('세계지도',
    나라 ? `${UN_COUNTRIES}개국 중 ${나라}개국 · ${pct.toFixed(1)}%`
         : '별점을 매기면 여기에 쌓여요',
    '보기', () => { ctx.showApp('set'); $('openmap')?.click(); }));
  box.appendChild(카드);
}
