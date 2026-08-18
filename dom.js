/* ── 화면 밑바탕 ───────────────────────────────────────────────────────
 * 아무것도 import 하지 않는 잎 모듈입니다. **여기에 import 를 더하지 마세요** —
 * 이 파일이 뭔가에 기대기 시작하면 net.js·admin.js 와 고리가 생겨 순환 참조가
 * 납니다. 지금은 net.js 가 toast 를 쓰고 admin.js 가 넷 다 쓰는데, 이쪽이
 * 아무에게도 안 기대므로 한 방향으로만 흐릅니다.
 *
 * 여기 들어올 자격: 앱 상태(trip·plans·me…)를 모르고, 브라우저만 있으면
 * 되는 것. 그 조건을 못 지키면 여기가 아니라 쓰는 쪽에 두세요.
 */

/* 이 앱의 유일한 요소 접근자입니다. querySelector 를 직접 쓰는 자리가
   몇 군데 있지만 id 로 찾는 것은 전부 이걸 지납니다. */
export const $ = id => document.getElementById(id);

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* 잠깐 떴다 사라지는 알림. #toast 가 없으면 그 자리에서 만듭니다 —
   index.html 에 미리 둘 필요가 없고, 안 쓰는 화면에서는 아예 안 생깁니다. */
let toastT = null;
export function toast(msg){
  let t = $('toast');
  if (!t){ t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), 3200);
}

/* 클립보드는 창이 포커스를 잃었거나 권한이 없으면 그냥 거절합니다.
   그래서 옛 방식(execCommand)으로 한 번 더 해봅니다. 둘 다 실패하면 false. */
export async function copyText(t){
  try { await navigator.clipboard.writeText(t); return true; } catch {}
  try {
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed; top:0; left:0; opacity:0';
    document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0, t.length);
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
}

/* ── 마크다운 조금 ────────────────────────────────────────────────────
 * AI 는 마크다운으로 씁니다. 그대로 찍으면 별표가 글자로 보입니다.
 * 반드시 먼저 이스케이프하고 나서 태그로 바꿉니다 — 순서를 바꾸면
 * AI 가 돌려준 글이 그대로 HTML 이 됩니다.
 *
 * **app.js 에 있던 것을 여기로 내렸습니다(b335).** report.js 가 답변을
 * 그리면서 이것을 쓰는데 import 가 없었습니다. 문자열 안에서 불려서
 * 검사도 브라우저도 그 화면을 열기 전까지 아무 말이 없었습니다. */
export function md(s){
  return esc(s)
    .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
    .replace(/^\s*[*-]\s+/gm, '· ')
    .replace(/^\s*(#{1,4})\s+(.+)$/gm, '<b>$2</b>')
    .replace(/\n/g, '<br>');
}

/* ── 기본 프로필 그림 ────────────────────────────────────────────────
 * 구글에서 사진을 안 받기로 했으니(041) 새로 가입하면 그림이 아예 없습니다.
 * src 가 빈 <img> 는 흰 네모나 깨진 아이콘으로 보입니다 — 실제로 그랬습니다.
 *
 * 이름 첫 글자를 그려 채웁니다. **글자로 만드는 것이라 저장소도 네트워크도
 * 안 씁니다** — 비행기모드에서도 나오고 사진 값도 안 듭니다.
 * 색은 계정 id 에서 뽑으므로 기기를 바꿔도 같은 사람은 같은 색입니다.
 *
 * **app.js 에 있던 것을 여기로 내렸습니다(b335)** — city.js 가 남들 한줄평에
 * 얼굴을 다는데 import 가 없었습니다. 여기 있을 자격이 됩니다: 앱 상태를
 * 모르고 esc 하나만 씁니다. */
const AV_BG = ['#4a7ebb', '#5a9367', '#b4794a', '#8a6bb1',
               '#c06a6a', '#3f8f93', '#a1783f', '#6b7fa8'];
export function avatarOf(seed, label){
  const s = String(seed || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  /* 이모지는 서로게이트 쌍이라 [0] 으로 자르면 반쪽만 남아 깨집니다.
     영문은 대문자로 올립니다 — 한글·이모지는 대소문자가 없어 그대로입니다. */
  const ch = ([...String(label || '').trim()][0] || '·').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">`
    + `<rect width="64" height="64" rx="32" fill="${AV_BG[h % AV_BG.length]}"/>`
    + `<text x="32" y="34" fill="#fff" font-size="30" font-weight="600"`
    + ` text-anchor="middle" dominant-baseline="central"`
    + ` font-family="-apple-system,'Apple SD Gothic Neo',sans-serif">${esc(ch)}</text></svg>`;
  /* encodeURIComponent 가 따옴표까지 인코딩해서 그대로 속성에 넣어도 안전합니다. */
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
/* 올려둔 사진의 주소가 깨졌을 때 숨기면 흰 구멍이 남습니다. 기본 그림으로 되돌립니다. */
export function avatarImg(url, seed, label, style, cls){
  const fb = avatarOf(seed, label);
  return `<img ${cls ? `class="${cls}" ` : ''}src="${esc(url || fb)}" alt="" data-fb="${fb}"
    onerror="this.onerror=null;this.src=this.dataset.fb"${style ? ` style="${style}"` : ''}>`;
}

/* ── 빈 화면 ──────────────────────────────────────────────────────────
 * "아직 지출이 없어요." 한 줄만 두면 처음 온 사람은 여기서 멈춥니다.
 * 추가 단추는 카드 오른쪽 위에 작게 있어서 눈이 안 갑니다.
 * **빈 화면은 앱이 처음 쓰는 사람을 가르칠 유일한 기회입니다.**
 * 무엇을 하면 되는지 그 자리에 큼직하게 둡니다.
 *
 * **app.js 에 있던 것을 여기로 내렸습니다(b335)** — 지출을 떼어내니
 * 이것 하나 때문에 ctx 가 한 줄 늘어나게 생겼습니다. esc 밖에 안 쓰므로
 * 여기 있을 자격이 됩니다. 다음에 떼는 화면들도 다 이걸 씁니다. */
export function emptyDo(text, label, btnId){
  return `<div class="empty emptydo">
    <div class="t">${esc(text)}</div>
    ${btnId ? `<button class="primary" data-go="${esc(btnId)}">${esc(label)}</button>` : ''}
  </div>`;
}
/* 빈 화면의 단추는 원래 있던 단추를 대신 눌러줍니다 — 여는 방법을 두 벌로
   만들면 한쪽만 고치는 날이 옵니다. **위 함수와 붙여 둡니다**: 떨어뜨리면
   단추만 옮기고 손잡이를 두고 가는 날이 옵니다. */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-go]');
  if (b) $(b.dataset.go)?.click();
});
