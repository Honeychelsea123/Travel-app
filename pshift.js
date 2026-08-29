/* ── 성향이 바뀌면 알려주기(b526) ──────────────────────────────────────
 * **락인에서 마지막까지 빠져 있던 것**입니다. 평가는 하루에 몰아 하고
 * 끝낼 수 있어서, 이 앱에는 **주기적으로 다시 열 이유**가 없었습니다.
 * 후보가 둘이었는데(다녀온 뒤 알림 · 성향 변화 알림) 이쪽을 골랐습니다 —
 * 코드가 실제로 바뀌는 **사건**이라 지어낼 필요가 없고, 재는 함수도
 * 이미 있습니다(card.js 의 personaAxes).
 *
 * ⚠ **푸시가 아닙니다.** 푸시는 일행 기능이 실제로 쓰인 뒤에 켜기로 한
 *   것이라(상용화 메모), 지금은 **앱을 열었을 때 홈 맨 위에 한 번** 뜹니다.
 * ⚠ **처음 본 코드는 알리지 않습니다.** 「바뀌었다」는 견줄 것이 있어야
 *   성립합니다 — 첫 계산은 조용히 적어만 둡니다.
 * ⚠ **한 번 알린 코드는 다시 안 알립니다.** 알리는 즉시 적어 둡니다 —
 *   닫든 안 닫든, 홈을 다시 그려도 같은 말을 두 번 하지 않습니다.
 * ⚠ 기기마다 따로 셉니다(localStorage). 계정에 두려면 표가 하나 필요한데,
 *   두 기기에서 한 번씩 보는 것은 나쁜 일이 아니라 그냥 둡니다.
 */
import { $, esc } from './dom.js?v=b526';
import { sb } from './db.js?v=b526';
import { netTimeout } from './net.js?v=b526';
import { cities } from './cities.js?v=b526';
import { personaAxes, PERSONA16 } from './card.js?v=b526';

let ctx = { me: () => null, 열기: () => {} };
export function setShiftCtx(o){ ctx = { ...ctx, ...o }; }

const KEY = 't2:pcode';
/* 성향이 서는 문턱. persona.js · try.js · anal.js 와 **같은 값**이어야
   합니다 — 여기만 낮으면 아직 유형이 없는 사람에게 「바뀌었다」고 합니다. */
const 문턱 = 5;

const 읽기 = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
const 쓰기 = v => { try { localStorage.setItem(KEY, v); } catch {} };

/* 로그아웃할 때 지웁니다 — 같은 기기에서 계정을 바꾸면 앞사람 코드와
   견주게 됩니다(별점을 비우는 것과 같은 이유, app.js 의 clearRates). */
export function clearPcode(){ try { localStorage.removeItem(KEY); } catch {} }

/* ── 재고, 바뀌었으면 알린다 ──────────────────────────────────────────
 * 홈이 다 그려진 뒤에 부릅니다. **화면을 막지 않습니다** — 늦게 와서
 * 맨 위에 한 줄 얹히는 편이, 이것 때문에 홈이 늦게 뜨는 것보다 낫습니다.
 * ⚠ 못 받아오면 **아무 일도 안 합니다.** 반쯤 아는 상태로 「바뀌었다」고
 *   말하면 안 됩니다 — 끊긴 것이지 바뀐 것이 아닙니다. */
export async function checkPersonaShift(){
  const me = ctx.me();
  if (!me) return;
  const r = await netTimeout(sb.from('city_ratings')
    .select('city_id,stars').eq('user_id', me.id).not('stars', 'is', null));
  if (!r || r.error || !Array.isArray(r.data)) return;
  if (r.data.length < 문턱) return;

  const ax = personaAxes(r.data, { cities });
  const 지금 = ax?.code;
  if (!지금 || 지금.length !== 4) return;

  const 전 = 읽기();
  쓰기(지금);                       /* 먼저 적습니다 — 두 번 말하지 않으려고 */
  if (!전 || 전 === 지금) return;   /* 처음이거나 그대로면 조용히 */
  그리기(전, 지금);
}

function 그리기(전, 지금){
  const 홈 = $('home');
  if (!홈 || 홈.querySelector('.pshift')) return;
  const 앞 = PERSONA16[전]?.n || '', 뒤 = PERSONA16[지금]?.n || '';

  const 칸 = document.createElement('div');
  칸.className = 'card pshift';
  칸.innerHTML = `
    <div class="psh-t">성향이 바뀌었어요</div>
    <div class="psh-row">
      <span class="psh-old"><b>${esc(전)}</b><span>${esc(앞)}</span></span>
      <i class="psh-ar">→</i>
      <span class="psh-new"><b>${esc(지금)}</b><span>${esc(뒤)}</span></span>
    </div>
    <div class="memo">최근에 매긴 곳들이 그렇게 말해요.</div>
    <div class="psh-btns">
      <button class="primary psh-go">뭐가 달라졌는지 보기</button>
      <button class="small psh-x">닫기</button>
    </div>`;
  칸.querySelector('.psh-x').onclick = () => 칸.remove();
  칸.querySelector('.psh-go').onclick = () => { 칸.remove(); ctx.열기(); };
  홈.prepend(칸);
}
