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
