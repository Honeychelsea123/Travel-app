/* 문법 검사. **오늘 이걸 안 해서 앱이 통째로 죽은 채 배포됐습니다(b311).**
 *
 * 템플릿 문자열 안에 백틱 하나가 들어가서 app.js 가 파싱조차 안 됐는데,
 * 배포하고 사용자가 "불러오는 중만 뜬다"고 알려줄 때까지 아무도 몰랐습니다.
 * 사람이 눈으로 잡을 종류의 실수가 아닙니다 — 기계가 잡아야 합니다.
 *
 * 왜 파일을 .mjs 로 복사해서 검사하나:
 *   `node --check foo.js` 는 판에 따라 CommonJS 로 읽습니다. 그러면 `import`
 *   한 줄만 있어도 전부 실패합니다 — 처음 올렸을 때 실제로 그렇게 됐습니다.
 *   `.mjs` 는 **어느 판에서도** 모듈로 읽습니다. package.json 의
 *   `type: module` 을 믿지 않고 확장자로 못 박습니다.
 *
 * 왜 묶는 도구(esbuild 등)를 안 쓰나:
 *   우리 import 는 `./db.js?v=b319` 입니다. 묶는 도구는 그 `?v=` 까지
 *   파일 이름으로 찾다가 실패합니다 — 브라우저만 아는 표기입니다.
 *   **의존성이 필요 없는 것이 이 검사의 값입니다.** 설치가 필요하면
 *   언젠가 안 돌게 됩니다.
 *
 * 여기서 못 잡는 것: 없는 변수, 오타 난 함수 이름, 잘못된 로직.
 * 그건 tools/check-app.mjs 가 진짜 브라우저에서 앱을 띄워서 봅니다. */
import { readdirSync, copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const 건너뜀 = new Set([
  'supabase.js',   /* 남이 만든 것을 우리 서버에 둔 사본. 우리가 안 고칩니다 */
  'world.js',      /* 좌표 덩어리 한 줄. 사람이 읽을 일이 없습니다 */
]);

const 파일 = [
  ...readdirSync('.').filter(f => f.endsWith('.js') && !건너뜀.has(f)),
  ...readdirSync('tools').filter(f => f.endsWith('.mjs')).map(f => join('tools', f)),
];

const tmp = mkdtempSync(join(tmpdir(), 'keyro-'));
let 틀림 = 0;
for (const f of 파일){
  const 임시 = join(tmp, f.replace(/[\/]/g, '_').replace(/\.(js|mjs)$/, '') + '.mjs');
  copyFileSync(f, 임시);
  try {
    execFileSync(process.execPath, ['--check', 임시], { stdio: 'pipe' });
    console.log('  ✓ ' + f);
  } catch (e){
    틀림++;
    console.error('  ✗ ' + f);
    /* 임시 이름이 찍히면 어느 파일인지 헷갈립니다. 진짜 이름으로 바꿔 보여줍니다. */
    console.error(String(e.stderr || e.message).split('\n').slice(0, 8)
      .map(l => '      ' + l.split(임시).join(f)).join('\n'));
  }
}
rmSync(tmp, { recursive: true, force: true });
console.log(`\n${파일.length}개 중 ${틀림}개 틀림`);
process.exit(틀림 ? 1 : 0);
