/* ── 일기장 ── 한 장씩 넘겨 보는 자리(b538) ────────────────────────────
 * 사용자 결정: 「일기장 넘기는 UI 로」. 목록이 아니라 **한 화면에 한 장**,
 * 옆으로 밀어 넘깁니다. 도시 화면의 일기 칸이 「나중에 일기장에서 모아
 * 봐요」라고 약속한 그 자리입니다.
 *
 * ⚠ **넘기기는 브라우저에게 맡깁니다**(scroll-snap). 홈의 대륙 카드가 쓰는
 *   것과 같은 수법입니다(home.js 의 `.swipe`) — 자바스크립트로 흉내내다
 *   겪은 것들(관성이 남은 채 자리 옮기기, 반쯤 걸친 채 멈추기)이 아예
 *   생길 수가 없습니다.
 * ⚠ **여기는 덮는 판이라 탭 덱과 안 다툽니다.** `coverDeck(true)` 로 덱을
 *   숨기고 열기 때문에, 좌우로 밀어도 탭이 안 넘어갑니다. 홈 미니맵에서
 *   `touch-action` 을 손봐야 했던 것과 다른 점입니다.
 * ⚠ 일기가 길면 **그 장 안에서 위아래로** 굴러야 합니다. 장이 세로
 *   스크롤러이고 줄기가 가로 스크롤러입니다 — 축이 갈려 있어서 둘 다
 *   브라우저가 알아서 합니다.
 *
 * ⚠ **순서는 「쓴 때」입니다(updated_at).** 다녀온 때가 아닙니다 —
 *   `visited_on` 칸은 b536 에 만들었다가 화면을 걷어서 지금 비어 있습니다.
 *   나중에 다녀온 날짜를 다시 받게 되면 그때 이 순서를 바꾸십시오.
 */
import { $, esc, toTop, coverDeck, backLabel } from './dom.js?v=b567';
import { sb } from './db.js?v=b567';
import { cities, countryName } from './cities.js?v=b567';
import { starHtml } from './stars.js?v=b567';

let ctx = { me: () => null, loadCities: async () => {}, openCity: () => {} };
export function setDiaryCtx(o){ ctx = { ...ctx, ...o }; }

/* 나온 자리로 돌려보내기 — 지도·성향과 같은 수법입니다(map.js 의 mapBackTo). */
let 왔던탭 = null;
export function diaryBackTo(tab){
  왔던탭 = tab;
  const L = backLabel(tab);
  const b = $('diaryback');
  if (b && L) b.textContent = L;
}

export async function openDiary(){
  $('profpane')?.classList.add('hide');
  $('diarypane')?.classList.remove('hide');
  coverDeck(true);
  toTop($('diarypane'));
  if (history.state?.t2 !== 'diary') history.pushState({ t2:'diary' }, '');

  $('diarybody').innerHTML =
    '<div class="card"><div class="empty"><span class="load">일기를 펴는 중…</span></div></div>';

  await ctx.loadCities();
  const me = ctx.me();
  if (!me) return;
  const r = await sb.from('city_ratings')
    .select('city_id,stars,comment,journal,journal_photo,updated_at')
    .eq('user_id', me.id).not('journal', 'is', null)
    .order('updated_at', { ascending: false });

  if (r.error){
    $('diarybody').innerHTML =
      '<div class="card"><div class="empty">일기를 불러오지 못했어요.</div></div>';
    return;
  }

  /* 빈 글자만 남은 줄은 일기가 아닙니다 — 지운 흔적입니다. */
  const 장들 = (r.data || []).filter(x => String(x.journal || '').trim());
  if (!장들.length){
    $('diarybody').innerHTML = `<div class="card"><div class="empty">
      아직 쓴 일기가 없어요.<br>
      <span class="memo">도시를 열고 「내 일기」에 남기면 여기 모여요.</span>
    </div></div>`;
    $('diarycount').textContent = '';
    return;
  }

  const 이름 = id => (cities || []).find(c => c.id === id);
  $('diarybody').innerHTML = `
    <div class="dgbook">
      <div class="dgrow">${장들.map(x => {
        const c = 이름(x.city_id);
        return `<article class="dgpage" data-dgcity="${esc(x.city_id)}">
          <header class="dghead">
            <b>${esc(c?.name || x.city_id)}</b>
            <span>${esc(countryName[c?.country] || c?.country || '')}</span>
            <span class="stars" style="pointer-events:none">${starHtml(x.stars)}</span>
          </header>
          ${x.journal_photo
            ? `<div class="dgimg"><img src="${esc(x.journal_photo)}" alt="" loading="lazy"
                 onerror="this.closest('.dgimg').remove()"></div>` : ''}
          ${x.comment ? `<p class="dgone">${esc(x.comment)}</p>` : ''}
          <p class="dgtext">${esc(x.journal)}</p>
          <footer class="dgfoot">
            <span>${esc(적은때(x.updated_at))}</span>
            <button class="small" data-dgedit="${esc(x.city_id)}">고치기</button>
          </footer>
        </article>`;
      }).join('')}</div>
    </div>`;

  /* ── 몇째 장인가 ── 점이 아니라 숫자입니다.
     장이 스물이 넘으면 점은 세어지지도 않고 줄만 어지럽습니다. */
  const 줄기 = $('diarybody').querySelector('.dgrow');
  /* ⚠⚠ **한 칸은 `clientWidth` 가 아닙니다(b539).** 줄기에 좌우 여백과
     장 사이 틈이 있어서, 실측하면 줄기 480 · 한 장 446 · 한 칸 458 입니다.
     `clientWidth` 로 세면 오차가 장마다 쌓여 **열두째 장쯤에서 한 장씩
     어긋납니다**(458/480 = 0.954). 장과 틈을 직접 재서 씁니다. */
  const 칸폭 = () => {
    const p = 줄기.querySelector('.dgpage');
    if (!p) return 줄기.clientWidth || 1;
    const cs = getComputedStyle(줄기);
    const 틈 = parseFloat(cs.columnGap || cs.gap) || 0;
    return (p.offsetWidth + 틈) || 1;
  };
  const 세기 = () => {
    const i = Math.min(장들.length,
                       Math.max(1, Math.round(줄기.scrollLeft / 칸폭()) + 1));
    $('diarycount').textContent = `${i} / ${장들.length}`;
  };
  세기();
  줄기.addEventListener('scroll', 세기, { passive:true });
}

/* 「2026년 8월 30일에 씀」. 시간까지는 안 적습니다 — 일기에 분 단위는
   쓸데없고, 오래된 것일수록 시각이 의미가 없습니다. */
function 적은때(t){
  if (!t) return '';
  const d = new Date(t);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일에 씀`;
}

export function closeDiary(fromPop){
  if (!fromPop && history.state?.t2 === 'diary'){ history.back(); return; }
  const 열려있었나 = !$('diarypane').classList.contains('hide');
  $('diarypane').classList.add('hide');
  if (!열려있었나) return;
  coverDeck(false);
  /* 분석·홈에서 왔으면 그리로. 한 번 쓰고 비웁니다 — 남기면 프로필에서
     연 사람도 튕깁니다(map.js 의 「나온 자리로」와 같은 규칙). */
  const t = 왔던탭; 왔던탭 = null;
  if (t && ctx.showApp) return ctx.showApp(t);
  $('profpane').classList.remove('hide');
}

$('diaryback')?.addEventListener('click', () => closeDiary());
/* 「고치기」는 그 도시로 보냅니다 — 일기는 도시 화면에서 씁니다.
   여기서 또 쓰게 만들면 같은 것을 두 곳에서 고치게 됩니다. */
$('diarypane')?.addEventListener('click', e => {
  const b = e.target.closest('[data-dgedit]');
  if (!b) return;
  closeDiary();
  ctx.openCity(b.dataset.dgedit);
});
