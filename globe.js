/* ── 지구본 ── 손가락으로 돌려 보는 발자국(b516) ───────────────────────
 * 사용자 제안. 「드래그로 하면서 보는 게 재밌는 것」 — 맞습니다. 그래서
 * 공유 카드(한 장짜리 그림)가 아니라 **돌릴 수 있는 자리**에 둡니다.
 * 공유 카드에 넣자고 했던 것은 제 잘못된 제안이었습니다: 카드는 다녀온
 * 나라가 **한눈에 다 보여야** 하는데 지구본은 절반을 감춥니다.
 *
 * ── 왜 라이브러리를 안 쓰는가 ────────────────────────────────────────
 * 이 앱은 바깥 것을 안 씁니다. 그런데 마침 조건이 좋습니다 —
 *   · `#worldland` 의 경로가 **곡선 없는 폴리라인**입니다(M + l + Z).
 *     176개 나라 · 279조각 · 점 9,918개. 베지에가 없으니 점을 그대로
 *     경위도로 바꿔 다시 찍기만 하면 됩니다.
 *   · 정사도법 수식은 열 줄입니다.
 * three.js 도 d3 도 필요 없습니다.
 *
 * ── 좌표계(실측으로 확인) ────────────────────────────────────────────
 *     경도 = x / 1000 * 360 - 180
 *     위도 = 90 - y / 500 * 180
 *   확인: 한국 x 850 → 126°E · 아이슬란드 y 65 → 66.6°N · 노르웨이 y 57 → 69.5°N
 *   `#worldsvg` 의 viewBox 가 `0 19 1000 387` 인 것은 **잘라 놓은 창**이지
 *   좌표계가 아닙니다. 여기서는 자르지 않은 1000×500 으로 셉니다.
 *
 * ⚠⚠ **남극이 자료에 아예 없습니다.** 게다가 땅이 위도 +83 ~ -56 까지만
 *   있습니다. 평면 지도에서는 잘라 두면 티가 안 나는데, 지구본은 남쪽으로
 *   돌리면 **빈 구멍**이 보입니다. 그래서 기울기를 ±52° 로 막습니다 —
 *   그 안에서는 구멍이 지평선 너머에 있습니다. 이 값을 늘리려거든 남극
 *   좌표부터 넣으십시오.
 */
import { $ } from './dom.js?v=b516';

/* 화면에 있는 경로를 한 번만 읽어 경위도로 바꿔 둡니다. 돌릴 때마다 다시
   파싱하면 손가락을 따라올 수 없습니다(점이 만 개입니다). */
let 나라들 = null;

function 읽기(){
  if (나라들) return 나라들;
  const g = $('worldland');
  if (!g || !g.querySelector('path')) return null;   /* 아직 안 채워졌습니다 */
  나라들 = [];
  for (const p of g.querySelectorAll('path')){
    const d = p.getAttribute('d') || '';
    const 고리 = [];
    let 지금 = null, x = 0, y = 0;
    /* M 은 절대, l 은 상대입니다(world.js 가 그렇게 저장돼 있습니다).
       ⚠ 다른 명령이 섞이면 여기서 조용히 틀립니다 — 자료를 바꾸면
         `M=… Z=… l=…` 만 쓰는지 먼저 세십시오. */
    for (const 토막 of d.split(/(?=[MmLlZz])/)){
      const op = 토막[0];
      if (!op) continue;
      const n = (토막.match(/-?\d*\.?\d+/g) || []).map(Number);
      if (op === 'M' || op === 'm'){
        if (지금 && 지금.length > 2) 고리.push(지금);
        지금 = [];
        if (op === 'M'){ x = n[0]; y = n[1]; } else { x += n[0]; y += n[1]; }
        지금.push(점(x, y));
        for (let i = 2; i + 1 < n.length; i += 2){
          if (op === 'M'){ x = n[i]; y = n[i + 1]; } else { x += n[i]; y += n[i + 1]; }
          지금.push(점(x, y));
        }
      } else if (op === 'l' || op === 'L'){
        for (let i = 0; i + 1 < n.length; i += 2){
          if (op === 'l'){ x += n[i]; y += n[i + 1]; } else { x = n[i]; y = n[i + 1]; }
          지금.push(점(x, y));
        }
      } else if (op === 'Z' || op === 'z'){
        if (지금 && 지금.length > 2) 고리.push(지금);
        지금 = null;
      }
    }
    if (지금 && 지금.length > 2) 고리.push(지금);
    if (고리.length) 나라들.push({ code: p.dataset.c || '', 고리 });
  }
  return 나라들;
}

const RAD = Math.PI / 180;
/* [경도(rad), 위도(rad)] 로 미리 바꿔 둡니다 — 매 프레임 곱하지 않으려고. */
const 점 = (x, y) => [ (x / 1000 * 360 - 180) * RAD, (90 - y / 500 * 180) * RAD ];

/* ── 여기가 지구본입니다 ──────────────────────────────────────────────
 * 정사도법: 보는 방향에서 90° 넘게 돌아간 점은 **뒤통수**라 안 보입니다.
 *   cosc = sin φ0 sin φ + cos φ0 cos φ cos(λ-λ0)      cosc < 0 이면 뒤
 *   sx   =  cos φ sin(λ-λ0)
 *   sy   =  cos φ0 sin φ - sin φ0 cos φ cos(λ-λ0)
 * 화면에서는 y 가 아래로 자라므로 sy 를 뒤집습니다. */
function 만들기(ctx, R, cx, cy, 고리, λ0, φ0){
  const sφ0 = Math.sin(φ0), cφ0 = Math.cos(φ0);
  let 조각 = [];      /* 보이는 토막들 */
  let 지금 = null;
  for (const [λ, φ] of 고리){
    const cφ = Math.cos(φ), sφ = Math.sin(φ);
    const cΔ = Math.cos(λ - λ0);
    const 앞 = sφ0 * sφ + cφ0 * cφ * cΔ;
    if (앞 < 0){ if (지금){ 조각.push(지금); 지금 = null; } continue; }
    const sx = cx + R * cφ * Math.sin(λ - λ0);
    const sy = cy - R * (cφ0 * sφ - sφ0 * cφ * cΔ);
    (지금 || (지금 = [])).push([sx, sy]);
  }
  if (지금) 조각.push(지금);
  if (!조각.length) return false;

  /* ⚠ **토막 사이를 직선으로 이으면 안 됩니다.** 지평선에 걸친 나라(러시아)가
     구 위를 가로지르는 현으로 잘려 보입니다. 끊긴 자리를 **테두리 원을 따라**
     이어 줍니다 — 그래야 지구 뒤로 넘어간 것처럼 보입니다.
     ⚠ 도는 방향은 **짧은 쪽**입니다. 긴 쪽으로 돌면 반대편을 한 바퀴 감싸서
       나라가 지구 전체를 덮습니다. */
  const 각 = ([x, y]) => Math.atan2(y - cy, x - cx);
  ctx.beginPath();
  for (let i = 0; i < 조각.length; i++){
    const t = 조각[i];
    if (i === 0) ctx.moveTo(t[0][0], t[0][1]);
    else {
      const a0 = 각(조각[i - 1][조각[i - 1].length - 1]);
      const a1 = 각(t[0]);
      let d = a1 - a0;
      while (d >  Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      ctx.arc(cx, cy, R, a0, a0 + d, d < 0);
    }
    for (let k = i === 0 ? 1 : 0; k < t.length; k++) ctx.lineTo(t[k][0], t[k][1]);
  }
  /* 마지막 토막에서 첫 토막으로 돌아오는 길도 테두리를 따라갑니다. */
  if (조각.length > 1){
    const a0 = 각(조각[조각.length - 1][조각[조각.length - 1].length - 1]);
    const a1 = 각(조각[0][0]);
    let d = a1 - a0;
    while (d >  Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    ctx.arc(cx, cy, R, a0, a0 + d, d < 0);
  }
  ctx.closePath();
  return true;
}

/* ── 붙이기 ───────────────────────────────────────────────────────────
 * `갔다` 는 나라 코드 Set 입니다. 지도 화면이 이미 갖고 있는 것을 받습니다 —
 * 여기서 다시 세면 평면 지도와 지구본의 칠이 갈립니다. */
export function mountGlobe(canvas, 갔다, 처음경도){
  const 목록 = 읽기();
  if (!목록 || !canvas) return null;

  let λ0 = (처음경도 ?? 127) * RAD;   /* 기본은 한국입니다 */
  let φ0 = 18 * RAD;                  /* 살짝 위에서 내려다봅니다 */
  let 예약 = 0;

  const 그리기 = () => {
    예약 = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * dpr)){
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const cs = getComputedStyle(document.documentElement);
    const 바다 = cs.getPropertyValue('--parchment').trim() || '#eeeef2';
    const 땅   = cs.getPropertyValue('--line').trim()      || '#d8d8dd';
    const 파랑 = cs.getPropertyValue('--primary').trim()   || '#0066cc';

    const R = Math.min(w, h) / 2 - 6;
    const cx = w / 2, cy = h / 2;

    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = 바다; ctx.fill();
    /* 가장자리에 그림자를 한 겹 — 이게 없으면 원판이지 구가 아닙니다. */
    const 결 = ctx.createRadialGradient(cx - R * .3, cy - R * .35, R * .1, cx, cy, R);
    결.addColorStop(0, 'rgba(255,255,255,.55)');
    결.addColorStop(.75, 'rgba(255,255,255,0)');
    결.addColorStop(1, 'rgba(0,0,0,.13)');
    ctx.fillStyle = 결; ctx.fill();

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    ctx.lineWidth = .4;
    for (const 나라 of 목록){
      const 감 = 갔다.has(나라.code);
      ctx.fillStyle = 감 ? 파랑 : 땅;
      ctx.strokeStyle = 바다;
      for (const 고리 of 나라.고리){
        if (만들기(ctx, R, cx, cy, 고리, λ0, φ0)){ ctx.fill(); ctx.stroke(); }
      }
    }
    ctx.restore();
  };
  const 다시 = () => { if (!예약) 예약 = requestAnimationFrame(그리기); };

  /* ── 돌리기 ─────────────────────────────────────────────────────────
   * ⚠ `touch-action:none` 이 CSS 에 있어야 합니다(app.css 의 `#globe`).
   *   안 그러면 손가락이 지구본이 아니라 **화면을 굴립니다.**
   * ⚠ 기울기는 ±52° 로 막습니다 — 위 머리말의 남극 구멍 때문입니다.
   * ⚠ 매 이벤트마다 그리지 않고 rAF 한 번으로 모읍니다. 아이폰에서는
   *   pointermove 가 한 프레임에 여러 번 옵니다. */
  let 끌기 = null;
  canvas.addEventListener('pointerdown', e => {
    끌기 = { x:e.clientX, y:e.clientY };
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!끌기) return;
    λ0 -= (e.clientX - 끌기.x) * .35 * RAD;
    φ0 += (e.clientY - 끌기.y) * .35 * RAD;
    const 끝 = 52 * RAD;
    φ0 = Math.max(-끝, Math.min(끝, φ0));
    끌기 = { x:e.clientX, y:e.clientY };
    다시();
  });
  const 놓기 = () => { 끌기 = null; };
  canvas.addEventListener('pointerup', 놓기);
  canvas.addEventListener('pointercancel', 놓기);
  /* iOS 는 pointermove 의 preventDefault 를 무시합니다(b493). touch-action 으로
     이미 막히지만, 한 겹 더 둡니다 — 여기서 화면이 굴러가면 못 돌립니다. */
  canvas.addEventListener('touchmove', e => { if (끌기) e.preventDefault(); },
                          { passive:false });

  다시();
  return { 다시, 회전:(deg) => { λ0 = deg * RAD; 다시(); } };
}
