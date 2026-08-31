/* ── 일정 검토 — AI 없이 계산으로 ─────────────────────────────────────
 * "이 일정 너무 빡빡한가?" 를 **계산만으로** 답합니다. AI 를 안 부르므로
 * 공짜이고 비행기모드에서도 됩니다. 생성만 하고 검토는 안 하는 다른 앱들과
 * 갈리는 자리입니다.
 *
 * 보는 것: 겹치는 시간, 머무는 시간이 모자란 곳, 이동이 안 되는 간격.
 * 머무는 시간의 기본값(`STAY_MIN`)은 분류마다 다릅니다 — 식사 60분,
 * 카페 40분, 이동·숙소는 0.
 *
 * ── app.js 에서 떼어낸 스물세 번째 조각입니다(b347) ──────────────────
 * app.js 만 아는 것은 둘 — 대화 다시 받기, 검토 결과 화면 열기.
 *
 * ⚠ **머리말과 내용이 또 어긋납니다.** 이 범위에 `loadAi`(AI 남은 횟수를
 * 세는 것)가 같이 들어 있었습니다. 검토와 상관없지만 **떼어내면 app.js 에
 * 홀로 남는 20줄**이라 같이 데려와 내보냅니다. 남길 자리가 없어서지
 * 여기 있는 것이 옳아서가 아닙니다.
 *
 * 층: dom.js · db.js · net.js · calc.js · trip.js 와 이미 떼어낸
 *     ai.js · cards.js 를 씁니다. */
import { $, esc, josa } from './dom.js?v=b571';
import { sb } from './db.js?v=b571';
import { fail } from './net.js?v=b571';
import { D1, asDate, ymd, hm, dayLabel, hop } from './calc.js?v=b571';
import { trip } from './trip.js?v=b571';
import { aiTripId } from './ai.js?v=b571';
import { runReview } from './cards.js?v=b571';

let ctx = { loadChats: async () => {} };

/* AI 화면을 열 때 검토 카드를 펴 둘까. 홈에서 '자세히'로 들어온 경우만
   펴려던 깃발입니다.
   ⚠ **켜는 곳이 저장소 어디에도 없습니다.** 그래서 검토 카드는 늘 접힌
   채로 열립니다. app.js 를 쪼개기 전(b334)부터 그랬습니다 — 이번에
   생긴 것이 아니라 원래 그랬습니다. **동작을 바꾸지 않으려고 그대로
   옮겨만 뒀습니다.** 펴는 것이 맞다면 홈의 '자세히'가 이 값을 켜고
   와야 합니다(setOpenReview). 지금은 부르는 곳이 없어 안 내보냅니다. */
let openReview = false;
export function setPlanCheckCtx(o){ ctx = { ...ctx, ...o }; }

/* ── 일정 검토 ──────────────────────────────────────────────────────
 * 계산만 합니다. AI 를 안 부르므로 공짜이고 비행기모드에서도 됩니다.
 * 문서가 "계산 검사가 공짜라 가능한 구조"라고 한 그것이고,
 * 남들이 생성만 하고 안 하는 부분입니다.
 *
 * 지금은 이동 시간을 못 잽니다 — 일정에 좌표가 안 붙어 있습니다.
 * 좌표가 붙으면 trips 의 이동 상수로 "이 하루가 물리적으로 가능한가"까지 봅니다. */
export const STAY_MIN = { 식사:60, 카페:40, 관광:60, 쇼핑:60, 이동:0, 숙소:0, 기타:30 };
export const mins  = t => { const [h,m] = String(t).split(':'); return +h*60 + +m; };
const fmtM  = v => String(Math.floor(v/60)).padStart(2,'0') + ':' +
                   String(v%60).padStart(2,'0');

/* distKm/travel/hop 은 calc.js 로 옮겼습니다 (맨 위 import). 순수 계산이라
   이름·시그니처 그대로 옮길 수 있었습니다 — 여기서 부르는 자리는 안 바뀝니다. */

export function review(t, ps, lgs){
  const out = [];
  const byDay = {};
  ps.forEach(p => (byDay[p.date] ||= []).push(p));

  /* 여행 기간인데 아무것도 없는 날 */
  for (let d = asDate(t.start_date); ymd(d) <= t.end_date; d = new Date(d.getTime() + D1)){
    const k = ymd(d);
    if (!byDay[k]) out.push({ lv:'참고',
      t:`${dayLabel(k, t).split(' · ')[0]}이 비어 있어요`,
      s:'아직 아무것도 안 잡혔어요.' });
  }

  for (const [d, list] of Object.entries(byDay)){
    const lab = dayLabel(d, t).split(' · ')[0];

    /* 문서: 하루 4~5개만. 8~10개를 욱여넣는 것이 "그럴듯한데 못 쓴다"의 원인이다. */
    if (list.length >= 6) out.push({ lv:'주의',
      t:`${lab}에 ${list.length}개가 잡혀 있어요`,
      s:'하루 4~5개를 넘기면 대개 못 지켜요. 빈 시간을 남기는 편이 나아요.' });

    const timed = list.filter(p => p.start_time)
                      .sort((a,b) => a.start_time.localeCompare(b.start_time));

    for (let i = 0; i < timed.length; i++){
      const p = timed[i];
      const st = mins(p.start_time), en = p.end_time ? mins(p.end_time) : null;

      if (en !== null && en < st) out.push({ lv:'심각',
        t:`${p.title} — 끝나는 시각이 시작보다 빨라요`,
        s:`${hm(p.start_time)} → ${hm(p.end_time)}` });

      /* 도쿄 앱이 실제로 잡아낸 사고입니다 — 체크인 15시인데 11시 35분에 잡혀 있었습니다. */
      if (p.category === '숙소' && /체크인|check\s*-?in/i.test(p.title) && st < 15*60)
        out.push({ lv:'주의',
          t:`${lab} 체크인이 ${hm(p.start_time)}로 잡혀 있어요`,
          s:'체크인은 대개 15시부터예요. 짐만 맡기는 것이면 괜찮아요.' });

      const nx = timed[i+1];
      if (nx){
        const nst = mins(nx.start_time);
        /* 끝 시각이 없으면 분류별 최소 체류 시간으로 어림합니다. */
        const guessed = en === null;
        const end = en ?? st + (STAY_MIN[p.category] ?? 30);
        if (nst < end) out.push({ lv:'심각',
          /* 받침에 따라 조사가 갈립니다 — dom.js 의 josa() 를 씁니다 (b388).
             전에는 "쇼핑 과 오렌지 스트리트 이" 처럼 늘 받침 있는 쪽으로
             붙었습니다. "심각"까지 붙는 화면이라 문장이 어설프면 판단도
             못 미더워 보입니다. */
          t:`${josa(p.title, '과', '와')} ${josa(nx.title, '이', '가')} 겹칩니다`,
          s:`${hm(p.start_time)}~${guessed ? '(어림 ' + fmtM(end) + ')' : hm(p.end_time)}` +
            ` 인데 다음이 ${hm(nx.start_time)}에 시작합니다.` });
        else {
          /* 여기가 남들이 안 하는 자리입니다 — 두 곳 사이를 실제로 가 볼 수 있는가.
             좌표가 둘 다 있어야 잽니다. */
          const h = hop(p, nx, lgs);
          const gap = nst - end;
          if (h && gap < h.min) out.push({
            lv: gap < h.min - 15 ? '심각' : '주의',
            t: `${p.title} → ${nx.title} 이동 시간이 모자랍니다`,
            /* 음수면 "-20분밖에 없어요"가 됩니다. 앞 일정이 이미 넘겼다는 뜻입니다. */
            s: `${h.km.toFixed(1)}km · ${h.walk ? '도보' : '이동'} 약 ${h.min}분인데 ` +
               (gap < 0 ? '앞 일정이 이미 넘겼어요.' : `${gap}분밖에 없어요.`) +
               (guessed ? ' (앞 일정 끝 시각이 없어 어림잡았어요)' : '') });
          else if (!h && gap === 0) out.push({ lv:'주의',
            t:`${p.title} 다음에 이동할 시간이 없어요`,
            s:`끝나자마자 ${nx.title} 이 시작합니다.` });
        }
      }
    }

    const noTime = list.length - timed.length;
    if (list.length >= 3 && noTime > list.length / 2) out.push({ lv:'참고',
      t:`${lab}은 시각이 대부분 비어 있어요`,
      s:'시각을 넣어야 겹침과 이동을 검사할 수 있어요.' });
  }

  const rank = { 심각:0, 주의:1, 참고:2 };
  return out.sort((a,b) => rank[a.lv] - rank[b.lv]);
}


export async function loadAi(){
  const { data, error } = await sb.from('trips')
    .select('id,title').order('start_date');
  if (error) return fail(error, 'trip');

  /* 여행을 안 고르고도 물어볼 수 있어야 합니다. 어디로 갈지 정하기 전에
     묻는 것이 오히려 더 많습니다. 그때는 여행 자료 없이 그냥 답합니다. */
  /* 첫 줄이 곧 이 고르개의 이름표입니다 — 아무것도 안 골랐을 때 '여행 선택'
     이라고 보입니다. 전에는 '여행 없이 물어보기'였는데, 머리말 한 줄에
     같이 앉히기엔 너무 길어 옆 단추를 밀어냈습니다. 여행을 고르면 그
     이름이 그대로 보이므로 무슨 이야기 중인지도 여기서 알 수 있습니다. */
  $('ai_trip').innerHTML =
    `<option value="">여행 선택</option>` +
    (data || []).map(t => `<option value="${esc(t.id)}">${esc(t.title)}</option>`).join('');
  $('ai_trip').value = (aiTripId && data.some(t => t.id === aiTripId)) ? aiTripId : '';
  /* 들어올 때는 채팅부터 보입니다. 홈에서 "자세히"로 온 경우만 펼칩니다. */
  $('reviewcard').classList.toggle('hide', !openReview);
  openReview = false;
  await runReview($('ai_trip').value);
  await ctx.loadChats($('ai_trip').value);
}
$('ai_trip').addEventListener('change', () => {
  runReview($('ai_trip').value);
  ctx.loadChats($('ai_trip').value);
});

