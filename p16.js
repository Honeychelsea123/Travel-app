/* ══ 도감 — 여행 유형 열여섯 가지 ══════════════════════════════════════
 *
 * 사용자: 「카드 퀄리티가 좋아서 사람들이 다른 성향도 보고 싶을 것 같은데」.
 * 그래서 **그림이 주인공**입니다 — 처음에 줄 목록으로 그렸다가 반려됐습니다
 * (「이미지 위주로 보여주고 싶은데 너무 줄만있잖아」). 코드와 이름만 그림
 * 위에 얹고, 설명은 하나를 눌렀을 때로 미룹니다.
 *
 * ⚠⚠ **목록에는 «썸네일»을 씁니다(persona/t/*.jpg).** ⚠⚠
 *   원본 열여섯 장은 합쳐서 3.8MB 입니다. 그것을 격자에 깔면 도감을 열 때마다
 *   3.8MB 를 받습니다 — 폰에서 도감 한 번이 사진 앨범 한 편입니다.
 *   썸네일은 360px JPEG 로 **합쳐서 350KB**(장당 22KB)입니다.
 *   ⚠ 원본(webp)은 **상세에서 한 장만** 받습니다. 격자에서 원본을 쓰면
 *     썸네일을 만든 뜻이 없어집니다.
 *   ⚠ `loading="lazy"` 를 답니다 — 여덟 줄 중 처음 두 줄만 보입니다.
 *
 * ⚠ 여기서 궁합을 **다시 계산하지 않습니다.** card.js 의 `personaMatch` 가
 *   성향 화면·카드 그림·친구 궁합이 다 쓰는 하나입니다. 여기서 따로 재면
 *   같은 두 유형이 화면마다 다른 점수를 냅니다.
 */
import { $, esc } from './dom.js?v=b739';
import { PERSONA16, AXIS_NAME, AXIS_WORD, personaMatch } from './card.js?v=b739';

/* ⚠ 코드 열여섯의 «차례»는 PERSONA16 에 적힌 차례 그대로입니다 —
   FLNG → HMDP 로, 축 네 자리가 자리별로 뒤집히는 차례라 격자에서 이웃끼리
   한 글자만 다릅니다. 이름순·궁합순으로 흩으면 그 규칙이 안 보입니다. */
const 코드들 = Object.keys(PERSONA16);

let 내코드 = null;
let 지금   = null;   /* 상세로 연 코드. null 이면 격자입니다. */


/* ── 격자 ───────────────────────────────────────────────────────────
 * ⚠ **내 유형이 맨 앞입니다.** 열여섯 중 내 것을 찾느라 훑게 하면 안 됩니다.
 * ⚠ 궁합 배지는 **가장 잘 맞는 하나 · 가장 안 맞는 하나**에만 답니다.
 *   열여섯 칸에 다 붙이면 숫자가 그림을 덮습니다. 이 둘은 성향 화면의
 *   「나와 맞는 사람」에 이미 나와 있어서, 같은 것을 도감에서 찾는 셈입니다. */
function 격자(){
  const 쨍 = 내코드 ? [...코드들].filter(c => c !== 내코드)
    .sort((a, b) => personaMatch(내코드, b) - personaMatch(내코드, a)) : [];
  const 최고 = 쨍[0], 최악 = 쨍[쨍.length - 1];
  const 차례 = 내코드 ? [내코드, ...코드들.filter(c => c !== 내코드)] : 코드들;

  const 칸 = 차례.map(code => {
    const t = PERSONA16[code];
    const 나 = code === 내코드;
    const 표 = 나 ? '<span class="p16chip me">나</span>'
      : code === 최고 ? `<span class="p16chip good">${personaMatch(내코드, code)}%</span>`
      : code === 최악 ? `<span class="p16chip bad">${personaMatch(내코드, code)}%</span>` : '';
    /* ⚠ 그림이 안 오면 칸이 통째로 까맣게 됩니다 — 그림 위에 흰 글자를
       얹었기 때문입니다. `onerror` 로 «그림 없음» 표시를 답니다. */
    return `<button class="p16cell${나 ? ' mine' : ''}" data-p16go="${code}">
      <span class="sz"></span>
      <img src="./persona/t/${code}.jpg?v=b739" alt="" loading="lazy" decoding="async"
           onerror="this.closest('.p16cell').classList.add('noart')">
      <span class="sh"></span>${표}
      <span class="p16lb"><i>${code}</i><b>${esc(t.n)}</b></span>
    </button>`;
  }).join('');

  return `<div class="shhead">
      <span>여행 유형 16가지</span>
      <button class="shdone" data-p16close="1">닫기</button>
    </div>
    <div class="p16grid">${칸}</div>`;
}

/* ── 하나 ───────────────────────────────────────────────────────────
 * 사용자: 「요약이랑 궁합도만 있고 자세한 설명은 누르면 보이게 해줘」.
 * 요약은 **그림 안에 이미 있습니다**(코드 · 이름 · 한 줄 · 축 네 마디) —
 * 성향 화면 머리와 같은 부품(`.phero`)이라 두 벌로 그리지 않습니다.
 * ⚠ 그래서 그림 밖에 남는 것은 궁합 한 줄과 «접힌» 축 넷뿐입니다. */
function 하나(code){
  const t = PERSONA16[code] || {};
  const i = 코드들.indexOf(code);
  const 긴이름 = (t.n || '').length >= 10 ? ' long' : '';

  /* ⚠ 내 유형을 아직 모르면(평가가 모자라면) 궁합도 «다른 점»도 못 냅니다.
     그 자리를 빈 채로 두지 말고 아예 안 답니다 — 0% 로 적으면 거짓말입니다. */
  /* ⚠ **접지 않습니다(b739, 사용자 결정: 「굳이 접지 말고 처음부터 다
     펴진 상태로 나오고」).** 넷뿐이라 접어서 아낄 자리가 없었고, 접어 두면
     이 화면에서 제일 쓸모 있는 것을 한 번 더 눌러야 봅니다. */
  const 견줌 = 내코드 && 내코드 !== code ? `
    <div class="p16mate"><span>나와의 궁합</span>
      <b>${personaMatch(내코드, code)}%</b></div>
    <div class="p16dh">나와 뭐가 다른가요</div>
    <div class="p16diff">${AXIS_NAME.map((이름, k) => {
      const 나글 = AXIS_WORD[내코드[k]], 저글 = AXIS_WORD[code[k]];
      const 같 = 내코드[k] === code[k];
      return `<div class="p16dr${같 ? '' : ' off'}"><span>${esc(이름)}</span>
        <b>${같 ? '같음' : '다름'}</b>
        <i>${같 ? `둘 다 ${esc(나글)}`
                : `나는 ${esc(나글)} · 이 유형은 ${esc(저글)}`}</i></div>`;
    }).join('')}</div>`
    : 내코드 === code
      ? '<div class="p16mine">내 유형입니다</div>' : '';

  return `<div class="shhead">
      <button class="shdone" data-p16back="1">‹ 도감</button>
      <span class="p16n">${i + 1} / 16</span>
      <button class="shdone" data-p16next="1">다음 ›</button>
    </div>
    <div class="p16wrap" id="p16one">
      <div class="phero">
        <div class="psizer"></div>
        <img src="./persona/${code}.webp?v=b739" alt="" decoding="async"
             onerror="this.closest('.phero').classList.add('noart')">
        <div class="pscrim"></div>
        <div class="ptxt">
          <div class="peyebrow">여행 유형</div>
          <div class="pcode">${esc(code)}</div>
          <div class="pname${긴이름}">${esc(t.n || code)}</div>
          ${t.d ? `<div class="pdesc">${esc(t.d)}</div>` : ''}
          <!-- ⚠ **축 네 마디(「유명한 곳 · 한 나라 · 멀리 · 까다로움」)를
               뗐습니다(b738, 사용자: 「이거 부연설명도 빼자」).** 밑의
               「나와 뭐가 다른가요」가 같은 넷을 «나와 견줘서» 말합니다 —
               견줌이 있는 쪽이 낫고, 둘 다 두면 같은 말이 두 번입니다.
             ⚠ 성향 화면 머리(persona.js)에는 «남깁니다». 거기는 견줄
               상대가 없어서 이 줄이 유일한 풀이입니다. -->
        </div>
      </div>
      ${견줌}
      <div class="p16hint">좌우로 넘겨서 다른 유형도 보세요</div>
    </div>`;
}

function 그리기(){
  const 몸 = $('p16body');
  if (!몸) return;
  몸.innerHTML = 지금 ? 하나(지금) : 격자();
  몸.scrollTop = 0;
  if (지금) 이웃받기();
}

/* ⚠ **넘기기 전에 옆 그림을 받아 둡니다.** 원본은 장당 140~480KB 라, 넘긴
   뒤에 받기 시작하면 잠깐 빈 칸이 보입니다. 앞뒤 한 장씩만 받습니다 —
   열여섯 장을 다 받으면 썸네일을 만든 뜻이 없어집니다. */
function 이웃받기(){
  const i = 코드들.indexOf(지금);
  if (i < 0) return;
  for (const d of [1, -1]){
    const c = 코드들[(i + d + 코드들.length) % 코드들.length];
    const im = new Image();
    im.src = `./persona/${c}.webp?v=b737`;
  }
}

/* ⚠ 열여섯이 도는 고리입니다(마지막 다음이 처음). 끝이 없으니 「더 없음」을
   따로 알릴 것도 없습니다. */
function 넘기기(d){
  const i = 코드들.indexOf(지금);
  if (i < 0) return;
  지금 = 코드들[(i + d + 코드들.length) % 코드들.length];
  그리기();
  /* 반대쪽에서 들어오는 시늉. ⚠ 클래스를 붙였다 바로 떼면 브라우저가
     한 번에 계산해서 «아무 일도 안 일어납니다» — 사이에 리플로를 한 번
     강제해야 전환이 돕니다(`offsetWidth` 읽기). */
  const el = $('p16one');
  if (!el) return;
  const cls = d > 0 ? 'fromr' : 'froml';
  el.classList.add(cls);
  void el.offsetWidth;
  el.classList.remove(cls);
}

/* ── 열고 닫기 ──────────────────────────────────────────────────────
 * ⚠⚠ **기록에 자리를 «두 겹» 남깁니다(`p16` · `p16one`).** ⚠⚠
 *   상세를 시트와 같은 자리로 두면, 상세에서 뒤로가기 한 번에 도감까지
 *   같이 닫힙니다 — 열여섯 장을 넘겨보는 화면에서 그러면 못 씁니다.
 *   보관함 시트(shelf.js)가 쓰는 수법과 같고, 닫는 차례는 tripview.js 의
 *   사슬에 적습니다. **거기에 안 적으면 뒤로가기가 이 시트를 건너뜁니다.** */
export function open16(code){
  내코드 = code || null;
  지금 = null;
  그리기();
  $('p16sheet').classList.remove('hide');
  if (history.state?.t2 !== 'p16') history.pushState({ t2: 'p16' }, '');
}
export function close16(뒤로온것){
  const 판 = $('p16sheet');
  if (!판 || 판.classList.contains('hide')) return;
  if (!뒤로온것 && history.state?.t2 === 'p16'){ history.back(); return; }
  판.classList.add('hide');
  지금 = null;
}
export const is16Open = () =>
  !!$('p16sheet') && !$('p16sheet').classList.contains('hide');
export const isOne16Open = () => is16Open() && 지금 != null;

function 하나열기(code){
  지금 = code;
  그리기();
  if (history.state?.t2 !== 'p16one') history.pushState({ t2: 'p16one' }, '');
}
export function closeOne16(뒤로온것){
  if (지금 == null) return;
  if (!뒤로온것 && history.state?.t2 === 'p16one'){ history.back(); return; }
  지금 = null;
  그리기();
}

/* ⚠ 듣는 곳은 시트 하나입니다 — 안을 다시 그릴 때마다 단추에 달면
   지운 단추의 사건이 남습니다(이 앱에서 여러 번 겪은 자리). */
$('p16sheet')?.addEventListener('click', e => {
  if (e.target.closest('[data-p16close]')) return close16();
  if (e.target.closest('[data-p16back]'))  return closeOne16();
  const g = e.target.closest('[data-p16go]');
  if (g) return 하나열기(g.dataset.p16go);
  if (e.target.closest('[data-p16next]')) return 넘기기(1);
});

/* ── 좌우로 넘기기(b739, 사용자 요청) ────────────────────────────────
 * ⚠⚠ **듣는 곳은 시트입니다.** 상세는 넘길 때마다 통째로 다시 그려지므로,
 *   안쪽 칸에 달면 한 번 넘긴 뒤 사건이 끊깁니다.
 * ⚠⚠ **세로 굴리기를 뺏으면 안 됩니다.** 처음 몇 px 을 보고 «가로가 확실할
 *   때만» 끌기로 칩니다(가로가 세로의 1.4배). 안 그러면 목록을 위아래로
 *   굴리려다 유형이 넘어갑니다.
 * ⚠ 격자에서는 안 듣습니다(`지금 == null`). 거기서는 세로 굴리기뿐입니다. */
let 시작x = 0, 시작y = 0, 끌기 = null;
const 판16 = $('p16sheet');
판16?.addEventListener('touchstart', e => {
  끌기 = null;
  if (지금 == null || e.touches.length !== 1) return;
  시작x = e.touches[0].clientX;
  시작y = e.touches[0].clientY;
  끌기 = false;                     /* 아직 «가로인지» 모릅니다 */
}, { passive: true });

판16?.addEventListener('touchmove', e => {
  if (끌기 == null || e.touches.length !== 1) return;
  const dx = e.touches[0].clientX - 시작x;
  const dy = e.touches[0].clientY - 시작y;
  if (!끌기){
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dx) <= Math.abs(dy) * 1.4){ 끌기 = null; return; }
    끌기 = true;
  }
  /* 손가락을 따라옵니다. 전환은 잠깐 꺼야 «따라오는» 느낌이 납니다. */
  const el = $('p16one');
  if (!el) return;
  e.preventDefault();
  el.style.transition = 'none';
  el.style.transform = `translateX(${dx}px)`;
}, { passive: false });

판16?.addEventListener('touchend', e => {
  const 끌었나 = 끌기 === true;
  끌기 = null;
  const el = $('p16one');
  if (el){ el.style.transition = ''; el.style.transform = ''; }
  if (!끌었나) return;
  const dx = (e.changedTouches[0]?.clientX ?? 시작x) - 시작x;
  /* 45px 은 «흘린 손짓»과 «넘기려는 손짓»이 갈리는 자리입니다. 너무 작게
     잡으면 그림을 누르려다 넘어갑니다. */
  if (Math.abs(dx) > 45) 넘기기(dx < 0 ? 1 : -1);
}, { passive: true });
