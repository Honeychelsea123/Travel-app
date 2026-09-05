/* ── 평가 화면 — 도시에 별을 매기는 자리 ──────────────────────────────
 * '기록' 탭입니다. 도시 목록을 보여주고 별점·가보고 싶어요·한줄평을 받습니다.
 * **평가 자료를 서버에서 받아오는 곳도 여기 하나입니다** — 네 화면(기록·도시·
 * 보관함·홈)이 같은 자료를 보므로 받는 자리가 둘이면 언젠가 갈립니다.
 *
 * ── app.js 에서 떼어낸 열다섯 번째 조각입니다(b341) ──────────────────
 * app.js 만 아는 것은 셋입니다 — 로그인한 사람, 도시 고르개 채우기,
 * 앱 화면 켜기. `rateShown`·`rateObs`(더 보기 스크롤 상태)는 이 블록에서만
 * 쓰던 것이라 같이 데려왔습니다.
 *
 * ⚠ **city.js 는 여전히 ctx 로 받습니다.** 여기가 `openCity` 를 import 하므로
 * 저쪽이 `saveRate` 를 import 하면 **고리가 생깁니다.** shelf.js 는 이쪽을
 * 안 부르므로 직접 import 로 바꿨습니다 — 그쪽 ctx 가 둘 줄었습니다.
 *
 * 층: dom.js · db.js · net.js · calc.js · stars.js · cities.js · rate.js ·
 *     city.js · citysearch.js 를 씁니다. */
import { $, esc } from './dom.js?v=b677';
import { sb } from './db.js?v=b677';
import { fail, netTimeout, netIsDown, drawOffbar, NOROW } from './net.js?v=b677';
import { dateRange } from './calc.js?v=b677';
import { starHtml, paintStars, markRated, starValue } from './stars.js?v=b677';
import { cities, countryName, cityCountry, continentOf,
         countryInfo } from './cities.js?v=b677';
import { myRates, cityStat, visited, justRated, avgTail,
         setRateData, setVisited, applyRate, putCityStat, clearJustRated,
         removeRate } from './rate.js?v=b677';
import { openCity } from './city.js?v=b677';
import { loadCities } from './citysearch.js?v=b677';

let ctx = { me: () => null, fillCityList: () => {}, showApp: () => {} };
export function setRatingCtx(o){ ctx = { ...ctx, ...o }; }

/* 목록을 몇 개까지 그렸나, 그리고 '더 보기' 를 지켜보는 눈.
   **app.js 의 상태 뭉치에 있던 것을 여기로 옮겼습니다(b341)** —
   쓰는 곳이 이 파일뿐이었습니다. */
let rateShown = 80, rateObs = null;

/* 기록 목록을 마지막으로 그린 글자. 같으면 다시 안 그립니다 — 사진이
   깜빡이는 것을 막습니다(아래 drawRatings). **목록을 밖에서 건드리면
   반드시 빈 글자로 되돌립니다.** 안 그러면 "같으니 건드리지 말자"가
   화면과 어긋난 채로 굳습니다.
   **이것도 app.js 의 상태 뭉치에 있던 것입니다(b341).** app.js 는
   로그아웃할 때 되돌려야 하므로 그 길만 내보냅니다 — 밖에서 `=` 로
   넣으면 import 한 쪽은 안 바뀌고 이 파일 안쪽만 어긋납니다. */
let lastRateHtml = '';
export function resetRateHtml(){ lastRateHtml = ''; }

/* ── 평가 자료를 받는 곳은 여기 하나입니다 ────────────────────────────
 * myRates · cityStat · visited 는 **네 화면이 같이 쓰는 자료**입니다
 * (평가 화면 · 보관함 · 홈 발자국 · 별점 저장).
 * 전에는 같은 질의가 그 네 곳에 손으로 베껴져 있었고 **이미 서로 달랐습니다**:
 *   - 보관함만 updated_at 을 받아왔습니다 (정렬에 쓰므로)
 *   - **보관함은 오류를 확인하지 않았습니다.** 질의가 실패하면 myRates 가
 *     {} 가 되어 "평가가 하나도 없음"으로 보이고, 공유 자료라 평가 화면까지
 *     같이 비었습니다. 조용한 실패라 아무도 몰랐습니다.
 * 배지 버그(my_footprint 를 my_counts 가 베껴 적은 것)와 같은 모양입니다.
 *
 * 칸은 두 화면이 쓰는 것을 **합쳐서** 받습니다 — 한쪽만 늘리면 다른 쪽이
 * 조용히 빈 값을 씁니다.
 * **실패하면 아무것도 안 바꿉니다.** 반쯤 지워진 자료가 빈 화면보다 나쁩니다. */
export async function loadRateData(){
  const [mine, stats, vis] = await Promise.all([
    sb.from('city_ratings').select('city_id,stars,want,comment,journal,journal_photo,updated_at')
      .eq('user_id', ctx.me().id),
    sb.rpc('city_stats'),
    sb.rpc('my_visited'),
  ]);
  if (mine.error) return { error: mine.error };
  /* 넣는 것은 rate.js 가 합니다 — 셋을 한 번에 맞추고, 못 받은 것은 안 건드립니다. */
  setRateData({ mine, stats, vis });
  return {};
}

/* 다녀온 곳만 다시 셉니다. 별점을 지웠을 때와 홈 발자국이 씁니다.
   **응답을 통째로 넘깁니다.** 전에는 `v.data || []` 로 넘어가서, 못 받아오면
   다녀온 곳이 통째로 빈 Set 이 됐습니다 — 홈 발자국이 이걸 부르므로 그때
   세계지도가 하얘졌습니다. rate.js 가 오류면 아무것도 안 바꿉니다. */
export async function refreshVisited(){
  setVisited(await netTimeout(sb.rpc('my_visited')));
}

export async function loadRatings(){
  /* 도시 목록은 받아둔 것이 있어도 **내 별점은 서버에서** 옵니다.
     별점 없이 도시만 늘어놓으면 뭘 매겼는지 모르고, 눌러도 저장이 안 됩니다.
     오프라인이면 아예 안 물어보고 알립니다. */
  if (netIsDown()){
    $('ratelist').innerHTML =
      `<div class="empty" style="padding:26px 12px">
         연결이 없어 기록은 지금 볼 수 없어요.<br>
         <span class="memo">별점과 평가는 서버에 저장됩니다.</span></div>`;
    lastRateHtml = '';          /* 안내로 갈아끼웠으니 다음엔 반드시 다시 그립니다 */
    $('r_head').textContent = '도시';
    drawOffbar(); return;
  }
  $('rateerr').classList.add('hide');
  await loadCities();
  ctx.fillCityList();

  /* ⚠ **네트워크 셋을 다 기다린 뒤에야 그리고 있었습니다** (실기기에서 지적받음).
     `loadRateData` 는 city_ratings · city_stats · my_visited 셋을 받아옵니다.
     탭을 누를 때마다 그 왕복이 끝나야 첫 글자가 나오니, 두 번째부터도
     매번 빈 화면을 보게 됩니다 — **이미 다 아는 내용인데도요.**
     별점 · 통계 · 다녀온 곳은 rate.js 에 그대로 살아 있습니다(탭을 옮겨도
     안 비웁니다). 있으면 **그것으로 먼저 그리고** 새것은 뒤에서 받습니다.
     받아온 뒤 달라진 게 없으면 위 `lastRateHtml` 이 다시 그리는 것을 막으므로
     사진도 안 깜빡입니다. */
  const warm = !!(myRates && Object.keys(myRates).length);
  if (warm) drawRatings();

  const r = await loadRateData();
  /* 이미 그려둔 것이 있으면 오류로 그것을 지우지 않습니다 —
     연결이 잠깐 끊긴 것 때문에 멀쩡히 보던 목록이 사라지면 안 됩니다. */
  if (r.error) return warm ? undefined : fail(r.error, 'rate');
  clearJustRated();       /* 다시 들어왔으니 매긴 것은 이제 목록에서 뺍니다 */
  drawRatings();
}

/* 칩으로 놔둔 것은 둘뿐입니다. 나머지는 프로필 보관함에서 걸러 들어옵니다.
   그때는 무엇으로 걸렀는지 알려주고 풀 길을 같이 줍니다. */
/* 여행 카드·히어로의 밑줄. **여행 이름이 대표 도시와 같으면 도시를 뺍니다** —
   여행을 도시 이름으로 짓는 일이 흔한데, 그러면 "도쿄 / 도쿄 · 9월 12일 –
   15일 · 4일" 처럼 같은 말이 바로 위아래로 두 번 나옵니다.
   두 화면이 같은 규칙을 써야 하므로 여기 한 곳에 둡니다. */
export const tripSub = (t, days) =>
  (t.destination && t.destination !== t.title ? `${t.destination} · ` : '') +
  `${dateRange(t.start_date, t.end_date)} · ${days}일`;

/* ⚠⚠ **`setRateFilter`·`NARROW` 를 걷었습니다(b671).** 갈래줄(도시 /
   가보고 싶어요 / 다녀온 곳)을 통째로 없앴기 때문입니다 — 이유는
   index.html 의 `#r_filter` 자리 주석에 있습니다.
 ⚠ 부르던 곳이 **그 단추들 자신 하나뿐**이었습니다. 「보관함에서 걸러
   들어온다」는 길은 b550 에 보관함이 제 화면을 갖게 되면서 없어졌는데,
   주석과 코드만 남아 있었습니다. 지우기 전에 부르는 곳을 세어 보십시오. */

/* ── 대륙·국가로 거르기(b676, 사용자 요청) ────────────────────────────
 * 안 매긴 곳이 650 인데 대부분은 «갈 일이 없는 나라»입니다. 하나씩
 * 내려가며 매기는 것이 오래 걸리는 진짜 이유는 정렬이 아니라 **목록의
 * 크기**였습니다.
 * ⚠ 기본 정렬은 **이미 유명한 순**입니다(아래 `rank` 다음이 `fame`).
 *   다만 `fame` 이 1 인 곳이 80곳이라 그 안에서는 가나다순이 되어
 *   「괌·나라·나트랑·나하」로 시작합니다 — 그래서 유명한 순으로
 *   안 보였던 것입니다. 정렬을 고칠 일이 아니었습니다.
 * ⚠ 도시의 나라·대륙은 **모국을 씁니다**(`cc`) — 괌은 미국,
 *   홍콩은 중국(b672 의 `cityCountry` 와 같은 규칙). */
let rtCont  = 'all';   /* 대륙 이름 그대로 */
let rtCtry  = 'all';   /* 나라 «코드» */
const 모국 = c => c.cc || countryInfo[c.country]?.parent_code || c.country;
const 대륙of = c => continentOf[모국(c)] || '기타';

export function drawRatings(){
  const q = $('r_q').value.trim().toLowerCase();
  const cho = /^[ㄱ-ㅎ]+$/.test(q);
  let list = (cities || []).filter(c => {
    if (q && !(cho ? c._cho.includes(q) : c._hay.includes(q))) return false;
    const r = myRates[c.id];
    /* ⚠ 갈래(rateFilter)는 b671 에 없앴습니다. 이 탭은 이제 한 가지만
       합니다 — **아직 안 매긴 곳을 보여준다.** 매긴 것을 다시 보는 자리는
       기록 탭의 보관함입니다. */
    /* 기본 목록에는 아직 안 매긴 곳만 둡니다. 매긴 것이 계속 쌓여 있으면
       남은 게 안 보여서 더 안 매기게 됩니다. 매긴 것은 프로필에서 봅니다.
       방금 매긴 것은 남겨둡니다 — 잘못 눌렀을 때 그 자리에서 고쳐야 합니다. */
    if (rtCont !== 'all' && 대륙of(c) !== rtCont) return false;
    if (rtCtry !== 'all' && 모국(c) !== rtCtry) return false;
    return r?.stars == null || justRated.has(c.id);
  });
  /* 아직 안 매긴 다녀온 곳을 맨 위로, 그다음 높은 별점 순.
     기록 화면에 왔으면 "매길 게 남았나"가 먼저 궁금합니다.
     **매길 게 없으면 가나다순이 됩니다.** 그러면 첫 화면이 가고시마·가나자와·
     가마쿠라… 로 시작하는 사전이 됩니다. 매긴 곳이 49개인 사람에게도
     그랬습니다 — 이름을 알고 찾아오는 게 아니면 아무 쓸모가 없습니다.
     그래서 그 자리는 이름난 곳 순으로 채웁니다. 찾아서 오는 사람은
     위의 검색칸을 씁니다(초성도 됩니다).
     **fame 은 1이 이름난 쪽입니다** — 파리·로마·도쿄가 1, 겐트·공주가 3.
     처음에 큰 값을 앞에 두었더니 목록이 겐트·골웨이·공주로 시작했습니다.
     값이 없으면 맨 뒤로 보냅니다. */
  const rank = c => (visited.has(c.id) && myRates[c.id]?.stars == null) ? 999
                  : (myRates[c.id]?.stars ?? -1);
  list.sort((a, b) => rank(b) - rank(a)
                   || (a.fame ?? 9) - (b.fame ?? 9)
                   || a.name.localeCompare(b.name, 'ko'));

  $('r_head').textContent = '도시';
  /* ⚠ 여기서 한 번 부릅니다 — 시트를 «안 열어도» 컨트롤 글자와 개수가
     맞아야 합니다. 시트 여는 쪽에서만 채우면 처음엔 늘 「전체」로 보입니다. */
  거르개채우기();

  /* ⚠ 「직접 넣기」 안내를 걷었습니다(b670) — index.html 의 주석 참고. */
  if (!list.length){
    $('ratelist').innerHTML = '<div class="empty">찾는 도시가 없어요.</div>';
    lastRateHtml = '';
    return;
  }

  /* 끝까지 내리면 더 불러옵니다. 80곳에서 자르고 "검색하세요" 라고만 하면
     222곳이 영영 안 보입니다. */
  const html = list.slice(0, rateShown).map(c => {
    const r = myRates[c.id] || {}, s = cityStat[c.id];
    const todo = visited.has(c.id) && r.stars == null;
    /* 사진이나 이름을 누르면 그 도시 페이지가 열립니다.
       별과 하트는 아래 처리에서 먼저 걸러지므로 여기 걸리지 않습니다. */
    return `<div class="rrow" data-cityopen="${esc(c.id)}">
      ${c.image_url
        ? `<img class="thumb" src="${esc(c.image_url)}" alt="" loading="lazy"
               onerror="this.replaceWith(Object.assign(document.createElement('span'),
                 {className:'thumb ph', textContent:'${esc(c.name.slice(0,1))}'}))">`
        : `<span class="thumb ph">${esc(c.name.slice(0,1))}</span>`}
      <div class="t"><b>${esc(c.name)}</b>
        ${todo ? '<span class="ktag" style="--kc:#f5a623">평가 대기</span>' : ''}
        <span class="memo">${esc(cityCountry(c))}${
          visited.has(c.id) ? ' · 다녀옴' : ''}${avgTail(s, r)}</span>
      </div>
      <span class="stars" data-city="${esc(c.id)}">${starHtml(r.stars)}</span>
      <button class="ghost want${r.want ? ' on' : ''}" data-want="${esc(c.id)}"
              title="가보고 싶어요">♡</button>
    </div>`;
  }).join('') + (list.length > rateShown
    ? '<div class="empty" id="ratemore">더 불러오는 중…</div>' : '');

  /* ⚠ **같은 것을 다시 그리면 사진이 깜빡입니다** (실기기에서 지적받음).
     `ctx.showApp('rate')` 가 탭을 누를 때마다 `loadRatings()` 를 부르고, 여기가
     `innerHTML` 을 갈아끼웁니다. 글자는 똑같이 다시 그려도 티가 안 나는데
     **`<img>` 80개는 통째로 버려졌다가 새로 만들어져서** 빈 칸이 보였다가
     채워집니다. 같은 주소인데도 그렇습니다 — 요소가 새것이라 처음부터
     다시 그리는 것이라서요.
     → **글자가 한 자도 안 달라졌으면 손대지 않습니다.** 그러면 사진 요소가
       그대로 살아 있어 깜빡일 일이 없습니다.
     비교는 우리가 만든 글자끼리 합니다 — `el.innerHTML` 을 도로 읽으면
     브라우저가 따옴표와 속성 순서를 제 식대로 바꿔 놓아서 **늘 다르다고 나옵니다.** */
  if (html !== lastRateHtml){
    $('ratelist').innerHTML = html;
    lastRateHtml = html;
  }
  /* 바닥에 닿으면 더 그립니다. 스크롤 값을 재는 것보다 어긋날 자리가 적습니다. */
  const more = $('ratemore');
  if (more){
    rateObs?.disconnect();
    rateObs = new IntersectionObserver(es => {
      if (!es[0].isIntersecting) return;
      rateShown += 60; rateObs.disconnect(); drawRatings();
    }, { rootMargin:'400px' });
    rateObs.observe(more);
  }
}

/* ⚠⚠ **여기 있던 「직접 넣기」 처리기를 걷었습니다(b670).**
   `sb.from('cities').insert(...)` 로 사용자가 도시를 만들 수 있었습니다
   (db/017 이 열어둔 것). 목록은 «남들과 같이 보는 것»이라 한 사람이 넣은
   이상한 이름을 모두가 봅니다. 도시가 701곳이 된 지금은 「없으면 직접」의
   필요도 거의 없습니다.
 ⚠ **화면과 코드만 지우면 문은 열려 있습니다** — RLS 정책도 같이
   닫았습니다(db/082). 되살리려거든 셋을 다 되살려야 합니다:
   index.html 의 `#addcity` · 여기 · db 정책. */

/* ── 시트(b676) ───────────────────────────────────────────────────────
 * ⚠ 항목은 **자료에서 만듭니다.** 대륙·국가 목록을 코드에 적으면
 *   도시를 넣고 뺄 때마다 여기도 고쳐야 합니다.
 * ⚠ 세는 것은 **거르기 «전»**입니다 — 거른 뒤에 세면 고른 칸만 숫자가
 *   남고 나머지가 전부 0 이 됩니다(보관함 시트에서 겪은 것과 같음).
 * ⚠ 국가는 **도시 많은 순**입니다. 192개국 중 114개는 도시가 한 곳뿐이라
 *   가나다순이면 쓸모없는 것이 위로 옵니다. */
function 거르개채우기(){
  const 안매긴 = (cities || []).filter(c =>
    myRates[c.id]?.stars == null || justRated.has(c.id));

  const 대륙셈 = {}, 나라셈 = {};
  for (const c of 안매긴){
    const k = 대륙of(c);
    대륙셈[k] = (대륙셈[k] || 0) + 1;
    /* 국가 칸은 «고른 대륙 안»만 셉니다 — 아시아를 골랐는데 프랑스가
       목록에 남아 있으면 누를 때마다 0곳이 됩니다. */
    if (rtCont === 'all' || k === rtCont){
      const cc = 모국(c);
      나라셈[cc] = (나라셈[cc] || 0) + 1;
    }
  }

  const 칸 = (그룹, 값, 글, 수, 켬) =>
    `<button type="button" class="shopt${켬 ? ' on' : ''}" data-${그룹}="${
      esc(값)}"${수 === 0 ? ' disabled' : ''}>${esc(글)}<i>${수}</i></button>`;

  $('rt_conts').innerHTML = '<span class="label">대륙</span>' +
    칸('rtcont', 'all', '전체', 안매긴.length, rtCont === 'all') +
    Object.entries(대륙셈).sort((a, b) => b[1] - a[1])
      .map(([k, n]) => 칸('rtcont', k, k, n, rtCont === k)).join('');

  const 나라합 = Object.values(나라셈).reduce((a, b) => a + b, 0);
  $('rt_ctrys').innerHTML = '<span class="label">국가</span>' +
    칸('rtctry', 'all', '전체', 나라합, rtCtry === 'all') +
    Object.entries(나라셈)
      .sort((a, b) => b[1] - a[1]
                   || (countryName[a[0]] || a[0]).localeCompare(countryName[b[0]] || b[0], 'ko'))
      .map(([cc, n]) => 칸('rtctry', cc, countryName[cc] || cc, n, rtCtry === cc)).join('');

  $('rt_cont').textContent = rtCont === 'all' ? '대륙 전체' : rtCont;
  $('rt_ctry').textContent = rtCtry === 'all' ? '국가 전체'
                                              : (countryName[rtCtry] || rtCtry);
  /* 거르개가 걸리면 컨트롤이 «걸려 있다»고 말해야 합니다 — 목록이 왜
     짧은지 모르는 것이 이 화면에서 제일 나쁜 일입니다. */
  $('rt_cont').classList.toggle('on', rtCont !== 'all');
  $('rt_ctry').classList.toggle('on', rtCtry !== 'all');
}

export function 나라거르개열기(){
  거르개채우기();
  $('rtsheet').classList.remove('hide');
  if (history.state?.t2 !== 'rtsheet') history.pushState({ t2:'rtsheet' }, '');
}
export function 나라거르개닫기(뒤로온것){
  const 판 = $('rtsheet');
  if (!판 || 판.classList.contains('hide')) return;
  if (!뒤로온것 && history.state?.t2 === 'rtsheet'){ history.back(); return; }
  판.classList.add('hide');
}

$('r_filter').addEventListener('click', () => 나라거르개열기());
$('rtsheet').addEventListener('click', e => {
  if (e.target.closest('[data-rtclose]')) return 나라거르개닫기();
  const a = e.target.closest('[data-rtcont]');
  if (a && !a.disabled){
    rtCont = a.dataset.rtcont;
    /* ⚠ 대륙을 바꾸면 «고른 나라»가 그 안에 없을 수 있습니다. 안 풀면
       목록이 0곳이 되고 왜 그런지 알 수가 없습니다. */
    if (rtCtry !== 'all' && rtCont !== 'all'
        && (continentOf[rtCtry] || '기타') !== rtCont) rtCtry = 'all';
    거르개채우기(); drawRatings(); return;
  }
  const b = e.target.closest('[data-rtctry]');
  if (b && !b.disabled){ rtCtry = b.dataset.rtctry; 거르개채우기(); drawRatings(); }
});

$('r_q').addEventListener('input', drawRatings);

$('ratelist').addEventListener('click', async e => {
  /* 별 왼쪽 절반은 반 개, 오른쪽 절반은 한 개 — 왓챠피디아와 같은 방식입니다. */
  const st = e.target.closest('.st');
  if (st){
    const wrap = st.closest('.stars'), cityId = wrap.dataset.city;
    const v = starValue(st, e.clientX);   /* 반칸 규칙은 stars.js 한 곳(b491) */
    /* 같은 점수를 다시 누르면 지웁니다. 잘못 누른 것을 되돌릴 길이 있어야 합니다.
       "다녀옴"은 따로 켜지 않습니다 — 별점이 있으면 다녀온 것으로 계산됩니다. */
    const cur = myRates[cityId]?.stars;
    /* ⚠ **0 도 「지우기」입니다(b501).** 별을 끌어 맨 왼쪽까지 가면 0 이
       옵니다. 자료는 `saveRate` 가 알아서 `dropRate` 로 보내는데(b494),
       **화면은 그걸 몰라서** 「★ 0 기록」 딱지가 붙었습니다 — 지웠는데
       0점을 준 것처럼 보였습니다. 아래 `paintStars`·`markRated` 가 이
       값을 그대로 쓰므로 여기서 null 로 만들어야 합니다. */
    const next = (v === 0 || Number(cur) === v) ? null : v;
    /* 저장을 기다리지 않고 먼저 칠합니다. 여기서는 줄을 옮기지도 지우지도 않습니다. */
    paintStars(wrap, next, true);
    markRated(st.closest('.rrow'), next);
    /* 줄을 직접 손댔습니다(별 칠하기 · ★기록 딱지). 만든 글자에는 그 딱지가
       없으므로, 여기서 무효로 해두지 않으면 다음 그리기가 "같다"고 건너뛰어
       화면과 어긋난 채로 남습니다. */
    lastRateHtml = '';
    await saveRate(cityId, { stars: next }, true);
    return;
  }
  const w = e.target.closest('button[data-want]');
  if (w) return saveRate(w.dataset.want, { want: !myRates[w.dataset.want]?.want });

  /* 별과 하트가 아니면 도시 페이지를 엽니다. */
  const row = e.target.closest('[data-cityopen]');
  if (row) await openCity(row.dataset.cityopen);
});

/* ── 별점 취소 — 줄을 통째로 지웁니다(b407) ──────────────────────────
 * ⚠ **`saveRate(id, { stars: null })` 과 다릅니다.** 그건 줄을 남기고,
 *   남은 줄은 "이미 물어본 곳"이라 **다시는 안 물어봅니다**(fillQuiz).
 *   잘못 눌러서 취소한 도시가 영영 안 나오면 안 됩니다.
 *   가르는 이유는 rate.js 의 `removeRate` 머리말에 적어뒀습니다.
 *
 * ⚠ **♡ 나 메모가 있으면 안 지웁니다.** 그건 사용자가 따로 남긴 것이라
 *   별점을 무른다고 같이 없어지면 안 됩니다. 그때는 별점만 비웁니다. */
export async function dropRate(cityId){
  const cur = myRates[cityId] || {};
  if (cur.want || (cur.comment || '').trim())
    return saveRate(cityId, { stars: null }, true);

  const r = await sb.from('city_ratings').delete()
    .eq('user_id', ctx.me().id).eq('city_id', cityId).select('city_id');
  if (r.error) return fail(r.error, 'rate');
  removeRate(cityId);
  /* 다녀온 곳은 지난 여행에서도 오므로 서버에 다시 물어야 맞습니다. */
  await refreshVisited();
  const s = await sb.rpc('city_stats', { p_city: cityId });
  putCityStat(cityId, s.data?.[0]);
}

export async function saveRate(cityId, patch, quiet){
  /* ⚠⚠ **0 은 「지우기」입니다(b494).** ⚠⚠ 별을 끌어 맨 왼쪽까지 가면
   *   0 이 옵니다. 그대로 저장하면 **「0점을 준 곳」이라는 없는 상태**가
   *   생기고, 별점 없는 줄은 이 앱에서 「안 가봤어요」라서(b407) 뜻까지
   *   뒤집힙니다.
   * ⚠ **`{stars:null}` 이 아니라 `dropRate` 입니다.** 취소는 줄을 지우는
   *   것이고, 별점 없는 줄을 남기는 것은 「안 가봤어요」입니다 — b407 에서
   *   갈라 놓은 것입니다. `dropRate` 가 ♡·한줄평이 있으면 알아서 줄을
   *   남기고 별점만 비웁니다.
   * ⚠ **여기 한 곳에서 막습니다.** 별을 누르는 자리가 아홉 군데인데 거기
   *   마다 적으면 언젠가 한 곳이 빠집니다. 저장은 전부 여기를 지납니다. */
  if (patch && patch.stars === 0) return dropRate(cityId);
  const r = await sb.from('city_ratings')
    .upsert({ user_id: ctx.me().id, city_id: cityId, ...patch },
            { onConflict: 'user_id,city_id' })
    .select('city_id,stars,want,comment,journal,journal_photo').maybeSingle();
  if (r.error) return fail(r.error, 'rate');
  /* 별점 · 방금 매긴 것 · 다녀온 곳을 **한 번에** 맞춥니다(rate.js).
     셋을 따로 적으면 그중 하나를 빠뜨립니다. 별을 지운 경우만 다녀온 곳을
     여기서 못 정합니다 — 지난 여행 기록이 있으면 그대로 다녀온 곳이라
     서버에 다시 물어야 합니다. 물어야 하는지는 rate.js 가 알려줍니다. */
  if (applyRate(cityId, r.data, patch).recount) await refreshVisited();
  /* 평균은 남들 것까지 합친 값이라 다시 받아야 맞습니다. */
  const s = await sb.rpc('city_stats', { p_city: cityId });
  putCityStat(cityId, s.data?.[0]);
  /* 조용히 저장할 때는 다시 그리지 않습니다 — 누른 줄이 제자리에 있어야 합니다. */
  if (!quiet) drawRatings();
}

