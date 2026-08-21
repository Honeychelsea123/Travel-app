/* ── 여행 상세의 탭과 쓸어 넘기기 ─────────────────────────────────────
 * 일정 · 지출 · 준비 · 일행 네 구역을 오가는 자리입니다. 탭을 눌러도 되고
 * **화면을 좌우로 쓸어도** 됩니다 — 폰에서는 쓸기가 더 빠릅니다.
 * 하단바에서도 같은 몸짓이 통합니다.
 *
 * 탭을 옮길 때 **열려 있던 폼은 닫습니다**(`FORMS`). 지출을 적다 말고
 * 일행 탭으로 갔다 오면 반쯤 채운 칸이 그대로 남아 헷갈립니다.
 * 그 탭에 지운 줄이 있으면 같이 불러옵니다(`TAB_TRASH`, trash.js).
 *
 * ── app.js 에서 떼어낸 스물여덟 번째 조각입니다(b352) ────────────────
 * app.js 만 아는 것은 둘 — 지금 어느 앱 탭인지, 앱 화면 켜기.
 * 밖으로 나가는 길은 `inTrip`(여행 상세가 열려 있나)과 `showTab` 둘입니다.
 *
 * ⚠ **1780 줄에서 끊었습니다.** 그 아래 '일정 추가·삭제' 는 좌표 찾기와
 * 얽혀 있어 탭과 상관이 없습니다 — 머리말이 붙어 있다고 한 덩어리가
 * 아닙니다(b345·b347·b350 과 같은 자리).
 *
 * 층: dom.js · trip.js · ui.js 와 이미 떼어낸 trash.js 를 씁니다. */
import { $ } from './dom.js?v=b420';
import { plans, tab, setTab, settleOn, todayOn } from './trip.js?v=b420';
import { onSwipeX } from './ui.js?v=b420';
import { TAB_TRASH, loadTrash } from './trash.js?v=b420';

let ctx = { appTab: () => '', showApp: () => {} };
export function setTabsCtx(o){ ctx = { ...ctx, ...o }; }

/* ── 탭 ─────────────────────────────────────────────────────────────
 * 카드를 한 화면에 다 쌓아두면 예약·준비물까지 붙였을 때 감당이 안 됩니다.
 * DOM 순서는 그대로 두고 보이는 것만 고릅니다 — display:none 이라 사이가 안 벌어집니다. */
/* 지운 것(card-trash)이 일행 탭에 있었습니다. 일행과 아무 상관이 없고,
   **지운 것은 지운 자리에서 되살리는 것이 맞습니다.** 세 탭에 같이 걸고
   내용은 그 탭 것만 보여줍니다. DOM 에서는 맨 끝에 있어서 어느 탭에 나와도
   그 탭 카드들 뒤에 붙습니다 — 자리를 옮기지 않아도 됩니다. */
const TABS = {
  plans: ['card-today', 'card-plans', 'card-cand', 'plancard', 'importcard', 'card-trash'],
  exp:   ['card-exp', 'expcard', 'settlecard', 'card-trash'],
  prep:  ['card-book', 'bookcard', 'card-pack', 'card-link', 'card-trash'],
  mem:   ['card-mem'],
};
/* 탭을 옮기면 열려 있던 폼은 닫습니다 */
const FORMS = ['plancard', 'expcard', 'bookcard', 'card-cand', 'importcard'];

export function showTab(t){
  /* 어느 쪽에서 들어오는지. 알약에 적힌 순서를 그대로 읽습니다 —
     여기 따로 적어두면 index.html 에서 순서를 바꿀 때 어긋납니다. */
  const seq = [...document.querySelectorAll('#tstrip button[data-t]')].map(b => b.dataset.t);
  const back = seq.indexOf(t) < seq.indexOf(tab);
  setTab(t);
  /* 한 id 가 여러 탭에 걸리게 되면서, 예전처럼 탭마다 따로 끄면 뒤 탭 차례에
     방금 켠 것이 다시 꺼집니다. 켤 것을 먼저 모아두고 한 번에 정합니다. */
  const on = new Set(TABS[t].filter(id => !FORMS.includes(id)));
  if (!settleOn) on.delete('settlecard');
  /* 오늘 일정도 같습니다. drawToday 가 비어서 숨겨도 여기서 다시 켜고 있었습니다 —
     지도 위에 **내용 없는 흰 카드**가 하나 떠 있던 것이 이것입니다. */
  if (!todayOn) on.delete('card-today');
  /* 지운 것은 있을 때만 켭니다. loadTrash 가 세어보고 다시 정합니다 —
     여기서는 일단 끄고, 되살릴 게 있으면 그쪽에서 켭니다. */
  on.delete('card-trash');

  for (const ids of Object.values(TABS))
    for (const id of ids) $(id).classList.toggle('hide', !on.has(id));

  $('editcard').classList.add('hide');
  document.querySelectorAll('#tstrip button').forEach(b =>
    b.classList.toggle('is-on', b.dataset.t === t));
  /* 지운 것은 열 때만 받아옵니다. 대부분은 볼 일이 없어서 미리 받으면 낭비입니다. */
  if (TAB_TRASH[t]) loadTrash();
  window.scrollTo({ top:0, behavior:'smooth' });

  /* 옆에서 들어오는 모양. **두 클래스를 먼저 걷고 한 박자 쉬어야** 같은 방향으로
     연달아 넘길 때 애니메이션이 다시 시작됩니다 — 안 걷으면 두 번째부터
     아무 일도 안 일어난 것처럼 보입니다. */
  const v = $('tripview');
  v.classList.remove('tabin', 'tabin-r');
  void v.offsetWidth;
  v.classList.add(back ? 'tabin-r' : 'tabin');
}
$('tstrip').addEventListener('click', e => {
  const b = e.target.closest('button[data-t]');
  if (b) showTab(b.dataset.t);
});

/* ── 좌우로 쓸어 구역 넘기기 ──────────────────────────────────────────
 * 구역 알약이 화면 **왼쪽 위**에 있어서 한 손으로 들면 엄지가 안 닿습니다.
 * 손가락이 이미 있는 자리에서 넘길 수 있게 합니다. 알약은 그대로 둡니다 —
 * 쓸기는 알려주지 않으면 아무도 모르므로, 보이는 길이 사라지면 안 됩니다.
 *
 * **순서는 알약에 적힌 순서를 그대로 읽어옵니다.** 여기 따로 적어두면
 * index.html 에서 순서를 바꿀 때 쓸기만 옛 순서로 남습니다.
 * 끝에서 더 밀면 안 넘어갑니다 — 돌아 나오면 지금 어디인지 감이 사라집니다. */
{
  const order = () => [...document.querySelectorAll('#tstrip button[data-t]')]
    .map(b => b.dataset.t);
  const step = d => {
    const o = order(), i = o.indexOf(tab);
    if (i < 0) return;
    const next = o[i + d];
    if (next && next !== tab) showTab(next);
  };
  /* **`#tripview` 가 아니라 화면 전체에 겁니다.** 처음에 tripview 에 걸었더니
     카드가 끝나는 데서 tripview 도 끝나서, **그 아래 회색 빈 자리에서는
     아무 일도 안 일어났습니다**(지출이 비면 화면의 3분의 2가 그 자리입니다).
     사용자가 보기에 그 회색도 여행 화면이므로 거기서도 넘어가야 합니다.
     화면 전체에 걸어도 되는 이유는 `body.intrip` 이 있기 때문입니다 —
     showApp 이 다른 탭으로 갈 때 여행을 닫으면서 늘 끕니다. */
  onSwipeX(document, {
    /* 시트가 위에 열려 있으면 화면이 보여도 넘기면 안 됩니다.
       **하단바 위에서 시작한 것은 넘깁니다** — 거기는 앱 탭(홈·여행·기록·프로필)
       차례입니다. 아래에서 따로 듣습니다. */
    active: () => document.body.classList.contains('intrip') &&
                  !$('tripview').classList.contains('hide') &&
                  !document.body.classList.contains('sheeton'),
    skip:    e => !!e.target.closest?.('#appbar'),
    onLeft:  () => step(1),      /* 왼쪽으로 쓸면 다음 구역이 따라 들어옵니다 */
    onRight: () => step(-1),
  });
}

/* ── 하단바도 좌우로 쓸어 넘기기 ──────────────────────────────────────
 * 사용자 요청. 탭이 넷이라 끝에서 끝으로 갈 때 손가락이 화면을 가로지릅니다.
 * 바 위에서 쓸면 옆 탭으로 갑니다 — 손가락을 옮길 필요가 없습니다.
 *
 * **여행 안에서도 바 위에서는 앱 탭이 바뀝니다.** 바에 그려진 것이 앱 탭이니
 * 거기서 쓸면 그것이 움직이는 게 맞습니다(위 여행 구역 쓸기는 바를 건너뜁니다).
 * 순서는 index.html 의 단추에서 읽습니다 — 코드에 또 적으면 어긋납니다. */
{
  const order = () => [...document.querySelectorAll('#appbar button[data-a]')]
    .map(b => b.dataset.a);
  const step = d => {
    const o = order(), i = o.indexOf(ctx.appTab());
    if (i < 0) return;
    const next = o[i + d];
    /* 끝에서 더 밀어도 안 돌아 나옵니다 — 돌면 지금 어디인지 감이 사라집니다. */
    if (next && next !== ctx.appTab()) ctx.showApp(next);
  };
  /* **하단바만이 아니라 화면 전체입니다.** 처음에 바 위에서만 되게 했더니
     사용자가 바로 "홈화면 슬라이드 안된다"고 했습니다 — 당연합니다.
     여행 안에서는 화면 아무 데나 쓸면 구역이 넘어가는데, 여행 밖에서만
     좁은 띠를 정확히 짚어야 한다면 그건 같은 앱이 두 규칙으로 도는 것입니다.
     **여행 밖이면 화면 전체가 앱 탭 차례입니다.**
     (여행 안에서는 위쪽 쓸기가 구역을 넘기고, 하단바에서만 앱 탭이 넘어갑니다.) */
  onSwipeX(document, {
    active: () => !$('appbar').classList.contains('hide') &&
                  !document.body.classList.contains('sheeton') &&
                  !document.body.classList.contains('intrip'),
    onLeft:  () => step(1),
    onRight: () => step(-1),
  });
  /* 여행 안에서는 위가 구역 차례라 화면 전체로는 못 겁니다. 바만 따로 듣습니다. */
  onSwipeX($('appbar'), {
    active: () => !$('appbar').classList.contains('hide') &&
                  !document.body.classList.contains('sheeton') &&
                  document.body.classList.contains('intrip'),
    onLeft:  () => step(1),
    onRight: () => step(-1),
  });
}

/* 여행 안이냐 밖이냐. 상단바가 이걸 보고 모양을 바꿉니다 —
   안이면 구역 넷이 나오고 앱 이름이 접힙니다. */
export function inTrip(on){
  document.body.classList.toggle('intrip', on);
  $('tstrip').classList.toggle('hide', !on);
}

