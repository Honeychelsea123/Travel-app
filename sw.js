/* ── 서비스 워커 ───────────────────────────────────────────────────────
 * 이게 없으면 비행기모드에서 앱이 아예 안 열립니다. 여행 중에요.
 * 하는 일은 둘입니다.
 *   1. 앱 껍데기(html·css·js·지도좌표)를 캐시에 둡니다 → 안 터져도 열립니다
 *   2. 지도 타일과 CDN 을 한 번 받은 것은 다시 안 받습니다 → 로밍 요금도 줍니다
 *
 * 조심할 것: 서비스 워커를 잘못 만들면 새 코드가 영원히 안 내려갑니다.
 * 그래서 우리 파일은 항상 네트워크를 먼저 봅니다. 캐시는 실패했을 때만 씁니다.
 * 저장(POST·PATCH)은 손대지 않습니다 — 그건 앱 쪽 큐가 맡습니다.
 */
const VER   = 'v2';
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

  /* ── 우리 파일 ── 네트워크 먼저. 새 빌드가 항상 내려가야 합니다.
     ?v=b112 같은 꼬리표는 무시하고 찾습니다 — 빌드가 올라도 옛 캐시로 열립니다. */
  if (mine){
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(SHELL)).put(req, res.clone());
        return res;
      } catch {
        const c = await caches.open(SHELL);
        return (await c.match(req, { ignoreSearch:true }))
            || (req.mode === 'navigate' ? await c.match('./index.html', { ignoreSearch:true })
                                        : Response.error());
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
