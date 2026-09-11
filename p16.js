/* ══ 도감 — 여행 유형 열여섯 가지 ══════════════════════════════════════
 *
 * 사용자: 「카드 퀄리티가 좋아서 사람들이 다른 성향도 보고 싶을 것 같은데」.
 * 그래서 **그림이 주인공**입니다. 여기까지 오는 데 세 번 갈아엎었습니다 —
 * 그 셋을 다 적어 둡니다. 되돌리려는 다음 사람이 같은 길을 다시 걷지 않게.
 *
 *   b737  줄 목록(코드 · 이름 · 한 줄)  → 반려: 「이미지 위주로 보여주고
 *         싶은데 너무 줄만있잖아」
 *   b738  2열 격자가 «첫 화면»          → 반려: 「16가지 한판에 나오는데
 *         이러면 감성이 너무 없어서」
 *   b740  한 판에 한 장씩 넘기기        → 반려: 「페이지에 하나씩만 나오니까
 *         또 감성이 없어」
 *   b744  **엿보기 캐러셀**(지금) — 가운데 카드가 크고 양옆이 살짝 보입니다.
 *         사용자가 레퍼런스를 붙여 정한 모양입니다.
 *
 * ⚠⚠ **첫 화면은 «내 성향 카드»입니다.** 열면 내 유형이 가운데 서 있고
 *   좌우로 넘겨 남의 것을 봅니다. 격자는 「모아보기」 단추 하나로 들어가는
 *   **곁가지**입니다(사용자: 「16개 모아서 볼 수 있는 버튼도 하나만」).
 *
 * ⚠⚠ **캐러셀은 열여섯 장을 «다» 깔고, 다시 그리지 않습니다.** ⚠⚠
 *   b740 은 세 장만 깔고 넘길 때마다 다시 그렸는데, 엿보기에서는 양옆이
 *   보이므로 다시 그릴 때마다 그 가장자리가 번쩍입니다. 열여섯을 깔아두고
 *   **가운데가 누구인지만** 고쳐 칠합니다 — 스크롤 자리도 그대로 남습니다.
 *   무게는 `loading="lazy"` 와 중간 크기 그림(m/)으로 잡습니다.
 *
 * ⚠ 그림이 셋입니다. 자리마다 다른 것을 씁니다:
 *     persona/CODE.webp   원본(장당 약 490KB) — **공유 카드 그림만**(card.js)
 *     persona/m/CODE.jpg  720px(장당 77KB)    — 화면(성향 머리 · 이 캐러셀)
 *     persona/t/CODE.jpg  360px(장당 23KB)    — 격자, 그리고 «자리막이»
 *   원본을 화면에 쓰면 성향 탭 한 번에 0.5MB 를 받습니다. 재서 정한 값입니다.
 *
 * ⚠ 여기서 궁합을 **다시 계산하지 않습니다.** card.js 의 `personaMatch` 가
 *   성향 화면·카드 그림·친구 궁합이 다 쓰는 하나입니다. 여기서 따로 재면
 *   같은 두 유형이 화면마다 다른 점수를 냅니다.
 */
import { $, esc, coverDeck, toTop } from './dom.js?v=b744';
import { PERSONA16, AXIS_NAME, AXIS_WORD, personaMatch } from './card.js?v=b744';

/* ⚠ 코드 열여섯의 «차례»는 PERSONA16 에 적힌 차례 그대로입니다 —
   FLNG → HMDP 로, 축 네 자리가 자리별로 뒤집히는 차례라 이웃끼리 한 글자만
   다릅니다. 이름순·궁합순으로 흩으면 그 규칙이 안 보입니다. */
const 코드들 = Object.keys(PERSONA16);

let 내코드 = null;
let 지금   = null;        /* 캐러셀 가운데에 선 코드 */
let 격자냐 = false;       /* 「모아보기」로 들어간 상태인가 */

/* ── 카드 한 장 ─────────────────────────────────────────────────────
 * 그림 안에 코드·이름·한 줄이 이미 얹혀 있습니다(성향 화면 머리와 같은
 * 부품 `.phero`). 그래서 카드 밖에는 아무것도 안 붙습니다 — 궁합과
 * 「나와 다른 점」은 캐러셀 «아래»에 한 벌만 두고 가운데 것으로 고쳐 씁니다.
 * ⚠ 열여섯 장에 각각 붙이면 옆 카드의 글까지 엿보기에 딸려 보입니다. */
function 카드(code, k, 시작){
  const t = PERSONA16[code] || {};
  const 긴이름 = (t.n || '').length >= 10 ? ' long' : '';
  /* ⚠ 처음에 보이는 석 장만 먼저 받습니다. 나머지는 넘길 때 받습니다 —
     열여섯을 한꺼번에 받으면 1.2MB 입니다. */
  const 언제 = Math.abs(k - 시작) <= 1 ? 'eager' : 'lazy';
  return `<div class="p16slide" data-code="${esc(code)}">
      <div class="phero">
        <!-- 자리막이(b743). 큰 그림이 붙기 전까지 이 자리를 채웁니다. -->
        <div class="psizer"
             style="background-image:url('./persona/t/${esc(code)}.jpg?v=b744')"></div>
        <img src="./persona/m/${esc(code)}.jpg?v=b744" alt=""
             loading="${언제}" decoding="async"
             onerror="this.closest('.phero').classList.add('noart')">
        <div class="pscrim"></div>
        <div class="ptxt">
          <div class="peyebrow">여행 유형</div>
          <div class="pcode">${esc(code)}</div>
          <div class="pname${긴이름}">${esc(t.n || code)}</div>
          ${t.d ? `<div class="pdesc">${esc(t.d)}</div>` : ''}
        </div>
      </div>
    </div>`;
}

/* ── 카드 밑 글 ─────────────────────────────────────────────────────
 * 사용자: 「요약이랑 궁합도만 있고 자세한 설명은 누르면 보이게 해줘」 →
 * 그 뒤 「굳이 접지 말고 처음부터 다 펴진 상태로」(b739). 그래서 늘 펴 둡니다. */
function 밑글(code){
  if (!내코드) return '';
  if (내코드 === code) return '<div class="p16mine">내 유형입니다</div>';
  return `<div class="p16mate"><span>나와의 궁합</span>
      <b>${personaMatch(내코드, code)}%</b></div>
    <div class="p16dh">나와 뭐가 다른가요</div>
    <div class="p16diff">${AXIS_NAME.map((이름, k) => {
      const 나글 = AXIS_WORD[내코드[k]], 저글 = AXIS_WORD[code[k]];
      const 같 = 내코드[k] === code[k];
      return `<div class="p16dr${같 ? '' : ' off'}"><span>${esc(이름)}</span>
        <b>${같 ? '같음' : '다름'}</b>
        <i>${같 ? `둘 다 ${esc(나글)}`
                : `나는 ${esc(나글)} · 이 유형은 ${esc(저글)}`}</i></div>`;
    }).join('')}</div>`;
}

function 캐러셀(){
  const 시작 = Math.max(0, 코드들.indexOf(지금));
  return `<div class="card p16bar">
      <button class="ghost" data-p16close="1">← 분석</button>
      <span class="p16n" id="p16n">${시작 + 1} / ${코드들.length}</span>
      <button class="ghost" data-p16grid="1">모아보기</button>
    </div>
    <div class="p16track" id="p16track">${
      코드들.map((c, k) => 카드(c, k, 시작)).join('')}</div>
    <div class="p16dots" id="p16dots">${
      코드들.map(() => '<i></i>').join('')}</div>
    <div class="p16meta" id="p16meta">${밑글(지금)}</div>`;
}

/* ── 모아보기(격자) ─────────────────────────────────────────────────
 * ⚠ 여기 그림은 **작은 것(t/)** 입니다. 열여섯이 한 화면에 서므로 중간
 *   크기를 쓰면 1.2MB 를 한 번에 받습니다.
 * ⚠ 궁합 배지는 가장 잘 맞는 하나 · 가장 안 맞는 하나에만 답니다. 열여섯에
 *   다 붙이면 숫자가 그림을 덮습니다. */
function 격자(){
  const 쨍 = 내코드 ? [...코드들].filter(c => c !== 내코드)
    .sort((a, b) => personaMatch(내코드, b) - personaMatch(내코드, a)) : [];
  const 최고 = 쨍[0], 최악 = 쨍[쨍.length - 1];

  const 칸 = 코드들.map(code => {
    const t = PERSONA16[code];
    const 나 = code === 내코드;
    const 표 = 나 ? '<span class="p16chip me">나</span>'
      : code === 최고 ? `<span class="p16chip good">${personaMatch(내코드, code)}%</span>`
      : code === 최악 ? `<span class="p16chip bad">${personaMatch(내코드, code)}%</span>` : '';
    /* ⚠ 그림이 안 오면 칸이 통째로 까맣게 됩니다 — 그림 위에 흰 글자를
       얹었기 때문입니다. `onerror` 로 «그림 없음» 표시를 답니다. */
    return `<button class="p16cell${나 ? ' mine' : ''}" data-p16go="${code}">
      <span class="sz"></span>
      <img src="./persona/t/${code}.jpg?v=b744" alt="" loading="lazy" decoding="async"
           onerror="this.closest('.p16cell').classList.add('noart')">
      <span class="sh"></span>${표}
      <span class="p16lb"><i>${code}</i><b>${esc(t.n)}</b></span>
    </button>`;
  }).join('');

  return `<div class="card p16bar">
      <button class="ghost" data-p16cards="1">← 카드로</button>
    </div>
    <div class="card">
      <h2>여행 유형 16가지</h2>
      <div class="p16grid">${칸}</div>
    </div>`;
}

/* ── 그리기 ─────────────────────────────────────────────────────────
 * ⚠ **캐러셀은 한 번만 그립니다.** 넘길 때는 아래 `가운데바뀜` 이 «가운데가
 *   누구인지»만 고쳐 칠합니다. 다시 그리면 엿보기 가장자리가 번쩍입니다. */
function 그리기(){
  const 몸 = $('p16body');
  if (!몸) return;
  몸.innerHTML = 격자냐 ? 격자() : 캐러셀();
  몸.scrollTop = 0;
  if (!격자냐) 캐러셀잡기();
}

/* 가운데 칸을 화면 한가운데로. ⚠ 부드럽게 굴리면 아래 `scroll` 이 도중에
   깨어나므로, 처음 자리잡기는 **바로** 합니다. */
function 가운데로(t, k, 부드럽게){
  const el = t.children[k];
  if (!el) return;
  const x = el.offsetLeft - (t.clientWidth - el.clientWidth) / 2;
  t.scrollTo({ left: Math.max(0, x), behavior: 부드럽게 ? 'smooth' : 'auto' });
}

/* 지금 화면 한가운데에 제일 가까운 칸이 몇째인가. */
function 가운데칸(t){
  const 중심 = t.scrollLeft + t.clientWidth / 2;
  let 고른 = 0, 최소 = Infinity;
  for (let k = 0; k < t.children.length; k++){
    const el = t.children[k];
    const d = Math.abs(el.offsetLeft + el.clientWidth / 2 - 중심);
    if (d < 최소){ 최소 = d; 고른 = k; }
  }
  return 고른;
}

/* 가운데가 바뀌었을 때 고쳐 칠하는 것 셋. **카드는 안 건드립니다.** */
function 가운데바뀜(k, 글도){
  const t = $('p16track');
  if (!t) return;
  for (let i = 0; i < t.children.length; i++)
    t.children[i].classList.toggle('on', i === k);
  const 점 = $('p16dots');
  if (점) for (let i = 0; i < 점.children.length; i++)
    점.children[i].classList.toggle('on', i === k);
  const 셈 = $('p16n');
  if (셈) 셈.textContent = `${k + 1} / ${코드들.length}`;
  if (글도){
    지금 = 코드들[k];
    const 글 = $('p16meta');
    if (글) 글.innerHTML = 밑글(지금);
  }
}

function 캐러셀잡기(){
  const t = $('p16track');
  if (!t) return;
  const 시작 = Math.max(0, 코드들.indexOf(지금));
  가운데로(t, 시작, false);
  가운데바뀜(시작, false);

  let 타이머 = 0;
  t.addEventListener('scroll', () => {
    /* 크기·흐림은 **굴리는 동안에도** 따라와야 살아 있어 보입니다.
       글자는 멈춘 뒤에 한 번만 — 굴리는 내내 바꾸면 어지럽습니다. */
    가운데바뀜(가운데칸(t), false);
    clearTimeout(타이머);
    타이머 = setTimeout(() => 가운데바뀜(가운데칸(t), true), 110);
  }, { passive: true });
}

/* ── 열고 닫기 ──────────────────────────────────────────────────────
 * ⚠⚠ **기록에 자리를 «두 겹» 남깁니다(`p16` · `p16grid`).** ⚠⚠
 *   모아보기를 카드와 같은 자리로 두면, 격자에서 뒤로가기 한 번에 도감까지
 *   같이 닫힙니다. 닫는 차례는 tripview.js 의 사슬에 적습니다 —
 *   **거기에 안 적으면 뒤로가기가 이 판을 건너뜁니다.** */
export function open16(code){
  내코드 = code || null;
  지금 = code && PERSONA16[code] ? code : 코드들[0];
  격자냐 = false;
  /* ⚠ **판을 먼저 보이고 나서 그립니다.** `가운데로` 가 칸 너비를 재는데,
     숨어 있는 동안에는 0 입니다(이 앱에서 여러 번 겪은 함정). */
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
  격자냐 = false;
}
export const is16Open = () =>
  !!$('p16pane') && !$('p16pane').classList.contains('hide');
export const is16Grid = () => is16Open() && 격자냐;

function 격자열기(){
  격자냐 = true;
  그리기();
  toTop($('p16pane'));
  if (history.state?.t2 !== 'p16grid') history.pushState({ t2: 'p16grid' }, '');
}
export function close16Grid(뒤로온것){
  if (!격자냐) return;
  if (!뒤로온것 && history.state?.t2 === 'p16grid'){ history.back(); return; }
  격자냐 = false;
  그리기();
  toTop($('p16pane'));
}

/* ⚠ 듣는 곳은 판 하나입니다 — 안을 다시 그릴 때마다 단추에 달면 지운
   단추의 사건이 남습니다(이 앱에서 여러 번 겪은 자리). */
$('p16pane')?.addEventListener('click', e => {
  if (e.target.closest('[data-p16close]')) return close16();
  if (e.target.closest('[data-p16grid]'))  return 격자열기();
  if (e.target.closest('[data-p16cards]')) return close16Grid();
  const g = e.target.closest('[data-p16go]');
  if (g){
    /* 격자에서 고른 것을 캐러셀 가운데에 세웁니다 — 「뭘 눌렀는지」가
       그대로 이어져야 합니다. */
    지금 = g.dataset.p16go;
    return close16Grid();
  }
});
