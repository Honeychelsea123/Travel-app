/* ── rec.js — 취향으로 다음 도시를 고릅니다 ────────────────────────────
 *
 * **왜 AI 가 아니라 계산인가.**
 * 추천을 Gemini 에게 부탁하면 넷이 따라옵니다:
 *   · 같은 질문에 다른 답이 나옵니다
 *   · 요청마다 비용이 듭니다 (무료 등급 1,500회/일을 여럿이 나눠 씁니다)
 *   · **비행기모드에서 안 됩니다** — 이 앱의 다른 강점과 정면으로 부딪힙니다
 *   · 규칙을 안 지킵니다 — "담아둔 곳은 빼라"를 세 번 적었는데 세 번 다 어겼습니다
 * 여기 있는 것은 전부 로컬 계산입니다. `cities` 는 이미 localStorage 에
 * 캐시되고 별점도 메모리에 있으므로 **연결이 없어도 돕니다.**
 *
 * LLM 은 **자료를 만들 때 한 번** 썼습니다(도시 태그, db/068). 런타임에는 안 씁니다.
 *
 * ── 점수를 어떻게 내는가 ──
 * 1) **기저율로 나눕니다.** 처음엔 "좋아한 도시의 태그를 더하기"로 했더니
 *    `도시`(469곳 중 48%에 붙음)가 1등이 됐습니다. 취향이 아니라 흔해서입니다.
 *    그래서 **좋아한 것에서의 비율 − 전체에서의 비율**(lift)로 봅니다.
 * 2) **표본이 적으면 약하게 봅니다.** 싫어한 도시가 5곳뿐일 때 한 곳이 20%를
 *    움직여서, 실제로 `미식`이 "내 30% vs 전체 25%"인데도 음수로 나왔습니다.
 *    15곳쯤 돼야 온전히 반영합니다.
 * 3) 도시 점수는 태그 점수의 합을 **√(태그 수)로 나눕니다.** 안 나누면 태그가
 *    많은 도시가 늘 이기고, 개수로 나누면 태그 하나짜리가 늘 이깁니다.
 * 4) `fame` 은 아주 약하게만 얹습니다(0.012). 세게 주면 취향과 무관하게
 *    유명한 곳만 나옵니다 — 그건 추천이 아니라 목록입니다.
 */

/* 태그 열 개는 db/068 이 정한 것과 같아야 합니다. 여기서 새로 적지 않고
   실제 자료에서 뽑아 씁니다 — 두 곳에 적으면 한쪽만 고치게 됩니다. */

/* 좋아함/싫어함의 경계. 4점 이상이거나 '가보고 싶어요'면 좋아한 것,
   2.5점 이하면 싫어한 것. 3점 언저리는 **아무 말도 안 한 것**으로 봅니다 —
   억지로 한쪽에 넣으면 취향이 흐려집니다. */
const LIKE = 4, DISLIKE = 2.5;
/* 이 수만큼 모여야 그 신호를 온전히 믿습니다. */
const FULL = 15;

/* 취향 벡터를 만듭니다. cities 는 tags 를 가진 목록, rates 는 city_ratings 줄.
   돌려주는 것: { 태그: 점수 }. 양수면 내 취향, 음수면 아닙니다. */
export function tasteOf(cities, rates){
  const byId = Object.fromEntries(cities.map(c => [c.id, c]));
  const tags = [...new Set(cities.flatMap(c => c.tags || []))];
  if (!tags.length) return {};

  const base = {};
  for (const t of tags)
    base[t] = cities.filter(c => (c.tags || []).includes(t)).length / cities.length;

  const has = c => c?.tags?.length;
  const liked    = rates.filter(r => (r.stars ?? 0) >= LIKE || r.want)
                        .map(r => byId[r.city_id]).filter(has);
  const disliked = rates.filter(r => r.stars != null && r.stars <= DISLIKE)
                        .map(r => byId[r.city_id]).filter(has);

  const share = (set, t) => set.length ? set.filter(c => c.tags.includes(t)).length / set.length : 0;
  const wL = Math.min(1, liked.length / FULL);
  const wD = Math.min(1, disliked.length / FULL);

  const taste = {};
  for (const t of tags)
    /* 싫어함은 0.6 만 봅니다. "안 좋았다"는 "좋았다"보다 이유가 다양해서
       (날씨·동행·컨디션) 태그 탓으로 돌리기 어렵습니다. */
    taste[t] = ((share(liked, t) - base[t]) * wL) - ((share(disliked, t) - base[t]) * wD * 0.6);
  return taste;
}

/* 한 도시의 점수. 위 3)·4) 참고. */
export function scoreCity(city, taste){
  const t = city.tags || [];
  if (!t.length) return null;
  const sum = t.reduce((a, x) => a + (taste[x] || 0), 0);
  return sum / Math.sqrt(t.length) + (3 - (city.fame ?? 2)) * 0.012;
}

/* 왜 이게 나왔는지. **점수만 내놓으면 사용자는 이유를 모릅니다** —
   추천은 이유가 없으면 무작위와 구별되지 않습니다. */
const whyOf = (city, taste) =>
  (city.tags || []).filter(t => (taste[t] || 0) > 0)
    .sort((a, b) => taste[b] - taste[a]).slice(0, 2);

/**
 * 다음에 갈 만한 도시를 고릅니다. 전부 로컬 계산이라 오프라인에서도 됩니다.
 *
 * @param cities  tags 를 가진 도시 목록
 * @param rates   내 city_ratings 줄 (city_id · stars · want)
 * @param opts    { visited:Set, skip:Set, n:5, other:3 }
 * @returns { taste, top, main, other }
 */
export function recommend(cities, rates, opts = {}){
  const { visited = new Set(), skip = new Set(), n = 5, other = 3 } = opts;
  const taste = tasteOf(cities, rates);
  const order = Object.entries(taste).sort((a, b) => b[1] - a[1]);
  const topTag = order[0]?.[0] || null;

  const rated = new Set(rates.map(r => r.city_id));
  const pool = cities
    /* 이미 매겼거나 다녀온 곳은 뺍니다. **사진이 없는 곳도 뺍니다** —
       추천 카드는 사진이 주인공이라 빈 칸이 섞이면 목록이 망가집니다. */
    .filter(c => c.tags?.length && c.image_url
                 && !rated.has(c.id) && !visited.has(c.id) && !skip.has(c.id))
    .map(c => ({ city:c, score:scoreCity(c, taste), why:whyOf(c, taste) }))
    .sort((a, b) => b.score - a.score);

  /* **같은 나라를 두 번 넣지 않습니다.** 취향이 뚜렷하면 한 나라가 목록을
     통째로 먹습니다(실제로 일본만 넷이 나온 적이 있습니다). */
  const usedCountry = new Set();
  const take = (list, count) => {
    const out = [];
    for (const x of list){
      if (out.length >= count) break;
      if (usedCountry.has(x.city.country)) continue;
      out.push(x); usedCountry.add(x.city.country);
    }
    return out;
  };

  const main = take(pool, n);
  /* **취향대로만 주면 목록이 한 색입니다.** 실제로 여덟 곳 중 일곱이
     `미술` 이었습니다. 억지로 흩지 않고(취향이 진짜 그러니까), 제일 센 태그가
     **없는** 곳에서 몇 개를 따로 뽑아 다른 결을 보여줍니다. */
  const others = topTag ? take(pool.filter(x => !x.city.tags.includes(topTag)), other) : [];

  return { taste, top: order, topTag, main, other: others };
}
