/* ── 여행 비서가 방금 내놓은 것 ──────────────────────────────────────
 * AI 가 제안한 카드(일정 후보 · 장소)와, 어느 여행에 대해 묻고 있는지.
 *
 * **화면에 보이는 카드와 여기 담긴 것이 같아야 합니다.** 화면은 카드의
 * 번호(`data-i`)로 여기를 찾아갑니다 — `suggested.actions[i]`. 둘이 어긋나면
 * **다른 카드를 담게 됩니다.** 사용자가 A 를 눌렀는데 B 가 일정에 들어갑니다.
 * 그래서 새 제안이 오면 통째로 갈아끼우고, 대화를 닫으면 통째로 비웁니다.
 *
 * **null 로 두면 안 됩니다** — 읽는 쪽이 `suggested.actions[i]` 를 그대로
 * 씁니다. 비울 때도 모양은 남겨야 합니다. 그게 여기서 지키는 규칙입니다.
 *
 * 층: 아무것도 import 하지 않습니다.
 */

/* 방금 받은 제안. **모양이 늘 { actions:[], places:[] } 입니다.** */
export let suggested = { actions: [], places: [] };
/* 어느 여행에 대해 묻고 있나. 여행 없이 물어볼 수도 있어서 null 이 정상입니다. */
export let aiTripId = null;

/* 새 제안이 왔습니다. **통째로** 갈아끼웁니다 — 하나씩 더하면 화면의 번호와
   어긋납니다. 한쪽만 온 답도 있어서(장소만·일정만) 없는 쪽은 빈 목록입니다. */
export function setSuggested(d){
  /* **`|| []` 로는 모자랍니다.** 답을 만드는 것은 AI 이고, 목록이어야 할 자리에
     글자 하나가 오는 일이 있습니다. `'글자' || []` 는 글자를 그대로 통과시키고,
     그러면 읽는 쪽의 `.actions[i]` 가 글자 한 자를 돌려줘 카드가 깨집니다.
     **목록인지를 물어야 합니다.** (검사를 만들다 여기서 걸렸습니다.) */
  const arr = v => Array.isArray(v) ? v : [];
  suggested = { actions: arr(d?.actions), places: arr(d?.places) };
}

/* 대화를 닫았습니다. 남겨두면 이미 담은 것을 또 담게 되고,
   무엇이 최신인지 헷갈립니다. */
export function clearSuggested(){
  suggested = { actions: [], places: [] };
}

export function setAiTripId(id){ aiTripId = id ?? null; }

/* ── 자가검사 (개발용) ─────────────────────────────────────────────────
 * 콘솔에서 __aiCheck(). 서버도 AI 한도도 안 씁니다.
 */
if (typeof window !== 'undefined') window.__aiCheck = () => {
  const out = [];
  const bad = (name, msgs) =>
    out.push({ 항목:name, 결과: msgs.length ? '✗ ' + msgs.join(' / ') : '✓' });

  const 원래 = { suggested, aiTripId };

  /* 1. 무엇을 넣어도 모양이 안 깨진다. 읽는 쪽이 `.actions[i]` 를 그대로 씁니다 —
        여기가 null 이나 undefined 가 되면 카드 화면이 통째로 터집니다. */
  {
    const m = [];
    for (const [what, d] of [['아무것도 없음', null], ['빈 객체', {}],
                             ['장소만', { places:[{ name:'도쿄타워' }] }],
                             ['일정만', { actions:[{ title:'점심' }] }],
                             ['이상한 것', { actions:'글자' }]]){
      setSuggested(d);
      if (!Array.isArray(suggested.actions) || !Array.isArray(suggested.places))
        m.push(what);
    }
    bad('무엇이 와도 모양이 { actions:[], places:[] } 인가', m);
  }

  /* 2. **통째로 갈아끼운다.** 화면은 번호로 여기를 찾아갑니다 —
        옛 제안이 뒤에 남으면 A 를 눌렀는데 B 가 담깁니다. */
  {
    setSuggested({ actions:[{ title:'첫 제안' }, { title:'둘' }],
                   places:[{ name:'가' }] });
    setSuggested({ actions:[{ title:'새 제안' }] });
    const m = [];
    if (suggested.actions.length !== 1) m.push(`일정 ${suggested.actions.length}개 (1 기대)`);
    if (suggested.actions[0]?.title !== '새 제안') m.push('옛 제안이 앞에 남음');
    if (suggested.places.length !== 0) m.push(`장소 ${suggested.places.length}개 (0 기대)`);
    bad('새 제안이 오면 옛것이 안 남는가', m);
  }

  /* 3. 닫으면 비되, 모양은 남는다 */
  {
    setSuggested({ actions:[{ title:'x' }], places:[{ name:'y' }] });
    clearSuggested();
    bad('닫으면 비되 모양은 남는가',
        suggested.actions.length === 0 && suggested.places.length === 0 &&
        Array.isArray(suggested.actions) ? [] : ['모양이 깨짐']);
  }

  /* 4. 여행 없이 물어보는 것이 정상이다 (홈에서 그냥 물어볼 수 있습니다) */
  {
    const m = [];
    setAiTripId('trip-1');
    if (aiTripId !== 'trip-1') m.push('여행을 못 담음');
    setAiTripId(undefined);
    if (aiTripId !== null) m.push('undefined 가 null 이 안 됨');
    bad('여행 없이도 되는가', m);
  }

  /* 되돌려 놓기 */
  suggested = 원래.suggested; aiTripId = 원래.aiTripId;

  console.table(out);
  const ng = out.filter(o => o.결과 !== '✓');
  console.log(ng.length ? `✗ ${ng.length}건 틀림` : `✓ ${out.length}건 모두 통과`);
  return out;
};
