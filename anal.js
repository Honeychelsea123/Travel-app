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
import { $, esc } from './dom.js?v=b456';
import { sb } from './db.js?v=b456';
import { cities, continentOf } from './cities.js?v=b456';
/* personaBackTo 는 persona.js 것입니다 — 「분석에서 왔다」를 적어두면
   닫을 때 분석 탭으로 돌아옵니다(b453). */
import { personaBackTo } from './persona.js?v=b456';
import { personaAxes, personaRank, personaMates, PERSONA16,
         AXIS_NAME } from './card.js?v=b456';
import { UN_COUNTRIES, CONT, mapBackTo } from './map.js?v=b456';

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
  ctx.showApp('set');
  $('openpersona')?.click();
}
function 지도열기(){
  mapBackTo('anal');
  ctx.showApp('set');
  $('openmap')?.click();
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
  const [{ data: f }, 별점] = await Promise.all([
    sb.rpc('my_footprint'),
    sb.from('city_ratings').select('city_id,stars')
      .eq('user_id', ctx.me().id).not('stars', 'is', null),
  ]);

  const 매긴것 = 별점?.data || [];
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
  if (매긴것.length >= 문턱){
    const ax = personaAxes(매긴것, { cities });
    const 유형 = PERSONA16[ax.code] || { n:'여행자', d:'' };
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
      <div class="part"><img src="./persona/${esc(ax.code)}.png?v=b456"
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

  /* ── ② 발자국 ── 지도를 바로 보여줍니다 ──────────────────────────
     ⚠ 홈에도 지도가 있습니다(사용자 결정 — 중복을 알고 둡니다).
       been 도 홈에 지도가 있고 Visualize 탭에 더 많은 시각화가 있습니다. */
  const 발 = document.createElement('div');
  발.className = 'card quiet';
  발.appendChild(줄('내 발자국',
    나라 ? `${UN_COUNTRIES}개국 중 ${나라}개국 · ${pct.toFixed(1)}%`
         : '별점을 매기면 여기에 쌓여요',
    '지도', 지도열기));

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
}

/* 지도를 여는 길. `openMap` 을 직접 import 하면 map.js ↔ anal.js 고리가
   생기지는 않지만(map 은 anal 을 모릅니다), 단추를 누르는 쪽이 이미 있어
   그것을 씁니다 — 여는 절차가 두 벌이 되지 않게. */
function openMapSafe(){ $('openmap')?.click(); }
