/* ── 맛보기 평가 — 로그인 없이 매기고 카드까지 보기 ─────────────────
 * **깔때기 맨 위를 여는 조각입니다(b406).**
 *
 * 그전에는 성향 카드를 보고 온 사람이 이 길을 걸었습니다:
 *
 *     카드 봄 → 구글 로그인 → 도시 5곳 매기기 → 그제야 내 카드
 *                  ↑ 벽1          ↑ 벽2           ↑ 보상
 *
 * **보상 앞에 벽이 둘**이었습니다. 재보니 로그인 전에는 도시가 0줄이고
 * 홈·평가·하단탭이 전부 안 보였습니다 — 첫 화면이 통째로 로그인 벽입니다.
 * 순서를 뒤집습니다: **매기고 → 카드를 보고 → 그때 로그인.**
 *
 * ⚠ **앱 전체를 익명에 열지 않습니다.** `#signedin` 을 열면 여행·지출·일행이
 *   전부 로그인을 전제로 짜여 있어 곳곳에서 터집니다. 로그인 화면
 *   (`#signedout`) 안에 **이 조각 하나만** 붙입니다. 여기서 쓰는 것은
 *   도시 목록과 별 그리기, 성향 계산뿐입니다.
 *
 * ⚠ **익명으로 읽을 수 있는지 먼저 재고 지었습니다.** 세션 없는 클라이언트로
 *   확인했습니다: `cities` 읽힘 ✓ · `city_stats` 읽힘 ✓ · 남의 `city_ratings`
 *   0줄(RLS 정상). 그래서 도시를 보여주는 데는 로그인이 필요 없습니다.
 *
 * ⚠ **매긴 것은 반드시 따라와야 합니다.** 로그인했더니 방금 매긴 다섯 곳이
 *   날아가 있으면, 안 하느니만 못합니다(화를 냅니다). 브라우저에 담아뒀다가
 *   로그인하는 순간 계정으로 옮기고 담아둔 것을 지웁니다 — `claimTryRates`.
 *
 * 층: dom.js · db.js · cities.js · citysearch.js · stars.js · rateui.js ·
 *     card.js · mate.js. */
import { $, esc } from './dom.js?v=b469';
import { sb } from './db.js?v=b469';
import { cities } from './cities.js?v=b469';
import { loadCities } from './citysearch.js?v=b469';
import { paintStars } from './stars.js?v=b469';
/* 평가 히어로는 세 화면이 같은 것을 씁니다 — rateui.js 머리말 참고(b409). */
import { rateHero, starValue } from './rateui.js?v=b469';
import { personaAxes, personaRank, PERSONA16, AXIS_WORD, cardImage } from './card.js?v=b469';
/* 친구가 보낸 궁합 링크. 링크를 받은 사람이 실제로 도착하는 자리가 여기입니다. */
import { mateCode, mateHtml } from './mate.js?v=b469';

/* 담아두는 자리. **`localStorage` 입니다** — 탭을 닫았다 와도 남아야 합니다.
   로그인하러 구글로 나갔다 돌아오는 사이에 `sessionStorage` 는 살아남지만,
   "이따 해야지" 하고 닫은 사람까지 살리려면 이쪽이어야 합니다. */
const KEY = 't2:try';
/* 카드가 나오는 문턱. **성향 화면과 같은 5곳입니다**(persona.js) — 여기만
   낮추면 맛보기에서는 카드가 나왔는데 로그인 뒤에는 "아직 못 만들어요" 가
   뜹니다. 그건 속은 기분입니다. */
const 문턱 = 5;

const 읽기 = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
                     catch { return {}; } };
const 쓰기 = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch {} };

/* 맛보기로 매긴 것이 있나. app.js 가 로그인 화면을 그릴지 정할 때 봅니다. */
export const tryCount = () => Object.values(읽기()).filter(v => v?.stars != null).length;

/* ── 로그인하면 계정으로 옮깁니다 ────────────────────────────────────
 * app.js 의 `render(session)` 이 사람을 알아낸 직후에 부릅니다.
 *
 * ⚠ **덮어쓰지 않습니다.** 이미 계정에 있는 도시는 건드리지 않습니다 —
 *   맛보기는 대개 처음 온 사람이지만, 로그아웃했다 돌아온 사람일 수도
 *   있습니다. 그 사람이 예전에 매긴 별점을 맛보기가 덮으면 안 됩니다.
 * ⚠ **옮기고 나서 지웁니다.** 안 지우면 다음 로그인 때 또 옮기려 듭니다.
 *   옮기다 실패하면 **안 지웁니다** — 다음 기회에 다시 시도합니다. */
export async function claimTryRates(userId){
  const 담긴것 = 읽기();
  /* ⚠ **「안 가봤어요」(skip)도 같이 옮깁니다(b407).** 안 옮기면 로그인하는
     순간 방금 넘긴 도시들이 도로 나옵니다 — 사용자 눈에는 "아까 안 가봤다고
     했는데" 입니다. 별점 없는 줄로 남기면 로그인 뒤 홈에서도 안 묻습니다
     (fillQuiz 가 줄이 있는 도시를 뺍니다). 로그인 전후가 같아야 합니다. */
  const 줄 = Object.entries(담긴것)
    .filter(([, v]) => v?.stars != null || v?.want || v?.skip)
    .map(([city_id, v]) => ({ user_id: userId, city_id,
                              ...(v.stars != null ? { stars: v.stars } : {}),
                              ...(v.want ? { want: true } : {}) }));
  if (!줄.length) return 0;

  const 이미 = await sb.from('city_ratings').select('city_id')
    .eq('user_id', userId).in('city_id', 줄.map(r => r.city_id));
  if (이미.error) return 0;                      /* 못 물어봤으면 그냥 둡니다 */
  const 있는것 = new Set((이미.data || []).map(r => r.city_id));
  const 넣을것 = 줄.filter(r => !있는것.has(r.city_id));

  if (넣을것.length){
    const r = await sb.from('city_ratings')
      .upsert(넣을것, { onConflict: 'user_id,city_id' }).select('city_id');
    if (r.error) return 0;                       /* 지우지 않습니다 — 다음에 다시 */
  }
  localStorage.removeItem(KEY);
  return 넣을것.length;
}

/* ── 물어볼 도시 고르기 ──────────────────────────────────────────────
 * ⚠ **처음 온 사람에게는 아는 곳을 물어야 합니다.** 사르데냐를 먼저 보여주면
 *   다섯 번을 넘기다 나갑니다. `fame` 이 1(누구나 아는 곳)인 것부터 씁니다.
 * ⚠ 사진이 없는 곳은 안 씁니다 — 이 화면은 사진이 주인공입니다. */
let 주머니 = [];
function 채우기(){
  const 답한것 = new Set(Object.keys(읽기()));
  주머니 = (cities || [])
    .filter(c => c.image_url && !답한것.has(c.id) && (c.fame ?? 3) <= 2)
    .sort((a, b) => (a.fame ?? 3) - (b.fame ?? 3));
  /* 같은 순서로만 물으면 두 번째 방문에서 똑같은 다섯 곳이 나옵니다.
     유명도 안에서만 섞습니다 — 순서의 뜻은 지키고 지루함만 없앱니다. */
  for (let i = 주머니.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    if ((주머니[i].fame ?? 3) === (주머니[j].fame ?? 3))
      [주머니[i], 주머니[j]] = [주머니[j], 주머니[i]];
  }
}

/* ── 화면 ────────────────────────────────────────────────────────────
 * 히어로와 **같은 생김새**를 씁니다(`.hero.rateh`) — 로그인 뒤에 만날 화면과
 * 같아야 "아까 그것"으로 이어집니다. 새 모양을 만들면 두 벌이 됩니다. */
/* ── 친구가 보낸 궁합 링크로 왔다면(b408) ────────────────────────────
 * **이 사람이 지금 제일 궁금한 것은 자기 유형이 아니라 궁합입니다.**
 * 그래서 매기는 동안에도 왜 매기는지를 위에 걸어둡니다 — 「다섯 곳만
 * 채우면 친구와 궁합이 나와요」. 목표가 보이면 다섯 번을 누릅니다. */
function 친구줄(){
  const 상대 = mateCode();
  if (!상대) return '';
  const 유형 = PERSONA16[상대];
  if (!유형) return '';
  return `<div class="card" style="margin-bottom:var(--s-sm)">
    <div class="empty" style="text-align:left; padding:6px 0 2px">
      친구는 <b>${esc(상대)} ${esc(유형.n)}</b>
      <div class="memo" style="margin-top:4px">
        다섯 곳만 매기면 <b>둘의 궁합</b>이 나와요
      </div>
    </div></div>`;
}

/* ⚠ **그리는 것은 rateui.js 한 곳에서 합니다(b409).** 로그인 뒤에 만날
   화면(home.js)과 **같은 함수**를 씁니다 — 같아야 "아까 그것" 으로 이어지고,
   따로 적으면 한쪽만 고쳐집니다. */
const 판 = (c, 남) =>
  친구줄() + rateHero(c, { id:'tryhero', ask:`${남}곳만 더 매기면 내 여행 성향이 나와요` });

let 지금도시 = null;

export async function drawTry(){
  const box = $('trybox');
  if (!box) return;
  box.classList.remove('hide');

  const n = tryCount();
  if (n >= 문턱) return 카드보이기();

  await loadCities();
  채우기();
  지금도시 = 주머니[0] || null;
  if (!지금도시){ box.classList.add('hide'); return; }   /* 도시를 못 받았으면 조용히 */
  box.innerHTML = 판(지금도시, 문턱 - n);
}

/* ── 다 매기면 카드 ──────────────────────────────────────────────────
 * **여기가 이 조각의 전부입니다.** 로그인 전에 자기 카드를 보는 것.
 * 카드는 `card.js` 가 그립니다 — 로그인 뒤에 보는 것과 **같은 그림**입니다. */
async function 카드보이기(){
  const box = $('trybox');
  await loadCities();
  const 줄 = Object.entries(읽기())
    .filter(([, v]) => v?.stars != null)
    .map(([city_id, v]) => ({ city_id, stars: v.stars }));
  const ax = personaAxes(줄, { cities });
  const 유형 = PERSONA16[ax.code] || { n:'여행자', d:'' };
  const 나라 = new Set(줄.map(r => (cities || []).find(c => c.id === r.city_id)?.country)
                        .filter(Boolean)).size;
  const rank = personaRank(나라);

  /* ⚠ **궁합이 카드보다 위입니다(b408).** 링크를 받고 온 사람은 그것 때문에
     다섯 곳을 매긴 것입니다. 자기 카드를 먼저 보여주고 궁합을 밑에 숨기면
     약속을 늦게 지키는 셈입니다. */
  const 궁합 = mateHtml(ax.code, mateCode());

  box.innerHTML = `${궁합}<div class="pcardwrap" id="trycard"></div>
    <div class="card" style="margin-top:var(--s-sm)">
      <!-- ⚠ **조사를 뒤에 붙이지 않습니다.** 「명소 검열관 가 나왔어요」가
           나왔었습니다 — 유형 이름 열여섯 개의 받침이 제각각이라 하나로 못
           적습니다. dom.js 의 josa() 를 쓸 수도 있지만, **조사가 필요 없게
           쓰는 것이 더 낫습니다.** -->
      <div class="empty" style="text-align:left; padding:6px 0 2px">
        내 여행 성향은 <b>${esc(ax.code)} ${esc(유형.n)}</b>
        <div class="memo" style="margin-top:4px">
          아래에서 로그인하면 <b>방금 매긴 ${줄.length}곳이 그대로 따라옵니다.</b>
          더 매길수록 정확해지고, 어울리는 도시도 골라드려요.
        </div>
      </div>
    </div>`;

  /* 그림은 못 그려도 위 글은 남습니다 — 캔버스가 막힌 기기에서도 뜻이 통합니다. */
  try {
    const { blob } = await cardImage({
      kind:'p16', code: ax.code, rank,
      axisWords: [...ax.code].map(ch => AXIS_WORD[ch]).join(' · '),
      name: 유형.n, desc: 유형.d,
      countries: 나라, cities: 줄.length,
      bars: [['개척력', ax.개척], ['단골력', ax.단골],
             ['모험력', ax.모험], ['만족력', ax.만족]],
      /* 궁합과 MRZ 는 안 넣습니다 — 맛보기는 **내 유형 하나**만 보여줍니다.
         card.js 가 없으면 그 칸을 통째로 비웁니다. */
      title: `${ax.code} ${유형.n}`,
    }, 'portrait');
    const el = $('trycard');
    if (el) el.innerHTML = `<img src="${URL.createObjectURL(blob)}" alt="${esc(ax.code)}">`;
  } catch {}
}

/* ── 누르기 ──────────────────────────────────────────────────────────
 * `#trybox` 하나에만 답니다. 안쪽은 매번 갈아끼우므로 줄마다 달면 새로
 * 붙여야 합니다(홈과 같은 수법). */
$('trybox')?.addEventListener('click', async e => {
  const st = e.target.closest('.st');
  if (st){
    const wrap = st.closest('.stars');
    const v = starValue(st, e.clientX);
    paintStars(wrap, v, true);
    const o = 읽기(); o[wrap.dataset.city] = { stars: v }; 쓰기(o);
    /* 별이 찬 것을 보여주고 넘깁니다. 홈과 같은 1.5초입니다. */
    setTimeout(drawTry, 900);
    return;
  }
  const b = e.target.closest('[data-rate]');
  if (!b || !지금도시) return;
  const o = 읽기();
  /* **「안 가봤어요」도 기록합니다.** 안 그러면 다음에 또 같은 도시를 묻습니다.
     별점이 없으므로 성향에는 안 들어갑니다(위 `카드보이기` 의 filter). */
  o[지금도시.id] = b.dataset.rate === 'want' ? { want: true } : { skip: true };
  쓰기(o);
  drawTry();
});
