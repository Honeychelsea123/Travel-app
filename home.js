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
import { $, esc } from './dom.js?v=b450';
import { sb } from './db.js?v=b450';
import { fail, netTimeout, netIsDown, drawOffbar } from './net.js?v=b450';
import { hm, todayYmd } from './calc.js?v=b450';
import { starHtml, paintStars, markRated } from './stars.js?v=b450';
/* 평가 히어로는 세 화면이 같은 것을 씁니다 — rateui.js 머리말 참고(b409). */
import { rateHero, starValue } from './rateui.js?v=b450';
import { cities, countryName } from './cities.js?v=b450';
import { myRates, visited } from './rate.js?v=b450';
import { plans } from './trip.js?v=b450';
import { openCity } from './city.js?v=b450';
import { loadCities, pick } from './citysearch.js?v=b450';
import { saveRate, dropRate, refreshVisited } from './rating.js?v=b450';
import { openMap, UN_COUNTRIES } from './map.js?v=b450';
/* ⚠ **`renderAiCard`·`aiPrompt` 를 b398 에서 뗐습니다.** 홈에서 AI 일정
   권유를 걷어냈기 때문입니다(메인은 평가, 일정은 서브). 둘은 report.js 에
   그대로 살아 있으니 일정 쪽에서 쓸 자리가 생기면 거기서 가져다 쓰십시오. */
import { drawReport } from './report.js?v=b450';
/* 성향은 **card.js 가 정합니다.** 여기서 다시 세지 않습니다 — 두 군데서 세면
   홈에 뜬 유형과 성향 화면의 유형이 언젠가 갈라집니다. */
import { PERSONA_BG, personaAxes, personaRank, PERSONA16 } from './card.js?v=b450';
import { openNew } from './newtrip.js?v=b450';

let ctx = { me: () => null, openTrip: async () => {}, showApp: () => {} };
export function setHomeCtx(o){ ctx = { ...ctx, ...o }; }

/* 홈을 마지막으로 그린 글자. 같으면 다시 안 그립니다 — 사진이 깜빡이는
   것을 막습니다(rating.js 의 lastRateHtml 과 같은 수법).
   **app.js 의 상태 뭉치에 있던 것을 여기로 옮겼습니다(b344).**
   로그아웃할 때만 밖에서 되돌리므로 그 길만 내보냅니다. */
let lastHomeSig = '';
export function resetHomeSig(){ lastHomeSig = ''; }

/* ── 홈 ─────────────────────────────────────────────────────────────
 * **메인은 평가·성향, 일정은 서브입니다**(사용자 결정, b398). 위에서부터:
 *   ① 히어로   — **평가할 도시.** 사진 위에서 별을 바로 누릅니다.
 *   ② 새 여행   — 얇은 줄 하나 (**늘 그립니다** — 아래 ⚠⚠)
 *   ③ 가봤어요 — 안 매긴 도시 다섯 곳
 *   ④ 발자국   — 195개국 중 몇 곳인지 + **내 성향 한 줄**
 *
 * 여행은 1년에 두세 번인데 홈은 360일을 버텨야 합니다. 그래서 ①③④ 가
 * 평가고, 일정으로 가는 길은 ② 한 줄만 남겼습니다.
 *
 * ⚠⚠ **② 를 빼지 마십시오. 이미 세 번 뺐다가 세 번 되살렸습니다**
 *     (b377 → b378, b402 → 같은 날 되돌림). "여행 탭에 ＋새 여행이 있으니
 *     중복" 이라는 논리로 매번 지워지는데, 여행 탭 단추는 **거기까지 간
 *     사람만** 봅니다. 홈은 앱을 여는 사람이 다 보는 자리입니다.
 *
 * ⚠ 홈에서 뺀 것과 간 곳:
 *     다녀온 여행 평가 재촉  → 여행 탭 (home.js 의 `reviewBar`, b398)
 *     AI 일정 카드           → 없앰 (b398)
 *     다음 여행 히어로       → 여행 탭 맨 위 (triplist.js, b402)
 *   왜 그랬는지는 `buildHome` 머리말에 있습니다. */

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

/* ⚠ **triplist.js 도 이걸 씁니다(b402).** 다음 여행 히어로가 홈에서 여행 탭
   맨 위로 갔습니다 — 홈은 평가만 남기기로 했고(사용자 결정), 여행 히어로는
   여행 탭이 제 자리입니다. 그래서 내보냅니다. 여기 인자를 바꿀 때는
   triplist.js 도 같이 보십시오. */
export function heroHtml(photo, dd, title, memo, btn, ai){
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

/* ── 평가 히어로 ─────────────────────────────────────────────────────
 * 홈 맨 위에서 **바로 별을 누릅니다**(b398). 이 앱의 메인은 평가라, 첫
 * 화면이 "평가하러 가세요" 라고 시키는 대신 **그 자리에서 되게** 합니다.
 * 한 번 더 누르게 만들 때마다 사람이 줄어듭니다.
 *
 * ⚠ **별은 `.stars` 통에 담아야 합니다.** 아래 클릭 처리기가 `.stars` 의
 *   `data-city` 로 어느 도시인지 알아냅니다(퀴즈 줄과 같은 방식). 통을
 *   바꾸면 눌러도 아무 일이 안 일어나는데, 화면은 멀쩡해 보입니다.
 *
 * ⚠ **사진이 없는 도시는 여기 오면 안 됩니다.** 히어로는 사진이 주인공이라
 *   빈 색 덩어리만 남습니다. 고르는 쪽(buildHome)에서 걸러 옵니다. */
/* ⚠ **그리는 것은 rateui.js 한 곳에서 합니다(b409).** 홈·맛보기·연속 평가
   셋이 같은 히어로를 씁니다. 여기서 또 적으면 세 벌이 되고, 그러면 고칠 때
   한 벌만 고쳐집니다 — 별 크기 때문에 이미 한 번 겪었습니다(b401).

   ⚠ **묻기만 하고 무엇을 하라는 말이 없었습니다(b400).** 별이 장식으로
   보이고 누를 수 있는 줄 몰랐습니다. `ask` 한 줄이 그것입니다. */
const rateHeroHtml = c =>
  rateHero(c, { id:'hero', ask:'다녀오셨다면 별점을 남겨주세요' });
/* 지금 히어로에 걸린 도시. **퀴즈가 이걸 빼고 그려야** 같은 도시가 위아래에
   두 번 안 나옵니다(renderQuiz · 다음 줄 채우기 둘 다). */
let heroCity = null;

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

/* ── 홈을 그립니다 ────────────────────────────────────────────────────
 * ⚠ **b398 에서 순서를 통째로 뒤집었습니다.** 그 전에는 히어로가 다음 여행
 *   (사진 260px 에 D-22)이었고, 여행이 없으면 맨 위가 `AI 로 일정 만들기`
 *   카드였습니다. 재보니 홈의 **높이는 이미 평가가 72%**(571+284)인데
 *   **제일 큰 목소리는 일정**이었습니다 — 히어로가 유일한 사진이고 유일한
 *   큰 숫자였고, 평가 쪽 큰 카드는 `card quiet`(일부러 흐린 것)였습니다.
 *
 *   그리고 b397 에서 앱 얼굴을 「나는 어떤 여행자일까」로 바꿔 놓고 첫 화면은
 *   그대로 뒀습니다. **성향 카드를 보고 온 사람은 여행이 없는 사람**인데,
 *   그 사람이 열면 `AI 로 일정 만들기` 가 맨 위에 떴습니다. 온 이유와 첫
 *   화면의 할 일이 달랐습니다.
 *
 *   이 앱은 **평가·성향이 메인, 일정이 서브**입니다(사용자 결정). 그래서:
 *     · 히어로 = **평가할 도시.** 사진 위에서 별을 바로 누릅니다.
 *     · 다음 여행 = 얇은 줄 하나
 *     · 새 여행   = 얇은 줄 하나
 *     · 다녀온 여행 평가 재촉(rvbar) · AI 일정 카드 → **여행 탭으로 옮겼습니다**
 *
 * ⚠ **왜 성향 카드를 히어로에 안 걸었나.** 후보였습니다. 안 건 이유는
 *   목표가 "성향을 자랑하기" 가 아니라 **"평가를 남기게 하기"** 라서입니다.
 *   첫 화면에서 별을 바로 누를 수 있는 쪽이, 성향을 보여주고 "평가하러
 *   가세요" 라고 한 번 더 시키는 쪽보다 셉니다. 성향은 그 다음 보상이라
 *   발자국 카드에 얹었습니다(renderFoot).
 *
 * ⚠ **잃은 것도 적어둡니다.** 여행이 끝났는데 평가를 안 한 사람에게 홈에서
 *   재촉하던 장치가 여행 탭으로 갔습니다. 다녀온 뒤에는 앱을 잘 안 여는데
 *   그때 붙잡는 것이 그 띠였습니다. 대신 히어로가 늘 평가를 권하므로
 *   "평가 자체" 는 오히려 앞으로 나왔습니다. 재촉이 약해졌다고 느껴지면
 *   여행 탭 쪽(triplist.js 의 rvBar)을 다시 보십시오. */
async function buildHome(){
  await loadCities();          /* 나라 이름과 도시 페이지에 필요합니다. 한 번만 받습니다. */

  /* 히어로에 걸 도시. 퀴즈와 **같은 우물**을 씁니다(fillQuiz) — 두 벌로
     만들면 같은 도시가 위아래에 두 번 나옵니다. 여기서 한 곳을 집어가고
     renderQuiz 가 그것을 빼고 그립니다. 사진이 없는 곳은 히어로가 될 수
     없습니다(사진이 주인공인 자리라 빈 색만 남습니다). */
  await fillQuiz();
  heroCity = quizPool.find(c => c.image_url) || null;

  /* ── 자료가 그대로면 홈을 아예 다시 그리지 않습니다 ──────────────────
     홈은 히어로를 `innerHTML` 로 지우고 그 뒤에 카드를 **덧붙이는** 구조라,
     목록 하나만 지키는 방식(putHtml)으로는 안 됩니다. 히어로를 지우는 순간
     뒤에 붙은 것이 전부 같이 날아가기 때문입니다.
     그래서 **그릴 내용이 같은지를 먼저 보고** 같으면 통째로 건너뜁니다. */
  const sig = [heroCity?.id || '',
               quizPool.slice(0, QUIZ_ROWS + 1).map(c => c.id).join(),
               visited.size, Object.keys(myRates || {}).length,
               Object.values(myRates || {}).filter(r => r.want).length].join('|');
  if (sig === lastHomeSig && $('home').querySelector('.hero')) return;
  lastHomeSig = sig;

  /* 히어로. 매길 도시가 하나도 없으면(다 매겼거나 오프라인) 앱이 무슨 앱인지
     말합니다 — 빈 화면보다 낫고, 그 사람은 이미 평가를 다 한 사람입니다. */
  $('home').innerHTML = heroCity ? rateHeroHtml(heroCity)
    : heroHtml('', '', '기로', '다녀온 도시를 매기면 여행 성향이 나와요', '');

  /* ── 홈은 크게 두 덩이입니다(b419) ───────────────────────────────────
   * **① 평가하는 자리** — 사진 · 별점 · 두 단추가 한 카드(.ratecard).
   *    같은 물음의 답 셋이 흩어져 보이지 않게 묶었습니다(rateui.js).
   *    **「쭉 매기기」도 이 카드 안**입니다(b420) — 「이 도시 말고 더
   *    매기고 싶으면」이라 **평가 자리에 속합니다.** 밖에 두었더니
   *    떨어져 보였습니다.
   * **② 나머지 전부** — 새 여행 · 발자국 · 성향 · 지도가
   *    **한 카드 안의 줄들**입니다.
   *
   * ⚠ **전에는 덩어리가 다섯이었습니다.** 히어로 · 단추 · 띠 · 띠 · 카드.
   *   모서리가 26 → 12 → 26 으로 오르내리고 배경이 사진 → 투명 → 회색 →
   *   회색 → 흰색이라, 위에서 아래로 훑으면 옷이 다섯 번 바뀌었습니다.
   *   게다가 세로 간격이 **전부 12px 로 균일**해서(마진 겹침 탓입니다 —
   *   .trybar 의 margin-top:8px 이 히어로의 margin-bottom:12px 에 먹혔습니다)
   *   무엇이 한 덩어리인지 알려주는 것이 없었습니다.
   *
   * ⚠ **줄은 전부 같은 부품(.fprow)입니다.** 「제목 + 설명 + 오른쪽 값 + ›」.
   *   새로 줄을 더할 때도 이 부품을 쓰십시오 — 띠를 따로 만들면 b416
   *   이전으로 돌아갑니다. */
  const 통 = document.createElement('div');
  통.className = 'card quiet';
  통.id = 'homefp';
  $('home').appendChild(통);

  /* 쭉 매기기 줄은 **평가 카드 바닥**에 붙입니다(b420) — 「이 도시 말고
     더 매기고 싶으면」이라 평가 자리에 속합니다.
     ⚠ 매길 도시가 하나도 없으면 `.ratecard` 가 아예 없습니다(위 히어로가
       heroHtml 로 떨어집니다). 그때는 아래 통에 붙입니다 — 없는 곳에
       붙이려다 터지면 홈이 통째로 안 그려집니다. */
  await renderQuiz($('home').querySelector('.ratecard') || 통);

  /* ⚠ **발자국·성향·지도가 먼저입니다(b423).** 지도를 홈 열자마자 보이게
     하려면 위로 올려야 하는데, 새 여행 줄이 앞에 있으면 그만큼 밀립니다.
     그리고 이 앱은 평가가 주인공이고 일정은 서브입니다 — 순서가 그 말을
     해야 합니다. */
  await renderFoot(통);

  /* ── 새 여행으로 가는 길 ─────────────────────────────────────────────
     ⚠⚠ **이 줄을 홈에서 빼지 마십시오. 세 번째입니다.** ⚠⚠
     b377 에서 "권유는 하나만" 이라며 뺐다가 b378 에서 되살렸고, b402 에서
     "여행 탭 머리줄에 ＋새 여행이 이미 있으니 중복" 이라며 또 뺐다가
     같은 날 사용자에게 지적받고 되살렸습니다.

     **홈에서도 여행을 만들 수 있어야 합니다.** 여행 탭의 ＋새 여행 은
     거기까지 간 사람만 봅니다. 홈은 앱을 여는 사람이 다 보는 자리이고,
     이 앱이 일정도 짠다는 것을 아는 유일한 자리입니다. 중복처럼 보이는
     것이 값입니다.

     ⚠ 문구가 「다음에 어디 갈까요?」 였습니다(b402 에서 고침). **처음 온
       사람에게는 '다음' 이 없습니다** — 아직 한 번도 안 간 사람에게
       "다음에" 라고 하면 자기 얘기가 아닙니다. */
  /* ⚠ **홈 맨 위 · 생김새도 다릅니다(b438).** 아래 카드들은 전부 「평가로
     쌓인 나」인데(별점 → 발자국 → 성향), 이 줄만 **여행을 만드는 다른
     기능**입니다. 카드 안의 한 줄로 두면 그 차이가 안 읽혀서, 흰 카드가
     아니라 **강조색 띠**로 세우고 맨 위로 올립니다.
     ⚠ 그래도 **작게** 둡니다. 이 앱은 평가가 주인공이고 일정은 서브입니다
       (b416·b423) — 맨 위라도 큰 사진 카드(평가)가 주인공으로 남게
       띠 하나 높이만 씁니다. 여기를 키우지 마십시오. */
  const nt = document.createElement('div');
  nt.className = 'tripbar';
  nt.innerHTML = `<span class="ic" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
           stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round">
        <!-- ⚠ 좌표(지도핀)였는데 **비행기**로 바꿨습니다(b440). 핀은 하단바의
             「여행」 탭 아이콘과 같은 모양이라, 나란히 놓이면 같은 곳으로
             가는 줄 읽힙니다. 여기는 **일정을 만드는** 자리입니다. -->
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8
                 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1
                 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
      </svg></span>
    <span class="t"><b>어디로 떠나볼까요?</b>
      <span>어디로 언제 가는지만 정하면 돼요</span></span>
    <span class="go">여행 만들기 ›</span>`;
  nt.onclick = () => openNew();
  $('home').prepend(nt);
}
/* ── 다녀온 여행 평가 재촉 띠 ────────────────────────────────────────
 * **홈에 있다가 여행 탭으로 옮겼습니다(b398).** 홈은 도시 평가가 주인공이고,
 * 이 띠는 **특정 여행에 묶인 것**이라 여행 탭이 제 자리입니다.
 *
 * ⚠ **띠만 옮기고 화면은 안 옮겼습니다.** 평가 화면(`openReviewTrip`)과 그
 *   화면의 단추들(rvback · rv_rate · rv_done)은 이 파일에 그대로 있습니다.
 *   화면까지 옮기면 딸린 것이 줄줄이 따라가는데, 옮겨야 할 이유는 **입구가
 *   어디 있느냐** 하나뿐이었습니다. 그래서 입구만 내보냅니다.
 *
 * 부르는 쪽(triplist.js)이 `null` 을 받으면 붙일 것이 없다는 뜻입니다. */
export async function reviewBar(){
  const pend = await pendingTrip();
  if (!pend) return null;
  const b = document.createElement('div');
  b.className = 'rvbar';
  b.innerHTML = `<span class="t"><b>${esc(pend.trip.title)} 어땠어요?</b>
      <span>다녀오신 곳을 평가해주세요${
        pend.places.length ? ` · ${pend.places.length}곳` : ''}</span></span>
    <span class="go">평가 ›</span>`;
  /* ⚠ **들어온 자리를 남깁니다(b446).** 이 띠는 여행 탭의 「다녀온」
     갈래에만 있습니다 — 평가를 마치고 나오면 그리로 돌아가야 합니다.
     안 남기면 홈에 떨어집니다(위 closeReview 주석). */
  b.onclick = () => { reviewBackTo('trips'); openReviewTrip(pend.trip.id); };
  return b;
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

/* ── 평가 화면에서 나가면 **들어온 자리**로 ─────────────────────────
 * ⚠ 전에는 무조건 `showApp('home')` 이었습니다. 그런데 이 화면으로 오는
 *   길은 **여행 탭의 「다녀온」 갈래**입니다(triplist.js 의 재촉 띠) —
 *   평가를 마치고 나오면 엉뚱하게 홈에 떨어졌습니다.
 * ⚠ **spree.js 와 같은 수법**입니다. 여는 쪽이 어디서 왔는지 적어두고,
 *   닫는 쪽이 그리로 돌려보냅니다. 한 번 쓰고 바로 비웁니다 — 남겨두면
 *   다른 길로 들어온 사람도 그리로 튕깁니다. */
let 돌아갈곳 = null;
export function reviewBackTo(tab){ 돌아갈곳 = tab; }
export function closeReview(fromPop){
  if (!fromPop && history.state?.t2 === 'rv'){ history.back(); return; }
  $('reviewview').classList.add('hide');
  const t = 돌아갈곳; 돌아갈곳 = null;
  ctx.showApp(t || 'home');
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
       매번 답한 목록을 받아 걸러냅니다.

       ⚠ **전에는 `.not('stars','is',null)` 이 붙어 있었습니다(b414).**
       그래서 **별점 있는 줄만** 빠졌습니다. 「안 가봤어요」는 `stars:null`
       줄을 남기므로 안 빠졌고, 쭉 매기기에서 넘긴 도시가 홈 목록에
       **그대로 남아 다시 물었습니다.** 실제로 재봤습니다 — 쿠알라룸푸르를
       넘기고 홈에 갔더니 목록에 그대로 있었습니다.

       ⚠ **아래 주머니를 처음 만드는 곳과 같은 기준이어야 합니다**(rated).
       거기는 조건 없이 `city_ratings` 의 **모든 줄**을 제외합니다.
       한쪽만 고치면 또 어긋납니다. 취소한 것은 줄 자체가 지워지므로
       (rating.js 의 dropRate) 여기서 걸러지지 않고 다시 물어집니다 — 맞습니다. */
    {
      const r = await sb.from('city_ratings').select('city_id')
        .eq('user_id', ctx.me().id);
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

/* ⚠ **아래 quizRow 와 `#quizlist` 를 보는 핸들러들은 지금 안 돕니다(b416).**
   홈의 「여기 가보셨어요?」 목록을 「쭉 매기기」 줄로 바꾸면서 `#quizlist`
   자체가 화면에서 사라졌습니다. `closest` 가 null 을 주니 **오류는 안 나고
   그냥 아무 일도 안 합니다.**

   ⚠ **일부러 안 지웠습니다.** 히어로에서 매긴 뒤 다음 도시를 고르는 길
     (아래 `shown`)이 이 코드와 얽혀 있어서, 한 판에 같이 걷어내면 홈에서
     별을 매기는 것 자체가 깨질 위험이 있습니다. 목록을 되살릴 일이 없다면
     **다음 판에서 따로** 걷어내십시오 — 그때는 히어로 매기기를 먼저
     떼어내고 나서 지우는 순서가 맞습니다. */
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

/* ── 쭉 매기기로 가는 줄 ─────────────────────────────────────────────
 * ⚠ **전에는 여기가 「여기 가보셨어요?」 목록이었습니다(b416 에서 바꿈).**
 *   도시 다섯 줄에 별을 각각 달아 뒀는데 **위 히어로에도 별이 있어서
 *   같은 동작이 홈에 두 자리** 있었습니다. 재보니 한 화면에 별 30개 ·
 *   사진 6장 · 하트 5개. 어디서 매겨야 하는지가 안 정해져 있었습니다.
 *
 * ⚠ **그리고 그 목록은 「쭉 매기기」의 열등한 사본이었습니다.**
 *   쭉 매기기는 탭바까지 숨기고 그것만 하게 만듭니다(spree.js).
 *   같은 일을 두 벌로 두면 둘 다 어중간해집니다. 줄 하나로 보냅니다.
 *
 * ⚠ **fillQuiz 는 그대로 부릅니다.** 목록은 없어졌지만 **히어로가 같은
 *   주머니(quizPool)를 씁니다** — 여기서 안 채우면 히어로가 빕니다.
 *   지우지 마십시오.
 *
 * ⚠ 매긴 수는 **제 질의로** 셉니다. myRates 는 홈에서 비어 있습니다 —
 *   renderFoot 머리말과 같은 이유입니다. head:true 라 개수만 오고
 *   자료는 안 받으므로 홈이 느려지지 않습니다. */
async function renderQuiz(통){
  const [, 센것] = await Promise.all([
    fillQuiz(),
    netTimeout(sb.from('city_ratings').select('city_id', { count:'exact', head:true })
      .eq('user_id', ctx.me().id).not('stars', 'is', null)),
  ]);
  const 매긴 = 센것?.count ?? 0, 전체 = (cities || []).length;
  const bar = document.createElement('div');
  /* 새 여행 줄과 **같은 부품**입니다. 띠로 따로 만들면 카드 안에
     상자가 하나 더 생깁니다(위 buildHome 머리말). */
  bar.className = 'fprow';
  bar.innerHTML = `<span class="t"><b>쭉 매기기</b>
      <span>사진 보고 훅훅 눌러요${
        매긴 && 전체 ? ` · ${전체}곳 중 ${매긴}곳` : ''}</span></span>
    <span class="go">시작 ›</span>`;
  /* 기록 탭으로 옮긴 뒤 거기 있는 시작 단추를 누릅니다. openSpree 를 직접
     부르면 rateview 가 안 보이는 채로 열려서 나올 때 빈 화면이 됩니다. */
  /* ⚠ **들어온 자리를 먼저 남깁니다(b423).** 안 그러면 「그만」 을 눌렀을 때
     홈이 아니라 기록 탭에 떨어집니다 — 아래 showApp('rate') 때문에 닫을
     때는 이미 기록 탭이 제자리이기 때문입니다. */
  bar.onclick = () => { ctx.spreeBackTo?.('home'); ctx.showApp('rate'); $('spreego')?.click(); };
  통.appendChild(bar);
}

/* ── 내가 쌓은 것 ────────────────────────────────────────────────────
 * ⚠ **been 처럼 같은 리듬의 줄로 맞췄습니다(b416).** 전에는 발자국이
 *   「제목 + 문장 + 진행바」였고 성향만 줄(.fprow)이라 **한 카드 안에서
 *   생김새가 둘**이었습니다. 둘 다 "내가 쌓은 것"이니 같은 모양이어야
 *   눈이 덜 피곤합니다.
 *
 * ⚠ **진행바를 뺐습니다.** 「195개국 중 27개국 · 13.8%」가 같은 말을 하고,
 *   아래 지도가 그 일을 더 잘합니다. 같은 말을 세 번 하고 있었습니다.
 *
 * ⚠ **「내가 매긴 곳」·「가보고 싶은 곳」 줄은 여기 안 답니다.** 매긴 수는
 *   위 「쭉 매기기」 줄에 있고, 둘 다 **프로필 보관함에 이미 있습니다.**
 *   홈에 넣으면 같은 숫자가 앱 안에 세 번 나옵니다.
 *
 * ⚠ 지도는 남깁니다. been 도 홈에 지도를 크게 둡니다 — 칠해진 면적이
 *   늘어나는 것이 이 화면의 재미입니다. */
async function renderFoot(통){
  const [{ data: f }, , 별점] = await Promise.all([
    netTimeout(sb.rpc('my_footprint')),
    refreshVisited(),              /* 작은 지도를 칠하려면 어디를 갔는지 알아야 합니다 */
    /* ⚠ **성향은 `myRates` 로 세면 안 됩니다(b399에서 겪음).** 홈을 처음 열면
       `myRates` 가 **비어 있습니다** — 기록 탭을 열어야 채워집니다(rating.js 의
       loadRateData). 그래서 b398 에서 붙인 성향 줄이 새로고침 직후에는 통째로
       안 나왔습니다. 재보고 알았습니다(myRates 키 0개).
       퀴즈(fillQuiz)도 같은 이유로 **제 질의를 따로 합니다.** 여기도 그렇게
       합니다 — 불러온 순서에 안 휘둘리는 쪽이 맞습니다. */
    netTimeout(sb.from('city_ratings').select('city_id,stars')
      .eq('user_id', ctx.me().id).not('stars', 'is', null)),
  ]);
  if (!f) return;
  const pct = Math.min(100, f.countries / UN_COUNTRIES * 100);
  /* ⚠ **제 카드를 안 만듭니다(b419).** 위 buildHome 이 만든 통에 줄만
     보탭니다 — 쭉 매기기·새 여행과 **한 덩이**여야 합니다. */
  const box = 통;

  /* 줄 하나를 만드는 틀. 넷이 아니라 둘뿐이라도 **틀을 통해 만듭니다** —
     손으로 두 번 쓰면 다음에 하나만 고치게 됩니다. */
  const 줄만들기 = (제목, 밑, 오른쪽, 눌렀을때) => {
    const el = document.createElement('div');
    el.className = 'fprow';
    el.innerHTML = `<span class="t"><b>${제목}</b><span>${밑}</span></span>
      <span class="go">${오른쪽} ›</span>`;
    el.onclick = e => { e.stopPropagation(); 눌렀을때(); };
    return el;
  };
  /* ── been 처럼 **큰 숫자**로(b450) ──────────────────────────────────
     「195개국 중 27개국 · 13.8%」를 작은 회색 글로만 두면 **읽히지도 않고
     재미도 없습니다.** been 은 「0 / 14」를 화면 한가운데에 크게 박아
     둡니다 — 숫자가 커야 「채우고 싶다」가 생깁니다.
     ⚠ 분모(195)는 작게 둡니다. 주인공은 **내가 채운 수**입니다.
     ⚠ 퍼센트는 그 아래 한 줄로 작게 — 지우지는 않습니다. 27이라는 수가
       많은 건지 적은 건지는 퍼센트라야 압니다. */
  const 큰수 = document.createElement('div');
  큰수.className = 'bignum';
  큰수.style.cursor = 'pointer';
  큰수.innerHTML = f.countries
    ? `<div class="bnrow"><b>${f.countries}</b><span>/ ${UN_COUNTRIES}</span></div>
       <div class="bnsub">다녀온 나라 · 세계의 ${pct.toFixed(1)}%</div>`
    : `<div class="bnsub">별점을 매기면 여기에 쌓여요</div>`;
  큰수.onclick = () => { ctx.showApp('set'); openMap(); };
  box.appendChild(줄만들기('내 발자국', '', '지도',
    () => { ctx.showApp('set'); openMap(); }));
  box.appendChild(큰수);

  /* ── 지도는 **발자국 바로 아래**입니다(b423) ─────────────────────────
   * 숫자보다 칠해진 면적이 더 와닿습니다. 지도 좌표는 이미 문서에 있으니
   * 그대로 빌려 씁니다. 누르면 큰 지도로 갑니다.
   *
   * ⚠ **전에는 카드 맨 아래였습니다.** 그러면 홈을 열었을 때 지도가 접힌
   *   자리 아래에 있어서 **스크롤해야 보였습니다.** 이 앱에서 지도는
   *   "내가 얼마나 다녔나" 를 한눈에 보여주는 자리라 열자마자 보여야
   *   합니다. 발자국 줄에 딸린 것이기도 하니 바로 아래가 제자리입니다.
   * ⚠ 중간에 오므로 **아래 음수 마진을 쓰면 안 됩니다** — 다음 줄을
   *   덮습니다. 좌우만 넓힙니다(app.css 의 .minimap). */
  const mm = document.createElement('div');
  mm.className = 'minimap';
  mm.style.cursor = 'pointer';
  /* ── 왜 이 viewBox 인가(b425) ────────────────────────────────────────
     been 은 1.88:1 인데 우리는 2.58:1 이라 가로로 찌그러져 보인다는
     지적을 받고 여러 값을 재봤습니다. **결론: 등장방형 세계지도로
     been 비율은 못 만듭니다.** 재본 것을 적어둡니다.

     · 대륙이 실제로 차지하는 범위: x 23~995 · y 18~405.
       (남극 path 는 world.js 에 **아예 없습니다** — 그래서 세로를 늘려도
        빈 자리만 늘어납니다. `0 8 1000 432` 로 해보니 2.31:1 이 되긴 하나
        지도가 커진 게 아니라 위아래 여백만 생겼습니다.)
     · 그러니 **2.5:1 이 한계**입니다. been 이 1.88 인 것은 태평양을
       크게 잘랐기 때문인데, 우리는 못 자릅니다 —
     · b424 에서 `150 22 850 380`(2.24:1) 로 잘라봤다가 **알래스카가
       통째로 사라졌습니다.** 캐나다 서부와 러시아 극동도 같이 잘렸습니다.
       미국은 본토가 칠해지니 괜찮을 줄 알았는데 **눈에 바로 띕니다.**
       좌우로 80씩만 잘라도 뉴질랜드·바누아투·뉴칼레도니아·솔로몬제도가
       사라집니다(x 985~995).

     ⚠ **자르지 마십시오.** 대륙에 딱 맞춰 여백만 걷어냅니다.
       값을 건드리려거든 `path.getBBox()` 로 잘리는 나라를 먼저 세십시오. */
  mm.innerHTML = `<svg viewBox="20 16 976 392"
    preserveAspectRatio="xMidYMid meet">${$('worldland').innerHTML}</svg>`;
  const gone = new Set((cities || []).filter(c => visited.has(c.id)).map(c => c.country));
  mm.querySelectorAll('path').forEach(p =>
    p.classList.toggle('been', gone.has(p.dataset.c)));
  mm.onclick = () => { ctx.showApp('set'); openMap(); };
  box.appendChild(mm);

  /* ── 성향 한 줄(b398) ────────────────────────────────────────────────
     앱 얼굴을 「나는 어떤 여행자일까」로 바꿔 놓고(b397) **정작 홈에는 내
     유형이 어디에도 없었습니다.** 성향 화면은 프로필 → 스크롤 → 「여행 성향
     보기」로 두 번 들어가야 나옵니다. 카드를 보고 온 사람이 그걸 찾을 리가
     없습니다.

     ⚠ **문턱은 성향 화면과 같은 5곳입니다.** 여기만 낮추면 홈에서는 유형이
       보이는데 눌러 들어가면 "아직" 이 나옵니다.
     ⚠ 못 받아왔으면 그냥 안 그립니다. 틀린 유형을 보여주는 것보다 낫습니다. */
  const 매긴것 = 별점?.data || [];
  if (매긴것.length >= 5){
    const ax = personaAxes(매긴것, { cities });
    const 유형 = PERSONA16[ax.code];
    if (유형){
      const 나라수 = new Set(매긴것
        .map(r => (cities || []).find(c => c.id === r.city_id)?.country)
        .filter(Boolean)).size;
      box.appendChild(줄만들기('내 성향',
        `${esc(ax.code)} ${esc(유형.n)}`,
        esc(personaRank(나라수)),
        () => { ctx.showApp('set'); $('openpersona')?.click(); }));
    }
  }

  /* box 는 통입니다 — 이미 홈에 붙어 있습니다(b419). */
}

/* 별을 매긴 줄은 빠지고 그 자리에 다음 도시가 들어옵니다.
   화면을 통째로 다시 그리지 않아야 매기던 흐름이 안 끊깁니다. */
$('home').addEventListener('click', async e => {
  /* ── 히어로에서 바로 매기기(b398) ──────────────────────────────────
     퀴즈 줄과 **셈은 같고 뒤처리만 다릅니다.** 줄은 밀려나고 다음 줄이
     들어오지만, 히어로는 자리가 하나뿐이라 **다음 도시로 갈아 끼웁니다.**

     ⚠ **`loadHome()` 을 부르면 안 됩니다.** 홈을 통째로 다시 그리면 화면이
       맨 위로 튀고 사진이 깜빡입니다. 여기만 갈아 끼웁니다.
     ⚠ 매긴 뒤에는 `lastHomeSig` 를 비웁니다 — 안 그러면 다른 화면에 갔다
       오면서 홈을 다시 그릴 때 "그릴 내용이 같다" 며 건너뛰어, 방금 매긴
       도시가 히어로에 그대로 남습니다. */
  const hs = e.target.closest('#hero .st');
  if (hs){
    const wrap = hs.closest('.stars'), hero = hs.closest('.hero');
    const cityId = wrap.dataset.city;
    if (hero.dataset.done) return;
    hero.dataset.done = '1';
    const v = starValue(hs, e.clientX);

    /* ── 같은 자리를 다시 누르면 **취소**(b403) ────────────────────────
       사용자 지적: "별 3개 누르고 다시 눌러서 취소하고 싶어도 안 된다".
       그 전에는 다시 눌러도 같은 점수로 덮어써서 아무 일도 안 일어난
       것처럼 보였습니다. 별점 UI 에서 같은 별을 또 누르는 것은 **끄겠다는
       뜻**입니다 — 잘못 눌렀을 때 되돌릴 길이 이것밖에 없습니다.
       ⚠ 지운 도시는 **주머니에 돌려놓습니다.** 안 그러면 취소해 놓고도
         다시는 안 물어봅니다. */
    const 지금 = wrap.dataset.v ? +wrap.dataset.v : null;
    if (지금 != null && Math.abs(지금 - v) < 1e-9){
      clearTimeout(hero._go);
      wrap.dataset.v = '';
      paintStars(wrap, null, true);
      /* ⚠ **`saveRate(id, {stars:null})` 이 아니라 `dropRate` 입니다(b407).**
         전자는 줄을 남기는데, 남은 줄은 "이미 물어본 곳"이라 새로고침하면
         **다시는 안 물어봅니다.** 잘못 눌러 취소한 도시가 영영 사라집니다 —
         화면 안에서는 아래 unshift 로 돌아오는데 새로고침하면 없어지는,
         눈에 잘 안 띄는 종류였습니다. 자세한 것은 rate.js 의 removeRate. */
      await dropRate(cityId);
      if (heroCity && !quizPool.some(c => c.id === cityId)) quizPool.unshift(heroCity);
      lastHomeSig = '';
      hero.dataset.done = '';
      return;
    }

    /* ⚠ 여기서 안내 줄을 「다시 누르면 취소돼요」로 바꿨었습니다(b403).
       **뺐습니다(b404, 사용자 결정).** 별을 누른 뒤 글자가 바뀌면 눈이
       거기로 끌려가는데, 정작 그 순간 볼 것은 채워진 별입니다. 취소는
       **알면 되는 것이지 매번 알릴 것이 아닙니다.** */
    wrap.dataset.v = String(v);
    paintStars(wrap, v, true);
    await saveRate(cityId, { stars: v }, true);
    quizPool = quizPool.filter(c => c.id !== cityId);
    /* ⚠ **여기서 `lastHomeSig` 를 비우면 안 됩니다(b405 에서 겪음).**
       비우는 순간 다른 무엇이든 홈을 다시 그리면(saveRate 안쪽에서 다녀온
       곳을 다시 받는 것만으로도) `buildHome` 이 **새 히어로를 뽑아 갈아
       끼웁니다.** 그러면 되돌릴 1.5초가 통째로 사라져, 취소하려고 다시
       누른 손가락이 **다음 도시에 별을 매깁니다.** 실제로 그렇게 됐고
       재보고서야 알았습니다(dublin 을 취소하려다 losangeles 에 매김).
       비우는 것은 **갈아끼우기 직전**으로 미룹니다 — 아래 타이머 안. */
    /* 별이 찬 것을 보여주고 나서 넘깁니다. 바로 갈아 끼우면 "눌렸나?" 싶습니다. */
    clearTimeout(hero._go);
    hero.dataset.done = '';
    hero._go = setTimeout(async () => {
      await fillQuiz();
      const shown = new Set([...document.querySelectorAll('#quizlist .rrow')]
        .map(r => r.dataset.cityopen));
      const nx = quizPool.find(c => c.image_url && !shown.has(c.id));
      if (!nx) return;                       /* 더 물어볼 곳이 없으면 그냥 둡니다 */
      heroCity = nx;
      /* ⚠ **`rateHeroHtml` 은 뿌리가 둘입니다**(히어로 + 단추 줄, b407).
         `hero.outerHTML` 만 갈아끼우면 **옛 단추 줄이 그대로 남아** 화면에
         줄이 둘이 됩니다. 새것이 들어오면서 id 가 겹치므로 **바꾸기 전에**
         옛것을 잡아둬야 합니다 — 나중에 찾으면 새것이 잡힙니다. */
      const 옛단추 = $('hero')?.nextElementSibling;
      hero.outerHTML = rateHeroHtml(nx);
      옛단추?.remove();
      /* **되돌릴 창이 닫힌 지금** 비웁니다. 이제 홈을 다시 그려도
         잃을 것이 없습니다(위 ⚠ 참고). */
      lastHomeSig = '';
    }, 1500);
    return;
  }
  /* ── 히어로의 「안 가봤어요」·♡ (b407) ─────────────────────────────
     ⚠ **둘이 남기는 흔적이 다릅니다.**
       · 안 가봤어요 → 별점 없는 **줄을 남깁니다.** 남은 줄은 "이미 물어본
         곳"이라 다시 안 묻습니다(fillQuiz). 그게 이 단추의 뜻입니다.
       · ♡        → `want` 를 켭니다. 보관함에 쌓이고 역시 다시 안 묻습니다.
     ⚠ 기다렸다 넘기지 않습니다 — 별점과 달리 **되돌려 볼 것이 없습니다.**
       바로 다음 도시를 올립니다. */
  const hb = e.target.closest('#home .trybar [data-rate]');
  if (hb){
    const bar = hb.closest('.trybar');
    const cityId = bar.dataset.city;
    if (bar.dataset.done) return;
    bar.dataset.done = '1';
    await saveRate(cityId, hb.dataset.rate === 'want' ? { want: true }
                                                      : { stars: null }, true);
    quizPool = quizPool.filter(c => c.id !== cityId);
    await fillQuiz();
    const shown = new Set([...document.querySelectorAll('#quizlist .rrow')]
      .map(r => r.dataset.cityopen));
    const nx = quizPool.find(c => c.image_url && !shown.has(c.id));
    const hero = $('hero');
    if (nx && hero){
      heroCity = nx;
      const 옛단추 = $('hero')?.nextElementSibling;
      hero.outerHTML = rateHeroHtml(nx);
      옛단추?.remove();
    } else bar.dataset.done = '';
    lastHomeSig = '';
    return;
  }
  const st = e.target.closest('#quizlist .st');
  if (st){
    const wrap = st.closest('.stars'), row = st.closest('.rrow');
    const cityId = wrap.dataset.city;
    const v = starValue(st, e.clientX);
    if (row.dataset.done) return;          /* 밀려나는 중에 또 누르는 것을 막습니다 */
    row.dataset.done = '1';

    /* ── 같은 자리를 다시 누르면 **취소**(b403) ────────────────────────
       히어로와 **같은 규칙**입니다. 한 화면 안에 별이 두 벌인데 한쪽만
       취소가 되면 그게 더 나쁩니다. 자세한 이유는 위 히어로 쪽 주석. */
    const 지금 = wrap.dataset.v ? +wrap.dataset.v : null;
    if (지금 != null && Math.abs(지금 - v) < 1e-9){
      clearTimeout(row._go);
      wrap.dataset.v = '';
      paintStars(wrap, null, true);
      row.classList.remove('rated');
      markRated(row, null);
      /* 히어로와 같은 이유로 **줄을 지웁니다**(b407) — 위 히어로 주석 참고. */
      await dropRate(cityId);
      /* 주머니에서 뺐던 것을 돌려놓습니다 — 취소했는데 다시는 안 물어보면
         안 됩니다. 줄은 그대로 두므로 목록에서 사라지지 않습니다. */
      const c = (cities || []).find(x => x.id === cityId);
      if (c && !quizPool.some(x => x.id === cityId)) quizPool.unshift(c);
      lastHomeSig = '';
      row.dataset.done = '';
      return;
    }

    /* 별이 차는 것을 보여주고 밀어냅니다.
       0.62초는 너무 짧았습니다 — 손이 미끄러져도 고칠 새가 없었습니다.
       1.5초 두었다가 밀어냅니다. 그동안 다시 누르면 점수가 바뀌고,
       **같은 자리를 누르면 취소됩니다**(위). */
    wrap.dataset.v = String(v);
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
        const nx = quizPool.find(c => !shown.has(c.id) && c.id !== heroCity?.id);
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
    const list = quizPool.filter(c => c.id !== heroCity?.id).slice(0, QUIZ_ROWS);
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

  /* ⚠ **대륙 칩을 뺐습니다(b448).** 「유럽 19 · 아시아 7 · 북아메리카 1」이
     여기 있었는데, **분석 탭에 대륙별 진행도**가 생기면서 같은 것을 두 번
     말하게 됐습니다. 게다가 거기는 분모까지 있어(19/44) 얼마나 남았는지도
     보입니다 — 이쪽은 이길 수가 없습니다.
     ⚠ `#s_cont` 자체는 index.html 에 남아 있습니다(빈 채로). 지우려거든
       프로필 머리를 손볼 때 같이 하십시오. */
}


