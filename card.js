/* ── 성향 카드 그리기 ────────────────────────────────────────────────
 * 여행 성향과 리포트를 카드로 그리고, 원하면 그림 파일로 만들어 줍니다.
 * 여기 있는 것은 전부 **그리는 일**입니다 — 무엇을 그릴지는 부르는 쪽이
 * 정해서 넘깁니다. 그래서 여행 자료도 로그인한 사람도 모릅니다.
 *
 * 화면 쪽(openPersona · closePersona)은 app.js 에 남겼습니다.
 * 그쪽은 me · loadCities · showApp 을 쓰기 때문입니다 — 여기 끌고 오면
 * 이 파일도 앱 전체를 알아야 합니다.
 *
 * 층: dom.js 만 씁니다. */
import { $, esc, toast } from './dom.js?v=b467';
/* 모험력이 서울에서의 거리를 씁니다. calc.js 는 아무것도 import 하지 않는
   잎이라 고리가 안 생깁니다. */
import { distKm, pScale, SEOUL } from './calc.js?v=b467';

/* ── 성향 카드 ───────────────────────────────────────────────────────
 * "나는 뭐로 나올까"가 궁금해서 평가를 더 하게 만드는 것이 목적입니다.
 * MBTI 가 도는 이유와 같습니다.
 *
 * **AI 를 안 씁니다.** 같은 사람은 항상 같은 결과가 나와야 하기 때문입니다.
 * AI 에 맡기면 매번 달라지고, 매번 바뀌는 MBTI 는 아무도 안 합니다.
 * AI 호출이 0회이므로 한도도 안 닳습니다.
 *
 * 문구는 **위에서부터 검사하고 처음 걸리는 것**을 씁니다. 순서가 곧 우선순위입니다.
 * 그래서 "이제 막 시작한 여행자"가 맨 위에 있습니다 — 3곳 매긴 사람에게
 * "웬만해선 만족 안 하는 사람"이라고 하면 근거가 없습니다.
 */

/* 유형군마다 배경이 다릅니다. 색만으로도 카드가 살아납니다 —
   캐릭터 그림을 스무 장 뽑으면 화풍이 제각각이 되는데 색은 안 그렇습니다.
 *
 * 색을 두 벌로 적어두면(화면용 CSS 와 이미지용 캔버스) 한쪽만 고치는 사고가 납니다.
 * 여기 한 번만 적고 양쪽에서 꺼내 씁니다. */
/* ⚠ **채도를 전부 낮췄습니다(b317).** 전에는 아홉 색이 다 선명했습니다
   (금색 #d4af37 · 하늘색 #5aa9e6). 선명한 색은 활기차지만 감성적이지
   않습니다 — 광고 배너의 색입니다. 바랜 색으로 바꾸면 그것만으로 톤이
   달라집니다. 어두운 바탕 위에 옅게 번지는 자리라 더 그렇습니다. */
const GRAD = {
  start: ['#6f7378', '#54585d'],      /* 시작 단계 — 바랜 회색 */
  rare:  ['#3b3f6b', '#4a3f66'],      /* 특이한 유형 — 먹빛 남보라 */
  deep:  ['#2f5548', '#37604f'],      /* 파고드는 유형 — 이끼 */
  taste: ['#9a5a35', '#b06f42'],      /* 별점 성향 — 흙빛 주황 */
  size:  ['#8a7440', '#a08a52'],      /* 규모 — 바랜 금 */
  plan:  ['#3d5f7d', '#4d7392'],      /* 계획 성향 — 바랜 남색 */
  spend: ['#8f5145', '#a36455'],      /* 리포트 · 지출 — 마른 벽돌 */
  speed: ['#2f5a60', '#3c6d74'],      /* 리포트 · 속도 — 바랜 청록 */
  even:  ['#4a5058', '#5b626b'],      /* 리포트 · 기본 — 무채색 */
};
const cssGrad = g => `linear-gradient(160deg,${(GRAD[g] || GRAD.even).join(',')})`;
export const PERSONA_BG = Object.fromEntries(Object.keys(GRAD).map(k => [k, cssGrad(k)]));

/* 아이콘은 선 하나로 통일합니다. 굵기 2px 고정, 둥근 끝, 흰색 단색.
   작아져도 안 뭉개지고 유형이 스무 개로 늘어도 화풍이 안 흔들립니다. */
export const PERSONA_ICON = {
  foot1:  '<circle cx="12" cy="15" r="3.2"/><path d="M12 11.8V6.5"/>',
  foot3:  '<circle cx="6" cy="17" r="2.4"/><circle cx="12" cy="12" r="2.4"/>' +
          '<circle cx="18" cy="7" r="2.4"/>',
  compass:'<circle cx="12" cy="12" r="8.5"/><path d="M15.2 8.8 13.6 13.6 8.8 15.2 10.4 10.4z"/>',
  globe:  '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/>' +
          '<path d="M12 3.5a13 13 0 0 1 0 17 13 13 0 0 1 0-17z"/>',
  route:  '<path d="M3 18c4-7 8-9 18-12"/><path d="M14.5 4.5 21 6l-1.5 6.5"/>' +
          '<circle cx="4" cy="18.5" r="1.6"/>',
  stamp:  '<rect x="4" y="6" width="16" height="12" rx="2"/>' +
          '<circle cx="12" cy="12" r="3.2"/><path d="M7 3.5v2M12 3.5v2M17 3.5v2"/>',
  pinheart:'<path d="M12 21s6.5-6 6.5-10.5a6.5 6.5 0 0 0-13 0C5.5 15 12 21 12 21z"/>' +
          '<path d="M12 13.2s-2.4-2-2.4-3.5a1.6 1.6 0 0 1 2.4-1.2 1.6 1.6 0 0 1 2.4 1.2c0 1.5-2.4 3.5-2.4 3.5z"/>',
  flag:   '<path d="M6 21V4"/><path d="M6 5h11l-2.2 3.6L17 12H6"/>',
  lens:   '<circle cx="11" cy="11" r="6.5"/><path d="M15.8 15.8 21 21"/>',
  starsmile:'<path d="M12 3.5 14.4 9l6 .6-4.5 4 1.3 5.9L12 16.4 6.8 19.5 8.1 13.6 3.6 9.6l6-.6z"/>' +
          '<path d="M10.2 10.6h.01M13.8 10.6h.01"/><path d="M10.2 13a2.4 2.4 0 0 0 3.6 0"/>',
  starhalf:'<path d="M12 3.5 14.4 9l6 .6-4.5 4 1.3 5.9L12 16.4 6.8 19.5 8.1 13.6 3.6 9.6l6-.6z"/>' +
          '<path d="M12 3.5v12.9"/>',
  starsplit:'<path d="M10.6 3.9 8.4 9l-5.6.6 4.2 4-1.2 5.5L10.6 16"/>' +
          '<path d="M13.4 3.9 15.6 9l5.6.6-4.2 4 1.2 5.5L13.4 16"/>',
  crown:  '<circle cx="12" cy="14.5" r="6"/><path d="M3.5 7.5 7 10l5-5 5 5 3.5-2.5-1.5 6h-14z"/>',
  passport:'<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10" r="3"/>' +
          '<path d="M9 15.5h6"/>',
  bag:    '<rect x="4" y="7.5" width="16" height="12.5" rx="2"/>' +
          '<path d="M9 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5v2"/>' +
          '<path d="M9 11v5M15 11v5"/>',
  shoot:  '<path d="M4 20 11 13"/><path d="M15.5 3.5 17 7.5l4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/>',
  bolt:   '<path d="M13 3 6 13.5h5L11 21l7-10.5h-5z"/>',
};

/* 여행 리포트 카드도 같은 부품과 같은 색표를 씁니다 —
   둘이 한 벌로 보여야 나란히 올렸을 때 같은 앱에서 나온 것으로 읽힙니다. */
export const REPORT_BG = PERSONA_BG;
export const REPORT_ICON = {
  fork:   '<path d="M7 3v7a2.5 2.5 0 0 0 5 0V3"/><path d="M9.5 10v11"/>' +
          '<path d="M17.5 3c-1.4 1.6-2 3.4-2 5.5 0 1.6.7 2.5 2 2.5V21"/>',
  bag2:   '<path d="M4.5 8h15l-1.2 12.5H5.7z"/>' +
          '<path d="M8.8 8V6.2a3.2 3.2 0 0 1 6.4 0V8"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2.5"/>' +
          '<path d="M3 10h18"/><circle cx="16.5" cy="14" r="1.4"/>',
  coin:   '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.2v9.6"/>' +
          '<path d="M14.6 9.4a2.6 2.6 0 0 0-5.2.4c0 2.6 5.2 1.4 5.2 4a2.6 2.6 0 0 1-5.2.4"/>',
  run:    '<circle cx="15.5" cy="4.8" r="1.9"/>' +
          '<path d="M13.6 9.2 10 11.4l1.8 3.2L9 21"/>' +
          '<path d="M13.6 9.2 17 11l2.6-.6"/><path d="M11.8 14.6 16 16l1 5"/>' +
          '<path d="M10 11.4 5.4 10"/>',
  shoe:   '<path d="M3 16.5h13.5c2.5 0 4.5-1 4.5-2.6 0-1.4-1.3-2-3.2-2.6-2-.6-3.3-1.3-4.3-2.6L11.6 7 3 10.5z"/>' +
          '<path d="M3 16.5V19h18v-2.5"/>',
  cup:    '<path d="M4.5 7h12v6.5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/>' +
          '<path d="M16.5 9h1.7a2.4 2.4 0 0 1 0 4.8h-1.7"/><path d="M3 21.5h15"/>',
  moon:   '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="2.5"/>' +
          '<circle cx="12" cy="13.5" r="3.6"/><path d="M8.5 7l1.4-2.5h4.2L15.5 7"/>',
};

/* ── 카드를 이미지로 ─────────────────────────────────────────────────
 * 밖에서 라이브러리를 받아오지 않고 캔버스에 직접 그립니다 —
 * 비행기모드에서도 되고, 남의 서버가 멈춰도 안 멈춥니다.
 *
 * **한글 폰트 함정.** 캔버스는 웹폰트가 다 내려오기 전에 그리면 글자를 네모로 찍습니다.
 * 화면에는 멀쩡히 보이는데 저장한 파일만 깨져서 알아채기도 어렵습니다.
 * 그래서 쓸 굵기·크기를 하나씩 load() 로 부르고 fonts.ready 까지 기다립니다.
 * 그래도 안 오면 기기 기본 글꼴로 그립니다 — 네모보다는 낫습니다. */
/* 앞에 적은 것이 기본이고 고르는 목록에서도 먼저 나옵니다.
   **세로(4:5)를 앞에 둡니다** — 인스타 피드에서 세로가 정사각보다 화면을
   훨씬 많이 먹습니다. 같은 카드라도 눈에 들어오는 크기가 다릅니다. */
const IMG_SIZES = {
  portrait: { w:1080, h:1350, ko:'세로 (1080×1350)' },   /* 인스타 피드 — 기본 */
  square:   { w:1080, h:1080, ko:'정사각 (1080×1080)' },
  story:    { w:1080, h:1920, ko:'스토리 (1080×1920)' }, /* 인스타·카톡 스토리 */
};

/* ── 명조체 ──────────────────────────────────────────────────────────
 * 카드 글자가 전부 고딕(Pretendard) 하나였습니다. 한국 디자인에서 감성은
 * 대체로 **명조**에서 옵니다 — 고딕 숫자 옆에 명조 문장이 있으면 그 대비
 * 자체가 분위기를 만듭니다. 전부 바꾸지 않고 **한줄평과 맺음말만** 씁니다.
 *
 * ⚠ **index.html 에 안 넣습니다.** 카드는 가끔 만드는 것이라, 앱을 여는
 *   모든 사람이 이 글꼴을 받을 이유가 없습니다. 카드를 만들 때 그 자리에서
 *   붙입니다. 서비스워커가 fonts.gstatic 을 셸에 담으므로 두 번째부터는
 *   받아올 것이 없습니다(sw.js 의 isCodeUrl). */
const SERIF = '"Nanum Myeongjo", serif';
let serifCss = null;
function addSerifCss(){
  /* ⚠ **CSS 가 붙기를 기다려야 합니다.** 처음엔 link 만 꽂고 바로
     `fonts.load('… Nanum Myeongjo')` 를 불렀는데, 그때는 아직 @font-face 가
     등록되기 전이라 아무것도 안 받아오고 조용히 지나갔습니다 —
     재보니 `fonts.check` 가 false 였고 카드가 기기 기본 명조로 나왔습니다.
     2.5초는 안 오는 날의 상한입니다. 못 와도 카드는 나옵니다. */
  if (serifCss) return serifCss;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700&display=swap';
  serifCss = new Promise(res => {
    l.onload = res; l.onerror = res; setTimeout(res, 2500);
  });
  document.head.appendChild(l);
  return serifCss;
}

let fontReady = null;
async function ensureFont(){
  if (fontReady) return fontReady;
  const serifWait = addSerifCss();
  fontReady = (async () => {
    if (!document.fonts) return false;
    await serifWait;                 /* @font-face 가 등록된 뒤에 불러야 받아옵니다 */
    /* 쓸 조합을 다 불러둡니다. 하나라도 빠지면 그 크기만 네모가 됩니다. */
    /* **여기 빠진 조합은 저장한 그림에서만 네모가 됩니다.** 화면은 멀쩡해서
       알아채기 어렵습니다. 위 cardImage 의 F(굵기, 크기) 를 바꾸면 여기도
       같이 바꿔야 합니다 — 사진 배경으로 다시 그리면서 크기가 다 바뀌었습니다. */
    const want = [[700,168],[700,76],[700,34],[600,48],[600,30],[600,28],
                  [500,40],[500,28],[400,40],[400,32]];
    try {
      await Promise.all(want.map(([w, px]) =>
        document.fonts.load(`${w} ${px}px Pretendard`, '가나다 ABC 123 ★')));
      /* 명조와 워드마크 글꼴도 같이. **못 와도 카드는 나옵니다** —
         명조가 없으면 기기 기본 명조로, Dongle 이 없으면 고딕으로 그려집니다.
         글꼴 하나 때문에 카드 전체를 못 만드는 일은 없어야 합니다. */
      await Promise.all([
        document.fonts.load('400 52px "Nanum Myeongjo"', '가나다'),
        document.fonts.load('400 26px "Nanum Myeongjo"', '가나다'),
        document.fonts.load('700 40px Dongle', '기로'),
      ].map(p => p.catch(() => null)));
      await document.fonts.ready;
      return document.fonts.check('700 76px Pretendard', '가나다');
    } catch { return false; }
  })();
  return fontReady;
}

/* SVG 를 그림으로 만들어 캔버스에 얹습니다. 화면에 쓰는 것과 **같은 좌표**를
   그대로 쓰므로 두 벌로 관리하지 않습니다.
   **못 그려도 null 을 줍니다** — 그림 하나 때문에 카드 전체가 안 나오면 안 됩니다. */
function svgImage(svg){
  return new Promise(ok => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

/* 배경 사진. **`crossOrigin` 이 없으면 캔버스가 오염돼서 `toBlob` 이 통째로
   실패합니다** — 그림이 안 나오는 게 아니라 카드 자체를 못 만듭니다.
   저장통이 CORS 를 주는지 먼저 재보고 넣었습니다(528×350 사진으로 83KB 성공).
   못 받아오면 null 을 주고 부르는 쪽이 그러데이션으로 돌아갑니다. */
function photoImage(url){
  return new Promise(ok => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => ok(img);
    img.onerror = () => ok(null);
    img.src = url;
  });
}

/* 선 아이콘. 굵기 2px 고정, 흰색 단색 — 위 PERSONA_ICON 과 같은 규칙입니다. */
function iconImage(paths, px){
  return svgImage(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${px}"
    height="${px}" fill="none" stroke="#fff" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`);
}

/* ── 카드에서 찾아오는 길 ────────────────────────────────────────────
 * **앱 이름만 적으면 못 찾아옵니다.** 이 앱은 앱스토어에 없는 PWA 라
 * '기로' 을 검색해도 아무 데서도 안 나옵니다. 인스타에 올라간 카드를 보고
 * "이거 뭐야" 하는 사람에게 줄 것이 그림 안에 있어야 합니다.
 * 주소는 **여기 한 곳에서만** 만듭니다 — 나중에 도메인이 생기면 이 줄만 바꿉니다.
 * 화면에는 `https://` 와 끝 슬래시를 뺀 것을 적습니다(짧을수록 읽힙니다). */
export const appUrl = () =>
  typeof location === 'undefined' ? '' : location.origin + location.pathname;
export const appUrlText = () =>
  appUrl().replace(/^https?:\/\//, '').replace(/\/$/, '');

/* 긴 문구를 폭에 맞춰 접습니다. 한국어는 단어 사이를 띄우지 않는 경우가 많아
   띄어쓰기로만 접으면 한 줄이 넘칩니다. 넘치면 글자 단위로 한 번 더 접습니다. */
/* ── 넘치면 끝을 줄입니다 ────────────────────────────────────────────
 * 상자 한 칸에 이름을 세로로 쌓는데, 긴 이름(「로스앤젤레스」·「울란바토르」)
 * 은 칸을 넘습니다. **캔버스는 잘라주지 않습니다** — 그냥 삐져나가 그려집니다.
 *
 * ⚠ **글자 크기를 줄이지 않습니다.** 카드 안에서 같은 자리 글자가 줄마다
 *   다른 크기면 조판이 무너집니다. 끝을 `…` 로 줄이는 쪽이 낫습니다.
 * ⚠ b399 에는 `맞춰자르기`(개수를 줄이는 것)가 있었습니다. 그때는 넷을
 *   **한 줄**에 이어 붙였기 때문입니다. b411 에서 상자 둘로 바꾸면서
 *   이름마다 제 줄을 가지게 됐고, 그래서 규칙도 바뀌었습니다.
 * **부르기 전에 `g.font` 를 먼저 정해야 합니다**(재는 것이 그 글꼴 기준). */
function 줄여쓰기(g, text, max){
  const s = String(text ?? '');
  if (g.measureText(s).width <= max) return s;
  let a = [...s];
  while (a.length > 1 && g.measureText(a.join('') + '…').width > max) a.pop();
  return a.join('') + '…';
}

function wrapText(g, text, max){
  const out = [];
  for (const word of String(text).split(/\s+/)){
    if (!out.length){ out.push(word); continue; }
    const t = out[out.length - 1] + ' ' + word;
    if (g.measureText(t).width <= max) out[out.length - 1] = t;
    else out.push(word);
  }
  const fixed = [];
  for (const line of out){
    if (g.measureText(line).width <= max){ fixed.push(line); continue; }
    let cur = '';
    for (const ch of line){
      if (g.measureText(cur + ch).width > max && cur){ fixed.push(cur); cur = ''; }
      cur += ch;
    }
    if (cur) fixed.push(cur);
  }
  return fixed;
}

/* ── 성향 16유형 카드 그림 ────────────────────────────────────────────
 * **화면에 보이는 것이 곧 이 그림입니다.** HTML 로 한 벌 더 그리지 않습니다 —
 * 이 파일 아래 원래 카드에 적힌 그대로, 두 벌로 그리면 언젠가 한쪽만 고쳐서
 * 보는 것과 올리는 것이 달라집니다. 실제로 그랬던 자리입니다.
 *
 * 생김새는 **디자인 시안을 따릅니다.** 아래 색과 치수는 시안에서 잰 값이라
 * 눈대중으로 고치지 마십시오 — 하나만 흔들려도 여권 느낌이 사라집니다. */

/* ── 성향 카드 색 ─────────────────────────────────────────────────────
 * ⚠ **카드 바탕은 유형과 상관없이 크림 한 가지입니다.** 처음에 F/H 로 카드
 *   전체를 칠했더니 통짜 색판이 됐습니다. 시안은 카드를 흰 크림으로 두고
 *   **일러스트 뒤 패널에만** 유형 색을 씁니다 — 그래야 캐릭터가 도드라지고,
 *   열여섯 장이 나란히 놓여도 같은 앱의 카드로 보입니다.
 * 주황은 design_handoff 의 브랜드색입니다. */
const P16 = {
  판:      '#FFFFFF',   /* 캔버스 바깥 — 카드가 물러난 자리 */
  카드:    '#FDFBF3',
  테두리:  '#F0EADD',
  잉크:    '#1A1A1A',
  흐림:    '#8A8578',
  아주흐림:'#B0A89A',
  주황:    '#F25E26',
  배지:    '#FDEBE2',   /* 상위 % 알약 · 「어울리는 곳」 상자 바탕 */
  주황선:  '#F7CDB8',   /* 그 상자 테두리. 주황을 옅게 — 배지와 한 식구로 보이게 */
  홈:      '#F0EAE0',   /* 능력치 막대 바탕 */
  띠:      '#F7F2E9',   /* MRZ 칸 */
  점선:    '#DCD5C8',
  좋음배경:'#F1F7EE', 좋음선:'#CBE0C0', 좋음글:'#5C8A4A',
  나쁨배경:'#FCEFF0', 나쁨선:'#F5D3D3', 나쁨글:'#C4626B',
};
/* 일러스트 뒤 패널. 캐릭터 그림의 배경색과 같은 색이라 이어져 보입니다. */
const P16_PANEL = { F:'#FBF1E3', H:'#E6EDE0' };

function p16Image(code){
  return new Promise(ok => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ok(null);      /* 그림 하나 때문에 카드를 못 만들면 안 됩니다 */
    /* 꼬리표를 붙입니다 — 서비스워커의 `versioned` 갈래가 **본 것만** 담고
       옛 판을 지웁니다(sw.js). 열여섯 장 612KB 를 미리 담을 이유가 없습니다.
       한 사람은 자기 유형 하나만 봅니다. */
    img.src = `./persona/${code}.png?v=b467`;
  });
}

/* ── 여행 영수증 그림 ─────────────────────────────────────────────────
 * ⚠ **성향 카드와 일부러 다르게 그립니다.** 그쪽은 여권(크림톤·일러스트·
 *   놀이)이고 이건 영수증(흰 종이·글자만·기록)입니다. 둘이 비슷해 보이면
 *   앱 안에 같은 것이 둘 있는 셈입니다.
 *
 * ⚠ **화면 영수증과 내용이 다릅니다.** 하루별 흐름과 AI 문단은 뺍니다 —
 *   "Day 3에 무리하셨다" 같은 것은 **내가 볼 것**이지 남에게 보일 것이
 *   아닙니다. 성향 카드에서는 "보는 것이 곧 올리는 것"이 규칙이었는데
 *   여기는 **일부러 가르는 것**이라 다릅니다. 그 이유를 모르면 언젠가
 *   "왜 두 벌이지" 하고 합치게 됩니다.
 *
 * ⚠ **등폭 글씨가 없으면 영수증이 아닙니다.** 숫자가 세로로 안 맞으면
 *   그냥 글자 목록입니다. 캔버스에서는 글꼴을 반드시 이름으로 지정해야
 *   합니다 — 안 그러면 기기마다 다른 글꼴로 그려집니다.
 *
 * ⚠ **글자 크기는 둘뿐입니다** — 본문 하나, 한 줄평 하나. 영수증은 모든
 *   줄이 같은 크기라서 영수증으로 읽힙니다. 강조는 크기가 아니라 굵기와
 *   선으로 합니다. */
const RC = { 바닥:'#EDECE8', 종이:'#FFFFFF', 잉크:'#1A1A1A', 흐림:'#6F6F6F', 점선:'#C9C9C9' };

/* 찢은 가장자리. 영수증을 영수증으로 보이게 하는 것의 절반은 이 톱니입니다.
   흰 종이를 흰 바탕에 그리면 경계가 없어 종이인 줄 모릅니다 — 바닥을 살짝
   어둡게 깔고 위아래를 뜯어 놓아야 "뽑아 온 종이"가 됩니다. */
function 톱니(g, x, w, y, 높이, 위로){
  const 이 = w / 26;
  g.beginPath();
  g.moveTo(x, y);
  for (let i = 0; i < 26; i++)
    g.lineTo(x + 이 * (i + .5), y + (i % 2 ? 높이 : -높이) * (위로 ? -1 : 1)),
    g.lineTo(x + 이 * (i + 1), y);
  g.lineTo(x + w, y + (위로 ? -높이 * 2 : 높이 * 2));
  g.lineTo(x, y + (위로 ? -높이 * 2 : 높이 * 2));
  g.closePath();
  g.fill();
}

/* 바코드는 **장식입니다**(여권 카드의 MRZ 와 같은 역할). 읽을 것이 아닙니다.
   ⚠ 글자로 그렸더니 종이 밖으로 넘쳤습니다 — 글꼴마다 폭이 달라서 맞출 수가
   없습니다. 막대로 직접 그리면 **주어진 폭에 반드시 들어갑니다.**
   무늬는 여행마다 다르되 같은 여행이면 늘 같아야 하므로 씨앗에서 만듭니다. */
function 바코드그리기(g, seed, x, w, y, h){
  let n = 0; const s = String(seed || '');
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  const 칸 = 60, 폭 = w / 칸;
  g.fillStyle = RC.잉크;
  for (let i = 0; i < 칸; i++){
    n = (n * 1103515245 + 12345) >>> 0;
    /* ⚠ **하위 비트를 쓰면 무늬가 안 갈립니다** — 이 난수식은 아래쪽 비트의
       주기가 아주 짧아서 막대가 전부 같아집니다. 위쪽 비트를 봅니다. */
    if (((n >>> 16) % 3) === 0) continue;        /* 빈 칸이 있어야 바코드로 보입니다 */
    const 굵기 = 폭 * ((n >>> 20) % 2 ? .85 : .45);
    g.fillRect(x + i * 폭, y, 굵기, h);
  }
}

async function drawReceipt(s, W, H, F){
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  /* 등폭. `F` 는 본문 글꼴이라 여기서는 안 씁니다 — 영수증은 등폭이 전부입니다. */
  const M = (w, px) => `${w} ${px}px "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;
  const L = W * .12, R = W * .88;

  /* ── 조각들 ── 화면 쪽과 같은 순서입니다. 높이는 자(U) 기준입니다. */
  const 줄들 = [];
  const 줄 = (h, draw) => 줄들.push({ h, draw });
  const 한줄 = (k, v, 굵게) => 줄(.042, (y, U) => {
    g.font = M(굵게 ? 700 : 400, U * .030); g.fillStyle = RC.잉크;
    g.textAlign = 'left';  g.fillText(k, L, y + U * .030);
    g.textAlign = 'right'; g.fillText(v, R, y + U * .030);
  });
  /* `선:true` 인 조각은 아래에서 남는 높이를 나눠 받습니다. 선은 늘어난 칸의
     **가운데**에 놓아야 위아래가 고르게 벌어집니다 — 그래서 `h` 를 받습니다. */
  const 선줄 = (h0, draw) => { const b = { h: h0, 선: true,
    draw: (y, U) => draw(y + U * b.h / 2, U) }; 줄들.push(b); };
  const 굵은선 = () => 선줄(.030, (y, U) => {
    g.strokeStyle = RC.잉크; g.lineWidth = Math.max(2, U * .0035);
    g.beginPath(); g.moveTo(L, y); g.lineTo(R, y); g.stroke();
  });
  const 점선 = () => 선줄(.026, (y, U) => {
    g.strokeStyle = RC.점선; g.lineWidth = Math.max(1, U * .002);
    g.setLineDash([U * .012, U * .010]);
    g.beginPath(); g.moveTo(L, y); g.lineTo(R, y); g.stroke();
    g.setLineDash([]);
  });

  /* 머리 */
  줄(.060, (y, U) => {
    g.font = M(700, U * .042); g.fillStyle = RC.잉크; g.textAlign = 'center';
    spaced(g, '기 로', W / 2, y + U * .042, U * .012);
  });
  줄(.040, (y, U) => {
    g.font = M(400, U * .026); g.fillStyle = RC.흐림; g.textAlign = 'left';
    spaced(g, 'TRIP RECEIPT', W / 2, y + U * .026, U * .008);
  });
  굵은선();

  if (s.번호) 한줄(`TRIP #${String(s.번호).padStart(3, '0')}`, '');
  한줄(s.dest, `${s.days - 1}박 ${s.days}일`);
  한줄(`${String(s.from).replace(/-/g, '.')} – ${String(s.to).slice(5).replace(/-/g, '.')}`, '');
  점선();
  한줄('방문한 곳', `${s.곳} 곳`);
  if (s.km) 한줄('이동 거리', `약 ${s.km} km`);
  if (s.식비비중) 한줄('식비 비중', `${s.식비비중} %`);
  if (s.합계){
    굵은선();
    한줄('합계', s.돈합계, true);
    if (s.인원 > 1) 한줄('1인당', s.돈1인);
  }
  굵은선();
  if (s.five?.length){
    한줄('★5를 준 곳', '');
    줄(.042, (y, U) => {
      g.font = M(400, U * .028); g.fillStyle = RC.흐림; g.textAlign = 'left';
      g.fillText(s.five.join(' · '), L + U * .020, y + U * .030);
    });
    점선();
  }
  /* **한 줄평만 큽니다.** 영수증에서 유일하게 크기가 다른 줄입니다. */
  줄(.110, (y, U) => {
    g.font = M(700, U * .046); g.fillStyle = RC.잉크; g.textAlign = 'center';
    g.fillText(`"${s.label}"`, W / 2, y + U * .070);
  });
  점선();
  줄(.042, (y, U) => {
    g.font = M(400, U * .026); g.fillStyle = RC.흐림; g.textAlign = 'center';
    g.fillText(`또 오세요 · KEYRO ${String(s.to || '').slice(0, 4)}`, W / 2, y + U * .028);
  });
  줄(.060, (y, U) => 바코드그리기(g, s.바 || s.dest, L, R - L, y + U * .012, U * .038));

  /* ── 자 정하기 ── 성향 카드와 같은 방식입니다(card.js 의 drawP16).
     조각마다 제 높이를 들고 있고, 남는 높이에 맞춰 자를 줄입니다.
     **자를 키우지는 않습니다** — 스토리(1080×1920)에서 글자만 커지면
     영수증이 아니라 포스터가 됩니다. 남으면 위아래 여백으로 둡니다. */
  const 총 = 줄들.reduce((a, b) => a + b.h, 0);
  const 여백 = W * .09;
  const 위 = 여백, 아래 = H - 여백;
  const U = Math.min(W, (아래 - 위) / 총);

  /* ── 남는 높이는 구획 사이로 ──────────────────────────────────────────
   * ⚠ **스토리(9:16)에서 영수증이 가운데 조그맣게 떴습니다.** 내용이 짧아
   *   자(U)가 폭에서 막히고 세로로 절반이 비었습니다.
   *   **글자를 키우지는 않습니다** — 키우면 영수증이 아니라 포스터가 됩니다.
   *   대신 **구분선 앞뒤를 벌립니다.** 진짜 영수증도 항목이 적으면 줄 사이가
   *   성기지 않고 **구획 사이가 벌어집니다.** 줄 간격을 늘리면 글이 흩어져
   *   보이지만, 구획 사이는 벌어져도 각 덩어리가 그대로 붙어 있습니다. */
  const 선칸 = 줄들.filter(b => b.선).reduce((a, b) => a + b.h, 0);
  const 남음 = (아래 - 위) - U * 총;
  const 펼침 = (선칸 > 0 && 남음 > 0)
    ? Math.min(3.2, 1 + 남음 / (U * 선칸))       /* 너무 벌리면 따로 논 것처럼 보입니다 */
    : 1;
  줄들.forEach(b => { if (b.선) b.h *= 펼침; });

  const 총2 = 줄들.reduce((a, b) => a + b.h, 0);
  const 글높이 = U * 총2;
  const 안여백 = U * .055;                       /* 종이 안쪽 위아래 여백 */
  const 종이위 = (H - 글높이) / 2 - 안여백;
  const 종이높이 = 글높이 + 안여백 * 2;
  const 종이좌 = W * .06, 종이폭 = W * .88;

  /* ⚠ **종이를 먼저 깔고 글을 얹습니다.** 순서가 바뀌면 종이가 글을 덮습니다.
     바닥을 살짝 어둡게 두는 이유는 흰 종이의 경계를 보이게 하려는 것입니다 —
     흰 위에 흰을 그리면 종이인 줄 모르고 그냥 여백으로 읽힙니다. */
  g.fillStyle = RC.바닥; g.fillRect(0, 0, W, H);
  g.fillStyle = RC.종이;
  g.fillRect(종이좌, 종이위, 종이폭, 종이높이);
  const 이높이 = W * .012;
  톱니(g, 종이좌, 종이폭, 종이위, 이높이, true);
  톱니(g, 종이좌, 종이폭, 종이위 + 종이높이, 이높이, false);

  let y = (H - 글높이) / 2;
  for (const b of 줄들){ b.draw(y, U); y += U * b.h; }

  /* 종이라 PNG 입니다 — 흰 바탕에 검은 글자라 JPEG 로 하면 글자 가장자리가 지저분해집니다. */
  return new Promise(r => cv.toBlob(r, 'image/png'));
}

/* 자간을 벌려 쓰기. 캔버스 letterSpacing 이 없는 기기가 있어 직접 놓습니다.
   `mx` 는 놓을 자리의 **가운데**입니다. */
function spaced(g, txt, mx, y, gap){
  const chs = [...txt];
  const w = chs.reduce((a, c) => a + g.measureText(c).width, 0) + gap * (chs.length - 1);
  let x = mx - w / 2;
  for (const c of chs){ g.fillText(c, x, y); x += g.measureText(c).width + gap; }
  return w;
}

/* 크기가 다른 토막을 한 줄로 이어 **가운데 맞춤**. '27 개국 · 74 도시' 처럼
   숫자만 크게 하려면 한 번에 못 그립니다 — 재서 놓아야 합니다. */
function runs(g, parts, cx, y){
  let w = 0;
  for (const p of parts){ g.font = p.f; w += g.measureText(p.t).width; }
  let x = cx - w / 2;
  for (const p of parts){
    g.font = p.f; g.fillStyle = p.c; g.textAlign = 'left';
    g.fillText(p.t, x, y);
    x += g.measureText(p.t).width;
  }
}

const rrect = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };

/* ── 카드 한 장 그리기 ────────────────────────────────────────────────
 * ⚠ **높이를 보고 그립니다.** 처음에는 `y` 를 폭(W)만으로 쌓았습니다. 세로
 *   비율이 셋(4:5 · 1:1 · 9:16)인데 폭은 셋 다 1080 이라, 정사각에서는
 *   막대가 바닥글을 덮고 스토리에서는 아래 절반이 텅 비었습니다.
 *   그래서 **조각마다 제 높이를 들고 있게** 했습니다. 다 더해서 남는 높이에
 *   맞춰 자(U)를 줄입니다. **자를 키우지는 않습니다** — 스토리에서 글자만
 *   커지면 우스워집니다. 조각을 더 넣어도 계산이 저절로 따라옵니다.
 *
 * ⚠ **자는 세로만 줄입니다.** 가로(막대 길이·상자 너비)는 카드 폭이 정합니다.
 *   둘을 같이 묶었더니 4:5 에서 막대가 가운데만 차지하고 양옆이 휑했습니다.
 *   시안은 1:2 라 여백이 넉넉하지만 4:5 는 아닙니다.
 *
 * ⚠ **위계가 거꾸로였습니다.** 코드(HMDP)를 제일 크게 그렸는데, 시안은 코드를
 *   작은 표식으로 두고 **유형 이름을 크고 주황으로** 씁니다. 사람이 자랑하고
 *   싶은 것은 네 글자가 아니라 '지도 밖 순례자' 입니다.
 *
 * 테두리·머리말·바닥글은 흐름에 안 넣습니다. 종이의 일부라 늘 같은 자리에
 * 있어야 합니다. */
async function drawP16(s, W, H, F){
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const kind = s.code[0] === 'H' ? 'H' : 'F';
  const cx = W / 2;
  const L = W * .078, R = W * .922;          /* 내용의 좌우 끝 */
  const 여백 = W * .018;                      /* 카드가 캔버스에서 물러난 만큼 */
  const 둥금 = W * .046;

  /* ── 종이 ── */
  g.fillStyle = P16.판; g.fillRect(0, 0, W, H);
  g.fillStyle = P16.카드;
  rrect(g, 여백, 여백, W - 여백 * 2, H - 여백 * 2, 둥금); g.fill();
  g.strokeStyle = P16.테두리; g.lineWidth = Math.max(1.5, W * .0016); g.stroke();
  g.save();
  rrect(g, 여백, 여백, W - 여백 * 2, H - 여백 * 2, 둥금); g.clip();

  /* ── ARRIVED 도장 ── 모서리에 걸쳐 잘립니다. 다 보이면 장식이 아니라
        내용처럼 읽힙니다. 아주 흐리게 — 눈에 걸리면 안 됩니다. */
  {
    const r = W * .150;
    /* ⚠ **도장을 배지보다 먼저 그리므로 겹치는 자리는 배지가 덮어 지웁니다.**
       처음에 글자를 배지와 같은 높이에 두어 'VE' 만 남았습니다. 시안도
       글자가 배지보다 위·오른쪽에 있어서 안 겹칩니다. 거기에 맞춥니다. */
    g.save(); g.translate(W * .915, -W * .010); g.rotate(-Math.PI / 9);
    g.strokeStyle = 'rgba(242,94,38,.22)'; g.lineWidth = W * .003;
    g.setLineDash([W * .020, W * .014]);
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
    g.beginPath(); g.arc(0, 0, r * .86, 0, Math.PI * 2); g.stroke();
    g.font = F(800, W * .026); g.fillStyle = "rgba(242,94,38,.34)";
    g.textAlign = 'left';
    spaced(g, "ARRIVED", 0, r * .35, W * .005);
    g.restore();
  }

  /* ── 머리말 ── */
  const hy = W * .088;
  g.font = F(700, W * .024); g.fillStyle = P16.아주흐림; g.textAlign = 'left';
  {   /* 자간을 벌립니다. 여권 표지처럼 보이게 하는 유일한 장치입니다. */
    let x = L;
    for (const ch of 'PASSPORT · 여행 성향'){
      g.fillText(ch, x, hy); x += g.measureText(ch).width + W * .004;
    }
  }
  {   /* 상위 % 는 **알약 배지**입니다. 맨 글씨로 두면 그냥 한 줄이 됩니다. */
    g.font = F(800, W * .027);
    const tw = g.measureText(s.rank).width, ph = W * .058, pw = tw + W * .054;
    g.fillStyle = P16.배지;
    rrect(g, R - pw, hy - ph * .72, pw, ph, ph / 2); g.fill();
    g.fillStyle = P16.주황; g.textAlign = 'center';
    g.fillText(s.rank, R - pw / 2, hy + ph * .04);
  }

  const art = await p16Image(s.code);

  /* 줄 수는 자(U)와 무관합니다 — 글자와 최대 너비가 같이 줄기 때문입니다. */
  g.font = F(500, W * .030);
  const descLines = wrapText(g, s.desc, W * .84);
  /* ⚠ **궁합과 MRZ 는 없을 수도 있습니다(b406).** 로그인 전 맛보기 카드
     (try.js)는 **내 유형 하나만** 보여줍니다 — 아직 계정이 없어 몇 개국을
     다녀왔는지도 모르고, 궁합은 상대가 있어야 뜻이 있습니다.
     없으면 그 칸을 통째로 비웁니다(카드가 그만큼 짧아집니다).
     ⚠ 예전에는 `s.best.line` 을 그냥 읽어서 **없으면 그리다 터졌습니다.** */
  const 궁합있음 = !!(s.best && s.worst);
  const boxLines = 궁합있음 ? [s.best, s.worst].map(m => {
    g.font = F(500, W * .026);
    return wrapText(g, m.line || '', (R - L) / 2 - W * .080).slice(0, 2);
  }) : [];
  const boxN = boxLines.length ? Math.max(...boxLines.map(l => l.length)) : 0;
  /* ⚠ 글줄이 **어디서 시작하는지**까지 세야 합니다. .100 만 잡았더니
     셋째 줄이 상자 밖으로 나갔습니다 — 글줄은 .140 부터 시작합니다. */
  const 글줄시작 = .140, 글간 = .034;
  const BOXH = 글줄시작 + boxN * 글간 + .020;

  /* ── 다음에 갈 곳 두 줄 ──────────────────────────────────────────────
     `spec.picks` 는 부르는 쪽(persona.js)이 rec.js 로 뽑아 넣어줍니다.
     **card.js 는 추천을 계산하지 않습니다** — 여기서 또 세면 화면과 그림이
     갈라집니다. 없으면 이 자리를 통째로 비웁니다(카드가 그만큼 짧아집니다). */
  const 추천줄 = [['어울리는 곳',   s.picks?.match    || [], true],
                  ['반대로 가보면', s.picks?.opposite || [], false]]
                 .filter(([, names]) => names.length);
  /* 상자 높이 — 제목(.046) 아래로 이름 넷이 .042 씩. 마지막 이름이 .226 이고
     바닥 여백을 .030 둡니다. **이름이 넷보다 적어도 높이는 같습니다** —
     나란한 두 칸의 키가 다르면 표가 아니라 사고로 보입니다. */
  const PICKH = .100 + 3 * .042 + .030;

  const blocks = [
    { h:.082, draw:(y, U) => {                 /* 코드 — 작은 표식 */
        g.font = F(800, U * .062); g.fillStyle = P16.잉크; g.textAlign = 'left';
        spaced(g, s.code, cx, y + U * .060, U * .012);
      } },
    { h:.050, draw:(y, U) => {
        g.font = F(600, U * .029); g.fillStyle = P16.흐림; g.textAlign = 'center';
        g.fillText(s.axisWords, cx, y + U * .034);
      } },
    { h:.104, draw:(y, U) => {                 /* **주인공** — 크고 주황 */
        g.font = F(800, U * .074); g.fillStyle = P16.주황; g.textAlign = 'center';
        g.fillText(s.name, cx, y + U * .078);
      } },
    { h:descLines.length * .040 + .012, draw:(y, U) => {
        g.font = F(500, U * .030); g.fillStyle = P16.흐림; g.textAlign = 'center';
        descLines.forEach((l, i) => g.fillText(l, cx, y + U * (.030 + i * .040)));
      } },
    { h:.090, draw:(y, U) => {                 /* 숫자는 크게, 단위는 작게 */
        const N = F(800, U * .058), 단 = F(600, U * .032);
        runs(g, [{ t:String(s.countries), f:N, c:P16.잉크 },
                 { t:' 개국', f:단, c:P16.흐림 },
                 { t:'   ·   ', f:단, c:P16.아주흐림 },
                 { t:String(s.cities), f:N, c:P16.잉크 },
                 { t:' 도시', f:단, c:P16.흐림 }], cx, y + U * .062);
      } },
    { h:.290, draw:(y, U) => {                 /* 일러스트는 색 패널 위에 */
        const p = U * .265, x = cx - p / 2, top = y + U * .014;
        /* 일러스트 PNG 는 **제 배경을 이미 갖고 있습니다**(유형색 둥근 사각).
           뒤에 패널을 또 깔면 모서리가 겹쳐 테두리처럼 보입니다.
           못 받았을 때만 깝니다 — 그때는 빈칸보다 색이라도 있는 편이 낫습니다. */
        if (art) g.drawImage(art, x, top, p, p);
        else { g.fillStyle = P16_PANEL[kind]; rrect(g, x, top, p, p, U * .034); g.fill(); }
      } },
    { h:4 * .068 + .010, draw:(y, U) => {
        const tx = L + W * .158, tw = (R - W * .098) - tx, th = U * .042;
        s.bars.forEach(([name, v], i) => {
          const by = y + U * (.034 + i * .068);
          g.font = F(800, U * .031); g.fillStyle = P16.잉크; g.textAlign = 'left';
          g.fillText(name, L, by + U * .012);
          g.fillStyle = P16.홈; rrect(g, tx, by - th / 2, tw, th, th / 2); g.fill();
          g.fillStyle = P16.주황;
          rrect(g, tx, by - th / 2, Math.max(tw * v / 100, th), th, th / 2); g.fill();
          /* 값도 주황입니다. 검정으로 두면 막대와 숫자가 따로 놉니다. */
          g.font = F(800, U * .036); g.textAlign = 'right';
          g.fillText(String(v), R, by + U * .013);
        });
      } },
    ...(궁합있음 ? [{ h:BOXH + .052, draw:(y, U) => {   /* 테두리 색이 좋고 나쁨을 말합니다 */
        const gap = W * .022, bw = ((R - L) - gap) / 2, bh = U * BOXH, top = y + U * .030;
        [[s.best,  '환상의 메이트', P16.좋음배경, P16.좋음선, P16.좋음글],
         [s.worst, '최악의 조합',   P16.나쁨배경, P16.나쁨선, P16.나쁨글]]
        .forEach(([m, cap, bg, edge, tint], i) => {
          const bx = L + i * (bw + gap), px = bx + W * .034;
          g.fillStyle = bg; rrect(g, bx, top, bw, bh, U * .030); g.fill();
          g.strokeStyle = edge; g.lineWidth = Math.max(1.5, W * .0018); g.stroke();
          g.textAlign = 'left';
          g.font = F(700, U * .027); g.fillStyle = tint;
          g.fillText(`${cap} · ${m.code} ${m.score}%`, px, top + U * .046);
          g.font = F(800, U * .038); g.fillStyle = P16.잉크;
          g.fillText(m.name, px, top + U * .100);
          g.font = F(500, U * .026); g.fillStyle = P16.흐림;
          boxLines[i].forEach((l, j) => g.fillText(l, px, top + U * (글줄시작 + j * 글간)));
        });
      } }] : []),
    /* ── 다음에 갈 곳(b399) ──────────────────────────────────────────
       ⚠ **화면에 따로 카드로 붙였다가 카드 안으로 들여왔습니다.** 이유는
         하나입니다 — **이것도 같이 공유돼야 하기 때문입니다.** 밖에 두면
         보는 사람만 보고, 올리는 그림에는 안 들어갑니다. 이 파일의 오래된
         규칙("보는 것이 곧 올리는 것")과도 그쪽이 맞습니다.

       ⚠ **사진도 이유도 안 넣습니다**(사용자 결정). 화면 카드에는 "오사카와
         닮았어요" 가 붙어 있었는데, 여기서는 이름만 씁니다. 카드가 세로로
         길어지는 것은 받아들입니다 — 아래 자(U)가 알아서 줄입니다.

       ⚠ **누르면 도시가 열리던 것은 사라집니다.** 그림이라 누를 데가 없습니다.
         알고 버린 것입니다. 되살리려면 카드 밑에 얇은 이름 줄을 따로 놓아야
         하는데, 그러면 같은 것이 두 벌이 됩니다.

       ⚠ 이름이 넘치면 **뒤에서부터 덜어냅니다.** 줄이지 않고 밀어 넣으면
         카드 밖으로 삐져나가는데, 캔버스는 잘라주지 않습니다. */
    /* ⚠ **줄 간격을 좁게 잡았다가 겹쳤습니다(b399).** .062 로 두었더니 아랫줄
       제목이 윗줄 이름 위에 겹쳐 그려졌습니다. 캔버스는 겹쳐도 아무 말이
       없습니다 — 눈으로 보고서야 알았습니다. 여기 숫자를 줄일 때는 반드시
       긴 이름(로스앤젤레스·요하네스버그)으로 다시 그려 보십시오.

       ⚠ **두 제목의 색이 다릅니다.** 「어울리는 곳」은 재서 정한 것이라
       주황(카드의 강조색), 「반대로 가보면」은 정확도를 주장하지 않는
       것이라 회색입니다. 같은 색으로 맞추면 둘 다 같은 무게로 읽힙니다. */
    /* ⚠ **글줄 둘에서 상자 둘로 바꿨습니다(b411, 사용자 결정).** 위 궁합과
       같은 생김새입니다 — 나란한 두 칸. 같은 카드 안에서 "둘을 견주는 것"이
       두 번 나오는데 하나는 상자고 하나는 맨 글줄이면 결이 안 맞습니다.

       ⚠ **색은 궁합과 달라야 합니다.** 궁합은 초록·분홍(좋고 나쁨)인데
       여기에 같은 색을 쓰면 「반대로 가보면」이 **나쁜 곳**으로 읽힙니다.
       그건 뜻이 아닙니다 — 재서 정한 것(주황)과 정확도를 주장하지 않는
       것(수수한 색)으로 가릅니다.

       ⚠ **이름을 세로로 쌓습니다.** 한 줄에 넷을 넣으면 좁은 칸에서 두 개도
       안 들어갑니다. 그래도 넘치는 긴 이름은 끝을 …로 줄입니다. */
    ...(추천줄.length ? [{ h:PICKH + .052, draw:(y, U) => {
        const gap = W * .022, bw = ((R - L) - gap) / 2;
        const bh = U * PICKH, top = y + U * .030;
        추천줄.forEach(([cap, names, 진하게], i) => {
          const bx = L + i * (bw + gap), px = bx + W * .034;
          g.fillStyle = 진하게 ? P16.배지 : P16.띠;
          rrect(g, bx, top, bw, bh, U * .030); g.fill();
          g.strokeStyle = 진하게 ? P16.주황선 : P16.점선;
          g.lineWidth = Math.max(1.5, W * .0018); g.stroke();

          g.textAlign = 'left';
          g.font = F(700, U * .027); g.fillStyle = 진하게 ? P16.주황 : P16.흐림;
          g.fillText(cap, px, top + U * .046);
          /* **자르기 전에 글꼴을 먼저 정합니다** — 재는 것이 그 글꼴 기준입니다. */
          g.font = F(600, U * .034); g.fillStyle = P16.잉크;
          names.slice(0, 4).forEach((n, j) =>
            g.fillText(줄여쓰기(g, n, bw - W * .068), px, top + U * (.100 + j * .042)));
        });
      } }] : []),
    ...(s.mrz ? [{ h:.088, draw:(y, U) => {    /* **장식입니다.** 진짜 정보는 위에 다 있습니다 */
        const bh = U * .062;
        g.fillStyle = P16.띠; rrect(g, L, y + U * .012, R - L, bh, U * .020); g.fill();
        g.font = F(600, U * .027); g.fillStyle = P16.아주흐림; g.textAlign = 'center';
        g.fillText(s.mrz, cx, y + U * .012 + bh * .66);
      } }] : []),
  ];

  /* ── 자 정하기 ── 머리말과 바닥글이 쓰는 만큼을 빼고 남는 높이에 맞춥니다. */
  const 총높이 = blocks.reduce((a, b) => a + b.h, 0);
  const 위 = W * .150, 아래 = H - W * .160;
  const U = Math.min(W, (아래 - 위) / 총높이);
  let y = 위 + ((아래 - 위) - U * 총높이) / 2;
  for (const b of blocks){ b.draw(y, U); y += U * b.h; }

  /* ── 바닥 ── 점선으로 한 번 끊고, 어디서 나온 카드인지. ── */
  const fy = H - W * .060;                     /* 바닥글 기준선 */
  const dy = H - W * .122;                     /* 점선 */
  g.strokeStyle = P16.점선; g.lineWidth = Math.max(1.5, W * .0018);
  g.setLineDash([W * .016, W * .014]);
  g.beginPath(); g.moveTo(여백, dy); g.lineTo(W - 여백, dy); g.stroke();
  g.setLineDash([]);
  /* 표 모양 홈. 점선과 같은 높이라 '뜯는 자리'로 읽힙니다. */
  g.fillStyle = P16.판;
  for (const x of [여백, W - 여백]){ g.beginPath(); g.arc(x, dy, W * .022, 0, Math.PI * 2); g.fill(); }

  /* 기로 마크 — 주황 막대 둘. 로고 파일을 안 받습니다(카드마다 받아올 이유가
     없습니다). 이 크기에서는 모양만 같으면 됩니다. */
  {
    const mw = W * .036, mh = W * .010, mx = L, my = fy - W * .028;
    g.fillStyle = P16.주황;
    rrect(g, mx, my, mw, mh, mh / 2); g.fill();
    rrect(g, mx + mw * .24, my + mh * 1.7, mw * .76, mh, mh / 2); g.fill();
  }
  g.font = F(800, W * .036); g.fillStyle = P16.잉크; g.textAlign = 'left';
  g.fillText('기로', L + W * .056, fy);
  g.font = F(500, W * .030); g.fillStyle = P16.흐림;
  g.fillText('기록이 길이 되다', L + W * .130, fy);
  {   /* NEXT TRIP? — 점선 알약. "이제 네 차례" 라고 말하는 자리입니다. */
    g.font = F(800, W * .030);
    const t = 'NEXT TRIP?', gapx = W * .006;
    const tw = [...t].reduce((a, c) => a + g.measureText(c).width, 0) + gapx * (t.length - 1);
    const pw = tw + W * .060, ph = W * .072;
    g.strokeStyle = P16.주황; g.lineWidth = Math.max(1.5, W * .0022);
    g.setLineDash([W * .012, W * .009]);
    rrect(g, R - pw, fy - ph * .70, pw, ph, ph / 2); g.stroke();
    g.setLineDash([]);
    g.fillStyle = P16.주황;
    spaced(g, t, R - pw / 2, fy + ph * .04, gapx);
  }

  g.restore();
  /* 성향 카드는 사진이 없어 단색이 넓게 깔립니다 — PNG 로도 작고 글자가 더 삽니다. */
  return new Promise(r => cv.toBlob(r, 'image/png'));
}

/* 카드 하나를 그림 파일로. 화면 카드와 같은 내용, 같은 색, 같은 아이콘입니다. */
/* 내보내는 이유는 하나입니다 — **자가검사가 실제로 그려봐야 하기 때문입니다.**
   화면 없이 blob 이 나오는지, 그림이 깨져도 카드가 나오는지를 봅니다. */
export async function cardImage(spec, mode = 'square'){
  const { w:W, h:H } = IMG_SIZES[mode] || IMG_SIZES.square;
  const ok = await ensureFont();
  /* 화면(app.css 의 --sf)과 **같은 이름을 같은 순서로** 씁니다(b411) —
     둘이 어긋나면 한 폰 안에서 화면과 카드의 글씨체가 갈립니다. */
  const fam = ok ? `"Pretendard Variable", Pretendard, -apple-system, sans-serif`
                 : '-apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  const F = (weight, px) => `${weight} ${px}px ${fam}`;

  /* ⚠ **성향 16유형 카드는 딴 그림입니다**(b381). 여기서 갈라집니다.
     아래 원래 그림(리포트·지도·성향 옛 카드가 같이 씁니다)은 손대지 않습니다 —
     한 그림에 두 레이아웃을 욱여넣으면 둘 다 고치기 어려워집니다.
     **갈래만 트면 저장·공유·크기 시트가 그대로 붙습니다** —
     `saveCardImage` 도 `askImageSize` 도 이 함수의 결과만 봅니다. */
  if (spec && spec.kind === 'p16')
    return { blob: await drawP16(spec, W, H, F), fontOk: ok };
  /* 여행 영수증. 성향 카드와 **일부러 다른 그림**입니다(위 drawReceipt 머리말). */
  if (spec && spec.kind === 'receipt')
    return { blob: await drawReceipt(spec, W, H, F), fontOk: ok };

  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');

  /* ── 배경 ────────────────────────────────────────────────────────
   * **사진이 있으면 사진이 배경입니다.** 전에는 단색 그러데이션 위에 글자만
   * 얹었는데, 그러면 볼 것이 없어서 아무도 안 올립니다. 이 앱이 가진 제일
   * 좋은 자산은 도시 사진이고, 카드에서 그걸 안 쓰고 있었습니다.
   * 사진이 없으면(도시 사진이 아직 없는 곳) 예전 그러데이션으로 돌아갑니다 —
   * 카드가 안 나오는 것보다 낫습니다. */
  const [c1, c2] = GRAD[spec.g] || GRAD.even;
  /* ── 바탕 ────────────────────────────────────────────────────────
   * ⚠ **두 색 사선 그러데이션을 버렸습니다(b314).** 배너처럼 보였고,
   *   특히 금색(size)에서 촌스러웠습니다. 색 두 개가 화면을 가득 채우면
   *   그 자체가 볼거리인 줄 알지만 실은 아무것도 아닙니다.
   * 깊은 잉크 위에 유형 색을 **한쪽 구석에서 옅게 번지게** 합니다.
   * 어두운 바탕은 흰 글자와 지도를 그대로 살려주고, 번지는 색 하나로
   * 유형이 갈립니다. 색은 배경이 아니라 **악센트**여야 합니다. */
  const paintGrad = () => {
    g.fillStyle = '#0E1116'; g.fillRect(0, 0, W, H);
    const r = g.createRadialGradient(W * .12, H * .08, 0, W * .12, H * .08, H * .95);
    r.addColorStop(0, c2); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = .42; g.fillStyle = r; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    void c1;
  };

  let photoOk = false;
  if (spec.photo){
    const ph = await photoImage(spec.photo);
    if (ph){
      /* 잘라서 꽉 채웁니다(cover). 늘려서 채우면 사람도 건물도 일그러집니다. */
      const s = Math.max(W / ph.width, H / ph.height);
      const dw = ph.width * s, dh = ph.height * s;
      g.drawImage(ph, (W - dw) / 2, (H - dh) / 2, dw, dh);

      /* ── 듀오톤 ────────────────────────────────────────────────────
       * 사진을 **날것으로 쓰지 않습니다.** 469곳 사진은 출처가 제각각이라
       * 어떤 건 좋고 어떤 건 흐리고 색이 튑니다. 그 편차가 그대로 나오면
       * 카드마다 품질이 달라 보이고, 그게 제일 아마추어처럼 읽힙니다.
       *
       * 밝기만 남기고(흑백) 두 색 사이로 다시 칠합니다 —
       * 어두운 곳은 잉크, 밝은 곳은 그 카드의 색. 그러면
       *   · 흐린 사진도 **의도한 톤**으로 읽히고
       *   · 카드마다 인상이 같아 **브랜드**로 보이고
       *   · 흰 글자 대비가 늘 확보됩니다(밝은 하늘 위에서 글자가 묻히던 것)
       * 좋은 사진이 필요한 게 아니라 **같은 처리**가 필요합니다.
       *
       * ⚠ **완전한 듀오톤으로 갔다가 물렸습니다(b305 → b313).**
       *   밝은 쪽을 유형 색(size 는 금색 #d4af37)으로 물들였더니
       *   **세피아 필터**가 됐습니다 — 대구 사진이 거의 안 보이고 오래된
       *   사진 앱처럼 읽혔습니다. 금색은 중간 밝기라 사진을 뭉개기만 하고
       *   대비를 못 만듭니다.
       *
       * 지금은 **채도만 절반 뺍니다.** 화질 편차를 누르는 효과는 그대로면서
       * 사진이 사진으로 보입니다. 유형별 색은 카드를 통째로 물들이는 대신
       * 큰 숫자에만 남깁니다 — 그래야 유형도 갈리고 사진도 삽니다.
       * 캔버스 합성으로 합니다(픽셀을 하나씩 만지면 1080×1350 에서 느립니다). */
      g.globalAlpha = .5;
      g.globalCompositeOperation = 'saturation';
      g.fillStyle = '#808080'; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      /* **글자가 읽히려면 사진을 눌러야 합니다.** 위는 살짝, 아래는 깊게 —
         글자가 아래쪽에 모여 있고 위쪽은 사진을 보여주는 자리입니다. */
      /* **처음 값으로는 글자가 사진에 묻혔습니다.** 방콕 사진으로 그려보니
         밝은 하늘과 금색 지붕 위에서 흰 글씨가 읽히질 않았습니다.
         글자가 앉는 아래 절반을 훨씬 깊게 누릅니다 — 위쪽은 사진을
         보여주는 자리라 그대로 둡니다. */
      const sc = g.createLinearGradient(0, 0, 0, H);
      sc.addColorStop(0,   'rgba(0,0,0,.30)');
      sc.addColorStop(.30, 'rgba(0,0,0,.16)');
      sc.addColorStop(.52, 'rgba(0,0,0,.58)');
      sc.addColorStop(.78, 'rgba(0,0,0,.84)');
      sc.addColorStop(1,   'rgba(0,0,0,.94)');
      g.fillStyle = sc; g.fillRect(0, 0, W, H);
      /* ⚠ **유형 색을 카드 전체에 덮던 것을 걷었습니다.**
         .18 이면 옅어 보이지만, 채도를 뺀 사진 위에 얹히면 화면 전체가
         그 색으로 물듭니다 — 세피아가 된 원인의 절반이 이것이었습니다.
         카드마다 인상을 가르는 일은 **사진**이 합니다. 사진이 서로
         다른데 색까지 덮을 이유가 없습니다. */
      photoOk = true;
    }
  }
  if (!photoOk) paintGrad();

  /* ── 그림 한 장은 **배경**으로 깝니다 ────────────────────────────
   * 지금은 다녀온 나라가 칠해진 세계지도입니다. 폭보다 조금 넓게 잡아
   * 양옆이 화면 밖으로 나가게 두면 잘린 지도가 아니라 **큰 그림의 일부**로
   * 읽힙니다. 위쪽에 놓는 이유는 글자가 아래에서부터 쌓이기 때문입니다.
   * 흐리게(.5) 까는 것은 글자를 살리려는 것이기도 하지만, 또렷하면
   * 지도가 주인공이 되어 숫자가 안 읽힙니다. 배경은 배경이어야 합니다. */
  if (spec.art){
    const art = await svgImage(spec.art);
    if (art){
      const aw = W * 1.08, ah = aw * (spec.artRatio || 0.387);
      g.globalAlpha = .5;
      g.drawImage(art, (W - aw) / 2, H * .15, aw, ah);
      g.globalAlpha = 1;
    }
  }

  /* **왼쪽 정렬입니다.** 전부 가운데로 모으면 어디부터 볼지가 없어서
     글자 덩어리로 보입니다. 왼쪽에 세로선을 하나 만들어 두면 눈이
     위에서 아래로 흐릅니다 — 상용 앱 카드가 거의 다 이렇습니다. */
  g.textAlign = 'left'; g.fillStyle = '#fff';
  const pad = 88, maxW = W - pad * 2, cx = pad;

  /* 그릴 것을 먼저 줄 단위로 만들어 높이를 잰 다음, 그 덩어리를 가운데에 놓습니다.
     위에서부터 그냥 쌓으면 내용이 짧을 때 아래가 텅 빕니다 —
     특히 세로로 긴 스토리에서 심하게 티가 납니다. */
  const items = [];
  const add = (h, draw) => items.push({ h, draw });

  /* 맨 위 작은 말머리. 무슨 카드인지 한 줄로 알려줍니다 —
     제목만 크게 있으면 "여권이 두꺼운 사람"이 무슨 앱 이야기인지 모릅니다. */
  if (spec.sub) add(64, y => {
    g.font = F(600, 30); g.globalAlpha = .8;
    /* 자간을 벌려 라벨처럼 보이게 합니다. 캔버스에 letterSpacing 이 없는
       브라우저가 있어 한 글자씩 그립니다. */
    let x = cx;
    for (const ch of String(spec.sub)){ g.fillText(ch, x, y + 30); x += g.measureText(ch).width + 3; }
    g.globalAlpha = 1;
  });

  /* ── 시간 ──────────────────────────────────────────────────────────
   * 카드에 시간이 하나도 없었습니다. 시간이 없으면 기록이 아니라 성적표입니다.
   * '2026.08.13 기준' 보다 **'첫 기록으로부터 1,247일'** 이 훨씬 셉니다 —
   * 앞의 것은 만든 날짜고 뒤의 것은 그 사람이 쌓아온 시간입니다.
   * 명조로 흐리게. 위의 라벨(여행 성향)과 아래 큰 숫자 사이에서 숨을 쉽니다. */
  if (spec.date) add(52, y => {
    g.font = `400 30px ${SERIF}`; g.globalAlpha = .55;
    g.fillText(spec.date, cx, y + 32); g.globalAlpha = 1;
  });

  /* **아이콘을 크게 넣던 것을 뺐습니다.** 176px 짜리 선 아이콘 하나가
     카드 한복판을 차지했는데, 그건 '자리 채우는 그림'이지 볼거리가
     아닙니다. 사진이 배경이 된 지금은 더 그렇습니다.
     사진이 없어 그러데이션으로 갈 때만 작게 남깁니다 — 그때는 정말로
     아무것도 없기 때문입니다. */
  if (!photoOk){
    const icon = await iconImage(spec.icon || '', 96);
    if (icon) add(96 + 32, y => g.drawImage(icon, cx, y, 96, 96));
  }

  /* 그림 한 장(지금은 발자국 세계지도). **화면에 그려져 있는 것을 그대로 받습니다** —
     어느 나라를 칠할지 여기서 다시 정하면 화면과 어긋납니다.
     비율은 부르는 쪽이 줍니다(세계지도는 1000×387). */
  /* ⚠ **지도는 이제 배경입니다(b315).** 여기 줄로 끼워 넣었더니 높이가
     394px 이라 아래 내용을 통째로 밀어냈고, 왼쪽 아래에서 도시 목록과
     서명(기로)이 **겹쳤습니다.** 위 배경 단계에서 크게 깔고 글자는 그 위로
     올립니다 — 겹칠 자리가 없어지고 포스터처럼 읽힙니다. */

  /* **주인공은 큰 숫자 하나입니다.** 예전에는 '27개국 · 49도시'가 제목 밑에
     작은 한 줄로 붙어 있었습니다. 그러면 훑는 사람 눈에 아무것도 안 남습니다.
     Wrapped 도 Strava 도 숫자 하나를 화면만 하게 키웁니다. */
  if (spec.big) add(190, y => {
    g.font = F(700, 168);
    g.fillText(spec.big, cx, y + 150);
    if (spec.bigUnit){
      const w = g.measureText(spec.big).width;
      g.font = F(600, 48); g.globalAlpha = .85;
      g.fillText(spec.bigUnit, cx + w + 16, y + 150); g.globalAlpha = 1;
    }
  });

  g.font = F(700, 76);
  const lines = wrapText(g, spec.title, maxW);
  add(lines.length * 94 + 16, y => {
    g.font = F(700, 76);
    lines.forEach((line, i) => g.fillText(line, cx, y + 72 + i * 94));
  });

  if (spec.nums) add(64, y => {
    g.font = F(400, 40); g.globalAlpha = .9;
    g.fillText(spec.nums, cx, y + 40); g.globalAlpha = 1;
  });
  if (spec.note) add(54, y => {
    g.font = F(400, 32); g.globalAlpha = .72;
    g.fillText(spec.note, cx, y + 32); g.globalAlpha = 1;
  });

  /* ── 그 사람이 쓴 문장 ─────────────────────────────────────────────
   * 카드에 있는 것이 전부 숫자였습니다. 숫자는 자랑이지 감성이 아닙니다.
   * 이 앱에는 **그 사람이 직접 쓴 한줄평**이 있습니다 — 남의 사진도 아니고
   * 통계도 아닌 자기 문장이 박히면 그게 감성입니다.
   * **명조로 씁니다.** 위아래가 전부 고딕이라 여기만 명조면 그 대비가
   * 문장을 따옴표처럼 감쌉니다.
   * 없으면 안 그립니다 — 억지로 채우면 그게 더 허전합니다. */
  if (spec.quote?.text){
    g.font = `400 52px ${SERIF}`;
    const qs = wrapText(g, `“${spec.quote.text}”`, maxW).slice(0, 3);
    const from = spec.quote.from || '';
    add(28 + qs.length * 74 + (from ? 56 : 0), y => {
      g.font = `400 52px ${SERIF}`;
      qs.forEach((line, i) => g.fillText(line, cx, y + 56 + i * 74));
      if (from){
        g.font = `400 26px ${SERIF}`; g.globalAlpha = .6;
        g.fillText('— ' + from, cx, y + 56 + qs.length * 74 + 18);
        g.globalAlpha = 1;
      }
    });
  }

  if (spec.list?.length){
    const list = spec.list.slice(0, 3);
    add(36 + 46 + list.length * 58, y => {
      g.font = F(600, 28); g.globalAlpha = .65;
      g.fillText(spec.listTitle || '', cx, y + 62); g.globalAlpha = 1;
      g.font = F(500, 40);
      list.forEach((item, i) =>
        g.fillText(wrapText(g, item, maxW)[0], cx, y + 124 + i * 58));
    });
  }

  const total = items.reduce((s, it) => s + it.h, 0);
  /* **아래에서부터 쌓습니다.** 가운데에 모으면 사진 한복판을 글자가 가려서
     배경이 무슨 사진인지 안 보입니다. 위쪽은 사진에게 주고 글자는 아래로
     내립니다 — 어차피 사진 아래쪽이 제일 어두워서 거기가 제일 잘 읽힙니다.
     짧은 카드가 바닥에 붙지 않도록 위쪽 여백만 지켜줍니다. */
  const footer = 150;                     /* 앱 이름·주소가 차지하는 자리 */
  let y = Math.max(pad, H - footer - total);
  for (const it of items){ it.draw(y); y += it.h; }

  /* 앱 이름은 구석에 작게. 크게 넣으면 광고처럼 보입니다.
     **주소를 같이 적습니다.** 전에는 이름만 있었는데, 이 앱은 앱스토어에 없는
     PWA 라 그 이름으로는 아무 데서도 검색이 안 됩니다 — 카드를 보고 궁금해진
     사람이 갈 곳이 없었습니다. 이름보다 더 흐리게 둬서 광고처럼 안 보이게 합니다. */
  /* **왼쪽 아래 한 줄로 모읍니다.** 이름과 주소를 위아래로 떼어 놓으니
     둘 다 작고 흐려서 어느 쪽도 안 읽혔습니다. 한 줄에 붙여 놓으면
     "기로 · 주소" 가 하나의 서명처럼 읽힙니다.
     사진 위에 얹히므로 얇은 그림자를 깔아 어떤 사진에서도 읽히게 합니다. */
  /* **정말로 한 줄에 붙입니다.** 앞서 이름을 H-72, 주소를 H-54 에 뒀는데
     34px·28px 글자가 18px 간격이면 겹칩니다 — 실제로 겹쳐서 나왔습니다.
     이름을 그리고 그 폭만큼 옮겨 주소를 이어 붙입니다. */
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 14; g.shadowOffsetY = 1;
  /* ── 서명은 **Dongle** 로 ────────────────────────────────────────
   * 워드마크 글꼴인데 카드에서는 안 쓰고 있었습니다. 앱 상단바는 Dongle 인데
   * 카드 서명만 고딕이라 둘이 남처럼 보였습니다. 여기서 한 번 쓰면 브랜드가
   * 따뜻하게 이어집니다.
   * Dongle 은 아주 납작해서 1.9배로 키워야 제 크기가 나옵니다(34 → 65).
   * **안 실렸으면 고딕으로 그립니다** — 그때 65px 을 쓰면 글자가 밖으로
   * 나갑니다(스플래시에서 겪은 것과 같은 함정). */
  const dongle = document.fonts?.check?.('700 1em Dongle');
  g.font = dongle ? '700 65px Dongle, sans-serif' : F(700, 34);
  g.globalAlpha = .96;
  g.fillText('기로', cx, H - 62);
  g.globalAlpha = 1;

  /* ── 맺음말 ────────────────────────────────────────────────────────
   * 통계 카드를 포스터로 바꾸는 한 줄입니다. 앱 첫 화면과 같은 말이라
   * 카드를 본 사람이 앱을 열었을 때 같은 목소리로 이어집니다.
   * 명조로, 아주 흐리게 — 읽으라고 넣은 것이 아니라 **여운**입니다. */
  g.font = `400 26px ${SERIF}`; g.globalAlpha = .42;
  g.fillText('기록이 길이 되다', cx, H - 26);
  g.globalAlpha = 1;
  g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;

  /* ── 필름 그레인 ────────────────────────────────────────────────────
   * 평평한 디지털 그러데이션은 차갑습니다. 아주 고운 노이즈를 얹으면
   * 인쇄물이나 필름처럼 읽힙니다 — 어두운 바탕에서 특히 잘 먹습니다.
   * ⚠ 1080×1350 픽셀을 하나씩 만지면 느립니다. 작은 조각(160×160)에 한 번만
   *   찍어두고 그것을 타일처럼 반복해 깝니다(재봄: 눈에 안 띄는 시간).
   * 아주 옅게(.055) 얹습니다. 보이면 그건 노이즈고, 안 보여야 질감입니다. */
  try {
    const gs = 160;
    const gc = document.createElement('canvas'); gc.width = gc.height = gs;
    const gg = gc.getContext('2d');
    const im = gg.createImageData(gs, gs);
    for (let i = 0; i < im.data.length; i += 4){
      const v = 128 + (Math.random() * 2 - 1) * 110;
      im.data[i] = im.data[i+1] = im.data[i+2] = v; im.data[i+3] = 255;
    }
    gg.putImageData(im, 0, 0);
    g.globalAlpha = .055;
    g.globalCompositeOperation = 'overlay';
    const pat = g.createPattern(gc, 'repeat');
    g.fillStyle = pat; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
  } catch {}   /* 질감 하나 때문에 카드를 못 만들면 안 됩니다 */

  /* ⚠ **PNG 가 아니라 JPEG 입니다(b317).** 필름 그레인을 얹으면서 파일이
     2MB 가 됐습니다 — 노이즈는 무손실 압축이 제일 못 줄이는 것입니다.
     사진 같은 그림이라 투명도가 필요 없고, .92 면 글자 가장자리도 멀쩡합니다.
     재봄: 2,098KB → 아래 참고. */
  return { blob: await new Promise(r => cv.toBlob(r, 'image/jpeg', .92)), fontOk: ok };
}

/* 저장하거나 공유합니다. 휴대폰은 공유창으로 넘기는 편이 훨씬 빠릅니다 —
   내려받기 폴더를 찾아 들어갈 필요가 없습니다. */
async function saveCardImage(spec, mode, name){
  toast('이미지 만드는 중…');
  const { blob, fontOk } = await cardImage(spec, mode);
  /* 확장자는 blob 이 정합니다 — 성향 카드는 글자와 단색 위주라 PNG 로 나옵니다.
     .jpg 로 이름만 붙여 보내면 공유창에서 거부하는 앱이 있습니다. */
  const ext = blob.type === 'image/png' ? '.png' : '.jpg';
  const file = new File([blob], name + ext, { type: blob.type || 'image/jpeg' });
  if (navigator.canShare?.({ files:[file] })){
    /* **주소를 같이 넘깁니다.** 전에는 `{files, title}` 만 보내서, 카톡으로
       보내면 그림만 가고 링크가 없었습니다. 받은 사람이 궁금해도 갈 곳이
       없으니 공유가 유입으로 이어질 수가 없었습니다.
       받는 앱이 글을 버리는 경우도 있어서 **그림 안에도 주소를 적어**
       뒀습니다(위 cardImage) — 둘 중 하나는 남습니다. */
    const url = appUrl();
    const share = { files:[file], title: spec.title,
                    text: `${spec.title} · 기로`, url };
    /* url·text 를 못 받는 기기가 있습니다. 그때는 그림만이라도 보냅니다 —
       여기서 실패하면 아래 내려받기로 떨어져서 공유 자체를 못 하게 됩니다. */
    const payload = navigator.canShare(share) ? share : { files:[file], title: spec.title };
    try { await navigator.share(payload); return; }
    catch (e){ if (e?.name === 'AbortError') return; }
  }
  /* ── 그림을 못 보내는 기기 ─────────────────────────────────────────
   * ⚠ **전에는 여기서 곧장 내려받기로 떨어졌습니다.** 그런데 공유를 누른
   *   사람이 원한 것은 파일이 아니라 **보내는 것**입니다. 그림이 안 되면
   *   글이라도 보내는 편이 낫습니다 — 카드에 적힌 것이 글에도 있습니다.
   *   내려받기는 그것마저 안 될 때의 마지막 수단으로 내립니다. */
  if (spec.shareText && navigator.share){
    try { await navigator.share({ title: spec.title, text: spec.shareText, url: appUrl() }); return; }
    catch (e){ if (e?.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name + ext;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(fontOk ? '이미지를 저장했어요' : '저장했어요. (글꼴을 못 받아 기본 글꼴로 그렸어요)');
}

/* 어느 크기로 뽑을지 묻습니다. 피드와 스토리는 비율이 아주 달라서
   하나로 뽑아두면 한쪽은 잘리거나 여백이 크게 남습니다. */
/* ── 카드를 공유합니다 ────────────────────────────────────────────────
 * ⚠ **전에는 크기를 먼저 물었습니다 — 세로·정사각·스토리 셋(b393 에서 걷음).**
 *   물을 값어치가 없었습니다. 정사각은 세로가 있으면 고를 이유가 없고
 *   (인스타 피드에서 세로가 화면을 더 먹습니다), 남은 둘 중 실제로 올리는
 *   곳은 **스토리 하나**입니다 — 피드에 올리는 사람이 없습니다.
 *   묻는 창이 하나 줄어서 공유하기 → 바로 공유창이 됩니다.
 *
 * ⚠ **단추도 하나로 합쳤습니다.** 「이미지로 저장」과 「공유」가 따로 있었는데,
 *   공유 쪽은 글만 보내고 저장 쪽은 **그림·글·주소를 다** 보냈습니다.
 *   앞엣것이 뒤엣것을 통째로 포함하니 더 나은 쪽만 남깁니다.
 *
 * 트레이드오프 하나는 알고 있습니다: 9:16 은 **카톡 대화에서 세로로 길게
 * 잘려** 보입니다(눌러야 다 보입니다). 스토리에 올리는 것이 주 용도라
 * 감수합니다. 되돌리려면 아래 'story' 를 'portrait' 로 바꾸면 됩니다. */
export function shareCard(spec, name){
  return saveCardImage(spec, 'story', name);
}

/* 평생 누적 값. 별점을 매긴 도시만 셉니다 — "가보고 싶어요"는 간 곳이 아닙니다.
 *
 * **도시 목록을 받아서 씁니다.** 전에는 app.js 의 전역 cities · continentOf ·
 * countryName 을 그냥 집어 썼습니다. 그래서 이 셈은 앱 전체가 뜨고 도시까지
 * 다 받아진 뒤라야 한 번 돌려볼 수 있었습니다 — 즉 아무도 안 돌려봤습니다.
 * 받아서 쓰면 콘솔에서 손으로 만든 자료로도 돌아갑니다(__cardCheck). */
export function personaStats(rows, world = {}){
  const { cities = [], continentOf = {}, countryName = {} } = world;
  const rated = rows.filter(r => r.stars != null);
  const info = id => (cities || []).find(c => c.id === id);

  const byCountry = {}, byContinent = {};
  let fameSum = 0, fameN = 0, starSum = 0;
  let low = 0, high = 0;                    /* 1·2점과 4·5점 — 호불호 판정에 씁니다 */

  for (const r of rated){
    const c = info(r.city_id);
    starSum += Number(r.stars);
    if (Number(r.stars) <= 2) low++;
    if (Number(r.stars) >= 4) high++;
    if (!c) continue;
    byCountry[c.country] = (byCountry[c.country] || 0) + 1;
    const k = continentOf[c.country];
    if (k) byContinent[k] = (byContinent[k] || 0) + 1;
    if (c.fame != null){ fameSum += Number(c.fame); fameN++; }
  }
  const top = o => Object.entries(o).sort((a, b) => b[1] - a[1])[0] || [null, 0];
  const [topCountry, topCountryN] = top(byCountry);
  const [topContinent, topContinentN] = top(byContinent);
  const n = rated.length;

  return {
    cities: n,
    countries: Object.keys(byCountry).length,
    continents: Object.keys(byContinent).length,
    byCountry, byContinent,
    topCountry, topCountryN, topContinent, topContinentN,
    /* 나라 코드를 한국어 이름으로 바꾸는 것도 여기서 끝냅니다. 안 그러면
       아래 규칙표가 countryName 을 또 알아야 하고, 규칙표는 순수해야
       콘솔에서 그대로 돌려볼 수 있습니다. */
    topCountryName: countryName[topCountry] || topCountry,
    avgRating: n ? starSum / n : 0,
    /* 유명도를 모르는 도시는 평균에서 뺍니다. 0으로 치면 평균이 내려가
       "남들이 안 가는 곳"이 아닌데 그렇게 나옵니다. */
    avgFame: fameN ? fameSum / fameN : 0,
    citiesPerCountry: Object.keys(byCountry).length
      ? n / Object.keys(byCountry).length : 0,
    lowRatio: n ? low / n : 0,
    highRatio: n ? high / n : 0,
    wishCount: rows.filter(r => r.want).length,
    best: rated.filter(r => Number(r.stars) >= 4.5)
               .sort((a, b) => b.stars - a.stars)
               /* id 도 같이 넘깁니다 — 부르는 쪽이 그 도시의 사진을 찾아
                  카드 배경으로 씁니다. 이름만 주면 같은 이름을 다시 뒤져야 합니다. */
               .map(r => ({ id: r.city_id, name: info(r.city_id)?.name || r.city_id,
                            stars: r.stars }))
               .slice(0, 3),
  };
}

/* 위에서부터 검사해서 **처음 걸리는 것**을 씁니다. 순서가 곧 우선순위입니다.
 *
 * 문서의 순서(시작 → 특이 → 파고듦 → 별점 → 규모 → 계획)를 그대로 넣고 돌려보니
 * **규모 문구가 한 번도 안 나왔습니다.** 12개국부터 87개국까지 76가지를 다 넣어봤는데
 * 0번이었습니다. 나라가 늘면 대륙 수와 "지구 반대편"이 먼저 늘어서, 60개국을 다녀도
 * "대륙 순례자"에 걸리고 "세계를 절반쯤 본 사람"은 영영 안 뜹니다.
 *
 * 규모가 오히려 더 희소한 축이라 위로 올렸습니다.
 * 50개국은 4대륙보다 훨씬 드뭅니다. 12개국(size3)은 파고드는 유형 뒤에 뒀습니다 —
 * 12개국을 다니면서 한 나라를 깊게 파는 사람은 그쪽이 더 그 사람다운 설명입니다. */
/* ⚠ **문구는 카드의 얼굴입니다(b316 에 전면 교체).**
   전에는 열여덟 중 열둘이 '~하는 사람' 으로 끝났습니다. 그 반복이 카드를
   블로그 목록처럼 읽히게 만들었습니다. 제목은 설명이 아니라 **한마디 선언**
   이어야 합니다 — 인스타에 올라간 카드에서 사람들이 읽는 것은 그 한 줄뿐입니다.
   새로 쓸 때 지킬 것: 길어야 여덟 자, '사람' 으로 안 끝내기, 설명하지 말고
   말하기('남들이 안 가는 도시 매니아' → '아무도 안 가는 쪽'). */
/* ══ 여행 성향 16유형 (b381) ═════════════════════════════════════════
 * 도시 평가만으로 계산합니다. **AI 를 안 부릅니다** — 같은 자료면 언제나
 * 같은 답이 나와야 하고(리포트·성향 카드와 같은 규칙), 공짜여야 합니다.
 *
 * 축 넷을 0~100 으로 재고, 50 을 기준으로 글자 하나씩 골라 코드를 만듭니다.
 * **같은 값을 두 가지로 보여주는 것이 핵심입니다** — 코드는 방향(F/H),
 * 능력치 막대는 점수. 막대를 보면 왜 그 유형이 나왔는지 바로 보입니다.
 *
 * 순서는 개척 → 단골 → 모험 → 만족. 코드 글자 자리와 같습니다.
 *
 * ⚠ 아래 `lo`·`hi` 는 **한국인 기준으로 맞춘 값**입니다. 목표는 각 능력치의
 * 평균이 40~60 에 오는 것 — 한 항목이 대부분 90 이상이거나 10 이하로 나오면
 * 범위가 잘못된 것이니 그때 이 숫자만 고치면 됩니다. */

/* ⚠ `pScale` 과 `SEOUL` 은 **calc.js 로 옮겼습니다(b395).** rec.js 의
   닮은-도시 추천이 같은 자를 쓰기 때문입니다 — 여기 한 벌, 저기 한 벌이면
   한쪽 상수만 고쳐지고 "성향은 멀리(D) 라는데 추천은 가까운 데만 준다"
   같은 일이 조용히 생깁니다. 상수는 calc.js 에서 고치십시오. */

/* ── 국내는 네 축 중 **둘에서만** 뺍니다(b394) ────────────────────────
 * 단골력·모험력은 해외만, 개척력·만족력은 전부 셉니다.
 * 짐작이 아니라 재보고 가른 것입니다(매긴 곳 74 = 국내 24 + 해외 50):
 *
 *     개척 36→39 · 단골 37→13 · 모험 71→85 · 만족 26→27
 *
 * **단골력은 개념이 틀려 있었습니다.** 「제일 많이 간 나라 ÷ 전체」인데
 * 최다 나라가 한국(24/74)이라, 서울 사는 사람이 부산·강릉 간 것이
 * "한 나라만 파는 성향" 으로 읽혔습니다. 국내 여행은 애초에 **나라를
 * 고르는 행위가 아닙니다.** 24점 차이는 결과일 뿐 이유가 아닙니다.
 *
 * **모험력은 무게가 잘못됐습니다.** 국내 24곳의 평균 거리가 229km 인데
 * 이것이 9,000km 짜리와 똑같이 한 표씩 평균에 들어갑니다. 강릉 한 번이
 * 헬싱키 한 번을 상쇄합니다.
 *
 * **개척력·만족력은 그대로 둡니다.** 국내에서 숨은 곳을 찾아다니는 것도
 * 개척의 증거이고, 별점이 후한지 까다로운지는 어디서나 같은 사람의
 * 성질입니다(국내 ★3.56 · 해외 ★3.65 — 거의 같습니다). 3점·1점밖에
 * 안 움직이는데 표본 24개를 버릴 이유가 없습니다.
 *
 * ⚠ **여기만 고치면 안 됩니다.** 화면(persona.js)의 '왜 이 코드인가요' 가
 *   단골력 옆에 "한 나라당 몇 곳" 을 같이 보여줍니다. 그 숫자를 전체로
 *   두면 축은 해외로 세는데 근거는 전체로 적혀, 왜 그렇게 나왔는지
 *   따져보는 사람에게 앞뒤가 안 맞습니다. 그래서 아래에서 `나라당` 을
 *   같이 내보냅니다. */
const 국내 = 'KR';

/* 해외가 이보다 적으면 두 축을 50 으로 두고 **화면에서 밝힙니다.**
   1곳이면 「제일 많이 간 나라 ÷ 전체」가 1.0 이라 단골력이 100 으로 튑니다 —
   해외 한 번 다녀온 사람이 '한 나라 순정파' 가 됩니다. 3곳이면 다 다른
   나라일 때 0.33(→M), 한 나라일 때 1.0(→L) 이라 비로소 갈립니다. */
const 해외문턱 = 3;

export function personaAxes(rows, world = {}){
  const cities = world.cities || [];
  const info = id => cities.find(c => c.id === id);
  const rated = (rows || []).filter(r => r.stars != null);

  const fames = [], dists = [], stars = [], byCountry = {};
  let 해외N = 0;
  for (const r of rated){
    /* ↓ 만족력. 도시 목록에 없는 곳도 별점은 별점이라 셉니다. */
    stars.push(Number(r.stars));
    const c = info(r.city_id);
    if (!c) continue;
    /* ↓ 개척력. 국내도 셉니다 — 위 설명 참고. */
    if (c.fame != null) fames.push(Number(c.fame));

    /* ↓ 여기부터 **해외만**입니다(단골력·모험력). */
    if (c.country === 국내) continue;
    해외N++;
    if (c.center_lat != null && c.center_lng != null){
      const d = distKm(SEOUL[0], SEOUL[1], c.center_lat, c.center_lng);
      if (d != null) dists.push(d);
    }
    if (c.country) byCountry[c.country] = (byCountry[c.country] || 0) + 1;
  }
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const cityN = rated.length, countryN = Object.keys(byCountry).length;
  /* 해외가 문턱을 넘어야 두 축을 셉니다. 넘지 못하면 50 으로 두고,
     무엇이 안 정해졌는지 아래 `추정` 으로 알려 화면이 밝히게 합니다. */
  const 셀만함 = 해외N >= 해외문턱;

  /* 개척력 — 유명도 평균(도시마다 1~3 등급이 매겨져 있습니다. 469곳 전부). */
  const fAvg = mean(fames);
  /* 단골력 — 제일 많이 간 **해외** 나라가 해외 전체의 몇 할인가.
     일본만 스물이면 100. 국내는 세지 않습니다(위 설명). */
  const topN = countryN ? Math.max(...Object.values(byCountry)) : 0;
  /* 모험력 — 서울에서 평균 몇 km. **로그를 씁니다** — 선형이면 유럽·남미가
     전부 100 에 몰립니다. 한국에서는 웬만한 데가 다 멀어서, 가까운 구간
     (일본~동남아)에서 갈려야 뜻이 있습니다. */
  const dAvg = mean(dists);
  /* 만족력 — 별점 평균. **하한이 3.2 입니다** — 사람들은 대체로 후하게 줍니다.
     1.0~5.0 으로 잡으면 거의 다 80점대라 변별이 안 됩니다. */
  const sAvg = mean(stars);

  const 개척 = fAvg == null ? 50 : pScale(fAvg, 1.10, 2.55);
  const 단골 = 셀만함 ? pScale(topN / 해외N, 0.10, 0.70) : 50;
  const 모험 = (!셀만함 || dAvg == null) ? 50
    : pScale(Math.log(Math.max(dAvg, 700) / 700), 0, Math.log(9500 / 700));
  const 만족 = sAvg == null ? 50 : pScale(sAvg, 3.20, 4.85);

  const code = (개척 >= 50 ? 'H' : 'F') + (단골 >= 50 ? 'L' : 'M')
             + (모험 >= 50 ? 'D' : 'N') + (만족 >= 50 ? 'G' : 'P');

  return { code, 개척, 단골, 모험, 만족,
           cities: cityN, countries: countryN,
           /* ↓ 화면이 근거를 적을 때 씁니다. 축을 해외로 세면 근거도
              해외로 적혀야 앞뒤가 맞습니다(위 ⚠ 참고). */
           해외: 해외N, 해외문턱,
           나라당: countryN ? 해외N / countryN : 0,
           /* 문턱을 못 넘어 50 으로 둔 축들. 비어 있으면 다 셌다는 뜻입니다. */
           추정: 셀만함 ? [] : ['단골력', '모험력'],
           avgFame: fAvg, avgStar: sAvg,
           /* 해외가 모자라면 거리 평균도 안 내놓습니다 — 축은 50 인데
              옆에 "평균 230km" 가 적혀 있으면 그게 더 헷갈립니다. */
           avgDist: 셀만함 ? dAvg : null };
}

/* 축이 뜻하는 말. 코드 밑에 한 줄로 깝니다. */
export const AXIS_WORD = {
  F:'유명한 곳', H:'숨은 곳', M:'여러 나라', L:'한 나라',
  N:'가까이', D:'멀리', P:'까다로움', G:'후함',
};
export const AXIS_NAME = ['개척력', '단골력', '모험력', '만족력'];

/* 2×2×2×2 = 16. **빈 칸도 겹침도 없습니다.** */
export const PERSONA16 = {
  FLNG:{ n:'동네 단골',            d:'가던 데 또 가는 게 제일 편한 타입' },
  FLNP:{ n:'눈 높은 재방문러',      d:'같은 데 가면서도 매번 트집 잡는 타입' },
  FLDG:{ n:'한 나라 순정파',        d:'멀리 날아가서도 그 나라만 찾는 타입' },
  FLDP:{ n:'먼 길 마다않는 외골수',  d:'비행기 열 시간 타고 가서 또 그 동네 가는 타입' },
  FMNG:{ n:'근거리 도장깨기',       d:'가까운 유명지는 다 밟아야 직성이 풀리는 타입' },
  FMNP:{ n:'가성비 심사위원',       d:'가까운 데 다니면서 값어치를 따지는 타입' },
  FMDG:{ n:'세계 명소 완주자',      d:'지구 반대편 유명지까지 다 보러 가는 타입' },
  FMDP:{ n:'명소 검열관',          d:'유명하다는 곳마다 가서 실망하고 오는 타입' },
  HLNG:{ n:'골목 탐험가',          d:'가까운 동네 뒷골목이 제일 재밌는 타입' },
  HLNP:{ n:'숨은 맛집 사냥꾼',      d:'아는 사람만 아는 곳을 찾아내야 직성이 풀리는 타입' },
  HLDG:{ n:'깊이 파는 사람',        d:'한 나라를 구석구석 다 훑는 타입' },
  HLDP:{ n:'한 나라 전문가',        d:'그 나라는 현지인보다 잘 아는 타입' },
  HMNG:{ n:'동네 오지 순례자',      d:'가까운 곳에서도 남들 안 가는 데만 찾는 타입' },
  HMNP:{ n:'까칠한 개척자',         d:'새로운 곳을 찾아놓고 또 아쉬워하는 타입' },
  HMDG:{ n:'지구 반대편 방랑자',    d:'멀고 낯선 곳일수록 신나는 타입' },
  HMDP:{ n:'지도 밖 순례자',        d:'검색해도 안 나오는 곳만 골라 가는 타입' },
};

/* ── 상위 % ───────────────────────────────────────────────────────────
 * **사람 수 기반 순위는 초기에 뜻이 없습니다.** 열 명 중 상위 4% 면 반올림해서
 * 1등입니다. 그래서 국가 수 구간을 미리 못박아 둡니다.
 * ⚠ 평생 방문 국가 수 분포는 공개 통계가 없어 **추정치**입니다.
 * 자료가 쌓이면 이 표만 고치면 됩니다. */
const PERSONA_RANK = [[45,'0.5%'], [30,'1%'], [20,'3%'], [15,'6%'],
                      [10,'12%'], [6,'25%'], [3,'50%'], [0,'80%']];
export const personaRank = countries =>
  '상위 ' + (PERSONA_RANK.find(([n]) => Number(countries) >= n)?.[1] || '80%');

/* ── 궁합 ─────────────────────────────────────────────────────────────
 * 240쌍을 적어둘 필요가 없습니다. **코드 두 개를 자리별로 비교**하면 나옵니다.
 * ⚠ **전부 "비슷하면 맞는다" 로 하면 뻔해집니다.** 달라야 좋은 축(단골·만족)을
 * 넣은 것이 이 계산의 핵심입니다 — 파고드는 사람과 훑는 사람이 서로를 채우고,
 * 한 명이 까다로우면 검증 역할을 합니다. */
const MATCH_RULE = [
  { same:true,  w:26, ax:'개척' },   /* 한 명은 오지, 한 명은 도쿄면 갈 곳이 안 정해짐 */
  { same:false, w:12, ax:'단골' },
  { same:true,  w:22, ax:'모험' },   /* 유럽 가자는 사람과 일본 가자는 사람 */
  { same:false, w:16, ax:'만족' },
];
/* ⚠ **고를 때는 자르기 전 점수를 봅니다.** 10~99 로 자른 값으로 고르면
   최고 후보 여럿이 똑같이 99 가 되어 **먼저 적힌 쪽이 뽑힙니다.** 실제로
   FLNG 의 최고가 FMNP(원점수 126)여야 하는데 FLNP(102)가 뽑혔습니다 —
   열여섯 개 전부 그랬습니다. 보여주는 값만 자릅니다. */
const matchRaw = (a, b) => {
  let s = 50;
  MATCH_RULE.forEach((r, i) => { s += (r.same === (a[i] === b[i])) ? r.w : -r.w; });
  return s;
};
export const personaMatch = (a, b) => Math.max(10, Math.min(99, matchRaw(a, b)));

/* 어느 축이 어긋났는지를 짚어줘야 "맞네" 싶습니다. 점수만 있으면 재미가 없습니다. */
const CLASH = {
  개척: '한 명은 인증샷, 한 명은 골목. 둘 다 만족하는 코스가 없음',
  모험: '비행기 표 끊는 순간부터 의견이 갈림',
  단골L: '둘 다 같은 나라만 감. 새로운 데는 영영 못 갈 듯',
  단골M: '둘 다 찍고 다녀서 아무것도 깊이 못 봄',
  만족G: '둘 다 다 좋다고 함. 망한 식당도 별 다섯',
  만족P: '둘 다 까다로워서 뭘 먹어도 불만',
};
export function personaMateLine(a, b){
  const s = personaMatch(a, b);
  /* ⚠ **극단에서도 코드를 읽어 말합니다.** 전에는 여기서 통짜 문장 하나를
     돌려줬습니다. 그런데 카드에 실리는 최고·최악은 **정의상 늘 극단**이라,
     열여섯 장이 전부 "실패가 없음 / 3일차에 따로 다니게 됨" 으로 똑같아졌습니다.

     ⚠ 한 번 고치고도 **네 축을 다 안 읽어서 서른두 칸이 여덟 가지**였습니다.
     개척·모험만 읽었더니 나머지 두 자리가 다른 네 유형이 같은 말을 썼습니다.
     극단 짝은 **어느 축이 같고 어느 축이 다른지가 정해져 있으므로**, 같은
     축은 같다고, 다른 축은 다르다고 그대로 읽으면 열여섯이 다 갈립니다.
       최고 — 개척·모험이 같고 단골·만족이 다름 (그래서 서로를 채웁니다)
       최악 — 개척·모험이 다르고 단골·만족이 같음 (그래서 둘 다 같은 데서 막힙니다) */
  /* ⚠ **짧아야 합니다.** 시안의 그 칸은 좁아서 한두 줄이 한계입니다(명세도
     "문구는 한 줄만"). 처음에 설명을 다 풀어 썼더니 세 줄이 되어 상자를
     넘쳤습니다. **네 낱말만 놓고 접속은 최소로** — 그래도 네 자리를 다
     읽으므로 열여섯이 갈립니다.
     조사는 안 붙입니다. 받침에 따라 '라/이라' 가 갈리는데 낱말이 표에서
     오므로 붙여 쓰면 언젠가 어긋납니다. 필요하면 dom.js 의 josa() 를 씁니다. */
  const [f, l, d, p] = [...a].map(ch => AXIS_WORD[ch]);
  if (s >= 90) return `${f}·${d} 같고 ${l}·${p} 달라`;
  if (s <= 19) return `${f}·${d} 반대, 둘 다 ${l}·${p}`;
  /* 어긋난 축을 하나 골라 짚습니다. 가중치가 큰 것부터 봅니다. */
  for (const r of [...MATCH_RULE].sort((x, y) => y.w - x.w)){
    const i = MATCH_RULE.indexOf(r), eq = a[i] === b[i];
    if (r.same === eq) continue;                    /* 이 축은 잘 맞습니다 */
    if (r.same) return CLASH[r.ax];                 /* 같아야 하는데 다름 */
    return CLASH[r.ax + a[i]];                      /* 달라야 하는데 같음 */
  }
  return s >= 70 ? '큰 다툼 없이 다닐 수 있음' : '무난하게 다닐 수 있음';
}

/* 열여섯을 다 재서 제일 잘 맞는 하나와 제일 안 맞는 하나를 고릅니다.
   표를 따로 적어두지 않습니다 — 가중치를 고치면 표가 거짓말이 됩니다. */
export function personaMates(code){
  const others = Object.keys(PERSONA16).filter(c => c !== code);
  let best = others[0], worst = others[0];
  for (const c of others){
    if (matchRaw(code, c) > matchRaw(code, best))  best  = c;
    if (matchRaw(code, c) < matchRaw(code, worst)) worst = c;
  }
  return { best,  bestScore:  personaMatch(code, best),  bestLine:  personaMateLine(code, best),
           worst, worstScore: personaMatch(code, worst), worstLine: personaMateLine(code, worst) };
}

/* 카드 아래 장식 줄. **여권 기계판독구역(MRZ) 흉내입니다** — 진짜 정보는
   위에 따로 다 보여주고 있으니 여기서는 읽을 필요가 없습니다. */
export const personaMrz = (code, countries, cities, rank, year) =>
  `P<KEYRO<<${code}<<${countries}COUNTRIES<<${cities}CITIES<<` +
  `TOP${String(rank).replace(/[^0-9.]/g, '')}PCT<<${year}<`;


/* ── 자가검사 (개발용) ─────────────────────────────────────────────────
 * 콘솔에서 __cardCheck() 를 부르면 아래를 다 돌려 봅니다.
 * 로그인도, 도시 목록도, 별점을 매긴 여행도 필요 없습니다 — 지어낸 값만 봅니다.
 * (calc.js 의 __calcCheck · app.js 의 __settleCheck 와 같은 방식입니다.)
 *
 * 여기 있는 것들이 실제로 물렸던 자리라 검사가 있습니다:
 *   - 표에 키가 없어 배경·아이콘이 undefined 로 나가는 것 (SHELF 의 been 과 같은 모양)
 *   - 규칙표에서 **앞 규칙에 가려 영영 안 나오는 규칙** (실제로 규모 문구가 그랬습니다)
 *   - 도시 목록이 아직 없을 때 (오프라인·첫 화면) 셈이 죽는 것
 */
if (typeof window !== 'undefined') window.__cardCheck = () => {
  const out = [];
  const bad = (name, msgs) =>
    out.push({ 항목:name, 결과: msgs.length ? '✗ ' + msgs.join(' / ') : '✓' });

  const WORLD = {
    cities: [{ id:1, country:'JP', name:'도쿄', fame:5 },
             { id:2, country:'JP', name:'교토', fame:4 },
             { id:3, country:'FR', name:'파리', fame:5 },
             { id:4, country:'KR', name:'부산' }],          /* fame 없음 — 평균에서 빠져야 함 */
    continentOf: { JP:'아시아', FR:'유럽', KR:'아시아' },
    countryName: { JP:'일본', FR:'프랑스', KR:'대한민국' },
  };

  /* 1. 열여섯이 다 있는가. 하나라도 비면 그 사람은 이름 없는 카드를 받습니다. */
  {
    const msgs = [];
    for (const a of 'FH') for (const b of 'ML') for (const c of 'ND') for (const d of 'GP'){
      const k = a + b + c + d;
      if (!PERSONA16[k]) msgs.push(`${k} 없음`);
      else if (!PERSONA16[k].n || !PERSONA16[k].d) msgs.push(`${k} 이름·설명 빔`);
    }
    const 이상한키 = Object.keys(PERSONA16).filter(k => !/^[FH][ML][ND][GP]$/.test(k));
    if (이상한키.length) msgs.push(`코드가 아닌 키: ${이상한키.join(',')}`);
    const names = Object.values(PERSONA16).map(v => v.n);
    const dup = names.filter((n, i) => names.indexOf(n) !== i);
    if (dup.length) msgs.push(`이름 겹침: ${[...new Set(dup)].join(',')}`);
    /* 축 낱말 여덟도 다 있어야 코드 밑줄이 안 빕니다. */
    for (const ch of 'FHMLNDGP') if (!AXIS_WORD[ch]) msgs.push(`축 낱말 ${ch} 없음`);
    if (AXIS_NAME.length !== 4) msgs.push(`축 이름이 ${AXIS_NAME.length}개`);
    bad('유형 16개 · 이름·설명·축 낱말이 다 있는가', msgs);
  }

  /* 1-b. 배경·아이콘 표. **성향 카드는 이제 안 씁니다** — 그런데 홈 hero(home.js)와
         지도 카드(map.js), 결산 카드(report.js)가 아직 이 키로 색과 아이콘을
         꺼냅니다. 성향 쪽만 보고 지웠다가는 저 셋이 조용히 배경을 잃습니다. */
  {
    const msgs = [];
    if (!PERSONA_ICON.globe) msgs.push("아이콘 'globe' 없음 (map.js 가 씁니다)");
    if (!Object.keys(PERSONA_BG).length) msgs.push('배경표가 비었음');
    for (const [k, v] of Object.entries(PERSONA_BG))
      if (!v || String(v).length < 8) msgs.push(`배경 '${k}' 가 이상함`);
    bad('배경·아이콘 표 (home·map·report 가 씁니다)', msgs);
  }

  /* 2. 어떤 자료가 와도 코드 네 글자가 나와야 합니다. 못 나오면 PERSONA16
        조회가 undefined 가 되고 카드가 통째로 안 그려집니다. */
  {
    const msgs = [];
    for (const [name, rows, world] of [
      ['아무것도 없음', [], { cities: WORLD.cities }],
      ['가보고 싶은 곳만', [{ city_id:1, want:true }], { cities: WORLD.cities }],
      ['도시 목록 없음', [{ city_id:1, stars:5 }], {}],
      ['모르는 도시', [{ city_id:999, stars:3 }], { cities: WORLD.cities }],
      ['유명도·좌표 없음', [{ city_id:4, stars:3 }], { cities: WORLD.cities }],
    ]){
      let a;
      try { a = personaAxes(rows, world); }
      catch (e){ msgs.push(`${name}: 터짐 (${e.message})`); continue; }
      if (!/^[FH][ML][ND][GP]$/.test(a?.code || '')) msgs.push(`${name}: 코드가 '${a?.code}'`);
      else if (!PERSONA16[a.code]) msgs.push(`${name}: ${a.code} 가 표에 없음`);
      for (const k of ['개척', '단골', '모험', '만족'])
        if (!(a?.[k] >= 5 && a?.[k] <= 100)) msgs.push(`${name}: ${k}=${a?.[k]} 가 5~100 밖`);
    }
    bad('빈 자료·모르는 도시에서도 코드가 나오는가', msgs);
  }

  /* 3. 세는 규칙. 별점을 매긴 도시만 세고, 유명도를 모르는 도시는 평균에서 뺍니다. */
  {
    const s = personaStats(
      [{ city_id:1, stars:5 }, { city_id:2, stars:4 }, { city_id:3, stars:2 },
       { city_id:4, stars:null, want:true }], WORLD);
    const msgs = [];
    if (s.cities !== 3)      msgs.push(`도시 ${s.cities} (별점 매긴 3 기대 — 가보고 싶어요는 안 셈)`);
    if (s.wishCount !== 1)   msgs.push(`가보고 싶은 곳 ${s.wishCount} (1 기대)`);
    if (s.countries !== 2)   msgs.push(`나라 ${s.countries} (2 기대)`);
    if (s.continents !== 2)  msgs.push(`대륙 ${s.continents} (2 기대)`);
    if (Math.abs(s.avgRating - 11/3) > 1e-9) msgs.push(`평균 별점 ${s.avgRating}`);
    /* 부산(fame 없음)은 셋 중 하나지만 별점을 안 매겨서 애초에 안 들어옵니다.
       들어온 셋의 유명도 평균은 (5+4+5)/3 입니다. */
    if (Math.abs(s.avgFame - 14/3) > 1e-9) msgs.push(`평균 유명도 ${s.avgFame}`);
    if (s.topCountry !== 'JP') msgs.push(`제일 많이 간 나라 ${s.topCountry}`);
    if (s.topCountryName !== '일본') msgs.push(`나라 이름이 코드 그대로: ${s.topCountryName}`);
    bad('personaStats 세는 규칙', msgs);
  }

  /* 3-b. **국내는 네 축 중 둘에서만 빠집니다(b394).** 축마다 표본이 달라졌으니
        어느 축이 무엇을 세는지 한 자리에서 못 박습니다.

        ⚠ **글자가 뒤집히는 자료를 일부러 고릅니다.** 국내를 세느냐 마느냐로
        단골력·모험력·개척력이 **전부 반대로 나오게** 짰습니다. 그래야 규칙을
        되돌리는 순간 이 검사가 셋 다 빨갛게 뜹니다. 점수만 보면 몇 점
        움직였는지로 다투게 되고, 그러면 아무것도 못 잡습니다. */
  {
    const fake = [
      /* 국내 열 곳 — 가깝고(서울 근처) 숨은 곳(fame 3) */
      ...Array.from({ length: 10 }, (_, i) =>
        ({ id: 100 + i, country:'KR', fame:3, center_lat:36.5, center_lng:127.5 })),
      /* 해외 세 곳 — 다 다른 나라, 다 멀리, 다 이름난 곳(fame 1) */
      { id:1, country:'JP', fame:1, center_lat:-33.9, center_lng:151.2 },
      { id:2, country:'FR', fame:1, center_lat: 48.9, center_lng:  2.35 },
      { id:3, country:'US', fame:1, center_lat: 40.7, center_lng:-74.0 },
    ];
    const a = personaAxes(fake.map(c => ({ city_id:c.id, stars:5 })), { cities: fake });
    const msgs = [];
    if (a.해외 !== 3) msgs.push(`해외 ${a.해외} (3 기대)`);
    /* 국내를 세면 최다 나라가 KR 10/13 = 0.77 → L. 해외만 세면 1/3 = 0.33 → M. */
    if (a.code[1] !== 'M') msgs.push(`단골력 ${a.code[1]} — 국내를 세고 있습니다(M 기대)`);
    /* 국내 열 곳(약 120km)이 평균에 들어가면 9,400km 가 2,265km 로 눌려 N 이 됩니다. */
    if (a.code[2] !== 'D') msgs.push(`모험력 ${a.code[2]} — 국내를 세고 있습니다(D 기대)`);
    /* 반대로 개척력은 국내를 **세야** 합니다. 다 세면 평균 2.54 → H,
       해외만 세면 1.0 → F 입니다. 즉 이 줄은 방향이 반대입니다. */
    if (a.code[0] !== 'H') msgs.push(`개척력 ${a.code[0]} — 국내를 빠뜨렸습니다(H 기대)`);
    bad('국내가 단골력·모험력에서만 빠지는가', msgs);
  }

  /* 3-c. 문턱. 해외가 세 곳에 못 미치면 두 축을 50 으로 두고 **그 사실을
        내놓습니다**(화면이 밝힐 수 있어야 하므로). 해외 한 곳이면
        「제일 많이 간 나라 ÷ 전체」가 1.0 이라 단골력이 100 으로 튑니다. */
  {
    const fake = [
      { id:100, country:'KR', fame:2, center_lat:36.5, center_lng:127.5 },
      { id:101, country:'KR', fame:2, center_lat:35.1, center_lng:129.0 },
      { id:102, country:'KR', fame:2, center_lat:37.4, center_lng:127.1 },
      { id:1,   country:'JP', fame:1, center_lat:35.7, center_lng:139.7 },
      { id:2,   country:'JP', fame:1, center_lat:35.0, center_lng:135.8 },
    ];
    const a = personaAxes(fake.map(c => ({ city_id:c.id, stars:4 })), { cities: fake });
    const msgs = [];
    if (a.해외 !== 2)    msgs.push(`해외 ${a.해외} (2 기대)`);
    if (a.단골 !== 50)   msgs.push(`단골력 ${a.단골} (50 기대)`);
    if (a.모험 !== 50)   msgs.push(`모험력 ${a.모험} (50 기대)`);
    if (a.추정.length !== 2) msgs.push(`추정 ${JSON.stringify(a.추정)} (둘 기대)`);
    /* 안 센 축 옆에 "평균 230km" 가 적혀 있으면 50 인 것이 더 헷갈립니다. */
    if (a.avgDist != null) msgs.push(`거리 평균 ${a.avgDist} — 안 셌으면 안 내놔야 합니다`);
    /* 문턱이 **엉뚱한 축까지** 얼리지 않는지. 개척력은 다섯 곳을 다 셉니다. */
    if (a.개척 === 50)   msgs.push('개척력까지 50 — 문턱이 남의 축을 얼렸습니다');
    bad('해외가 모자라면 두 축만 50 으로 두고 밝히는가', msgs);
  }

  /* 4. 인상 깊었던 곳 — 4.5 이상만, 별점 높은 순, 3개까지. */
  {
    const world = { ...WORLD, cities: [1,2,3,4,5].map(i => ({ id:i, country:'JP', name:'도시'+i })) };
    const s = personaStats(
      [{ city_id:1, stars:5 }, { city_id:2, stars:4.5 }, { city_id:3, stars:5 },
       { city_id:4, stars:4 }, { city_id:5, stars:5 }], world);
    const msgs = [];
    if (s.best.length !== 3) msgs.push(`${s.best.length}개 (3까지)`);
    if (s.best.some(b => b.stars < 4.5)) msgs.push('4.5 미만이 섞임');
    if (s.best.some((b, i) => i && b.stars > s.best[i-1].stars)) msgs.push('별점 순이 아님');
    bad('best · 4.5 이상만 · 높은 순 · 3개까지', msgs);
  }

  /* 5. 열여섯 유형이 **실제로 나오는가**. 옛 규칙표에서는 앞 규칙에 가려
        영영 안 나오는 규칙이 있었습니다 — 실제로 규모 문구가 76가지를 다
        넣어봐도 0번이었습니다. 이제는 네 부등호로만 갈리므로 **가려질 수가
        없습니다.** 대신 볼 것이 바뀝니다: 문턱이 한쪽으로 쏠려 있으면
        열여섯이 표에 다 있어도 실제 사람은 두세 개에만 몰립니다.

        ⚠ **못 나온 유형이 있다고 틀림으로 세지 않습니다.** 아래 가짜 도시는
        좌표가 여섯 군데뿐이라 모험력이 다 잡히지 않습니다. 절반 넘게 비면
        그때는 문턱 문제라 틀림으로 셉니다. */
  {
    const fake = [];
    let id = 0;
    for (const fame of [1, 1.5, 2, 2.5, 3])
      for (const [la, ln] of [[35.7, 139.7], [22.3, 114.2], [13.7, 100.5],
                              [48.9, 2.35], [40.7, -74.0], [-33.9, 151.2]])
        fake.push({ id: ++id, name: 'c' + id, country: 'C' + (id % 7), fame,
                    center_lat: la, center_lng: ln });

    const hit = {}, threw = [];
    let n = 0;
    /* 몇 곳을 · 얼마나 흩어서 · 몇 점으로 · 한 나라에 몰았는가 — 넷을 다 훑습니다. */
    for (const take of [1, 2, 3, 5, 8, 14, 22, 30])
      for (const step of [1, 3, 5, 7, 11])
        for (const star of [1, 2.5, 3.2, 3.8, 4.4, 4.9, 5])
          for (const 몰기 of [0, 1]){
            const rows = [];
            for (let i = 0; i < take; i++)
              rows.push({ city_id: 몰기 ? fake[i % 3].id : fake[(i * step) % fake.length].id,
                          stars: star });
            n++;
            let a;
            try { a = personaAxes(rows, { cities: fake }); }
            catch (e){ threw.push(e.message); continue; }
            hit[a.code] = (hit[a.code] || 0) + 1;
          }
    bad('축 셈이 자료를 보다 터지는가', threw.length ? [...new Set(threw)].slice(0, 3) : []);
    const 없음 = Object.keys(PERSONA16).filter(k => !hit[k]);
    out.push({ 항목: `쏠림 — ${n.toLocaleString()}가지를 훑어 ${16 - 없음.length}/16 유형이 나옴`,
               결과: 없음.length ? '⚠ 안 나옴: ' + 없음.join(',') : '✓' });
    console.log('유형별 횟수:', Object.fromEntries(
      Object.entries(hit).sort((a, b) => b[1] - a[1])));
  }

  /* 5-b. **열여섯에 다 닿을 수 있는가.** 위 격자로는 이 질문에 답이 안 됩니다 —
        한 번 그렇게 세었다가 `H*N*` 넷이 "안 나온다"고 나왔는데, 성향 계산이
        아니라 **가짜 도시 서른 곳이 유명도와 거리를 따로 못 고른 탓**이었습니다.
        (숨은 곳이면서 가까운 도시가 그 서른 안에 거의 없었습니다. 진짜 목록
        469곳에는 얼마든지 있습니다.)

        그래서 훑는 대신 **겨냥합니다.** 열여섯 자리마다 그 자리에 떨어질
        자료를 손으로 만들어 넣고, 정말 그 코드가 나오는지 봅니다. 하나라도
        안 맞으면 문턱이 잘못 잡힌 것이라 **틀림**입니다.
        이러면 못 나오는 유형이 있는지를 표본 운에 맡기지 않게 됩니다. */
  {
    const msgs = [];
    /* 축마다 양 끝을 확실히 넘기는 값. 부등호 경계가 아니라 바깥을 씁니다 —
       경계값을 넣으면 이 검사가 반올림 다툼이 되어 버립니다. */
    const FAME  = { F:1.0,  H:3.0 };                       /* 1 이 이름난 쪽입니다 */
    const COORD = { N:[35.7, 139.7], D:[-33.9, 151.2] };   /* 도쿄 ↔ 시드니 */
    const STAR  = { P:3.0,  G:5.0 };
    for (const a of 'FH') for (const b of 'ML') for (const c of 'ND') for (const d of 'GP'){
      const want = a + b + c + d;
      const rows = [], fake = [];
      for (let i = 0; i < 10; i++){
        fake.push({ id: i + 1, name: 'x' + i, fame: FAME[a],
                    /* 한 나라(L)면 다 같은 나라, 여러 나라(M)면 다 다른 나라 */
                    country: b === 'L' ? 'JP' : 'C' + i,
                    center_lat: COORD[c][0], center_lng: COORD[c][1] });
        rows.push({ city_id: i + 1, stars: STAR[d] });
      }
      let got;
      try { got = personaAxes(rows, { cities: fake }).code; }
      catch (e){ msgs.push(`${want}: 터짐 (${e.message})`); continue; }
      if (got !== want) msgs.push(`${want} 를 겨냥했는데 ${got}`);
    }
    bad('열여섯 자리에 다 닿는가 (자리마다 겨냥해서 확인)', msgs);
  }

  /* 6. 궁합. **표를 안 적고 계산으로 뽑으므로 성질만 봅니다.**
        자기 자신을 고르지 않을 것, 최고와 최악이 다를 것, 점수가 대칭일 것
        (내가 본 너와 네가 본 나가 달라지면 아무도 안 믿습니다). */
  {
    const msgs = [];
    for (const code of Object.keys(PERSONA16)){
      const m = personaMates(code);
      if (m.best === code || m.worst === code) msgs.push(`${code}: 자기 자신을 고름`);
      if (m.best === m.worst) msgs.push(`${code}: 최고와 최악이 같음`);
      if (m.bestScore <= m.worstScore) msgs.push(`${code}: 최고가 최악 이하`);
      if (!m.bestLine || !m.worstLine) msgs.push(`${code}: 문구가 빔`);
      if (!PERSONA16[m.best] || !PERSONA16[m.worst]) msgs.push(`${code}: 상대가 표에 없음`);
      for (const other of Object.keys(PERSONA16))
        if (personaMatch(code, other) !== personaMatch(other, code))
          msgs.push(`${code}↔${other}: 점수가 서로 다름`);
    }
    bad('궁합 16개 · 자기 제외 · 대칭 · 최고>최악', [...new Set(msgs)].slice(0, 5));
  }

  /* 6-b. **문구가 카드마다 다른가.** 성질만 봐서는 이걸 못 잡습니다 —
        한 번 고치고도 서른두 칸이 여덟 가지였습니다. 개척·모험만 읽고
        단골·만족을 안 읽어서, 나머지 두 자리가 다른 네 유형이 같은 말을
        썼습니다. 표를 눈으로 뽑아보고서야 알았습니다. 이제는 셉니다.

        짝짓기도 같이 봅니다. 최고·최악이 **열여섯 유형에 한 번씩** 고르게
        돌아가야 합니다. 한 유형이 여럿의 최고로 몰리면 그 유형만 인기가
        되고 나머지는 카드에 이름조차 안 실립니다. */
  {
    const codes = Object.keys(PERSONA16), msgs = [];
    const mates = codes.map(c => personaMates(c));
    const 문구 = new Set(mates.flatMap(m => [m.bestLine, m.worstLine]));
    if (문구.size !== codes.length * 2)
      msgs.push(`문구가 ${codes.length * 2}칸에 ${문구.size}가지뿐`);
    for (const [무엇, key] of [['최고', 'best'], ['최악', 'worst']]){
      const 셈 = {};
      for (const m of mates) 셈[m[key]] = (셈[m[key]] || 0) + 1;
      const 안뽑힘 = codes.filter(c => !셈[c]);
      if (안뽑힘.length) msgs.push(`${무엇}로 한 번도 안 뽑힌 유형: ${안뽑힘.join(',')}`);
      /* 극단 짝은 짝짓기가 일대일이라 서로가 서로를 고릅니다. 안 그러면
         가중치가 어긋난 것입니다. */
      codes.forEach((c, i) => {
        const 짝 = mates[i][key];
        if (personaMates(짝)[key] !== c) msgs.push(`${c}의 ${무엇} ${짝} 가 ${c} 를 안 고름`);
      });
    }
    bad('궁합 문구가 16장 다 다른가 · 짝이 서로를 고르는가', [...new Set(msgs)].slice(0, 5));
  }

  /* 7. 상위% 와 MRZ. 카드 아래 장식이지만 undefined 가 박히면 흉합니다. */
  {
    const msgs = [];
    for (const c of [0, 1, 3, 6, 10, 15, 20, 30, 45, 120]){
      const r = personaRank(c);
      if (!/^상위 [0-9.]+%$/.test(r)) msgs.push(`${c}개국 → '${r}'`);
    }
    const z = personaMrz('FLNG', 12, 40, personaRank(12), 2026);
    if (/undefined|NaN/.test(z)) msgs.push(`MRZ: ${z}`);
    bad('상위% 와 MRZ 문자열', msgs);
  }

  /* ── 카드 안 추천 줄이 넘치면 덜어내는가(b399) ────────────────────────
     캔버스는 **삐져나간 글자를 잘라주지 않습니다.** 그냥 카드 밖에 그려집니다.
     화면에서는 "좀 길구나" 로 보이고 아무도 버그로 안 읽습니다. 그래서 잽니다.
     `measureText` 를 흉내 낸 자로 봅니다 — 진짜 글꼴이 없어도 규칙은 같습니다. */
  {
    const g = { measureText: t => ({ width: [...t].length * 10 }) };
    const msgs = [];
    if (줄여쓰기(g, '나하', 1000) !== '나하') msgs.push('넉넉한데 줄였음');
    /* 좁게 주면 줄어야 합니다. 안 줄면 상자 밖으로 나갑니다. */
    const 좁게 = 줄여쓰기(g, '로스앤젤레스', 45);
    if (g.measureText(좁게).width > 45) msgs.push(`안 줄었음: ${좁게}`);
    if (!좁게.endsWith('…')) msgs.push(`줄였는데 … 가 없음: ${좁게}`);
    /* **하나도 안 들어가도 빈 줄을 내지 않습니다.** 상자 안이 비면 고장으로
       보입니다 — 한 글자와 … 는 남깁니다. */
    const 극단 = 줄여쓰기(g, '로스앤젤레스', 0);
    if (극단 !== '로…') msgs.push(`0폭에서 '${극단}' ('로…' 기대)`);
    bad('카드 안 추천 이름이 넘치면 끝을 줄이는가', msgs);
  }

  console.table(out);
  const ng = out.filter(o => o.결과.startsWith('✗'));
  const warn = out.filter(o => o.결과.startsWith('⚠'));
  console.log(ng.length ? `✗ ${ng.length}건 틀림`
            : warn.length ? `✓ 틀린 것 없음 · ⚠ 살펴볼 것 ${warn.length}건`
            : `✓ ${out.length}건 모두 통과`);
  return out;
};

/* ── 그리기 자가검사 (개발용) ────────────────────────────────────────
 * 콘솔에서 **`await __drawCheck()`** — 위 __cardCheck 와 따로 둡니다.
 * 실제로 캔버스에 그려보므로 느리고(카드 한 장에 1초쯤) 기다려야 합니다.
 * 빠른 검사에 섞으면 `__cardCheck().filter(...)` 가 약속을 돌려주게 되어
 * 부르는 쪽이 다 깨집니다.
 *
 * 보는 것은 하나입니다: **공유된 그림만 보고 여기로 찾아올 수 있는가.**
 * 이 앱은 앱스토어에 없는 PWA 라 이름만 적혀 있으면 검색해도 안 나옵니다.
 */
if (typeof window !== 'undefined') window.__drawCheck = async () => {
  const out = [];
  const bad = (name, msgs) =>
    out.push({ 항목:name, 결과: msgs.length ? '✗ ' + msgs.join(' / ') : '✓' });

  /* 글자는 배경 그라데이션 위에 반투명으로 얹힙니다. 절대 밝기로는 못 봅니다 —
     같은 줄에서 **좌우 끝(글자 없는 자리)과 가운데의 대비**를 봅니다. */
  const 대비 = (g, W, y0, h) => {
    const d = g.getImageData(0, y0, W, h).data;
    let 끝 = 0, n = 0, 최대 = 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < W; x++){
        const i = (y * W + x) * 4, b = (d[i] + d[i+1] + d[i+2]) / 3;
        if (x < 60 || x > W - 60){ 끝 += b; n++; }
        else if (b > 최대) 최대 = b;
      }
    return 최대 - 끝 / n;
  };
  const 그리기 = async spec => {
    const { blob } = await cardImage(spec, 'square');
    const bmp = await createImageBitmap(blob);
    const cv = document.createElement('canvas');
    cv.width = bmp.width; cv.height = bmp.height;
    const g = cv.getContext('2d'); g.drawImage(bmp, 0, 0);
    return { g, W: cv.width, H: cv.height, size: blob.size };
  };
  /* 배경에 옅게 깔린 것을 재려면 '아주 밝은 점이 몇 개인가' 가 아니라
     '전체가 얼마나 밝아졌는가' 를 봐야 합니다. */
  const 평균밝기 = x => {
    const d = x.g.getImageData(0, Math.round(x.H * .20), x.W, Math.round(x.H * .22)).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s += d[i];
    return s / (d.length / 4);
  };
  const 밝은픽셀 = x => {
    const d = x.g.getImageData(0, Math.round(x.H * .45), x.W, Math.round(x.H * .2)).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 235 && d[i+1] > 235) n++;
    return n;
  };
  const base = { g:'rare', icon: PERSONA_ICON.globe, sub:'내 발자국',
                 title:'27개국', nums:'195개국 중 13.8%' };

  try {
    const a = await 그리기(base);
    const m = [];
    if (!a.size) m.push('빈 그림이 나옴');
    /* ⚠ **'주소가 그림 안에 있는가' 를 '이름이 있는가' 로 바꿨습니다(b313).**
       주소를 일부러 뺐는데(위 서명 자리 참고) 검사는 그대로 두면, 매번
       걸리는 것을 무시하게 되고 그러면 진짜가 섞여도 안 보입니다.
       규칙이 화면보다 옛것이면 규칙이 아니라 소음입니다.
       도메인을 사서 주소를 되살리면 여기도 같이 되살리십시오. */
    const 이름 = 대비(a.g, a.W, a.H - 70, 26);
    const 여백 = 대비(a.g, a.W, a.H - 26, 20);
    if (이름 < 여백 + 25)
      m.push(`이름(기로)이 그림에 안 보임 (대비 ${Math.round(이름)} · 여백 ${Math.round(여백)})`);
    bad('공유된 그림에 이름이 남는가', m);
  } catch (e){ bad('공유된 그림에 이름이 남는가', ['터짐: ' + e.message]); }

  try {
    const m = [];
    const paths = [0,1,2,3,4].map(i =>
      `<path class="been" d="M${100 + i*160} 120 h120 v90 h-120 z"/>`).join('');
    const art = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 19 1000 387">
        <style>path{fill:rgba(255,255,255,.16)}path.been{fill:#fff}</style>${paths}</svg>`;
    const 없음 = await 그리기(base);
    const 있음 = await 그리기({ ...base, art, artRatio: 387/1000 });
    /* ⚠ **'밝은 픽셀 수' 로 재던 것을 '평균 밝기' 로 바꿨습니다.**
       b315 에서 지도를 배경으로 옮기면서 50% 투명으로 깔립니다. 흰색이
       회색(128)이 되어 '밝은 픽셀(235 이상)' 이 하나도 안 잡혔고, 그림은
       멀쩡한데 검사만 실패했습니다. 규칙이 화면보다 옛것이면 소음입니다. */
    if (평균밝기(있음) < 평균밝기(없음) + 3) m.push('지도를 넣었는데 그림이 안 바뀜');
    /* **그림이 깨져도 카드는 나와야 합니다.** 지도 하나 때문에 공유를 통째로
       못 하게 되면 안 됩니다. */
    const 깨짐 = await 그리기({ ...base, art:'<svg>망가진 것', artRatio: .4 });
    if (!깨짐.size) m.push('그림이 깨지니 카드가 통째로 안 나옴');
    bad('발자국 지도가 카드에 들어가는가 · 깨져도 버티는가', m);
  } catch (e){ bad('발자국 지도가 카드에 들어가는가', ['터짐: ' + e.message]); }

  console.table(out);
  const ng = out.filter(o => o.결과.startsWith('✗'));
  console.log(ng.length ? `✗ ${ng.length}건 틀림` : `✓ ${out.length}건 모두 통과`);
  return out;
};
