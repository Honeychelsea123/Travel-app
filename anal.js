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
import { $, esc } from './dom.js?v=b463';
import { sb } from './db.js?v=b463';
import { cities, continentOf } from './cities.js?v=b463';
/* personaBackTo 는 persona.js 것입니다 — 「분석에서 왔다」를 적어두면
   닫을 때 분석 탭으로 돌아옵니다(b453). */
import { personaBackTo } from './persona.js?v=b463';
import { personaAxes, personaRank, personaMates, PERSONA16,
         AXIS_NAME } from './card.js?v=b463';
import { UN_COUNTRIES, CONT, mapBackTo, funRows } from './map.js?v=b463';
/* 추천과 궁합은 성향 리포트에서 꺼내온 것입니다(b461) — 계산은 원래
   있던 곳(rec.js · mate.js) 그대로 씁니다. 여기서 다시 세면 두 화면이
   다른 답을 내놓습니다. */
import { similarPicks } from './rec.js?v=b463';
/* 여행 만들기로 바로 잇습니다(b463) — newtrip.js 는 anal.js 를 모르므로
   고리가 안 생깁니다(확인함). */
import { openNew } from './newtrip.js?v=b463';
import { pickCity } from './citysearch.js?v=b463';
import { shareMate } from './mate.js?v=b463';

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
     겪은 것과 같은 함정). */
  /* ⚠ **한 번에 다 받습니다(b461).** 「다음에 가볼 만한 곳」이 씨앗으로
     `want`(가보고 싶어요)도 씁니다 — 별점만 쓰면 아직 안 가본 결이
     통째로 빠집니다(rec.js). 그래서 `stars` 로 거르지 않고 전부 받아
     여기서 나눕니다. 질의를 하나 더 붙이는 것보다 낫습니다.
     created_at 은 「성향이 변했어요」가 씁니다 — 시간순으로 갈라야
     처음과 지금을 비교할 수 있습니다. */
  const [{ data: f }, 평가] = await Promise.all([
    sb.rpc('my_footprint'),
    sb.from('city_ratings').select('city_id,stars,want,created_at')
      .eq('user_id', ctx.me().id),
  ]);

  const 전부 = 평가?.data || [];
  const 매긴것 = 전부.filter(r => r.stars != null);
  const 나라 = f?.countries ?? 0;
  const pct = Math.min(100, 나라 / UN_COUNTRIES * 100);
  box.innerHTML = '';

  /* ── ① 성향 ── 이 탭의 주인공 ────────────────────────────────────
     문턱을 넘었으면 **네 축을 막대로** 펼칩니다. 한 줄짜리 「FMDP ›」로는
     무엇을 보러 온 탭인지 안 읽힙니다 — 들어오자마자 내가 어떤 사람인지
     보여야 합니다. 못 넘었으면 빈손으로 돌려보내지 않고 몇 곳 남았는지
     적습니다(persona.js 의 「문턱은 벽이 아니라 눈금입니다」와 같은 태도). */
  const 성향 = document.createElement('div');
  성향.className = 'card quiet';
  /* ⚠ **제목을 답니다(b455).** 유형 코드(FMDP)가 크게 있긴 하지만 그것만으로는
     **무엇을 재서 나온 것인지** 안 읽힙니다. 아래 「내 발자국」 카드와도
     짝이 맞아야 합니다 — 카드마다 좌상단에 이름이 있어야 훑을 때 걸립니다. */
  성향.innerHTML = '<h2>내 여행 성향</h2>';
  /* 아래 ⑤ 궁합 카드도 코드를 씁니다 — 여기서 한 번만 정하고 밖에서도
     보이게 둡니다. 문턱을 못 넘었으면 null 이고, 그러면 궁합 카드도
     안 답니다(보낼 것이 없습니다). */
  let 내코드 = null, 내이름 = null;
  if (매긴것.length >= 문턱){
    const ax = personaAxes(매긴것, { cities });
    const 유형 = PERSONA16[ax.code] || { n:'여행자', d:'' };
    내코드 = ax.code; 내이름 = 유형.n;
    const 나라수 = new Set(매긴것
      .map(r => (cities || []).find(c => c.id === r.city_id)?.country)
      .filter(Boolean)).size;
    /* ── 유형을 **크게 · 그림과 함께** ──────────────────────────────
       한 줄짜리 「FMDP ›」로는 무엇을 보러 온 탭인지 안 읽힙니다.
       들어오자마자 내가 누구인지 보여야 합니다.
       ⚠ **일러스트를 새로 만들지 않습니다.** 열여섯 장이 이미 있습니다
         (`persona/{코드}.png`, card.js 의 p16Image 가 카드에 쓰는 것과
         **같은 파일**). 두 벌로 두면 카드와 화면의 그림이 갈라집니다.
       ⚠ 판 꼬리표(`?v=`)를 붙입니다 — 서비스워커가 **본 것만** 담고 옛
         판을 지웁니다(sw.js). 열여섯 장 612KB 를 미리 담을 이유가 없고,
         한 사람은 자기 유형 하나만 봅니다.
       ⚠ 그림이 안 와도 화면은 멀쩡해야 합니다 — onerror 로 지웁니다.
         카드에서도 같은 규칙입니다("그림 하나 때문에 카드를 못 만들면
         안 됩니다"). */
    const 머리 = document.createElement('div');
    머리.className = 'ptop';
    머리.innerHTML = `<div class="pmeta"><div class="pcode">${esc(ax.code)}</div>
      <div class="pname">${esc(유형.n)}</div>
      <span class="prank">${esc(personaRank(나라수))}</span></div>
      <div class="part"><img src="./persona/${esc(ax.code)}.png?v=b463"
        alt="" onerror="this.closest('.part').remove()"></div>`;
    /* 머리를 눌러도 갑니다 — 아래 단추와 **같은 곳**입니다. 단추는
       「눌러도 된다」를 보이게 하는 것이고, 머리는 큰 과녁입니다. */
    머리.onclick = 성향열기;
    성향.appendChild(머리);

    /* ── 네 축 ── **축마다 색이 다릅니다** ──────────────────────────
       ⚠ 넷을 다 같은 파랑으로 두면 **하나의 긴 표**로 읽힙니다. 축은
         서로 다른 것을 재는데 색이 같으면 그 차이가 안 보입니다.
       ⚠ 색은 앱이 이미 쓰는 분류색(--k-*)에서 가져옵니다. 새 색을
         만들면 앱 안에 색 체계가 둘이 됩니다. */
    const 값 = [ax.개척, ax.단골, ax.모험, ax.만족];
    const 색 = ['var(--k-food)', 'var(--k-see)', 'var(--k-move)', 'var(--k-stay)'];
    const 막대 = document.createElement('div');
    막대.className = 'axbars';
    막대.innerHTML = AXIS_NAME.map((n, i) => `
      <div class="axrow"><span class="axn">${esc(n)}</span>
        <span class="axbar"><i style="width:${Math.max(값[i], 2)}%;
          background:${색[i]}"></i></span>
        <span class="axv">${값[i]}</span></div>`).join('');
    성향.appendChild(막대);

    /* ── 궁합 두 칸 ────────────────────────────────────────────────
       ⚠ **이미 성향 카드 그림 안에 있던 것**입니다(card.js 의 drawP16).
         그런데 그림 안에 있으면 **카드를 열어야 보이고 누를 수도 없습니다.**
         여기 꺼내 두면 들어오자마자 보입니다.
       ⚠ 계산은 card.js 의 personaMates 하나만 씁니다 — 여기서 또 세면
         카드와 다른 답이 나옵니다. */
    const m = personaMates(ax.code);
    const 짝 = document.createElement('div');
    짝.className = 'mates';
    짝.innerHTML = [[m.best, m.bestScore, '환상의 메이트', 'good'],
                    [m.worst, m.worstScore, '최악의 조합', 'bad']]
      .map(([c, s, 라벨, 갈래]) => `<div class="mate ${갈래}">
        <span class="ml">${esc(라벨)} · ${s}%</span>
        <b>${esc(PERSONA16[c]?.n || c)}</b>
        <span class="mc">${esc(c)}</span></div>`).join('');
    성향.appendChild(짝);

    /* ── 자세히 보기 ────────────────────────────────────────────────
       ⚠ **카드 전체가 눌리지만 그게 안 보였습니다(b449).** 머리(.ptop)에
         onclick 이 달려 있어 누르면 성향 화면으로 가는데, **눌린다는
         표시가 없어서** 아무도 누를 생각을 안 합니다.
         명시적인 단추를 답니다 — 이 앱에서 성향 화면은 공유할 카드가
         나오는 곳이라 반드시 가 봐야 하는 자리입니다.
       ⚠ 문구에 **무엇이 더 있는지** 적습니다. 「보기」만 있으면 지금 화면과
         뭐가 다른지 몰라서 안 누릅니다. */
    const 더 = document.createElement('button');
    더.className = 'matebtn';
    더.textContent = '자세히 보기 ›';
    더.onclick = 성향열기;
    성향.appendChild(더);
  } else {
    성향.appendChild(줄('내 성향',
      `${문턱 - 매긴것.length}곳만 더 매기면 유형이 나와요`, '매기러 가기',
      () => ctx.showApp('rate')));
  }
  box.appendChild(성향);

  /* ── ② 성향이 변했어요 ── **이 앱만 할 수 있는 카드(b462)** ──────────
     다른 앱은 「몇 개국」밖에 못 셉니다. 우리는 **축이 있어서** 처음과
     지금을 같은 자로 잴 수 있습니다.
     ⚠ 처음 20곳과 최근 20곳을 **같은 함수**(personaAxes)로 두 번 잽니다.
       여기서 따로 세면 위 ① 카드의 축과 갈라집니다.
     ⚠ 40곳부터 답니다. 20+20 이 겹치면 「처음」과 「지금」이 같은 자료가
       되어 늘 「그대로예요」가 나옵니다 — 아무 말도 안 하는 카드입니다.
     ⚠ 코드가 안 바뀌었어도 **축은 대개 움직입니다.** 그때는 코드 대신
       제일 많이 변한 축 하나를 말합니다 — 「그대로예요」로 끝내면
       40곳을 매긴 사람에게 할 말이 없어집니다. */
  {
    const 시간순 = 매긴것
      .filter(r => r.created_at)
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    const N = 20;
    if (시간순.length >= N * 2){
      const 처음 = personaAxes(시간순.slice(0, N), { cities });
      const 지금 = personaAxes(시간순.slice(-N), { cities });
      const 차 = ['개척', '단골', '모험', '만족']
        .map((k, i) => ({ 이름: AXIS_NAME[i], 값: 지금[k] - 처음[k] }))
        .sort((a, b) => Math.abs(b.값) - Math.abs(a.값));

      const 변화 = document.createElement('div');
      변화.className = 'card quiet';
      const 같음 = 처음.code === 지금.code;
      변화.innerHTML =
        '<h2>' + (같음 ? '성향은 그대로예요' : '성향이 변했어요') + '</h2>' +
        `<div class="shift">
           <span class="sc old">${esc(처음.code)}</span>
           <span class="sarrow">→</span>
           <span class="sc new">${esc(지금.code)}</span>
         </div>
         <div class="memo" style="text-align:center; margin-top:6px">
           처음 매긴 ${N}곳과 최근 ${N}곳을 견줬어요</div>` +
        '<div class="axbars">' + 차.map(d => {
          const 부호 = d.값 > 0 ? '+' : '';
          const 색 = d.값 === 0 ? 'var(--line)'
                   : d.값 > 0 ? 'var(--k-see)' : 'var(--k-food)';
          /* 막대는 **변화의 크기**입니다. 0~100 점 자체가 아니라 그 차이라,
             절댓값을 그대로 폭으로 씁니다(최대 100). */
          return `<div class="axrow"><span class="axn">${esc(d.이름)}</span>
            <span class="axbar"><i style="width:${Math.min(Math.abs(d.값), 100)}%;
              background:${색}"></i></span>
            <span class="axv">${부호}${d.값}</span></div>`;
        }).join('') + '</div>';
      box.appendChild(변화);
    }
  }

  /* ── ② 발자국 ── 지도를 바로 보여줍니다 ──────────────────────────
     ⚠ 홈에도 지도가 있습니다(사용자 결정 — 중복을 알고 둡니다).
       been 도 홈에 지도가 있고 Visualize 탭에 더 많은 시각화가 있습니다. */
  const 발 = document.createElement('div');
  발.className = 'card quiet';
  /* ⚠ **우상단 「지도 ›」를 없앴습니다(b458).** 그 줄과 미니맵과 카드
     아래 「나라별로 자세히 보기 ›」가 **전부 같은 곳으로 갔습니다.**
     한 카드에서 같은 데로 가는 길이 셋이면 무엇이 다른가 헷갈립니다.
     성향 카드와 **같은 모양**으로 맞춥니다 — 제목은 h2, 가는 길은
     카드 아래 단추 하나. 미니맵을 눌러도 가는 것은 남깁니다(성향의
     머리와 같은 이유 — 보이는 단추 옆의 큰 과녁). */
  발.innerHTML = `<h2>내 발자국</h2>
    <div class="memo" style="margin:-4px 0 10px">${esc(나라
      ? `${UN_COUNTRIES}개국 중 ${나라}개국 · ${pct.toFixed(1)}%`
      : '별점을 매기면 여기에 쌓여요')}</div>`;

  const mm = document.createElement('div');
  mm.className = 'minimap';
  mm.style.cursor = 'pointer';
  /* 홈과 **같은 viewBox** 입니다(home.js 의 「왜 이 viewBox 인가」 참고) —
     대륙에 딱 맞추고 아무 나라도 안 자릅니다. */
  mm.innerHTML = `<svg viewBox="20 16 976 392"
    preserveAspectRatio="xMidYMid meet">${$('worldland').innerHTML}</svg>`;
  const gone = new Set((cities || [])
    .filter(c => 매긴것.some(r => r.city_id === c.id)).map(c => c.country));
  mm.querySelectorAll('path').forEach(p =>
    p.classList.toggle('been', gone.has(p.dataset.c)));
  mm.onclick = 지도열기;
  발.appendChild(mm);

  /* 대륙별 진행도. 지도만 있으면 "얼마나 남았나" 가 안 보입니다 —
     칠할 곳이 어디인지 알려주는 것이 다음 여행을 만듭니다. */
  const 대륙셈 = {};
  (cities || []).forEach(c => {
    if (!gone.has(c.country)) return;
    const k = continentOf[c.country]; if (!k) return;
    (대륙셈[k] = 대륙셈[k] || new Set()).add(c.country);
  });
  const 대륙 = document.createElement('div');
  대륙.className = 'contbars';
  대륙.innerHTML = CONT.map(([이름, 전체]) => {
    const n = 대륙셈[이름]?.size || 0;
    return `<div class="axrow"><span class="axn">${esc(이름)}</span>
      <span class="axbar"><i style="width:${(n / 전체 * 100).toFixed(1)}%"></i></span>
      <span class="axv">${n}/${전체}</span></div>`;
  }).join('');
  발.appendChild(대륙);

  /* 지도 카드에도 같은 이유로 단추를 답니다(b449) — 지도를 눌러야 큰
     지도로 가는데 그게 안 보입니다. 큰 지도에는 대륙별·국가별 다녀온
     도시가 다 있습니다. */
  const 지도더 = document.createElement('button');
  지도더.className = 'matebtn';
  지도더.textContent = '나라별로 자세히 보기 ›';
  지도더.onclick = 지도열기;
  발.appendChild(지도더);
  box.appendChild(발);

  /* ── ④ 별점 분포 ── 평균 하나로는 아무 말도 안 됩니다(b462) ──────────
     「내 별점 평균 4.2」는 후한 사람인지 까다로운 사람인지를 못 가립니다.
     ★5 를 몰아준 사람과 ★4 만 고르게 준 사람의 평균이 같을 수 있습니다.
     ⚠ **칸은 내림입니다.** 별점이 0.5 단위라(rateui.js 의 starValue),
       4.5 는 ★4 칸에 들어갑니다. 반올림으로 하면 4.5 가 ★5 로 올라가
       아래 「기록」 카드의 「별 다섯을 준 곳」(정확히 5.0)과 어긋납니다.
       한 화면에 두 숫자가 다르면 둘 다 못 믿게 됩니다.
     ⚠ 0 곳인 칸도 그립니다 — 빼면 분포의 **모양**이 왜곡됩니다. */
  if (매긴것.length){
    const 통 = [0, 0, 0, 0, 0];
    매긴것.forEach(r => {
      const n = Math.floor(r.stars);
      if (n >= 1 && n <= 5) 통[n - 1]++;
    });
    const 최대 = Math.max(...통, 1);
    const 분포 = document.createElement('div');
    분포.className = 'card quiet';
    분포.innerHTML = '<h2>별점 분포</h2><div class="axbars">' +
      [5, 4, 3, 2, 1].map(n => {
        const c = 통[n - 1];
        return `<div class="axrow"><span class="axn">★ ${n}</span>
          <span class="axbar"><i style="width:${(c / 최대 * 100).toFixed(1)}%;
            background:var(--k-stay)"></i></span>
          <span class="axv">${c}곳</span></div>`;
      }).join('') + '</div>';
    box.appendChild(분포);
  }

  /* ── ③ 기록 ── 지도 화면에서 옮겨왔습니다(b457) ───────────────────
     ⚠ 지도 맨 아래에 있어서 대륙별·국가별을 다 지나야 나왔습니다.
       「가장 먼 두 도시」·「별 다섯을 준 곳」은 지도의 부록이 아니라
       **분석**입니다 — 이 탭의 성격에 맞습니다.
     ⚠ 계산은 map.js 의 funRows 하나입니다. 여기서 다시 세면 지도와
       분석이 다른 답을 내놓습니다.
     ⚠ 매긴 것이 없으면 카드를 아예 안 답니다 — 「–」 여섯 줄은
       빈 화면보다 나쁩니다(emptyDo 규칙과 같은 태도). */
  const 별점표 = {};
  매긴것.forEach(r => { 별점표[r.city_id] = r.stars; });
  const 내도시 = (cities || []).filter(c => 별점표[c.id] != null);
  if (내도시.length){
    const 기록 = document.createElement('div');
    기록.className = 'card quiet';
    기록.innerHTML = '<h2>기록</h2>' + funRows(내도시, 별점표).map(([k, v]) =>
      `<div class="row"><span class="label">${esc(k)}</span>
         <span class="val">${esc(v)}</span></div>`)
      .join('');
    box.appendChild(기록);
  }

  /* ── ④ 다음에 가볼 만한 곳 ── 성향 리포트에서 꺼내옵니다(b461) ────
     ⚠ 리포트 안에만 있으면 **성향 → 자세히 보기 → 스크롤** 세 번을
       거쳐야 보입니다. 분석 탭은 「나는 어떤 사람인가」를 말하는 자리인데,
       그 답이 **다음 행동**으로 이어지지 않으면 읽고 끝납니다.
     ⚠ 두 줄을 **한 덩어리로 합치지 마십시오.** 「어울리는 곳」은
       감추고-맞히기로 재서 정한 것이고 「반대로 가보면」은 정확도를
       주장하지 않습니다. 합치면 뒤의 넷까지 맞다고 말하는 셈입니다
       (rec.js 머리말).
     ⚠ 씨앗이 없으면(아무것도 안 매겼으면) 카드를 아예 안 답니다.
     ⚠⚠ **similarPicks 는 이름이 아니라 { city, seed, score } 를 줍니다.**
       b461 에 `.join()` 을 바로 걸어서 화면에 `[object Object]` 가
       넉 줄 찍혔습니다(b463 에서 잡음). persona.js 는 `.map(x => x.city.name)`
       을 하고 있었는데 옮겨오면서 그 한 줄을 빠뜨렸습니다.
     ⚠ 이름을 **누를 수 있게** 합니다(b463). 추천을 읽고 끝내면 분석 탭이
       읽을거리로 남습니다 — 누르면 그 도시가 골라진 채로 여행 만들기가
       열려서, 「분석 → 다음 행동」이 한 번에 이어집니다. */
  const 골라 = similarPicks(cities, 전부, { n: 4 });
  if (골라.match.length || 골라.opposite.length){
    const 갈곳 = document.createElement('div');
    갈곳.className = 'card quiet';
    갈곳.innerHTML = '<h2>다음에 가볼 만한 곳</h2>';

    const 줄내기 = (제목, 목록) => {
      if (!목록.length) return;
      const 줄 = document.createElement('div');
      줄.className = 'picks';
      줄.innerHTML = `<span class="label">${esc(제목)}</span>`;
      const 칩들 = document.createElement('div');
      칩들.className = 'cchips';
      목록.forEach(x => {
        const b = document.createElement('button');
        b.textContent = x.city.name;
        b.onclick = () => 여행짜기(x.city);
        칩들.appendChild(b);
      });
      줄.appendChild(칩들);
      갈곳.appendChild(줄);
    };
    줄내기('어울리는 곳', 골라.match);
    줄내기('반대로 가보면', 골라.opposite);
    box.appendChild(갈곳);
  }

  /* ── ⑦ 가보고 싶어요 ── 분석 탭에 **미래**가 없었습니다(b462) ─────────
     성향·발자국·기록·별점은 전부 「해온 것」입니다. `want` 는 자료가
     이미 있는데 이 앱 어디에서도 모아서 보여주지 않았습니다.
     ⚠ **갔다 온 것과 나눕니다.** want 를 켠 뒤 별점을 매겼으면 그건
       「이룬 것」입니다 — 아직 안 간 곳과 같이 세면 목록이 안 줄어들어
       영영 못 지우는 숙제처럼 보입니다.
     ⚠ 이름은 여덟 곳까지. 스물이 넘어가면 카드가 목록이 되고, 목록이
       필요하면 평가 탭에 이미 있습니다. */
  {
    const 위시 = 전부.filter(r => r.want);
    const 아직 = 위시.filter(r => r.stars == null);
    if (위시.length){
      const 이름 = 아직
        .map(r => (cities || []).find(c => c.id === r.city_id))
        .filter(Boolean).map(c => c.name);
      const 이룸 = 위시.length - 아직.length;

      const 위 = document.createElement('div');
      위.className = 'card quiet';
      위.innerHTML = '<h2>가보고 싶어요</h2>' +
        `<div class="bignum">
           <div class="bnrow"><b>${아직.length}</b><span>곳</span></div>
           <div class="bnsub">더 가면 다 채워요${
             이룸 ? ` · 이미 ${이룸}곳은 다녀왔어요` : ''}</div>
         </div>` +
        (이름.length
          ? `<div class="memo" style="margin-top:8px">${
              esc(이름.slice(0, 8).join(' · '))}${
              이름.length > 8 ? ` 외 ${이름.length - 8}곳` : ''}</div>`
          : '<div class="memo" style="margin-top:8px">적어둔 곳을 다 다녀왔어요.</div>');
      box.appendChild(위);
    }
  }

  /* ── ⑤ 친구와 궁합 ── 유입이 유입을 만드는 유일한 고리(b408) ──────
     카드 한 장은 한 번 퍼지고 끝인데, 궁합은 링크를 받은 사람이 자기
     카드를 만들어야 결과가 나오고 그 결과가 또 공유거리가 됩니다.
     ⚠ 성향이 정해진 사람에게만 답니다 — 코드가 없으면 보낼 것이 없습니다.
     ⚠ 보내는 절차는 mate.js 의 shareMate 하나입니다(성향 화면과 공용). */
  if (내코드){
    const 궁합 = document.createElement('div');
    궁합.className = 'card quiet';
    궁합.innerHTML = '<h2>친구와 궁합</h2>' +
      '<div class="memo" style="margin:-4px 0 10px">링크를 보내면 친구도 자기 유형이 나오고, ' +
      '둘이 얼마나 맞는지 같이 보여줍니다.</div>';
    const 보내기 = document.createElement('button');
    보내기.className = 'matebtn';
    보내기.textContent = '궁합 링크 보내기';
    보내기.onclick = () => shareMate(내코드, 내이름);
    궁합.appendChild(보내기);
    box.appendChild(궁합);
  }
}

/* 지도를 여는 길. `openMap` 을 직접 import 하면 map.js ↔ anal.js 고리가
   생기지는 않지만(map 은 anal 을 모릅니다), 단추를 누르는 쪽이 이미 있어
   그것을 씁니다 — 여는 절차가 두 벌이 되지 않게. */
function openMapSafe(){ $('openmap')?.click(); }
