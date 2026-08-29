/* ── 체크 카드로 들어온 사람 — 로그인 없이 자기 카드까지 ────────────────
 * **b485~b487 에서 만든 체크 카드가 막다른 길이었습니다(b488).**
 *
 * 카드를 인스타에 올리면 본 사람이 할 수 있는 것이 없었습니다. 그림에
 * 적힌 주소로 와도 도착하는 곳은 그냥 로그인 화면이고, 맛보기 평가는
 * **다른 약속**(도시 5곳 매기면 성향)을 합니다. 「유럽 24곳 중 몇 곳
 * 가봤어?」를 보고 온 사람이 원한 것은 성향이 아니라 **자기 24칸**입니다.
 * 약속이 바뀌면 사람은 나갑니다.
 *
 *     지금:  카드 봄 → 앱 열림 → 「도시 5곳 매겨보세요」 → ???
 *     여기:  카드 봄 → 앱 열림 → **내 24칸** → 내 카드 → 공유 · 로그인
 *
 * ⚠ **링크에는 대륙 두 글자만 담습니다**(`?check=eu`). 궁합 링크와 같은
 *   규칙입니다([[keyro-lockin-plan]] 4번) — 서버가 필요 없고, 로그인
 *   전에도 오프라인에서도 돌고, **남의 기록을 링크에 실어 보내지
 *   않습니다.** 보낸 사람의 결과는 그림 안에 이미 있습니다.
 *
 * ⚠ **양쪽이 반드시 같은 24곳을 봐야 합니다.** 보낸 사람은 `12/24`,
 *   받은 사람은 다른 24곳이면 카드끼리 비교가 안 됩니다. `checkList` 는
 *   `fame` → `pop_rank` 순이라 같은 자료에서는 늘 같은 답이 나오고,
 *   집 나라도 양쪽 다 기본값(KR)을 씁니다 — anal.js 도 `world.home` 을
 *   안 넘깁니다. **한쪽만 넘기기 시작하면 그때 어긋납니다.**
 *
 * ⚠⚠ **체크한 곳을 별점 줄로 저장하면 안 됩니다.** ⚠⚠
 *   이 앱에서 **별점 없는 줄은 「안 가봤어요」** 입니다(b407 에서 갈라
 *   놓은 것). 체크는 「다녀왔다, 별점은 모름」이라 그 줄로 쓰면 다녀온
 *   곳이 안 가본 곳으로 기록되고 **다시는 안 물어봅니다.** 정반대입니다.
 *   그래서 체크는 여기 담아만 두고, 로그인하면 **쭉 매기기의 앞줄**로
 *   넘깁니다(app.js) — 그제야 별점이 되어 제대로 남습니다.
 *
 * 층: dom.js · cities.js · citysearch.js · card.js. */
import { $, esc, toast } from './dom.js?v=b500';
import { cities, continentOf } from './cities.js?v=b500';
import { loadCities } from './citysearch.js?v=b500';
import { checkList, cardImage, shareCard, appUrl } from './card.js?v=b500';

/* 맛보기 평가와 **다른 자리**에 담습니다(try.js 는 `t2:try`). 섞이면
   체크가 별점으로 옮겨가 위 ⚠⚠ 가 그대로 벌어집니다. */
const KEY = 't2:check';
const 대륙이름 = { eu:'유럽', as:'아시아' };
const 대륙코드 = { 유럽:'eu', 아시아:'as' };

/* 링크로 들어왔나. app.js 가 로그인 화면을 그릴 때 봅니다. */
export const checkParam = () =>
  대륙이름[new URLSearchParams(location.search).get('check')] || null;

/* 공유에 실을 주소. 그림에 적히는 주소와 달리 **대륙이 붙습니다.** */
export const checkUrl = 대륙 =>
  appUrl() + '?check=' + (대륙코드[대륙] || 'eu');

const 읽기 = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
                     catch { return {}; } };
const 쓰기 = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch {} };

/* 로그인한 뒤 app.js 가 가져다 쭉 매기기 앞줄에 넣습니다. */
export const checkPicked = () => { const o = 읽기(); return Array.isArray(o.ids) ? o.ids : []; };
export const clearChecks = () => { try { localStorage.removeItem(KEY); } catch {} };

let 대륙 = null, 목록 = [];
const 고른것 = () => new Set(checkPicked());

/* ── 화면 ──────────────────────────────────────────────────────────── */
export async function drawCheckLanding(){
  대륙 = checkParam();
  const box = $('checkbox');
  if (!대륙 || !box) return false;

  box.classList.remove('hide');
  box.innerHTML = `<div class="card"><div class="empty">
    <span class="load">${esc(대륙)} 목록을 불러오는 중…</span></div></div>`;

  await loadCities();
  목록 = checkList(cities, 대륙, { continentOf });
  /* ⚠ 자료가 안 왔으면 **조용히 사라집니다.** 빈 칸 스물넷을 보여주느니
     맛보기 평가가 그대로 뜨는 편이 낫습니다(app.js 가 되돌립니다). */
  if (목록.length < 12){ box.classList.add('hide'); 대륙 = null; return false; }

  그리기();
  return true;
}

function 그리기(){
  const box = $('checkbox');
  const 고름 = 고른것();
  const n = 목록.filter(c => 고름.has(c.id)).length;

  box.innerHTML = `<div class="card">
    <h2>${esc(대륙)}에서 가본 곳</h2>
    <div class="memo" style="margin:-2px 0 12px">
      다녀온 곳을 눌러주세요. 로그인 없이 <b>내 카드</b>가 나와요.</div>
    <div class="ckgrid">${목록.map(c => `
      <button class="ckc${고름.has(c.id) ? ' on' : ''}" data-id="${esc(c.id)}"
        aria-pressed="${고름.has(c.id)}">${esc(c.name)}</button>`).join('')}</div>
    <div class="ckfoot">
      <span class="ckn"><b id="cknum">${n}</b> / ${목록.length}</span>
      <button class="primary" id="ckmake"${n ? '' : ' disabled'}>내 카드 만들기</button>
    </div>
  </div>`;
}

/* ── 카드 ────────────────────────────────────────────────────────────
 * **분석 탭에서 만드는 것과 같은 그림입니다**(anal.js 의 체크 카드).
 * `kind:'check'` 하나로 card.js 가 그립니다 — 여기서 따로 그리면 두 벌이
 * 되고, 보낸 사람 카드와 받은 사람 카드의 생김새가 갈립니다. */
function 카드사양(){
  const 고름 = 고른것();
  return { kind:'check', title:대륙, sub:'가볼 만한 곳',
           items: 목록.map(c => ({ name:c.name, on: 고름.has(c.id) })),
           /* 공유할 때 이 주소가 나갑니다 — 받은 사람도 **같은 칸**으로
              떨어집니다. 이게 없으면 고리가 여기서 또 끊깁니다. */
           shareUrl: checkUrl(대륙) };
}

async function 카드보이기(){
  const box = $('checkbox');
  const 고름 = 고른것();
  const n = 목록.filter(c => 고름.has(c.id)).length;

  box.innerHTML = `<div class="pcardwrap" id="ckcard">
      <div class="empty"><span class="load">그리는 중…</span></div></div>
    <div class="card" style="margin-top:var(--s-sm)">
      <div class="empty" style="text-align:left; padding:6px 0 2px">
        ${esc(대륙)} <b>${목록.length}곳 중 ${n}곳</b>
        <div class="memo" style="margin-top:4px">
          로그인하면 이 <b>${n}곳부터 별점을 매깁니다.</b>
          별점이 쌓이면 여행 성향과 어울리는 도시가 나와요.</div>
      </div>
      <div class="ckfoot" style="margin-top:10px">
        <button class="ghost" id="ckback">다시 고르기</button>
        <button class="primary" id="ckshare">공유하기</button>
      </div>
    </div>`;

  /* 그림이 안 그려져도 위 글은 남습니다 — 캔버스가 막힌 기기에서도 뜻이 통합니다. */
  try {
    const { blob } = await cardImage(카드사양(), 'portrait');
    const el = $('ckcard');
    if (el) el.innerHTML = `<img src="${URL.createObjectURL(blob)}" alt="${esc(대륙)} 체크 카드">`;
  } catch { $('ckcard')?.classList.add('hide'); }
}

/* ── 누르기 ──────────────────────────────────────────────────────────
 * `#checkbox` 하나에만 답니다. 안쪽은 매번 갈아끼우므로 칸마다 달면
 * 새로 붙여야 합니다(try.js·홈과 같은 수법). */
$('checkbox')?.addEventListener('click', async e => {
  const 칸 = e.target.closest('.ckc');
  if (칸){
    const id = 칸.dataset.id;
    const o = 읽기(); const ids = Array.isArray(o.ids) ? o.ids : [];
    const i = ids.indexOf(id);
    if (i < 0) ids.push(id); else ids.splice(i, 1);
    /* ── 대륙을 안 적습니다 ──────────────────────────────────────────
     * 처음에는 `{c:'as', ids}` 로 적었는데 **그 값이 거짓말이 됐습니다.**
     * 유럽 링크로 와서 넷을 고른 사람이 나중에 아시아 링크로 오면 한
     * 통에 여섯이 쌓이는데, `c` 에는 마지막 것만 남습니다.
     * ⚠ **섞이는 것 자체는 맞습니다.** 둘 다 「다녀왔다」고 고른 곳이고,
     *   로그인하면 다 매겨야 합니다. 화면에 보이는 숫자는 그때그때
     *   `목록` 으로 걸러 세므로(아래) 대륙이 섞여도 안 틀립니다.
     *   틀린 것은 아무도 안 읽는데 거짓만 말하는 `c` 하나였습니다. */
    쓰기({ ids });
    /* ⚠ **다시 안 그립니다.** 스물네 칸을 통째로 갈아끼우면 누를 때마다
       화면이 깜빡이고, 누른 자리가 손가락 밑에서 사라집니다.
       바뀐 칸과 숫자만 고칩니다. */
    칸.classList.toggle('on', i < 0);
    칸.setAttribute('aria-pressed', i < 0);
    const 고름 = 고른것();
    const n = 목록.filter(c => 고름.has(c.id)).length;
    const 수 = $('cknum'); if (수) 수.textContent = n;
    const 만들 = $('ckmake'); if (만들) 만들.disabled = !n;
    return;
  }
  if (e.target.closest('#ckmake')) return 카드보이기();
  if (e.target.closest('#ckback'))  return 그리기();
  if (e.target.closest('#ckshare')){
    try { await shareCard(카드사양(), `기로-${대륙}`); }
    catch { toast('공유에 실패했어요'); }
  }
});
