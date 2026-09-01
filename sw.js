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
  './manifest.json', './icons/apple-touch-icon.png', './icons/keyro-512.png', './icons/keyro-icon-orange.svg',
  './privacy.html', './terms.html',
];

/* 앱 화면은 index.html 하나뿐입니다. 약관·처리방침은 **다른 문서**입니다.
   아래에서 "문서 요청이면 캐시의 index.html 을 준다"고 뭉뚱그리면
   privacy.html 을 열어도 앱이 나옵니다. 무엇이 앱 문서인지 여기서 가릅니다. */
const isAppDoc = url =>
  url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');

/* 부팅에 필요한 바깥 파일인가. **판단은 여기 하나뿐입니다** — 아래 fetch 와
   activate 의 이사가 같이 씁니다. 같은 식을 두 곳에 적으면 한쪽만 고치게 됩니다.
   확장자로만 가르면 안 됩니다: app.js 가 실제로 import 하는 주소는
   `https://esm.sh/@supabase/supabase-js@2` 라 끝에 .js 가 없습니다.
   esm.sh 는 자바스크립트만 주므로 통째로, unpkg·jsdelivr 는 글꼴도 주므로
   확장자를 봅니다. */
const isCodeUrl = url =>
  url.hostname === 'esm.sh'
  || (['unpkg.com', 'cdn.jsdelivr.net'].includes(url.hostname)
      && /\.(js|css|mjs)$/i.test(url.pathname))
  /* ── 로고 글꼴(Dongle)도 안 잘리는 통에 둡니다 (b282) ──────────────
   * 워드마크 '기로'를 Dongle 로 씁니다. 글꼴 조각은 원래 타일과 같은 통에
   * 두었는데(부팅을 막지 않으므로), **로고는 다릅니다** — 400개가 차서
   * 밀려나면 어느 날 갑자기 상단바 글꼴만 바뀝니다. 앱 이름이 흔들리는 것은
   * 지도 타일 하나가 없는 것과 무게가 다릅니다.
   * `fonts.googleapis.com` 은 CSS, `fonts.gstatic.com` 은 실제 글꼴 파일입니다.
   * 둘 다 있어야 하므로 둘 다 담습니다. */
  || url.hostname === 'fonts.googleapis.com'
  || url.hostname === 'fonts.gstatic.com';

/* ── 이제 안 나가는 바깥 서버 ────────────────────────────────────────
 * b228 에서 supabase 를 우리 서버로 들여오면서 esm.sh 로는 한 번도 안 나갑니다.
 * 그런데 **이미 셸에 담긴 것은 아무도 안 지웁니다.** dropOldVersions 는
 * "같은 경로의 다른 판"만 보는데, 이건 경로째 사라진 것이라 짝이 될 새 판이
 * 영영 안 옵니다. 프로덕션 셸에 17건이 그대로 남아 있었습니다.
 * 여기 이름을 적어두면 다음 activate 때 치웁니다.
 * **쓰는 것을 적으면 안 됩니다** — unpkg(leaflet)는 지금도 씁니다. */
const GONE_HOSTS = ['esm.sh'];

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

    /* ── 옛 판이 타일 통에 담아둔 코드를 셸로 옮깁니다 ──
       전에는 leaflet·supabase 가 RUN 에 담겼습니다. 위 fetch 를 고쳐도
       **이미 담긴 것은 그대로 RUN 에 남아** 400개 제한에 밀려 쫓겨납니다.
       그러면 비행기모드에서 app.js 가 아예 실행되지 않습니다.
       **먼저 복사하고 나서 지웁니다** — 반대로 하면 도중에 멈췄을 때 없어집니다.
       한 번 옮기고 나면 다음부터는 할 일이 없습니다(RUN 에 코드가 안 담기므로). */
    try {
      const run = await caches.open(RUN), shell = await caches.open(SHELL);
      for (const req of await run.keys()){
        if (!isCodeUrl(new URL(req.url))) continue;
        if (await shell.match(req)){ await run.delete(req); continue; }
        const res = await run.match(req);
        if (!res) continue;
        await shell.put(req, res.clone());
        await run.delete(req);
      }
    } catch {}   /* 이사가 실패해도 앱은 돌아야 합니다 */

    /* 안 나가게 된 바깥 서버의 찌꺼기를 치웁니다(위 GONE_HOSTS).
       이사 **뒤에** 해야 합니다 — 이사가 RUN 에 있던 것을 셸로 옮겨오므로,
       먼저 치우면 옮겨온 것이 다시 남습니다. */
    try {
      const shell = await caches.open(SHELL);
      for (const req of await shell.keys())
        if (GONE_HOSTS.includes(new URL(req.url).hostname)) await shell.delete(req);
    } catch {}   /* 청소가 실패해도 앱은 돌아야 합니다 */

    await self.clients.claim();
  })());
});

/* 아무것도 못 돌려줄 때 마지막으로 내보내는 쪽지.
   빈 화면은 사용자가 할 수 있는 것이 아무것도 없습니다. */
function offlineNote(){
  return new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width,initial-scale=1"><title>기로</title>
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

/* ── 같은 파일의 옛 판을 치웁니다 ──────────────────────────────────────
 * 셸 캐시는 이름(t2-shell-v7)이 판마다 바뀌지 않습니다. 그래서 activate 의
 * "이름이 다른 캐시를 지운다"에 안 걸리고 **안이 계속 쌓였습니다.**
 * 실제로 재보니 app.css?v=b186 부터 b221 까지 스물세 판이 그대로 있었고
 * 셸에 77 건이 들어 있었습니다.
 *
 * b221 에서 파일을 여섯으로 쪼개면서 판마다 2 건 늘던 것이 7 건이 됐습니다.
 * app.js 하나가 450KB 라 판당 3.5MB 씩 불어납니다. 아이폰은 저장 공간이
 * 모자라면 앱 자료를 통째로 버리는데, 그러면 오프라인에서 안 열립니다.
 *
 * 셸 전체를 개수로 자르면(RUN 처럼) **지금 쓰는 파일을 버릴 수 있어 위험합니다.**
 * 대신 방금 담은 것과 **같은 경로에 꼬리표만 다른 것**만 지웁니다.
 * 새 판을 한 번 받으면 그 파일의 옛 판이 전부 정리됩니다. */
async function dropOldVersions(cache, req){
  const now = new URL(req.url);
  if (!now.searchParams.has('v')) return;      /* 꼬리표가 없으면 판이랄 게 없습니다 */
  for (const k of await cache.keys()){
    const old = new URL(k.url);
    if (old.pathname === now.pathname && old.search !== now.search) await cache.delete(k);
  }
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
        const c = await caches.open(SHELL);
        const hit = await c.match(req);
        if (hit) return hit;

        /* ⚠ **여기서 throw 하면 앱이 통째로 무너집니다.**
           전에는 `await fetch(req)` 였습니다. 새 판(b295)이 막 올라가서 아직
           아무것도 안 담겼는데 그 순간 통신이 한 번 끊기면, `respondWith` 가
           거절되고 브라우저는 그 파일을 **못 받은 것으로** 처리합니다.
           app.css 하나가 그렇게 되면 `.hide` 조차 안 먹어서 숨겨둔 화면이
           전부 한꺼번에 쏟아집니다. 실기기에서 그렇게 터졌습니다(b295).
           비행기모드가 아니라 **잠깐 끊긴 것만으로도** 납니다. */
        const res = await fetch(req).catch(() => null);
        /* 새것을 **담고 나서** 옛 판을 지웁니다. 순서가 중요합니다 —
           먼저 지우면 받아오다 실패했을 때 둘 다 없어집니다. */
        if (res && res.ok){
          await c.put(req, res.clone()); await dropOldVersions(c, req);
          return res;
        }

        /* 못 받았습니다. **옛 판이라도 줍니다.**
           맨 위에 "꼬리표를 무시하면 안 된다"고 적어둔 것과 어긋나 보이지만,
           그건 **받을 수 있을 때** 이야기입니다. 지금은 옛 판을 주거나
           아무것도 못 주거나 둘뿐이고, 옛 CSS 는 CSS 없는 것보다 낫습니다.
           옛 판이 남아 있는 것은 위에서 새것을 담은 뒤에야 옛것을 지우기
           때문입니다 — 이 경우엔 안 담겼으니 그대로 있습니다.
           ⚠ 새 화면에 옛 코드가 붙는 위험은 그대로입니다. 그래서 이건
             **마지막 수단**이고, 화면 쪽이 새 빌드를 알아채면 새로고침합니다. */
        const old = await c.match(req, { ignoreSearch:true });
        if (old) return old;
        return res || Response.error();
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
              /* 파일 이름을 나열하지 않습니다 — 모듈을 새로 만들 때마다 여기
                 더하는 것을 잊으면 그 파일만 빠진 채로 담깁니다.
                 ?v= 가 붙은 우리 파일은 전부 이 문서의 짝입니다. */
              const refs = [...html.matchAll(/(?:src|href)="([\w.-]+\.[a-z]+\?v=[^"]+)"/g)]
                .map(m => './' + m[1]);
              await Promise.all(refs.map(async u => {
                if (await c.match(u)) return;          // 이미 있으면 다시 안 받습니다
                try {
                  await c.add(u);
                  /* 담았으면 그 파일의 옛 판을 치웁니다. 여기를 빠뜨리면
                     문서가 미리 받아둔 것들만 계속 쌓입니다. */
                  await dropOldVersions(c, new Request(new URL(u, self.location.href).href));
                } catch {}
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

  /* ── 바깥 것 ── 캐시 먼저. 안 바뀌는 것들입니다.
     **다만 두 부류를 갈라야 합니다.**
     지도 타일·사진은 얼마든지 쌓이므로 400개로 자릅니다. 그런데 Leaflet 과
     supabase(esm.sh) 는 **없으면 app.js 가 아예 실행되지 않는 파일**입니다 —
     leaflet.js 는 head 에 defer 로 걸려 있고 supabase 는 app.js 가 정적
     import 합니다. 그것들을 타일과 같은 통에 두면 자를 때 같이 쫓겨납니다.
     게다가 적중해도 다시 담지 않으므로(아래) 순서가 갱신되지 않아
     **제일 먼저 나가는 것이 하필 그 둘입니다.** 지도를 좀 본 사용자면 닿습니다.
     그러면 비행기모드에서 셸이 멀쩡한데도 앱이 안 뜹니다.
     그래서 코드는 셸(안 자르는 통)에 둡니다. 글꼴 조각(.woff2)은 부팅을
     막지 않으므로 타일과 같이 둡니다.

     무엇이 '코드'인지는 맨 위 isCodeUrl 이 정합니다. */
  const isCode = isCodeUrl(url);

  e.respondWith((async () => {
    const c = await caches.open(isCode ? SHELL : RUN);
    const hit = await c.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      /* opaque(무응답) 도 담습니다 — 타일은 CORS 를 안 줍니다.
         대신 상태를 못 보므로 실패한 타일도 담길 수 있습니다. 용량만 막아둡니다. */
      if (res.status === 200 || res.type === 'opaque'){
        c.put(req, res.clone());
        if (!isCode) trim(c, TILECAP);     /* 셸은 자르지 않습니다 */
      }
      return res;
    } catch {
      return Response.error();
    }
  })());
});

/* ── 잠금화면 알림 ──────────────────────────────────────────────────
 * 여행 앱은 1년에 두 주 쓰입니다. 그 두 주에 **먼저 말을 걸 수 있는
 * 유일한 자리**가 여기입니다. 앱을 열어야 보이는 알림은 "지금 뭐 할
 * 시간인가"를 알려줄 수가 없습니다 — 그걸 알려고 앱을 여는 것이니까요.
 *
 * 보내는 쪽(Edge Function)이 JSON 을 실어 보냅니다.
 * **못 읽어도 알림은 띄웁니다** — 빈 알림이라도 뜨는 편이,
 * 왔는데 아무 일도 안 일어나는 것보다 낫습니다. */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data?.text() || '' }; }
  e.waitUntil(self.registration.showNotification(d.title || '기로', {
    body: d.body || '',
    icon: './icons/keyro-180.png',
    badge: './icons/keyro-180.png',
    /* 같은 일정에 대한 알림이 두 번 오면 **덮어씁니다**. 폰과 노트북이
       따로 받는 것은 맞지만 한 기기에 두 장이 쌓이면 안 됩니다. */
    tag: d.tag || 't2',
    data: { url: d.url || './' },
  }));
});

/* 알림을 누르면 **이미 열려 있는 창을 앞으로 가져옵니다.** 새로 열면
 * 앱이 두 개가 되고, 홈 화면 앱에서는 하던 것이 날아갑니다. */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || './';
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
    for (const c of list){
      if (c.url.includes(self.registration.scope)){
        await c.focus();
        /* **앞으로 가져오기만 하면 무엇 때문에 울렸는지 다시 찾아야 합니다.**
           열려 있는 창에 어디로 가라고 일러줍니다. 새로 불러오지 않으므로
           보던 것이 안 날아갑니다. */
        c.postMessage({ t2:'open', url });
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
