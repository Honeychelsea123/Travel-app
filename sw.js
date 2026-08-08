/* ── 서비스 워커 ───────────────────────────────────────────────────────
 * 이게 없으면 비행기모드에서 앱이 아예 안 열립니다. 여행 중에요.
 * 하는 일은 둘입니다.
 *   1. 앱 껍데기(html·css·js·지도좌표)를 캐시에 둡니다 → 안 터져도 열립니다
 *   2. 지도 타일과 CDN 을 한 번 받은 것은 다시 안 받습니다 → 로밍 요금도 줍니다
 *
 * 조심할 것: 서비스 워커를 잘못 만들면 새 코드가 영원히 안 내려갑니다.
 * 그래서 화면 쪽(app.js 의 checkBuild)이 빌드 번호를 확인해 한 번 새로고침합니다.
 * 저장(POST·PATCH)은 손대지 않습니다 — 그건 앱 쪽 큐가 맡습니다.
 */
const VER   = 'v7';
const SHELL = 't2-shell-' + VER;      /* 우리 파일 */
const RUN   = 't2-run-' + VER;        /* 지도 타일 · CDN · 사진 */
const TILECAP = 400;                  /* 타일이 무한정 쌓이지 않게 */

const SHELL_FILES = [
  './', './index.html', './app.css', './app.js', './world.js',
  './manifest.json', './apple-touch-icon.png',
  './privacy.html', './terms.html',
  /* 관리자만 보는 '바뀐 것' 목록. app.js 가 누를 때만 동적으로 받아오므로
     없어도 앱은 멀쩡합니다. 여기 담아두면 오프라인에서도 열립니다. */
  './changes.js',
];

/* 앱 화면은 index.html 하나뿐입니다. 약관·처리방침은 **다른 문서**입니다.
   아래에서 "문서 요청이면 캐시의 index.html 을 준다"고 뭉뚱그리면
   privacy.html 을 열어도 앱이 나옵니다. 무엇이 앱 문서인지 여기서 가릅니다. */
const isAppDoc = url =>
  url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');

self.addEventListener('install', e => {
  /* 하나라도 실패하면 addAll 은 전부 버립니다. 하나씩 넣어 나머지는 살립니다. */
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await Promise.all(SHELL_FILES.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('t2-') && k !== SHELL && k !== RUN)
                          .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* 아무것도 못 돌려줄 때 마지막으로 내보내는 쪽지.
   빈 화면은 사용자가 할 수 있는 것이 아무것도 없습니다. */
function offlineNote(){
  return new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width,initial-scale=1"><title>AI.Trip</title>
     </head><body style="margin:0;background:#f5f5f7;
       font:15px/1.6 -apple-system,'Apple SD Gothic Neo',sans-serif">
     <div style="max-width:420px;margin:60px auto;padding:24px;background:#fff;
       border-radius:20px;box-shadow:0 8px 30px rgba(0,0,0,.10);text-align:center">
       <b style="font-size:18px">아직 받아둔 화면이 없어요</b>
       <p style="color:#6b6b70;margin:12px 0 18px">
         연결이 되는 곳에서 한 번만 열면<br>그다음부터는 비행기모드에서도 열립니다.</p>
       <button onclick="location.reload()" style="font:inherit;padding:11px 20px;
         border:0;border-radius:999px;background:#0066cc;color:#fff">다시 시도</button>
     </div></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

/* 캐시가 무한정 커지지 않게 오래된 것부터 버립니다. */
async function trim(cache, cap){
  const keys = await cache.keys();
  if (keys.length <= cap) return;
  for (const k of keys.slice(0, keys.length - cap)) await cache.delete(k);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                 /* 저장은 앱 쪽 큐가 맡습니다 */

  const url = new URL(req.url);
  const mine = url.origin === self.location.origin;

  /* Supabase 는 절대 캐시하지 않습니다. 토큰이 붙어 있고 남의 자료가 될 수 있습니다. */
  if (url.hostname.endsWith('.supabase.co')) return;

  /* ── 우리 파일 ──
     처음에는 전부 "네트워크 먼저"로 두었습니다. 연결이 **끊긴** 것이 아니라
     **느릴** 때 응답을 끝까지 기다려서, 홈 화면 앱으로 열면 흰 화면에
     "불러오는 중…"만 한참 떠 있었습니다. 지금은 전부 캐시를 먼저 봅니다.

     1) ?v=b118 이 붙은 파일 — 빌드가 바뀌면 주소가 바뀝니다.
        그러니 캐시에 있으면 그게 곧 맞는 것입니다. 바로 줍니다.
     2) 문서(index.html) — 캐시로 바로 열고 새것은 뒤에서 받아둡니다. */
  if (mine){
    const versioned = url.searchParams.has('v');

    if (versioned){
      e.respondWith((async () => {
        /* 여기서 꼬리표를 무시하면 안 됩니다.
           무시하면 b115 를 달라는데 미리 담아둔 옛 app.js 를 줍니다.
           새 화면에 옛 코드가 붙어 조용히 깨집니다. 주소가 똑같을 때만 씁니다. */
        const hit = await (await caches.open(SHELL)).match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) (await caches.open(SHELL)).put(req, res.clone());
        return res;
      })());
      return;
    }

    /* ── 화면 문서(index.html) ── 캐시 먼저. 기다리지 않습니다.
       여기서 두 가지를 배웠습니다.

       하나, GitHub Pages 가 html 에 max-age=600 을 붙입니다. 브라우저가 10분 동안
       묻지도 않고 자기 캐시를 내줍니다 — 서비스워커가 부르는 fetch 도 그걸 씁니다.
       그래서 뒤에서 받아올 때는 no-store 로 물어 그 캐시를 건너뜁니다.

       둘, 처음에는 "네트워크 먼저, 2.5초 넘으면 캐시"로 두었습니다. 그런데 도쿄 앱에서
       이미 같은 걸 해보고 버린 방식이었습니다 — 비행기모드에서 fetch 가 곧바로
       거절되지 않고 매달려서 그 몇 초를 통째로 버립니다. 캐시 우선이 30ms 였습니다.
       **네트워크를 조금이라도 기다리는 설계는 오프라인에서 집니다.**
       그래서 즉시 캐시로 열고, 새것은 뒤에서 받아둡니다.
       새 빌드가 올라온 것은 화면 쪽에서 알아채 한 번 새로고침합니다. */
    if (isAppDoc(url)){
      e.respondWith((async () => {
        const c = await caches.open(SHELL);
        const fresh = () => fetch(url.href, { cache:'no-store', credentials:'same-origin' })
          .then(async r => {
            if (r.ok){
              /* 문서만 담고 끝내면 안 됩니다. **그 문서가 부르는 파일까지 같이** 담아야 합니다.
                 안 그러면 새 index.html 은 캐시에 있는데 짝인 app.js?v=b138 은 없는
                 상태가 생기고, 그때 비행기모드로 들어가면 흰 화면이 됩니다.
                 실제로 그렇게 터졌습니다. */
              const html = await r.clone().text();
              await c.put('./index.html', r.clone());
              const refs = [...html.matchAll(/(?:src|href)="((?:app|world|calc)\.[a-z]+\?v=[^"]+)"/g)]
                .map(m => './' + m[1]);
              await Promise.all(refs.map(async u => {
                if (await c.match(u)) return;          // 이미 있으면 다시 안 받습니다
                try { await c.add(u); } catch {}
              }));
            }
            return r;
          });
        const hit = await c.match('./index.html', { ignoreSearch:true });
        if (hit){ fresh().catch(() => {}); return hit; }
        /* 캐시에도 없고 네트워크도 안 되면 여기서 그냥 실패했습니다.
           그러면 브라우저가 **빈 화면**을 냅니다 — 무슨 일인지 알 길이 없습니다.
           실제로 그렇게 됐습니다. 마지막으로 이 쪽지라도 돌려줍니다. */
        try { return await fresh(); }
        catch { return offlineNote(); }
      })());
      return;
    }

    /* ── 나머지 우리 파일 (world.js · manifest · 아이콘) ──
       거의 안 바뀝니다. 캐시로 바로 주고 새것은 뒤에서 받아둡니다. */
    e.respondWith((async () => {
      const c = await caches.open(SHELL);
      const hit = await c.match(req, { ignoreSearch:true });
      if (hit){
        fetch(req).then(r => r.ok && c.put(req, r.clone())).catch(() => {});
        return hit;
      }
      try {
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      } catch {
        /* 약관·처리방침도 여기로 옵니다. 문서인데 빈 화면을 내면 안 됩니다. */
        return url.pathname.endsWith('.html') ? offlineNote() : Response.error();
      }
    })());
    return;
  }

  /* ── 바깥 것 (지도 타일 · Leaflet · 사진) ── 캐시 먼저. 안 바뀌는 것들입니다. */
  e.respondWith((async () => {
    const c = await caches.open(RUN);
    const hit = await c.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      /* opaque(무응답) 도 담습니다 — 타일은 CORS 를 안 줍니다.
         대신 상태를 못 보므로 실패한 타일도 담길 수 있습니다. 용량만 막아둡니다. */
      if (res.status === 200 || res.type === 'opaque'){
        c.put(req, res.clone()); trim(c, TILECAP);
      }
      return res;
    } catch {
      return Response.error();
    }
  })());
});
