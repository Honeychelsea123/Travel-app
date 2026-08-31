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
 * ⚠⚠ **일기가 길면 장이 «아래로» 자랍니다(b570).** ⚠⚠ b538 에는 장에 키를
 *   못 박고 그 안에서 굴렸습니다. 그랬더니 글이 문장 한가운데서 잘리고
 *   장 안에 스크롤막대가 또 생겼습니다 — **스크롤이 두 겹**이라 손가락이
 *   어디를 굴리는지 알 수가 없습니다(사용자 지적).
 *   이제 장은 제 키대로 자라고, **줄기 키를 「보고 있는 장」에 맞춥니다**
 *   (아래 `키맞추기`). 세로 스크롤은 화면 하나만 합니다.
 *
 * ⚠ **순서는 「쓴 때」입니다(updated_at).** 다녀온 때가 아닙니다 —
 *   `visited_on` 칸은 b536 에 만들었다가 화면을 걷어서 지금 비어 있습니다.
 *   나중에 다녀온 날짜를 다시 받게 되면 그때 이 순서를 바꾸십시오.
 */
import { $, esc, toTop, coverDeck, backLabel } from './dom.js?v=b571';
import { sb } from './db.js?v=b571';
import { cities, countryName } from './cities.js?v=b571';
import { starHtml } from './stars.js?v=b571';

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
          <!-- 스프링 — 그림이 아니라 배경으로 그립니다(app.css 의 .dgcoil).
               장이 스물이면 고리도 스무 벌이라, 요소로 만들면 그만큼 늘어납니다. -->
          <div class="dgcoil" aria-hidden="true"></div>
          <div class="dgsheet">
            <header class="dghead">
              <b>${esc(c?.name || x.city_id)}</b>
              <span class="dgland">${esc(countryName[c?.country] || c?.country || '')}</span>
              <span class="stars" style="pointer-events:none">${starHtml(x.stars)}</span>
            </header>
            <div class="dgdate">${적은날칸(x.updated_at)}</div>
            ${x.journal_photo
              ? `<div class="dgimg"><img src="${esc(x.journal_photo)}" alt="" loading="lazy"
                   onerror="this.closest('.dgimg').remove()"></div>` : ''}
            ${x.comment ? `<p class="dgone">${esc(x.comment)}</p>` : ''}
            <p class="dgtext">${esc(x.journal)}</p>
            <footer class="dgfoot">
              <button class="small" data-dgedit="${esc(x.city_id)}">고치기</button>
            </footer>
          </div>
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
  const 몇째 = () => Math.min(장들.length,
                    Math.max(1, Math.round(줄기.scrollLeft / 칸폭()) + 1));

  /* ── 줄기 키를 «보고 있는 장»에 맞춥니다(b570) ─────────────────────────
   * 장마다 키가 다릅니다(사진이 있는 것/없는 것, 긴 글/짧은 글). 줄기를
   * 그냥 두면 **제일 긴 장이 나머지를 다 늘려서** 짧은 일기 밑에 빈 판이
   * 남습니다. 보고 있는 장의 키를 그대로 씁니다.
   * ⚠ **`scrollHeight` 가 아니라 `offsetHeight`** 입니다 — 장은 이제
   *   스크롤러가 아니라 그냥 자란 상자입니다.
   * ⚠ **사진이 늦게 옵니다.** `loading="lazy"` 라 그 장에 닿아야 받기
   *   시작하고, 받고 나면 키가 늘어납니다. 그래서 `load` 때 다시 잽니다.
   *   안 그러면 줄기가 사진 없는 키에 멎어 글 아래가 잘립니다.
   * ⚠ 글꼴이 늦게 와도 줄 수가 바뀝니다. 한 번 더 늦게 잽니다. */
  const 키맞추기 = () => {
    const p = 줄기.children[몇째() - 1];
    if (p) 줄기.style.height = p.offsetHeight + 'px';
  };
  /* ── 넘기는 «느낌»(b571) ─────────────────────────────────────────────
   * ⚠⚠ **스크롤은 여전히 브라우저 것입니다.** 손가락을 우리가 받아 자리를
   *   옮기는 방식은 b469 에 만들었다가 b470 에 **되돌렸습니다**(관성이 남은
   *   채 자리를 옮기거나 반쯤 걸친 채 멈춤). 여기서 하는 일은 «이미 굴러간
   *   자리»를 읽어 **기울기만 칠하는 것**입니다 — 제스처를 안 뺏습니다.
   * ⚠ 값만 넘기고 꾸미기는 CSS 가 합니다(`--t` 부호, `--a` 절대값).
   *   `abs()` 는 아직 못 믿을 브라우저가 있어 여기서 미리 냅니다.
   * ⚠ **양옆 두 장만** 손댑니다. 스무 장짜리에서 매 프레임 전부 만지면
   *   넘기는 동안 손가락이 걸립니다. 나머지는 값을 지워 평평하게 둡니다.
   * ⚠ `transform-origin` 은 **넘어가는 쪽 모서리**입니다 — 오른쪽 장은
   *   왼쪽 모서리를 축으로 열리고, 지나간 장은 오른쪽 모서리로 닫힙니다.
   *   축을 하나로 두면 한쪽이 «뒤집히는» 것처럼 보입니다. */
  const 기울이기 = () => {
    const 폭 = 칸폭(), 현재 = 줄기.scrollLeft / 폭;
    [...줄기.children].forEach((p, i) => {
      const d = i - 현재;
      if (Math.abs(d) > 2){ p.style.removeProperty('--t'); p.style.removeProperty('--a'); return; }
      const t = Math.max(-1, Math.min(1, d));
      p.style.setProperty('--t', t.toFixed(3));
      p.style.setProperty('--a', Math.abs(t).toFixed(3));
      p.style.transformOrigin = (t >= 0 ? 'left' : 'right') + ' center';
    });
  };

  const 세기 = () => {
    $('diarycount').textContent = `${몇째()} / ${장들.length}`;
    키맞추기();
    기울이기();
  };
  세기();
  줄기.addEventListener('scroll', 세기, { passive:true });
  줄기.querySelectorAll('img').forEach(img => {
    if (img.complete) return;
    img.addEventListener('load', 키맞추기, { once:true });
    img.addEventListener('error', 키맞추기, { once:true });
  });
  addEventListener('resize', 키맞추기, { passive:true });
  setTimeout(키맞추기, 400);
}

/* 다이어리 맨 위의 날짜 칸 — 「2026 · 8 · 31」(b571).
   ⚠ 전에는 장 «맨 아래»에 「…일에 씀」으로 있었습니다. 종이 일기장은
     날짜가 첫 줄입니다 — 그게 그 장을 여는 말이라서요.
   ⚠ 날짜가 없으면 **칸 자체를 안 냅니다.** 빈 칸을 두면 밑줄만 뜬
     자리가 남습니다. */
function 적은날칸(t){
  const d = t ? new Date(t) : null;
  if (!d || isNaN(d)) return '';
  return `<b>${d.getFullYear()}</b><i>·</i><b>${d.getMonth() + 1}</b>` +
         `<i>·</i><b>${d.getDate()}</b>`;
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
