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
import { $, esc } from './dom.js?v=b544';
import { sb } from './db.js?v=b544';
import { cities } from './cities.js?v=b544';
/* personaBackTo 는 persona.js 것입니다 — 「분석에서 왔다」를 적어두면
   닫을 때 분석 탭으로 돌아옵니다(b453). */
import { personaBackTo } from './persona.js?v=b544';
import { personaAxes, personaRank, PERSONA16,
         AXIS_NAME, AXIS_WORD } from './card.js?v=b544';
/* ⚠ `funRows` 는 **계산만** 합니다 — 그리는 것은 여기 몫입니다. 지도
   화면과 같은 함수를 써야 같은 물음에 같은 답이 나옵니다(map.js 머리말). */
import { funRows, mapBackTo } from './map.js?v=b544';
/* 추천과 궁합은 성향 리포트에서 꺼내온 것입니다(b461) — 계산은 원래
   있던 곳(rec.js · mate.js) 그대로 씁니다. 여기서 다시 세면 두 화면이
   다른 답을 내놓습니다. */
import { similarPicks } from './rec.js?v=b544';
/* 여행 만들기로 바로 잇습니다(b463) — newtrip.js 는 anal.js 를 모르므로
   고리가 안 생깁니다(확인함). */
import { openNew } from './newtrip.js?v=b544';
import { pickCity } from './citysearch.js?v=b544';

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
/* ⚠ **`지도열기` 를 걷었습니다(b542).** 발자국 카드가 기록 탭으로 가면서
   이 탭에서 지도를 여는 자리가 없어졌습니다. 다시 필요하면 home.js 에
   같은 것이 있습니다 — 두 벌로 만들지 마십시오. */

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
  /* ⚠ **`my_footprint` 를 안 부릅니다(b542).** 그것이 주던 「28개국 ·
     14.4%」는 발자국 카드의 것이었고, 카드는 기록 탭으로 갔습니다.
     여기 남은 셋(성향 · 진기록 · 다음 여행)은 전부 평가 줄로 셉니다.
     왕복이 둘에서 하나로 줄었습니다. */
  const 평가 = await sb.from('city_ratings').select('city_id,stars,want,created_at')
    .eq('user_id', ctx.me().id);

  const 전부   = 평가?.data || [];
  const 매긴것 = 전부.filter(r => r.stars != null);
  /* 도시 id → 별점. 진기록이 씁니다 — 지도 화면이 쓰는 것과 같은 모양입니다. */
  const 별점   = Object.fromEntries(매긴것.map(r => [r.city_id, r.stars]));
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
      <div class="part"><img src="./persona/${esc(ax.code)}.png?v=b544"
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

  /* ══ ② 진기록 ══════════════════════════════════════════════════════
   * **발자국 카드는 기록 탭으로 통째로 갔습니다(b542).** 지구본·대륙
   * 배지·「195개국 중 28개국」이 전부 그쪽입니다 — 앱을 열면 첫 화면이
   * 그것입니다. 여기 또 두면 같은 지도가 두 탭에 섭니다.
   *
   * 대신 **지도 화면 두 걸음 안에 갇혀 있던 것**을 여기로 꺼냅니다.
   * ⚠⚠ **이 자리는 세 번째입니다.** b457 에 여기서 빼서 지도 화면으로
   *   보냈고(「분석 탭 첫 화면을 짧게」), b503 에 그 결정을 지도 쪽에
   *   적어두면서 「또 안 보이면 다음 자리는 나라 목록」이라고 남겼습니다.
   *   이번에는 **분석 탭이 성향만 맡게 되면서 자리가 비었습니다.**
   *   「가장 먼 두 도시」는 지도의 부록이 아니라 분석입니다.
   * ⚠ **이름이 「기록」이 아니라 「진기록」입니다.** 하단바의 첫 탭 이름이
   *   「기록」이 되었습니다 — 여기까지 「기록」이면 둘이 헷갈립니다.
   *   이건 일기가 아니라 **최고 기록**입니다.
   * ⚠ **세는 것은 map.js 의 `funRows` 하나입니다.** 여기서 다시 세면
   *   같은 물음에 두 답이 나옵니다.
   * ⚠ 칸은 **내림**입니다. 별점이 0.5 단위라 4.5 는 ★4 칸입니다.
   *   반올림하면 아래 「별 다섯을 준 곳」(정확히 5.0)과 어긋납니다. */
  const 내도시 = (cities || []).filter(c => 별점[c.id] != null);
  if (내도시.length){
    const 진 = document.createElement('div');
    진.className = 'card quiet';
    const 통계 = [0, 0, 0, 0, 0];
    내도시.forEach(c => {
      const k = Math.floor(Number(별점[c.id]));
      if (k >= 1 && k <= 5) 통계[k - 1]++;
    });
    const 합 = 통계.reduce((x, y) => x + y, 0) || 1;
    /* ★5 초록에서 ★1 붉은색으로. 지도 화면에 있던 값 그대로입니다. */
    const 색 = ['#C4626B', '#D08A5A', '#C9A227', '#7FA05A', '#4C8C4A'];
    진.innerHTML = `<h2>진기록</h2>
      <div class="stackwrap">
        <div class="stack">${[5, 4, 3, 2, 1].map(k => 통계[k - 1]
          ? `<i style="width:${(통계[k - 1] / 합 * 100).toFixed(1)}%;
               background:${색[k - 1]}" title="★${k} ${통계[k - 1]}곳"></i>` : '').join('')}</div>
        <div class="stackleg">${[5, 4, 3, 2, 1].map(k =>
          `<span${통계[k - 1] ? '' : ' class="off"'}><b style="background:${
            색[k - 1]}"></b>★${k} ${통계[k - 1]}곳</span>`).join('')}</div>
      </div>
      ${funRows(내도시, 별점).map(([제목, 값]) =>
        `<div class="row"><span class="label">${esc(제목)}</span>
           <span class="val">${esc(값)}</span></div>`).join('')}`;
    box.appendChild(진);
  }


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
