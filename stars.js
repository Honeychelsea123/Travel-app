/* ── 별 그리기 ─────────────────────────────────────────────────────────
 * 별점은 홈("여기 가보셨어요?") · 도시 상세 · 보관함("내 평가") · 여행 후기 ·
 * 여행 끝난 뒤 화면까지 **다섯 군데**에서 같은 모양으로 나와야 합니다.
 * 그래서 그리는 방법만 여기 모읍니다.
 *
 * 여기 있는 셋은 **받은 것만 보고 화면만 만집니다.** 무엇을 몇 점 줬는지
 * (myRates · cityStat · visited)는 여전히 app.js 가 들고 있습니다 —
 * 그 자료는 네 화면이 같이 쓰는 것이라 여기로 옮기면 반쪽만 오게 됩니다.
 * calc.js 와 같은 규칙입니다: 앱 상태를 모르는 것만 여기 둡니다.
 */

/* 0.5 단위를 칸 너비(%)로 표현합니다. 반 개짜리 별 이미지를 따로 두지
   않으려고 안쪽 <i> 의 width 를 잘라 씁니다. */
export function starHtml(v){
  return [1,2,3,4,5].map(n => {
    const f = v == null ? 0 : Math.max(0, Math.min(1, v - (n - 1)));
    return `<span class="st" data-n="${n}"><i style="width:${(f*100).toFixed(0)}%"></i></span>`;
  }).join('');
}

/* 별을 누르면 그 자리에서 바로 칠합니다. 저장을 기다렸다 다시 그리면
   그 사이에 아무 일도 안 일어난 것처럼 보이고, 다시 그리는 순간
   정렬이 바뀌어 줄이 위로 튀어 오릅니다 — 눌렀는지 알 수가 없습니다. */
export function paintStars(wrap, v, animate){
  [...wrap.querySelectorAll('.st')].forEach((st, n) => {
    const f = Math.max(0, Math.min(1, (v ?? 0) - n));
    st.querySelector('i').style.width = (f * 100).toFixed(0) + '%';
    if (!animate) return;
    st.classList.remove('pop');
    if (f <= 0){ st.style.animationDelay = ''; return; }
    /* 같은 애니메이션을 다시 틀려면 한 번 끊어줘야 합니다.
       offsetWidth 를 읽으면 브라우저가 그 자리에서 계산해 흐름이 끊깁니다. */
    void st.offsetWidth;
    st.style.animationDelay = (n * 55) + 'ms';   /* 왼쪽부터 차례로 */
    st.classList.add('pop');
  });
}

/* 목록 줄에 "★ 4 기록" 딱지를 답니다. 별점을 지우면(v == null) 떼어냅니다 —
   스위치로 두었다가 별점을 지워도 딱지가 남는 버그가 있었습니다. */
export function markRated(row, v){
  if (!row) return;
  const box = row.querySelector('.t') || row;
  let t = box.querySelector('.rtag');
  if (v == null){ t?.remove(); return; }
  if (!t){ t = document.createElement('span'); t.className = 'ktag rtag';
           t.style.cssText = '--kc:#f5a623; margin-left:6px'; box.querySelector('b')?.after(t); }
  t.textContent = `★ ${v} 기록`;
}

/* ── 눌린 자리에서 별점을 읽습니다 ────────────────────────────────────
 * **반 칸(0.5점)은 왼쪽 절반**입니다.
 * ⚠ **rateui.js 에 있던 것을 여기로 내렸습니다(b491).** 거기 주석에는
 *   「세 화면이 같은 규칙을 써야 하므로 여기 한 곳에 둔다」고 적혀 있었는데,
 *   정작 **rating.js · review.js · shelf.js 가 같은 식을 손으로 베껴** 쓰고
 *   있었습니다(넉 벌). 그 셋은 rateui 를 import 하지 않습니다 — 별을 쓰는
 *   여섯 화면이 다 닿는 가장 아래층은 여기(stars.js)입니다.
 *   rateui.js 는 이 이름을 그대로 다시 내보내므로 부르는 쪽은 안 바뀝니다. */
export function starValue(st, clientX){
  const b = st.getBoundingClientRect();
  return +st.dataset.n - ((clientX - b.left) < b.width / 2 ? 0.5 : 0);
}

/* 통 안에서 x 가 가리키는 별점. 통 **밖으로 나가도** 양 끝으로 붙잡습니다 —
   끌다가 손가락이 별을 벗어나면 값이 사라져 되돌아가 보입니다. */
function 끌린값(wrap, x){
  const 별 = [...wrap.querySelectorAll('.st')];
  if (!별.length) return null;
  const 첫 = 별[0].getBoundingClientRect();
  const 끝 = 별[별.length - 1].getBoundingClientRect();
  if (x <= 첫.left)  return 0.5;
  if (x >= 끝.right) return 별.length;
  const st = 별.find(s => { const b = s.getBoundingClientRect();
                            return x >= b.left && x <= b.right; });
  return st ? starValue(st, x) : null;
}

/* ── 끌어서 매기기(b491) ──────────────────────────────────────────────
 * 별 위에서 좌우로 끌면 따라 칠해지고, 떼는 자리의 점수로 매겨집니다.
 *
 * ⚠ **매기는 처리는 여기서 안 합니다.** 여섯 화면이 매긴 뒤에 할 일이
 *   다 다릅니다(홈은 다음 도시로, 맛보기는 다섯 곳 채우면 카드, 연속
 *   평가는 세면서 넘김, 기록·후기·보관함은 같은 점수를 다시 주면 지움).
 *   그래서 뗄 때 **그 자리에 «누른 것»을 만들어 보냅니다** — 여섯 화면의
 *   기존 click 처리가 그대로 받습니다. 새 경로를 만들지 않습니다.
 *
 * ⚠ **native click 을 막아야 합니다.** 손가락을 끌었다 떼면 브라우저가
 *   click 을 한 번 더 냅니다. 그러면 같은 별을 두 번 매기게 되고, 기록
 *   탭처럼 「같은 점수를 다시 누르면 지움」인 화면에서는 **매기자마자
 *   지워집니다.** 우리가 만든 것은 표시를 달아 통과시키고 나머지는 막습니다.
 *
 * ⚠ **끌린 뒤에만 가로챕니다.** 그냥 톡 누른 것은 손대지 않습니다 —
 *   기존 동작이 그대로여야 합니다(문턱 4px).
 *
 * ⚠ CSS 에서 `.stars{ touch-action:pan-y }` 여야 합니다. `manipulation`
 *   이면 가로 제스처를 브라우저가 가져가 **탭이 넘어갑니다**(#tabdeck).
 *   세로는 브라우저에 남겨 둡니다 — 별 위에서 시작해도 화면은 굴러야
 *   합니다(일정 손잡이에서 배운 것, app.css 의 .ev .grip 주석). */
let 끌기 = null, 막을클릭 = false;

export function armStarDrag(){
  if (armStarDrag.done) return;    /* 두 번 달면 한 번 끌 때 두 번 매깁니다 */
  armStarDrag.done = true;

  document.addEventListener('pointerdown', e => {
    if (e.button != null && e.button !== 0) return;
    const st = e.target.closest?.('.st');
    const wrap = st?.closest('.stars');
    if (!wrap) return;
    끌기 = { wrap, id:e.pointerId, x0:e.clientX, 끌림:false,
             처음:[...wrap.querySelectorAll('.st i')]
                    .reduce((s, i) => s + (parseFloat(i.style.width) || 0) / 100, 0) };
  });

  document.addEventListener('pointermove', e => {
    if (!끌기 || e.pointerId !== 끌기.id) return;
    if (!끌기.끌림){
      if (Math.abs(e.clientX - 끌기.x0) < 4) return;
      끌기.끌림 = true;
      /* 손가락이 별을 벗어나도 계속 받습니다. */
      try { 끌기.wrap.setPointerCapture(e.pointerId); } catch {}
    }
    const v = 끌린값(끌기.wrap, e.clientX);
    if (v != null) paintStars(끌기.wrap, v, false);
    e.preventDefault();
  }, { passive:false });

  const 끝내기 = e => {
    const d = 끌기; 끌기 = null;
    if (!d || e.pointerId !== d.id) return;
    try { d.wrap.releasePointerCapture(e.pointerId); } catch {}
    if (!d.끌림) return;                       /* 톡 누른 것 — 기존 click 에 맡깁니다 */
    if (e.type === 'pointercancel'){ paintStars(d.wrap, d.처음, false); return; }

    const v = 끌린값(d.wrap, e.clientX);
    const st = [...d.wrap.querySelectorAll('.st')]
      .find(s => +s.dataset.n === Math.ceil(v));
    if (!st){ paintStars(d.wrap, d.처음, false); return; }
    /* 반 칸이면 그 별의 왼쪽 절반, 아니면 오른쪽 절반을 누른 셈으로 보냅니다 —
       받는 쪽은 starValue 로 되읽으므로 x 가 정확해야 합니다. */
    const b = st.getBoundingClientRect();
    const x = b.left + (Number.isInteger(v) ? b.width * 0.75 : b.width * 0.25);
    const ev = new MouseEvent('click', { bubbles:true, cancelable:true,
                                         clientX:x, clientY:b.top + b.height / 2 });
    ev.끌어서 = true;
    st.dispatchEvent(ev);
    막을클릭 = true;                            /* 뒤따라오는 native click 하나를 막습니다 */
    setTimeout(() => { 막을클릭 = false; }, 400);
  };
  document.addEventListener('pointerup', 끝내기);
  document.addEventListener('pointercancel', 끝내기);

  document.addEventListener('click', e => {
    if (!막을클릭 || e.끌어서) return;
    if (!e.target.closest?.('.stars')) return;
    막을클릭 = false;
    e.stopPropagation(); e.preventDefault();
  }, true);
}
