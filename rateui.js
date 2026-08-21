/* ── 평가 히어로 한 벌 ────────────────────────────────────────────────
 * 사진 위에 도시 이름과 별 다섯, 그 밑에 「안 가봤어요」·「♡」.
 * **세 화면이 같은 것을 씁니다** — 홈(home.js) · 로그인 전 맛보기(try.js) ·
 * 연속 평가(spree.js).
 *
 * ⚠ **여기 모은 이유.** b406~b407 을 지나며 같은 조각이 두 벌이 됐고,
 *   b408 에서 세 번째를 만들려다 멈췄습니다. 이미 한 번 겪었습니다 —
 *   별 크기를 통에만 주고 `.st` 를 빠뜨려 **주인공 별이 목록 별보다 작았던**
 *   일이 그것입니다(app.css 의 herostars 주석). 같은 것이 여러 벌이면
 *   고칠 때 한 벌만 고쳐집니다.
 *
 * ⚠ **누르기는 여기서 안 답니다.** 화면마다 매긴 뒤에 할 일이 다릅니다 —
 *   홈은 다음 도시로 갈아끼우고, 맛보기는 다섯 곳을 채우면 카드를 내고,
 *   연속 평가는 세면서 계속 넘깁니다. 그리는 것만 여기서 하고 처리는
 *   부르는 쪽이 합니다. 대신 **찾는 이름은 여기서 정합니다**:
 *     별 통  → `.stars[data-city]`
 *     단추   → `[data-rate="skip"|"want"]`, 감싼 줄에 `[data-city]`
 *   이 이름을 바꾸면 세 화면이 같이 멈춥니다.
 *
 * 층: dom.js · cities.js · stars.js 만 씁니다(전부 잎). */
import { esc } from './dom.js?v=b416';
import { countryName } from './cities.js?v=b416';
import { starHtml } from './stars.js?v=b416';

/**
 * @param city  도시 한 줄(image_url · name · country · id). **사진이 있어야 합니다** —
 *              히어로는 사진이 주인공이라 없으면 빈 색 덩어리만 남습니다.
 * @param ask   별 위에 붙는 한 줄. 화면마다 다릅니다("다녀오셨다면 별점을
 *              남겨주세요" / "3곳만 더 매기면…"). **빈 값이면 줄을 안 넣습니다.**
 * @param id    히어로 상자의 id. 화면마다 달라야 합니다 — 한 문서에 둘이
 *              동시에 뜰 수 있습니다(로그인 화면과 앱은 아니지만, 나중에).
 * @param bar   단추 줄을 달까. 안 다는 자리가 생기면 false 로.
 */
export function rateHero(city, { ask = '', id = 'ratehero', bar = true } = {}){
  const c = city;
  return `<div class="hero rateh" id="${esc(id)}">
    <img src="${esc(c.image_url)}" alt="" onerror="this.remove()">
    <div class="ht">${esc(c.name)}, 가보셨어요?</div>
    <div class="hm">${esc(countryName[c.country] || c.country)}</div>
    ${ask ? `<div class="hask">${esc(ask)}</div>` : ''}
    <div class="hrow">
      <span class="stars herostars" data-city="${esc(c.id)}">${starHtml(null)}</span>
    </div>
  </div>
  ${bar ? `<div class="trybar" data-city="${esc(c.id)}">
    <button class="ghost" data-rate="skip">안 가봤어요</button>
    <button class="ghost" data-rate="want">♡ 가보고 싶어요</button>
  </div>` : ''}`;
}

/* 눌린 자리에서 별점을 읽습니다. **반 칸(0.5점)은 왼쪽 절반**입니다 —
   세 화면이 같은 규칙을 써야 하므로 여기 한 곳에 둡니다. */
export function starValue(st, clientX){
  const b = st.getBoundingClientRect();
  return +st.dataset.n - ((clientX - b.left) < b.width / 2 ? 0.5 : 0);
}
