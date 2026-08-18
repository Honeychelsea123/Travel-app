/* 떼어낸 모듈이 **app.js 에만 있는 이름을 그대로 들고 나왔는지** 봅니다.
 *
 * 왜 이것만 보나:
 *   app.js 를 쪼개면서 같은 사고가 네 번 났습니다 —
 *   shelfKind · avgTail · cityOpen · localTime. 전부 모양이 같습니다.
 *   문법은 멀쩡하니 check-syntax 가 못 잡고, 그 줄은 로그인해서 그 화면을
 *   열어야 도니까 check-app 도 못 잡습니다. 실기기에서 눌러보고서야 알았습니다.
 *
 * ⚠ **처음에는 '못 찾는 이름 전부' 를 알려주게 만들었다가 물렸습니다.**
 *   글자열 안의 HTML(div·span·style)과 표준 이름(Error·addEventListener)이
 *   섞여 한 파일에 열 몇 개씩 나왔습니다. 그중 진짜는 하나도 없었습니다.
 *   **잡음 많은 검사는 안 보게 되고, 안 보는 검사는 없는 검사입니다.**
 *   그래서 딱 하나만 봅니다: 그 이름이 app.js 에 선언돼 있는가.
 *   실제로 났던 사고가 그것뿐이었고, 헛짚을 자리가 없습니다.
 *
 * 여기서 못 잡는 것: 오타 난 이름, 다른 모듈에서 와야 하는데 아무 데도 없는 것.
 * 그건 브라우저가 그 줄을 실제로 돌릴 때 납니다. */
import { readFileSync, readdirSync } from 'node:fs';

/* app.js 에서 떼어낸 것들. 새 조각을 만들면 여기 더하십시오 —
   안 더하면 그 파일은 아무도 안 봅니다. */
const 볼것 = readdirSync('.').filter(f =>
  ['persona.js', 'map.js', 'shelf.js', 'city.js', 'aiui.js'].includes(f));

const 벗기기 = s => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\/\/[^\n]*/g, ' ')
  /* 글자열은 통째로 지웁니다. 안에 적힌 이름은 코드가 아닙니다.
     이스케이프까지 따지지 않습니다 — 이름을 세는 데는 이 정도면 됩니다. */
  .replace(/`[^`]*`/g, ' ')
  .replace(/'[^']*'/g, ' ')
  .replace(/"[^"]*"/g, ' ');

/* app.js 가 스스로 선언한 이름들. 이것을 모듈이 맨몸으로 쓰고 있으면
   떼어낼 때 들고 나온 것입니다. */
const appCode = 벗기기(readFileSync('app.js', 'utf8'));
const appOnly = new Set();
for (const m of appCode.matchAll(/^(?:async[ ]+)?function[ ]+([A-Za-z_$][A-Za-z0-9_$]*)/gm)) appOnly.add(m[1]);
for (const m of appCode.matchAll(/^(?:const|let|var)[ ]+([A-Za-z_$][A-Za-z0-9_$]*)/gm)) appOnly.add(m[1]);
/* `let a = 1, b = 2;` 처럼 한 줄에 여럿 적은 것도 셉니다. */
for (const m of appCode.matchAll(/^(?:const|let|var)[ ]+([^;=]+)=/gm))
  for (const p of m[1].split(',')) { const n = p.trim(); if (/^[A-Za-z_$][\w$]*$/.test(n)) appOnly.add(n); }
/* app.js 가 남에게서 가져온 것은 app.js 것이 아닙니다 — 모듈도 똑같이
   가져다 쓰면 되므로 여기서 빼야 헛짚지 않습니다. */
for (const m of appCode.matchAll(/\bimport\s*\{([^}]*)\}/g))
  for (const p of m[1].split(',')) appOnly.delete(p.trim().split(/\s+as\s+/).pop().trim());

let 틀림 = 0;
for (const f of 볼것){
  const code = 벗기기(readFileSync(f, 'utf8'));
  const 있음 = new Set();
  for (const m of code.matchAll(/\b(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) 있음.add(m[1]);
  for (const m of code.matchAll(/\bimport\s*\{([^}]*)\}/g))
    for (const p of m[1].split(',')) 있음.add(p.trim().split(/\s+as\s+/).pop().trim());

  /* 점 뒤(속성)와 `이름:`(객체 열쇠)은 변수가 아닙니다. */
  const 평평 = code.replace(/\.\s*[A-Za-z_$][\w$]*/g, ' ')
                   .replace(/([A-Za-z_$][\w$]*)\s*:/g, ' ');
  const 들고나온것 = new Set();
  for (const m of 평평.matchAll(/\b([A-Za-z_$][\w$]*)\b/g))
    if (appOnly.has(m[1]) && !있음.has(m[1])) 들고나온것.add(m[1]);

  if (들고나온것.size){
    틀림 += 들고나온것.size;
    const 목록 = [...들고나온것].join(' ');
    console.error('  X   ' + f + ' — app.js 것을 그대로 씀: ' + 목록);
    console.log('::error file=' + f + '::app.js 것을 그대로 씁니다: ' + 목록 +
                ' (ctx 로 받거나, 쓰는 쪽으로 옮기거나, 아래층으로 내리십시오)');
  } else console.log('  ok  ' + f);
}
console.log('\n' + 볼것.length + '개 모듈, 들고 나온 이름 ' + 틀림 + '개');
process.exit(틀림 ? 1 : 0);
