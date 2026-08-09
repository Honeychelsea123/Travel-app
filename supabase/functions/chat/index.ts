// =====================================================================
// AI 대화 — Supabase Edge Function
//
// 왜 서버가 필요한가
//   화면은 공개 저장소에 그대로 올라갑니다. 거기 API 키를 두면 전 세계에 공개됩니다.
//   키는 이 함수의 비밀값(Secrets)에만 두고, 화면은 이 함수만 부릅니다.
//
// 올리는 법 (CLI 없이 대시보드에서)
//   1. Supabase → Edge Functions → Deploy a new function → 이름 chat
//   2. 이 파일 내용을 그대로 붙여넣고 Deploy
//   3. Edge Functions → Secrets 에 GEMINI_KEY 추가 (값은 대시보드에만 넣습니다)
//
// 안전장치 (문서 7장)
//   - AI 는 직접 쓰지 않습니다. 말만 하고, 저장은 사용자가 화면에서 합니다.
//   - 여행 자료는 부른 사람의 토큰으로 읽습니다. RLS 가 그대로 걸리므로
//     남의 여행 id 를 넣어도 아무것도 안 나옵니다.
//   - 사용량은 서비스 키로만 셉니다. 화면에서 건너뛸 수 없습니다.
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MODEL = 'gemini-3.6-flash';              // 도쿄 앱에서 쓰던 것과 같은 모델
const MODEL_FALLBACK = 'gemini-3.5-flash-lite'; // 한도(429)에 걸리면 가벼운 쪽으로

/* 관리자가 화면에서 고른 모델(db/047). 요청을 받을 때마다 설정에서 채웁니다.
   전역이지만 **모든 요청에 같은 값**이라 서로 방해하지 않습니다 —
   부르는 자리가 여럿이라 인자로 실어 나르면 그 줄들만 늘어납니다.
   설정을 못 읽으면 위의 MODEL 그대로 갑니다. */
let activeModel = MODEL;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  });

async function callGemini(model: string, key: string, contents: unknown, temp = 0.7) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: temp,
          responseMimeType: 'application/json',   // 제안을 카드로 만들려면 형식이 있어야 합니다
        },
      }),
    },
  );
  return { code: res.status, body: await res.text() };
}

// ─────────────────────────────────────────────────────────────────────
// 웹 검색 (Tavily) — 도쿄 앱에서 옮겨왔습니다.
//
// 왜 필요한가: 영업시간·휴무·가격·평점은 우리가 가진 자료에 없습니다.
// 없으면 "직접 확인이 필요합니다"라고만 답하게 되는데, 그건 안 물어본 것과 같습니다.
//
// 키가 없으면 검색을 건너뛰고 그냥 답합니다. 검색이 안 된다고 대화가 막히면 안 됩니다.
// ─────────────────────────────────────────────────────────────────────
const SEARCH_DEPTH = 'advanced';   // basic 은 스니펫이 100자에서 끊겨 별점이 안 담겼습니다
const SEARCH_MIN_SCORE = 0.45;     // 도쿄 앱 실측: 맞는 결과는 0.63~0.77 에 몰렸습니다

/** 이 질문에 검색이 필요한가. 내 일정만 보면 되는 것은 안 합니다. */
function needsSearch(q: string) {
  const t = String(q || '');
  // 내 자료만 보면 되는 질문 — 검색은 크레딧만 씁니다
  if (/일정\s*정리|정리해|요약|비어|빈\s*시간|여유|중복|겹치|예산|얼마나\s*썼|지출|정산|몇\s*시에|우리\s*호텔|예약번호|체크아웃|체크인/.test(t))
    return false;
  // 바뀌는 정보 — 검색해야 맞습니다
  return /영업|휴무|문\s*여|문\s*닫|오픈|마감|예약\s*필요|웨이팅|대기|혼잡|붐비|붐벼|붐빔|사람\s*많|줄\s*서|공사|임시|휴관|휴점|가격|요금|입장료|얼마|환율|날씨|기온|비\s*[와오]|눈\s*[와오]|우산|지금|축제|이벤트|최신|요즘|현재|올해|근처|주변|추천|맛집|평점|후기/.test(t);
}

/** 물음표와 조사를 걷어내 검색어를 만듭니다. 문장 그대로 넣으면 가게 이름이 묻힙니다. */
function searchQuery(text: string, dest: string) {
  const raw = String(text || '').replace(/[?？!！]/g, ' ').replace(/\s+/g, ' ').trim();
  const isRating = /타베로그|별점|평점|리뷰|후기/.test(raw);
  let t = raw
    .replace(/\s*(알려\s*줘|알려\s*주세요|가르쳐\s*줘|추천\s*해\s*줘|궁금해|어때|어떤가|인가요|일까요|맞나요|이야|예요|에요|인가|나요|까요|까|줘)\s*$/, ' ')
    .replace(/몇\s*점|몇\s*시|얼마나|얼마|어디|언제|어떻게|왜|까지|부터/g, ' ')
    .replace(/지금|오늘|요즘|현재|최근/g, ' ');
  if (isRating) t = t.replace(/타베로그|별점|평점|리뷰|후기|점수/g, ' ');
  // 낱말로 떨어져 있는 조사만. 이름 안의 글자는 건드리지 않습니다.
  t = t.replace(/\s(은|는|이|가|을|를|의|에|에서|으로|로|와|과|랑|도|만)\s/g, ' ')
       .replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!t) t = raw.slice(0, 60);              // 다 걷혔으면 원문으로
  if (isRating) return t;                    // 별점은 가게 이름만. 사이트는 아래에서 좁힙니다
  return (dest ? dest + ' ' : '') + t;
}

/** 어느 사이트 안에서 찾을지. 검색어에 'tabelog' 를 적으면 낱말 하나를
    사이트 이름이 차지해 가게 이름의 비중이 떨어집니다. 그래서 도메인으로 넘깁니다. */
function searchDomains(text: string, country: string) {
  if (/타베로그|별점|평점|리뷰|후기/.test(String(text)) && country === 'JP')
    return ['tabelog.com'];
  return null;
}

// deno-lint-ignore no-explicit-any
async function webSearch(key: string, admin: any, query: string,
                         n: number, domains: string[] | null) {
  const ck = query + '|' + (domains?.join(',') ?? '');
  // 같은 검색은 다시 안 합니다. Tavily 는 한 번이 크레딧 한 개입니다 (037).
  try {
    const { data } = await admin.from('search_cache')
      .select('results,created_at').eq('key', ck).maybeSingle();
    if (data && Date.now() - new Date(data.created_at).getTime() < 3600_000) {
      // 보관함이 막아준 것도 셉니다(043). 이게 곧 "아낀 크레딧"입니다.
      admin.rpc('search_bump', { p_hit: true }).then(() => {}, () => {});
      return data.results;
    }
  } catch { /* 보관함이 없어도 검색은 됩니다 */ }

  try {
    // deno-lint-ignore no-explicit-any
    const body: Record<string, any> = {
      query, max_results: n, search_depth: SEARCH_DEPTH,
      include_answer: false, include_raw_content: false,
    };
    if (domains?.length) body.include_domains = domains;

    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify(body),
    });
    // 여기까지 왔으면 크레딧이 나갔습니다. 결과가 비거나 실패해도 나간 것은
    // 나간 것이라 res.ok 와 상관없이 셉니다 — 안 그러면 실제보다 적게 잡힙니다.
    admin.rpc('search_bump', { p_hit: false }).then(() => {}, () => {});
    if (!res.ok) return null;
    // deno-lint-ignore no-explicit-any
    let raw: any[] = (await res.json())?.results ?? [];

    // include_domains 는 강제가 아니라 선호입니다. 건수를 못 채우면 다른 사이트로
    // 메워서, tabelog 로 좁혔는데 위키백과가 섞여 들어왔습니다. 우리가 부른 곳만 남깁니다.
    if (domains?.length) {
      raw = raw.filter((it) => {
        const host = (String(it.url || '').match(/^https?:\/\/([^\/?#]+)/i)?.[1] ?? '')
          .toLowerCase();
        return domains.some((d) =>
          host === d.toLowerCase() || host.endsWith('.' + d.toLowerCase()));
      });
    }
    // 관련도가 낮은 것도 버립니다. 도쿄를 물었는데 이탈리아 블로그가 나온 적이 있습니다.
    // score 가 아예 없는 응답이면(형식이 바뀌면) 거르지 않습니다 —
    // 필터 때문에 검색이 통째로 비는 쪽이 더 나쁩니다.
    raw = raw.filter((it) => typeof it.score !== 'number' || it.score >= SEARCH_MIN_SCORE);

    const items = raw.map((it) => ({
      title: String(it.title || '').slice(0, 80),
      snippet: String(it.content || '').replace(/\s+/g, ' ').slice(0, 600),
      link: String(it.url || ''),
    }));

    try {
      await admin.from('search_cache').upsert({ key: ck, results: items, created_at: new Date() });
      await admin.rpc('sweep_search_cache');   // 오래된 것 치우기
    } catch { /* 못 담아도 답은 나갑니다 */ }
    return items;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────
// 블로그 글 읽어오기 — 도쿄 앱에서 옮겨왔습니다.
//
// 남이 짜둔 일정이나 맛집 목록은 대부분 블로그에 있습니다.
// 링크만 던지면 우리가 읽어서 정리합니다. 하나하나 옮겨 적는 수고를 없애는 것이 목적입니다.
//
// 네이버는 본문을 iframe 안에 넣어서, 원래 주소로 받으면 23자짜리 껍데기만 옵니다.
// m.blog.naver.com(모바일)으로 바꾸면 본문이 그대로 옵니다 — 도쿄 앱에서 실측한 것입니다.
//
// 실패하면 null. 부르는 쪽은 없으면 없는 대로 갑니다.
// ─────────────────────────────────────────────────────────────────────
const BLOG_MS   = 8000;   // 한 곳당 최대 대기. 넘으면 버립니다
const BLOG_MAX  = 3;      // 한 번에 읽을 링크 수
const BLOG_CHARS = 9000;  // 한 글에서 가져갈 글자 수
const HTML_MAX  = 400_000; // 받아서 들고 있을 HTML 최대 크기. 본문은 앞쪽에 있습니다

// 본문이 들어 있을 만한 자리. **위에서부터** 찾아 처음 걸리는 것을 씁니다.
// 네이버만 보고 있었더니 티스토리·브런치·벨로그는 페이지 전체가 넘어가서
// 메뉴·사이드바 글자가 일정으로 둔갑했습니다.
const BODY_PATTERNS: RegExp[] = [
  /<div[^>]*class="[^"]*se-main-container[^"]*"[\s\S]*?<\/body>/i,  // 네이버 스마트에디터
  /<div[^>]*id="postViewArea"[\s\S]*?<\/body>/i,                    // 네이버 구 에디터
  /<div[^>]*class="[^"]*(entry-content|article_view|tt_article_useless_p_margin)[^"]*"[\s\S]*?<\/body>/i, // 티스토리
  /<div[^>]*class="[^"]*wrap_body[^"]*"[\s\S]*?<\/body>/i,          // 브런치
  /<article[\s\S]*?<\/article>/i,                                   // 표준
  /<main[\s\S]*?<\/main>/i,
];

/** 시간 제한을 건 fetch. 없으면 느린 블로그 하나가 요청 전체를 붙잡습니다. */
async function fetchText(u: string, ms: number) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const res = await fetch(u, {
      signal: ac.signal,
      redirect: 'follow',
      headers: {
        // 모바일 브라우저인 척해야 모바일 본문이 옵니다.
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
                      'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile Safari/604.1',
        'Accept-Language': 'ko,en;q=0.8',
      },
    });
    if (!res.ok) return null;

    // ── 크기를 재고 받습니다 ──
    // 크기를 안 재고 받으면 큰 페이지에서 손해입니다. 네이버·티스토리 글 한 장의 HTML 이
    // 수 MB 인데 그걸 **셋을 동시에** 받아서, 각각 정규식 여덟 번을 통과시켰습니다.
    // replace 는 그때마다 문자열을 통째로 새로 만듭니다 — 3장 × 3MB × 8번이면
    // 수십 MB 가 순식간에 오갑니다. 로그에 예외 한 줄 없이 shutdown 만 찍힌 것이
    // 그 흔적입니다(예외가 났으면 Uncaught 가 남습니다).
    // 본문은 앞쪽에 있습니다. 뒤쪽은 댓글·추천글·꼬리말이라 잘라도 손해가 없습니다.
    const len = Number(res.headers.get('content-length') || 0);
    if (len > HTML_MAX * 4) return null;      // 대놓고 큰 것은 아예 안 받습니다
    const html = await res.text();
    return html.length > HTML_MAX ? html.slice(0, HTML_MAX) : html;
  } catch {
    return null;                 // 시간 초과도 여기로 옵니다
  } finally {
    clearTimeout(t);
  }
}

function htmlToText(html: string) {
  let body = html;
  for (const p of BODY_PATTERNS) {
    const m = html.match(p);
    if (m) { body = m[0]; break; }
  }
  // 아래 replace 여덟 번이 그때마다 문자열을 통째로 새로 만듭니다.
  // 본문 자리를 찾았어도 넉넉히 잘라두고 시작합니다 — 우리가 쓸 것은 9000자입니다.
  if (body.length > 120_000) body = body.slice(0, 120_000);
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    // 본문 영역을 못 찾아 페이지 전체를 쓰게 됐을 때 메뉴·꼬리말을 걷어냅니다.
    .replace(/<(nav|header|footer|aside|form|select)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function readBlog(raw: string) {
  let u = String(raw || '').trim().replace(/[)\]},.;]+$/, '');  // 문장 끝 기호가 붙어 옵니다
  if (!/^https?:\/\//i.test(u)) return null;
  // 네이버는 본문을 iframe 안에 넣어서 원래 주소로 받으면 껍데기만 옵니다.
  u = u.replace('://blog.naver.com', '://m.blog.naver.com');

  let html = await fetchText(u, BLOG_MS);
  let text = html ? htmlToText(html) : '';

  // 네이버 구형 주소는 모바일로 바꿔도 iframe 껍데기가 옵니다.
  // 그 안에 진짜 주소가 적혀 있으니 한 번만 따라 들어갑니다.
  if (html && text.length < 200) {
    const inner = html.match(/<iframe[^>]+src="([^"]+)"/i)?.[1];
    if (inner) {
      const abs = inner.startsWith('http') ? inner
                : 'https://m.blog.naver.com' + (inner.startsWith('/') ? inner : '/' + inner);
      html = await fetchText(abs, BLOG_MS);
      text = html ? htmlToText(html) : '';
    }
  }

  // 너무 짧으면 껍데기만 온 것입니다. 그걸 근거로 답하면 지어내게 됩니다.
  if (text.length < 200) return null;
  return text.slice(0, BLOG_CHARS);
}

/**
 * 글에서 링크를 찾아 **한꺼번에** 읽습니다.
 * 하나씩 읽으면 세 개에 24초가 걸립니다 — 서로 기다릴 이유가 없습니다.
 * 읽었는지 못 읽었는지를 같이 돌려줍니다. 조용히 실패하면 사용자는
 * "왜 링크를 무시하지?"만 알고 이유를 모릅니다.
 */
// ─────────────────────────────────────────────────────────────────────
// 구글 지도 링크 — **HTML 을 읽으면 안 됩니다.**
//
// 2026-08-06 실측 (https://www.google.com/maps/place/Tokyo+Tower/@35.65,139.74,17z):
//   HTML 216,226자를 받았는데 글자로 바꾸면 **124자**
//   "Google 지도를 보려면 자바스크립트를 사용 설정하세요."
//   og:title 은 "Google Maps" — 장소 이름이 아닙니다.
//
// 지도는 자바스크립트로 그려서 HTML 안에 장소 이름이 없습니다. 그래서
// readBlog 의 "200자 미만이면 껍데기" 검사에 걸려 통째로 버려졌고,
// 사용자에게는 "링크를 못 읽었어요"로만 보였습니다.
//
// **필요한 것은 주소 안에 이미 다 있습니다.** 받아올 이유가 없습니다.
//   /maps/place/<이름>/@<위도>,<경도>,17z
//   /maps/search/<검색어>      ?q=<검색어>      !3d<위도>!4d<경도>
// maps.app.goo.gl 같은 단축 주소만 한 번 따라가 최종 주소를 얻습니다.
// ─────────────────────────────────────────────────────────────────────
const GMAP_RE = /^https?:\/\/(?:[a-z0-9-]+\.)*(?:google\.[a-z.]+\/maps|goo\.gl\/maps|maps\.app\.goo\.gl|maps\.google\.[a-z.]+)/i;
const isGoogleMap = (u: string) => GMAP_RE.test(String(u || '').trim());

/** 단축 주소를 펼칩니다. 실패하면 원래 주소를 그대로 씁니다. */
async function unshortenMap(u: string) {
  if (!/goo\.gl/i.test(u)) return u;          // 이미 긴 주소면 받아올 이유가 없습니다
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), BLOG_MS);
  try {
    const res = await fetch(u, { signal: ac.signal, redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0' } });
    // 보통은 여기서 끝납니다 — 302 를 따라가면 res.url 이 긴 주소입니다.
    if (res.url && !/goo\.gl/i.test(res.url)) return res.url;
    // 다만 302 가 아니라 **HTML 로 넘기는 판**이 있습니다(meta refresh·스크립트).
    // 그때는 res.url 이 그대로라서 본문에서 찾아야 합니다.
    const html = await res.text();
    const m = html.match(/https?:\/\/(?:www\.)?google\.[a-z.]+\/maps\/[^"'\s<>\\]+/i);
    return m ? m[0].replace(/&amp;/g, '&') : u;
  } catch { return u; }
  finally { clearTimeout(t); }
}

/** 주소에서 장소 이름과 좌표를 뽑습니다. 글자 하나도 받아오지 않습니다. */
function parseMapUrl(raw: string) {
  let name = '', lat: string | null = null, lng: string | null = null;
  let url: URL;
  try { url = new URL(raw); } catch { return null; }

  const path = decodeURIComponent(url.pathname);
  // 이름: /maps/place/<이름>/  또는 /maps/search/<검색어>
  const mp = path.match(/\/maps\/(?:place|search)\/([^/@]+)/);
  if (mp) name = mp[1].replace(/\+/g, ' ').trim();
  // ?q= · ?query= 로 오는 판도 있습니다
  if (!name) name = (url.searchParams.get('q') || url.searchParams.get('query') || '').trim();
  // 이름 자리에 좌표만 들어 있는 경우가 있습니다("35.6,139.7"). 이름이 아닙니다.
  if (/^[-\d.]+,\s*[-\d.]+$/.test(name)) name = '';

  // 좌표: @위도,경도  →  없으면 !3d위도!4d경도  →  없으면 ?q=위도,경도
  const at = raw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const d3 = raw.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  const qc = (url.searchParams.get('q') || '').match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
  // !3d/!4d 가 **장소 자체**의 좌표이고 @ 는 지도 화면의 중심입니다.
  // 둘이 다를 수 있으니 !3d 를 먼저 봅니다.
  const hit = d3 || at || qc;
  if (hit){ lat = hit[1]; lng = hit[2]; }

  if (!name && !lat) return null;             // 건질 게 없으면 링크로 취급하지 않습니다
  return { name, lat, lng };
}

async function readGoogleMap(raw: string) {
  const full = await unshortenMap(String(raw || '').trim().replace(/[)\]},.;]+$/, ''));
  const got = parseMapUrl(full);
  if (!got) return null;
  // 글(모델에게 줄 것)과 값(우리가 그대로 쓸 것)을 같이 돌려줍니다.
  return {
    text: [
      got.name ? `장소: ${got.name}` : '장소: (이름이 주소에 없음)',
      got.lat ? `좌표: ${got.lat}, ${got.lng}` : '',
    ].filter(Boolean).join('\n'),
    place: got,
  };
}

async function readLinks(message: string) {
  const urls = [...new Set(String(message ?? '')
    .match(/https?:\/\/[^\s<>"']+/g) ?? [])].slice(0, BLOG_MAX);
  if (!urls.length) return { block: '', report: [] as { link: string; ok: boolean }[] };

  const got = await Promise.all(urls.map(async (u) => {
    if (!isGoogleMap(u)) return { link: u, map: false, text: await readBlog(u), place: null };
    const r = await readGoogleMap(u);
    return { link: u, map: true, text: r?.text ?? null, place: r?.place ?? null };
  }));
  const okOnes = got.filter((g) => g.text);

  const block = okOnes.length
    ? okOnes.map((g) => g.map
        /* 지도 링크는 **장소 하나를 콕 집어 준 것**입니다. 블로그처럼
           "골라 쓰라"고 하면 모델이 흘려보냅니다. 반드시 넣으라고 못 박고,
           좌표는 지어내지 말고 준 값을 그대로 쓰라고 합니다 — 좌표가 틀리면
           이동 시간 검사가 통째로 어긋납니다. */
        ? `\n[사용자가 준 구글 지도 링크] ${g.link}\n` +
          '이 장소는 사용자가 직접 고른 것이다. **반드시 결과에 넣는다.**\n' +
          '좌표가 적혀 있으면 lat·lng 에 그 값을 그대로 쓴다. 어림잡지 않는다.\n' +
          '날짜를 알 수 없으면 일정이 아니라 후보(places)로 낸다.\n' +
          g.text + '\n[지도 끝]\n'
        : `\n[사용자가 준 글] ${g.link}\n` +
          '아래는 그 글의 본문이다. 메뉴·댓글·광고 문구가 섞여 있으니 장소 정보만 골라 쓴다.\n' +
          g.text + '\n[글 끝]\n').join('')
    : '';

  return {
    block,
    report: got.map((g) => ({ link: g.link, ok: !!g.text })),
    /* 지도에서 뽑은 장소를 **그대로** 넘깁니다. 모델을 거치지 않습니다 —
       이름과 좌표를 이미 정확히 쥐고 있는데 다시 물으면 틀립니다.
       실측(2026-08-06): 콜로세움 링크를 넘겼더니 링크는 읽었는데(ok:true)
       actions·places 가 **둘 다 빈 배열**로 왔습니다. 장소 하나에 날짜가
       없으니 모델이 "옮길 일정이 없다"고 판단한 것입니다. */
    maps: got.map((g) => g.place).filter(Boolean) as { name:string; lat:string|null; lng:string|null }[],
  };
}

// ─────────────────────────────────────────────────────────────────────
// 불러오기를 나눠서 동시에
//
// 한 덩어리로 보내면 글이 길수록 오래 걸립니다. 걸리는 시간의 대부분은
// **모델이 답을 써 내려가는 시간**이라 입력이 길면 뽑을 일정도 많아집니다.
// 셋으로 나눠 한꺼번에 보내면 제일 긴 조각만큼만 걸립니다.
//
// **AI 사용 횟수는 그대로 1회입니다.** 세는 것은 ai_take 이고 그건 요청당
// 한 번만 부릅니다. 우리 쪽 비용만 늘고 사용자 한도는 안 닳습니다.
//
// 사진이 붙어 있으면 나누지 않습니다 — 사진은 쪼갤 수가 없고,
// 사진마다 어느 조각에 넣을지 정할 근거도 없습니다.
// ─────────────────────────────────────────────────────────────────────
const IMP_CHUNK = 3500;    // 조각 하나의 글자 수
const IMP_PARTS = 3;       // 최대 조각 수

/** 줄 단위로 자릅니다. 문장 중간에서 끊으면 그 일정이 통째로 사라집니다. */
function splitText(s: string, size: number, maxParts: number) {
  const lines = s.split('\n');
  const out: string[] = [];
  let cur = '';
  for (const ln of lines) {
    if (cur && cur.length + ln.length + 1 > size) { out.push(cur); cur = ''; }
    cur += (cur ? '\n' : '') + ln;
  }
  if (cur) out.push(cur);
  if (out.length <= maxParts) return out;
  // 너무 잘게 나뉘었으면 앞에서부터 뭉쳐 개수를 맞춥니다.
  const per = Math.ceil(out.length / maxParts), merged: string[] = [];
  for (let i = 0; i < out.length; i += per) merged.push(out.slice(i, i + per).join('\n'));
  return merged;
}

/** 한 번 물어보고 글자만 꺼냅니다. 한도(429)에 걸리면 가벼운 모델로 한 번 더. */
// deno-lint-ignore no-explicit-any
async function askGemini(key: string, contents: any[], fast = false) {
  // 불러오기는 '읽어서 옮기기'입니다. 추론이 아니라 추출이라 가벼운 모델로 충분하고
  // 훨씬 빠릅니다. 실측: 큰 모델로 34초였습니다. 실패하면 큰 모델로 한 번 더.
  // temperature 0 — 옮겨 적는 일에 창의성은 손해입니다.
  /* 한때 fast 를 "가벼운 모델로 바꾸기"로 썼습니다. 34초 → 13초가 됐지만
     **같은 자료에서 일정이 18개에서 15개로 줄었습니다.** 불러오기에서 빠지는 것은
     느린 것보다 나쁩니다 — 사용자는 3개가 없어진 줄 모르고 넘어갑니다.
     모델은 되돌리고, fast 는 이제 **temperature 0** 만 뜻합니다.
     옮겨 적는 일에 무작위성은 손해라 그것만은 남깁니다. */
  const first = activeModel;
  const second = MODEL_FALLBACK;
  let r = await callGemini(first, key, contents, fast ? 0 : 0.7);
  /* 실패하면 **왜** 실패했는지 남깁니다. 성공 경로에만 로그를 두었더니
     TIMING 이 통째로 사라졌고, 그러면 "안 찍힌다"만 알고 이유를 모릅니다. */
  if (r.code !== 200){
    console.log(`ASK ${first} -> ${r.code} ${String(r.body).slice(0, 300)}`);
    r = await callGemini(second, key, contents, fast ? 0 : 0.7);
    if (r.code !== 200)
      console.log(`ASK ${second} -> ${r.code} ${String(r.body).slice(0, 300)}`);
  }
  if (r.code !== 200) return null;
  try {
    const parts = JSON.parse(r.body)?.candidates?.[0]?.content?.parts ?? [];
    const t = parts.map((p: { text?: string }) => p.text ?? '').join('').trim();
    return t || null;
  } catch { return null; }
}

/** 두 좌표 사이 거리(km). 이동 시간과 "너무 먼 좌표 버리기"에 씁니다. */
function distKm(a: number, b: number, c: number, d: number) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (c - a) * r, dLng = (d - b) * r;
  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // ── 단계별 시간 재기 ──
  // 로그에 EarlyDrop(클라이언트가 먼저 끊음)만 찍히고 메모리·CPU 는 멀쩡했습니다
  // (11.8MB / 59ms). 서버가 죽은 게 아니라 브라우저가 기다리다 놓은 것입니다.
  // 그럼 **어디서 오래 걸리는지**를 알아야 하는데 그것도 짐작이었습니다.
  // 각 단계가 몇 ms 인지 찍습니다. 함수 로그에서 그대로 보입니다.
  const T0 = Date.now();
  const lap: string[] = [];
  const mark = (name: string) => lap.push(`${name} ${Date.now() - T0}ms`);

  try {
    const key = Deno.env.get('GEMINI_KEY');
    if (!key) return json({ error: 'AI 기능이 아직 준비되지 않았어요. 만든 사람에게 알려주세요.' }, 500);

    const auth = req.headers.get('Authorization') ?? '';
    if (!auth) return json({ error: '로그인이 필요해요.' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    // 부른 사람의 토큰으로 읽습니다 — RLS 가 그대로 걸립니다.
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: '로그인이 필요해요.' }, 401);

    mark('auth');
    const body = await req.json().catch(() => ({}));
    const { trip_id, message, mode, prefs, image, images } = body;
    // 초안은 버튼만 눌러도 됩니다. 사용자가 문장을 쓰지 않습니다.
    const draft = mode === 'draft';
    // 불러오기 — 이미 짜둔 일정(엑셀·사진·글)을 읽어 일정 카드로 만듭니다.
    // 초안과 같은 자리를 씁니다. 둘 다 "날짜가 붙은 여러 개"를 내놓기 때문입니다.
    const imp = mode === 'import';

    // 사진. 간판·메뉴판·티켓을 찍어 물어보는 자리입니다.
    // 화면에서 이미 긴 쪽 1024px JPEG 으로 줄여 보냅니다. 여기서는 크기만 다시 봅니다 —
    // 화면 코드는 누구나 고칠 수 있으니 서버에서도 막아야 합니다.
    // 여러 장을 받습니다. 메뉴판이 두 장으로 나뉘어 있는 일이 흔합니다.
    // 옛 화면이 보내던 image(한 장)도 그대로 받습니다 — 배포 순서가 어긋나도 안 깨집니다.
    const shots: { mimeType: string; data: string }[] = [];
    const incoming = Array.isArray(images) ? images : (image ? [image] : []);
    if (incoming.length > 4)
      return json({ error: '사진은 4장까지 올릴 수 있어요.' }, 400);
    let bytes = 0;
    for (const im of incoming) {
      if (!im?.data) continue;
      if (typeof im.data !== 'string') return json({ error: '사진을 읽지 못했어요. 다른 사진으로 해보세요.' }, 400);
      bytes += im.data.length;
      // 한 장씩도 보고 전체도 봅니다. 작은 것 넷이 모여도 요청이 터질 수 있습니다.
      if (im.data.length > 3_000_000 || bytes > 8_000_000)
        return json({ error: '사진이 너무 커요. 더 작은 것으로 올려주세요.' }, 400);
      const mt = String(im.mime ?? 'image/jpeg');
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mt))
        return json({ error: '이 사진 형식은 못 읽어요. JPG나 PNG로 올려주세요.' }, 400);
      shots.push({ mimeType: mt, data: im.data });
    }
    const shot = shots.length ? shots[0] : null;   // 아래 검색 건너뛰기 판단에 씁니다

    if (!draft && !shots.length && (!message || !String(message).trim()))
      return json({ error: '물어볼 말을 적어주세요.' }, 400);
    if ((draft || imp) && !trip_id)
      return json({ error: '어느 여행인지 골라주세요.' }, 400);
    if (imp && !shots.length && !String(message ?? '').trim())
      return json({ error: '읽을 것이 없어요.' }, 400);

    // ── 사용량과 설정 ── 서비스 키로만. 화면에서 건너뛸 수 없습니다.
    //
    // 설정을 **같이 받아옵니다.** 순서대로 하면 왕복이 하나 더 붙는데,
    // 둘은 서로를 안 기다려도 되는 일입니다.
    // 관리자가 화면에서 바꾸는 값들입니다(db/047). 표가 비었거나 못 읽으면
    // 아래 기본값으로 갑니다 — 설정을 못 읽었다고 답을 안 해주면 안 됩니다.
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const [{ data: take, error: takeErr }, { data: cfgRows }] = await Promise.all([
      admin.rpc('ai_take', { p_user: user.id, p_kind: draft ? 'draft' : imp ? 'import' : 'chat' }),
      admin.from('app_settings').select('key,value'),
    ]);
    const cfg: Record<string, any> =
      Object.fromEntries((cfgRows ?? []).map((r: any) => [r.key, r.value]));
    // 모델 이름은 DB 쪽에서 이미 목록으로 걸러집니다. 그래도 빈 값이면 기본으로.
    activeModel     = String(cfg.ai_model?.name || MODEL);
    const searchOn  = cfg.web_search?.on !== false;
    if (takeErr) return json({ error: takeErr.message }, 500);
    if (!take?.ok)
      return json({
        // 여기는 **사람을 잃는 자리**입니다. 쓸모를 느끼는 순간에 막히면
        // 다시 안 옵니다. 얼마나 썼는지, 언제 풀리는지를 분명히 적습니다.
        error: `오늘 쓸 수 있는 ${take?.limit}번을 다 썼어요. ` +
               `내일 다시 열려요.`,
        used: take?.used, limit: take?.limit,
      }, 429);

    mark('ai_take');
    // ── 여행 자료 ── 없으면 없는 대로 답합니다.
    let ctx = '';
    // 링크 읽기를 **여기서 미리 걸어둡니다.** 아래 여행 자료를 받아오는 동안
    // 같이 돌게 하려는 것입니다. 예전에는 자료를 다 받은 뒤에야 시작해서
    // 그 둘이 순서대로 더해졌습니다. 결과는 쓸 자리에서 기다립니다.
    const linksP = readLinks(String(message ?? ''));

    // 아래 안전장치에서도 씁니다 — 좌표가 구간 중심에서 먼지 봐야 하므로.
    // deno-lint-ignore no-explicit-any
    let legs: any[] = [];
    // 초안을 짤 때 며칠짜리인지 알아야 해서 바깥으로 뺍니다.
    // deno-lint-ignore no-explicit-any
    let tripRow: any = null;
    if (trip_id) {
      // 넷을 차례로 물었습니다. 넷 다 trip_id 하나만 있으면 되는데도
      // 앞의 답을 기다렸습니다 — 오갈 때마다 붙는 시간이 그대로 쌓입니다.
      // 한꺼번에 보냅니다. 제일 느린 하나만큼만 걸립니다.
      const [tripRes, legRes, planRes, expRes] = await Promise.all([
        asUser.from('trips')
          .select('title,destination,country,start_date,end_date,timezone,currency,' +
                  'home_currency,walk_max_km,transit_factor,transit_base_min')
          .eq('id', trip_id).maybeSingle(),
        // 여러 도시·나라를 도는 여행이면 구간마다 통화·시간대·이동방식이 다릅니다.
        // 이걸 안 주면 AI 가 여행 전체를 한 도시로 보고 답합니다.
        asUser.from('trip_legs')
          .select('destination,country,start_date,end_date,timezone,currency,' +
                  'center_lat,center_lng,walk_max_km,transit_factor,transit_base_min')
          .eq('trip_id', trip_id).order('start_date'),
        asUser.from('plans')
          .select('date,start_time,end_time,category,title,memo')
          .eq('trip_id', trip_id).is('deleted_at', null)
          .order('date').order('start_time'),
        asUser.from('expenses')
          .select('date,title,amount,currency,category')
          .eq('trip_id', trip_id).is('deleted_at', null)
          .order('date', { ascending: false }).limit(30),
      ]);

      const trip = tripRes.data;
      tripRow = trip;
      if (trip) {
        legs = legRes.data ?? [];
        const plans = planRes.data;
        const exp = expRes.data;

        ctx = [
          `[여행] ${trip.title}`,
          `기간 ${trip.start_date} ~ ${trip.end_date} · 정산 통화 ${trip.home_currency}`,
          '',
          '[구간] 언제 어디에 있는지. 날짜로 일정·지출이 여기 붙는다.',
          (legs ?? []).map((l) =>
            `- ${l.start_date}~${l.end_date} ${l.destination}(${l.country}) · ` +
            `${l.currency} · ${l.timezone} · 이동 어림 ${l.walk_max_km}km 미만 도보, ` +
            `그 위는 거리×${l.transit_factor}+${l.transit_base_min}분`).join('\n') ||
            `- ${trip.start_date}~${trip.end_date} ${trip.destination}(${trip.country})`,
          '',
          '[일정]',
          (plans ?? []).map((p) =>
            `- ${p.date} ${p.start_time?.slice(0, 5) ?? '시각미정'}` +
            `${p.end_time ? '~' + p.end_time.slice(0, 5) : ''} ` +
            `${p.title}${p.category ? ' (' + p.category + ')' : ''}` +
            `${p.memo ? ' — ' + p.memo : ''}`).join('\n') || '- (없음)',
          '',
          '[최근 지출]',
          (exp ?? []).map((e) =>
            `- ${e.date} ${e.title} ${e.amount}${e.currency}` +
            `${e.category ? ' (' + e.category + ')' : ''}`).join('\n') || '- (없음)',
        ].join('\n');
      }
    }

    // ── 초안 짜기 ──
    // 일정을 통째로 만들어 주는 자리입니다. 묻고 답하는 것과는 규칙이 다릅니다.
    // 하루를 꽉 채우지 않는 것, 한 동네로 묶는 것, 이동 시간을 세는 것이 핵심입니다.
    const days: string[] = [];
    if ((draft || imp) && tripRow) {
      const d = new Date(tripRow.start_date + 'T00:00:00Z');
      const end = new Date(tripRow.end_date + 'T00:00:00Z');
      while (d <= end && days.length < 30) {
        days.push(d.toISOString().slice(0, 10));
        d.setUTCDate(d.getUTCDate() + 1);
      }
    }
    const P = prefs ?? {};
    const paceTxt = P.pace === 'slow' ? '느긋하게. 하루 3개면 충분하다.'
                  : P.pace === 'packed' ? '알차게. 하루 5개까지 넣어도 된다.'
                  : '보통. 하루 4개 안팎.';
    const draftSystem = [
      '너는 여행 일정 초안을 짜는 조수다. 한국어로 쓴다.',
      '말투는 "~해요", "~예요" 로 쓴다. "~합니다", "~입니다" 는 쓰지 않는다 — 앱 전체가 그 말투다.',
      '',
      '지켜야 할 것:',
      `- 여행 첫날부터 마지막 날까지 하루도 빠짐없이 채운다. 날짜는 아래 목록만 쓴다.`,
      `- 속도: ${paceTxt}`,
      '- 하루를 꽉 채우지 않는다. 오후나 저녁에 빈 시간을 남긴다.',
      '  일정이 빽빽하면 지키지 못하고 여행이 피곤해진다.',
      '- 하루는 한 동네로 묶는다. 오전에 시내 반대편, 오후에 또 반대편으로 보내지 않는다.',
      '- 이동 시간을 센다. 그날이 속한 구간의 이동 어림값을 쓴다.',
      '- 도시가 여러 곳이면 그날 어느 구간인지 보고 그 도시 안에서만 짠다.',
      '  로마에 있는 날에 피렌체 식당을 넣지 않는다.',
      '- 첫날은 도착 시간을 모르니 오후부터, 마지막 날은 오전까지만 넣는다.',
      '- 점심과 저녁은 하루에 한 번씩 넣는다.',
      '- 잘 알려진 곳만 넣는다. 확실하지 않은 가게 이름은 지어내지 않는다.',
      '  "OO 거리에서 저녁"처럼 넓게 적는 편이 지어낸 상호보다 낫다.',
      '- 좌표는 확실히 아는 곳만 넣고 모르면 null 로 둔다.',
      '- 영업시간 · 휴무일 · 가격은 적지 않는다. 우리가 확인할 수 없다.',
      P.focus?.length ? `- 이런 것을 좋아한다: ${String(P.focus).slice(0, 80)}` : '',
      P.morning === 'late' ? '- 아침에 늦게 움직인다. 첫 일정을 10시 이후로 잡는다.'
                           : '- 아침 일찍 움직여도 괜찮다.',
      '',
      '반드시 아래 JSON 하나만 낸다. 설명이나 코드블록을 덧붙이지 않는다.',
      '{',
      '  "reply": "이 초안을 어떻게 짰는지 두세 줄.",',
      '  "actions": [',
      '    { "type":"add_plan", "date":"YYYY-MM-DD", "start_time":"HH:MM",',
      '      "title":"제목", "category":"식사|카페|관광|쇼핑|이동|숙소|기타",',
      '      "memo":"한 줄" 또는 null, "lat":숫자 또는 null, "lng":숫자 또는 null }',
      '  ]',
      '}',
      '',
      `[채울 날짜] ${days.join(', ')}`,
      ctx ? '\n아래는 이 여행의 자료다. 이미 들어 있는 일정과 겹치게 넣지 않는다.\n' + ctx : '',
    ].filter(Boolean).join('\n');

    // ── 링크를 던졌으면 그 글을 읽어옵니다 ──
    // 남이 짜둔 일정·맛집 목록은 대부분 블로그에 있습니다. 옮겨 적는 대신 읽어 옵니다.
    // 링크는 하나만 읽었는데, 사람들은 블로그 두세 개를 한꺼번에 붙여넣습니다.
    // 최대 셋까지 **동시에** 읽습니다. 하나씩 읽으면 셋에 24초가 걸립니다.
    mark('ctx');
    const { block: blogBlock, report: blogReport, maps: mapHits } = await linksP;
    mark('links');

    // ── 웹 검색 ──
    // 영업시간·가격·평점처럼 바뀌는 것은 우리 자료에 없습니다.
    // 사진을 물었을 때는 안 합니다 — 물음이 사진에 대한 것이라 검색어가 엉뚱해집니다.
    // 초안(draft)도 안 합니다. 하루치가 아니라 여행 전체라 검색 한 번으로 안 됩니다.
    // 링크가 있으면 검색도 안 합니다 — 검색어가 주소가 되어 엉뚱한 결과만 옵니다.
    let hits: { title: string; snippet: string; link: string }[] | null = null;
    const tavily = Deno.env.get('TAVILY_KEY');
    // 링크를 줬으면 웹 검색은 건너뜁니다 — 읽을 글을 이미 받았습니다.
    // 예전 변수(blog)를 여러 링크(blogBlock)로 바꾸면서 이 줄을 안 고쳐
    // "blog is not defined" 로 답이 통째로 막혔습니다.
    // searchOn 은 관리자가 화면에서 끌 수 있는 스위치입니다(db/047).
    // 끄면 Tavily 크레딧이 아예 안 나갑니다 — 답은 검색 없이 그대로 합니다.
    if (searchOn && tavily && !draft && !shot && !blogBlock && needsSearch(String(message))) {
      const dest = tripRow?.destination ?? '';
      hits = await webSearch(tavily, admin,
        searchQuery(String(message), dest), 5,
        searchDomains(String(message), tripRow?.country ?? ''));
    }
    const searchBlock = hits?.length
      ? '\n[방금 검색한 결과] — 아래 내용을 근거로 답한다\n' +
        hits.map((h, i) => `${i + 1}. ${h.title}\n   ${h.snippet}\n   ${h.link}`).join('\n') +
        '\n'
      : '';

    const system = [
      '너는 여행 계획을 돕는 조수다. 한국어로, 짧고 구체적으로 답한다.',
      '말투는 "~해요", "~예요" 로 쓴다. "~합니다", "~입니다" 는 쓰지 않는다 — 앱 전체가 그 말투다.',
      '',
      '규칙:',
      '- 자료에 없는 것을 지어내지 않는다. 모르면 모른다고 한다.',
      blogBlock
        ? '- [사용자가 준 글]에 있는 장소만 옮긴다. 그 글에 없는 곳을 지어내지 않는다.\n' +
          '  일정이나 맛집 목록이면 actions 로 내서 바로 담을 수 있게 한다.'
        : '',
      searchBlock
        ? '- [방금 검색한 결과]에 있는 내용만 근거로 삼는다. 거기 없는 숫자는 지어내지 않는다.\n' +
          '  검색 결과에도 없으면 "찾지 못했습니다"라고 적는다.'
        : '- 특히 영업시간 · 휴무일 · 가격 · 평점은 확인한 것만 말하고,\n' +
          '  아니면 "직접 확인이 필요합니다"라고 적는다.',
      '- 일정을 직접 고치지 않는다. 제안만 하고 사용자가 앱에서 넣게 한다.',
      '- 하루에 4~5개를 넘겨 채우지 않는다. 빈 시간을 남기는 편이 낫다.',
      '- 이동 시간을 무시하지 않는다. 그날이 속한 구간의 이동 어림값을 쓴다.',
      '- 도시가 여러 곳이면 그날 어느 구간인지 보고 답한다.',
      '  로마 일정에 피렌체 식당을 넣지 않는다.',
      '- 예약번호 · 주소 · 전화번호를 새로 지어내지 않는다.',
      '',
      shots.length
        ? `- 사진이 ${shots.length}장 함께 왔다. 사진에 보이는 것만 말하고, 안 보이는 것은 지어내지 않는다.\n` +
          '  글자가 흐려서 못 읽으면 못 읽는다고 한다.' +
          (shots.length > 1 ? '\n  여러 장이면 몇 번째 사진 이야기인지 밝힌다.' : '')
        : '',
      '',
      '반드시 아래 JSON 하나만 낸다. 설명이나 코드블록을 덧붙이지 않는다.',
      '{',
      '  "reply": "사람에게 할 말. 마크다운 써도 된다.",',
      '  "sources": ["plans","expenses","legs","trip","general" 중 실제로 근거로 삼은 것만],',
      '  "places": [',
      '    { "name":"한국어 이름", "name_local":"현지 표기", "category":"식사|카페|관광|쇼핑|이동|숙소|기타",',
      '      "lat":숫자, "lng":숫자, "why":"한 줄 이유" }',
      '  ],',
      '  "actions": [',
      '    { "type":"add_plan", "date":"YYYY-MM-DD", "start_time":"HH:MM" 또는 null,',
      '      "title":"제목", "category":"위와 같음", "memo":"한 줄" 또는 null,',
      '      "lat":숫자 또는 null, "lng":숫자 또는 null }',
      '  ]',
      '}',
      '',
      'places · actions 규칙:',
      '- 단순히 묻는 말이면 places 와 actions 를 빈 배열로 둔다. 억지로 채우지 않는다.',
      '- 좌표는 아는 곳만 넣는다. 모르면 null 로 둔다. 지어낸 좌표는 넣지 않는다.',
      '- 날짜는 위 구간을 보고 그 도시에 맞는 날로 넣는다.',
      '- 한 번에 5개를 넘기지 않는다.',
      '- 같은 곳을 places 와 actions 에 **둘 다 넣지 않는다.** 일정에 넣을 것이면',
      '  actions 에만 넣는다 — 화면에서 그 카드로 둘 다 할 수 있다.',
      '- **reply 안에 무엇을 냈는지 이름으로 적는다.** 둘 이상이면 번호를 붙인다.',
      '  ("1. 쌍용각  2. 죽서루" 처럼). 사용자는 다음 말에서 "1번", "그거" 로',
      '  가리킨다. reply 에 이름이 없으면 네가 방금 낸 것을 너도 못 찾는다 —',
      '  카드는 대화에 안 남고 이 글만 남는다.',
      '',
      'sources 규칙 — 이건 사용자에게 그대로 보여준다. 정확해야 한다:',
      '- 아래 [일정] 을 보고 답했으면 "plans", [최근 지출] 이면 "expenses",',
      '  [구간] 이면 "legs", [여행] 줄이면 "trip" 을 넣는다.',
      '- 자료에 없고 네가 원래 알던 것으로 답한 부분이 있으면 "general" 을 반드시 넣는다.',
      '  사용자는 이걸 보고 직접 확인할지 정한다. 숨기면 안 된다.',
      searchBlock,
      blogBlock,
      ctx ? '\n아래는 지금 이 여행의 자료다.\n' + ctx : '\n(선택된 여행이 없다.)',
    ].join('\n');

    // ── 불러오기 지시문 ──
    // 여기서 제일 중요한 것은 **"Day 1" 을 실제 날짜로 바꾸는 것**입니다.
    // 사람들이 짜둔 일정은 거의 다 Day 번호로 적혀 있는데, 우리는 실제 날짜로 저장합니다.
    // 그 변환을 사람이 손으로 하면 옮겨 적는 것과 다를 바가 없습니다.
    const importSystem = [
      '너는 이미 짜여 있는 여행 일정을 읽어 옮겨 적는 조수다. 한국어로 쓴다.',
      '말투는 "~해요", "~예요" 로 쓴다. "~합니다", "~입니다" 는 쓰지 않는다 — 앱 전체가 그 말투다.',
      '',
      '지켜야 할 것:',
      '- **주어진 자료에 있는 것만 옮긴다.** 없는 일정을 지어내지 않는다.',
      '  자료가 비었거나 일정이 아니면 actions 를 빈 배열로 둔다.',
      '- "Day 1" · "1일차" · "첫째 날" 은 아래 [여행 날짜] 의 첫 번째 날이다.',
      '  Day 2 는 두 번째 날, 이런 식으로 센다.',
      '- 실제 날짜(9/12, 2026-09-12, 9월 12일)가 적혀 있으면 그것을 그대로 쓴다.',
      '- 날짜를 알 수 없는 줄은 버리지 말고 첫날에 넣는다. 사용자가 옮기면 된다.',
      '- 시각이 있으면 HH:MM 으로. 오전/오후·AM/PM 을 24시간으로 바꾼다.',
      '  "점심"·"저녁"처럼 시각이 아닌 말은 시각으로 만들지 말고 null 로 둔다.',
      '- 표에서는 장소 이름이 들어 있는 칸을 제목으로 쓴다.',
      '  가격·메모·비고 칸은 memo 에 짧게 옮긴다.',
      '- 숙소·항공편·기차도 일정이다. 분류를 숙소·이동으로 준다.',
      '- 좌표는 적지 않는다. 우리가 나중에 채운다. lat·lng 칸을 아예 내지 않는다.',
      '- 같은 일정이 두 번 적혀 있으면 한 번만 낸다.',
      '',
      '반드시 아래 JSON 하나만 낸다. 설명이나 코드블록을 덧붙이지 않는다.',
      '{',
      '  "reply": "몇 개를 읽었는지, 애매했던 것이 있으면 무엇인지 두세 줄.",',
      '  "actions": [',
      '    { "type":"add_plan", "date":"YYYY-MM-DD", "start_time":"HH:MM" 또는 null,',
      '      "title":"제목", "category":"식사|카페|관광|쇼핑|이동|숙소|기타",',
      '      "memo":"한 줄" 또는 null }',
      '  ]',
      '}',
      '',
      `[여행 날짜] ${days.join(', ')}`,
      ctx ? '\n아래는 이 여행에 이미 들어 있는 자료다. 겹치는 것은 다시 내지 않는다.\n' + ctx
          : '',
    ].filter(Boolean).join('\n');

    /* ── 여태 나눈 이야기를 읽어 옵니다 ────────────────────────────────
     * **화면이 보내주지 않고 여기서 직접 읽습니다.** 화면이 보내면 그 말이
     * 진짜 오간 말인지 확인할 방법이 없습니다. asUser 로 읽으므로 RLS 가
     * 그대로 걸려 남의 대화는 애초에 안 나옵니다.
     *
     * **여행마다 따로입니다** — 화면도 여행별로 보여줍니다(loadChats).
     * 여행을 안 고르고 물어보는 대화(trip_id 없음)도 그들끼리 이어집니다.
     *
     * 열두 개까지, 그리고 글자로도 자릅니다. 대화가 길어질수록 요청이 커지고
     * 그만큼 느려지고 비싸집니다 — 무한정 들고 갈 수는 없습니다.
     * 오래된 것부터 버립니다(가까운 말이 가리키는 대상일 확률이 높습니다).
     * 초안·불러오기는 대화가 아니라 한 번 하는 일이라 안 붙입니다. */
    // deno-lint-ignore no-explicit-any
    let history: any[] = [];
    if (!imp && !draft) {
      const q = asUser.from('chats')
        .select('role,content')
        .order('created_at', { ascending: false })
        .limit(12);
      const { data: past } = trip_id
        ? await q.eq('trip_id', trip_id)
        : await q.is('trip_id', null);
      let left = 4000;                       /* 글자 예산 */
      history = (past ?? [])                 /* 최신순으로 왔습니다 */
        .filter((m) => m?.content)
        .filter((m) => {                     /* 예산 안에 드는 것까지만 */
          const n = String(m.content).length;
          if (n > left) return false;
          left -= n; return true;
        })
        .reverse()                           /* 모델에게는 오래된 것부터 */
        .map((m) => ({
          /* chats 는 'user' 와 'model' 로 저장합니다 — Gemini 가 쓰는 이름과
             같습니다. 혹시 다른 값이 들어와도 user 로 떨어뜨립니다. */
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: String(m.content).slice(0, 1200) }],
        }));
    }
    mark('history');

    const contents = imp
      ? [
          { role: 'user', parts: [{ text: importSystem }] },
          { role: 'model', parts: [{ text: '알겠습니다. 자료에 있는 것만 옮기겠습니다.' }] },
          { role: 'user', parts: [
              ...shots.map((s) => ({ inlineData: s })),
              { text: '아래가 옮길 일정이다.\n\n' + blogBlock + String(message ?? '') },
            ] },
        ]
      : draft
      ? [
          { role: 'user', parts: [{ text: draftSystem }] },
          { role: 'model', parts: [{ text: '알겠습니다. 날짜를 빠짐없이 채우겠습니다.' }] },
          { role: 'user', parts: [{ text:
              `${days.length}일 일정 초안을 짜줘.` +
              (message ? ' ' + String(message).slice(0, 300) : '') }] },
        ]
      : [
          { role: 'user', parts: [{ text: system }] },
          { role: 'model', parts: [{ text: '알겠습니다. 자료를 보고 답하겠습니다.' }] },
          // ── 여태 나눈 이야기 ──
          // **이게 통째로 빠져 있었습니다.** 보내는 것이 [규칙]→[알겠습니다]→[지금 친 말]
          // 셋뿐이라 매 요청이 서로 남남이었습니다. 화면에는 대화가 쭉 보이고
          // chats 표에도 다 있는데 **모델에게만 안 갔습니다.**
          // 그래서 "1번", "그거", "좀 더 싼 데로" 같은 말을 하나도 못 알아들었고,
          // 사용자가 "1번 둘째날에 넣어줘" 했을 때 "1번이 어떤 장소인지 알기
          // 어려워요"라고 답했습니다 — 자기가 방금 낸 것인데도요.
          ...history,
          // 사진은 물음과 같은 차례에 넣습니다. 사진이 먼저 오면 모델이 잘 봅니다.
          { role: 'user', parts: [
              ...shots.map((s) => ({ inlineData: s })),
              { text: String(message ?? '이 사진에 대해 알려줘.') },
            ] },
        ];

    // ── 불러오기가 길면 나눠서 동시에 ──
    // 걸리는 시간의 대부분은 모델이 답을 써 내려가는 시간입니다. 자료가 길면
    // 뽑을 일정도 많아져 그만큼 늘어납니다. 셋으로 갈라 한꺼번에 보내면
    // 제일 긴 조각만큼만 걸립니다. 사용 횟수는 위에서 이미 1회만 셌습니다.
    const impBody = blogBlock + String(message ?? '');
    const chunks = (imp && !shots.length && impBody.length > IMP_CHUNK)
      ? splitText(impBody, IMP_CHUNK, IMP_PARTS) : null;

    let raw = '';

    if (chunks && chunks.length > 1) {
      const got = await Promise.all(chunks.map((c, i) => askGemini(key, [
        { role: 'user',  parts: [{ text: importSystem }] },
        { role: 'model', parts: [{ text: '알겠습니다. 자료에 있는 것만 옮기겠습니다.' }] },
        { role: 'user',  parts: [{ text:
            `아래가 옮길 일정이다. 전체를 ${chunks.length}조각으로 나눈 것 중 ` +
            `${i + 1}번째다. **이 조각에 적힌 것만** 옮기고, 여기 없는 날은 만들지 않는다.` +
            '\n\n' + c }] },
      ], true)));

      // 조각끼리 같은 일정을 겹쳐 낼 수 있습니다(앞뒤가 잘린 자리).
      // 날짜·시각·제목이 같으면 같은 것으로 봅니다.
      // deno-lint-ignore no-explicit-any
      const acts: any[] = [];
      const seen = new Set<string>();
      let reply = '';
      for (const t of got) {
        if (!t) continue;
        // deno-lint-ignore no-explicit-any
        let o: any = {};
        try { o = JSON.parse(t); } catch { continue; }
        if (!reply && o?.reply) reply = String(o.reply);
        for (const a of (o?.actions ?? [])) {
          const k = `${a?.date}|${a?.start_time ?? ''}|${String(a?.title ?? '').trim()}`;
          if (seen.has(k)) continue;
          seen.add(k); acts.push(a);
        }
      }
      // 조각이 하나도 답을 못 냈으면 통째로 실패한 것입니다.
      if (!got.some(Boolean))
        return json({ error: 'AI가 답을 안 줬어요. 잠시 뒤 다시 물어봐주세요.' }, 502);
      raw = JSON.stringify({
        reply: reply || `${acts.length}개를 찾았습니다.`, actions: acts });
    } else if (imp) {
      /* 조각을 안 나눈 짧은 자료도 똑같이 가벼운 모델로 갑니다.
         여기만 큰 모델로 두면 "짧은 게 더 느린" 이상한 일이 생깁니다. */
      const t = await askGemini(key, contents, true);
      if (!t) return json({ error: 'AI가 답을 안 줬어요. 잠시 뒤 다시 물어봐주세요.' }, 502);
      raw = t;
    } else {
      let r = await callGemini(activeModel, key, contents);
      /* **429 만 다시 물어보고 있었습니다.** 그런데 무료 등급에서 훨씬 흔한 것은
         503 "The model is overloaded" 입니다 — 그건 재시도 없이 곧장
         "AI가 답을 안 줬어요"로 나갔습니다. 사용자가 실제로 그 화면을 만났고,
         **같은 질문이 잠시 뒤에는 그냥 됐습니다**(9.7초). 즉 물어보기를
         그만둔 것이 유일한 이유였습니다.
         불러오기 쪽(askGemini)은 이미 코드를 안 가리고 한 번 더 물어봅니다.
         여기만 안 하고 있었습니다. */
      if (r.code !== 200){
        console.error('gemini', r.code, String(r.body).slice(0, 300));
        /* 5xx 는 그 모델이 잠깐 붐비는 것입니다. 조금 쉬었다 **같은 모델**로
           한 번 더 — 여기서 바로 가벼운 모델로 넘기면 붐빔을 피하려다
           답의 품질을 잃습니다. */
        if (r.code >= 500){
          await new Promise((s) => setTimeout(s, 1200));
          r = await callGemini(activeModel, key, contents);
        }
        /* 그래도 안 되면(또는 한도 429 라면) 가벼운 모델로 넘깁니다. */
        if (r.code !== 200){
          console.error('gemini 재시도', r.code, String(r.body).slice(0, 300));
          r = await callGemini(MODEL_FALLBACK, key, contents);
        }
      }
      if (r.code !== 200){
        // HTTP 코드를 사용자에게 보여줄 이유가 없습니다. 로그에는 남습니다.
        console.error('gemini 최종실패', r.code, String(r.body).slice(0, 300));
        return json({ error: 'AI가 답을 안 줬어요. 잠시 뒤 다시 물어봐주세요.' }, 502);
      }

      const parsed = JSON.parse(r.body);
      const parts = parsed?.candidates?.[0]?.content?.parts ?? [];
      raw = parts.map((p: { text?: string }) => p.text ?? '').join('').trim();
      if (!raw) {
        const why = parsed?.promptFeedback?.blockReason ??
                    parsed?.candidates?.[0]?.finishReason ?? '알 수 없음';
        /* blockReason(SAFETY 등)은 영어 코드라 사용자에게는 뜻이 없습니다.
           로그에만 남기고, 화면에는 무엇을 해보면 되는지 적습니다. */
        console.error('gemini empty', why);
        return json({ error: '답을 못 받았어요. 물어보는 말을 조금 바꿔서 다시 해보세요.' }, 502);
      }
    }

    mark('gemini');
    console.log('TIMING ' + (imp ? 'import' : draft ? 'draft' : 'chat') +
      ' | ' + lap.join(' | ') + ' | 총 ' + (Date.now() - T0) + 'ms' +
      ' | 글자 ' + (blogBlock.length + String(message ?? '').length) +
      ' | 조각 ' + (chunks?.length ?? 1));

    // JSON 을 못 받아도 말은 전합니다. 형식이 깨졌다고 답까지 버릴 이유는 없습니다.
    let out: { reply?: string; places?: unknown[]; actions?: unknown[];
               sources?: unknown[] } = {};
    try { out = JSON.parse(raw); } catch { out = { reply: raw }; }

    // ── 안전장치 (문서 7장) ──
    // AI 는 직접 쓰지 않습니다. 여기서 걸러 카드로만 내보내고, 저장은 사용자가 합니다.
    const CATS = ['식사', '카페', '관광', '쇼핑', '이동', '숙소', '기타'];
    // 초안은 여행 기간 밖 날짜를 만들어 오면 안 됩니다. 목록에 있는 날만 받습니다.
    const dayset = new Set(days);
    const inTrip = (d: string) => {
      if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
      return (draft || imp) ? dayset.has(d) : true;
    };

    // 좌표가 구간 중심에서 너무 멀면 버립니다.
    // 도쿄를 물었는데 이탈리아 좌표가 오는 일이 실제로 있었습니다.
    const centers: number[][] = legs
      .filter((l) => l.center_lat != null && l.center_lng != null)
      .map((l) => [Number(l.center_lat), Number(l.center_lng)]);
    const nearOk = (lat: unknown, lng: unknown) => {
      if (typeof lat !== 'number' || typeof lng !== 'number') return false;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
      if (!centers.length) return true;              // 중심을 모르면 판단하지 않습니다
      return centers.some(([a, b]) => distKm(a, b, lat, lng) <= 120);
    };
    const coords = (o: Record<string, unknown>) =>
      nearOk(o.lat, o.lng) ? { lat: o.lat as number, lng: o.lng as number }
                           : { lat: null, lng: null };

    const places = (Array.isArray(out.places) ? out.places : [])
      .slice(0, 5)
      .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
      .map((p) => ({
        name: String(p.name ?? '').slice(0, 60),
        name_local: p.name_local ? String(p.name_local).slice(0, 60) : null,
        category: CATS.includes(String(p.category)) ? String(p.category) : null,
        why: p.why ? String(p.why).slice(0, 120) : null,
        ...coords(p),
      }))
      .filter((p) => p.name);

    // 묻고 답할 때는 5개까지. 초안은 여행 전체를 채우므로 하루 6개까지 봐줍니다.
    const actions = (Array.isArray(out.actions) ? out.actions : [])
      .slice(0, (draft || imp) ? Math.max(6, days.length * 8) : 5)
      .filter((a): a is Record<string, unknown> => !!a && typeof a === 'object')
      .filter((a) => a.type === 'add_plan' && inTrip(String(a.date)))
      .map((a) => ({
        type: 'add_plan',
        date: String(a.date),
        start_time: /^\d{2}:\d{2}$/.test(String(a.start_time)) ? String(a.start_time) : null,
        title: String(a.title ?? '').slice(0, 60),
        category: CATS.includes(String(a.category)) ? String(a.category) : null,
        memo: a.memo ? String(a.memo).slice(0, 200) : null,
        ...coords(a),
      }))
      .filter((a) => a.title);

    // 근거는 정해둔 다섯 가지만 통과시킵니다. 모델이 아무 말이나 적어 오면
    // 사용자는 그게 확인된 것인 줄 압니다.
    const SRC = ['plans', 'expenses', 'legs', 'trip', 'general'];
    const sources = [...new Set((Array.isArray(out.sources) ? out.sources : [])
      .map((s) => String(s)).filter((s) => SRC.includes(s)))];

    /* ── 지도 링크로 고른 곳은 우리가 직접 카드로 만듭니다 ──
       모델에게 맡겼더니 아무것도 안 냈습니다(위 readLinks 주석의 실측).
       이름도 좌표도 주소에서 그대로 뽑은 것이라 모델보다 정확합니다.
       날짜를 알 수 없으니 일정이 아니라 **후보**로 냅니다 — 언제 갈지는
       사용자가 정할 일입니다. */
    const mapPlaces = (mapHits ?? []).map((m) => {
      const la = Number(m.lat), ln = Number(m.lng);
      const ok = Number.isFinite(la) && Number.isFinite(ln) &&
                 Math.abs(la) <= 90 && Math.abs(ln) <= 180;
      return {
        name: (m.name || '지도에서 고른 곳').slice(0, 60),
        name_local: null,
        category: null,
        why: '구글 지도 링크에서 가져왔어요',
        lat: ok ? la : null,
        lng: ok ? ln : null,
      };
    }).filter((p) => p.name);
    // 같은 곳을 모델도 냈으면 우리 것만 남깁니다. 좌표가 붙어 있는 쪽입니다.
    const mapNames = new Set(mapPlaces.map((p) => p.name));
    const allPlaces = [...mapPlaces, ...places.filter((p) => !mapNames.has(p.name))];
    /* **일정 쪽에서도 걸러야 합니다.** places 만 걸렀더니 같은 장소가
       카드 두 개로 나왔습니다 — '일정으로 넣기 Colosseo(좌표 없음)' 와
       '후보로 담기 Colosseo(좌표 있음)'. 모델이 붙인 날짜는 여행 첫날일
       뿐 근거가 없고, 좌표도 없습니다. 우리 것만 남깁니다. */
    const actionsOut = actions.filter((a) => !mapNames.has(a.title));

    return json({
      reply: String(out.reply ?? raw).slice(0, 4000),
      places: allPlaces, actions: actionsOut, sources,
      // 어디서 읽어온 것인지 링크째 돌려줍니다. 눌러서 직접 확인할 수 있어야
      // "검색해서 답했다"는 말이 확인 가능한 말이 됩니다.
      web: (hits ?? []).map((h) => ({ title: h.title, link: h.link })),
      // 링크를 읽었는지 못 읽었는지. 조용히 실패하면 사용자는 "왜 링크를 무시하지?"만
      // 알고 이유를 모릅니다. 화면에서 "이 링크는 못 읽었어요"라고 말해줍니다.
      blogs: blogReport.length ? blogReport : undefined,
      used: take.used, limit: take.limit,
      // 어느 날이 비었는지는 화면에서 알려줍니다. 다시 짜달라고 할지 사용자가 정합니다.
      days: (draft || imp) ? days : undefined,
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
