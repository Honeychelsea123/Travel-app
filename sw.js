/* 기로가 https://keyrotrip.github.io/ 로 옮겼습니다(2026-10-01).
 * 예전 주소에 깔린 서비스워커는 캐시에서 옛 앱을 계속 꺼내 줍니다 — 그러면 넘겨 주는 index.html 이 영영 안 보입니다.
 * 이 파일이 그 자리를 이어받아 **기로 캐시(t2-…)만** 지우고 스스로 물러난 뒤, 열린 화면을 다시 불러 새 주소로 넘깁니다.
 * ⚠ 이 주소(honeychelsea123.github.io)는 도쿄 앱과 같은 곳이라 캐시 저장소를 같이 씁니다 — t2- 로 시작하는 것만 지웁니다. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('t2-')).map(k => caches.delete(k)));
    await self.registration.unregister();
    const cs = await self.clients.matchAll({ type: 'window' });
    for (const c of cs){ try { await c.navigate(c.url); } catch {} }
  })());
});
