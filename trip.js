/* ── 지금 열려 있는 여행 ──────────────────────────────────────────────
 * 여행 하나의 자료를 여기서 지킵니다. 전에는 app.js 맨 위에 `let` 로 널려
 * 있어서 **165개 함수 중 75개가 아무 때나 읽고 쓸 수 있었습니다.**
 *
 * 그래서 났던 일:
 *   여행을 닫는 코드가 네 군데였고 **이미 서로 달랐습니다.** 셋은 화면을
 *   숨기고 하나는 안 숨겼습니다. 그리고 **네 곳 어디서도 plans · members ·
 *   expenses 를 안 비웠습니다** — 비우는 코드가 아예 없었습니다.
 *   여행 A 를 보다 B 를 열었는데 연결이 끊겨 loadMembers 가 조용히 빠져나오면,
 *   B 의 준비물 담당자 목록에 A 의 일행이 그대로 떴습니다.
 *
 * 여기서 두 가지를 약속합니다:
 *   1. 여행이 바뀌면 옛 여행 자료는 **하나도 안 남는다**
 *   2. 여행을 닫는 일은 **한 곳에서만** 일어난다 (clearTrip)
 *
 * `export let` 은 **살아 있는 연결**입니다. app.js 는 `trip.id` 를 예전과
 * 똑같이 읽습니다 — 읽는 368곳은 한 글자도 안 바꿨습니다. 대신 값을 넣는 것은
 * 여기서만 됩니다. app.js 에서 `trip = x` 라고 쓰면 **브라우저가 문법 오류로
 * 앱을 안 띄웁니다.** 빠뜨리고 넘어갈 방법이 없다는 뜻입니다.
 *
 * 층: 아무것도 import 하지 않습니다. 여기는 자료만 있고 화면도 서버도 모릅니다.
 */

/* 여행 한 줄. `myRole` 은 받아온 뒤 app.js 가 붙입니다(객체 안을 고치는 것은
   막히지 않습니다 — 막히는 것은 이름에 다른 값을 넣는 것뿐입니다). */
export let trip = null;

/* 그 여행에 딸린 것들 */
export let plans = [], legs = [], members = [], expenses = [], bookings = [],
           transitLines = [];

/* 그 여행을 **보는 방식**. 여행이 바뀌면 같이 처음으로 돌아가야 합니다 —
   앞 여행에서 'Day 3'을 보고 있다가 다음 여행을 열면 3일차부터 보입니다. */
export let pickedDay = null, tab = 'plans', catFilter = '',
           settleOn = false, todayOn = false, editPlanId = null;

/* AI 제안 카드에서 일정 폼으로 들고 오는 좌표. **세 파일이 같이 씁니다** —
   cards.js 가 담고, geocode.js 가 꺼내 쓰고 비우고, app.js 가 새 폼을 열 때
   버립니다. 그래서 여기(공유 자료 자리)에 둡니다.
   ⚠ **cards.js 안에 `let` 으로 숨어 있었습니다**(b363 까지). 나머지 둘은
   그냥 이름을 부르고 있었고, 모듈은 늘 strict 라 `planSeedGeo is not defined`
   로 터졌습니다 — **일정 탭의 `추가` 가 통째로 안 열렸습니다**(토글보다
   앞줄이라 아무 일도 안 일어났습니다). check-refs 는 **아무도 내보내지 않는
   이름**은 안 봅니다(잡음을 0 으로 두려고). 그 사각지대였습니다. */
export let planSeedGeo = null;

/* 닫을 때 같이 해야 하는 바깥일(실시간 구독 끊기). app.js 가 넣어 둡니다 —
   여기서 app.js 를 부르면 서로 부르는 꼴이 됩니다.
   (net.js 의 setOnDrained · ui.js 의 setSheetCloser 와 같은 방식입니다.) */
let onClose = () => {};
export function setTripCloser(fn){ onClose = fn; }

/* 여행에 딸린 것 전부를 처음 상태로. **여기 한 곳에만 적습니다** —
   새 자료를 더할 때 이 줄에 안 적으면 그것만 옛 여행 것이 남습니다. */
function blank(){
  plans = []; legs = []; members = []; expenses = []; bookings = [];
  transitLines = [];
  pickedDay = null; tab = 'plans'; catFilter = '';
  settleOn = false; todayOn = false; editPlanId = null;
  planSeedGeo = null;
}

/* 여행 한 줄을 갈아끼웁니다.
 *
 * **비울지 말지를 부르는 쪽에 묻지 않습니다.** fetchTrip 은 여행을 여는 데도
 * 쓰지만 **같은 여행을 다시 받아오는 데도 세 번** 쓰입니다(제목을 고친 뒤,
 * 날짜를 옮긴 뒤, 실시간으로 바뀐 뒤). 부르는 쪽이 "이번엔 비워라"를 넘기게
 * 하면 그 셋 중 하나에서 잊는 순간 일정이 통째로 날아갑니다.
 * 아이디가 달라졌을 때만 비웁니다 — 그러면 아무도 안 잊습니다. */
export function setTrip(row){
  if (row?.id !== trip?.id) blank();
  trip = row || null;
}

/* 여행을 닫습니다. 전에는 네 곳에 흩어져 있던 일입니다. */
export function clearTrip(){
  onClose();
  trip = null;
  blank();
}

/* 하나씩 넣는 문. 이름을 그대로 따릅니다 — `setPlans(x)` 는 `plans = x` 입니다. */
export function setPlans(v){ plans = v || []; }
export function setLegs(v){ legs = v || []; }
export function setMembers(v){ members = v || []; }
export function setExpenses(v){ expenses = v || []; }
export function setBookings(v){ bookings = v || []; }
export function setTransitLines(v){ transitLines = v || []; }
export function setPickedDay(v){ pickedDay = v ?? null; }
export function setTab(v){ tab = v; }
export function setCatFilter(v){ catFilter = v || ''; }
export function setSettleOn(v){ settleOn = !!v; }
export function setTodayOn(v){ todayOn = !!v; }
export function setEditPlanId(v){ editPlanId = v ?? null; }
/* import 한 값에 밖에서 `=` 를 하면 그 파일 안쪽만 바뀝니다 — 반드시 이걸 씁니다
   (setTrip · setMyAvatar 와 같은 꼴). */
export function setPlanSeedGeo(v){ planSeedGeo = v ?? null; }

/* ── 자가검사 (개발용) ─────────────────────────────────────────────────
 * 콘솔에서 __tripCheck() 를 부르면 아래를 다 돌려 봅니다.
 * 로그인도 서버도 필요 없습니다 — 여기는 자료만 있으니까요.
 * (calc.js 의 __calcCheck · card.js 의 __cardCheck 와 같은 방식입니다.)
 *
 * 보는 것은 위에 적은 약속 둘입니다. 이 검사가 통과하는 한
 * "A 를 닫았는데 A 가 남아 있다" 부류의 사고는 안 납니다.
 */
if (typeof window !== 'undefined') window.__tripCheck = () => {
  const out = [];
  const bad = (name, msgs) =>
    out.push({ 항목:name, 결과: msgs.length ? '✗ ' + msgs.join(' / ') : '✓' });

  /* 검사가 끝나면 있던 것을 그대로 돌려놓습니다 — 여행을 열어둔 채로
     콘솔에서 불러도 화면이 안 망가져야 합니다. */
  const 원래 = { trip, plans, legs, members, expenses, bookings, transitLines,
                 pickedDay, tab, catFilter, settleOn, todayOn, editPlanId, onClose };

  const 채우기 = () => {
    setPlans([{ id:'p1' }]); setLegs([{ id:'l1' }]); setMembers([{ user_id:'u1' }]);
    setExpenses([{ id:'e1' }]); setBookings([{ id:'b1' }]); setTransitLines(['line']);
    setPickedDay('2026-09-12'); setTab('exp'); setCatFilter('식사');
    setSettleOn(true); setTodayOn(true); setEditPlanId('p1');
  };
  /* 비어야 하는 것이 정말 비었나. **여기에 이름을 안 적으면 검사도 못 봅니다** —
     blank() 에 새 자료를 더할 때 이 줄에도 같이 적을 것. */
  const 남은것 = () => {
    const m = [];
    for (const [k, v] of [['plans',plans], ['legs',legs], ['members',members],
                          ['expenses',expenses], ['bookings',bookings],
                          ['transitLines',transitLines]])
      if (v.length) m.push(`${k} ${v.length}건`);
    if (pickedDay !== null)   m.push('pickedDay ' + pickedDay);
    if (tab !== 'plans')      m.push('tab ' + tab);
    if (catFilter !== '')     m.push('catFilter ' + catFilter);
    if (settleOn)             m.push('settleOn');
    if (todayOn)              m.push('todayOn');
    if (editPlanId !== null)  m.push('editPlanId ' + editPlanId);
    return m;
  };

  /* 1. 다른 여행으로 갈아끼우면 옛 여행 자료가 하나도 안 남아야 합니다.
        이게 이 파일을 만든 이유입니다. */
  setTrip({ id:'A' }); 채우기();
  setTrip({ id:'B' });
  bad('여행을 갈아끼우면 옛 자료가 안 남는가', 남은것());

  /* 2. **같은 여행을 다시 받으면 그대로 있어야 합니다.**
        fetchTrip 은 제목을 고친 뒤·날짜를 옮긴 뒤에도 불립니다.
        여기서 비워버리면 그때마다 일정이 통째로 날아갑니다. */
  setTrip({ id:'B' }); 채우기();
  setTrip({ id:'B', title:'이름만 바꿈' });
  bad('같은 여행을 다시 받으면 자료가 살아 있는가',
      plans.length && members.length && tab === 'exp' ? []
        : ['새로고침했는데 자료가 날아감']);

  /* 3. 닫으면 전부 비고, 실시간 구독도 같이 끊겨야 합니다. */
  {
    let 끊었나 = false;
    setTripCloser(() => { 끊었나 = true; });
    setTrip({ id:'C' }); 채우기();
    clearTrip();
    const m = 남은것();
    if (trip !== null) m.push('trip 이 안 비었음');
    if (!끊었나)       m.push('실시간 구독을 안 끊음');
    bad('닫으면 전부 비는가 · 구독도 끊는가', m);
  }

  /* 4. null 을 넣어도 터지지 않아야 합니다. 로그아웃·오류 경로가 여기로 옵니다. */
  {
    const m = [];
    try {
      setTrip(null);
      if (trip !== null) m.push('setTrip(null) 뒤에도 남아 있음');
      setPlans(null); setMembers(undefined); setLegs(null);
      if (plans.length || members.length || legs.length) m.push('null 이 배열이 안 됨');
    } catch (e){ m.push('터짐: ' + e.message); }
    bad('null · undefined 를 넣어도 버티는가', m);
  }

  /* 되돌려 놓기 */
  setTripCloser(원래.onClose);
  trip = 원래.trip; plans = 원래.plans; legs = 원래.legs; members = 원래.members;
  expenses = 원래.expenses; bookings = 원래.bookings;
  transitLines = 원래.transitLines; pickedDay = 원래.pickedDay; tab = 원래.tab;
  catFilter = 원래.catFilter; settleOn = 원래.settleOn; todayOn = 원래.todayOn;
  editPlanId = 원래.editPlanId;

  console.table(out);
  const ng = out.filter(o => o.결과 !== '✓');
  console.log(ng.length ? `✗ ${ng.length}건 틀림` : `✓ ${out.length}건 모두 통과`);
  return out;
};

/* 일행 이름. **사람을 가리켜야 합니다.**
   전에는 이름이 없으면 '아직 이름을 안 정했어요' 였습니다. 일행 목록에서는
   말이 되지만 정산의 송금 줄에 들어가면 이렇게 됩니다:

       아직 이름을 안 정했어요 → 첼시꿀  ₩10,000

   **누가 보내야 하는지를 말하는 자리인데 사람을 못 가리킵니다.** 게다가 이름을
   안 정한 사람이 둘이면 줄이 통째로 똑같아져서 구분이 아예 안 됩니다.
   들어온 순서로 번호를 붙입니다 — loadMembers 가 joined_at 으로 정렬하므로
   다시 열어도 같은 사람이 같은 번호입니다.
   **이름을 만드는 곳은 여기 하나뿐입니다** — 일행 목록도 이걸 씁니다.
   전에는 같은 문구가 두 곳에 베껴져 있었습니다.

   ── app.js 에서 여기로 옮겼습니다(b335) ──────────────────────────────
   지출을 떼어내다 보니 이것이 지출 블록 한가운데 있었는데, 정작 쓰는 곳은
   지출·정산·여행 후기·준비물·일행 다섯입니다. 지출과 같이 내보내면
   나머지 넷이 지출에 기대게 됩니다. members 를 가진 곳이 여기라
   여기가 맞습니다. */
export const nameOf = id => {
  const i = members.findIndex(x => x.user_id === id);
  if (i < 0) return '알 수 없음';
  const m = members[i];
  return m.nickname || m.profiles?.display_name || `일행 ${i + 1}`;
};
