/* 떼어낸 모듈이 **없는 이름을 쓰고 있지 않은지** 봅니다.
 *
 * 왜 따로 필요한가:
 *   `shelfKind is not defined` · `avgTail is not defined` — app.js 를 쪼개면서
 *   두 번 같은 사고가 났습니다. 문법은 멀쩡하니 check-syntax 가 못 잡고,
 *   그 줄은 **로그인해서 그 화면을 열어야** 도니까 check-app 도 못 잡습니다.
 *   실기기에서 눌러보고서야 알았습니다.
 *
 * 어떻게:
 *   파일에서 쓰는 이름을 모으고, 그 파일이 스스로 정의했거나 import 한 것과
 *   표준 전역을 뺍니다. 남는 것이 있으면 알려줍니다.
 *   **완벽하지 않습니다** — 대충 세는 것이라 놓치기도 하고 헛짚기도 합니다.
 *   그래도 "app.js 에만 있던 이름을 그대로 들고 나왔다" 는 딱 잡힙니다.
 *   그게 쪼개기에서 나는 사고의 전부였습니다. */
import { readFileSync } from 'node:fs';

const 볼것 = ['persona.js', 'map.js', 'shelf.js', 'city.js', 'aiui.js'];

/* 브라우저·표준이 주는 것들. 여기 없는 것이 나오면 알려주고, 진짜 표준이면
   여기 더하십시오 — 목록을 늘리는 것이 못 본 척하는 것보다 낫습니다. */
const 표준 = new Set(`Math JSON Date Promise Object Array String Number Boolean Symbol
document window location console navigator screen performance history
setTimeout clearTimeout setInterval clearInterval requestAnimationFrame
fetch URL URLSearchParams Image File FileReader Blob FormData Set Map WeakMap Intl
localStorage sessionStorage crypto AbortSignal AbortController Response Request Headers
Event CustomEvent Element HTMLElement Node NodeList DOMParser XMLSerializer
encodeURIComponent decodeURIComponent atob btoa isNaN parseInt parseFloat structuredClone
Infinity NaN undefined globalThis createImageBitmap getComputedStyle matchMedia
alert confirm prompt`.split(/\s+/).filter(Boolean));

const 예약 = new Set(`await async function const let var return if else for of in new typeof
null true false this catch try throw finally class extends export import from default
case switch break continue do while delete void instanceof yield get set static super
arguments eval of as`.split(/\s+/).filter(Boolean));

let 틀림 = 0;
for (const f of 볼것){
  const src = readFileSync(f, 'utf8');
  /* 주석과 글자열을 걷어냅니다 — 거기 적힌 이름은 코드가 아닙니다. */
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/`(?:\.|[^`\])*`/g, ' ')
    .replace(/'(?:\.|[^'\])*'/g, ' ')
    .replace(/"(?:\.|[^"\])*"/g, ' ');

  const 정의 = new Set();
  for (const m of code.matchAll(/\b(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) 정의.add(m[1]);
  for (const m of code.matchAll(/\bfunction\s*\(([^)]*)\)/g))
    for (const p of m[1].split(',')) { const n = p.trim().split(/[=:\s]/)[0]; if (n) 정의.add(n); }
  /* 화살표·구조분해·for 문의 이름까지 다 세지는 못합니다. 그래서 아래에서
     '점 뒤' 와 '속성 이름' 을 빼고, 남는 것만 봅니다. */
  for (const m of code.matchAll(/(?:\(|,)\s*([A-Za-z_$][\w$]*)\s*(?:=[^,)]*)?\s*(?=[,)])/g)) 정의.add(m[1]);
  for (const m of code.matchAll(/\b(?:for)\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) 정의.add(m[1]);
  for (const m of code.matchAll(/\{([^{}]*)\}\s*=/g))
    for (const p of m[1].split(',')) { const n = p.trim().split(/[=:\s]/)[0]; if (n) 정의.add(n); }
  for (const m of code.matchAll(/\bimport\s*\{([^}]*)\}/g))
    for (const p of m[1].split(',')) { const n = p.trim().split(/\s+as\s+/).pop().trim(); if (n) 정의.add(n); }
  for (const m of code.matchAll(/\bcatch\s*\(\s*([A-Za-z_$][\w$]*)/g)) 정의.add(m[1]);

  /* 점 뒤에 오는 것(속성)과 `이름:` (객체 열쇠)은 변수가 아닙니다. */
  const 쓰임 = new Set();
  const 지운점 = code.replace(/\.\s*[A-Za-z_$][\w$]*/g, ' ')
                     .replace(/([A-Za-z_$][\w$]*)\s*:/g, ' ');
  for (const m of 지운점.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) 쓰임.add(m[1]);

  const 없는것 = [...쓰임].filter(n =>
    !정의.has(n) && !표준.has(n) && !예약.has(n) && n !== '$' && !/^[A-Z_0-9]+$/.test(n));

  if (없는것.length){
    틀림 += 없는것.length;
    console.error('  X   ' + f + ' — 못 찾는 이름: ' + 없는것.join(' '));
    console.log('::error file=' + f + '::못 찾는 이름: ' + 없는것.join(' '));
  } else console.log('  ok  ' + f);
}
console.log('\n' + 볼것.length + '개 모듈, 못 찾는 이름 ' + 틀림 + '개');
process.exit(틀림 ? 1 : 0);
