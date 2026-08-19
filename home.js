/* ── 홈 · 여기 가봤어요 · 내 발자국 ───────────────────────────────────
 * 앱을 열면 처음 보는 화면입니다. 다가오는 여행 히어로, 끝난 여행에 후기를
 * 남기라는 줄, 도시 별점 퀴즈, 그리고 다녀온 나라 발자국까지.
 *
 * ── app.js 에서 떼어낸 열여덟 번째 조각입니다(b344) ──────────────────
 * **홈과 퀴즈는 서로를 부릅니다.** 홈이 퀴즈 줄(`renderQuiz`)과 발자국
 * (`renderFoot`)을 자기 화면에 얹고, 퀴즈는 별을 매긴 뒤 홈을 다시 그립니다
 * (`loadHome`). 따로 떼면 둘이 서로를 import 하는 고리가 됩니다 —
 * **한 파일로 묶는 것이 맞습니다.** 666줄로 지금까지 중 제일 큽니다.
 *
 * app.js 만 아는 것은 셋입니다 — 로그인한 사람, 여행 열기, 앱 화면 켜기.
 * `quizPool`·`quizFilled`·`quizFilling`·`lastHomeSig` 는 이 블록에서만
 * 쓰던 상태라 같이 데려왔습니다. `lastHomeSig` 만 app.js 가 로그아웃할 때
 * 되돌려야 해서 길(`resetHomeSig`)을 냅니다.
 *
 * 층: 아래층 여럿과 이미 떼어낸 조각들(city · citysearch · rating · map ·
 *     report · newtrip)을 씁니다. 그쪽은 이 파일을 안 부르므로 고리가
 *     생기지 않습니다 — 저쪽이 홈을 다시 그릴 때는 ctx 를 씁니다. */
import { $, esc } from './dom.js?v=b379';
import { sb } from './db.js?v=b379';
import { fail, netTimeout, netIsDown, drawOffbar, cacheGet, cacheSet } from './net.js?v=b379';
import { D1, asDate, hm, todayYmd } from './calc.js?v=b379';
import { starHtml, paintStars, markRated } from './stars.js?v=b379';
import { cities, countryName } from './cities.js?v=b379';
import { myRates, visited } from './rate.js?v=b379';
import { plans } from './trip.js?v=b379';
import { openCity } from './city.js?v=b379';
import { loadCities, pick } from './citysearch.js?v=b379';
import { saveRate, refreshVisited, tripSub } from './rating.js?v=b379';
import { openMap, UN_COUNTRIES } from './map.js?v=b379';
/* `aiPrompt` 는 무엇을 권할지만 정합니다 — 여행이 있을 때는 히어로 단추로,
   없을 때는 `renderAiCard` 가 카드로 그립니다(b377). */
import { drawReport, renderAiCard, aiPrompt } from './report.js?v=b379';
import { PERSONA_BG } from './card.js?v=b379';
import { openNew } from './newtrip.js?v=b379';

let ctx = { me: () => null, openTrip: async () => {}, showApp: () => {} };
export function setHomeCtx(o){ ctx = { ...ctx, ...o }; }

/* 홈을 마지막으로 그린 글자. 같으면 다시 안 그립니다 — 사진이 깜빡이는
   것을 막습니다(rating.js 의 lastRateHtml 과 같은 수법).
   **app.js 의 상태 뭉치에 있던 것을 여기로 옮겼습니다(b344).**
   로그아웃할 때만 밖에서 되돌리므로 그 길만 내보냅니다. */
let lastHomeSig = '';
export function resetHomeSig(){ lastHomeSig = ''; }

/* ── 홈 ─────────────────────────────────────────────────────────────
 * 세 덩어리입니다.
 *   ① 히어로   — 다음 여행을 도시 사진 위에. 여행이 없으면 가고 싶은 곳.
 *   ② 가봤어요 — 안 매긴 도시 한 곳에 별을 매깁니다.
 *   ③ 발자국   — 195개국 중 몇 곳인지.
 *
 * ①은 1년에 두세 번만 의미가 있습니다. 나머지 360일을 ②③이 채웁니다.
 * 일정과 검토는 홈에서 뺐습니다 — 여행 탭과 AI 탭에 이미 있습니다. */

/* 사진은 구간에 붙은 도시에서 가져옵니다.
   예전에 만든 여행은 trips.city_id 가 비어 있어서 구간을 먼저 봅니다. */
export async function tripPhoto(t){
  /* **나라도 같이 받아옵니다.** 아래 대체 사진이 나라를 알아야 하는데,
     `t.country` 는 부르는 두 곳(buildHome · pendingTrip)의 select 에 **없습니다**
     (재봄). 부르는 쪽을 둘 다 고치는 대신, 구간에서 가져옵니다 —
     구간에는 늘 나라가 붙어 있고 여기서 이미 한 번 물어보고 있습니다. */
  const lg = await netTimeout(sb.from('trip_legs')
    .select('city_id, country, cities(image_url)').eq('trip_id', t.id).order('start_date'));
  const hit = (lg.data || []).find(l => l.cities?.image_url);
  if (hit) return hit.cities.image_url;
  const country = (lg.data || []).find(l => l.country)?.country || t.country;
  /* 구간에 도시가 안 붙어 있으면 이름으로 마지막 한 번 찾아봅니다. */
  const c = await netTimeout(sb.from('cities').select('image_url')
    .eq('name', t.destination).not('image_url', 'is', null).limit(1));
  if (c.data?.[0]?.image_url) return c.data[0].image_url;

  /* ── 그래도 없으면 **같은 나라의 대표 도시** 사진을 빌립니다 ──────────
   * '삼척'처럼 우리 목록에 없는 곳으로 만든 여행은 여기까지 옵니다.
   * 그때 색만 깔면 화면에서 제일 큰 자리가 빈 덩어리가 됩니다(b281).
   * 도시는 몰라도 **나라는 압니다.** 그 나라에서 한 곳을 빌려 옵니다.
   *
   * 고르는 순서: `pop_rank`(나라마다 한 곳씩 매겨둔 대표) → 없으면
   * `fame` 이 낮은 것(1 이 누구나 아는 곳). **pop_rank 는 88개국 중
   * 16개국에만 있어서** 그것만으로는 대부분의 나라에서 못 고릅니다.
   * 이름순을 마지막 기준으로 둡니다 — 같은 여행이 열 때마다 다른 사진이면
   * "내 여행"으로 안 읽힙니다. **늘 같은 것이 나와야 합니다.**
   *
   * ⚠ **이 사진은 그 사람이 가는 곳이 아닙니다.** 삼척 여행에 강릉 사진이
   * 걸립니다(같은 강원도 동해안이라 그럴듯하지만, 프랑스 시골 여행에 파리
   * 사진이 걸리는 경우도 있습니다). 그래서 **제목과 밑줄은 늘 진짜 목적지**를
   * 적습니다 — 사진은 분위기고, 어디로 가는지는 글자가 말합니다.
   * 지역까지 맞추려면 구간에 좌표가 있어야 하는데, 직접 쳐서 만든 구간은
   * `center_lat` 이 비어 있어(재봄) 거리로는 못 고릅니다. */
  if (!country) return null;
  const n = await netTimeout(sb.from('cities')
    .select('image_url,pop_rank,fame,name')
    .eq('country', country).not('image_url', 'is', null)
    .order('pop_rank', { ascending: true, nullsFirst: false })
    .order('fame',     { ascending: true, nullsFirst: false })
    .order('name').limit(1));
  return n.data?.[0]?.image_url || null;
}

/* ── 사진이 없을 때의 히어로 ──────────────────────────────────────────
 * 도시 사진은 469곳에 다 있지만 **'삼척 여행'처럼 목록에 없는 곳으로 만든
 * 여행은 사진이 없습니다.** 그때 밋밋한 회색 판이 떴는데, 홈에서 제일 큰
 * 자리가 회색이면 앱이 덜 만들어진 것처럼 보입니다.
 *
 * 색을 이름에서 뽑습니다 — **같은 여행은 늘 같은 색**이라야 "내 여행"으로
 * 읽힙니다. 무작위면 열 때마다 달라져서 오히려 거슬립니다.
 * 색표는 성향 카드가 쓰는 것을 그대로 빌립니다(card.js 의 PERSONA_BG) —
 * 앱 안에서 색이 두 벌이 되면 같은 앱처럼 안 보입니다. */
const HERO_BG = ['rare', 'deep', 'taste', 'size', 'plan', 'spend', 'speed'];
export function heroTint(seed){
  const s = String(seed || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PERSONA_BG[HERO_BG[h % HERO_BG.length]];
}

/* 히어로 단추에 붙는 AI 표시. **상단바의 것과 같은 그림입니다**(index.html
   의 `#aibtn`) — 앱에서 'AI 가 해준다'는 이 별 두 개입니다. 두 곳에 그리지만
   같은 모양이어야 뜻이 통합니다. */
const AI_MARK =
  `<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"
        style="margin-right:5px; vertical-align:-3px; color:var(--primary)">
     <path d="M11 3l1.7 4.6L17 9.3l-4.3 1.7L11 15.6 9.3 11 5 9.3l4.3-1.7z"/>
     <path d="M18 14.4l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" opacity=".7"/>
   </svg>`;

function heroHtml(photo, dd, title, memo, btn, ai){
  /* 사진이 없으면 색을 깝니다. `.hero::after` 가 위에 어둡게 덮으므로
     글자는 사진이 있을 때와 똑같이 읽힙니다.
     **`noimg` 를 같이 답니다** — 사진이 없으면 236px 을 채울 것이 없어서
     위쪽 절반이 빈 색 덩어리로 남습니다(사용자 지적). 높이 규칙을 갈라야
     하는데, 그건 CSS 가 알아야 하므로 클래스로 알려줍니다. */
  const tint = photo ? '' : ` style="background:${heroTint(title + memo)}"`;
  return `<div class="hero${photo ? '' : ' noimg'}" id="hero"${tint}>
    ${photo ? `<img src="${esc(photo)}" alt="" onerror="this.remove()">` : ''}
    ${dd ? `<div class="dd">${esc(dd)}</div>` : ''}
    <div class="ht">${esc(title)}</div>
    ${/* ⚠ **단추를 밑에 또 쌓으면 왼쪽 아래가 무거워집니다**(b379). 히어로는
          `justify-content:flex-end` 라 D-23 · 도시 · 날짜 · 단추가 **왼쪽 아래에
          네 층으로** 쌓였고, 사진은 위쪽만 보이는데 글은 아래로 처졌습니다.
          날짜와 **같은 줄**에 두고 단추만 오른쪽으로 보냅니다 — 층이 하나
          줄고 좌우로 나뉘어 사진이 더 보입니다.

          글자는 b378 에서 정한 대로 짧게 두고 아이콘이 '누가'를 맡습니다.
          (원래 카드는 두 줄이었고 뜻은 아랫줄이 지고 있었는데, 단추 하나로
          압축하면서 그 줄을 버린 것이 `뭐 더 넣을까 묻기` 였습니다.) */''}
    <div class="hrow">
      <div class="hm">${esc(memo)}</div>
      ${btn ? `<button class="hbtn" id="herobtn">${ai ? AI_MARK : ''}${esc(btn)}</button>` : ''}
    </div>
  </div>`;
}

/* 홈은 받아올 것이 여럿입니다(도시·다음 여행·평가·발자국).
   하나라도 실패하면 그대로 멈춰서 "불러오는 중…"만 남았습니다.
   중간에 죽어도 화면에는 뭐라도 남기고, 왜 그런지 말합니다. */
export async function loadHome(){
  /* **오프라인이라고 미리 포기하지 않습니다 (b242).**
     전에는 `if (netIsDown()) return offHome();` 로 시작했습니다. "어차피 하나도
     못 오니 물어보지 말고 바로 알리자"는 뜻이었는데, buildHome 은 다음 여행을
     **캐시에서 꺼내 그릴 줄 압니다**(cacheGet('nexttrip')).
     그래서 비행기모드에서 처음 열면 D-35 히어로가 멀쩡히 나오는데,
     여행 탭에 갔다 오면 그때는 netIsDown() 이 참이 되어 있어서 같은 화면이
     "홈은 지금 볼 수 없어요"로 바뀌었습니다 — **뒤로 갈수록 못 보게 되는 셈**이라
     사용자가 바로 알아챘습니다.
     이제 질의가 전부 netTimeout 을 지나고, netTimeout 은 끊긴 걸 알면 **요청을
     아예 안 만들고 즉시 돌아옵니다.** 기다릴 것이 없으니 미리 포기할 이유도
     없어졌습니다. 그려보고, 정말 아무것도 못 그렸을 때만 안내합니다. */
  /* 오프라인 안내는 한 곳에서만 만듭니다. 아래 두 군데가 같은 말을 해야 하는데
     따로 적으면 갈립니다. */
  const offHome = () => {
    $('home').innerHTML =
      `<div class="card"><div class="empty" style="padding:26px 12px">
         연결이 없어 홈은 지금 볼 수 없어요.<br>
         <span class="memo">다음 여행 · 평가 · 발자국은 서버에서 가져옵니다.</span>
         <div style="margin-top:14px; font-size:var(--f-lg)">
           <b>여행</b> 탭은 지금도 쓸 수 있어요.<br>
           <span class="memo">한 번이라도 열어본 여행은 일정 · 지출 · 준비물까지
           그대로 보입니다.</span></div>
         <div style="margin-top:16px">
           <button class="primary" id="hometotrip">여행 보러 가기</button></div>
       </div></div>`;
    $('hometotrip').onclick = () => ctx.showApp('trips');
    drawOffbar();
  };
  /* 그린 것이 있나. **자리표시자("불러오는 중…")는 그린 것이 아닙니다** —
     그게 남아 있으면 계속 돌기만 하고 사용자는 곧 뜰 줄 압니다. */
  const 그렸나 = () => !$('home').querySelector('.load') &&
                       !!$('home').querySelector('.hero, .card, .rvbar');
  try {
    await buildHome();
    if (!그렸나()) offHome();
    else if (netIsDown()) drawOffbar();   /* 캐시로 그렸으면 그렇다고 띠를 띄웁니다 */
  }
  catch (e){
    if (그렸나()) return drawOffbar();    /* 도중에 죽었어도 뭔가 남았으면 둡니다 */
    if (netIsDown()) return offHome();
    $('home').innerHTML =
      `<div class="card"><div class="empty">홈을 불러오지 못했어요.<br>
         <button class="small" id="homeretry" style="margin-top:10px">다시 시도</button>
       </div></div>`;
    $('homeretry').onclick = loadHome;
    drawOffbar();
  }
}

async function buildHome(){
  const today = todayYmd();
  await loadCities();          /* 나라 이름과 도시 페이지에 필요합니다. 한 번만 받습니다. */

  /* 다녀왔는데 아직 별점을 안 매긴 여행. 앞으로 갈 여행이 먼저이므로
     그때는 히어로 아래 얇은 띠로만 붙입니다 — 위가 두 덩어리가 되면 무겁습니다. */
  const pend = await pendingTrip();
  const rvBar = () => {
    if (!pend) return;
    const b = document.createElement('div');
    b.className = 'rvbar';
    b.innerHTML = `<span class="t"><b>${esc(pend.trip.title)} 어땠어요?</b>
        <span>다녀오신 곳을 평가해주세요${
          pend.places.length ? ` · ${pend.places.length}곳` : ''}</span></span>
      <span class="go">평가 ›</span>`;
    b.onclick = () => openReviewTrip(pend.trip.id);
    $('home').appendChild(b);
  };

  let { data, error } = await netTimeout(sb.from('trips')
    .select('id,title,destination,start_date,end_date,currency,timezone')
    .gte('end_date', today)
    .order('start_date').limit(1));
  /* 다음 여행은 여행 중에 제일 보고 싶은 것입니다. 캐시로라도 보여줍니다. */
  if (error){
    data = cacheGet('nexttrip');
    if (!data) throw error;
    drawOffbar();
  } else cacheSet('nexttrip', data);

  /* 앞으로 갈 여행이 없고 평가만 남았으면, 그때는 평가를 크게 겁니다. */
  if (!data.length && pend){
    const photo = await tripPhoto(pend.trip);
    $('home').innerHTML = heroHtml(photo, '',
      `${pend.trip.title} 어땠어요?`,
      '다녀오신 곳을 평가해주세요' +
      (pend.places.length ? ` · ${pend.places.length}곳` : ''), '평가하기');
    $('hero').onclick = () => openReviewTrip(pend.trip.id);
    $('herobtn').onclick = e => { e.stopPropagation(); openReviewTrip(pend.trip.id); };
    renderAiCard(null, 0);
  await renderQuiz(); await renderFoot();
    return;
  }

  if (!data.length){
    /* 여행이 없으면 가고 싶다고 표시한 곳을 겁니다. 그것도 없으면 아무 곳이나 —
       빈 화면보다는 사진 한 장이 훨씬 낫습니다. */
    const w = await netTimeout(sb.from('city_ratings').select('cities(id,name,country,image_url)')
      .eq('user_id', ctx.me().id).eq('want', true).limit(20));
    const pool = (w.data || []).map(r => r.cities).filter(c => c?.image_url);
    let pick = pool[Math.floor(Math.random() * pool.length)] || null;
    const wanted = !!pick;
    if (!pick){
      const any = await netTimeout(sb.from('cities').select('id,name,country,image_url')
        .not('image_url', 'is', null).limit(60));
      const l = any.data || [];
      pick = l[Math.floor(Math.random() * l.length)] || null;
    }
    /* **히어로에는 단추를 안 답니다.** 예전에는 여기에도 '새 여행'이 있어서
       바로 아래 AI 카드의 '시작'과 같은 일을 하는 단추가 둘이었습니다.
       홈에서 여행을 만드는 길은 4단계 카드 하나입니다.
       이 사진은 "여기 어때요?" 하는 자리고, 누르면 그 도시를 보여줍니다. */
    $('home').innerHTML = heroHtml(
      pick?.image_url, '',
      pick ? `${pick.name}, 어때요?` : '아직 잡아둔 여행이 없어요',
      !pick   ? '아래에서 첫 여행을 만들어보세요'
      : wanted ? '가보고 싶다고 표시해둔 곳이에요'
               : (countryName[pick.country] || pick.country),
      '');
    if (pick?.id) $('hero').onclick = () => openCity(pick.id);
    /* 여행이 없으면 AI 로 시작하는 것이 첫 걸음입니다. 맨 위에 둡니다. */
    renderAiCard(null, 0);
  await renderQuiz(); await renderFoot();
    return;
  }

  const t = data[0];
  const dday = Math.round((asDate(t.start_date) - asDate(today)) / D1);
  const days = Math.round((asDate(t.end_date) - asDate(t.start_date)) / D1) + 1;
  /* 여행 중이면 남은 날이 아니라 며칠째인지가 궁금합니다.
     사진 위에 크게 올라가는 자리라 짧아야 합니다. */
  const badge = dday > 0 ? `D-${dday}`
              : dday === 0 ? 'D-DAY'
              : `Day ${Math.round((asDate(today) - asDate(t.start_date)) / D1) + 1}`;

  /* 여행 중이면 오늘 몇 개인지만 한 줄로 얹습니다.
     일정 목록 자체는 여행 탭에 있으니 홈에서 또 늘어놓지 않습니다. */
  const [photo, cnt, all] = await Promise.all([
    tripPhoto(t),
    netTimeout(sb.from('plans').select('id', { count:'exact', head:true })
      .eq('trip_id', t.id).is('deleted_at', null).eq('date', today)),
    /* 이 여행에 일정이 하나라도 있나. 아래 AI 카드가 무슨 말을 할지 정합니다 —
       일정이 비어 있으면 그게 지금 제일 급한 일입니다. */
    netTimeout(sb.from('plans').select('id', { count:'exact', head:true })
      .eq('trip_id', t.id).is('deleted_at', null)),
  ]);

  const n = cnt.count || 0;

  /* ── 자료가 그대로면 홈을 아예 다시 그리지 않습니다 ──────────────────
     홈은 히어로를 `innerHTML` 로 지우고 그 뒤에 평가·새여행·퀴즈·발자국을
     **덧붙이는** 구조라, 목록 하나만 지키는 방식(putHtml)으로는 안 됩니다.
     히어로를 지우는 순간 뒤에 붙은 것이 전부 같이 날아가기 때문입니다.
     그래서 **그릴 내용이 같은지를 먼저 보고** 같으면 통째로 건너뜁니다.
     사용자가 "홈의 평가·지도가 아직 깜빡인다"고 한 것이 이것입니다.

     지문에 넣을 것은 **화면에 실제로 나오는 값**입니다. 퀴즈에 뜬 도시와
     별점·다녀온 곳 수까지 넣어야 합니다 — 기록 탭에서 별을 매기고 홈으로
     오면 발자국 숫자와 퀴즈 줄이 달라져야 하니까요. */
  const sig = [photo, badge, t.id, t.title, days, n, all.count,
               pend?.trip?.id || '', quizPool.slice(0, QUIZ_ROWS).map(c => c.id).join(),
               visited.size, Object.keys(myRates || {}).length,
               /* '가보고 싶어요' 를 누르면 아래 '확실한 것' 카드가 달라져야 합니다. */
               Object.values(myRates || {}).filter(r => r.want).length].join('|');
  if (sig === lastHomeSig && $('home').querySelector('.hero')) return;
  lastHomeSig = sig;

  /* ── 히어로 하나가 그 여행을 통째로 말합니다 (b377, C) ────────────────
     전에는 히어로(`도쿄`) 바로 밑에 AI 카드가 따로 서서 `도쿄, 뭐 더
     넣을까요?` 라고 했습니다. **같은 여행 이야기를 하는 덩어리가 둘**이라
     위가 무거웠습니다. 권유를 히어로의 단추로 넣습니다 — 무엇을 권할지
     정하는 곳은 그대로 report.js 한 곳입니다(`aiPrompt`). */
  const ai = aiPrompt(t, all.count || 0);
  $('home').innerHTML = heroHtml(photo, badge, t.title,
    tripSub(t, days) +
    (dday <= 0 ? (n ? ` · 오늘 ${n}개` : ' · 오늘은 비어 있어요') : ''),
    ai.heroGo, true);          /* true = AI 표시를 단추 앞에 붙입니다 */
  $('hero').onclick = () => ctx.openTrip(t.id);
  /* 히어로를 누르면 여행이 열리므로 단추는 번짐을 막아야 합니다. */
  $('herobtn').onclick = e => { e.stopPropagation(); ai.go2(); };

  /* ── 히어로 밑에는 얇은 줄 둘 (b378) ─────────────────────────────────
     b377 에서 "권유는 하나만" 이라며 평가가 있으면 새 여행을 감췄는데
     **틀렸습니다.** 홈에서 다음 여행에 일정을 더하는 것도, 새 여행을 짜는
     것도 다 돼야 합니다 — 그리고 이건 **이미 한 번 고쳤던 버그**입니다.
     바로 아래 CSS 주석에 "새 여행으로 가는 길을 홈에 남겨둡니다. AI 카드가
     '다음 여행' 이야기를 하게 되면서 여행이 이미 있는 사람은 홈에서 새
     여행을 못 만들게 됐습니다" 라고 적혀 있습니다. 제가 그걸 되살렸습니다.

     지저분했던 것은 **개수가 아니라 생김새가 셋**이었던 것입니다. AI 가
     히어로로 갔으니 둘만 남고, 둘을 같은 얇은 줄로 맞추면 한 식구로 읽힙니다.
     색만 갈라 둡니다 — 평가는 답을 기다리는 일(호박색), 새 여행은 언제나
     열려 있는 길(수수한 색). */
  if (pend) rvBar();
  const nt = document.createElement('div');
  nt.className = 'newtripbar';
  nt.innerHTML = `<span class="t"><b>다음에 어디 갈까요?</b>
      <span>어디로 언제 가는지만 정하면 돼요</span></span>
    <span class="go">새 여행 ›</span>`;
  nt.onclick = () => openNew();
  $('home').appendChild(nt);

  await renderQuiz();
  await renderFoot();
}

/* ── 여행 끝난 뒤 ────────────────────────────────────────────────────
 * 다녀오고 나면 앱을 안 엽니다. 그때 물어보는 것이 이 앱의 두 번째 축입니다.
 * 끝났는데 아직 별점을 안 매긴 여행이 있으면 홈 맨 위를 그것으로 채웁니다. */
let rvTrip = null;   /* shelfKind 는 shelf.js 로 옮겼습니다(b327) — 거기서만 씁니다 */

async function pendingTrip(){
  const today = todayYmd();
  /* **netTimeout 을 지나야 합니다.** 여기가 홈에서 제일 먼저 기다리는 질의인데
     맨몸으로 나가고 있었습니다. 비행기모드에서는 응답이 안 오고 실패도 안 나서
     여기서 멈췄고, 화면은 index.html 의 "불러오는 중…" 그대로 남았습니다.
     사용자가 "계속 도니까 실제로 불러와지는 줄 안다"고 한 것이 이것입니다. */
  const { data } = await netTimeout(sb.from('trips')
    .select('id,title,destination,start_date,end_date')
    .lt('end_date', today)
    .order('end_date', { ascending:false }).limit(5));
  if (!data?.length) return null;

  for (const t of data){
    const [lg, ps, cr, pr] = await Promise.all([
      netTimeout(sb.from('trip_legs').select('city_id').eq('trip_id', t.id).not('city_id','is',null)),
      netTimeout(sb.from('plans').select('id').eq('trip_id', t.id).is('deleted_at', null)
        .in('category', ['식사','카페'])),
      netTimeout(sb.from('city_ratings').select('city_id').eq('user_id', ctx.me().id).not('stars','is',null)),
      netTimeout(sb.from('plan_ratings').select('plan_id').eq('user_id', ctx.me().id).not('stars','is',null)),
    ]);
    const rated = new Set((cr.data || []).map(r => r.city_id));
    const done  = new Set((pr.data || []).map(r => r.plan_id));
    const cities = [...new Set((lg.data || []).map(l => l.city_id))].filter(id => !rated.has(id));
    const places = (ps.data || []).filter(p => !done.has(p.id)).map(p => p.id);
    if (cities.length || places.length) return { trip: t, cities, places };
  }
  return null;
}

/* 리포트로 가는 길이 홈의 "평가 안 한 여행" 띠 하나뿐이었습니다.
   평가를 마치면 그 띠가 사라지고 **리포트를 다시 볼 수 없었습니다.**
   공유 카드를 만들어 두고 정작 열 길이 없으면 소용이 없습니다.
   다녀온 여행 목록에서 바로 열 수 있게 합니다. */
export async function openTripReport(id){
  rvTrip = id;
  ['homeview','listview','rateview','aiview','setview','cityview','draftview','reviewview']
    .forEach(v => $(v).classList.add('hide'));
  $('reviewview').classList.remove('hide');
  if (history.state?.t2 !== 'rv') history.pushState({ t2:'rv' }, '');
  await loadCities();
  await drawReport(id);
}

async function openReviewTrip(id){
  rvTrip = id;
  ['homeview','listview','rateview','aiview','setview','cityview','draftview','reviewview']
    .forEach(v => $(v).classList.add('hide'));
  $('reviewview').classList.remove('hide');
  $('rv_report').classList.add('hide');
  $('rv_rate').classList.remove('hide');
  window.scrollTo({ top:0 });
  if (history.state?.t2 !== 'rv') history.pushState({ t2:'rv' }, '');

  await loadCities();
  const [t, lg, ps, cr, pr] = await Promise.all([
    sb.from('trips').select('title,start_date,end_date').eq('id', id).maybeSingle(),
    sb.from('trip_legs').select('city_id').eq('trip_id', id).not('city_id','is',null),
    sb.from('plans').select('id,title,category,date').eq('trip_id', id)
      .is('deleted_at', null).in('category', ['식사','카페','관광','쇼핑']).order('date'),
    sb.from('city_ratings').select('city_id,stars').eq('user_id', ctx.me().id),
    sb.from('plan_ratings').select('plan_id,stars').eq('user_id', ctx.me().id),
  ]);
  const cs = Object.fromEntries((cr.data || []).map(r => [r.city_id, r.stars]));
  const psr = Object.fromEntries((pr.data || []).map(r => [r.plan_id, r.stars]));

  $('rv_head').textContent = `${t.data?.title || '여행'} 어땠어요?`;
  $('rv_sub').textContent  = '다녀오신 곳을 평가해주세요. 건너뛰어도 괜찮아요.';

  const ids = [...new Set((lg.data || []).map(l => l.city_id))];
  $('rvt_cities').innerHTML = ids.length
    ? '<div class="daysep">도시</div>' + ids.map(cid => {
        const c = (cities || []).find(x => x.id === cid); if (!c) return '';
        return `<div class="rrow">
          ${c.image_url ? `<img class="thumb" src="${esc(c.image_url)}" alt="">`
                        : `<span class="thumb ph">${esc(c.name.slice(0,1))}</span>`}
          <div class="t"><b>${esc(c.name)}</b>
            <span class="memo">${esc(countryName[c.country] || c.country)}</span></div>
          <span class="stars" data-city="${esc(cid)}">${starHtml(cs[cid])}</span>
        </div>`;
      }).join('') : '';

  /* 먹은 곳과 본 곳을 나눠 묻습니다. 리포트에서 둘을 견줘 보여주려면
     따로 받아야 합니다 — "5만엔 오마카세보다 라멘에 별을 더 줬다" 같은 것. */
  const ICON = { 식사:'🍽', 카페:'☕', 관광:'📸', 쇼핑:'🛍' };
  const group = (title, list) => list.length
    ? `<div class="daysep">${title}</div>` + list.map(p => `<div class="rrow">
        <span class="thumb ph">${ICON[p.category] || '📍'}</span>
        <div class="t"><b>${esc(p.title)}</b><span class="memo">${esc(p.date)}</span></div>
        <span class="stars" data-plan="${esc(p.id)}">${starHtml(psr[p.id])}</span>
      </div>`).join('') : '';
  const all = ps.data || [];
  $('rv_places').innerHTML =
    group('먹은 곳', all.filter(p => ['식사','카페'].includes(p.category))) +
    group('본 곳',   all.filter(p => ['관광','쇼핑'].includes(p.category)));
}

export function closeReview(fromPop){
  if (!fromPop && history.state?.t2 === 'rv'){ history.back(); return; }
  $('reviewview').classList.add('hide');
  ctx.showApp('home');
}
$('rvback').addEventListener('click', () => closeReview());

/* 평가 줄. 도시는 city_ratings, 맛집은 plan_ratings 로 갑니다. */
$('rv_rate').addEventListener('click', async e => {
  const st = e.target.closest('.st'); if (!st) return;
  const wrap = st.closest('.stars');
  const box = st.getBoundingClientRect();
  const v = +st.dataset.n - ((e.clientX - box.left) < box.width / 2 ? 0.5 : 0);
  paintStars(wrap, v, true);
  if (wrap.dataset.city) await saveRate(wrap.dataset.city, { stars: v }, true);
  else await sb.from('plan_ratings').upsert(
    { user_id: ctx.me().id, plan_id: wrap.dataset.plan, stars: v },
    { onConflict: 'user_id,plan_id' });
});

/* ── 리포트 ──────────────────────────────────────────────────────────
 * 평가까지 마쳤으면 뭔가 남는 것이 있어야 합니다. 옆으로 넘겨 보는 카드로 냅니다. */
$('rv_done').addEventListener('click', () => drawReport(rvTrip));


/* ── 여기 가봤어요? ──────────────────────────────────────────────────
 * 안 매긴 도시를 몇 곳씩 늘어놓고 아는 곳에만 별을 답니다.
 * 한 곳씩 크게 물어보면 모르는 도시가 나왔을 때 할 일이 없습니다.
 * 줄 모양은 기록 탭과 같게 맞춥니다.
 * 전부 받아오면 무거우니 임의의 구간에서 스무 곳만 집어 씁니다. */
const QUIZ_ROWS = 5;
let quizPool = [], quizFilling = false, quizFilled = 0;

/* 처음 보이는 다섯 곳이 스플리트 · 브뤼헤 · 크레타뿐이면
   "나 이런 데 안 가봤는데" 하고 바로 닫습니다.
   누구나 이름은 아는 곳을 먼저 내보내고, 다른 도시 보기를 누를수록
   생소한 곳이 나오게 합니다. 유행이 아니라 인지도 기준입니다. */
const FAMOUS = new Set([
  'seoul','busan','jeju','gyeongju','jeonju','gangneung','sokcho',
  'tokyo','osaka','kyoto','fukuoka','sapporo','okinawa','nagoya','hakone','nara',
  'beijing','shanghai','xian','hongkong','macau','taipei','qingdao',
  'bangkok','chiangmai','phuket','pattaya','singapore','kualalumpur','bali','jakarta',
  'hanoi','hochiminh','danang','nhatrang','phuquoc','siemreap','manila','cebu','boracay',
  'guam','saipan','male','kathmandu','delhi','mumbai','agra','jaipur','colombo',
  'dubai','abudhabi','doha','istanbul','cappadocia','cairo','telaviv','petra',
  'paris','nice','london','edinburgh','dublin','rome','venice','florence','milan','naples',
  'barcelona','madrid','seville','granada','lisbon','porto','amsterdam','brussels',
  'berlin','munich','frankfurt','prague','vienna','salzburg','budapest','zurich',
  'interlaken','lucerne','zermatt','copenhagen','stockholm','helsinki','oslo','reykjavik',
  'athens','santorini','dubrovnik','krakow','warsaw',
  'newyork','losangeles','sanfrancisco','lasvegas','honolulu','seattle','chicago',
  'boston','washington','orlando','miami','toronto','vancouver','banff',
  'mexicocity','cancun','rio','buenosaires','lima','cusco',
  'sydney','melbourne','goldcoast','brisbane','cairns','auckland','queenstown',
  'capetown','marrakech','nairobi',
]);

async function fillQuiz(){
  if (quizFilling) return;
  quizFilling = true;
  try {
    /* 기록 탭에서 별점을 매겨도 여기 남아 있던 것을 막습니다.
       주머니를 들고 있다가 그대로 다시 그려서 이미 매긴 곳이 또 나왔습니다.
       매번 매긴 목록을 받아 걸러냅니다. */
    {
      const r = await sb.from('city_ratings').select('city_id')
        .eq('user_id', ctx.me().id).not('stars', 'is', null);
      const done = new Set((r.data || []).map(x => x.city_id));
      quizPool = quizPool.filter(c => !done.has(c.id));
    }
    if (quizPool.length >= QUIZ_ROWS) return;
    /* 도시는 이미 다 받아 두었습니다. 서버에서 잘라 오면 id 순으로 붙어 있는
       구간이 나와서 오타루 · 오타와 · 옥스퍼드처럼 이름이 몰립니다.
       여기서 통째로 섞습니다. */
    await loadCities();
    const mine = await sb.from('city_ratings').select('city_id').eq('user_id', ctx.me().id);
    const rated = new Set((mine.data || []).map(r => r.city_id));
    const have  = new Set(quizPool.map(c => c.id));
    let pool = (cities || []).filter(c => !rated.has(c.id) && !have.has(c.id));
    /* 사진 있는 곳을 먼저 씁니다. 사진 칸을 못 받아온 경우에는 그냥 다 씁니다. */
    const withImg = pool.filter(c => c.image_url);
    if (withImg.length) pool = withImg;
    /* 피셔–예이츠. sort(() => Math.random()-0.5) 로 섞으면 앞쪽이 덜 움직입니다. */
    for (let i = pool.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    /* 처음 채울 때만 유명한 곳을 앞으로 당깁니다. 안에서는 여전히 무작위라
       열 때마다 다른 도시가 나옵니다. 다 보고 나면 다음부터는 치우침 없이
       뽑히므로, 다른 도시 보기를 누를수록 생소한 곳이 나옵니다. */
    if (!quizFilled)
      pool.sort((a, b) => (FAMOUS.has(b.id) ? 1 : 0) - (FAMOUS.has(a.id) ? 1 : 0));
    quizFilled++;
    quizPool = quizPool.concat(pool.slice(0, 40));
  } finally { quizFilling = false; }
}

const quizRow = c => `<div class="rrow" data-cityopen="${esc(c.id)}">
  ${c.image_url
    ? `<img class="thumb" src="${esc(c.image_url)}" alt="" loading="lazy"
           onerror="this.replaceWith(Object.assign(document.createElement('span'),
             {className:'thumb ph', textContent:'${esc(c.name.slice(0,1))}'}))">`
    : `<span class="thumb ph">${esc(c.name.slice(0,1))}</span>`}
  <div class="t"><b>${esc(c.name)}</b>
    <span class="memo">${esc(countryName[c.country] || c.country)}</span></div>
  <span class="stars" data-city="${esc(c.id)}">${starHtml(null)}</span>
  <button class="ghost want" data-want="${esc(c.id)}" title="가보고 싶어요">♡</button>
</div>`;

async function renderQuiz(){
  await fillQuiz();
  const list = quizPool.slice(0, QUIZ_ROWS);
  const box = document.createElement('div');
  /* quiet — 위 두 색카드(이번 여행 · 다음 여행)는 지금 할 일이고,
     이건 훑어보는 자료입니다. 같은 흰 카드로 두면 위계가 안 갈립니다. */
  box.className = 'card quiet';
  box.innerHTML = `<h2>여기 가보셨어요?</h2>
    <div id="quizlist">${
      list.length ? list.map(quizRow).join('')
                  : '<div class="empty">물어볼 도시를 다 봤어요.</div>'}</div>
    ${list.length ? `<button class="ghost" id="quizmore" style="width:100%; margin-top:6px">
        다른 도시 보기</button>` : ''}`;
  $('home').appendChild(box);
}

async function renderFoot(){
  const [{ data: f }] = await Promise.all([
    netTimeout(sb.rpc('my_footprint')),
    refreshVisited(),              /* 작은 지도를 칠하려면 어디를 갔는지 알아야 합니다 */
  ]);
  if (!f) return;
  const pct = Math.min(100, f.countries / UN_COUNTRIES * 100);
  const box = document.createElement('div');
  box.className = 'card quiet'; box.id = 'homefp'; box.style.cursor = 'pointer';
  box.innerHTML =
    `<div class="row" style="border:0; padding:0; margin:0">
       <span class="label" style="font-weight:600">내 발자국</span>
       <span class="val">더보기 ›</span></div>
     <div style="margin-top:8px; font-size:calc(15px * var(--ts))">${
       f.countries
         ? `${UN_COUNTRIES}개국 중 <b>${f.countries}개국</b> · ${pct.toFixed(1)}%`
         : '별점을 매기면 여기에 쌓여요.'}</div>
     ${f.countries ? `<div class="fp"><i style="width:${Math.max(pct, 1.5)}%"></i></div>` : ''}
     <!-- 막대 아래에 지도도 같이. 숫자보다 칠해진 면적이 더 와닿습니다.
          지도 좌표는 이미 문서에 있으니 그대로 빌려 씁니다. -->
     <div class="minimap"><svg viewBox="0 19 1000 387"
       preserveAspectRatio="xMidYMid meet">${$('worldland').innerHTML}</svg></div>`;
  /* 다녀온 나라를 칠합니다. 누르면 큰 지도로 갑니다. */
  const gone = new Set((cities || []).filter(c => visited.has(c.id)).map(c => c.country));
  box.querySelectorAll('.minimap path').forEach(p =>
    p.classList.toggle('been', gone.has(p.dataset.c)));
  box.onclick = () => { ctx.showApp('set'); openMap(); };
  $('home').appendChild(box);
}

/* 별을 매긴 줄은 빠지고 그 자리에 다음 도시가 들어옵니다.
   화면을 통째로 다시 그리지 않아야 매기던 흐름이 안 끊깁니다. */
$('home').addEventListener('click', async e => {
  const st = e.target.closest('#quizlist .st');
  if (st){
    const wrap = st.closest('.stars'), row = st.closest('.rrow');
    const cityId = wrap.dataset.city;
    const box = st.getBoundingClientRect();
    const v = +st.dataset.n - ((e.clientX - box.left) < box.width / 2 ? 0.5 : 0);
    if (row.dataset.done) return;          /* 밀려나는 중에 또 누르는 것을 막습니다 */
    row.dataset.done = '1';

    /* 별이 차는 것을 보여주고 밀어냅니다.
       0.62초는 너무 짧았습니다 — 손이 미끄러져도 고칠 새가 없었습니다.
       1.5초 두었다가 밀어냅니다. 그동안 다시 누르면 점수가 바뀝니다. */
    paintStars(wrap, v, true);
    markRated(row, v);
    row.classList.add('rated');
    await saveRate(cityId, { stars: v }, true);
    quizPool = quizPool.filter(c => c.id !== cityId);

    clearTimeout(row._go);                 /* 고쳐 누르면 시계를 다시 겁니다 */
    row.dataset.done = '';
    row._go = setTimeout(() => {
      row.dataset.done = '1';
      row.classList.add('gone');
      setTimeout(async () => {
        row.remove();
        await fillQuiz();
        const shown = new Set([...document.querySelectorAll('#quizlist .rrow')]
          .map(r => r.dataset.cityopen));
        const nx = quizPool.find(c => !shown.has(c.id));
        if (nx) $('quizlist').insertAdjacentHTML('beforeend', quizRow(nx));
      }, 280);
    }, 1500);
    return;
  }
  const w = e.target.closest('#quizlist button[data-want]');
  if (w){
    const on = !myRates[w.dataset.want]?.want;
    await saveRate(w.dataset.want, { want: on });
    w.classList.toggle('on', on);
    return;
  }
  /* 다섯 곳 다 모르는 곳일 수 있습니다. 통째로 갈아치웁니다.
     예전에는 loadHome() 을 불러 홈 전체를 다시 그렸습니다. 그러면 히어로 사진과
     다음 여행까지 새로 그려지면서 화면이 맨 위로 튀어 올랐습니다.
     바꿔야 하는 것은 이 목록뿐이므로 여기만 갈아 끼웁니다 — 스크롤이 그대로 있습니다. */
  const more = e.target.closest('#quizmore');
  if (more){
    more.disabled = true;
    /* 지금 보이는 줄은 매긴 것까지 포함해 전부 물러납니다. */
    const seen = new Set([...document.querySelectorAll('#quizlist .rrow')]
      .map(r => r.dataset.cityopen));
    quizPool = quizPool.filter(c => !seen.has(c.id));
    await fillQuiz();
    const list = quizPool.slice(0, QUIZ_ROWS);
    $('quizlist').innerHTML = list.length
      ? list.map(quizRow).join('')
      : '<div class="empty">물어볼 도시를 다 봤어요.</div>';
    more.disabled = false;
    more.classList.toggle('hide', !list.length);
    return;
  }
  const row = e.target.closest('#quizlist .rrow');
  if (row) return openCity(row.dataset.cityopen);
});

/* ── 알림 ── 만드는 쪽은 아직 없습니다. 읽는 자리를 먼저 잡아둡니다. */
/* ── 내 발자국 ──────────────────────────────────────────────────────
 * 왓챠의 "696 평가 · 27 코멘트" 줄을 여행판으로 옮긴 것입니다.
 * 대륙별로 쪼개면 어디가 비었는지 보이고, 진행률은 채우고 싶게 만듭니다. */

export async function loadFootprint(){
  /* 발자국 숫자는 서버가 셉니다. 오프라인이면 그대로 둡니다 —
     0 으로 덮으면 다녀온 곳이 사라진 것처럼 보입니다. */
  if (netIsDown()) return;
  const { data, error } = await sb.rpc('my_footprint');
  if (error || !data) return;
  const f = data;
  $('s_country').textContent = f.countries;
  /* `f.cities`(다녀온 도시)를 쓰던 타일은 걷었습니다 — '매긴 곳'과 늘 같은
     숫자로 보였습니다(index.html 의 그 자리에 왜 그런지 적어뒀습니다).
     ⚠ 이제 **화면 어디서도 `f.cities` 를 안 씁니다.** 지도와 발자국은
       `my_visited()` 를 직접 부릅니다(4487·4630줄). my_footprint 는 그대로
       두는데, 지우려면 서버 함수를 고쳐야 하고 `countries` 는 여기서 씁니다. */
  $('s_rated').textContent   = f.rated;
  /* 한줄평 수는 my_footprint 에 없습니다. 개수만 따로 셉니다. */
  sb.from('city_ratings').select('city_id', { count:'exact', head:true })
    .eq('user_id', ctx.me().id).not('comment', 'is', null)
    .then(r => { $('s_comment').textContent = r.count ?? 0; });
  $('s_rated2').textContent  = f.rated;
  /* 맛집은 일정 줄에 매기므로 my_footprint 에 없습니다. 따로 셉니다.
     평가 화면에서 관광지도 매기게 했더니 그것까지 세어 18 로 나왔습니다.
     목록은 식사·카페만 보여주므로 세는 것도 같은 기준이어야 합니다. */
  for (const [box, cats] of [['s_place', ['식사','카페']], ['s_spot', ['관광','쇼핑']]])
    sb.from('plan_ratings')
      .select('plan_id, plans!inner(category)', { count:'exact', head:true })
      .eq('user_id', ctx.me().id).not('stars', 'is', null)
      .in('plans.category', cats)
      .then(r => { $(box).textContent = r.count ?? 0; });
  $('s_want').textContent    = f.wants;
  /* 후기를 남긴 여행 수. 목록과 같은 함수를 써야 숫자와 목록이 안 어긋납니다. */
  sb.rpc('my_reviews')
    .then(r => { $('s_review').textContent = (r.data || []).length; })
    .catch(() => {});
  /* 받은 배지 수. 여기서 부르는 김에 새로 받은 것도 기록됩니다 —
     배지 화면을 안 열어봐도 받은 시각이 남습니다. */
  sb.rpc('my_badges')
    .then(r => { $('s_badge').textContent =
      (r.data || []).filter(b => b.earned_at).length; })
    .catch(() => {});

  const pct = Math.min(100, f.countries / UN_COUNTRIES * 100);
  /* ⚠ 여기 `195개국 중 27개국 · 13.8%` 라고 적었는데, **바로 위 통계 줄이
     이미 `27 국가` 를 크게 보여주고 있습니다**(b370). 같은 화면에 같은 수가
     두 번이면 읽는 사람이 둘을 견주느라 한 번 멈춥니다. 여기서는 위가 안
     말해주는 것만 — 전체 중 얼마나 왔는지 — 남깁니다. */
  $('s_prog').innerHTML = f.countries
    ? `${UN_COUNTRIES}개국 중 <b>${pct.toFixed(1)}%</b>
       <div class="bar"><i style="width:${Math.max(pct, 1.5)}%"></i></div>`
    : '다녀온 곳을 표시하면 여기에 쌓여요.';

  const by = f.by_continent || {};
  $('s_cont').innerHTML = Object.entries(by)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `<span class="day" style="cursor:default">${esc(k)}
       <span class="n">${n}</span></span>`).join('');
}


