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
