/* ══ 사진에서 다녀온 곳 가져오기 ════════════════════════════════════════
 *
 * 이 앱의 제일 큰 약점은 **처음에 아무것도 없다는 것**입니다. 성향 카드를
 * 보려면 5곳, 흔들리지 않으려면 20곳을 손으로 매겨야 합니다. 사진첩에는
 * 이미 답이 있습니다 — 찍은 자리의 좌표가 사진 안에 들어 있습니다.
 *
 * ⚠⚠ **사진은 브라우저 밖으로 안 나갑니다.** ⚠⚠
 *   고른 파일의 **앞부분만** 읽어 좌표를 뽑고 바로 버립니다. 서버로 가는
 *   것은 「어느 도시에 갔다」 한 줄뿐이고, 그건 별점을 매길 때 이미 저장하던
 *   것과 같은 종류입니다. 화면에도 그렇게 적습니다 — 사진첩을 여는 기능은
 *   말로 먼저 안심시키지 않으면 아무도 안 누릅니다.
 *
 * ⚠⚠ **별점을 지어내지 않습니다.** 사진은 「갔다」만 말하지 「좋았다」는
 *   말하지 않습니다. `been` 만 켜고 `stars` 는 null 로 둡니다 — 그러면
 *   평가 목록에 「평가 대기」로 맨 위에 섭니다(rating.js 의 rank).
 *   가져오기가 곧 «평가할 목록»이 되는 것이 이 기능의 요점입니다.
 *
 * ⚠ **바깥 라이브러리를 안 씁니다.** EXIF 읽기는 아래 150줄이면 됩니다.
 *   이 앱이 밖에서 받는 것은 supabase 하나뿐이고(sw.js 의 isCodeUrl),
 *   사진을 다루는 코드를 CDN 에서 받아오는 것은 안심시키기 어렵습니다.
 */
import { $, esc, toast } from './dom.js?v=b755';
import { sb } from './db.js?v=b755';
import { cities } from './cities.js?v=b755';
import { distKm } from './calc.js?v=b755';

/* ⚠⚠ **spree.js 를 여기서 import 하지 «않습니다».** ⚠⚠
   photo.js 를 쓰는 rating.js 를 spree.js 가 다시 쓰므로, 여기서 부르면
   rating → photo → spree → rating 고리가 생깁니다. 이 앱의 규칙대로
   **둘 다 아는 app.js 가 넣어줍니다**(ctx 주입 — 같은 이유로 생긴 규칙이
   spree.js 의 `afterSpree` 주석에 적혀 있습니다). */
let ctx = { me: () => null, 새로고침: async () => {}, 매기기: () => {} };
export function setPhotoCtx(o){ ctx = { ...ctx, ...o }; }

/* ⚠ 한 번에 너무 많이 고르면 폰이 멈춥니다. 앞 1000장만 봅니다 —
   그보다 많이 골랐으면 그렇다고 말합니다(조용히 버리지 않습니다). */
const 최대장수 = 1000;
/* 사진 앞 128KB 안에 EXIF 가 있습니다. 통째로 읽으면 한 장에 5MB 입니다. */
const 읽을양 = 131072;
/* 도시 중심에서 이만큼 안이면 그 도시로 칩니다. 넓게 잡으면 옆 도시가
   물리고, 좁게 잡으면 근교에서 찍은 사진이 다 버려집니다. 80km 는
   「그 도시에 간 것」이라고 말할 수 있는 한계입니다(도쿄↔하코네 78km). */
const 붙는거리 = 80;

/* ── EXIF ────────────────────────────────────────────────────────────
 * JPEG 는 0xFFD8 로 시작하고 «표식(marker)»이 줄줄이 붙습니다. 그중
 * APP1(0xFFE1) 안에 "Exif\0\0" 로 시작하는 TIFF 덩어리가 있고, 거기
 * GPS 칸이 들어 있습니다.
 * ⚠ **바이트 차례가 파일마다 다릅니다**(II=작은끝, MM=큰끝). 한쪽만
 *   읽으면 어떤 폰 사진은 좌표가 통째로 엉뚱하게 나옵니다.
 * ⚠ HEIC(아이폰 기본)는 이 길로 안 읽힙니다. 다만 `<input type=file>` 로
 *   고르면 iOS 가 대개 JPEG 로 바꿔 줍니다. 안 바뀐 것은 «위치 없음»으로
 *   세고 몇 장인지 알려줍니다 — 조용히 버리면 왜 적게 나왔는지 모릅니다. */
function exif좌표(buf){
  const d = new DataView(buf);
  if (d.byteLength < 4 || d.getUint16(0) !== 0xFFD8) return null;   /* JPEG 아님 */

  /* 표식을 따라가며 APP1 을 찾습니다. */
  let p = 2, tiff = -1;
  while (p + 4 <= d.byteLength){
    if (d.getUint8(p) !== 0xFF) break;
    const mark = d.getUint8(p + 1);
    if (mark === 0xDA) break;                     /* 그림 자료 시작 — 여기부턴 없습니다 */
    const len = d.getUint16(p + 2);
    if (len < 2) break;
    if (mark === 0xE1 && p + 10 <= d.byteLength
        && d.getUint32(p + 4) === 0x45786966){    /* "Exif" */
      tiff = p + 10;
      break;
    }
    p += 2 + len;
  }
  if (tiff < 0 || tiff + 8 > d.byteLength) return null;

  const 작은끝 = d.getUint16(tiff) === 0x4949;
  const u16 = o => d.getUint16(o, 작은끝);
  const u32 = o => d.getUint32(o, 작은끝);
  if (u16(tiff + 2) !== 0x002A) return null;

  /* IFD 한 덩이에서 찾는 칸의 «값 자리»를 돌려줍니다. */
  const 칸찾기 = (ifd, tag) => {
    if (ifd + 2 > d.byteLength) return null;
    const n = u16(ifd);
    for (let i = 0; i < n; i++){
      const e = ifd + 2 + i * 12;
      if (e + 12 > d.byteLength) return null;
      if (u16(e) === tag) return { type: u16(e + 2), cnt: u32(e + 4), val: e + 8 };
    }
    return null;
  };
  /* 값이 4바이트를 넘으면 그 자리에 «어디 있는지»가 적혀 있습니다. */
  const 값자리 = (칸, 한칸) =>
    칸.cnt * 한칸 <= 4 ? 칸.val : tiff + u32(칸.val);

  const ifd0 = tiff + u32(tiff + 4);
  const gps칸 = 칸찾기(ifd0, 0x8825);
  if (!gps칸) return null;
  const gps = tiff + u32(gps칸.val);

  /* 도·분·초 세 쌍(RATIONAL = 32비트 둘)을 십진수로. */
  const 도분초 = tag => {
    const 칸 = 칸찾기(gps, tag);
    if (!칸 || 칸.type !== 5 || 칸.cnt !== 3) return null;
    const o = tiff + u32(칸.val);
    if (o + 24 > d.byteLength) return null;
    let v = 0;
    for (let i = 0; i < 3; i++){
      const 분자 = u32(o + i * 8), 분모 = u32(o + i * 8 + 4);
      if (!분모) return null;
      v += (분자 / 분모) / Math.pow(60, i);
    }
    return v;
  };
  const 방향 = tag => {
    const 칸 = 칸찾기(gps, tag);
    if (!칸 || 칸.type !== 2) return '';
    return String.fromCharCode(d.getUint8(값자리(칸, 1))).toUpperCase();
  };

  const lat = 도분초(0x0002), lng = 도분초(0x0004);
  if (lat == null || lng == null) return null;
  const ns = 방향(0x0001), ew = 방향(0x0003);
  const y = ns === 'S' ? -lat : lat;
  const x = ew === 'W' ? -lng : lng;
  /* 0,0 은 «못 구했다»는 뜻으로 넣는 기기가 있습니다. 바다 한가운데라
     어차피 붙을 도시도 없지만, 여기서 거릅니다. */
  if (!isFinite(y) || !isFinite(x) || (Math.abs(y) < 0.01 && Math.abs(x) < 0.01))
    return null;
  if (Math.abs(y) > 90 || Math.abs(x) > 180) return null;
  return { lat: y, lng: x };
}

/* ── 좌표 → 도시 ─────────────────────────────────────────────────────
 * 469곳을 전부 재도 한 장에 1ms 가 안 걸립니다. 격자로 나누는 최적화는
 * 필요해지면 그때 합니다 — 지금 하면 읽기만 어려워집니다. */
function 가까운도시(p){
  let 고른 = null, 최소 = Infinity;
  for (const c of (cities || [])){
    if (c.lat == null || c.lng == null) continue;
    /* 먼저 네모로 거릅니다 — 1도는 111km 이므로 위도 차가 1도를 넘으면
       볼 것도 없습니다. 이 한 줄이 계산을 스무 배 줄입니다. */
    if (Math.abs(Number(c.lat) - p.lat) > 1) continue;
    const d = distKm(Number(c.lat), Number(c.lng), p.lat, p.lng);
    if (d != null && d < 최소){ 최소 = d; 고른 = c; }
  }
  return 최소 <= 붙는거리 ? { city: 고른, km: 최소 } : null;
}

/* ── 훑기 ────────────────────────────────────────────────────────────
 * 한 장씩 차례로 읽습니다. 한꺼번에 읽으면 폰 메모리가 터집니다.
 * ⚠ 화면을 막지 않습니다 — 스무 장마다 한 숨 쉬어 진행 글자가 바뀝니다. */
async function 훑기(files, 알림){
  const 셈 = { 전체: files.length, 본것: 0, 위치없음: 0 };
  const 모은것 = new Map();          /* city.id → { city, 장수 } */
  for (const f of files){
    셈.본것++;
    try {
      const buf = await f.slice(0, 읽을양).arrayBuffer();
      const p = exif좌표(buf);
      if (!p){ 셈.위치없음++; }
      else {
        const hit = 가까운도시(p);
        if (!hit) 셈.위치없음++;
        else {
          const 줄 = 모은것.get(hit.city.id) || { city: hit.city, 장수: 0 };
          줄.장수++;
          모은것.set(hit.city.id, 줄);
        }
      }
    } catch { 셈.위치없음++; }
    if (셈.본것 % 20 === 0){
      알림(셈);
      await new Promise(r => setTimeout(r, 0));
    }
  }
  알림(셈);
  return { 셈, 도시들: [...모은것.values()].sort((a, b) => b.장수 - a.장수) };
}

/* ── 화면 ────────────────────────────────────────────────────────────── */
let 찾은것 = [];

function 시트(html){
  $('phbody').innerHTML = html;
  $('phsheet').classList.remove('hide');
  if (history.state?.t2 !== 'photo') history.pushState({ t2: 'photo' }, '');
}
export function closePhoto(뒤로온것){
  const 판 = $('phsheet');
  if (!판 || 판.classList.contains('hide')) return;
  if (!뒤로온것 && history.state?.t2 === 'photo'){ history.back(); return; }
  판.classList.add('hide');
  찾은것 = [];
}
export const isPhotoOpen = () =>
  !!$('phsheet') && !$('phsheet').classList.contains('hide');

function 고른수(){ return $('phbody').querySelectorAll('[data-ph].on').length; }
function 단추글(){
  const n = 고른수();
  const b = $('phsave');
  if (b){ b.textContent = n ? `${n}곳 별점 매기기` : '고른 곳이 없어요'; b.disabled = !n; }
}

function 결과그리기({ 셈, 도시들 }){
  찾은것 = 도시들;
  if (!도시들.length){
    시트(`<div class="phhead"><b>찾은 곳이 없어요</b></div>
      <div class="empty" style="padding:6px 2px 14px">
        고른 사진 ${셈.전체}장에 위치 정보가 없었어요.
        <div class="memo" style="margin-top:6px">
          아이폰은 「설정 → 개인정보 보호 → 위치 서비스 → 카메라」가 꺼져 있으면
          사진에 위치가 안 담겨요. 캡처 화면이나 받은 사진에도 없어요.
        </div>
      </div>
      <button class="small" data-phclose="1">닫기</button>`);
    return;
  }
  const 줄 = 도시들.map(({ city, 장수 }) => `
    <button class="phrow on" data-ph="${esc(city.id)}">
      <span class="bx"></span>
      <span class="phim"${city.image_url
        ? ` style="background-image:url('${esc(city.image_url)}')"` : ''}
        >${city.image_url ? '' : esc(city.name.slice(0, 1))}</span>
      <span class="pht"><b>${esc(city.name)}</b><i>사진 ${장수}장</i></span>
    </button>`).join('');
  시트(`<div class="phhead">
      <b>${도시들.length}곳을 찾았어요</b>
      <span>사진 ${셈.전체}장 중 ${셈.위치없음}장은 위치가 없어 건너뛰었어요</span>
    </div>
    <div class="phlist">${줄}</div>
    <div class="phfoot">
      <button class="primary" id="phsave">${도시들.length}곳 별점 매기기</button>
      <button class="small" id="phlater">나중에</button>
    </div>`);
}

/* ⚠⚠ **가져오기의 끝은 «별점»입니다(b755, 사용자 지적: 「이건 그냥
   가봤다이고 별점을 못남기잖아 우리는 별점을 남기게하는게 우선순위야」).** ⚠⚠
   b754 는 넣고 목록으로 돌려보냈습니다. 목록 맨 위에 「평가 대기」로 서긴
   하지만, 거기까지 가서 하나씩 누르는 것은 **다른 일**입니다.
   → 넣자마자 **그 곳들만** 넘기며 매기기로 보냅니다. 사진첩을 연 김에
     별점까지 받는 것이 이 기능의 목적입니다.
   ⚠ 「나중에」도 남깁니다 — 다녀온 기록만 남기고 싶은 사람도 있습니다.
   ⚠ **한 번에 씁니다(upsert).** 한 줄씩 넣으면 마흔 곳이 마흔 번 왕복입니다.
   ⚠ `stars` 는 **건드리지 않습니다** — 이미 매긴 곳을 사진으로 덮으면
     별점이 날아갑니다. `been` 만 켭니다. */
async function 저장(바로매기기){
  const me = ctx.me()?.id;
  if (!me) return toast('로그인이 필요해요.');
  const 고른 = [...$('phbody').querySelectorAll('[data-ph].on')].map(b => b.dataset.ph);
  if (!고른.length) return;
  const b = $('phsave');
  b.disabled = true; b.textContent = '넣는 중…';
  const rows = 고른.map(id => ({ user_id: me, city_id: id, been: true }));
  const { error } = await sb.from('city_ratings')
    .upsert(rows, { onConflict: 'user_id,city_id', ignoreDuplicates: false });
  if (error){
    b.disabled = false; 단추글();
    return toast('넣지 못했어요. 잠시 뒤 다시 해주세요.');
  }
  closePhoto();
  await ctx.새로고침();
  if (바로매기기) return ctx.매기기(고른);
  toast(`${고른.length}곳을 다녀온 곳에 넣었어요.`);
}

/* ── 들어오는 문 ─────────────────────────────────────────────────────── */
export function openPhoto(){
  const inp = $('phfile');
  if (!inp) return;
  inp.value = '';          /* 같은 사진을 다시 골라도 change 가 오게 */
  inp.click();
}

$('phfile')?.addEventListener('change', async () => {
  const all = [...($('phfile').files || [])];
  if (!all.length) return;
  const files = all.slice(0, 최대장수);
  시트(`<div class="phhead"><b>사진을 보는 중…</b>
      <span id="phcnt">0 / ${files.length}</span></div>
    <div class="empty" style="padding:14px 2px 18px">
      <span class="load">위치만 읽고 있어요 — 사진은 이 기기 밖으로 안 나가요</span>
    </div>`);
  const 결과 = await 훑기(files, 셈 => {
    const el = $('phcnt');
    if (el) el.textContent = `${셈.본것} / ${셈.전체}`;
  });
  if (all.length > 최대장수)
    결과.셈.전체 = 최대장수;
  결과그리기(결과);
  if (all.length > 최대장수)
    toast(`한 번에 ${최대장수}장까지만 봐요. 나머지는 다시 골라주세요.`);
});

$('phsheet')?.addEventListener('click', e => {
  if (e.target.closest('[data-phclose]')) return closePhoto();
  if (e.target.closest('#phlater')) return 저장(false);
  if (e.target.closest('#phsave')) return 저장(true);
  const r = e.target.closest('[data-ph]');
  if (r){ r.classList.toggle('on'); 단추글(); }
});
