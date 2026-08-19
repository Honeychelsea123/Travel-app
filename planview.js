/* ── 일정 화면 — 그리기와 끌어서 순서 바꾸기 ──────────────────────────
 * 하루치 일정을 줄로 그리고, 손가락으로 끌어 순서를 바꿉니다.
 *
 * **목록은 `date · start_time · sort_order` 로 줄을 세웁니다**(loadPlans).
 * 그래서 `sort_order` 만 바꾸면 **시각이 있는 줄은 놓자마자 제자리로**
 * 돌아갑니다 — 그 사연은 아래 주석에 그대로 있습니다.
 *
 * ── app.js 에서 떼어낸 서른 번째 조각입니다(b354) ────────────────────
 * SPLIT.md 가 오래 '마지막' 이라고 적어둔 자리입니다. 처음 쟀을 때 ctx 가
 * **11** 이었는데, 다른 조각을 떼어내면서 **5 → 4** 로 떨어졌습니다.
 * 아래층으로 내린 것들(`putHtml`·`planline`·`plancheck`)이 여기서 쓰던
 * 것들이라 그렇습니다 — **얽힌 것을 먼저 풀면 어려운 자리도 싸집니다.**
 *
 * `legFor` 는 `legNear(legs, 날짜)` 한 줄 래퍼라 그냥 버리고 직접 부릅니다
 * (b335 에 expense.js 에서 한 것과 같습니다).
 *
 * app.js 만 아는 것은 셋 — 기능 스위치 둘, 일정 다시 받기.
 *
 * 층: dom.js · net.js · calc.js · trip.js 와 이미 떼어낸
 *     planline.js · planmap.js · plancheck.js 를 씁니다. */
import { $, esc, emptyDo } from './dom.js?v=b354';
import { fail, write } from './net.js?v=b354';
import { dayLabel, hm, hop, money, legNear } from './calc.js?v=b354';
import { trip, plans, legs, expenses, setPlans, pickedDay, catFilter } from './trip.js?v=b354';
import { dayStat, lineChips, nice, parseMemo } from './planline.js?v=b354';
import { drawPlanMap, mapLinks } from './planmap.js?v=b354';
import { STAY_MIN, mins } from './plancheck.js?v=b354';

let ctx = { featOn: () => false, flags: () => ({}), loadPlans: async () => {} };
export function setPlanViewCtx(o){ ctx = { ...ctx, ...o }; }

/* 어느 일정 줄을 펼쳐 놓았나. **app.js 에 있던 것을 여기로 옮겼습니다(b354)** —
   그리는 쪽이 여기라 여기가 맞습니다. Set 이라 import 한 쪽과 같은 것을
   보므로, 누르는 손잡이(app.js)가 add/delete 해도 여기 그대로 보입니다 —
   값이 아니라 그릇이라서 그렇습니다. */
export const openPlans = new Set();

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
  trip?.myRole !== 'viewer' && !catFilter && ctx.featOn('reorder') && !ctx.flags().readonly;

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
    if (!r.ok){ await ctx.loadPlans(); return fail(r.why, 'plan'); }
  }
}
$('plans').addEventListener('pointerup', dropOrder, false);
$('plans').addEventListener('pointercancel', dropOrder, false);

export function drawPlans(){
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
        const l = legs.length > 1 ? legNear(legs, p.date) : null;
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
    const ml = mapLinks(p, legNear(legs, p.date)?.destination || trip?.destination);
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

