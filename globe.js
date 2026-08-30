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
import { $ } from './dom.js?v=b543';

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


/* ── 나라마다 한가운데 점 ─────────────────────────────────────────────
 * ⚠ **작은 나라는 지구본에서 안 보입니다.** 싱가포르·몰타·바레인은 칠해도
 *   한 픽셀이 안 됩니다 — 다녀왔는데 지구가 그대로인 것처럼 보입니다.
 *   그래서 다녀온 나라마다 **핀을 하나** 찍습니다.
 * ⚠ 평면에서 좌표를 평균 내면 안 됩니다. 날짜변경선에 걸친 나라(러시아·
 *   피지)가 경도 +180 과 -180 을 평균해서 **아프리카 앞바다**로 갑니다.
 *   단위벡터로 바꿔 더한 뒤 다시 각도로 되돌립니다 — 구 위의 평균입니다.
 * ⚠ 조각이 여럿이면 **제일 큰 것** 하나만 봅니다. 프랑스에 해외령을
 *   섞으면 핀이 대서양 한가운데에 섭니다. */
function 한가운데(고리들){
  let 큰 = 고리들[0];
  for (const g of 고리들) if (g.length > 큰.length) 큰 = g;
  let X = 0, Y = 0, Z = 0;
  for (const [λ, φ] of 큰){
    const c = Math.cos(φ);
    X += c * Math.cos(λ); Y += c * Math.sin(λ); Z += Math.sin(φ);
  }
  const r = Math.hypot(X, Y, Z);
  if (!r) return null;
  return [ Math.atan2(Y, X), Math.asin(Z / r) ];
}

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

/* ── 경위선(b541) ─────────────────────────────────────────────────────
 * 30° 마다 한 줄씩. **이게 있어야 도는 것이 보입니다** — 태평양만 보일 때는
 * 땅이 하나도 없어서, 격자가 없으면 지구본이 멈춘 것처럼 보입니다.
 * ⚠ 아주 흐리게. 여기가 진해지면 지구본이 아니라 철망이 됩니다.
 * ⚠ 테두리를 따라 잇지 않습니다 — 선이라 닫을 필요가 없습니다. 끊긴
 *   채로 두면 그대로 「뒤로 넘어갔다」가 됩니다. */
function 격자(ctx, R, cx, cy, λ0, φ0){
  const sφ0 = Math.sin(φ0), cφ0 = Math.cos(φ0);
  const 줄 = (점들) => {
    ctx.beginPath();
    let 붙었나 = false;
    for (const [λ, φ] of 점들){
      const cφ = Math.cos(φ), sφ = Math.sin(φ), cΔ = Math.cos(λ - λ0);
      if (sφ0 * sφ + cφ0 * cφ * cΔ < 0){ 붙었나 = false; continue; }
      const x = cx + R * cφ * Math.sin(λ - λ0);
      const y = cy - R * (cφ0 * sφ - sφ0 * cφ * cΔ);
      if (붙었나) ctx.lineTo(x, y); else { ctx.moveTo(x, y); 붙었나 = true; }
    }
    ctx.stroke();
  };
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = 'rgba(0,0,0,.055)';
  for (let d = -180; d < 180; d += 30){          /* 자오선 열둘 */
    const λ = d * RAD, 점들 = [];
    for (let p = -84; p <= 84; p += 3) 점들.push([λ, p * RAD]);
    줄(점들);
  }
  for (let p = -60; p <= 60; p += 30){           /* 위선 넷 */
    if (!p) continue;
    const φ = p * RAD, 점들 = [];
    for (let d = -180; d <= 180; d += 3) 점들.push([d * RAD, φ]);
    줄(점들);
  }
  ctx.strokeStyle = 'rgba(0,0,0,.085)';          /* 적도만 한 겹 진하게 */
  {
    const 점들 = [];
    for (let d = -180; d <= 180; d += 3) 점들.push([d * RAD, 0]);
    줄(점들);
  }
}

/* ── 붙이기 ───────────────────────────────────────────────────────────
 * `갔다` 는 나라 코드 Set 입니다. 지도 화면이 이미 갖고 있는 것을 받습니다 —
 * 여기서 다시 세면 평면 지도와 지구본의 칠이 갈립니다. */
/* ⚠ **처음 보이는 면은 대한민국이 한가운데입니다(b525, 사용자 결정).**
   b519 에는 「다녀온 나라들의 한가운데」로 열었습니다 — 유럽만 다닌 사람이
   빈 태평양을 보지 않게 하려던 것인데, 열 때마다 각도가 달라져서 **같은
   화면이라는 느낌이 없었습니다.** 집이 가운데 있고 다녀온 곳이 그 둘레에
   퍼지는 편이 「내 발자국」에 맞습니다. 돌리는 것은 손가락 몫입니다.
   ⚠ 위도도 같이 맞춰야 진짜 가운데입니다. 경도만 맞추면 한국이 위쪽에
     붙습니다 — 서울이 북위 37 도라 적도가 가운데면 그만큼 올라갑니다.
   ⚠ 기울기 한계(±52)를 안 넘습니다. 넘기면 남극 구멍이 보입니다. */
const KR = [127.8, 36.5];   /* 대한민국 한가운데 (경도, 위도) */

/* ⚠⚠ **바다를 파랗게 칠하지 마십시오.** ⚠⚠
   지구본이니 바다는 파랑이 맞아 보이는데, 이 앱에서 파랑(--primary)은
   **「내가 다녀온 나라」**입니다. 바다를 파랗게 하면 다녀온 나라가 바다와
   같은 색이 되어 **칠한 것이 안 보입니다.** 바다는 평면 지도와 같은
   회백색(--parchment)으로 두고, 「지구답게」는 대기광·경위선·명암으로
   만듭니다(b541). 평면 지도와 색이 갈리면 안 되는 것도 같은 이유입니다. */
const 자동속도 = 2.2;    /* 초당 도. 한 바퀴에 164초 — 도는 것은 알겠고 안 어지러운 값 */

export function mountGlobe(canvas, 갔다, 처음경도, 처음위도){
  const 목록 = 읽기();
  if (!목록 || !canvas) return null;

  /* 핀 자리는 한 번만 셉니다(점이 9,918개입니다 — 매 프레임 평균낼 수 없습니다). */
  if (목록.length && 목록[0].핀 === undefined)
    for (const n of 목록) n.핀 = 한가운데(n.고리);

  let λ0 = (처음경도 ?? KR[0]) * RAD;
  let φ0 = (처음위도 ?? KR[1]) * RAD;
  let 예약 = 0, 헛걸음 = 0;

  const 그리기 = () => {
    예약 = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    /* ⚠⚠ **크기가 아직 0 이면 포기하지 말고 다시 옵니다(b523).** ⚠⚠
       탭에 붙자마자 그리면 그 순간에는 칸이 아직 폭을 못 가진 때가
       있습니다. 처음에 여기서 그냥 `return` 했더니 **영영 안 그려졌습니다** —
       칸은 360×240 인데 캔버스는 손도 안 댄 300×150 이었습니다(실측).
     ⚠ 다시 부르는 것은 setTimeout 입니다. rAF 로 하면 창이 숨어 있을 때
       (다른 탭에 있을 때) 아예 안 돌아서 같은 자리에 멈춥니다.
     ⚠ 무한히 기다리지 않습니다. 40번(약 5초)이면 칸이 영영 안 열리는
       것이고, 그때는 조용히 그만둡니다. */
    if (!w || !h){
      if (헛걸음 < 40){ 헛걸음++; setTimeout(그리기, 120); }
      return;
    }
    헛걸음 = 0;
    const W = Math.round(w * dpr), H = Math.round(h * dpr);
    /* ⚠ **높이도 같이 봐야 합니다.** 처음에 폭만 보고 넘겼더니, 캔버스의
       기본값이 300×150 이라 폭 300 짜리 칸에서 **폭은 맞고 높이만 150 인
       채로** 그렸습니다. 지구본이 위아래로 잘렸습니다(실측). */
    if (canvas.width !== W || canvas.height !== H){ canvas.width = W; canvas.height = H; }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const cs = getComputedStyle(document.documentElement);
    const 바다 = cs.getPropertyValue('--parchment').trim() || '#eeeef2';
    const 땅   = cs.getPropertyValue('--line').trim()      || '#d8d8dd';
    /* 평면 지도와 **같은 색**입니다 — 여기서 다른 값을 쓰면 같은 나라가
       두 색으로 보입니다. 오렌지로 줘봤다가 되돌렸습니다(b531, app.css 참고). */
    const 내것 = cs.getPropertyValue('--primary').trim()   || '#0066cc';

    /* ⚠ 대기광이 밖으로 번지므로 반지름을 그만큼 줄여 자리를 냅니다.
         전에는 -6 이었는데, 그대로 두면 번짐이 캔버스 밖에서 잘립니다. */
    const R = Math.min(w, h) / 2 - 13;
    const cx = w / 2, cy = h / 2;

    /* ── ① 대기광 ── 가장자리 바깥으로 번지는 파란 띠 한 겹 ───────────
       ⚠ 안쪽(0~R)은 완전 투명입니다. 여기에 색을 조금이라도 넣으면
         지구 전체에 파란 안개가 껴서 다녀온 나라의 파랑이 죽습니다. */
    {
      const g = ctx.createRadialGradient(cx, cy, R * 0.93, cx, cy, R * 1.13);
      g.addColorStop(0,    'rgba(0,102,204,0)');
      g.addColorStop(0.42, 'rgba(0,102,204,.13)');
      g.addColorStop(0.72, 'rgba(0,102,204,.06)');
      g.addColorStop(1,    'rgba(0,102,204,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.13, 0, Math.PI * 2); ctx.fill();
    }

    /* ── ② 바다 ────────────────────────────────────────────────────── */
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = 바다; ctx.fill();

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

    /* ── ③ 경위선 (땅 밑에 깝니다) ─────────────────────────────────── */
    격자(ctx, R, cx, cy, λ0, φ0);

    /* ── ④ 땅 ──────────────────────────────────────────────────────── */
    ctx.lineWidth = 0.4;
    for (const 나라 of 목록){
      const 감 = 갔다.has(나라.code);
      ctx.fillStyle = 감 ? 내것 : 땅;
      ctx.strokeStyle = 바다;
      for (const 고리 of 나라.고리){
        if (만들기(ctx, R, cx, cy, 고리, λ0, φ0)){ ctx.fill(); ctx.stroke(); }
      }
    }

    /* ── ⑤ 핀 ── 다녀온 나라마다 하나 ─────────────────────────────────
       ⚠ 지평선에 가까울수록 흐려집니다. 딱 잘라 없애면 돌릴 때 점이
         **깜빡** 하고 사라져서 눈에 거슬립니다. */
    {
      const sφ0 = Math.sin(φ0), cφ0 = Math.cos(φ0);
      for (const 나라 of 목록){
        if (!나라.핀 || !갔다.has(나라.code)) continue;
        const [λ, φ] = 나라.핀;
        const cφ = Math.cos(φ), sφ = Math.sin(φ), cΔ = Math.cos(λ - λ0);
        const 앞 = sφ0 * sφ + cφ0 * cφ * cΔ;
        if (앞 <= 0.02) continue;
        ctx.globalAlpha = Math.min(1, 앞 * 3.4);
        const x = cx + R * cφ * Math.sin(λ - λ0);
        const y = cy - R * (cφ0 * sφ - sφ0 * cφ * cΔ);
        ctx.beginPath(); ctx.arc(x, y, 3.1, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, 1.7, 0, Math.PI * 2);
        ctx.fillStyle = 내것; ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    /* ── ⑥ 명암 ── 왼쪽 위에서 빛이 옵니다 ───────────────────────────
       ⚠ 이게 없으면 원판이지 구가 아닙니다. **가장자리를 어둡게** 하는
         쪽이 부풀어 보이게 하는 데 더 셉니다 — 하이라이트만으로는 안 됩니다. */
    {
      const g = ctx.createRadialGradient(cx - R * 0.34, cy - R * 0.38, R * 0.06,
                                         cx, cy, R * 1.02);
      g.addColorStop(0,    'rgba(255,255,255,.62)');
      g.addColorStop(0.34, 'rgba(255,255,255,.16)');
      g.addColorStop(0.68, 'rgba(255,255,255,0)');
      g.addColorStop(0.9,  'rgba(0,0,0,.07)');
      g.addColorStop(1,    'rgba(0,0,0,.19)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    /* ── ⑦ 테두리 ── 머리카락 한 올. 구와 배경을 갈라 줍니다 ───────── */
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(0,0,0,.10)'; ctx.stroke();
  };
  const 다시 = () => { if (!예약) 예약 = requestAnimationFrame(그리기); };

  /* ── 스스로 도는 것과 미끄러지는 것(b541) ───────────────────────────
   * ⚠⚠ **안 보이면 멈춥니다.** 이 앱에서 네 번 데인 자리입니다 — 크롬은
   *   배경 탭에서 rAF 를 아예 안 부릅니다. 여기서는 그게 오히려 맞는
   *   동작이라 그대로 두되, **깨어났을 때 몰아서 돌지 않도록** 시간차를
   *   잘라냅니다(dt 상한 0.05초). 안 그러면 다른 탭에 갔다 오는 순간
   *   지구가 홱 돌아갑니다.
   * ⚠ 화면 밖으로 나가면 IntersectionObserver 가 알려줍니다 — 평면 보기로
   *   바꾸면 캔버스가 `display:none` 이 되므로 그때도 여기서 멈춥니다.
   *   따로 알려줄 필요가 없습니다.
   * ⚠ **손대면 그걸로 끝입니다.** 다시 돌기 시작하면 사용자가 맞춰 놓은
   *   자리가 흘러가 버립니다 — 「내가 놓은 대로 있어야」 합니다.
   * ⚠ 던진 뒤 미끄러지는 것은 관성입니다. 초당 0.06 배로 줄어듭니다
   *   (약 1.2초면 섭니다). */
  let 자동 = true, 보임 = true, 루프 = 0, 마지막 = 0, 관성 = 0, 그린때 = 0;
  const 돌까 = () => (자동 || 관성) && 보임;
  function 한바퀴(t){
    루프 = 0;
    const dt = 마지막 ? Math.min((t - 마지막) / 1000, 0.05) : 0;
    마지막 = t;
    if (관성){
      λ0 += 관성 * dt;
      관성 *= Math.pow(0.06, dt);
      if (Math.abs(관성) < 0.04) 관성 = 0;
    } else if (자동){
      λ0 -= 자동속도 * RAD * dt;   /* 지구가 도는 쪽 — 땅이 오른쪽으로 흐릅니다 */
    }
    /* ⚠ 스스로 돌 때는 30fps 면 충분합니다. 매 프레임 9,918개를 다시
       투영하면 폰에서 다른 것이 버벅입니다. 관성일 때는 손을 막 뗀
       참이라 최대한 부드럽게 갑니다. */
    if (관성 || t - 그린때 >= 32){ 그린때 = t; 그리기(); }
    if (돌까()) 루프 = requestAnimationFrame(한바퀴);
    else 마지막 = 0;
  }
  const 깨우기 = () => { if (!루프 && 돌까()) 루프 = requestAnimationFrame(한바퀴); };
  const 세우기 = () => { 자동 = false; 관성 = 0; };

  const 눈 = ('IntersectionObserver' in window)
    ? new IntersectionObserver(es => {
        보임 = es.some(e => e.isIntersecting);
        if (보임){ 마지막 = 0; 다시(); 깨우기(); }
      }, { threshold: 0 })
    : null;
  눈?.observe(canvas);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    마지막 = 0; 다시(); 깨우기();
  });

  /* ── 돌리기 ─────────────────────────────────────────────────────────
   * ⚠⚠ **손가락으로는 좌우만 돌립니다(b535).** ⚠⚠
   *   처음엔 `touch-action:none` 으로 두 축을 다 가져왔습니다. 그랬더니
   *   **지구본 위에서 화면이 안 굴러갑니다.** 폰(390px)에서 지구본은 358px —
   *   양옆에 16px 밖에 안 남아서, 240px 짜리 **스크롤 죽은 띠**가 화면을
   *   가로지릅니다. 「분석 탭 스크롤이 잘 안 먹는다」는 이것이었습니다.
   *   (480px 창에서 재고 60px 남는다고 안심했던 것이 잘못이었습니다.)
   *   `pan-y` 로 **위아래는 브라우저에 돌려주고** 좌우만 씁니다 —
   *   별점 끌기(`.stars`)·홈 미니맵(`.mmswipe`)과 같은 수법입니다.
   * ⚠ 그래서 **세로로 더 움직인 제스처는 통째로 무시**합니다. 안 그러면
   *   화면을 굴리는 동안 지구본이 같이 기울어 어지럽습니다.
   * ⚠ 마우스는 두 축 다 됩니다 — 마우스에는 「화면 굴리기」와 겹칠 일이
   *   없습니다(휠이 따로 있습니다).
   * ⚠ 기울기는 ±52° 로 막습니다 — 위 머리말의 남극 구멍 때문입니다.
   * ⚠ 매 이벤트마다 그리지 않고 rAF 한 번으로 모읍니다. 아이폰에서는
   *   pointermove 가 한 프레임에 여러 번 옵니다. */
  /* ⚠ **누르는 것과 돌리는 것이 한 자리에 있습니다.** 이 지구본은 눌러서
     지도 화면을 여는 단추이기도 합니다 — 민 것을 눌린 것으로 치면 돌릴
     때마다 화면이 열립니다. 민 뒤 한 번의 누름만 건너뛰게 알려줍니다
     (홈 미니맵에서 쓴 것과 같은 수법, home.js 의 `밀림`). */
  let 민적 = false;
  let 끌기 = null;
  canvas.addEventListener('pointerdown', e => {
    민적 = false;
    세우기();                      /* 손이 닿는 순간 자동 회전은 끝입니다 */
    끌기 = { x:e.clientX, y:e.clientY, 손가락:e.pointerType !== 'mouse',
             잠금:null, 때:e.timeStamp, 속:0 };
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!끌기) return;
    const dx = e.clientX - 끌기.x, dy = e.clientY - 끌기.y;

    /* ── 방향 잠금 ── 첫 움직임으로 「돌리기」인지 「굴리기」인지 정합니다.
       손가락일 때만 봅니다. 한 번 정하면 그 제스처가 끝날 때까지 안 바꿉니다 —
       중간에 바꾸면 굴리다가 갑자기 지구가 돌아갑니다.
       ⚠ 6px 은 손이 떨리는 폭입니다. 그 전에는 아직 아무것도 안 정합니다. */
    if (끌기.손가락 && !끌기.잠금){
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      끌기.잠금 = Math.abs(dx) > Math.abs(dy) ? '돌리기' : '굴리기';
    }
    /* 굴리기로 정해졌으면 브라우저가 화면을 굴리게 두고 손을 뗍니다. */
    if (끌기.잠금 === '굴리기') return;

    const dλ = -dx * 0.35 * RAD;
    λ0 += dλ;
    /* 던질 때 쓸 속도(라디안/초). **마지막 움직임만** 봅니다 — 평균을 내면
       멈췄다가 톡 미는 손가락에서도 지구가 날아갑니다. */
    const dt = Math.max(1, e.timeStamp - 끌기.때) / 1000;
    끌기.속 = dλ / dt;
    끌기.때 = e.timeStamp;
    /* 위아래 기울기는 **마우스에만** 줍니다 — 손가락의 세로는 화면 굴리기
       몫입니다(위 머리말 b535). */
    if (!끌기.손가락){
      const 끝 = 52 * RAD;
      φ0 = Math.max(-끝, Math.min(끝, φ0 + dy * 0.35 * RAD));
    }
    끌기.x = e.clientX; 끌기.y = e.clientY;
    민적 = true;
    다시();
  });
  /* ⚠ **던지기는 손을 뗀 그 순간만 봅니다.** 마지막 움직임이 90ms 보다
     오래됐으면 손가락이 멈춰 있다가 뗀 것이라 안 던집니다 — 안 그러면
     자리를 맞추고 손을 떼도 지구가 스르륵 흘러갑니다. */
  const 놓기 = e => {
    const 그거 = 끌기; 끌기 = null;
    if (!그거 || 그거.잠금 === '굴리기') return;
    if (e && e.timeStamp - 그거.때 > 90) return;
    const v = Math.max(-9, Math.min(9, 그거.속 || 0));
    if (Math.abs(v) > 0.25){ 관성 = v; 마지막 = 0; 깨우기(); }
  };
  canvas.addEventListener('pointerup', 놓기);
  canvas.addEventListener('pointercancel', () => { 끌기 = null; });
  /* ⚠ **돌리기로 정해졌을 때만 막습니다(b535).** 그냥 `끌기` 만 보고
     막으면 굴리려던 손가락까지 붙잡아, `pan-y` 로 돌려준 스크롤이 다시
     죽습니다. iOS 는 pointermove 의 preventDefault 를 무시하므로(b493)
     여기 touchmove 가 필요합니다. */
  canvas.addEventListener('touchmove', e => {
    if (끌기?.잠금 === '돌리기') e.preventDefault();
  }, { passive:false });

  /* ⚠ **첫 판은 rAF 에 맡기지 않습니다.** 창이 숨어 있으면 rAF 가 아예
     안 돌아서 지구본이 빈 채로 남습니다(재보다가 걸렸습니다). 토글로 켜는
     순간 한 프레임 비는 것도 없어집니다. 이어지는 그리기만 rAF 로 모읍니다. */
  그리기();
  깨우기();
  return {
    다시,
    /* ⚠ **위도도 같이 받습니다(b542).** 대륙 넘김이 이걸 씁니다 —
       경도만 맞추면 남아메리카·아프리카가 화면 위아래로 반쯤 걸칩니다.
       ⚠ 기울기는 여기서도 ±52° 로 막습니다. 넘기면 남극 구멍이 보입니다
         (머리말 참고). 부르는 쪽이 안 지킬 수도 있으니 여기서 자릅니다. */
    회전: (경도, 위도) => {
      세우기();
      λ0 = 경도 * RAD;
      if (위도 != null){
        const 끝 = 52 * RAD;
        φ0 = Math.max(-끝, Math.min(끝, 위도 * RAD));
      }
      다시();
    },
    /* 평면에서 돌아올 때 씁니다 — 캔버스 크기가 다시 잡히고 회전이 이어집니다.
       ⚠ 안쪽 `깨우기` 와 이름이 같으면 헷갈립니다. 밖으로 내보내는 것은 `되살리기`. */
    되살리기: () => { 마지막 = 0; 다시(); 깨우기(); },
    끝: () => { 세우기(); 보임 = false; 눈?.disconnect(); },
    /* 한 번 물으면 지워집니다 — 그 다음 누름은 진짜 누름입니다. */
    민적있나: () => { const v = 민적; 민적 = false; return v; },
  };
}
