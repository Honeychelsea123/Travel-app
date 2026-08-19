/* ── 여행 리포트 ─────────────────────────────────────────────────────
 * 다녀온 여행을 옆으로 넘겨 보는 카드로 냅니다. 며칠 · 몇 곳 · 얼마 ·
 * 얼마나 걸었나. 마지막 장에서 다음 여행으로 이어집니다.
 *
 * **AI 를 안 씁니다.** 같은 여행을 다시 열면 같은 문구가 나와야 합니다 —
 * 성향 카드(card.js)와 같은 규칙입니다.
 *
 * ── app.js 에서 떼어낸 여섯 번째 조각입니다(b333) ───────────────────
 * 앞의 다섯과 다른 점이 하나 있습니다. 이 화면은 **끝에서 다른 화면으로
 * 이어집니다** — AI 대화 · 새 여행 · 초안. 그래서 ctx 로 받는 것이 함수
 * 다섯입니다. 화면 하나가 통째로 떨어지는 것이 아니라 **여러 곳으로 나가는
 * 길목**이라 그렇습니다. ctx 가 길면 그건 이 화면이 원래 그런 자리라는 뜻이고,
 * 억지로 줄이려고 저쪽 코드를 여기로 끌고 오면 다시 커집니다.
 *
 * 층: dom.js · db.js · calc.js · card.js · trip.js · net.js 만 씁니다. */
import { $, esc, toast, copyText, md } from './dom.js?v=b356';
import { sb } from './db.js?v=b356';
import { fail, netTimeout } from './net.js?v=b356';
import { money, distKm, D1, asDate } from './calc.js?v=b356';
import { REPORT_ICON, REPORT_BG, askImageSize, PERSONA_ICON } from './card.js?v=b356';

/* app.js 만 아는 것들. 로그인한 사람과, 이 화면 끝에서 이어지는 화면 넷.
   `me` 는 로그인할 때마다 바뀌므로 값이 아니라 **함수**로 받습니다. */
let ctx = {
  me: () => null, openAi: () => {}, openDraft: () => {}, openNew: () => {},
  closeReview: () => {}, loadChats: async () => {},
};
export function setReportCtx(o){ ctx = { ...ctx, ...o }; }

let rpt = null;                       /* 공유와 이미지 저장에서 다시 씁니다 */

/* ── 여행 리포트의 한 줄평 ───────────────────────────────────────────
 * 성향 카드와 같은 방식입니다. **계산으로만 정하고 AI 를 안 씁니다** —
 * 같은 여행을 다시 열면 같은 문구가 나와야 합니다.
 * 위에서부터 검사해 처음 걸리는 것을 씁니다.
 *
 * 같은 사람이라도 여행마다 다르게 나옵니다. 도쿄에서는 먹기만 하고
 * 파리에서는 걷기만 할 수 있습니다. 그게 오히려 재밌습니다.
 *
 * 자료가 모자라면 그 문구는 아예 건너뜁니다. 억지로 판정하면 틀린 말이 됩니다.
 *   - 예산을 안 적었으면 예산 문구를 건너뜁니다
 *   - 평가를 절반도 안 했으면 별점 문구를 건너뜁니다
 *   - 2박 이하면 속도 문구를 건너뜁니다 (하루 이틀은 값이 심하게 흔들립니다)
 */
const REPORT_RULES = [
  /* 특이한 결과 — 희소해서 재밌습니다 */
  { id:'adhoc', g:'rare', ic:'bolt', t:'즉흥이 더 좋았던 여행',
    f:r => r.rated && r.adhocN >= 3 && r.adhocRating != null && r.plannedRating != null
        && r.adhocRating - r.plannedRating >= 0.8 },
  { id:'oneArea', g:'rare', ic:'pinheart', t:'한 동네에 눌러앉은 여행',
    f:r => r.days >= 3 && r.areaCount > 0 && r.areaCount <= 2 },
  { id:'asPlanned', g:'rare', ic:'stamp', t:'계획대로 다 해낸 여행',
    f:r => r.rated && r.plannedN >= 10 && r.planRate >= 0.95 },

  /* 지출 성향 */
  { id:'food',   g:'spend', ic:'fork', t:'먹으러 간 여행',      f:r => r.spend > 0 && r.foodRatio >= 0.55 },
  { id:'shop',   g:'spend', ic:'bag2', t:'쇼핑하러 간 여행',    f:r => r.spend > 0 && r.shopRatio >= 0.35 },
  { id:'over',   g:'spend', ic:'wallet', t:'지갑이 열린 여행',    f:r => r.budgetRatio != null && r.budgetRatio >= 1.3 },
  { id:'under',  g:'spend', ic:'coin', t:'알뜰하게 다녀온 여행', f:r => r.budgetRatio != null && r.budgetRatio <= 0.8 },

  /* 속도 */
  { id:'nonstop',g:'speed', ic:'run', t:'하루도 안 쉰 여행', f:r => r.speedOk && r.perDay >= 7 },
  { id:'walked', g:'speed', ic:'shoe', t:'많이 걸은 여행',    f:r => r.speedOk && r.kmPerDay >= 12 },
  { id:'rest',   g:'speed', ic:'cup', t:'쉬러 간 여행',      f:r => r.speedOk && r.perDay <= 4 && r.cafeCount >= 3 },
  { id:'slow',   g:'speed', ic:'moon', t:'느긋했던 여행',     f:r => r.speedOk && r.perDay <= 4 },

  /* 취향이 드러난 결과 */
  { id:'eatWin', g:'taste', ic:'fork', t:'미식이 전부였던 여행',
    f:r => r.rated && r.eatAvg != null && r.seeAvg != null && r.eatAvg - r.seeAvg >= 1.5 },
  { id:'seeWin', g:'taste', ic:'camera', t:'눈이 즐거웠던 여행',
    f:r => r.rated && r.eatAvg != null && r.seeAvg != null && r.seeAvg - r.eatAvg >= 1.5 },
  { id:'cafe',   g:'taste', ic:'cup', t:'카페 투어', f:r => r.cafeCount >= r.days && r.cafeCount >= 3 },

  /* 어디에도 안 걸렸을 때 */
  { id:'even',   g:'even', ic:'bag', t:'골고루 다녀온 여행', f:() => true },
];

export async function drawReport(id){
  $('rv_rate').classList.add('hide');
  $('rv_report').classList.remove('hide');
  $('rv_report').innerHTML = '<div class="card"><div class="empty"><span class="load">만드는 중…</span></div></div>';
  window.scrollTo({ top:0 });

  const [t, lg, pl, ex, cr, pr] = await Promise.all([
    /* budget 은 034 에서 붙였습니다. 아직 안 올렸으면 아래에서 한 번 더 물어봅니다. */
    sb.from('trips').select('title,destination,start_date,end_date,home_currency,budget')
      .eq('id', id).maybeSingle(),
    sb.from('trip_legs').select('city_id').eq('trip_id', id).order('start_date'),
    /* created_at 으로 "출발 전에 넣은 것"과 "가서 넣은 것"을 가릅니다.
       즉흥이 더 좋았는지 보려면 이 구분이 있어야 합니다. */
    sb.from('plans').select('id,title,category,lat,lng,date,start_time,created_at')
      .eq('trip_id', id).is('deleted_at', null).order('date').order('start_time'),
    sb.from('expenses').select('title,amount,amount_home,currency,category')
      .eq('trip_id', id).is('deleted_at', null),
    sb.from('city_ratings').select('city_id,stars').eq('user_id', ctx.me().id),
    sb.from('plan_ratings').select('plan_id,stars').eq('user_id', ctx.me().id),
  ]);
  /* 034 를 아직 안 올렸으면 budget 이 없다고 질의가 통째로 실패합니다.
     리포트가 통째로 안 뜨는 것보다는 예산 문구만 빠지는 편이 낫습니다. */
  if (t.error) Object.assign(t, await sb.from('trips')
    .select('title,destination,start_date,end_date,home_currency')
    .eq('id', id).maybeSingle());
  const T = t.data || {};
  const days   = Math.round((asDate(T.end_date) - asDate(T.start_date)) / D1) + 1;
  const plans_ = pl.data || [];
  const exps   = ex.data || [];
  const psr = Object.fromEntries((pr.data || []).map(r => [r.plan_id, Number(r.stars)]));

  /* 움직인 거리. 좌표가 있는 일정 사이만 더합니다 —
     모르는 구간을 지어내느니 빼는 편이 낫습니다. */
  let km = 0; const byDay = {};
  plans_.forEach(p => (byDay[p.date] = byDay[p.date] || []).push(p));
  Object.values(byDay).forEach(list => {
    for (let i = 0; i < list.length - 1; i++){
      const d = distKm(list[i].lat, list[i].lng, list[i+1].lat, list[i+1].lng);
      if (d != null) km += d;
    }
  });

  const PLACE = ['식사','카페','관광','쇼핑','기타'];
  const spots = plans_.filter(p => PLACE.includes(p.category));
  const eats  = spots.filter(p => ['식사','카페'].includes(p.category));
  const sees  = spots.filter(p => ['관광','쇼핑'].includes(p.category));
  const avg = a => a.length ? a.reduce((s,v) => s+v, 0) / a.length : null;
  const st  = list => avg(list.map(p => psr[p.id]).filter(v => v != null));
  const eatAvg = st(eats), seeAvg = st(sees);

  const money = e => Number(e.amount_home) || 0;
  const spend = exps.reduce((s,e) => s + money(e), 0);
  const foodPct = spend ? Math.round(
    exps.filter(e => ['식사','카페'].includes(e.category)).reduce((s,e)=>s+money(e),0)
    / spend * 100) : 0;
  const shopPct = spend ? Math.round(
    exps.filter(e => e.category === '쇼핑').reduce((s,e)=>s+money(e),0) / spend * 100) : 0;
  const won = n => Math.round(n).toLocaleString();
  const cur = T.home_currency || '';

  /* ── 한 줄 정의에 쓰는 값들 ──
     AI 를 안 부릅니다. 공짜이고 즉시 나오고, 같은 여행이면 언제나 같습니다. */

  /* 동네 수. "동네"라는 자료가 따로 없어서 좌표를 0.02°(약 2km) 칸으로 묶습니다.
     좌표가 없는 일정은 못 셉니다 — 그래서 좌표가 아예 없으면 이 문구를 건너뜁니다. */
  const areas = new Set(spots.filter(p => p.lat != null && p.lng != null)
    .map(p => `${Math.round(p.lat / 0.02)},${Math.round(p.lng / 0.02)}`));

  /* 출발 전에 넣은 것 = 계획, 가서 넣은 것 = 즉흥.
     created_at 은 시각까지 있으므로 출발일 0시를 경계로 봅니다. */
  const startTs = asDate(T.start_date).getTime();
  const planned = spots.filter(p => new Date(p.created_at).getTime() <  startTs);
  const adhoc   = spots.filter(p => new Date(p.created_at).getTime() >= startTs);

  const cafeCount = spots.filter(p => p.category === '카페').length;
  const ratedN = spots.filter(p => psr[p.id] != null).length;

  const R = {
    days,
    perDay: spots.length / days,
    kmPerDay: km / days,
    areaCount: areas.size,
    cafeCount,
    spend,
    foodRatio: spend ? exps.filter(e => ['식사','카페'].includes(e.category))
                           .reduce((s,e)=>s+money(e),0) / spend : 0,
    shopRatio: spend ? exps.filter(e => e.category === '쇼핑')
                           .reduce((s,e)=>s+money(e),0) / spend : 0,
    /* 예산을 안 적었으면 null 입니다. null 이면 그 문구를 건너뜁니다 — 0 으로 두면
       "알뜰하게 다녀온 여행"이 늘 걸립니다. */
    budgetRatio: (T.budget && spend) ? spend / Number(T.budget) : null,
    plannedN: planned.length,
    adhocN: adhoc.length,
    plannedRating: st(planned),
    adhocRating: st(adhoc),
    /* 계획한 곳 중 별점을 남긴 비율. "갔다"를 따로 안 적으므로 별점이 그 표시입니다. */
    planRate: planned.length
      ? planned.filter(p => psr[p.id] != null).length / planned.length : 0,
    eatAvg, seeAvg,
    /* 절반도 평가 안 했으면 별점 기반 문구는 근거가 약합니다. */
    rated: spots.length ? ratedN / spots.length >= 0.5 : false,
    /* 1박 2일은 하루 일정 수가 심하게 흔들립니다. 3일부터만 속도를 말합니다. */
    speedOk: days >= 3,
  };
  const rule = REPORT_RULES.find(r => r.f(R));
  const label = rule.t;

  const defLine = [
    foodPct ? `식비 ${foodPct}%` : null,
    eatAvg != null ? `식당 평균 ★${eatAvg.toFixed(1)}` : null,
    seeAvg != null ? `관광지 평균 ★${seeAvg.toFixed(1)}` : null,
  ].filter(Boolean).join(' · ');

  const five = spots.filter(p => psr[p.id] === 5).map(p => p.title);
  const top  = spots.filter(p => psr[p.id] != null)
                    .sort((a,b) => psr[b.id] - psr[a.id])[0];
  const pricey = exps.slice().sort((a,b) => money(b) - money(a))[0];

  /* 하루별 흐름. 점 개수가 일정 수, 옆이 그날 평균 별점입니다. */
  const dayRows = Object.keys(byDay).sort().map((d, i) => {
    const list = byDay[d].filter(p => PLACE.includes(p.category));
    const s = st(list);
    return { i:i+1, n:list.length, s };
  });
  const busiest = dayRows.reduce((a,b) =>
    (!a || b.n > a.n || (b.n === a.n && (b.s ?? 9) < (a.s ?? 9))) ? b : a, null);
  const hard = busiest && busiest.n >= 6 && (busiest.s == null || busiest.s <= 3.6)
             ? busiest.i : null;

  rpt = { title:T.title, dest:T.destination, from:T.start_date, to:T.end_date,
          days, spend, cur, spots:spots.length, km:Math.round(km), label, defLine };

  const stat = (big, sub) =>
    `<div class="rs"><div class="b">${esc(big)}</div><div class="s">${esc(sub)}</div></div>`;

  /* ── 공유용 카드 ──
     리포트에는 하루별 흐름과 AI 문단이 있는데 그건 **내가 볼 것**이지
     남에게 보여줄 것이 아닙니다. 개인적이고 길기도 합니다.
     그래서 공유용은 따로 만듭니다 — 한 줄평 · 숫자 셋 · ★5 준 곳만.
     성향 카드와 같은 부품(.pcard)을 씁니다. 둘이 한 벌로 보여야 합니다. */
  const shareCard = `
    <div class="pcard tcard" style="background:${REPORT_BG[rule.g]}">
      <div class="tdest">${esc(T.destination || T.title || '여행')}
        <span>· ${days - 1}박 ${days}일</span></div>

      <svg class="pic" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">${
             REPORT_ICON[rule.ic] || PERSONA_ICON[rule.ic] || ''}</svg>

      <div class="ptitle">${esc(label)}</div>

      <div class="pnums">${spend ? won(spend) + (cur ? cur : '') : '–'}
        <i>·</i> ${spots.length}곳${km ? ` <i>·</i> 약 ${Math.round(km)}km` : ''}</div>
      ${foodPct ? `<div class="pconts" style="margin-top:8px">식비 ${foodPct}%</div>` : ''}

      ${five.length ? `<div class="pbest">
        <div class="pl">★5를 준 곳</div>
        ${five.slice(0, 3).map(n => `<div class="pb">${esc(n)}</div>`).join('')}
      </div>` : ''}

      <div class="pbrand">기로</div>
    </div>`;

  $('rv_report').innerHTML = shareCard +
    `<div class="card rpt1" id="rptcard">
       <div class="hd">
         <div class="ti">${esc(T.destination || T.title || '여행')}</div>
         <div class="dt">${esc(T.from || T.start_date)} – ${esc(T.end_date)}
           · ${days - 1}박 ${days}일</div>
       </div>

       <div class="rstats">
         ${stat(spend ? won(spend) + (cur ? ' ' + cur : '') : '–', '쓴 돈')}
         ${stat(spots.length + '곳', '다녀온 곳')}
         ${stat(km ? Math.round(km) + 'km' : '–', '움직인 거리')}
       </div>

       <div class="rdef">
         <div class="q">"${esc(label)}"</div>
         ${defLine ? `<div class="d">${esc(defLine)}</div>` : ''}
       </div>

       ${five.length ? `<div class="rsec"><div class="h">★5를 준 곳</div>
         <div class="v">${esc(five.slice(0,6).join(' · '))}</div></div>` : ''}

       <div class="rtwo">
         <div class="rsec"><div class="h">가장 비쌌던 곳</div>
           <div class="v">${pricey ? esc(pricey.title) : '–'}</div>
           <div class="m">${pricey ? esc(won(money(pricey)) + ' ' + cur) : ''}</div></div>
         <div class="rsec"><div class="h">가장 만족한 곳</div>
           <div class="v">${top ? esc(top.title) : '–'}</div>
           <div class="m">${top ? '★' + psr[top.id] : ''}</div></div>
       </div>

       <div class="rsec"><div class="h">하루별 흐름</div>
         ${dayRows.map(r => `<div class="rday">
           <span class="dd">Day ${r.i}</span>
           <span class="dots">${'●'.repeat(Math.min(r.n, 12))}</span>
           <span class="dn">${r.n}곳</span>
           <span class="ds">${r.s != null ? '★' + r.s.toFixed(1) : ''}</span>
           ${hard === r.i ? '<span class="dw">무리했던 날</span>' : ''}
         </div>`).join('')}
       </div>

       <div id="rv_ai" class="rsec hide"></div>
       <button class="ghost" id="rv_askai" style="width:100%; margin-top:12px">
         AI 한마디 듣기</button>

       <div style="display:flex; gap:8px; margin-top:8px">
         <button class="ghost" id="rv_img" style="flex:1">이미지로 저장</button>
         <button class="ghost" id="rv_share" style="flex:1">공유</button>
       </div>
       <button class="ghost" id="rv_home" style="width:100%; margin-top:6px">홈으로</button>
     </div>`;

  $('rv_home').onclick  = () => ctx.closeReview();
  $('rv_share').onclick = () => shareReport();
  /* 이미지는 위 공유 카드와 같은 내용으로 뽑습니다 —
     하루별 흐름과 AI 문단은 빠집니다. 그건 내가 볼 것이지 남에게 보일 것이 아닙니다. */
  $('rv_img').onclick   = () => askImageSize({
    g: rule.g, icon: REPORT_ICON[rule.ic] || PERSONA_ICON[rule.ic] || '',
    title: label,
    sub: `${T.destination || T.title || '여행'} · ${days - 1}박 ${days}일`,
    nums: [spend ? won(spend) + cur : null, `${spots.length}곳`,
           km ? `약 ${Math.round(km)}km` : null].filter(Boolean).join(' · '),
    note: foodPct ? `식비 ${foodPct}%` : '',
    listTitle: five.length ? '★5를 준 곳' : '',
    list: five.slice(0, 3),
  }, 'aitrip-리포트');
  $('rv_askai').onclick = () => askReportAi(id, { label, defLine, dayRows, hard,
                                                  spend, cur, days, top, pricey, psr });
}

function reportText(){
  if (!rpt) return '';
  return [
    `${rpt.dest || rpt.title} ${rpt.from} – ${rpt.to} · ${rpt.days}일`,
    `"${rpt.label}"`,
    [rpt.spend ? `쓴 돈 ${Math.round(rpt.spend).toLocaleString()}${rpt.cur}` : null,
     `다녀온 곳 ${rpt.spots}곳`,
     rpt.km ? `움직인 거리 ${rpt.km}km` : null].filter(Boolean).join(' · '),
    rpt.defLine,
  ].filter(Boolean).join('\n');
}

async function shareReport(){
  const url = location.origin + location.pathname;
  const text = reportText();
  if (navigator.share){
    try { await navigator.share({ title:'여행 리포트', text, url }); return; }
    catch (e){ if (e?.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); toast('복사했어요'); }
  catch { toast(text); }
}

/* AI 한마디. 계산해 둔 사실만 넘기고 문장만 받습니다 —
   AI 가 숫자를 다시 세면 틀립니다. 부를 때만 부르므로 횟수도 아낍니다. */
async function askReportAi(id, f){
  const b = $('rv_askai');
  b.disabled = true; b.innerHTML = '<span class="load">듣는 중…</span>';
  const facts = [
    `여행 ${f.days}일, 다녀온 곳 ${rpt.spots}곳, 움직인 거리 ${rpt.km}km`,
    f.spend ? `쓴 돈 ${Math.round(f.spend).toLocaleString()}${f.cur}, 하루 평균 ${
      Math.round(f.spend / f.days).toLocaleString()}${f.cur}` : null,
    f.defLine, `한 줄 정의는 "${f.label}"`,
    f.hard ? `Day ${f.hard}이 가장 빡빡했고 그날 평가가 낮았다` : null,
    f.top ? `가장 만족한 곳은 ${f.top.title} ★${f.psr[f.top.id]}` : null,
    f.pricey ? `가장 비쌌던 곳은 ${f.pricey.title}` : null,
  ].filter(Boolean).join('\n');

  const { data, error } = await sb.functions.invoke('chat', { body: { trip_id: id,
    message: '아래는 이번 여행을 계산한 결과다. 숫자를 새로 세지 말고 이 사실만 써서 ' +
             '3~4문장으로 소감과 다음 여행 조언을 해요체로 써줘. ' +
             '마지막 문장은 다음 여행에 쓸 수 있는 구체적인 제안으로 끝낼 것. ' +
             'places 와 actions 는 빈 배열로 둘 것.\n\n' + facts } });
  b.disabled = false; b.textContent = 'AI 한마디 다시 듣기';
  if (error || data?.error){
    let why = data?.error || error.message;
    try { why = (await error?.context?.json())?.error || why; } catch {}
    return toast(why);
  }
  $('rv_ai').classList.remove('hide');
  $('rv_ai').innerHTML = `<div class="h">AI 한마디</div>
    <div class="v" style="font-weight:400; line-height:1.7">${md(data.reply || '')}</div>`;
}

/* AI 일정 만들기 — 이 앱이 내세우는 기능이라 홈 위쪽에 둡니다. */
export function renderAiCard(nextTrip, nextPlans){
  /* ── 무엇을 권할지는 그 사람의 여행이 정합니다 ──
     "AI와 함께 떠나볼까요?" 하나만 늘 띄우면, 다음 주에 도쿄 가는 사람에게도
     일정이 텅 빈 사람에게도 같은 말을 합니다. 지금 제일 급한 것을 말합니다.
       · 곧 가는데 일정이 비었다 → 그 여행을 짜자 (제일 급합니다)
       · 곧 가는데 일정이 있다   → 다듬거나 물어보자
       · 여행이 없다             → 새로 만들자 */
  const ai = !nextTrip
    ? { title:'AI와 함께 떠나볼까요?', sub:'뭘 좋아하는지만 알려주세요',
        go:'시작', go2:() => ctx.openNew() }
    : nextPlans === 0
    ? { title:`${nextTrip.title} 일정이 비어 있어요`,
        sub:'AI가 하루씩 짜드릴게요', go:'짜기',
        go2:() => ctx.openDraft(nextTrip.id, true) }
    /* **여기는 초안 화면이 아니라 비서로 보냅니다.** 처음에 초안으로 보냈더니
       "빈 시간에 넣을 곳을 찾아드려요"라고 해놓고 일정을 통째로 다시 짜는
       화면이 떴습니다. 이미 31개가 들어 있는 여행에서요. 말과 행동이 달랐습니다.
       뭘 더 넣을지 물어보는 자리는 비서입니다. */
    : { title:`${nextTrip.title}, 뭐 더 넣을까요?`,
        sub:'빈 시간에 넣을 곳을 찾아드려요', go:'물어보기',
        go2:async () => { ctx.openAi(); $('ai_trip').value = nextTrip.id;
                          await ctx.loadChats(nextTrip.id); } };

  const box = document.createElement('div');
  box.className = 'aicard';
  box.id = 'homeaicard';
  box.innerHTML =
    `<span class="ic">
       <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
         <path d="M11 2l1.8 5.2L18 9l-5.2 1.8L11 16l-1.8-5.2L4 9l5.2-1.8L11 2z"/>
         <path d="M18.5 13.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z"
               opacity=".75"/>
       </svg>
     </span>
     <span class="tx">
       <b>${esc(ai.title)}</b>
       <span>${esc(ai.sub)}</span>
     </span>
     <span class="go">${esc(ai.go)}</span>`;
  /* 예전에는 초안 화면(openDraft)을 바로 열었습니다. 그런데 거기에도
     '새 여행'이 따로 있어서, 여행을 만드는 길이 두 개가 됐습니다 —
     한쪽은 단계 화면, 한쪽은 옛날 폼이라 모양도 달랐습니다.
     여기서는 단계 화면을 엽니다. 마지막에 'AI가 짜줄게요'를 고르면
     그 초안 화면으로 이어집니다. 길은 하나로 모입니다. */
  box.onclick = ai.go2;
  $('home').appendChild(box);
}
