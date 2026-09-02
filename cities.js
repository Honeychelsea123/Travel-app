/* ── 도시 사전과 찾기 ────────────────────────────────────────────────
 * 도시 313곳과 나라 표. **한 번 받으면 앱을 닫을 때까지 안 바뀝니다** —
 * 자료라기보다 사전에 가깝습니다. 그래서 여행이 바뀌어도 사람이 바뀌어도
 * 안 비웁니다(trip.js · rate.js 와 다른 점입니다).
 *
 * 찾기도 여기 둡니다. **찾는 규칙은 사전이 아는 것이기 때문입니다** —
 * 초성으로 찾기, 이름이 그 글자로 시작하는 것을 위로, 40개까지.
 * 전에는 app.js 안에 있어서 로그인하고 도시를 다 받은 뒤라야 한 번
 * 돌려볼 수 있었습니다. 즉 아무도 안 돌려봤습니다.
 *
 * **색인 만드는 식이 두 곳에 베껴져 있었습니다** — 받아올 때(useCities)와
 * 도시를 새로 만들 때. 지금은 같지만 규칙을 바꿀 때 한쪽만 고치면
 * 그 도시만 검색에서 사라집니다. my_footprint / my_counts 가 그랬습니다.
 * 이제 indexCity 한 곳에서만 만듭니다.
 *
 * 층: 아무것도 import 하지 않습니다. 화면도 서버도 모릅니다 —
 * 나라 고르개를 채우는 것 같은 화면 일은 app.js 가 합니다.
 */

/* **null 은 "아직 안 받음"입니다.** 빈 배열과 뜻이 다릅니다 —
   loadCities 가 `if (cities) return;` 로 두 번 받는 것을 막는 데 씁니다. */
export let cities = null;
export let countryName = {}, countryInfo = {}, continentOf = {};

/* ── 초성 ───────────────────────────────────────────────────────────
 * 'ㄷㅋ' 로 도쿄를 찾게 합니다. 한글 음절 코드에서 첫 자음만 떼어냅니다. */
const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ',
             'ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
export const chosung = s => [...String(s ?? '')].map(ch => {
  const c = ch.charCodeAt(0) - 0xAC00;
  return (c >= 0 && c < 11172) ? CHO[Math.floor(c / 588)] : ch;
}).join('');
export const onlyCho = s => /^[ㄱ-ㅎ]+$/.test(s);

/* ── 색인 ────────────────────────────────────────────────────────────
 * 칠 때마다 만들면 버벅이므로 한 번만 만들어 붙여 둡니다.
 * **이 식은 여기에만 있습니다.** 받아올 때도 새로 만들 때도 여기를 지납니다.
 *   _hay 는 이름들을 붙여 소문자로 (영문·현지어·나라 이름까지 걸립니다)
 *   _cho 는 한글 이름의 초성만 */
function indexCity(c){
  return { ...c,
    /* ── 세고 묶을 때 쓰는 나라 (b652, 사용자 지적: 「괌은 국가가 미국이잖아」)
     * 괌·사이판은 미국, 홍콩·마카오는 중국, 타히티는 프랑스입니다.
     * ⚠ **`country` 는 그대로 둡니다** — 도시 화면에는 「괌」이라고 나와야
     *   합니다. 바뀌는 것은 «세는 법»뿐이라 칸을 따로 둡니다.
     * ⚠ **앞가림 표를 여기 적지 않습니다.** `countries.parent_code`(db/076)
     *   가 유일한 자리입니다 — 코드에도 적어두면 언젠가 한쪽만 고칩니다.
     * ⚠ 안 고치면 앱이 **두 가지 수**를 말합니다: 홍콩만 다녀온 사람이
     *   홈에서는 「1개국」인데 깃발 벽은 0개(벽은 UN 195 안만 셉니다).
     * ⚠ `countryInfo` 가 **먼저** 세워져야 합니다 — useCities 가 나라 표를
     *   먼저 만들고 도시를 훑습니다. 그 차례를 바꾸면 여기가 조용히 빕니다. */
    cc: countryInfo[c.country]?.parent_code || c.country,
    _hay: [c.name, c.name_en, c.name_local, countryName[c.country]]
            .filter(Boolean).join(' ').toLowerCase(),
    _cho: chosung(c.name) };
}

/* 받아온 것이든 캐시에서 꺼낸 것이든 여기서 한 번에 세웁니다.
   **나라 표를 먼저 세웁니다** — 색인이 나라 이름을 쓰기 때문입니다.
   순서를 바꾸면 나라 이름으로 검색이 안 됩니다. */
export function useCities(cityRows, countryRows){
  const ns = countryRows || [];
  countryName = Object.fromEntries(ns.map(n => [n.code, n.name]));
  countryInfo = Object.fromEntries(ns.map(n => [n.code, n]));
  continentOf = Object.fromEntries(ns.map(n => [n.code, n.continent]));
  cities = (cityRows || []).map(indexCity);
}

/* 목록에 없던 도시를 방금 만들었습니다. 다시 받아오면 화면이 한 번 껌뻑이므로
   있는 목록에 바로 끼웁니다. 색인은 위와 **같은 식**을 지납니다. */
export function addCity(row){
  if (!row) return null;
  const c = indexCity(row);
  (cities = cities || []).push(c);
  return c;
}

/* ── 찾기 ────────────────────────────────────────────────────────────
 * 규칙 셋:
 *   초성만 쳤으면 초성으로, 아니면 이름·영문·현지어·나라로
 *   이름이 그 글자로 **시작**하는 것을 위로 ('나' → '나라'가 '하나우마'보다 먼저)
 *   40개까지 (더 내려봐야 안 봅니다) */
export function search(q){
  q = String(q ?? '').trim().toLowerCase();
  if (!q || !cities) return [];        /* 아직 안 불러왔으면 조용히 빈 목록 */
  const cho = onlyCho(q);
  const hits = cities.filter(c => cho ? c._cho.includes(q) : c._hay.includes(q));
  return hits.sort((a, b) => {
    const s = x => (cho ? x._cho : x.name.toLowerCase()).startsWith(q) ? 0 : 1;
    return s(a) - s(b) || a.name.localeCompare(b.name, 'ko');
  }).slice(0, 40);
}

/* ── 자가검사 (개발용) ─────────────────────────────────────────────────
 * 콘솔에서 __citiesCheck(). 로그인도 서버도 필요 없습니다.
 * 지어낸 사전으로 돌리고 끝나면 원래 사전을 돌려놓습니다.
 */
if (typeof window !== 'undefined') window.__citiesCheck = () => {
  const out = [];
  const bad = (name, msgs) =>
    out.push({ 항목:name, 결과: msgs.length ? '✗ ' + msgs.join(' / ') : '✓' });

  const 원래 = { cities, countryName, countryInfo, continentOf };

  const 나라 = [{ code:'JP', name:'일본', continent:'아시아', currency:'JPY' },
                { code:'US', name:'미국', continent:'북아메리카', currency:'USD' }];
  const 도시 = [
    { id:'tokyo',    name:'도쿄',     name_en:'Tokyo',    country:'JP' },
    { id:'toyama',   name:'도야마',   name_en:'Toyama',   country:'JP' },
    { id:'hanauma',  name:'하나우마', name_en:'Hanauma',  country:'US' },
    { id:'nara',     name:'나라',     name_en:'Nara',     country:'JP' },
    { id:'kyoto',    name:'교토',     name_en:'Kyoto', name_local:'京都', country:'JP' },
  ];
  useCities(도시, 나라);
  const 이름 = r => r.map(c => c.name);

  /* 1. 초성으로 찾기. 'ㄷㅋ' → 도쿄 (도야마는 ㄷㅇㅁ 이라 안 걸려야 합니다) */
  {
    const m = [];
    const r = 이름(search('ㄷㅋ'));
    if (r.length !== 1 || r[0] !== '도쿄') m.push(`ㄷㅋ → ${r.join(',') || '없음'}`);
    if (!이름(search('ㄷ')).includes('도야마')) m.push('ㄷ 로 도야마가 안 나옴');
    bad('초성으로 찾는가', m);
  }

  /* 2. 시작하는 것이 위로. '나' 는 '나라'와 '하나우마' 둘 다 걸리는데
        '나라'가 먼저여야 합니다. 이게 이 함수의 유일한 정렬 규칙입니다. */
  {
    const r = 이름(search('나'));
    bad('이름이 그 글자로 시작하는 것이 위로 오는가',
        r[0] === '나라' ? [] : [`${r.join(' · ')}`]);
  }

  /* 3. 영문·현지어·나라 이름으로도 찾힌다 */
  {
    const m = [];
    if (!이름(search('kyoto')).includes('교토'))  m.push('영문으로 못 찾음');
    if (!이름(search('京都')).includes('교토'))   m.push('현지어로 못 찾음');
    if (!이름(search('일본')).includes('도쿄'))   m.push('나라 이름으로 못 찾음');
    if (!이름(search('TOKYO')).includes('도쿄'))  m.push('대문자로 못 찾음');
    if (!이름(search('  도쿄 ')).includes('도쿄')) m.push('앞뒤 공백에 걸림');
    bad('영문 · 현지어 · 나라 이름 · 대소문자 · 공백', m);
  }

  /* 4. 나라 이름은 **색인을 만들기 전에** 세워져 있어야 합니다.
        순서를 바꾸면 나라로 검색하는 것만 조용히 죽습니다. */
  {
    useCities(도시, 나라);
    bad('나라 표가 색인보다 먼저 서는가',
        cities.every(c => c._hay.includes((countryName[c.country] || '').toLowerCase()))
          ? [] : ['색인에 나라 이름이 안 들어감']);
  }

  /* 5. 새로 만든 도시도 **같은 식으로** 색인된다.
        전에는 이 식이 두 곳에 베껴져 있었습니다. */
  {
    const m = [];
    addCity({ id:'osaka', name:'오사카', name_en:'Osaka', country:'JP' });
    if (!이름(search('ㅇㅅㅋ')).includes('오사카')) m.push('초성으로 못 찾음');
    if (!이름(search('osaka')).includes('오사카'))  m.push('영문으로 못 찾음');
    if (!이름(search('일본')).includes('오사카'))   m.push('나라 이름으로 못 찾음');
    bad('새로 만든 도시도 같은 색인을 타는가', m);
  }

  /* 6. 없거나 이상한 것을 넣어도 터지지 않는다. 사전을 못 받은 채로
        검색칸을 치는 일이 실제로 있습니다(오프라인 첫 실행). */
  {
    const m = [];
    try {
      if (search('').length)          m.push('빈 글자에 결과가 나옴');
      if (search('   ').length)       m.push('공백에 결과가 나옴');
      if (search(null).length)        m.push('null 에 결과가 나옴');
      if (search('없는도시').length)   m.push('없는 것에 결과가 나옴');
      cities = null;
      if (search('도쿄').length)      m.push('사전이 없는데 결과가 나옴');
      useCities(null, null);          /* 아무것도 안 온 응답 */
      if (search('도쿄').length)      m.push('빈 사전인데 결과가 나옴');
    } catch (e){ m.push('터짐: ' + e.message); }
    bad('사전이 없거나 이상한 것을 넣어도 버티는가', m);
  }

  /* 7. 40개까지만. 더 내려봐야 안 봅니다. */
  {
    useCities(Array.from({ length: 60 }, (_, i) =>
      ({ id:'c'+i, name:'가나다'+i, country:'JP' })), 나라);
    bad('40개까지만 돌려주는가',
        search('가나다').length === 40 ? [] : [`${search('가나다').length}개`]);
  }

  /* 되돌려 놓기 */
  cities = 원래.cities; countryName = 원래.countryName;
  countryInfo = 원래.countryInfo; continentOf = 원래.continentOf;

  console.table(out);
  const ng = out.filter(o => o.결과 !== '✓');
  console.log(ng.length ? `✗ ${ng.length}건 틀림` : `✓ ${out.length}건 모두 통과`);
  return out;
};
