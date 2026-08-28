/* ── 도시 한 곳 화면 ─────────────────────────────────────────────────
 * 목록 어디서든 도시를 누르면 열리는 화면입니다. 사진·설명·별점·한줄평·
 * 지도로 가는 길이 여기 있습니다.
 *
 * ── app.js 에서 떼어낸 네 번째 조각입니다(b324) ─────────────────────
 * 이 조각을 고른 이유가 앞의 셋과 다릅니다. 작아서가 아니라,
 * **`openCity` 가 여러 곳에서 불리기 때문**입니다 — map.js 와 shelf.js 가
 * ctx 로 받아 쓰고 있었습니다. 모듈이 되면 셋 다 그냥 import 하면 되고
 * ctx 에서 한 줄씩 빠집니다. 떼어낼수록 얽힘이 줄어드는 자리입니다.
 *
 * app.js 만 아는 것은 셋입니다 — 로그인한 사람, 별점 저장, 기록 목록 다시
 * 그리기. 별점 저장은 평가 화면(app.js)에 있고, 그건 네 화면이 같이 쓰는
 * 자료를 건드리므로 여기로 가져오면 안 됩니다.
 *
 * 층: dom.js · db.js · cities.js · rate.js · stars.js · net.js 만 씁니다. */
import { $, esc, avatarImg, emptyDo } from './dom.js?v=b489';
import { sb } from './db.js?v=b489';
import { cities, countryName, continentOf } from './cities.js?v=b489';
import { myRates, cityStat, visited } from './rate.js?v=b489';
import { starHtml } from './stars.js?v=b489';
import { localTime, dateRange, hm } from './calc.js?v=b489';
import { fail } from './net.js?v=b489';

/* 지금 열려 있는 도시. **app.js 에 있던 것을 여기로 옮겼습니다(b329)** —
   여닫는 것은 이 파일이 하는데 변수만 저쪽에 있어서, 떼어낸 뒤
   'cityOpen is not defined' 로 도시 화면이 빈 채로 열렸습니다.
   app.js 는 읽고 비우는 길만 씁니다(아래 둘). */
let cityOpen = null;
export const isCityOpen = () => cityOpen != null;
export function clearCityOpen(){ cityOpen = null; }

let ctx = { me: () => null, saveRate: async () => {}, drawRatings: () => {},
            openTrip: async () => {}, loadHome: async () => {}, appTab: () => '' };
export function setCityCtx(o){ ctx = { ...ctx, ...o }; }

/* ── 도시 상세 ──────────────────────────────────────────────────────
 * 왓챠는 포스터를 누르면 작품 페이지가 열립니다. 여행앱에서는 그보다 쓸모가
 * 있는데, **내가 그 도시에서 뭘 했는지**를 같이 보여줄 수 있기 때문입니다.
 * 일정에 이미 다 적혀 있으니 새로 입력받을 것이 없습니다. */
export async function openCity(id){
  const c = (cities || []).find(x => x.id === id);
  if (!c) return;
  cityOpen = c;
  if (history.state?.t2 !== 'city') history.pushState({ t2:'city' }, '');

  /* 홈에서도 지도에서도 도시를 열 수 있습니다 — 열린 탭이 뭐든 다 덮어야 합니다.
     setview 안쪽(프로필/지도/설정) 상태는 건드리지 않아서 닫으면 그대로 돌아옵니다. */
  /* 탭 화면 다섯은 덱 한 덩어리입니다(b474) — 낱개로 숨기면 덱 안에서
     가로 위치가 밀립니다. */
  $('tabdeck').classList.add('hide');
  $('cityview').classList.remove('hide');
  window.scrollTo({ top:0 });

  const r = myRates[id] || {}, s = cityStat[id];
  $('cv_hero').style.backgroundImage = c.image_url ? `url("${c.image_url}")` : '';
  $('cv_hero').classList.toggle('ph', !c.image_url);
  $('cv_hero').textContent = c.image_url ? '' : c.name.slice(0, 1);
  $('cv_name').textContent = c.name;
  $('cv_sub').textContent = [countryName[c.country] || c.country, c.name_local,
                             visited.has(id) ? '다녀옴' : null].filter(Boolean).join(' · ');
  $('cv_avg').textContent  = s?.n_rated ? Number(s.avg_stars).toFixed(1) : '–';
  $('cv_avgn').textContent = s?.n_rated ? `${s.n_rated}명이 매김` : '아직 아무도 안 매김';
  $('cv_stars').innerHTML  = starHtml(r.stars);
  $('cv_want').classList.toggle('on', !!r.want);
  $('cv_note').value = r.comment || '';
  cvNoteDirty();

  /* 위키백과 요약. 없는 도시는 아래 사실만 보여줍니다. */
  $('cv_about').classList.toggle('hide', !c.summary);
  if (c.summary){
    $('cv_summary').textContent = c.summary;
    $('cv_src').href = c.summary_url || '#';
  }
  /* API 없이 이미 아는 것들 — 나라·대륙·통화·시간대.
     '다니기'(대중교통 등급)는 걷어냈습니다. 등급을 알아도 할 수 있는 일이
     없고, 정작 필요한 것은 이동 시간인데 그건 일정 화면이 따로 말해줍니다.
     transit_grade 자체는 그 계산에 계속 쓰이므로 DB 에는 그대로 둡니다. */
  $('cv_facts').innerHTML = [
    ['대륙', continentOf[c.country]],
    ['통화', c.currency],
    ['현지 시각', (localTime(c.timezone) || '').replace('현지 ', '')],
  ].filter(([, v]) => v).map(([k, v]) =>
    `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');

  /* 남들 한줄평. 별점만 매긴 사람은 여기 안 나옵니다 — 이름이 걸리니까요. */
  const { data: cm } = await sb.rpc('city_comments', { p_city: id });
  const others = (cm || []).filter(x => x.user_id !== ctx.me().id);
  $('cv_comments').innerHTML = others.length
    ? `<div class="daysep">다른 사람들</div>` + others.map(x =>
        `<div class="rrow" style="padding:10px 0">
           ${avatarImg(x.avatar_url, x.user_id, x.name,
                       'width:36px; height:36px; border-radius:50%; object-fit:cover', 'thumb')}
           <div class="t"><b>${esc(x.name)}</b>
             <span class="memo">${esc(x.comment)}</span>
             <span class="stars" style="pointer-events:none">${starHtml(x.stars)}</span></div>
         </div>`).join('')
    : '';

  /* 이 도시를 구간으로 가진 내 여행들. RLS 가 내 것만 내려줍니다. */
  const { data: lg, error } = await sb.from('trip_legs')
    .select('trip_id,start_date,end_date,trips(id,title,start_date,end_date)')
    .eq('city_id', id).order('start_date', { ascending:false });
  if (error) return fail(error, 'cv');

  if (!lg?.length){
    /* 도시 화면 안이라 '새 여행' 단추가 여기 없습니다 — 글만 둡니다. */
    $('cv_trips').innerHTML =
      emptyDo('아직 이 도시로 간 여행이 없어요.', null, null,
              '여행을 만들 때 이 도시를 고르면 여기에 모여요.');
    return;
  }
  /* 그 구간 날짜에 걸린 일정만 가져옵니다 — 다른 도시 일정이 섞이면 안 됩니다. */
  const { data: ps } = await sb.from('plans')
    .select('trip_id,date,start_time,category,title')
    .in('trip_id', lg.map(l => l.trip_id))
    .is('deleted_at', null).order('date').order('start_time');

  $('cv_trips').innerHTML = lg.map(l => {
    const t = l.trips;
    const mine = (ps || []).filter(p => p.trip_id === l.trip_id
                    && p.date >= l.start_date && p.date <= l.end_date);
    return `<div style="margin-bottom:var(--s-md)">
      <div class="row" style="border:0; padding:0; margin:0; cursor:pointer"
           data-cvtrip="${esc(t.id)}">
        <span class="label"><b>${esc(t.title)}</b>
          <div class="memo">${esc(dateRange(l.start_date, l.end_date))} · ${mine.length}곳</div>
        </span><span class="val">여행 보기 ›</span></div>
      ${mine.map(p => {
        const k = p.category ? 'k-' + p.category : '';
        return `<div class="plan" style="padding:7px 0">
          <span class="kdot ${esc(k)}"></span>
          <div class="body"><b>${esc(p.title)}</b>
            <span class="memo">${esc(p.date)}${
              p.start_time ? ' ' + hm(p.start_time) : ''}</span></div></div>`;
      }).join('')}
    </div>`;
  }).join('');
}

export function closeCity(fromPop){
  if (!fromPop && history.state?.t2 === 'city'){ history.back(); return; }
  cityOpen = null;
  $('cityview').classList.add('hide');
  /* 열었던 탭으로 돌아갑니다 — 덱은 그 칸에 그대로 서 있으므로 되살리기만
     하면 됩니다(b474). 내용 갱신은 탭마다 다르니 그것만 나눕니다. */
  $('tabdeck').classList.remove('hide');
  if (ctx.appTab() === 'home') ctx.loadHome();
  else if (ctx.appTab() === 'rate') ctx.drawRatings();
}

$('cityview').addEventListener('click', async e => {
  const t = e.target.closest('[data-cvtrip]');
  if (t){ closeCity(); return ctx.openTrip(t.dataset.cvtrip); }

  const st = e.target.closest('#cv_stars .st');
  if (st){
    const box = st.getBoundingClientRect();
    const v = +st.dataset.n - ((e.clientX - box.left) < box.width / 2 ? 0.5 : 0);
    const cur = myRates[cityOpen.id]?.stars;
    await ctx.saveRate(cityOpen.id, { stars: Number(cur) === v ? null : v });
    return openCity(cityOpen.id);
  }
  if (e.target.closest('#cv_want')){
    await ctx.saveRate(cityOpen.id, { want: !myRates[cityOpen.id]?.want });
    $('cv_want').classList.toggle('on', !!myRates[cityOpen.id]?.want);
  }
});
/* 쓴 것이 저장된 것과 다를 때만 버튼이 살아납니다 —
   눌러도 아무 일 없는 버튼이 켜져 있으면 저장됐는지 헷갈립니다. */
function cvNoteDirty(){
  const now   = $('cv_note').value.trim();
  const saved = (myRates[cityOpen?.id]?.comment || '').trim();
  const b = $('cv_save');
  b.disabled = now === saved;
  b.textContent = now ? '등록' : '지우기';
}
$('cv_note').addEventListener('input', cvNoteDirty);
$('cv_save').addEventListener('click', async () => {
  const v = $('cv_note').value.trim() || null;
  $('cv_save').disabled = true;
  await ctx.saveRate(cityOpen.id, { comment: v });
  $('cv_save').textContent = v ? '등록했어요' : '지웠어요';
  /* 남들 한줄평 목록에 내 것이 바로 끼어들어야 남긴 느낌이 납니다. */
  await openCity(cityOpen.id);
});

