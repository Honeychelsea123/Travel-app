/* 진짜 브라우저에서 앱을 띄우고 자체 점검을 돌립니다.
 *
 * 왜 필요한가:
 *   자체 점검이 열한 개나 있는데(`__rateCheck` · `__mapCheck` · …)
 *   전부 **콘솔에서 손으로 불러야** 돌았습니다. 그래서 기억나는 것만
 *   검사했고, 안 부른 것은 몇 판이 지나도록 깨진 채였습니다.
 *   여기서 자동으로 돌립니다.
 *
 * 제일 중요한 검사는 맨 아래 `#sub` 입니다:
 *   app.js 가 파싱이나 실행에 실패하면 화면이 '불러오는 중…' 에서 멈춥니다.
 *   그 글자가 그대로면 **앱이 죽은 것**입니다. b311 에서 실제로 그렇게
 *   배포됐고 사용자가 알려줄 때까지 몰랐습니다.
 *   자체 점검이 다 통과해도 이것 하나가 실패하면 배포하면 안 됩니다.
 *
 * 로그인은 안 합니다. 점검들은 대부분 **지어낸 자료**로 도는 순수 계산이라
 * 로그아웃 상태로 충분합니다 — 그러라고 그렇게 만들어져 있습니다.
 * 로그인이 필요한 것(남들 평균·여행 목록)은 여기서 안 봅니다. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
               '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png',
               '.jpg':'image/jpeg', '.webmanifest':'application/manifest+json' };

/* 아주 작은 정적 서버. **`?v=b319` 를 떼고 찾습니다** — 브라우저는 그것까지
   붙여서 부르는데 파일 이름에는 없습니다. */
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/' || p.endsWith('/')) p += 'index.html';
    const file = join(process.cwd(), normalize(p).split('..').join(''));
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('no'); }
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage();

/* 콘솔 오류를 모읍니다. 점검이 통과해도 오류가 쏟아지면 뭔가 잘못된 것입니다. */
const 오류 = [];
page.on('pageerror', e => 오류.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') 오류.push('console: ' + m.text()); });

await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
/* 부팅에 시간이 걸립니다(도시 목록·글꼴). 넉넉히 기다립니다. */
await page.waitForTimeout(6000);

const 결과 = await page.evaluate(async () => {
  const out = [];
  const 이름 = Object.keys(window).filter(k => /^__.*Check$/.test(k));
  for (const n of 이름){
    try {
      const r = await window[n]();
      let 틀림 = 0, 자세히 = '';
      if (Array.isArray(r)){
        const bad = r.filter(x => x && x.결과 && x.결과 !== '✓');
        틀림 = bad.length; 자세히 = bad.map(x => x.항목).join(' / ');
      } else if (r && typeof r === 'object'){
        틀림 = r.틀림 ?? r.위반 ?? 0;
        자세히 = (r.항목 || []).map(x => x.규칙 || x.항목 || '').join(' / ');
      }
      out.push({ 이름: n, 틀림, 자세히 });
    } catch (e){ out.push({ 이름: n, 틀림: -1, 자세히: '터짐: ' + e.message }); }
  }
  return { 점검: out, sub: document.getElementById('sub')?.textContent || '',
           부팅: !!window.__t2booted };
});

await browser.close();
server.close();

console.log('\n── 자체 점검 ──');
let 실패 = 0;
for (const c of 결과.점검){
  /* ⚠ `__designCheck` 는 **보고 그대로 두기로 한 것**이 둘 있습니다
     (첫 화면 큰 글씨 · 이용약관 링크 높이 — 2026-08-11 사용자 결정).
     이걸 실패로 세면 CI 가 늘 빨간색이 되고, 늘 빨간 CI 는 아무도 안 봅니다.
     숫자만 적어두고 넘어갑니다 — 늘어나면 눈에 띕니다. */
  const 봐줌 = c.이름 === '__designCheck';
  const 표 = c.틀림 === 0 ? '✓' : (봐줌 ? '△' : '✗');
  console.log(`  ${표} ${c.이름}  ${c.틀림 ? c.틀림 + '건  ' + c.자세히 : ''}`);
  if (c.틀림 !== 0 && !봐줌) 실패++;
}

console.log('\n── 앱이 살아 있는가 ──');
/* index.html 의 처음 글자입니다. 그대로면 render() 가 한 번도 안 돌았다는 뜻. */
const 죽음 = !결과.부팅 || /불러오는 중/.test(결과.sub);
console.log(`  ${죽음 ? '✗' : '✓'} 부팅=${결과.부팅} · sub="${결과.sub}"`);
if (죽음) 실패++;

if (오류.length){
  console.log('\n── 콘솔 오류 ──');
  for (const e of 오류.slice(0, 10)) console.log('  ' + e);
  /* 오류는 세지만 실패로 안 칩니다 — 연결이 없는 CI 에서는 Supabase 호출이
     당연히 실패합니다. 사람이 보라고 찍어둡니다. */
}

console.log(실패 ? `\n${실패}건 실패` : '\n다 통과');
process.exit(실패 ? 1 : 0);
