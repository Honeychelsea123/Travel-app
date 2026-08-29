/* ── 보관함 · 여행 배지 ──────────────────────────────────────────────
 * 프로필의 타일(도시·가보고 싶은 곳·맛집·후기·배지)을 누르면 열리는 목록입니다.
 * 종류마다 담기는 것이 달라서 여는 함수가 넷이지만, 닫는 것과 줄을 빼는 것은
 * 하나로 씁니다.
 *
 * ── app.js 에서 떼어낸 세 번째 조각입니다(b323) ─────────────────────
 * persona.js(b321) · map.js(b322)와 같은 방식입니다. app.js 를 import 하지
 * 않고, app.js 만 아는 것은 `setShelfCtx` 로 받습니다.
 * `me` 는 로그인할 때마다 바뀌므로 값이 아니라 **함수**로 받습니다.
 *
 * ⚠ 원래 이 자리에 AI 화면 열기와 알림 읽기가 같이 있었습니다. 보관함과
 *   아무 상관이 없는데 파일이 길어서 옆에 붙어 있던 것뿐입니다.
 *   그 둘은 app.js 에 두고 보관함만 가져왔습니다 — **줄 수로 자르지 않고
 *   하는 일로 자릅니다.**
 *
 * 층: dom.js · db.js · cities.js · rate.js · stars.js · net.js 만 씁니다. */
import { $, esc, toast, emptyDo, josa, toTop, coverDeck } from './dom.js?v=b514';
import { openCity } from './city.js?v=b514';
import { sb } from './db.js?v=b514';
import { cities, countryName } from './cities.js?v=b514';
import { myRates, cityStat, visited, avgTail } from './rate.js?v=b514';
import { starHtml, paintStars, markRated, starValue } from './stars.js?v=b514';
import { fail } from './net.js?v=b514';
import { arm } from './ui.js?v=b514';
import { todayYmd } from './calc.js?v=b514';
import { loadCities } from './citysearch.js?v=b514';
import { loadRateData, saveRate } from './rating.js?v=b514';

let ctx = {
  me: () => null,
  loadFootprint: () => {},
  openTrip: async () => {},
};
export function setShelfCtx(o){ ctx = { ...ctx, ...o }; }

/* ── 보관함 ──────────────────────────────────────────────────────────
 * 기록 탭으로 보내면 그 탭이 걸린 목록으로 바뀝니다. 그러면 새로 매길 곳을
 * 찾을 수가 없습니다 — 기록 탭은 안 매긴 곳을 보여주는 자리입니다.
 * 프로필 안에서 펼치고, 여기서도 바로 별점을 고칠 수 있게 합니다. */
/* **been 이 빠져 있었습니다.** 프로필의 '국가'·'도시' 타일을 누르면 제목이
   그냥 '보관함'으로 떠서 무슨 목록인지 알 수가 없었습니다.
   그리고 '다녀온 곳'이 도시(been)와 관광지(spot) 둘을 가리키고 있었습니다 —
   보관함 안에 '다녀온 맛집' 옆에 '다녀온 곳'이 나란히 있으니 더 헷갈립니다.
   도시는 '다녀온 도시', 관광지는 '다녀온 관광지'로 갈랐습니다. */
const SHELF = { been:'다녀온 도시', want:'가보고 싶은 곳', mine:'내가 매긴 곳',
                comment:'한줄평 남긴 곳', place:'다녀온 맛집', spot:'다녀온 관광지',
                review:'여행 후기', badge:'여행 배지' };
/* 맛집과 관광지는 같은 방식으로 다룹니다 — 분류만 다릅니다. */
const SHELF_CAT = { place:['식사','카페'], spot:['관광','쇼핑'] };

/* ── 보관함 정렬·거르기 ─────────────────────────────────────────────
 * 매긴 것이 쌓이면 목록이 길어져 찾을 수가 없습니다.
 * 별점이 없는 보관함(가보고 싶은 곳)에서는 아예 안 나옵니다 — 거를 것이 없습니다. */
/* 지금 보고 있는 보관함 종류. **app.js 에 있던 것을 여기로 옮겼습니다(b327)** —
   쓰는 곳이 여기뿐인데 저쪽에 남아 있어서 떼어낸 뒤 'shelfKind is not defined'
   로 보관함이 통째로 안 열렸습니다. 한 곳에서만 쓰는 것은 그 곳에 둡니다. */
let shelfKind = 'mine';
let shelfSort = 'new';

/* ── 빈 보관함 (b363) ────────────────────────────────────────────────
 * 전에는 두 곳 다 그냥 **'아직 없어요.'** 였습니다. 무엇이 없는지가 안
 * 적혀 있어서, 어느 타일로 들어왔는지 잊으면 읽고도 모릅니다.
 * 이름은 SHELF 표에서 꺼내 씁니다 — **조사는 `josa` 가 붙입니다.**
 * '다녀온 도시**가**' / '가보고 싶은 곳**이**' 를 손으로 적으면 이름을
 * 바꾸는 날 한쪽을 놓칩니다.
 *
 * 여기를 지나는 것은 도시 평가 넷(been·want·mine·comment)입니다 —
 * 맛집·관광지·후기·배지는 각자 다른 함수로 빠집니다. */
const SHELF_HINT = {
  been:    '도시를 열어 다녀왔다고 표시하면 여기에 모여요.',
  want:    '도시 옆 하트를 누르면 여기에 모여요.',
  mine:    '도시에 별을 남기면 여기에 모여요.',
  comment: '별과 함께 한줄평을 적으면 여기에 모여요.',
};
/* **두 곳에서 씁니다**(그릴 때 · 마지막 줄을 지웠을 때). 문구를 양쪽에
   적으면 한쪽만 고치는 날이 옵니다. */
const shelfEmpty = () =>
  emptyDo(`아직 ${josa(SHELF[shelfKind] || '담아둔 것', '이', '가')} 없어요.`,
          null, null, SHELF_HINT[shelfKind]);
const HAS_STARS = k => k === 'mine' || k === 'comment' || k === 'place' || k === 'spot';

/* 목록을 정렬 규칙에 맞게 세웁니다.
   at 은 마지막으로 손댄 시각입니다 — 없으면 최신순에서 뒤로 갑니다.
   별점 칸(★5 · ★4점대 …)도 만들어 봤는데 줄이 둘이 되면서 답답했습니다.
   목록이 짧아서 정렬만으로 충분합니다. */
function shelfArrange(list){
  const by = {
    new:  (a, b) => String(b.at || '').localeCompare(String(a.at || '')),
    high: (a, b) => (b.stars ?? -1) - (a.stars ?? -1),
    low:  (a, b) => (a.stars ?? 99) - (b.stars ?? 99),
  }[shelfSort];
  return [...list].sort((a, b) => by(a, b) || String(a.name).localeCompare(String(b.name), 'ko'));
}

$('shelffilter').addEventListener('click', e => {
  const s = e.target.closest('[data-ssort]');
  if (s){ shelfSort = s.dataset.ssort; openShelf(shelfKind); }
});

/* 도시가 아니라 일정 줄에 답니다. 일정 짤 때 이미 넣은 것이라
   따로 적게 하지 않고, 다녀온 여행의 그 분류만 모아 별점을 받습니다. */
async function openPlaceShelf(kind){
  const today = todayYmd();
  const cats = SHELF_CAT[kind] || SHELF_CAT.place;
  const [ps, rs] = await Promise.all([
    sb.from('plans').select('id,title,memo,category,date,trip_id,trips(title,end_date)')
      .in('category', cats).is('deleted_at', null)
      .order('date', { ascending:false }).limit(300),
    /* updated_at 은 최신순에 씁니다. select 에 안 적으면 undefined 로 와서
       전부 같은 값이 되고 최신순이 이름순처럼 보입니다. */
    sb.from('plan_ratings').select('plan_id,stars,updated_at').eq('user_id', ctx.me().id),
  ]);
  if (ps.error) return fail(ps.error, 'trip');
  const rate = Object.fromEntries((rs.data || []).map(r => [r.plan_id, r.stars]));
  const rateAt = Object.fromEntries((rs.data || []).map(r => [r.plan_id, r.updated_at]));
  /* 아직 안 끝난 여행은 뺍니다 — 가보지도 않고 별점을 매길 수는 없습니다.
     다만 이미 매긴 것은 남깁니다. 매겼다는 것은 갔다는 뜻이고,
     프로필의 숫자와 여기 목록이 어긋나면 어느 쪽을 믿어야 할지 모릅니다. */
  const all = (ps.data || []).filter(p =>
    rate[p.id] != null || (p.trips?.end_date || p.date) < today)
    .map(p => ({ ...p, stars: rate[p.id] ?? null, at: rateAt[p.id] || p.date, name: p.title }));

  const list = shelfArrange(all);

  /* 도시 목록과 같은 이유로 평균을 같이 적습니다(위 주석 참고).
     여기는 아직 안 매긴 장소가 섞여 있어 **매긴 것만으로** 셉니다. */
  {
    const st = list.map(p => rate[p.id]).filter(s => s != null);
    const avg = st.length ? (st.reduce((a, b) => a + b, 0) / st.length) : null;
    $('shelfcount').textContent = !list.length ? ''
      : avg != null ? `${list.length}곳 · 평균 ★${avg.toFixed(1)}` : `${list.length}곳`;
  }
  $('shelflist').innerHTML = list.length
    ? list.map(p => `<div class="rrow">
        <span class="thumb ph">${({ 식사:'🍽', 카페:'☕', 관광:'📸', 쇼핑:'🛍' })[p.category] || '📍'}</span>
        <div class="t"><b>${esc(p.title)}</b>
          <span class="memo">${esc(p.trips?.title || '')} · ${esc(p.date)}</span></div>
        <span class="stars" data-plan="${esc(p.id)}">${starHtml(rate[p.id])}</span>
        ${rate[p.id] != null
          ? `<button class="ghost" data-pdel="${esc(p.id)}"
                     style="color:var(--bad); flex:none">×</button>`
          : '<span style="width:26px; flex:none"></span>'}
      </div>`).join('')
    : `<div class="empty">다녀온 여행에 ${esc(cats.join(' · '))} 일정이 아직 없어요.<br>
           일정에 넣어두면 여행이 끝난 뒤 여기서 평가할 수 있어요.</div>`;
}

/* 다녀온 여행에 남긴 것을 모아 봅니다. 여행 화면 안에만 두면 그 여행을
   다시 찾아 들어가야 다시 볼 수 있습니다 — 후기는 다시 보라고 쓰는 것입니다.
   별점·글·사진 중 하나라도 남긴 여행만 나옵니다(db/052 의 my_reviews). */
async function openReviewShelf(){
  const { data, error } = await sb.rpc('my_reviews');
  if (error) return fail(error, 'trip');
  const list = data || [];
  $('shelfcount').textContent = list.length ? `${list.length}개` : '';
  if (!list.length){
    $('shelflist').innerHTML =
      emptyDo('아직 남긴 후기가 없어요.', null, null,
              '여행이 끝나면 그 여행 화면에서 별점과 글, 사진을 남길 수 있어요.');
    return;
  }
  /* 표지 사진은 비공개 통에 있습니다. 잠깐 열리는 주소를 한 번에 받습니다. */
  const paths = list.map(r => r.cover).filter(Boolean);
  let by = {};
  if (paths.length){
    const { data: urls } = await sb.storage.from('trip-photos')
      .createSignedUrls(paths, 3600);
    by = Object.fromEntries((urls || []).map(u => [u.path, u.signedUrl]));
  }
  $('shelflist').innerHTML = list.map(r => `
    <div class="rvcard" data-rvtrip="${esc(r.trip_id)}">
      ${r.cover ? `<img src="${esc(by[r.cover] || '')}" alt="" loading="lazy">` : ''}
      <div class="b">
        <div class="t"><b>${esc(r.title)}</b>
          <span class="c">${esc(r.end_date)}</span></div>
        ${r.stars != null ? `<span class="stars">${starHtml(r.stars)}</span>` : ''}
        ${r.comment ? `<div class="m">${esc(r.comment)}</div>` : ''}
        ${r.photos ? `<div class="c">사진 ${r.photos}장</div>` : ''}
      </div>
    </div>`).join('');
}

/* 후기 카드를 누르면 그 여행을 엽니다. 고치는 것은 거기서 합니다 —
   여기서도 고치게 하면 같은 폼이 두 벌이 됩니다. */
$('shelflist').addEventListener('click', e => {
  const c = e.target.closest('[data-rvtrip]');
  if (c) ctx.openTrip(c.dataset.rvtrip);
});

/* ── 여행 배지 ───────────────────────────────────────────────────────
 * 세는 것은 전부 DB 가 합니다(db/053). 화면에서 세면 기기마다 다르게
 * 나오고, 나중에 조건을 바꿔도 옛날 기기는 옛 조건으로 셉니다.
 *
 * **못 받은 것도 보여줍니다.** 받은 것만 늘어놓으면 다음에 뭘 하면
 * 되는지 알 수가 없습니다 — 배지는 받은 자랑이자 다음 목표입니다. */
async function openBadgeShelf(){
  const { data, error } = await sb.rpc('my_badges');
  if (error) return fail(error, 'trip');
  const list = data || [];
  const got = list.filter(b => b.earned_at);
  $('shelfcount').textContent = `${got.length} / ${list.length}`;

  /* 지금 내 숫자를 맨 위에 한 줄로 적습니다. 이게 없으면 "왜 이 배지가
     안 들어오지"를 알 길이 없습니다 — 실제로 국가 27인데 배지가 안 켜지는
     일이 있었고, 그때 어디가 틀렸는지 볼 자리가 없었습니다.
     갈래마다 재는 것이 하나씩이라 배지 목록에서 그대로 뽑아 씁니다. */
  /* 갈래의 **마지막** 배지 값을 씁니다. '여행'만 첫 칸이 여행 횟수고
     나머지가 일수라, 첫 칸을 쓰면 "여행 3일"처럼 엉뚱하게 나옵니다. */
  const now = {};
  for (const b of list) now[b.cat] = b.have;
  const line = Object.entries(now)
    .map(([c, v]) => `${c} ${v}${{ '평가':'곳', '다녀온 곳':'개국',
                                   '여행':'일', '후기':'개' }[c] || ''}`)
    .join(' · ');

  /* 갈래끼리 묶습니다. 스물일곱 개를 한 줄로 늘어놓으면 훑을 수가 없습니다. */
  const cats = [];
  for (const b of list){
    const last = cats[cats.length - 1];
    if (last && last.cat === b.cat) last.items.push(b);
    else cats.push({ cat: b.cat, items: [b] });
  }
  $('shelflist').innerHTML = `<div class="memo bdnow">${esc(line)}</div>` +
    cats.map(g => {
    const n = g.items.filter(b => b.earned_at).length;
    return `<div class="daysep">${esc(g.cat)}
      <span class="dstat">${n}/${g.items.length}</span></div>
      ${/* 이름과 설명을 따로 뒀더니 둘이 같은 말이었습니다 — '첫 해외'와
            '다른 나라에 한 곳 다녀왔어요'. 조건 그 자체를 이름으로 씁니다.
            한 줄이면 무슨 배지인지 한 번에 읽힙니다. 받았는지는 색으로 압니다. */''}
      <div class="bdgrid">${g.items.map(b => `
        <div class="bdg${b.earned_at ? ' on' : ''}"
             title="${esc(b.earned_at ? String(b.earned_at).slice(0,10) + ' 받음'
                                      : b.have + ' / ' + b.need)}">
          <span class="i">${esc(b.icon)}</span>
          <b>${esc(b.name)}</b>
        </div>`).join('')}</div>`;
  }).join('');
}

export async function openShelf(kind){
  shelfKind = kind;
  $('profpane').classList.add('hide');
  $('mappane').classList.add('hide');
  $('shelfpane').classList.remove('hide');
  coverDeck(true);
  toTop($('shelfpane'));   /* 프로필 안이라 문서가 아니라 setview 를 올립니다(b471) */
  if (history.state?.t2 !== 'shelf') history.pushState({ t2:'shelf' }, '');
  $('shelfhead').textContent = SHELF[kind] || '보관함';
  /* 별점이 없는 보관함에서는 정렬 칸을 숨깁니다. 거를 것이 없습니다.
     넘어올 때 걸려 있던 조건도 풀어둡니다 — 다른 보관함의 조건이 남아 있으면
     왜 목록이 짧은지 알 수가 없습니다. */
  $('shelffilter').classList.toggle('hide', !HAS_STARS(kind));
  if (!HAS_STARS(kind)) shelfSort = 'new';
  $('shelffilter').querySelectorAll('[data-ssort]').forEach(b =>
    b.classList.toggle('on', b.dataset.ssort === shelfSort));

  if (kind === 'place' || kind === 'spot') return openPlaceShelf(kind);
  if (kind === 'review') return openReviewShelf();
  if (kind === 'badge')  return openBadgeShelf();

  await loadCities();
  /* 전에는 여기서 오류를 안 봤습니다. 실패하면 평가가 하나도 없는 것처럼
     보이고, 공유 자료라 평가 화면까지 같이 비었습니다. 보고 있는 자리에 적습니다. */
  const rd = await loadRateData();
  if (rd.error){
    $('shelfcount').textContent = '';
    $('shelflist').innerHTML =
      `<div class="empty">평가를 못 받아왔어요.<br>
         <span class="memo">${esc(rd.error.message || rd.error)}</span></div>`;
    return;
  }

  const all = (cities || []).filter(c => {
    const r = myRates[c.id];
    if (kind === 'been')    return visited.has(c.id);
    if (kind === 'want')    return !!r?.want;
    if (kind === 'mine')    return r?.stars != null;
    if (kind === 'comment') return !!r?.comment;
    return false;
  }).map(c => ({ ...c, stars: myRates[c.id]?.stars ?? null,
                        at: myRates[c.id]?.updated_at || '' }));

  const list = HAS_STARS(kind) ? shelfArrange(all)
    : [...all].sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  /* **개수만 있고 평균이 없었습니다.** 74곳을 매겼다는 것보다 "평균 몇 점을
     주는 사람인가"가 자기 기록을 볼 때 더 궁금합니다 — 후하게 주는 편인지
     짜게 주는 편인지가 거기서 드러납니다.
     ⚠ **별점이 있는 목록에만 답니다.** '가보고 싶은 곳'은 별점이 없어서
       평균이 NaN 이 되거나 0점으로 보입니다. */
  {
    const st = list.map(c => myRates[c.id]?.stars).filter(s => s != null);
    const avg = st.length ? (st.reduce((a, b) => a + b, 0) / st.length) : null;
    $('shelfcount').textContent =
      !list.length ? '' :
      (HAS_STARS(kind) && avg != null)
        ? `${list.length}곳 · 평균 ★${avg.toFixed(1)}`
        : `${list.length}곳`;
  }
  $('shelflist').innerHTML = list.length
    ? list.map(c => {
        const r = myRates[c.id] || {};
        const 줄 = `<div class="rrow" data-cityopen="${esc(c.id)}">
          ${c.image_url
            ? `<img class="thumb" src="${esc(c.image_url)}" alt="" loading="lazy">`
            : `<span class="thumb ph">${esc(c.name.slice(0,1))}</span>`}
          <div class="t"><b>${esc(c.name)}</b>
            <span class="memo">${esc(countryName[c.country] || c.country)}${
              avgTail(cityStat[c.id], r)}</span></div>
          <span class="stars" data-city="${esc(c.id)}">${starHtml(r.stars)}</span>
          <button class="ghost want${r.want ? ' on' : ''}" data-want="${esc(c.id)}">♡</button>
        </div>`;
        /* ── 한줄평 목록은 문장이 주인공입니다(b513) ─────────────────
           사용자 지적: 「한줄평이 제대로 보이지도 않는다」.
           맞습니다 — 화면 이름이 「한줄평 남긴 곳」인데, 정작 그 문장이
           줄 밑에 **제일 작고 제일 흐린 글씨**로 딸려 있었습니다.
           도시 이름 17px/진하게, 나라 13px, 그리고 한줄평이 13px/48% —
           읽는 순서가 정확히 거꾸로였습니다.

           문장에 잉크를 다 주고 크기를 올립니다. 자리는 **줄 밑**입니다 —
           b513 에 위로 올려봤다가 b514 에 내렸습니다(사용자 결정). 어느
           도시 이야기인지 먼저 보고 그 사람 말을 읽는 순서입니다. 줄 사이는 실선으로
           끊습니다 — 한 덩이가 한 사람의 한마디입니다.

           ⚠ 한줄평 탭에서만입니다. 내 평가 목록에서는 별점만 봅니다 —
             어떤 줄만 두 줄이 되면 목록이 들쭉날쭉해집니다.
           ⚠ 안쪽은 `.rrow` 를 **그대로 씁니다.** 별점 누르기(.stars
             [data-city])·♡(data-want)·도시 열기(data-cityopen)가 전부
             그 줄에 걸려 있어서, 새로 짜면 셋 다 다시 이어야 합니다. */
        return kind === 'comment' && r.comment
          ? `<div class="cmt" data-cityopen="${esc(c.id)}">
               ${줄}<div class="cq">${esc(r.comment)}</div></div>`
          : 줄;
      }).join('')
    : shelfEmpty();
}

export function closeShelf(fromPop){
  if (!fromPop && history.state?.t2 === 'shelf'){ history.back(); return; }
  $('shelfpane').classList.add('hide');
  $('profpane').classList.remove('hide');
  coverDeck(false);
  ctx.loadFootprint();                  /* 여기서 매긴 것이 숫자에 바로 반영되게 */
}
$('shelfback').addEventListener('click', () => closeShelf());

/* 지운 줄을 빼는 자리. 곧바로 없애면 눌리자마자 사라져서 뭘 지웠는지 못 봅니다.
   0.7초 두었다가 밀어냅니다 — 지웠다는 것은 보이고, 기다린다는 느낌은 안 듭니다. */
function dropRow(row){
  if (!row) return;
  setTimeout(() => {
    row.classList.add('gone');
    setTimeout(() => {
      row.remove();
      const n = $('shelflist').querySelectorAll('.rrow').length;
      $('shelfcount').textContent = n ? `${n}곳` : '';
      if (!n) $('shelflist').innerHTML = shelfEmpty();
    }, 260);
  }, 700);
}

/* 여기서도 별점을 고칠 수 있습니다. 기록 탭과 같은 방식입니다. */
$('shelflist').addEventListener('click', async e => {
  /* 별점을 지우는 길. 별을 0으로 만들 수는 없어서 따로 둡니다.
     지우면 목록에서 빠지고, 다시 남기고 싶으면 여행 탭에서 그 일정에 별을 답니다. */
  const del = e.target.closest('[data-pdel]');
  if (del){
    if (del.dataset.armed !== '1'){ arm(del, '정말 지울까요?'); return; }
    const r = await sb.from('plan_ratings').delete()
      .eq('user_id', ctx.me().id).eq('plan_id', del.dataset.pdel).select('plan_id');
    if (r.error) return fail(r.error, 'trip');
    ctx.loadFootprint();
    return openShelf(shelfKind);
  }

  const st = e.target.closest('.st');
  /* 식당·카페는 일정 줄에 답니다. 도시 별점과 저장하는 표가 다릅니다. */
  const pw = st?.closest('.stars[data-plan]');
  if (pw){
    const v = starValue(st, e.clientX);   /* 반칸 규칙은 stars.js 한 곳(b491) */
    const cur = [...pw.querySelectorAll('.st i')]
      .reduce((s, i) => s + parseFloat(i.style.width) / 100, 0);
    /* 0(끌어서 맨 왼쪽)도 지우기입니다 — b494, stars.js 의 끌린값 참고. */
    const next = (v === 0 || Math.abs(cur - v) < .01) ? null : v;
    /* 같은 점수를 다시 누르면 아예 지웁니다. 별점 없는 줄을 남겨두면
       "지웠는데 그대로 있다"가 됩니다. */
    if (next == null){
      const r = await sb.from('plan_ratings').delete()
        .eq('user_id', ctx.me().id).eq('plan_id', pw.dataset.plan).select('plan_id');
      if (r.error) return fail(r.error, 'trip');
      ctx.loadFootprint();
      return openShelf(shelfKind);
    }
    paintStars(pw, next, true);
    const r = await sb.from('plan_ratings')
      .upsert({ user_id: ctx.me().id, plan_id: pw.dataset.plan, stars: next },
              { onConflict: 'user_id,plan_id' }).select('plan_id');
    if (r.error) return fail(r.error, 'trip');
    ctx.loadFootprint();
    return;
  }
  if (st){
    const wrap = st.closest('.stars'), cityId = wrap.dataset.city;
    const row = st.closest('.rrow');
    const v = starValue(st, e.clientX);   /* 반칸 규칙은 stars.js 한 곳(b491) */
    const next = Number(myRates[cityId]?.stars) === v ? null : v;
    paintStars(wrap, next, true);
    markRated(row, next);
    await saveRate(cityId, { stars: next }, true);

    /* 지웠으면 목록에서도 빼야 합니다. 저장은 되는데 줄이 그대로 남아 있어서
       "안 지워진다"로 보였습니다 — 새로고침해야 사라졌습니다.
       여기는 "내 평가"이므로 별점이 없으면 있을 자리가 아닙니다.
       다시 그리지 않고 그 줄만 빼는 이유는, 다시 그리면 화면이 맨 위로 튀기 때문입니다. */
    if (next == null && shelfKind === 'mine') dropRow(row);
    ctx.loadFootprint();                 /* 프로필 숫자도 같이 맞춥니다 */
    return;
  }
  const w = e.target.closest('button[data-want]');
  if (w){
    const on = !myRates[w.dataset.want]?.want;
    await saveRate(w.dataset.want, { want: on }, true);
    w.classList.toggle('on', on);
    /* 별점과 같은 이유입니다 — "가보고 싶은 곳"에서 하트를 끄면 그 줄도 빠져야 합니다. */
    if (!on && shelfKind === 'want') dropRow(w.closest('.rrow'));
    return;
  }
  const row = e.target.closest('[data-cityopen]');
  if (row) await openCity(row.dataset.cityopen);
});

/* AI 는 어디서든 한 번에 갑니다. 여행을 보고 있었으면 그 여행을 물어볼
   대상으로 미리 골라둡니다 — 들어가서 또 고르게 하면 안 씁니다. */
/* 여행 비서는 페이지를 옮기지 않고 보던 화면 위에 올라옵니다.
   일정을 보다가 물어보고 그 자리로 돌아가야 합니다. */
