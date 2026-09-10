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
import { $, esc, coverDeck, toTop } from './dom.js?v=b743';
import { PERSONA16, AXIS_NAME, AXIS_WORD, personaMatch } from './card.js?v=b743';

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
      <img src="./persona/t/${code}.jpg?v=b743" alt="" loading="lazy" decoding="async"
           onerror="this.closest('.p16cell').classList.add('noart')">
      <span class="sh"></span>${표}
      <span class="p16lb"><i>${code}</i><b>${esc(t.n)}</b></span>
    </button>`;
  }).join('');

  /* ⚠ 다른 판(일기장·보관함)과 **같은 뼈대**입니다 — 위에 「← 분석」 한 줄,
     그 아래 제목 카드. 판마다 머리 모양이 다르면 어디 있는지 헷갈립니다. */
  return `<div class="card p16bar">
      <button class="ghost" data-p16close="1">← 분석</button>
    </div>
    <div class="card">
      <h2>여행 유형 16가지</h2>
      <div class="p16grid">${칸}</div>
    </div>`;
}

/* ── 하나 ───────────────────────────────────────────────────────────
 * 사용자: 「요약이랑 궁합도만 있고 자세한 설명은 누르면 보이게 해줘」.
 * 요약은 **그림 안에 이미 있습니다**(코드 · 이름 · 한 줄 · 축 네 마디) —
 * 성향 화면 머리와 같은 부품(`.phero`)이라 두 벌로 그리지 않습니다.
 * ⚠ 그래서 그림 밖에 남는 것은 궁합 한 줄과 «접힌» 축 넷뿐입니다. */
function 슬라이드(code){
  const t = PERSONA16[code] || {};
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

  return `<div class="p16slide">
      <div class="phero">
        <!-- 썸네일을 먼저 깔아 깜빡임을 막습니다(b743) — persona.js 와 같은 수법.
             넘길 때마다 슬라이드를 새로 그리므로 여기가 더 티가 납니다. -->
        <div class="psizer"
             style="background-image:url('./persona/t/${code}.jpg?v=b743')"></div>
        <img src="./persona/${code}.webp?v=b743" alt="" decoding="async"
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

/* ── 넘기는 칸 ──────────────────────────────────────────────────────
 * ⚠⚠ **손으로 미는 대신 «진짜 가로 스크롤»에 맡깁니다(b740).** ⚠⚠
 *   b739 는 touchmove 로 손가락을 따라가다가 놓으면 «제자리로 튕겼다가»
 *   새 것이 34px 에서 끼어드는 식이었습니다 — 사용자: 「팍팍 튀는데」.
 *   두 동작이 이어지지 않으니 당연합니다.
 *   → 앞·지금·뒤 **세 장을 깔고** `scroll-snap` 으로 굴립니다. 브라우저가
 *     관성까지 알아서 처리하므로 손가락에 딱 붙고, 우리 코드는 «멈춘 뒤에»
 *     한 번만 끼어듭니다.
 * ⚠ 세 장뿐입니다. 열여섯을 다 깔면 그림 3.8MB 를 통째로 받습니다.
 * ⚠ 멈춘 자리가 가운데가 아니면 그 방향으로 한 칸 옮기고 **다시 그립니다**
 *   — 그리자마자 가운데로 되돌려 놓아서, 다음 몸짓도 양쪽으로 열려 있습니다. */
function 하나(code){
  const i = 코드들.indexOf(code);
  const 앞 = 코드들[(i - 1 + 코드들.length) % 코드들.length];
  const 뒤 = 코드들[(i + 1) % 코드들.length];
  return `<div class="card p16bar">
      <button class="ghost" data-p16back="1">← 도감</button>
      <span class="p16n">${i + 1} / 16</span>
      <button class="ghost" data-p16next="1">다음 ›</button>
    </div>
    <div class="p16track" id="p16track">${[앞, code, 뒤].map(슬라이드).join('')}</div>`;
}

/* ⚠ 스크롤 사건은 **거품이 안 올라옵니다** — 시트에 한 번 달아 두는 수법이
   여기서는 안 통합니다. 칸이 다시 그려질 때마다 새로 답니다(옛 칸은 통째로
   사라지므로 사건도 같이 사라집니다). */
function 칸잡기(){
  const t = $('p16track');
  if (!t) return;
  /* 가운데로. `scrollLeft` 를 읽는 순간 배치가 계산되므로 innerHTML 바로
     뒤에 불러도 됩니다 — 그려지기 «전»이라 깜빡임이 없습니다. */
  t.scrollLeft = t.clientWidth;
  let 타이머 = 0;
  t.addEventListener('scroll', () => {
    clearTimeout(타이머);
    /* ⚠ 멈춘 뒤에만 셉니다. 굴리는 도중에 다시 그리면 손가락 밑에서
       내용이 바뀝니다. 90ms 는 `scrollend` 가 없는 기기까지 덮는 값입니다. */
    타이머 = setTimeout(() => {
      const w = t.clientWidth;
      if (!w) return;
      const k = Math.round(t.scrollLeft / w);   /* 0=앞 · 1=제자리 · 2=뒤 */
      if (k === 1) return;
      const i = 코드들.indexOf(지금);
      지금 = 코드들[(i + (k - 1) + 코드들.length) % 코드들.length];
      그리기();
    }, 90);
  }, { passive: true });
}

function 그리기(){
  const 몸 = $('p16body');
  if (!몸) return;
  몸.innerHTML = 지금 ? 하나(지금) : 격자();
  몸.scrollTop = 0;
  if (지금){ 칸잡기(); 이웃받기(); }
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
    im.src = `./persona/${c}.webp?v=b743`;
  }
}

/* 「다음 ›」 도 **같은 길로** 갑니다 — 칸을 부드럽게 굴려 두면 위의 `scroll`
   이 알아서 받아 넘깁니다. 두 벌로 두면 몸짓과 단추가 다르게 움직입니다. */
function 넘기기(d){
  const t = $('p16track');
  if (!t) return;
  t.scrollTo({ left: t.clientWidth * (d > 0 ? 2 : 0), behavior: 'smooth' });
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
  /* ⚠ **판을 먼저 보이고 나서 그립니다.** 아래 `칸잡기` 가 칸 너비를 재서
     가운데로 옮기는데, 숨어 있는 동안에는 너비가 0 입니다(이 앱에서 여러 번
     겪은 함정 — dom.js 의 `toTop`, app.js 의 `덱으로` 주석 참고). */
  $('p16pane')?.classList.remove('hide');
  coverDeck(true);
  그리기();
  toTop($('p16pane'));
  if (history.state?.t2 !== 'p16') history.pushState({ t2: 'p16' }, '');
}
export function close16(뒤로온것){
  const 판 = $('p16pane');
  if (!판 || 판.classList.contains('hide')) return;
  if (!뒤로온것 && history.state?.t2 === 'p16'){ history.back(); return; }
  판.classList.add('hide');
  /* 탭을 안 바꿨으니 덱만 걷으면 나온 자리(분석 탭)가 그대로 다시 섭니다. */
  coverDeck(false);
  지금 = null;
}
export const is16Open = () =>
  !!$('p16pane') && !$('p16pane').classList.contains('hide');
export const isOne16Open = () => is16Open() && 지금 != null;

function 하나열기(code){
  지금 = code;
  그리기();
  toTop($('p16pane'));
  if (history.state?.t2 !== 'p16one') history.pushState({ t2: 'p16one' }, '');
}
export function closeOne16(뒤로온것){
  if (지금 == null) return;
  if (!뒤로온것 && history.state?.t2 === 'p16one'){ history.back(); return; }
  지금 = null;
  그리기();
  toTop($('p16pane'));
}

/* ⚠ 듣는 곳은 시트 하나입니다 — 안을 다시 그릴 때마다 단추에 달면
   지운 단추의 사건이 남습니다(이 앱에서 여러 번 겪은 자리). */
$('p16pane')?.addEventListener('click', e => {
  if (e.target.closest('[data-p16close]')) return close16();
  if (e.target.closest('[data-p16back]'))  return closeOne16();
  const g = e.target.closest('[data-p16go]');
  if (g) return 하나열기(g.dataset.p16go);
  if (e.target.closest('[data-p16next]')) return 넘기기(1);
});

