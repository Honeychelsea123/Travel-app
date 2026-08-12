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
import { $, esc, toast } from './dom.js?v=b301';

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
const GRAD = {
  start: ['#9aa0a6', '#6f7378'],      /* 시작 단계 — 연한 회색 */
  rare:  ['#2b3a67', '#6b4fa8'],      /* 특이한 유형 — 남색→보라 */
  deep:  ['#1f6f4a', '#2c7d58'],      /* 파고드는 유형 — 진한 초록 */
  taste: ['#c2681f', '#e0913a'],      /* 별점 성향 — 주황 */
  size:  ['#a8801f', '#d4af37'],      /* 규모 — 금색 */
  plan:  ['#2f7ec2', '#5aa9e6'],      /* 계획 성향 — 하늘색 */
  spend: ['#b0533f', '#d4784f'],      /* 리포트 · 지출 — 붉은 주황 */
  speed: ['#1f6f7a', '#2f9aa8'],      /* 리포트 · 속도 — 청록 */
  even:  ['#4a5568', '#6b7688'],      /* 리포트 · 기본 — 무채색 */
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
const IMG_SIZES = {
  square: { w:1080, h:1080, ko:'정사각 (1080×1080)' },   /* 인스타 피드 */
  story:  { w:1080, h:1920, ko:'스토리 (1080×1920)' },   /* 인스타·카톡 스토리 */
};

let fontReady = null;
async function ensureFont(){
  if (fontReady) return fontReady;
  fontReady = (async () => {
    if (!document.fonts) return false;
    /* 쓸 조합을 다 불러둡니다. 하나라도 빠지면 그 크기만 네모가 됩니다. */
    /* **여기 빠진 조합은 저장한 그림에서만 네모가 됩니다.** 화면은 멀쩡해서
       알아채기 어렵습니다. 위 cardImage 의 F(굵기, 크기) 를 바꾸면 여기도
       같이 바꿔야 합니다 — 사진 배경으로 다시 그리면서 크기가 다 바뀌었습니다. */
    const want = [[700,168],[700,76],[700,34],[600,48],[600,30],[600,28],
                  [500,40],[500,28],[400,40],[400,32]];
    try {
      await Promise.all(want.map(([w, px]) =>
        document.fonts.load(`${w} ${px}px Pretendard`, '가나다 ABC 123 ★')));
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

/* 카드 하나를 그림 파일로. 화면 카드와 같은 내용, 같은 색, 같은 아이콘입니다. */
/* 내보내는 이유는 하나입니다 — **자가검사가 실제로 그려봐야 하기 때문입니다.**
   화면 없이 blob 이 나오는지, 그림이 깨져도 카드가 나오는지를 봅니다. */
export async function cardImage(spec, mode = 'square'){
  const { w:W, h:H } = IMG_SIZES[mode] || IMG_SIZES.square;
  const ok = await ensureFont();
  const fam = ok ? '"Pretendard", -apple-system, sans-serif'
                 : '-apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  const F = (weight, px) => `${weight} ${px}px ${fam}`;

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
  const paintGrad = () => {
    const grd = g.createLinearGradient(0, 0, W * .45, H);
    grd.addColorStop(0, c1); grd.addColorStop(1, c2);
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
  };

  let photoOk = false;
  if (spec.photo){
    const ph = await photoImage(spec.photo);
    if (ph){
      /* 잘라서 꽉 채웁니다(cover). 늘려서 채우면 사람도 건물도 일그러집니다. */
      const s = Math.max(W / ph.width, H / ph.height);
      const dw = ph.width * s, dh = ph.height * s;
      g.drawImage(ph, (W - dw) / 2, (H - dh) / 2, dw, dh);
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
      /* 그 도시의 색을 옅게 덮어 카드마다 인상이 갈리게 합니다. */
      g.globalAlpha = .18; g.fillStyle = c1; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
      photoOk = true;
    }
  }
  if (!photoOk) paintGrad();

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
  if (spec.art){
    const mw = maxW, mh = Math.round(mw * (spec.artRatio || 0.387));
    const art = await svgImage(spec.art);
    if (art) add(mh + 44, y => g.drawImage(art, cx, y, mw, mh));
  }

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
  g.font = F(700, 34); g.globalAlpha = .96;
  g.fillText('기로', cx, H - 62);
  const nameW = g.measureText('기로').width;
  g.globalAlpha = 1;
  /* **주소는 이름만큼 또렷해야 합니다.** 처음에 24px·42% 로 넣었다가 재보니
     배경 대비가 이름의 3분의 2뿐이었습니다(+63 vs +88). 1080px 폭에 24px 이면
     폰 화면에서 9pt 도 안 되는데, 그걸 흐리게까지 하면 **읽어서 칠 수가 없습니다.**
     읽으라고 넣은 글자입니다. 광고처럼 안 보이는 선에서 최대한 또렷하게. */
  const link = appUrlText();
  if (link){
    g.font = F(500, 28); g.globalAlpha = .78;
    /* 같은 줄, 이름 오른쪽에. 가운뎃점으로 갈라 한 서명처럼 보이게 합니다. */
    g.fillText('· ' + link, cx + nameW + 14, H - 62); g.globalAlpha = 1;
  }
  g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;

  return { blob: await new Promise(r => cv.toBlob(r, 'image/png')), fontOk: ok };
}

/* 저장하거나 공유합니다. 휴대폰은 공유창으로 넘기는 편이 훨씬 빠릅니다 —
   내려받기 폴더를 찾아 들어갈 필요가 없습니다. */
async function saveCardImage(spec, mode, name){
  toast('이미지 만드는 중…');
  const { blob, fontOk } = await cardImage(spec, mode);
  const file = new File([blob], name + '.png', { type:'image/png' });
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
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name + '.png';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(fontOk ? '이미지를 저장했어요' : '저장했어요. (글꼴을 못 받아 기본 글꼴로 그렸어요)');
}

/* 어느 크기로 뽑을지 묻습니다. 피드와 스토리는 비율이 아주 달라서
   하나로 뽑아두면 한쪽은 잘리거나 여백이 크게 남습니다. */
export function askImageSize(spec, name){
  const box = document.createElement('div');
  box.className = 'card assheet';
  box.style.cssText = 'position:fixed; left:0; right:0; bottom:0; z-index:1210';
  box.innerHTML = `<h2>어떤 크기로 저장할까요?</h2>` +
    Object.entries(IMG_SIZES).map(([k, v]) =>
      `<button class="small" data-size="${k}"
               style="width:100%; margin-bottom:8px">${esc(v.ko)}</button>`).join('') +
    `<button class="ghost" data-size="" style="width:100%">닫기</button>`;
  document.body.appendChild(box);
  $('sheetbg').classList.remove('hide');
  const shut = () => { box.remove(); $('sheetbg').classList.add('hide');
                       $('sheetbg').removeEventListener('click', shut); };
  /* 뒤를 눌러도 닫혀야 합니다. 이 시트는 코드에서 만든 것이라
     syncSheets 가 모릅니다 — 안 달아두면 뒷판만 걷히고 시트가 남습니다. */
  $('sheetbg').addEventListener('click', shut);
  box.addEventListener('click', async e => {
    const b = e.target.closest('[data-size]'); if (!b) return;
    const k = b.dataset.size;
    shut();
    if (k) await saveCardImage(spec, k, name);
  });
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
const PERSONA_RULES = [
  /* 시작 단계 — 다른 판정이 무의미한 구간 */
  { id:'start1', t:'이제 막 시작한 여행자', g:'start', ic:'foot1', f:s => s.cities <= 3 },
  { id:'start2', t:'슬슬 감이 오는 중',     g:'start', ic:'foot3', f:s => s.cities <= 7 },

  /* 규모 (큰 쪽) — 가장 희소합니다 */
  { id:'size1', t:'세계를 절반쯤 본 사람', g:'size', ic:'crown', f:s => s.countries >= 50 },

  /* 특이한 유형 */
  { id:'rare1', t:'남들이 안 가는 도시 매니아', g:'rare', ic:'compass',
    f:s => s.avgFame >= 2.5 && s.cities >= 8 },
  { id:'size2', t:'여권이 두꺼운 사람', g:'size', ic:'passport', f:s => s.countries >= 25 },
  { id:'rare2', t:'지구 반대편만 골라 가는 사람', g:'rare', ic:'globe',
    f:s => ['남아메리카','아프리카','오세아니아'].filter(k => s.byContinent[k]).length >= 2 },
  { id:'rare3', t:'대륙 순례자', g:'rare', ic:'route', f:s => s.continents >= 4 },
  { id:'rare4', t:'국경을 밥 먹듯 넘는 사람', g:'rare', ic:'stamp',
    f:s => s.citiesPerCountry <= 1.2 && s.countries >= 8 },

  /* 한 곳에 파고드는 유형 — 나라·대륙 이름이 문구에 그대로 들어갑니다 */
  { id:'deep1', g:'deep', ic:'pinheart', f:s => s.topCountryN >= 6,
    t:s => `${s.topCountryName} 덕후` },
  /* 문서의 기준은 "그 대륙 8곳"이었는데, 한국인에게 아시아 8곳은 흔합니다.
     9도시 매긴 사람이 "아시아 정복 중"이 되면서 그 아래 규칙이 전부 막혔습니다
     (꾸준한 여행자 · 가면 바로 가는 사람 · 별점 성향이 다 안 나왔습니다).
     15곳으로 올리고 그 대륙이 전체의 70% 이상일 때만 씁니다 —
     "정복"이라는 말이 맞아떨어지는 선입니다. */
  { id:'deep2', g:'deep', ic:'flag',
    f:s => s.topContinentN >= 15 && s.topContinentN >= s.cities * 0.7,
    t:s => `${s.topContinent} 정복 중` },
  { id:'deep3', t:'깊게 파는 사람', g:'deep', ic:'lens', f:s => s.citiesPerCountry >= 3 },

  /* 규모 (작은 쪽) */
  { id:'size3', t:'꾸준한 여행자', g:'size', ic:'bag', f:s => s.countries >= 12 },

  /* 별점 성향 */
  { id:'taste1', t:'어딜 가도 좋은 사람', g:'taste', ic:'starsmile',
    f:s => s.avgRating >= 4.5 && s.cities >= 8 },
  { id:'taste2', t:'웬만해선 만족 안 하는 사람', g:'taste', ic:'starhalf',
    f:s => s.avgRating <= 2.8 && s.cities >= 8 },
  { id:'taste3', t:'호불호가 뚜렷한 사람', g:'taste', ic:'starsplit',
    f:s => s.lowRatio >= 0.3 && s.highRatio >= 0.3 },

  /* 계획 성향 */
  { id:'plan1', t:'꿈이 더 많은 사람', g:'plan', ic:'shoot',
    f:s => s.wishCount >= s.cities * 2 },
  { id:'plan2', t:'가면 바로 가는 사람', g:'plan', ic:'bolt',
    f:s => s.wishCount <= 2 && s.cities >= 10 },

  /* 어디에도 안 걸렸을 때 */
  { id:'base', t:'여행을 아는 사람', g:'size', ic:'bag', f:() => true },
];

export function judgePersona(s){
  const r = PERSONA_RULES.find(x => x.f(s));
  return { ...r, title: typeof r.t === 'function' ? r.t(s) : r.t };
}

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

  /* 1. 표에 빠진 키 — 배경과 아이콘은 없으면 조용히 undefined 가 나갑니다. */
  {
    const msgs = [], icons = { ...PERSONA_ICON, ...REPORT_ICON };
    const seen = new Set();
    for (const r of PERSONA_RULES){
      if (seen.has(r.id)) msgs.push(`id 중복: ${r.id}`);
      seen.add(r.id);
      if (!PERSONA_BG[r.g]) msgs.push(`${r.id}: 배경 '${r.g}' 없음`);
      if (!icons[r.ic])     msgs.push(`${r.id}: 아이콘 '${r.ic}' 없음`);
    }
    bad(`규칙표 ${PERSONA_RULES.length}개 · 배경·아이콘이 다 있는가`, msgs);
  }

  /* 2. 어떤 자료가 와도 성향이 하나는 나와야 합니다. 하나도 안 걸리면
        judgePersona 가 undefined 를 펼치다 화면이 통째로 죽습니다. */
  {
    const msgs = [];
    for (const [name, rows, world] of [
      ['아무것도 없음', [], WORLD],
      ['가보고 싶은 곳만', [{ city_id:1, want:true }], WORLD],
      ['도시 목록 없음', [{ city_id:1, stars:5 }], undefined],
      ['모르는 도시', [{ city_id:999, stars:3 }], WORLD],
    ]){
      let p;
      try { p = judgePersona(personaStats(rows, world)); }
      catch (e){ msgs.push(`${name}: 터짐 (${e.message})`); continue; }
      if (!p || !p.title) msgs.push(`${name}: 성향이 안 나옴`);
    }
    bad('빈 자료·모르는 도시에서도 성향이 나오는가', msgs);
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

  /* 5. 앞 규칙에 가려 **영영** 안 나오는 규칙 찾기.
        실제로 그런 일이 있었습니다 — 규모 문구가 12개국부터 87개국까지
        76가지를 다 넣어봐도 0번이었습니다(대륙 수가 먼저 걸려서).

        **무작위 표본으로는 이 질문에 답할 수 없습니다.** 한 번 그렇게 만들었다가
        틀렸습니다. 표본이 안 만든 것과 규칙이 못 나오는 것을 가릴 수가 없어서,
        멀쩡한 taste1('어딜 가도 좋은 사람')을 죽었다고 말했습니다. 손으로 따져보니
        `10곳 · 5개국 · 2대륙 · 유명한 곳 · 평균 4.7점` 이면 그냥 나옵니다.

        그래서 무작위를 걷어내고 **격자를 다 훑습니다.** 값마다 뜻이 갈리는 지점만
        골라 넣으면(경계 앞뒤) 규칙이 부등호로만 되어 있으므로 이걸로 충분합니다.
        분포를 짐작할 필요가 없어집니다 — 짐작이 틀려서 두 번 헛다리를 짚었습니다.

        한 번이라도 나오면 **그 자료가 어떤 사람인지 같이 적어 둡니다.** 숫자만
        "나옴"이라고 하면 그게 실제로 있을 법한 사람인지 알 수가 없습니다. */
  {
    /* 경계 앞뒤로만 고릅니다. 규칙이 쓰는 문턱: cities 3·7·8·10, countries
       8·12·25·50, continents 4, topCountryN 6, topContinentN 15,
       citiesPerCountry 1.2·3, avgRating 2.8·4.5, avgFame 2.5, 비율 0.3 */
    const G = {
      cities:      [0, 3, 7, 8, 10, 14, 24, 40, 60],
      countries:   [1, 4, 7, 8, 11, 12, 24, 25, 49, 50],
      contSet:     [['아시아'], ['아시아','유럽'], ['아시아','유럽','북아메리카'],
                    ['아시아','유럽','북아메리카','오세아니아'],
                    ['아시아','오세아니아'],                    /* 반대편 1 */
                    ['아시아','오세아니아','남아메리카']],       /* 반대편 2 → rare2 */
      topCountryN: [1, 5, 6],
      topContFrac: [0.4, 0.69, 0.71, 1],
      avgRating:   [1.5, 2.8, 3.6, 4.5, 5],
      avgFame:     [1, 2.4, 2.5, 3],
      wishCount:   [0, 2, 3, 30],
      ratios:      [[0, 0], [0.29, 0.5], [0.3, 0.3]],
    };
    const hit = {}, witness = {}, threw = [];
    let n = 0;
    for (const cities of G.cities)
    for (const countries of G.countries){
      if (countries > Math.max(cities, 1)) continue;      /* 나라가 도시보다 많을 수 없습니다 */
      for (const conts of G.contSet){
        if (conts.length > countries) continue;
        const byContinent = {};
        for (const k of conts) byContinent[k] = 1;
        for (const topCountryN of G.topCountryN){
          if (topCountryN > cities) continue;
          for (const tf of G.topContFrac)
          for (const avgRating of G.avgRating)
          for (const avgFame of G.avgFame)
          for (const wishCount of G.wishCount)
          for (const [lowRatio, highRatio] of G.ratios){
            n++;
            const s = {
              cities, countries, continents: conts.length, byContinent, byCountry:{},
              topCountry:'JP', topCountryName:'일본', topCountryN,
              topContinent: conts[0], topContinentN: Math.round(cities * tf),
              avgRating, avgFame, wishCount, lowRatio, highRatio,
              citiesPerCountry: countries ? cities / countries : 0,
              best: [],
            };
            /* **예외를 삼키지 않습니다.** 삼키면 터진 규칙이 "안 걸린 규칙"으로
               둔갑해 원인이 자기 자신을 감춥니다. 터진 것은 터진 것으로 셉니다. */
            let r = null;
            for (const x of PERSONA_RULES){
              try { if (x.f(s)){ r = x; break; } }
              catch (e){ threw.push(`${x.id}: ${e.message}`); }
            }
            const id = r ? r.id : '(안 걸림)';
            hit[id] = (hit[id] || 0) + 1;
            if (!witness[id]) witness[id] =
              `${cities}곳 · ${countries}개국 · ${conts.length}대륙 · ` +
              `별점 ${avgRating} · 유명도 ${avgFame} · 담아둔 곳 ${wishCount}`;
          }
        }
      }
    }
    bad('규칙이 자료를 보다 터지는가', threw.length ? [...new Set(threw)].slice(0, 3) : []);
    /* 마지막 규칙은 "어디에도 안 걸렸을 때"입니다. 안 나오는 것이 정상이자
       좋은 소식입니다 — 모두가 진짜 성향을 받았다는 뜻입니다. 목록에서 뺍니다. */
    const fallback = PERSONA_RULES[PERSONA_RULES.length - 1].id;
    const dead = PERSONA_RULES.filter(r => !hit[r.id] && r.id !== fallback).map(r => r.id);
    /* 격자를 다 훑고도 안 나왔으면 **앞 규칙이 논리적으로 다 걷어간 것**입니다.
       이건 분포 문제가 아니라 규칙표 문제이므로 틀림으로 셉니다. */
    bad(`앞 규칙에 완전히 가려진 규칙 (${n.toLocaleString()}가지 다 훑음)`, dead);
    console.log('규칙별 횟수:', Object.fromEntries(
      Object.entries(hit).sort((a, b) => b[1] - a[1])));
    console.log('규칙마다 처음 걸린 사람:', witness);
    if (hit['(안 걸림)']) bad('어디에도 안 걸린 자료', [`${hit['(안 걸림)']}가지`]);
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
    /* 주소가 안 그려지면 대비가 빈 여백과 같아집니다. */
    const 주소 = 대비(a.g, a.W, a.H - 70, 26);
    const 여백 = 대비(a.g, a.W, a.H - 26, 20);
    if (주소 < 여백 + 25)
      m.push(`주소가 그림에 안 보임 (대비 ${Math.round(주소)} · 여백 ${Math.round(여백)})`);
    if (!appUrlText()) m.push('주소 자체가 비어 있음');
    bad('공유된 그림만 보고 찾아올 수 있는가 (주소가 그림 안에)', m);
  } catch (e){ bad('공유된 그림만 보고 찾아올 수 있는가', ['터짐: ' + e.message]); }

  try {
    const m = [];
    const paths = [0,1,2,3,4].map(i =>
      `<path class="been" d="M${100 + i*160} 120 h120 v90 h-120 z"/>`).join('');
    const art = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 19 1000 387">
        <style>path{fill:rgba(255,255,255,.16)}path.been{fill:#fff}</style>${paths}</svg>`;
    const 없음 = await 그리기(base);
    const 있음 = await 그리기({ ...base, art, artRatio: 387/1000 });
    if (밝은픽셀(있음) < 밝은픽셀(없음) * 2) m.push('지도를 넣었는데 그림이 안 바뀜');
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
