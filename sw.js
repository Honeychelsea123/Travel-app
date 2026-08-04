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
const VER   = 'v5';
const SHELL = 't2-shell-' + VER;      /* 우리 파일 */
const RUN   = 't2-run-' + VER;        /* 지도 타일 · CDN · 사진 */
const TILECAP = 400;                  /* 타일이 무한정 쌓이지 않게 */

const SHELL_FILES = [
  './', './index.html', './app.css', './app.js', './world.js',
  './manifest.json', './apple-touch-icon.png',
];

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
    if (req.mode === 'navigate' || url.pathname.endsWith('.html') ||
        url.pathname.endsWith('/')){
      e.respondWith((async () => {
        const c = await caches.open(SHELL);
        const fresh = () => fetch(url.href, { cache:'no-store', credentials:'same-origin' })
          .then(r => { if (r.ok) c.put('./index.html', r.clone()); return r; });
        const hit = await c.match('./index.html', { ignoreSearch:true });
        if (hit){ fresh().catch(() => {}); return hit; }
        return await fresh();
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
      } catch { return Response.error(); }
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
