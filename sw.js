/* ── 서비스 워커 ───────────────────────────────────────────────────────
 * 이게 없으면 비행기모드에서 앱이 아예 안 열립니다. 여행 중에요.
 * 하는 일은 둘입니다.
 *   1. 앱 껍데기(html·css·js·지도좌표)를 캐시에 둡니다 → 안 터져도 열립니다
 *   2. 지도 타일과 CDN 을 한 번 받은 것은 다시 안 받습니다 → 로밍 요금도 줍니다
 *
 * 조심할 것: 서비스 워커를 잘못 만들면 새 코드가 영원히 안 내려갑니다.
 * 그래서 빌드 번호가 적힌 index.html 은 네트워크를 먼저 봅니다.
 * 저장(POST·PATCH)은 손대지 않습니다 — 그건 앱 쪽 큐가 맡습니다.
 */
const VER   = 'v3';
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
     여기서 한 번 잘못 짰습니다. 전부 "네트워크 먼저"로 두었더니,
     연결이 **끊긴** 것이 아니라 **느릴** 때 응답을 끝까지 기다렸습니다.
     홈 화면 앱으로 열면 흰 화면에 "불러오는 중…"만 한참 떠 있었습니다.
     연결이 없을 때만 대비하면 되는 줄 알았는데, 느린 쪽이 더 흔했습니다.

     그래서 둘로 나눕니다.

     1) ?v=b114 가 붙은 파일 — 빌드가 바뀌면 주소가 바뀝니다.
        그러니 캐시에 있으면 그게 곧 맞는 것입니다. 바로 줍니다.
     2) 문서(index.html) — 새 빌드 번호가 여기 적혀 있으니 네트워크를 봅니다.
        다만 2.5초 안에 안 오면 캐시로 열고, 받아온 것은 다음번을 위해 넣어둡니다. */
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

    e.respondWith((async () => {
      const c = await caches.open(SHELL);
      const cached = () => c.match(req, { ignoreSearch:true })
        .then(r => r || (req.mode === 'navigate'
          ? c.match('./index.html', { ignoreSearch:true }) : null));
      try {
        const res = await Promise.race([
          fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }),
          new Promise((_, no) => setTimeout(() => no(new Error('느림')), 2500)),
        ]);
        return res;
      } catch {
        /* 느리거나 끊겼습니다. 갖고 있는 것으로 엽니다.
           네트워크는 뒤에서 계속 받아 캐시에 넣습니다 — 다음에 열 때 최신입니다. */
        fetch(req).then(r => r.ok && c.put(req, r.clone())).catch(() => {});
        return (await cached()) || Response.error();
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
