/* 문법 검사. **오늘 이걸 안 해서 앱이 통째로 죽은 채 배포됐습니다(b311).**
 *
 * 템플릿 문자열 안에 백틱 하나가 들어가서 app.js 가 파싱조차 안 됐는데,
 * 배포하고 사용자가 "불러오는 중만 뜬다"고 알려줄 때까지 아무도 몰랐습니다.
 * 사람이 눈으로 잡을 종류의 실수가 아닙니다 — 기계가 잡아야 합니다.
 *
 * 왜 파일을 .mjs 로 복사해서 검사하나:
 *   `node --check foo.js` 는 판에 따라 CommonJS 로 읽습니다. 그러면 `import`
 *   한 줄만 있어도 전부 실패합니다. `.mjs` 는 **어느 판에서도** 모듈로
 *   읽습니다. package.json 의 `type: module` 을 믿지 않고 확장자로 못 박습니다.
 *
 * 왜 묶는 도구(esbuild 등)를 안 쓰나:
 *   우리 import 는 `./db.js?v=b319` 입니다. 묶는 도구는 그 `?v=` 까지
 *   파일 이름으로 찾다가 실패합니다 — 브라우저만 아는 표기입니다.
 *   **의존성이 필요 없는 것이 이 검사의 값입니다.**
 *
 * ⚠ **결과를 `::error::` 로도 내보냅니다.** GitHub 의 실행 로그는 로그인해야
 *   보이는데, 그렇게 내보낸 것은 **주석**이 되어 로그인 없이 API 로 읽힙니다.
 *   원인을 보려고 매번 로그인해야 하는 검사는 결국 안 쓰이게 됩니다. */
import { readdirSync, copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const SKIP = new Set([
  'supabase.js',   /* 남이 만든 것을 우리 서버에 둔 사본. 우리가 안 고칩니다 */
  'world.js',      /* 좌표 덩어리 한 줄. 사람이 읽을 일이 없습니다 */
]);

const files = [
  ...readdirSync('.').filter(f => f.endsWith('.js') && !SKIP.has(f)),
  ...readdirSync('tools').filter(f => f.endsWith('.mjs')).map(f => join('tools', f)),
];

const tmp = mkdtempSync(join(tmpdir(), 'keyro-'));
let bad = 0;
for (const f of files){
  const t = join(tmp, f.replace(/[\/]/g, '_').replace(/\.(js|mjs)$/, '') + '.mjs');
  copyFileSync(f, t);
  try {
    execFileSync(process.execPath, ['--check', t], { stdio: 'pipe' });
    console.log('  ok  ' + f);
  } catch (e){
    bad++;
    const msg = String(e.stderr || e.message).split(t).join(f);
    console.error('  X   ' + f);
    console.error(msg.split('\n').slice(0, 8).map(l => '      ' + l).join('\n'));
    const line = (msg.match(/:(\d+)$/m) || [])[1] || '1';
    const one = (msg.split('\n').find(l => /Error/.test(l)) || '문법 오류').trim();
    console.log('::error file=' + f + ',line=' + line + '::' + one);
  }
}
rmSync(tmp, { recursive: true, force: true });
console.log('\n' + files.length + '개 중 ' + bad + '개 틀림');
process.exit(bad ? 1 : 0);
