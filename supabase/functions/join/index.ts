// =====================================================================
// 초대 링크 — Supabase Edge Function
//
// 무엇을 고치려고 만들었나
//   초대 링크를 카톡으로 보내면 미리보기 카드에 늘 같은 것만 떴습니다.
//   "기로 — 여행 일정을 같이 짜는 앱" + 앱 아이콘. 무슨 여행인지,
//   어디로 가는지 카드만 봐서는 알 수가 없었습니다.
//
//   왜 그랬냐면 — 앱은 GitHub Pages 에 올라간 **정적 index.html 한 장**입니다.
//   주소 뒤에 ?join=CODE 를 붙여도 파일은 그대로입니다. 그리고 메신저
//   크롤러는 **자바스크립트를 안 돌립니다.** 받아서 <meta og:> 만 읽습니다.
//   그러니 앱 안에서 뭘 해도 카드는 안 바뀝니다. 카드를 바꾸려면
//   **주소마다 다른 HTML 을 내주는 자리**가 있어야 하고, 그게 여기입니다.
//
// 어떻게 도나
//   초대 링크가 이제 이 함수를 가리킵니다.
//     .../functions/v1/join?c=ABC123
//   1) 크롤러가 오면  → og: 태그가 채워진 작은 HTML 한 장을 받고 끝냅니다.
//   2) 사람이 오면    → 같은 HTML 을 받는데, 그 안의 <script> 가 곧바로
//                       진짜 앱(?join=CODE)으로 보냅니다.
//   둘을 갈라 보지 않습니다. **User-Agent 로 사람을 가려내지 않습니다** —
//   크롤러 목록은 늘 새고, 한 번 틀리면 사람이 빈 화면에 갇힙니다.
//   같은 것을 주고, 자바스크립트가 도는 쪽만 알아서 넘어갑니다.
//
// 올리는 법 (CLI 없이 대시보드에서)
//   1. Supabase → Edge Functions → Deploy a new function → 이름 join
//   2. 이 파일 내용을 그대로 붙여넣고 Deploy
//   3. ⚠ **Verify JWT 를 끄세요.** (함수 → Details → JWT 검증 해제)
//      안 끄면 크롤러가 401 을 받고 카드가 아예 안 생깁니다. 크롤러는
//      Authorization 헤더를 안 붙입니다. 여기서 나가는 것은 초대 코드를
//      아는 사람에게만 나가는 여행 이름·목적지·날짜뿐이고, 그건 이미
//      링크를 보낼 때 글로 같이 나가고 있었습니다.
//   4. db/069_peek_invite_photo.sql 을 먼저 돌려두세요. 사진이 거기서 옵니다.
//
// 안 되는 것
//   코드가 틀렸거나 만료됐으면 여행 이름을 **안 알려줍니다.** 그냥 앱 카드가
//   뜹니다 — 카드는 코드를 아무거나 넣어보는 사람에게도 보이는 자리라,
//   여기서 "이 코드는 없는 코드" 와 "만료됨" 을 갈라주면 코드를 긁는 데
//   쓸 수 있습니다. 사람이 들어와서 로그인한 다음에 앱이 제대로 말해줍니다.
// =====================================================================

const APP = 'https://honeychelsea123.github.io/Travel-app/';
const ICON = APP + 'icons/keyro-512.png';

const SB   = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

/* ⚠ **`req.url` 로 og:url 을 만들지 않습니다.** 엣지 런타임 안에서는 주소가
   `http://…/join?c=…` 로 보입니다 — `https` 가 아니고 `/functions/v1` 도
   빠져 있습니다(재봄). 그대로 og:url 에 넣으면 크롤러 중 그걸 진짜 주소로
   삼는 쪽이 죽은 데를 가리킵니다. 밖에서 보이는 주소를 여기서 만듭니다. */
const SELF = SB + '/functions/v1/join';

/* HTML 안에 남의 글을 넣습니다. 여행 이름은 사용자가 직접 친 글자입니다.
   따옴표 하나만 새도 og:title 이 거기서 끊기고, 뒤가 태그로 읽힙니다. */
const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* 2026-09-12 → 9월 12일. 카드 한 줄에 들어가야 해서 연도는 뺍니다 —
   초대는 대개 코앞의 여행이고, 해가 다르면 어차피 앱에서 보입니다. */
const md = (d: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ''));
  return m ? `${+m[2]}월 ${+m[3]}일` : '';
};
const range = (a: string, b: string) => {
  const x = md(a), y = md(b);
  return !x ? '' : (!y || x === y) ? x : `${x} – ${y}`;
};

Deno.serve(async (req) => {
  const url  = new URL(req.url);
  /* ?c= 로 받습니다. ?join= 이 아닌 이유: 이 주소는 앱이 아니라 이 함수의
     주소라, 앱 쪽 이름과 같게 두면 어느 쪽 규칙인지 헷갈립니다. */
  const code = (url.searchParams.get('c') || '').trim().toUpperCase();

  let title = '기로 — 여행 일정을 같이 짜는 앱';
  let desc  = '일정·지출·짐을 같이 보는 여행 앱. 초대 링크로 들어오면 바로 같이 볼 수 있어요.';
  let img   = ICON;
  let card  = 'summary';

  if (/^[A-Z0-9]{4,32}$/.test(code)) {
    try {
      /* peek_invite 는 anon 에게 열려 있습니다(db/009, 069).
         서비스 키를 여기 들이지 않습니다 — 이 함수는 로그인 없이 열립니다. */
      const r = await fetch(`${SB}/rest/v1/rpc/peek_invite`, {
        method: 'POST',
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}`,
                   'Content-Type': 'application/json' },
        body: JSON.stringify({ p_code: code }),
        signal: AbortSignal.timeout(4000),  /* 크롤러는 오래 안 기다립니다 */
      });
      const t = await r.json();
      if (t && t.title && !t.expired) {
        title = `${t.title} · 같이 가실래요?`;
        desc  = [t.destination, range(t.start_date, t.end_date)]
                  .filter(Boolean).join(' · ');
        if (t.image_url) { img = t.image_url; card = 'summary_large_image'; }
      }
    } catch { /* 못 읽으면 그냥 앱 카드로 둡니다. 카드가 없는 것보단 낫습니다. */ }
  }

  /* 사람이 갈 곳. 코드가 이상하면 코드 없이 앱만 엽니다. */
  const go = APP + (code ? '?join=' + encodeURIComponent(code) : '');

  const html = `<!doctype html><html lang="ko"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="기로">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:url" content="${esc(SELF + (code ? '?c=' + encodeURIComponent(code) : ''))}">
<meta property="og:locale" content="ko_KR">
<meta name="twitter:card" content="${card}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img)}">
<meta name="description" content="${esc(desc)}">
<!-- 자바스크립트가 막혀 있어도 결국 앱으로 갑니다. 크롤러는 이걸 안 따라갑니다. -->
<meta http-equiv="refresh" content="2;url=${esc(go)}">
<style>
  html{color-scheme:light dark}
  body{margin:0;height:100dvh;display:grid;place-items:center;
       font:15px/1.6 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",
            "Malgun Gothic",sans-serif;color:#11141A;background:#fff;
       text-align:center;padding:24px}
  @media (prefers-color-scheme:dark){body{color:#f5f5f7;background:#11141A}}
  a{color:#0066cc}
</style>
</head><body>
<div>
  <p>${esc(title)}</p>
  <p><a href="${esc(go)}">열리지 않으면 여기를 누르세요</a></p>
</div>
<script>location.replace(${JSON.stringify(go)});</script>
</body></html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      /* 크롤러가 한 번 받아간 카드를 오래 들고 있으면, 여행 이름을 고쳐도
         옛 카드가 계속 뜹니다. 5분이면 여러 명이 같은 링크를 열 때는
         재활용되고, 고친 것은 곧 반영됩니다. */
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
});
