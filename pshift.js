/* ── 성향이 바뀌면 알려주기(b526) ──────────────────────────────────────
 * **락인에서 마지막까지 빠져 있던 것**입니다. 평가는 하루에 몰아 하고
 * 끝낼 수 있어서, 이 앱에는 **주기적으로 다시 열 이유**가 없었습니다.
 * 후보가 둘이었는데(다녀온 뒤 알림 · 성향 변화 알림) 이쪽을 골랐습니다 —
 * 코드가 실제로 바뀌는 **사건**이라 지어낼 필요가 없고, 재는 함수도
 * 이미 있습니다(card.js 의 personaAxes).
 *
 * ⚠ **푸시가 아닙니다.** 푸시는 일행 기능이 실제로 쓰인 뒤에 켜기로 한
 *   것이라(상용화 메모), 지금은 **앱을 열었을 때 홈 맨 위에** 뜹니다.
 * ⚠ **처음 본 코드는 알리지 않습니다.** 「바뀌었다」는 견줄 것이 있어야
 *   성립합니다 — 첫 계산은 조용히 적어만 둡니다.
 * ⚠ 기기마다 따로 셉니다(localStorage). 계정에 두려면 표가 하나 필요한데,
 *   두 기기에서 한 번씩 보는 것은 나쁜 일이 아니라 그냥 둡니다.
 *
 * ── 언제 적는가 ── 여기서 두 번 틀렸습니다 ───────────────────────────
 * ⚠⚠ **b526: 그리기 «전» 에 적었습니다.** 홈이 한 번 더 그려지며 카드가
 *   지워지면, 이미 적힌 코드와 견주니 「그대로」가 되어 **영영 다시 안
 *   떴습니다.** 저장된 코드는 새 것인데 화면에는 아무것도 없었습니다.
 * ⚠⚠ **b527: 그린 «직후» 에 적었습니다. 이것도 같은 이유로 안 됩니다** —
 *   그리는 것과 **사용자가 보는 것**은 다른 일입니다. 홈은 그 뒤에도
 *   다시 그려지고, 그때 카드는 지워지는데 코드는 이미 적혀 있습니다.
 *   (실측: 저장 FMDP, 화면 아무것도 없음. 두 판 연속 같은 증상.)
 * ⚠⚠ **b528: 사용자가 «치울 때» 적습니다.** 「닫기」나 「보러 가기」를
 *   누르는 것이 곧 봤다는 증거입니다. 그전까지는 홈을 그릴 때마다 다시
 *   붙습니다 — 그게 「다시 열 이유」의 뜻이기도 합니다.
 */
import { $, esc } from './dom.js?v=b683';
import { sb } from './db.js?v=b683';
import { netTimeout } from './net.js?v=b683';
import { cities } from './cities.js?v=b683';
import { personaAxes, PERSONA16 } from './card.js?v=b683';

let ctx = { me: () => null, 열기: () => {} };
export function setShiftCtx(o){ ctx = { ...ctx, ...o }; }

/* ⚠⚠ **계정마다 따로 적습니다(b529).** 처음엔 열쇠 하나(`t2:pcode`)에
   적고 로그아웃·로그인에 지웠는데, **지우는 줄을 로그인 쪽에도 넣어서**
   앱을 열 때마다 기준이 사라졌습니다 — 늘 「처음 본 코드」가 되어 알림이
   영영 안 떴습니다(실측: 씨앗을 심어도 저장값이 새 코드로만 남음).
   계정 id 를 열쇠에 넣으면 지울 일이 아예 없습니다. 같은 기기에서 계정을
   바꿔도 서로 안 섞입니다. */
const KEY = uid => 't2:pcode:' + uid;
/* 성향이 서는 문턱. persona.js · try.js · anal.js 와 **같은 값**이어야
   합니다 — 여기만 낮으면 아직 유형이 없는 사람에게 「바뀌었다」고 합니다. */
const 문턱 = 5;

const 읽기 = uid => { try { return localStorage.getItem(KEY(uid)) || ''; } catch { return ''; } };
const 쓰기 = (uid, v) => { try { localStorage.setItem(KEY(uid), v); } catch {} };

/* 아직 안 치운 알림. 홈을 다시 그려도 이것이 남아 있으면 다시 붙습니다. */
let 대기 = null;

/* 로그아웃하면 화면에 남은 알림만 버립니다. **적어둔 코드는 안 지웁니다** —
   계정 id 로 갈라 두어서 서로 안 섞이고, 다시 들어왔을 때 견줄 기준이
   남아 있는 편이 맞습니다. */
export function clearPcode(){ 대기 = null; }

/* ── 재고, 바뀌었으면 알린다 ──────────────────────────────────────────
 * 홈이 다 그려진 뒤에 부릅니다. **화면을 막지 않습니다** — 늦게 와서
 * 맨 위에 한 줄 얹히는 편이, 이것 때문에 홈이 늦게 뜨는 것보다 낫습니다.
 * ⚠ 못 받아오면 **아무 일도 안 합니다.** 반쯤 아는 상태로 「바뀌었다」고
 *   말하면 안 됩니다 — 끊긴 것이지 바뀐 것이 아닙니다.
 * ⚠ 이미 잡아둔 알림이 있으면 **다시 묻지 않고 붙이기만** 합니다.
 *   홈은 자주 다시 그려집니다 — 그때마다 질의를 보내면 안 됩니다. */
export async function checkPersonaShift(){
  if (대기) return 그리기();
  const me = ctx.me();
  if (!me) return;
  const r = await netTimeout(sb.from('city_ratings')
    .select('city_id,stars').eq('user_id', me.id).not('stars', 'is', null));
  if (!r || r.error || !Array.isArray(r.data)) return;
  if (r.data.length < 문턱) return;

  const ax = personaAxes(r.data, { cities });
  const 지금 = ax?.code;
  if (!지금 || 지금.length !== 4) return;

  const 전 = 읽기(me.id);
  if (!전){ 쓰기(me.id, 지금); return; }   /* 처음 본 코드는 견줄 기준일 뿐입니다 */
  if (전 === 지금) return;
  대기 = { 전, 지금, uid: me.id };
  그리기();
}

/* 치웠다 = 봤다. 그때 적습니다(위 머리말의 b528). */
function 치움(){
  if (대기) 쓰기(대기.uid, 대기.지금);
  대기 = null;
}

function 그리기(){
  const 홈 = $('home');
  if (!홈 || !대기 || 홈.querySelector('.pshift')) return;
  const { 전, 지금 } = 대기;
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
  칸.querySelector('.psh-x').onclick = () => { 칸.remove(); 치움(); };
  칸.querySelector('.psh-go').onclick = () => { 칸.remove(); 치움(); ctx.열기(); };
  홈.prepend(칸);
}
