/* ── 분석 탭 ─────────────────────────────────────────────────────────
 * **이 앱의 가장 큰 무기가 사는 곳입니다(b439 신설 · b447 채움).**
 * 전에는 성향 카드가 프로필 → 「여행 성향」 → 「보기」로 **두 번 들어가야**
 * 나왔습니다. 앱 얼굴이 「나는 어떤 여행자일까」인데 그 답이 제일 깊은
 * 곳에 있었습니다.
 *
 * ⚠ **화면을 새로 만들지 않습니다.** 성향 카드(persona.js)와 세계지도
 *   (map.js)는 이미 있고 잘 돕니다. 여기는 **들어가기 전에 보는 요약**이고,
 *   누르면 그 화면으로 보냅니다. 카드를 여기서 또 그리면 두 벌이 되어
 *   언젠가 갈라집니다(card.js 머리말과 같은 이유).
 *
 * ⚠ **문턱은 5곳입니다.** persona.js · try.js 와 같은 값이어야 합니다 —
 *   여기서만 낮추면 "성향 보기" 를 눌렀는데 "아직" 이 나옵니다.
 *
 * 층: dom.js · db.js · cities.js · card.js · map.js 만 씁니다.
 *     app.js 는 import 하지 않습니다 — ctx 로 받습니다(persona.js 머리말). */
import { $, esc } from './dom.js?v=b528';
import { sb } from './db.js?v=b528';
import { cities, continentOf } from './cities.js?v=b528';
/* personaBackTo 는 persona.js 것입니다 — 「분석에서 왔다」를 적어두면
   닫을 때 분석 탭으로 돌아옵니다(b453). */
import { personaBackTo } from './persona.js?v=b528';
import { personaAxes, personaRank, PERSONA16,
         AXIS_NAME, AXIS_WORD } from './card.js?v=b528';
import { UN_COUNTRIES, CONT, CONT_VIEW, mapBackTo } from './map.js?v=b528';
/* 손가락으로 돌려 보는 지구본(b519) — 발자국 카드의 지도가 이것입니다. */
import { mountGlobe } from './globe.js?v=b528';
/* 추천과 궁합은 성향 리포트에서 꺼내온 것입니다(b461) — 계산은 원래
   있던 곳(rec.js · mate.js) 그대로 씁니다. 여기서 다시 세면 두 화면이
   다른 답을 내놓습니다. */
import { similarPicks } from './rec.js?v=b528';
/* 여행 만들기로 바로 잇습니다(b463) — newtrip.js 는 anal.js 를 모르므로
   고리가 안 생깁니다(확인함). */
import { openNew } from './newtrip.js?v=b528';
import { pickCity } from './citysearch.js?v=b528';

let ctx = { me: () => null, showApp: () => {} };
export function setAnalCtx(o){ ctx = { ...ctx, ...o }; }

const 문턱 = 5;



/* ── 성향·지도를 여는 길(b453) ────────────────────────────────────────
 * ⚠ 두 화면은 **프로필 위에 얹히는 판**으로 만들어져서, 열려면 프로필
 *   탭을 거쳐야 합니다. 그래서 분석 탭에서 열면 **하단바가 프로필로
 *   옮겨가고**, 뒤로 가면 프로필에 떨어졌습니다.
 * ⚠ **「분석에서 왔다」를 먼저 적어둡니다.** 닫을 때 그 값을 보고 분석
 *   탭으로 돌려보냅니다(map.js·persona.js 의 「나온 자리로」).
 * ⚠ 여는 절차를 다섯 군데에 흩어 두면 한 곳만 고쳐집니다 — 여기 둘로
 *   모읍니다. */
function 성향열기(){
  personaBackTo('anal');
  ctx.showApp('set', 'anal');   /* 하단바는 분석에 남깁니다 */
  $('openpersona')?.click();
}
function 지도열기(){
  mapBackTo('anal');
  ctx.showApp('set', 'anal');
  $('openmap')?.click();
}

/* ── 추천 도시로 바로 여행 만들기(b463) ──────────────────────────────
 * ⚠ **`#newcard` 는 탭 안에 있지 않습니다.** 화면 위에 얹히는 한 장이라
 *   분석 탭에서 열어도 그대로 뜹니다(app.js 의 showApp 이 탭을 옮길 때
 *   닫아 줍니다). 그래서 탭을 옮기지 않습니다 — 옮기면 하단바가 튀고
 *   뒤로 갈 자리도 애매해집니다.
 * ⚠ `openNew()` 가 도시 목록을 받아온 뒤라야 고를 수 있습니다. 그래서
 *   **await 합니다** — 안 기다리면 pickCity 가 빈 화면을 채웁니다.
 * ⚠ 고르는 절차는 citysearch.js 의 pickCity 하나입니다. 검색으로 고른
 *   것과 여기서 고른 것이 **같은 상태**여야 다음 단계가 같이 돕니다. */
async function 여행짜기(city){
  await openNew();
  pickCity(city);
}

/* 줄 하나. 홈·프로필과 **같은 부품**(.fprow)입니다 — 새로 만들면 리듬이
   또 갈립니다(app.css 의 「내가 쌓은 것」 주석). */
function 줄(제목, 밑, 오른쪽, 눌렀을때){
  const el = document.createElement('div');
  el.className = 'fprow';
  el.innerHTML = `<span class="t"><b>${esc(제목)}</b><span>${esc(밑)}</span></span>
    <span class="go">${esc(오른쪽)} ›</span>`;
  el.onclick = 눌렀을때;
  return el;
}

export async function loadAnal(){
  const box = $('analbox');
  if (!box || !ctx.me()) return;

  /* ⚠ **제 질의를 합니다.** `myRates` 는 평가 탭을 열어야 채워집니다 —
     분석 탭만 열고 온 사람에게는 비어 있습니다(home.js 의 renderFoot 에서
     겪은 것과 같은 함정).
     ⚠ **한 번에 다 받습니다(b461).** 「다음 여행」이 씨앗으로 want 도 씁니다 —
       별점만 쓰면 아직 안 가본 결이 통째로 빠집니다(rec.js). created_at 은
       성향 변화가 씁니다. 카드가 넷이어도 왕복은 하나입니다. */
  const [{ data: f }, 평가] = await Promise.all([
    sb.rpc('my_footprint'),
    sb.from('city_ratings').select('city_id,stars,want,created_at')
      .eq('user_id', ctx.me().id),
  ]);

  const 전부   = 평가?.data || [];
  const 매긴것 = 전부.filter(r => r.stars != null);
  const 나라   = f?.countries ?? 0;
  const pct    = Math.min(100, 나라 / UN_COUNTRIES * 100);
  box.innerHTML = '';

  /* ══ ① 내 여행 성향 ══════════════════════════════════════════════════
     **카드 셋을 하나로 합쳤습니다(b464).** 「성향」·「성향이 변했어요」·
     「친구와 궁합」이 따로 서 있었는데, 셋 다 **같은 것 하나**를 말합니다 —
     내 유형. 카드가 갈려 있으면 스크롤만 길어지고, 사이에 낀 다른 주제가
     이야기를 끊습니다. 변화는 배지 한 줄, 궁합은 단추 하나면 충분합니다. */
  const 성향 = document.createElement('div');
  성향.className = 'card quiet';
  성향.innerHTML = '<h2><span class="grow">성향</span></h2>';

  let 내코드 = null, 내이름 = null;
  if (매긴것.length >= 문턱){
    const ax = personaAxes(매긴것, { cities });
    const 유형 = PERSONA16[ax.code] || { n:'여행자', d:'' };
    내코드 = ax.code; 내이름 = 유형.n;

    /* ── 「자세히 보기」는 제목 줄 오른쪽 하나로(b503) ────────────────
       카드 **맨 아래** 단추 둘(자세히 보기 · 궁합 보내기)이었습니다.
       홈의 「내 발자국 · 지도 ›」와 같은 자리로 올립니다 — 단추가 카드마다
       다른 높이에 있으면 찾을 자리가 매번 달라집니다. 제목 옆이면 어느
       카드든 같은 자리입니다.
       ⚠ 궁합은 여기서 뺐습니다. 리포트 화면에 궁합 두 칸도 「친구와 궁합
         보기」 단추도 이미 있습니다(persona.js 의 #p_mate) — 같은 것을 두
         곳에 두면 언젠가 한쪽만 고쳐집니다. */
    const 성향더 = document.createElement('button');
    성향더.className = 'h2go';
    성향더.textContent = '자세히 보기 ›';
    성향더.onclick = 성향열기;
    성향.querySelector('h2').appendChild(성향더);
    const 나라수 = new Set(매긴것
      .map(r => (cities || []).find(c => c.id === r.city_id)?.country)
      .filter(Boolean)).size;

    /* 유형을 크게 · 그림과 함께. 일러스트는 card.js 가 카드에 쓰는 것과
       **같은 파일**입니다(persona/{코드}.png) — 두 벌로 두면 갈라집니다. */
    const 머리 = document.createElement('div');
    머리.className = 'ptop';
    머리.innerHTML = `<div class="pmeta"><div class="pcode">${esc(ax.code)}</div>
      <div class="pname">${esc(유형.n)}</div>
      <span class="prank">${esc(personaRank(나라수))}</span></div>
      <div class="part"><img src="./persona/${esc(ax.code)}.png?v=b528"
        alt="" onerror="this.closest('.part').remove()"></div>`;
    머리.onclick = 성향열기;
    성향.appendChild(머리);

    /* ⚠ **변화 배지(「처음 20곳 → 최근 20곳」)는 여기 없습니다(b519).**
       리포트 화면으로 옮겼습니다(persona.js) — 사용자 결정. 이 카드는
       **지금 내가 누구인가**만 말하고, 견주는 이야기는 읽으러 들어온
       사람의 몫입니다. `변화말` 표도 같이 갔습니다. */
    /* ⚠ **궁합 두 칸만 없습니다(b503).** 궁합은 애초에 남 이야기라 내
       기록을 보는 탭이 아니라 리포트 화면에 있습니다(persona.js — 궁합
       두 칸도 「친구와 궁합 보기」 단추도 거기 그대로입니다).
       ⚠ **축 막대 넷은 b508 에 되살렸습니다.** b503 에 카드 길이를 줄이려고
         같이 걷었는데, 성향 탭에 들어와서 그래프가 없으면 「내 성향」이
         숫자 없는 이름 네 글자로만 남습니다. 사용자 지적 — 그래프가 이
         카드의 알맹이입니다. 길이는 궁합·아래 단추를 뺀 것으로 벌었습니다
         (594 → 442px). */
    /* ── 네 축 ── 가로 막대(b465) ─────────────────────────────────────
       ⚠ **b464 에 레이더로 바꿨다가 되돌립니다.** 실기기에서 보니
         다이아몬드는 값을 읽기 어렵습니다 — 개척력 36 과 만족력 26 이
         꼭짓점 길이로 거의 같아 보이고, 이름과 숫자가 사방에 흩어져
         위에서 아래로 훑을 수가 없습니다.
       ⚠⚠ **넷 다 앱 파랑입니다(b501).** 전에는 축마다 분류색(--k-*)을
         달리 줬습니다 — 「서로 다른 것을 잰다」를 색으로 말하려던 것인데,
         **한 화면에 주황·초록·파랑·보라가 서고** 앱의 다른 어디에도
         없는 무지개가 됐습니다. 서로 다르다는 것은 **이름과 값**이 이미
         말합니다. 색은 앱 전체와 같아야 합니다.
       ⚠ 인라인으로 안 칠합니다 — `.axbar > i` 가 이미 `--primary` 입니다.
         여기서 덮어쓰면 앱 색을 바꿔도 이 막대만 안 따라옵니다. */
    const 값 = [ax.개척, ax.단골, ax.모험, ax.만족];
    const 판 = document.createElement('div');
    판.className = 'axbars';
    /* ⚠ **축 이름만으로는 아무도 모릅니다(b467).** 「개척력 36」 을 보고
         무엇이 36 인지 알 길이 없습니다 — 처음 보는 말이고, 높은 게
         좋은 건지도 안 적혀 있습니다.
         지금 값이 **어느 쪽인지**를 이름 밑에 한 마디로 답니다
         (36 이면 「유명한 곳」, 85 면 「멀리」). 숫자를 몰라도 읽힙니다.
       ⚠ 그 말은 card.js 의 AXIS_WORD 하나입니다 — 코드 네 글자(FMDP)가
         쓰는 것과 **같은 표**라, 글자와 막대가 늘 같은 말을 합니다. */
    const 극 = i => AXIS_WORD[
      [값[0] >= 50 ? 'H' : 'F', 값[1] >= 50 ? 'L' : 'M',
       값[2] >= 50 ? 'D' : 'N', 값[3] >= 50 ? 'G' : 'P'][i]];
    판.innerHTML = AXIS_NAME.map((n, i) => `
      <div class="axrow"><span class="axn"><b>${esc(n)}</b>
        <span>${esc(극(i))}</span></span>
        <span class="axbar"><i style="width:${Math.max(값[i], 2)}%"></i></span>
        <span class="axv">${값[i]}</span></div>`).join('');
    성향.appendChild(판);
  } else {
    성향.appendChild(줄('내 성향',
      `${문턱 - 매긴것.length}곳만 더 매기면 유형이 나와요`, '매기러 가기',
      () => ctx.showApp('rate')));
  }
  box.appendChild(성향);

  /* ══ ② 내 발자국 ═══════════════════════════════════════════════════
     ⚠ 홈에도 지도가 있습니다(사용자 결정 — 중복을 알고 둡니다).
       been 도 홈에 지도가 있고 Visualize 탭에 더 많은 시각화가 있습니다. */
  const 발 = document.createElement('div');
  발.className = 'card quiet';
  발.innerHTML = `<h2><span class="grow">발자국</span></h2>
    <div class="memo" style="margin:-4px 0 10px">${esc(나라
      ? `${UN_COUNTRIES}개국 중 ${나라}개국 · ${pct.toFixed(1)}%`
      : '별점을 매기면 여기에 쌓여요')}</div>`;

  /* 「자세히 보기」는 성향 카드와 **같은 자리**입니다(b503) — 제목 줄
     오른쪽. 카드마다 단추 자리가 다르면 그때그때 찾아야 합니다.
     가는 곳은 나라 목록(#ctrypane)이고, 아래 기록도 거기 있습니다. */
  const 발더 = document.createElement('button');
  발더.className = 'h2go';
  발더.textContent = '자세히 보기 ›';
  발더.onclick = 지도열기;
  발.querySelector('h2').appendChild(발더);

  const gone = new Set((cities || [])
    .filter(c => 매긴것.some(r => r.city_id === c.id)).map(c => c.country));

  /* ── 여기는 지구본입니다(b519) ──────────────────────────────────────
   * 사용자 제안. 처음엔 세계지도 화면에 토글로 넣었는데(b516), 거기는
   * 두 걸음 들어가야 하는 자리라 「돌려 보는 재미」가 안 살았습니다.
   * 발자국 카드가 제자리입니다 — 이 카드가 곧 「내가 어디를 갔나」입니다.
   *
   * ⚠ **여기 지도는 원래 장식이었습니다.** 눌러서 지도 화면을 여는 것
   *   말고는 하는 일이 없습니다 — 홈 미니맵과 달리 대륙 확대(CONT_VIEW)에
   *   묶여 있지 않아서, 지구본으로 바꿔도 잃는 것이 없습니다.
   *   ⚠ **홈 것은 바꾸지 마십시오.** 거기는 아래 대륙 카드를 넘기면 지도가
   *     그 대륙으로 확대됩니다(b500·b511). 평면 좌표가 있어야 합니다.
   * ⚠ 절반은 안 보입니다. 그 대신 바로 밑 **대륙 배지 여섯**이 전체를
   *   숫자로 말하고, 「자세히 보기 ›」가 펼친 평면 지도로 갑니다.
   * ⚠ 눌러서 여는 것과 돌리는 것이 한 자리에 있습니다 — 민 뒤의 누름
   *   한 번은 건너뜁니다(globe.js 가 `민적있나` 로 알려줍니다). */
  const 공칸 = document.createElement('div');
  공칸.className = 'globebox';
  const 공판 = document.createElement('canvas');
  공판.setAttribute('aria-label', '지구본');
  공칸.appendChild(공판);
  발.appendChild(공칸);
  /* ⚠⚠ **rAF 로 붙이지 마십시오(b524).** ⚠⚠
     붙은 뒤에 폭이 생기므로 한 박자 미루는 것은 맞는데, 그 한 박자를
     `requestAnimationFrame` 으로 잡으면 **창이 뒤에 있을 때 아예 안
     불립니다.** 크롬은 배경 탭에서 rAF 를 멈춥니다 — 실제로 지구본이
     영영 안 그려졌습니다(칸은 360×240 인데 캔버스는 손도 안 댄 300×150,
     `공판.onclick` 도 null 이었습니다. 즉 콜백 자체가 안 왔습니다).
     타이머는 배경에서도 (느려질지언정) 옵니다.
     폭이 아직 0 이면 globe.js 가 스스로 몇 번 더 옵니다. */
  setTimeout(() => {
    /* 처음 보이는 면은 globe.js 가 정합니다 — 대한민국이 한가운데(b525). */
    const 공 = mountGlobe(공판, gone);
    공판.onclick = () => { if (!공?.민적있나()) 지도열기(); };
  }, 0);

  /* ── 대륙별 ── 막대 여섯 줄을 칩 한 뭉치로(b464) ───────────────────
     ⚠ **바로 위에 지도가 있습니다.** 어디를 칠했는지는 지도가 이미
       말하고 있어서, 막대 여섯 줄은 같은 말을 한 번 더 하면서 120px 을
       썼습니다. 남은 것은 **숫자**이고 그건 칩으로 충분합니다.
     ⚠ 한 곳도 안 간 대륙은 흐리게 — 「여기가 비었다」가 다음 여행을
       만듭니다. 아예 빼면 여섯 중 몇인지가 안 보입니다. */
  const 대륙셈 = {};
  (cities || []).forEach(c => {
    if (!gone.has(c.country)) return;
    const k = continentOf[c.country]; if (!k) return;
    (대륙셈[k] = 대륙셈[k] || new Set()).add(c.country);
  });
  /* ── 대륙 배지 ── 칩을 배지로(b499) ────────────────────────────────
   * 전에는 글자 알약 여섯이었습니다. **여섯이 다 같아 보여서** 숫자를
   * 하나씩 읽어야 어디가 빈 대륙인지 알 수 있었습니다. 이제 그 대륙의
   * 모양이 배지에 들어가고, **다녀온 나라가 칠해집니다.**
   *
   * ⚠⚠ **바로 위에 지도가 있습니다 — 갈라 놓아야 합니다.** ⚠⚠
   *   b496 에서 홈의 좌우 넘김 카드에 같은 것을 넣었다가 **지도 위에
   *   지도**가 되어 걷었습니다(b497). 그때는 큰 지도 바로 밑에 붙였던
   *   것이 문제였습니다. 여기서는 `.subsec`(위 구분선 + 섹션 제목)으로
   *   **다른 이야기**임을 먼저 보여주고 그 안에 놓습니다 — 발자취 앱이
   *   「지역 배지」를 그렇게 떼어 놓습니다.
   * ⚠ **새 자산이 없습니다.** 좌표는 `#worldland` 에 이미 있고, 대륙별로
   *   어디를 자를지는 map.js 의 `CONT_VIEW` 가 압니다(큰 지도의 대륙
   *   단추가 쓰는 그 표). 같은 표를 써야 배지와 지도가 같은 모양입니다.
   * ⚠ **`slice` 입니다. `meet` 이 아닙니다.** `meet` 은 viewBox 밖을 안
   *   가려서 남는 여백에 나머지 세계가 비칩니다 — b496 에서 유럽 배지에
   *   북아메리카가 같이 나왔습니다.
   * ⚠⚠ **비율은 0.9 — 정사각에 가깝습니다.** 큰 지도 비율(2.58)로 잘랐다가
   *   **키 큰 대륙의 위아래가 잘렸습니다** — 아프리카 배지가 통째로 회색으로
   *   나왔습니다(이집트가 위, 남아공이 아래라 둘 다 창 밖). 남아메리카도
   *   반만 보였고 뉴질랜드는 사라졌습니다. 셋을 나란히 그려 골랐습니다
   *   (2.58 · 0.75 · 0.9). CONT_VIEW 의 `w` 는 그대로 쓰고 **높이만** 넉넉히
   *   잡습니다 — 가로 가운데는 그 표가 이미 잘 잡아 두었습니다. */
  const 땅 = $('worldland')?.innerHTML || '';
  const 비율 = 0.9;
  const 대륙판 = document.createElement('div');
  대륙판.className = 'subsec';
  대륙판.innerHTML = '<h3 class="secttl">대륙</h3>';
  const 대륙 = document.createElement('div');
  대륙.className = 'contbadges';
  대륙.innerHTML = CONT.map(([이름, 전체]) => {
    const n = 대륙셈[이름]?.size || 0;
    const v = CONT_VIEW[이름];
    const box = v
      ? `${(v.cx - v.w / 2).toFixed(1)} ${(v.cy - v.w * 비율 / 2).toFixed(1)}` +
        ` ${v.w} ${(v.w * 비율).toFixed(1)}`
      : '20 16 976 392';
    return `<div class="cbadge${n ? '' : ' off'}">
      <div class="cbmap" aria-hidden="true">${땅
        ? `<svg viewBox="${box}" preserveAspectRatio="xMidYMid slice">${땅}</svg>` : ''}</div>
      <div class="cbtext"><b>${esc(이름)}</b>
        <span><i>${n}</i> / ${전체}${n ? '' : ' · 아직'}</span></div>
    </div>`;
  }).join('');
  /* 지도와 **같은 `gone` 으로** 칠합니다 — 따로 세면 둘이 다른 말을 합니다. */
  대륙.querySelectorAll('.cbmap path').forEach(p =>
    p.classList.toggle('been', gone.has(p.dataset.c)));
  대륙판.appendChild(대륙);
  발.appendChild(대륙판);

  /* ⚠ **기록도 체크 카드도 여기 없습니다(b503 · b505 · b507).**
     ① 기록 — 별점 분포와 「가장 많이 간 나라 · 최북단 …」 줄은 제목 줄의
        「자세히 보기 ›」가 여는 세계지도 화면(#mappane 의 #m_rec, map.js 가
        채웁니다)으로 옮겼습니다.
     ② 체크 카드 — 「유럽 24곳 체크」를 만들어 보내는 자리가 여기 하나였는데
        아예 없앴습니다(b507). 사용자 결정 — 공유하는 길이 이미 여럿입니다
        (성향 카드 · 궁합 링크 · 영수증 · 나라 목록). 받는 쪽(?check=eu)과
        그리는 코드도 같이 걷었습니다: check.js · card.js 의 drawCheck ·
        checkList · #checkbox · .ckgrid 무리. 옛 링크로 들어와도 맛보기
        평가가 그대로 떠서 빈 화면은 안 납니다.
     발자국 카드는 **어디를 갔나**(지도 · 대륙)까지만 맡습니다. */
  box.appendChild(발);

  /* ══ ③ 다음 여행 ═══════════════════════════════════════════════════
     「다음에 가볼 만한 곳」과 「가보고 싶어요」를 합쳤습니다(b464).
     하나는 우리가 고른 것, 하나는 본인이 골라둔 것 — 둘 다 **아직 안 간
     곳** 이야기라 한 카드에 있는 편이 맞습니다.
     ⚠ 세 줄을 **한 덩어리로 합치지 마십시오.** 「어울리는 곳」은
       감추고-맞히기로 재서 정한 것이고, 「반대로 가보면」은 정확도를
       주장하지 않으며, 「가보고 싶어요」는 본인이 적은 것입니다.
       출처가 다른 셋이라 섞으면 앞의 넷까지 못 믿게 됩니다(rec.js).
     ⚠ 칩을 누르면 그 도시가 골라진 채로 여행 만들기가 열립니다(b463) —
       읽고 끝나면 분석 탭이 읽을거리로 남습니다. */
  const 골라 = similarPicks(cities, 전부, { n: 4 });
  const 위시 = 전부.filter(r => r.want && r.stars == null)
    .map(r => (cities || []).find(c => c.id === r.city_id)).filter(Boolean);

  if (골라.match.length || 골라.opposite.length || 위시.length){
    const 갈곳 = document.createElement('div');
    갈곳.className = 'card quiet';
    갈곳.innerHTML = '<h2>다음 여행</h2>';

    const 줄내기 = (제목, 도시들, 꼬리) => {
      if (!도시들.length) return;
      const 줄 = document.createElement('div');
      줄.className = 'picks';
      줄.innerHTML = `<span class="label">${esc(제목)}${
        꼬리 ? `<i>${esc(꼬리)}</i>` : ''}</span>`;
      const 칩들 = document.createElement('div');
      칩들.className = 'cchips';
      도시들.slice(0, 6).forEach(c => {
        const b = document.createElement('button');
        b.textContent = c.name;
        b.onclick = () => 여행짜기(c);
        칩들.appendChild(b);
      });
      줄.appendChild(칩들);
      갈곳.appendChild(줄);
    };
    줄내기('어울리는 곳', 골라.match.map(x => x.city));
    줄내기('반대로 가보면', 골라.opposite.map(x => x.city));
    줄내기('가보고 싶어요', 위시,
           위시.length > 6 ? `${위시.length}곳 중 6곳` : '');
    box.appendChild(갈곳);
  }
}

/* 지도를 여는 길. `openMap` 을 직접 import 하면 map.js ↔ anal.js 고리가
   생기지는 않지만(map 은 anal 을 모릅니다), 단추를 누르는 쪽이 이미 있어
   그것을 씁니다 — 여는 절차가 두 벌이 되지 않게. */
function openMapSafe(){ $('openmap')?.click(); }
