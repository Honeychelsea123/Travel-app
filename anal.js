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
import { $, esc } from './dom.js?v=b506';
import { sb } from './db.js?v=b506';
import { cities, continentOf } from './cities.js?v=b506';
/* personaBackTo 는 persona.js 것입니다 — 「분석에서 왔다」를 적어두면
   닫을 때 분석 탭으로 돌아옵니다(b453). */
import { personaBackTo } from './persona.js?v=b506';
import { personaAxes, personaRank, PERSONA16,
         checkList, shareCard } from './card.js?v=b506';
import { UN_COUNTRIES, CONT, CONT_VIEW, mapBackTo } from './map.js?v=b506';
/* 추천과 궁합은 성향 리포트에서 꺼내온 것입니다(b461) — 계산은 원래
   있던 곳(rec.js · mate.js) 그대로 씁니다. 여기서 다시 세면 두 화면이
   다른 답을 내놓습니다. */
/* 체크 카드 공유 링크(b488) — 보낸 사람과 받은 사람이 같은 24칸을 봐야
   고리가 이어집니다. check.js 머리말 참고. */
import { checkUrl } from './check.js?v=b506';
import { similarPicks } from './rec.js?v=b506';
/* 여행 만들기로 바로 잇습니다(b463) — newtrip.js 는 anal.js 를 모르므로
   고리가 안 생깁니다(확인함). */
import { openNew } from './newtrip.js?v=b506';
import { pickCity } from './citysearch.js?v=b506';

let ctx = { me: () => null, showApp: () => {} };
export function setAnalCtx(o){ ctx = { ...ctx, ...o }; }

const 문턱 = 5;

/* ── 축이 움직였을 때 할 말(b467) ────────────────────────────────────
 * [오른 쪽, 내린 쪽]. 축 순서는 AXIS_NAME 과 같습니다.
 * ⚠ **축 이름을 안 씁니다.** 「개척력이 올랐어요」는 개척력이 무엇인지
 *   아는 사람에게만 말이 됩니다. 무엇이 달라졌는지를 **그대로** 적어야
 *   처음 보는 사람도 읽습니다.
 * ⚠ 방향은 card.js 의 코드 규칙과 같습니다(개척 50↑ = H = 숨은 곳,
 *   단골 50↑ = L = 한 나라, 모험 50↑ = D = 멀리, 만족 50↑ = G = 후함).
 *   한쪽만 고치면 배지와 코드 네 글자가 서로 다른 말을 하게 됩니다. */
const 변화말 = [
  ['숨은 곳을 더 찾게 됐어요',   '유명한 곳을 더 보게 됐어요'],
  ['한 나라를 깊게 파게 됐어요', '여러 나라를 넓게 다니게 됐어요'],
  ['더 멀리 나가게 됐어요',      '가까운 곳을 더 보게 됐어요'],
  ['별점이 후해졌어요',          '별점이 까다로워졌어요'],
];
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
      <div class="part"><img src="./persona/${esc(ax.code)}.png?v=b506"
        alt="" onerror="this.closest('.part').remove()"></div>`;
    머리.onclick = 성향열기;
    성향.appendChild(머리);

    /* ── 변화 배지 ── 카드였던 것을 한 줄로(b464) ────────────────────
       처음 20곳과 최근 20곳을 **같은 함수**로 재서 견줍니다. 카드로 두면
       260px 인데, 정작 하는 말은 「코드가 이렇게 옮겨갔고 어느 축이 제일
       움직였다」 한 문장입니다.
       ⚠ 40곳부터입니다. 20+20 이 겹치면 처음과 지금이 같은 자료가 되어
         늘 「그대로」가 나옵니다 — 아무 말도 안 하는 줄입니다. */
    const 시간순 = 매긴것.filter(r => r.created_at)
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    if (시간순.length >= 40){
      const 처음 = personaAxes(시간순.slice(0, 20), { cities });
      const 지금 = personaAxes(시간순.slice(-20), { cities });
      /* 어느 축이 제일 움직였나. 오른 쪽·내린 쪽을 **말로** 들고 옵니다. */
      const 큰변화 = ['개척', '단골', '모험', '만족']
        .map((k, i) => ({ 값: 지금[k] - 처음[k], 말: 변화말[i] }))
        .sort((a, b) => Math.abs(b.값) - Math.abs(a.값))[0];
      const 배지 = document.createElement('div');
      배지.className = 'pbadge';
      /* ⚠ **「개척력 50 올랐어요」 를 아무도 못 읽었습니다(b467).**
           만든 사람도 왜 올랐는지 몰랐습니다 — 「개척력」 이 무엇을 재는
           말인지 화면 어디에도 없고, 50 이 크다는 것도 알 수가 없습니다.
           숫자와 축 이름을 빼고 **무엇이 달라졌는지 그 자체**를 적습니다:
           「숨은 곳을 더 찾게 됐어요」. 축 이름은 바로 아래 막대가 맡습니다.
         ⚠ 10점 미만은 말로 부풀리지 않습니다 — 3점 움직인 것을 「더
           찾게 됐어요」라고 하면 거짓말이 됩니다. 그때는 코드만 적습니다.
         ⚠ 두 줄입니다. **뜻이 먼저, 근거가 아래.** 코드 네 글자를 먼저
           보여주면 읽는 사람이 그것부터 해석해야 합니다. */
      const 문장 = Math.abs(큰변화.값) >= 10
        ? 큰변화.말[큰변화.값 > 0 ? 0 : 1] : '';
      /* ⚠⚠ **「지금」이라고 쓰면 안 됩니다(b500).** ⚠⚠
       *   바로 위 큰 글자가 **전체 별점으로 낸 지금의 유형**(예: FMDP)인데,
       *   이 줄은 **최근 20곳만**으로 낸 코드(HMDP)입니다. 둘은 다를 수
       *   있고, 실제로 「FMDP … 지금 HMDP」가 한 화면에 같이 떠서
       *   **어느 게 내 유형인지 알 수 없었습니다.**
       * ⚠ **재는 방법은 안 바꿉니다.** 「얼마나 변했나」를 보려면 처음 20곳과
       *   최근 20곳을 견주는 것이 맞습니다 — 전체와 견주면 전체 안에 처음
       *   20곳이 들어 있어 변화가 묽어집니다. **틀린 것은 말이었습니다.**
       *   무엇을 견줬는지 그대로 적습니다. */
      const 아래 = 처음.code === 지금.code
        ? `처음 20곳도 최근 20곳도 <b class="on">${esc(처음.code)}</b>`
        : `처음 20곳 <b>${esc(처음.code)}</b> <i>→</i> ` +
          `최근 20곳 <b class="on">${esc(지금.code)}</b>`;
      배지.innerHTML = 문장
        ? `<span class="why">${esc(문장)}</span><span class="pcd">${아래}</span>`
        : `<span class="pcd">${아래}</span>`;
      성향.appendChild(배지);
    }

    /* ⚠ **축 막대 넷과 궁합 두 칸은 여기 없습니다(b503).** 리포트
       화면(persona.js)에 그대로 있습니다 — 「자세히 보기」로 갑니다.
       실측: 성향 카드가 594px 로 폰 첫 화면의 76% 를 먹고 있었고,
       그 중 축 막대가 169px · 궁합이 79px · 아래 단추가 52px 였습니다.
       분석 탭이 할 말은 **변하는 것**입니다(위 변화 배지). 축 값과
       궁합은 한 번 보면 되는 고정값이라 리포트 자리가 맞습니다. */
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

  const mm = document.createElement('div');
  mm.className = 'minimap';
  mm.style.cursor = 'pointer';
  /* 홈과 **같은 viewBox** 입니다(home.js 의 「왜 이 viewBox 인가」 참고). */
  mm.innerHTML = `<svg viewBox="20 16 976 392"
    preserveAspectRatio="xMidYMid meet">${$('worldland').innerHTML}</svg>`;
  const gone = new Set((cities || [])
    .filter(c => 매긴것.some(r => r.city_id === c.id)).map(c => c.country));
  mm.querySelectorAll('path').forEach(p =>
    p.classList.toggle('been', gone.has(p.dataset.c)));
  mm.onclick = 지도열기;
  발.appendChild(mm);

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

  /* ⚠ **기록은 여기 없습니다(b503 · b505).** 별점 분포와 「가장 많이 간
     나라 · 최북단 …」 줄은 제목 줄의 「자세히 보기 ›」가 여는 세계지도
     화면(#mappane 의 #m_rec, map.js 가 채웁니다)으로 옮겼습니다.
     발자국 카드는 **어디를 갔나**(지도 · 대륙)까지만 맡습니다. 사용자 결정.
   ⚠ 별점표는 아래 체크 카드가 씁니다 — 같이 지우지 마십시오. */
  const 별점표 = {};
  매긴것.forEach(r => { 별점표[r.city_id] = r.stars; });

  /* ── 대륙 체크 카드(b485) ────────────────────────────────────────────
     인스타에 도는 「유럽 24곳 체크」 템플릿과 같은 것을, 매긴 것으로
     **자동으로** 채워 만듭니다(card.js 의 drawCheck 머리말).
     ⚠ **유럽·아시아만 답니다.** 나머지 대륙은 대부분 한두 곳이라 칸이
       텅 빈 카드가 나옵니다 — 빈 칸은 「가야지」가 되라고 두는 것이지
       스물세 칸이 비면 그냥 초라합니다.
     ⚠ 한 대륙이라도 목록을 못 뽑으면(도시 자료가 아직 안 왔을 때)
       단추를 아예 안 답니다. */
  {
    const 낼것 = ['유럽', '아시아']
      .map(이름 => ({ 이름, 곳: checkList(cities, 이름, { continentOf }) }))
      .filter(x => x.곳.length >= 12);
    if (낼것.length){
      const 체크 = document.createElement('div');
      체크.className = 'subsec';
      체크.innerHTML = '<h3 class="secttl">체크 카드</h3>' +
        '<div class="memo" style="margin:-4px 0 10px">' +
        '유명한 곳 24군데 중 몇 곳을 다녀왔는지 한 장으로 만들어요.</div>';
      const 줄 = document.createElement('div');
      줄.className = 'cchips';
      낼것.forEach(({ 이름, 곳 }) => {
        const 간수 = 곳.filter(c => 별점표[c.id] != null).length;
        const b = document.createElement('button');
        b.textContent = `${이름} ${간수}/${곳.length}`;
        b.onclick = () => shareCard({
          kind:'check', title:이름, sub:'가볼 만한 곳',
          items: 곳.map(c => ({ name:c.name, on: 별점표[c.id] != null })),
          /* ⚠ **받은 사람이 같은 24칸으로 떨어져야 합니다(b488).** 그냥 앱
             주소로 보내면 로그인 화면에 떨어지고, 거기서는 「도시 5곳 매기면
             성향」이라는 다른 약속을 합니다 — 카드를 보고 온 사람이 원한
             것이 아닙니다. 링크에는 **대륙 두 글자만** 담깁니다(남의 기록을
             링크에 싣지 않습니다). check.js 머리말 참고. */
          shareUrl: checkUrl(이름),
        }, `기로-${이름}`);
        줄.appendChild(b);
      });
      체크.appendChild(줄);
      발.appendChild(체크);
    }
  }

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
