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
 * ⚠ **이 파일은 성향을 «안 셉니다»(b547).** 리포트를 통째로 persona.js
 *   에게 맡기고 자리만 내줍니다 — 문턱도 축도 거기 하나입니다.
 *
 * 층: dom.js · db.js · cities.js · card.js · map.js 만 씁니다.
 *     app.js 는 import 하지 않습니다 — ctx 로 받습니다(persona.js 머리말). */
import { $, esc } from './dom.js?v=b570';
import { sb } from './db.js?v=b570';
import { cities } from './cities.js?v=b570';
/* 리포트는 persona.js 가 그립니다 — 여기는 자리만 내줍니다(b547).
   ⚠ `personaAxes`·`PERSONA16`·`AXIS_NAME`·`AXIS_WORD` 를 여기서 뗐습니다.
     요약 카드가 없어져서 이 파일은 성향을 **한 번도 안 셉니다** — 세는
     것은 persona.js 한 곳입니다. */
import { renderPersona } from './persona.js?v=b570';
/* ⚠ `funRows` 는 **계산만** 합니다 — 그리는 것은 여기 몫입니다. 지도
   화면과 같은 함수를 써야 같은 물음에 같은 답이 나옵니다(map.js 머리말). */
/* 추천과 궁합은 성향 리포트에서 꺼내온 것입니다(b461) — 계산은 원래
   있던 곳(rec.js · mate.js) 그대로 씁니다. 여기서 다시 세면 두 화면이
   다른 답을 내놓습니다. */
import { similarPicks } from './rec.js?v=b570';
/* 여행 만들기로 바로 잇습니다(b463) — newtrip.js 는 anal.js 를 모르므로
   고리가 안 생깁니다(확인함). */
import { openNew } from './newtrip.js?v=b570';
import { pickCity } from './citysearch.js?v=b570';

let ctx = { me: () => null, showApp: () => {} };
export function setAnalCtx(o){ ctx = { ...ctx, ...o }; }

/* ⚠ **문턱(5곳)은 persona.js 가 압니다.** 여기 두 벌로 두었다가 값이
   갈리면 「성향 보기」를 눌렀는데 「아직」이 나옵니다 — 이 파일은 이제
   성향을 안 세므로 아예 지웁니다. */


/* ⚠ **`성향열기` 를 걷었습니다(b547).** 성향 화면이 이 탭 «안»에 있으므로
   열러 갈 데가 없습니다. 지도를 여는 길(`지도열기`)은 b542 에 기록 탭으로
   갔습니다 — 이 파일에는 이제 다른 화면을 여는 길이 하나도 없습니다. */
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
  /* ⚠ **지우기 «전»에 붙잡습니다.** 아래 ① 참고 — 이 줄이 자식을 다
     지우므로, 두 번째부터는 여기서 안 잡으면 리포트를 영영 잃습니다. */
  const 리포트 = $('personabox');
  box.innerHTML = '';

  /* ══ ① 성향 리포트 ═══════════════════════════════════════════════════
   * ⚠⚠ **요약 카드를 걷고 «리포트 그 자체»를 놓습니다(b547, 사용자 결정).** ⚠⚠
   *   b447 부터 여기는 요약(유형 · 축 막대 넷)이었고, 제목 줄의
   *   「자세히 보기 ›」가 프로필 위에 얹히는 판을 열었습니다. 그 구조는
   *   이 탭이 **여러 가지를 맡던 시절**의 것입니다 — 발자국·다음 여행과
   *   나란히 놓으려니 성향은 요약이어야 했습니다.
   *   b542·b546 을 거치며 이 탭은 **성향 하나만** 맡게 됐습니다. 그러면
   *   요약과 원본이 같은 탭에 두 겹으로 서고, 한 걸음 더 들어갈 이유가
   *   없습니다. 「두 걸음 깊은 것은 아무도 안 본다」가 이 앱에서 여러 번
   *   나온 말인데(b457·b503), 여기서는 아예 걸음을 없앨 수 있습니다.
   * ⚠ **화면을 새로 만들지 않습니다.** `#personabox` 를 **옮겨와서**
   *   persona.js 가 그대로 그립니다 — 두 벌로 그리면 언젠가 갈라집니다.
   * ⚠⚠ **`box.innerHTML = ''` 보다 «먼저» 붙잡아야 합니다.** 그 한 줄이
   *   자식을 다 지우는데, 두 번째로 이 탭을 열 때 `#personabox` 는 이미
   *   그 자식입니다 — 지워지고 나면 `getElementById` 가 null 을 줍니다.
   *   그래서 위에서 미리 잡아 둡니다(`리포트`).
   * ⚠ 매긴 곳이 문턱(5곳)에 못 미쳐도 그냥 그립니다 — 리포트가 스스로
   *   「도시 N곳만 더 매기면」과 「평가하러 가기」를 냅니다(persona.js 의 `임시`). */
  if (리포트){
    box.appendChild(리포트);
    renderPersona();
  }

  /* ⚠ **진기록은 기록 탭으로 갔습니다(b546, 사용자 결정).**
     b542 에 지도 화면에서 여기로 꺼냈던 것인데, 실기기에서 보니 「가장
     많이 간 나라 · 최북단 · 가장 먼 두 도시」는 **성향이 아니라 발자국**
     이야기였습니다. 이 탭은 「나는 어떤 여행자인가」 하나만 맡습니다.
   ⚠ 세는 함수(`funRows`)는 여전히 map.js 것입니다 — 이제 home.js 가
     그것을 씁니다. 여기로 되돌리려거든 거기서 먼저 빼십시오. */



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
