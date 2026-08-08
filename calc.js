/* ── 순수 계산 ─────────────────────────────────────────────────────────
 * 여기 있는 함수는 DOM을 몰라야 합니다. document, querySelector, 화면의
 * 전역(trip/plans/members 같은 것)을 직접 읽지 않고, 받은 매개변수만 보고
 * 값을 돌려줍니다. 그래야 여행·일행을 실제로 만들지 않고도 콘솔에서
 * 지어낸 값으로 검사할 수 있습니다(맨 아래 __calcCheck, app.js 의
 * __settleCheck 와 같은 이유).
 *
 * app.js 에서 흔히 쓰는 D1/asDate 를 여기서도 한 줄씩 다시 적어 둡니다.
 * app.js 는 이 값을 화면 갱신 로직 곳곳에서 이미 씁니다 — 그쪽까지
 * import 로 엮으면 이 파일이 다시 app.js 에 기대게 되어 "DOM을 모른다"는
 * 약속이 깨집니다. 한 줄짜리라 베끼는 편이 더 안전합니다.
 */
const D1 = 864e5;
const asDate = s => new Date(s + 'T00:00:00Z');

/* 두 좌표 사이 직선거리(km). 실제 경로가 아니라 어림입니다. */
export function distKm(a, b, c, d){
  if ([a,b,c,d].some(v => v == null)) return null;
  const r = Math.PI/180, R = 6371;
  const dLat = (c-a)*r, dLng = (d-b)*r;
  const h = Math.sin(dLat/2)**2 + Math.cos(a*r)*Math.cos(c*r)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

/* 도쿄에서 실제로 재서 쓰던 식입니다. 상수는 그날 있는 구간에서 옵니다 —
   로마는 대중교통, 오키나와는 차라서 같은 거리도 시간이 다릅니다. */
export function travel(km, g){
  if (km == null) return null;
  /* 상수 하나만 비어도 계산이 통째로 NaN 이 됩니다. 실제로 그렇게 나왔습니다.
     칸을 못 받아왔거나 아직 안 채워진 구간에서도 그럴듯한 값이 나오게 합니다. */
  const n = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
  const q = g || {};
  return km < n(q.walk_max_km, 1.2)
    ? { walk:true,  min: Math.max(1, Math.round(km * n(q.walk_min_per_km, 13) +
                                                n(q.walk_base_min, 2))) }
    : { walk:false, min: Math.max(1, Math.round(km * n(q.transit_factor, 3.5) +
                                                n(q.transit_base_min, 13))) };
}

/* 두 일정 사이 이동. 좌표가 둘 다 있어야 잽니다. */
export function hop(a, b, lgs){
  const km = distKm(a.lat, a.lng, b.lat, b.lng);
  if (km == null) return null;
  const g = (lgs || []).find(l => a.date >= l.start_date && a.date <= l.end_date)
            || (lgs || [])[0];
  const tv = travel(km, g);
  return tv && { km, ...tv };
}

/* ── 날짜가 실제로 든 구간 셋 ──────────────────────────────────────────
 * 셋이 이름만 비슷하지 폴백 규칙이 다릅니다. app.js 에서 옮기며 통합하지
 * 않고 그대로 두었습니다 — 하나는 원래 화면 표시용, 하나는 이동시간
 * 어림용으로 각자 다른 이유로 만들어졌습니다.
 *
 *   legAt    구간 밖이면 null.
 *            화면에 도시 이름을 적을 때 씁니다 — 없는데 있다고 하면 거짓말이 됩니다.
 *   legNear  구간 밖이면 날짜가 첫 구간보다 이르면 첫 구간, 늦으면 마지막 구간.
 *   legFirst 구간 밖이면 무조건 legs[0]. legNear 와 다릅니다 — 여행 후 날짜에도
 *            legs[0]을 주므로 이동시간 어림(travelMinutes)에서만 씁니다.
 */
export function legAt(legs, date){
  return (legs || []).find(l => date >= l.start_date && date <= l.end_date) || null;
}

export function legNear(legs, date){
  if (!legs || !legs.length) return null;
  return legs.find(l => date >= l.start_date && date <= l.end_date)
      || (date < legs[0].start_date ? legs[0] : legs[legs.length - 1]);
}

export function legFirst(legs, date){
  return (legs || []).find(l => date >= l.start_date && date <= l.end_date) || (legs || [])[0];
}

export function travelMinutes(legs, km, date){
  const g = legFirst(legs, date);
  const t = travel(km, g);
  return t ? t.min : Math.round(km * 3.5 + 13);
}

/* 여기 하나로 모읍니다.
   같은 달        9월 12일 – 15일
   달이 다름      9월 28일 – 10월 3일
   해가 다르면    2027년 1월 3일 – 6일   (올해면 해를 안 적습니다) */
export function dateRange(a, b){
  if (!a || !b) return '';
  const s = asDate(a), e = asDate(b);
  const nowY = new Date().getFullYear();
  const y = s.getFullYear() !== nowY || e.getFullYear() !== nowY
    ? `${s.getFullYear()}년 ` : '';
  const same = s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth();
  return same
    ? `${y}${s.getMonth() + 1}월 ${s.getDate()}일 – ${e.getDate()}일`
    : `${y}${s.getMonth() + 1}월 ${s.getDate()}일 – ${e.getMonth() + 1}월 ${e.getDate()}일`;
}

export function dayLabel(dateStr, t){
  const d = asDate(dateStr), s = asDate(t.start_date), e = asDate(t.end_date);
  const f = d.toLocaleDateString('ko-KR',
    { month:'long', day:'numeric', weekday:'long', timeZone:'UTC' });
  if (d < s) return `${f} · 여행 전`;
  if (d > e) return `${f} · 여행 후`;
  return `Day ${Math.round((d - s) / D1) + 1} · ${f}`;
}

/* 시간대 이름(Europe/Rome)은 우리가 계산에 쓰는 값이지 사용자가 알 것은 아닙니다.
   같은 자료로 현지 시각을 보여주는 편이 실제로 쓸모 있습니다.
   기기와 시차가 없으면 굳이 적지 않습니다. */
export function localTime(tz){
  if (!tz) return '';
  try {
    const here = new Intl.DateTimeFormat('ko-KR',
      { hour:'2-digit', minute:'2-digit', hour12:false }).format(new Date());
    const there = new Intl.DateTimeFormat('ko-KR',
      { hour:'2-digit', minute:'2-digit', hour12:false, timeZone:tz }).format(new Date());
    return here === there ? '' : `현지 ${there}`;
  } catch { return ''; }
}

/* 통화마다 소수 자리가 다릅니다. 엔·원·동은 소수점이 없습니다.
   drawSettle(app.js) 가 정산 단위를 고를 때도 이 목록을 그대로 씁니다 —
   같은 것을 두 곳에 적어두면 한쪽만 고치는 사고가 납니다. */
export const NO_CENTS = ['JPY','KRW','VND','IDR','CLP','HUF','TWD'];
export function money(n, cur){
  try {
    return new Intl.NumberFormat('ko-KR', { style:'currency', currency:cur,
      maximumFractionDigits: NO_CENTS.includes(cur) ? 0 : 2 }).format(n);
  } catch { return `${Math.round(n).toLocaleString('ko-KR')} ${cur}`; }
}

/* ── 정산 셈 ──────────────────────────────────────────────────────────
 * **화면과 떼어 놓았습니다.** 돈 계산이라 읽기만으로는 못 믿는데, 화면
 * 그리기와 붙어 있으면 여행과 일행을 실제로 만들어야만 돌려볼 수 있습니다.
 * 여기는 넣은 값만 보고 답을 내므로 지어낸 경우로도 검사할 수 있습니다
 * (app.js 의 __settleCheck).
 *
 * 지금 규칙:
 *   - 나눌 사람 = 그 지출에 몫이 적혀 있으면 그 사람들, 없으면 아직 있는 참여자 전원
 *   - 낸 사람 = 결제자. 나간 사람이 낸 것도 돌려받을 돈으로 셉니다
 *   - 환율을 못 구했거나 결제자를 안 적은 지출은 빼고, 몇 건인지 말합니다(호출부에서)
 *
 * 넣는 것: 지출 줄들, 아직 있는 참여자들
 * 내는 것: { total, bal, moves }
 */
export function settleMath(rows, active, unit = 1){
  const total = rows.reduce((s, e) => s + Number(e.amount_home), 0);

  /* 낸 돈과 써야 할 돈을 따로 셉니다. 둘의 차이가 그 사람의 잔액입니다. */
  const paid = {}, owed = {};
  const bump = (o, k, v) => o[k] = (o[k] || 0) + v;

  for (const e of rows){
    const amt = Number(e.amount_home);
    bump(paid, e.payer_id, amt);

    const sh = (e.expense_shares || []).filter(s => Number(s.weight) > 0);
    const split = sh.length
      ? sh.map(s => [s.user_id, Number(s.weight)])
      : active.map(m => [m.user_id, 1]);
    const w = split.reduce((s, [, v]) => s + v, 0);
    /* 나눌 사람이 아무도 없으면(다 나갔다) 낸 사람이 혼자 쓴 것으로 둡니다.
       0 으로 나누면 조용히 NaN 이 되고 정산 전체가 무너집니다. */
    if (!w){ bump(owed, e.payer_id, amt); continue; }
    for (const [uid, v] of split) bump(owed, uid, amt * v / w);
  }

  /* 낸 사람과 나눠 낼 사람을 합칩니다 — 나간 사람이 낸 돈도 돌려받아야 합니다. */
  const ids = [...new Set([...Object.keys(paid), ...Object.keys(owed)])];
  const bal = ids.map(id => ({ id, paid: paid[id] || 0, owed: owed[id] || 0,
                               v: (paid[id] || 0) - (owed[id] || 0) }))
                 .sort((a, b) => a.v - b.v);

  /* ── 화면에 찍히는 단위로 맞춰둡니다 ──
     셋이 10000원을 나누면 1인분이 3333.33… 입니다. 화면은 원 단위로
     반올림해 찍으므로 "+6,667 받을 것"인데 보내라는 것은 3,333 + 3,333 =
     6,666 이 됩니다. 1원이 비고, 보는 사람은 어느 쪽이 맞는지 모릅니다.
     **맞물리기 전에 미리 단위에 맞춰 깎습니다.** 그러면 화면의 모든
     숫자가 같은 자리에서 떨어집니다.
     깎고 남은 자투리는 제일 많이 받을 사람에게 몰아줍니다 — 합이 0 이
     아니면 그만큼이 아무에게도 안 가고 사라집니다. */
  const q = n => Math.round(n / unit) * unit;
  bal.forEach(b => { b.paid = q(b.paid); b.owed = q(b.owed); b.v = q(b.v); });
  const drift = q(bal.reduce((s, b) => s + b.v, 0));
  if (drift && bal.length){
    const top = bal.reduce((a, b) => (b.v > a.v ? b : a), bal[0]);
    top.v = q(top.v - drift);
  }
  bal.sort((a, b) => a.v - b.v);

  /* 적게 낸 사람이 많이 낸 사람에게 보냅니다. 큰 쪽부터 맞물려 건수를 줄입니다.
     이제 낸 돈 합과 쓴 돈 합이 같으므로 남는 빚 없이 떨어집니다. */
  const work = bal.map(b => ({ ...b }));
  const moves = [];
  let i = 0, j = work.length - 1;
  while (i < j){
    const owe = -work[i].v, get = work[j].v;
    /* 한 단위(원화면 1원)도 안 되는 것은 안 보냅니다. */
    if (owe < unit){ i++; continue; }
    if (get < unit){ j--; continue; }
    const v = Math.min(owe, get);
    moves.push({ from: work[i].id, to: work[j].id, v });
    work[i].v += v; work[j].v -= v;
  }
  return { total, bal, moves };
}

/* ── 자가검사 (개발용) ─────────────────────────────────────────────────
 * 콘솔에서 __calcCheck() 를 부르면 아래를 다 돌려 봅니다. 여행·일행을
 * 실제로 만들 필요가 없습니다 — 지어낸 값만 봅니다.
 */
if (typeof window !== 'undefined') window.__calcCheck = () => {
  const out = [];
  const bad = (name, msgs) => out.push({ 항목:name, 결과: msgs.length ? '✗ ' + msgs.join(' / ') : '✓' });

  /* legAt/legNear/legFirst/travelMinutes — 구간 세 개(로마→피렌체→바젤)로
     구간 안·구간 사이 빈 날·여행 전·여행 후 네 가지를 다 본다. */
  {
    const legs = [
      { start_date:'2026-09-01', end_date:'2026-09-03', walk_max_km:1.2, transit_factor:3.5, transit_base_min:13 },
      { start_date:'2026-09-05', end_date:'2026-09-07' },  // 09-04 는 구간 사이 빈 날
      { start_date:'2026-09-08', end_date:'2026-09-10' },
    ];
    const cases = [
      ['구간 안 (첫 구간)',        '2026-09-02', 0],
      ['구간 사이 빈 날 (09-04)',  '2026-09-04', null],
      ['여행 전 (08-30)',          '2026-08-30', null],
      ['여행 후 (09-15)',          '2026-09-15', null],
    ];
    for (const [name, date, atIdx] of cases){
      const at = legAt(legs, date);
      const near = legNear(legs, date);
      const first = legFirst(legs, date);
      const msgs = [];
      const wantAt = atIdx == null ? null : legs[atIdx];
      if (at !== wantAt) msgs.push(`legAt ${at ? '찾음' : 'null'} (기대: ${wantAt ? '찾음' : 'null'})`);
      if (!near) msgs.push('legNear 가 null (구간이 있으면 늘 뭔가 돌려줘야 함)');
      if (!first) msgs.push('legFirst 가 null (구간이 있으면 늘 뭔가 돌려줘야 함)');
      bad(`leg 찾기 · ${name}`, msgs);
    }
    /* legFirst 는 여행 후에도 legs[0] 을 주고(이동시간 어림용), legNear 는 마지막 구간을 준다 — 서로 달라야 정상. */
    const afterFirst = legFirst(legs, '2026-09-15'), afterNear = legNear(legs, '2026-09-15');
    bad('legFirst vs legNear 폴백 차이 (여행 후)',
        afterFirst === legs[0] && afterNear === legs[2] ? [] : ['폴백 규칙이 문서와 다름']);

    /* travelMinutes — NaN 없이, 상수가 비어도(마지막 구간처럼) 그럴듯한 값. */
    const tShort = travelMinutes(legs, 0.5, '2026-09-02');   // 도보 거리
    const tLong  = travelMinutes(legs, 5,   '2026-09-02');   // 대중교통 거리
    const tGapDay = travelMinutes(legs, 5,  '2026-09-04');   // 상수 없는 구간(빈 날)
    const msgs2 = [];
    if (!Number.isFinite(tShort) || tShort <= 0) msgs2.push(`도보 ${tShort}`);
    if (!Number.isFinite(tLong)  || tLong  <= 0) msgs2.push(`대중교통 ${tLong}`);
    if (!Number.isFinite(tGapDay) || tGapDay <= 0) msgs2.push(`빈 날 ${tGapDay}`);
    bad('travelMinutes NaN 없음', msgs2);
  }

  /* distKm/travel — 서울역→강남역(약 9km)으로 대중교통 값이 나오는지. */
  {
    const km = distKm(37.5547, 126.9707, 37.4979, 127.0276);
    const t = travel(km, {});
    const msgs = [];
    if (!(km > 5 && km < 15)) msgs.push(`거리 ${km?.toFixed(2)}km (5~15 기대)`);
    if (!t || t.walk) msgs.push('도보로 나옴 (대중교통이어야 함)');
    if (!Number.isFinite(t?.min) || t.min <= 0) msgs.push(`시간 ${t?.min}`);
    bad('distKm/travel · 서울역→강남역', msgs);
  }

  /* dateRange/dayLabel — 여행 시작/끝 경계. */
  {
    const t = { start_date:'2026-09-01', end_date:'2026-09-10' };
    const msgs = [];
    if (!/9월 1일.*10일/.test(dateRange(t.start_date, t.end_date)))
      msgs.push(`dateRange ${dateRange(t.start_date, t.end_date)}`);
    if (!dayLabel(t.start_date, t).startsWith('Day 1'))
      msgs.push(`dayLabel 첫날 ${dayLabel(t.start_date, t)}`);
    if (!dayLabel('2026-08-30', t).includes('여행 전'))
      msgs.push(`dayLabel 여행전 ${dayLabel('2026-08-30', t)}`);
    if (!dayLabel('2026-09-15', t).includes('여행 후'))
      msgs.push(`dayLabel 여행후 ${dayLabel('2026-09-15', t)}`);
    bad('dateRange/dayLabel', msgs);
  }

  /* money — 원화(소수점 없음) vs 유로(소수점 있음). */
  {
    const msgs = [];
    if (/\./.test(money(1000, 'KRW'))) msgs.push(`KRW 에 소수점: ${money(1000, 'KRW')}`);
    if (!/\d/.test(money(10.5, 'EUR'))) msgs.push(`EUR ${money(10.5, 'EUR')}`);
    bad('money 자릿수', msgs);
  }

  console.table(out);
  const ng = out.filter(o => o.결과 !== '✓');
  console.log(ng.length ? `✗ ${ng.length}건 틀림` : `✓ ${out.length}건 모두 통과`);
  return out;
};
