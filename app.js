import { WORLD_PATHS } from './world.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* ── 설정 ──────────────────────────────────────────────────────────
 * publishable 키는 브라우저에 있어도 됩니다. RLS 가 지킵니다.
 * (secret / service_role 키는 절대 여기 두지 않습니다 — RLS 를 통째로 무시합니다.)
 * 저장 키에 t2 를 붙입니다. 도쿄 앱과 같은 github.io 도메인이라
 * localStorage 를 공유하기 때문입니다. 겹치면 여행 중에 터집니다. */
/* 지도 좌표를 제자리에 넣습니다. 쓰는 쪽(핀 · 발자국 미니지도)보다 먼저여야 합니다. */
document.getElementById('worldland').innerHTML = WORLD_PATHS;
const SUPABASE_URL = 'https://qahqqhjleqfrsjiixnas.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ymbrt_00OqzQjT3SrweZgQ_Lu0cw64V';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storageKey:'t2-auth', persistSession:true, autoRefreshToken:true,
          detectSessionInUrl:true }
});

const $  = id => document.getElementById(id);
const t0 = performance.now();
let me = null, cities = null, countryName = {}, countryInfo = {}, continentOf = {},
    picked = null, hitList = [], cursor = 0,
    trip = null, plans = [], pickedDay = null, members = [], expenses = [],
    channel = null, bumpTimer = null, bumpPending = null,
    tab = 'plans', settleOn = false, appTab = 'home',
    tripFilter = 'up', catFilter = '', editPlanId = null, transitLines = [], rateShown = 80, rateObs = null, aiTripId = null, legs = [], openReview = false, bookings = [], myRates = {}, cityStat = {}, rateFilter = 'all', visited = new Set(), justRated = new Set(), myAvatar = null, myReview = {}, cityOpen = null, suggested = { actions:[], places:[] };

/* 기기에 저장해 둔 글자 크기를 그리기 전에 먼저 씌웁니다 — 안 그러면 한 번 깜빡입니다. */
{
  const v = localStorage.getItem('t2:ts');
  if (v) document.documentElement.style.setProperty('--ts', v);
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function mark(id, ok, text){
  $('d'+id).className = 'dot ' + (ok ? 'ok' : 'bad');
  $('v'+id).textContent = text;
}
/* ── 두 번 눌러 지우기 ───────────────────────────────────────────────
 * 확인창(confirm)이 내장 브라우저에서 막히기 때문에 버튼 글자를 바꿔 묻습니다.
 * 그런데 물어본 채로 두면 나중에 그 버튼을 무심코 눌렀을 때 바로 지워집니다.
 * 다른 데를 누르면 원래대로 돌아오게 합니다. */
function arm(b, label){
  if (b.dataset.orig == null) b.dataset.orig = b.textContent;
  b.dataset.armed = '1';
  b.textContent = label;
  b.style.fontWeight = '600';
}
function disarm(b){
  if (b.dataset.armed !== '1') return;
  b.dataset.armed = '';
  if (b.dataset.orig != null) b.textContent = b.dataset.orig;
  b.style.fontWeight = '';
}
/* 실제 처리보다 먼저 돌아야 하므로 잡아채는 단계(capture)에서 봅니다. */
document.addEventListener('click', e => {
  document.querySelectorAll('[data-armed="1"]').forEach(b => {
    if (b !== e.target && !b.contains(e.target)) disarm(b);
  });
}, true);

function fail(e, where){
  const box = { form:$('formerr'), trip:$('triperr'), edit:$('editerr'), mem:$('memerr'), ava:$('avaerr'),
                plan:$('planerr'), planform:$('planformerr'), ai:$('aierr'), leg:$('legerr'),
                exp:$('experr'), expform:$('expformerr'), rv:$('rverr'),
                book:$('bookerr'), bookform:$('bookformerr'),
                pack:$('packerr'), link:$('linkerr'), rate:$('rateerr'), cv:$('cverr'), dump:$('dumperr'), cand:$('canderr'),
                draft:$('drafterr') }[where] || $('err');
  if (!where) $('errcard').classList.remove('hide');
  box.classList.remove('hide');
  /* 문자열을 그냥 넘기면 JSON.stringify 가 따옴표를 씌웁니다. 먼저 걸러냅니다. */
  box.textContent = typeof e === 'string' ? e
    : (e && (e.message || e.error_description || e.hint)) || JSON.stringify(e);
}

/* ── 초성 ───────────────────────────────────────────────────────────
 * 'ㄷㅋ' 로 도쿄를 찾게 합니다. 한글 음절 코드에서 첫 자음만 떼어냅니다. */
const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ',
             'ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const chosung = s => [...s].map(ch => {
  const c = ch.charCodeAt(0) - 0xAC00;
  return (c >= 0 && c < 11172) ? CHO[Math.floor(c / 588)] : ch;
}).join('');
const onlyCho = s => /^[ㄱ-ㅎ]+$/.test(s);

/* ── 로그인 ─────────────────────────────────────────────────────── */
$('login').addEventListener('click', async () => {
  $('login').disabled = true;
  /* 돌아올 주소를 명시합니다. Supabase 의 Redirect URLs 에 이 주소가
     등록돼 있어야 하고, 없으면 Site URL 로 튕겨 엉뚱한 데로 갑니다. */
  const { error } = await sb.auth.signInWithOAuth({
    provider:'google', options:{ redirectTo: location.origin + location.pathname }
  });
  if (error){ $('login').disabled = false; fail(error); }
});

$('logout').addEventListener('click', async () => {
  await sb.auth.signOut();
  location.replace(location.pathname);      /* 주소에 붙은 토큰 조각을 지웁니다 */
});

/* ── 도시 검색 ──────────────────────────────────────────────────── */
const GRADE = { dense:'지하철 촘촘', normal:'대중교통 보통',
                limited:'대중교통 약함', car:'차로 다니는 곳' };

async function loadCities(){
  if (cities) return;
  /* 새로 붙인 칸(사진·설명)이 아직 DB에 없을 수 있습니다. 그때 질의가 통째로
     실패하면 도시 목록이 아예 안 나옵니다 — 한 번 그렇게 비어 버렸습니다.
     없는 칸은 빼고 다시 물어봐서, 마이그레이션이 늦어도 화면은 살아 있게 합니다. */
  /* 좌표는 지도에 핀을 찍는 데 씁니다. 313행이라 무게는 무시할 만합니다. */
  const BASE = 'id,name,name_en,name_local,country,currency,timezone,transit_grade,' +
               'center_lat,center_lng';
  let cs = await sb.from('cities')
    .select(BASE + ',image_url,summary,summary_url').order('name');
  if (cs.error) cs = await sb.from('cities').select(BASE + ',image_url').order('name');
  if (cs.error) cs = await sb.from('cities').select(BASE).order('name');

  let ns = await sb.from('countries')
    .select('code,name,currency,local_lang,default_timezone,continent').order('name');
  if (ns.error) ns = await sb.from('countries')
    .select('code,name,currency,local_lang,default_timezone').order('name');

  if (cs.error || ns.error){
    fail(cs.error || ns.error, 'rate');
    return fail(cs.error || ns.error, 'form');
  }

  countryName = Object.fromEntries(ns.data.map(n => [n.code, n.name]));
  countryInfo = Object.fromEntries(ns.data.map(n => [n.code, n]));
  continentOf = Object.fromEntries(ns.data.map(n => [n.code, n.continent]));
  /* 검색용 색인을 한 번만 만들어 둡니다. 칠 때마다 만들면 버벅입니다. */
  cities = cs.data.map(c => ({
    ...c,
    _hay: [c.name, c.name_en, c.name_local, countryName[c.country]]
            .filter(Boolean).join(' ').toLowerCase(),
    _cho: chosung(c.name)
  }));
  $('f_country').innerHTML =
    ns.data.map(n => `<option value="${esc(n.code)}">${esc(n.name)}</option>`).join('');
  drawCountryNote();
}

/* 나라만 골랐을 때 무엇이 채워질지 미리 보여줍니다.
   시간대가 여럿인 나라는 그렇다고 적어줘야 오해가 없습니다. */
function drawCountryNote(){
  const n = countryInfo[$('f_country').value];
  if (!n) return;
  const many = cities && cities.filter(c => c.country === n.code)
                              .some(c => c.timezone !== n.default_timezone);
  $('c_note').textContent =
    `${n.currency} · ${n.default_timezone || '시간대 미정'}` +
    (many ? ' — 이 국가는 시간대가 여럿입니다. 정확히 하려면 도시를 고르세요.' : '');
}
$('f_country').addEventListener('change', drawCountryNote);

function search(q){
  q = q.trim().toLowerCase();
  if (!q || !cities) return [];        /* 아직 안 불러왔으면 조용히 빈 목록 */
  const cho = onlyCho(q);
  const hits = cities.filter(c => cho ? c._cho.includes(q) : c._hay.includes(q));
  /* 이름이 그 글자로 시작하는 것을 위로 올립니다. '나'를 치면
     '나라'가 '하나우마'보다 먼저 나와야 합니다. */
  return hits.sort((a,b) => {
    const s = x => (cho ? x._cho : x.name.toLowerCase()).startsWith(q) ? 0 : 1;
    return s(a) - s(b) || a.name.localeCompare(b.name, 'ko');
  }).slice(0, 40);
}

function drawHits(){
  const box = $('hits'), q = $('f_q').value.trim();
  if (!q){ box.classList.add('hide'); $('freewrap').classList.add('hide'); return; }

  box.classList.remove('hide');
  box.innerHTML = hitList.map((c, i) =>
    `<div class="hit${i === cursor ? ' on' : ''}" data-i="${i}">
       <b>${esc(c.name)}</b><span class="c">${esc(countryName[c.country] || c.country)}</span>
       <span class="r">${esc(GRADE[c.transit_grade] || '')}</span></div>`
  ).join('')
  + `<div class="hit${cursor === hitList.length ? ' on' : ''}" data-i="${hitList.length}">
       <b>${esc(q)}</b><span class="c">그대로 쓰기</span>
       <span class="r">국가만 고르면 됩니다</span></div>`;

  /* 아는 도시가 하나도 없으면 기다릴 것 없이 나라 고르기를 바로 띄웁니다.
     "목록에 없어요"를 찾아 누르게 하는 건 이상합니다 — 친 그대로 쓰면 됩니다. */
  if (!hitList.length) useFree();
  else $('freewrap').classList.add('hide');
}

/* 목록에 없는 곳. 도시 이름은 위 칸에 이미 쳤으니 나라만 더 받습니다. */
function useFree(){
  picked = null;
  $('picked').classList.add('hide');
  $('freewrap').classList.remove('hide');
  drawCountryNote();
}

function pick(i){
  if (i >= hitList.length){                    /* 친 그대로 쓰기 */
    $('hits').classList.add('hide');
    useFree();
    $('f_country').focus();
    return;
  }
  picked = hitList[i];
  $('freewrap').classList.add('hide');
  $('hits').classList.add('hide');
  $('f_q').classList.add('hide');
  $('picked').classList.remove('hide');
  $('p_name').textContent = picked.name;
  $('p_country').textContent = countryName[picked.country] || picked.country;
  $('p_note').textContent = `${picked.currency} · ${GRADE[picked.transit_grade] || ''}`;
}

$('f_q').addEventListener('input', () => {
  hitList = search($('f_q').value); cursor = 0; drawHits();
});
$('f_q').addEventListener('keydown', e => {
  const max = hitList.length;                 /* 마지막 줄이 '목록에 없어요' */
  if (e.key === 'ArrowDown'){ cursor = Math.min(cursor + 1, max); drawHits(); e.preventDefault(); }
  else if (e.key === 'ArrowUp'){ cursor = Math.max(cursor - 1, 0); drawHits(); e.preventDefault(); }
  else if (e.key === 'Enter'){ if (!$('hits').classList.contains('hide')) pick(cursor);
                               e.preventDefault(); }
  else if (e.key === 'Escape'){ $('hits').classList.add('hide'); }
});
$('hits').addEventListener('click', e => {
  const el = e.target.closest('.hit'); if (el) pick(+el.dataset.i);
});
$('repick').addEventListener('click', () => {
  picked = null;
  $('picked').classList.add('hide');
  $('f_q').classList.remove('hide'); $('f_q').value = ''; $('f_q').focus();
  hitList = []; drawHits();
});

/* ── 새 여행 ────────────────────────────────────────────────────── */
$('newbtn').addEventListener('click', async () => {
  $('newcard').classList.toggle('hide');
  if ($('newcard').classList.contains('hide')) return;
  await loadCities();

  /* 기본값: 오늘부터 3박 4일. 비워두면 날짜를 두 번 고르게 되는데
     대부분은 그대로 두거나 며칠만 옮깁니다. */
  const d = new Date();
  const iso = n => new Date(d.getTime() + n*864e5).toISOString().slice(0,10);
  if (!$('f_start').value) $('f_start').value = iso(0);
  if (!$('f_end').value)   $('f_end').value   = iso(3);
  syncDates();
  $('f_title').focus();
});

$('cancel').addEventListener('click', () => {
  $('newcard').classList.add('hide');
  $('formerr').classList.add('hide');
});

/* 끝나는 날이 시작보다 앞설 수 없게 선택기 자체를 막습니다.
   눌러놓고 나중에 혼나는 것보다 못 누르게 하는 편이 낫습니다.
   시작일을 뒤로 옮겨 역전되면 끝나는 날을 같이 끌고 갑니다. */
function syncDates(){
  const s = $('f_start').value;
  $('f_end').min = s || '';
  if (s && $('f_end').value && $('f_end').value < s) $('f_end').value = s;
}
$('f_start').addEventListener('change', syncDates);

$('create').addEventListener('click', async () => {
  const btn = $('create');
  $('formerr').classList.add('hide');

  const title = $('f_title').value.trim();
  /* 도시를 골랐으면 그 이름, 아니면 위 칸에 친 그대로. */
  const dest  = picked ? picked.name : $('f_q').value.trim();
  const start = $('f_start').value, end = $('f_end').value;

  if (!title)                return fail('제목을 적어주세요.', 'form');
  if (!dest)                 return fail('어디로 가는지 적어주세요.', 'form');
  if (!start || !end)        return fail('날짜를 골라주세요.', 'form');
  /* min 을 걸어뒀지만 키보드로 직접 치면 뚫립니다. 여기서 한 번 더 봅니다. */
  if (end < start)           return fail('끝나는 날이 시작보다 빠릅니다.', 'form');
  const days = Math.round((new Date(end) - new Date(start)) / 864e5) + 1;
  if (days > 365)            return fail(`${days}일은 너무 깁니다. 날짜를 다시 봐주세요.`, 'form');

  /* 도시를 골랐으면 나라·시간대·통화·이동상수는 DB 트리거가 채웁니다.
     목록에 없는 곳이면 나라만 넘기고, 통화와 언어는 나라에서 옵니다. */
  const row = { title, destination: dest, start_date: start, end_date: end };
  if (picked) row.city_id = picked.id;
  else        row.country = $('f_country').value;

  btn.disabled = true; btn.textContent = '만드는 중…';
  const { error } = await sb.from('trips').insert(row);
  btn.disabled = false; btn.textContent = '만들기';
  if (error) return fail(error, 'form');

  $('newcard').classList.add('hide');
  $('f_title').value = ''; $('f_q').value = '';
  picked = null; hitList = []; cursor = 0;
  $('picked').classList.add('hide');
  $('f_q').classList.remove('hide');
  drawHits();                       /* 빈 값이면 후보와 나라 칸을 같이 접습니다 */
  await loadTrips();
});

/* ── 여행 목록 ──────────────────────────────────────────────────── */
/* ── 앱 하단바 ─────────────────────────────────────────────────────
 * 여행 안에서는 일정/지출/일행 탭바가, 밖에서는 이 바가 나옵니다.
 * 로그아웃과 보관함이 목록 위에 얹혀 있던 것을 여기로 내렸습니다. */
function showApp(t){
  appTab = t;
  shutBigMap();
  /* 여행이 열려 있으면 먼저 닫습니다. 안 닫으면 여행 화면이 탭 화면 아래에
     그대로 남습니다 — 홈에서 발자국을 누르면 프로필 밑에 여행이 붙어 있었습니다.
     backToList 가 이미 닫고 부르는 경우에도 다시 해서 탈은 없습니다. */
  if (trip){ unwatch(); trip = null; }
  $('tripview').classList.add('hide');
  $('tabbar').classList.add('hide');
  $('appbar').classList.remove('hide');

  $('draftview').classList.add('hide');
  $('reviewview').classList.add('hide');
  $('homeview').classList.toggle('hide', t !== 'home');
  $('listview').classList.toggle('hide', t !== 'trips');
  $('rateview').classList.toggle('hide', t !== 'rate');
  $('cityview').classList.add('hide'); cityOpen = null;
  $('aiview').classList.toggle('hide',   t !== 'ai');
  $('setview').classList.toggle('hide',  t !== 'set');
  $('newcard').classList.add('hide');
  $('namebox').classList.add('hide');
  document.querySelectorAll('#appbar button').forEach(b =>
    b.classList.toggle('is-on', b.dataset.a === t));
  if (t === 'home')      loadHome();
  else if (t === 'set')  { showProfile(false); loadNotifs(); loadFootprint(); }
  else if (t === 'ai')   loadAi();
  else if (t === 'rate') loadRatings();
  else                   loadTrips();
  window.scrollTo({ top:0, behavior:'smooth' });
}
$('appbar').addEventListener('click', e => {
  const b = e.target.closest('button[data-a]');
  if (b) showApp(b.dataset.a);
});

$('tripfilter').addEventListener('click', e => {
  const b = e.target.closest('button[data-f]'); if (!b) return;
  tripFilter = b.dataset.f;
  document.querySelectorAll('#tripfilter button').forEach(x =>
    x.classList.toggle('on', x.dataset.f === tripFilter));
  loadTrips();
});

/* ── 일정 검토 ──────────────────────────────────────────────────────
 * 계산만 합니다. AI 를 안 부르므로 공짜이고 비행기모드에서도 됩니다.
 * 문서가 "계산 검사가 공짜라 가능한 구조"라고 한 그것이고,
 * 남들이 생성만 하고 안 하는 부분입니다.
 *
 * 지금은 이동 시간을 못 잽니다 — 일정에 좌표가 안 붙어 있습니다.
 * 좌표가 붙으면 trips 의 이동 상수로 "이 하루가 물리적으로 가능한가"까지 봅니다. */
const STAY_MIN = { 식사:60, 카페:40, 관광:60, 쇼핑:60, 이동:0, 숙소:0, 기타:30 };
const mins  = t => { const [h,m] = String(t).split(':'); return +h*60 + +m; };
const fmtM  = v => String(Math.floor(v/60)).padStart(2,'0') + ':' +
                   String(v%60).padStart(2,'0');

/* 두 좌표 사이 직선거리(km). 실제 경로가 아니라 어림입니다. */
function distKm(a, b, c, d){
  if ([a,b,c,d].some(v => v == null)) return null;
  const r = Math.PI/180, R = 6371;
  const dLat = (c-a)*r, dLng = (d-b)*r;
  const h = Math.sin(dLat/2)**2 + Math.cos(a*r)*Math.cos(c*r)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

/* 도쿄에서 실제로 재서 쓰던 식입니다. 상수는 그날 있는 구간에서 옵니다 —
   로마는 대중교통, 오키나와는 차라서 같은 거리도 시간이 다릅니다. */
function travel(km, g){
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
function hop(a, b, lgs){
  const km = distKm(a.lat, a.lng, b.lat, b.lng);
  if (km == null) return null;
  const g = (lgs || []).find(l => a.date >= l.start_date && a.date <= l.end_date)
            || (lgs || [])[0];
  const tv = travel(km, g);
  return tv && { km, ...tv };
}

function review(t, ps, lgs){
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
        t:`${p.title} — 끝나는 시각이 시작보다 빠릅니다`,
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
          t:`${p.title} 과 ${nx.title} 이 겹칩니다`,
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
            s: `${h.km.toFixed(1)}km · ${h.walk ? '도보' : '이동'} 약 ${h.min}분인데 ` +
               `${gap}분밖에 없어요.` +
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

const LVCOLOR = { 심각:'var(--bad)', 주의:'var(--k-food)', 참고:'var(--ink-48)' };

async function loadAi(){
  const { data, error } = await sb.from('trips')
    .select('id,title').order('start_date');
  if (error) return fail(error, 'trip');

  /* 여행을 안 고르고도 물어볼 수 있어야 합니다. 어디로 갈지 정하기 전에
     묻는 것이 오히려 더 많습니다. 그때는 여행 자료 없이 그냥 답합니다. */
  $('ai_trip').innerHTML =
    `<option value="">여행 없이 물어보기</option>` +
    (data || []).map(t => `<option value="${esc(t.id)}">${esc(t.title)}</option>`).join('');
  $('ai_trip').value = (aiTripId && data.some(t => t.id === aiTripId)) ? aiTripId : '';
  /* 들어올 때는 채팅부터 보입니다. 홈에서 "자세히"로 온 경우만 펼칩니다. */
  $('reviewcard').classList.toggle('hide', !openReview);
  openReview = false;
  await runReview($('ai_trip').value);
  await loadChats($('ai_trip').value);
}
$('ai_trip').addEventListener('change', () => {
  runReview($('ai_trip').value);
  loadChats($('ai_trip').value);
});

/* ── AI 대화 ────────────────────────────────────────────────────────
 * 키는 화면에 없습니다. Edge Function 뒤에 있고 우리는 그 함수만 부릅니다.
 * 대화는 사람별로 나눠 저장합니다 — 섞이면 AI 가 남의 질문을 맥락으로 씁니다
 * ("아까 말한 그 라멘집"이 다른 사람 대화일 수 있습니다). */
async function loadChats(tripId){
  /* 여행을 안 골랐을 때 나눈 대화도 남깁니다 (029). trip_id 가 비어 있는 줄입니다.
     eq 로는 null 을 못 찾습니다 — is 를 써야 합니다. */
  let q = sb.from('chats').select('role,content').eq('user_id', me.id);
  q = tripId ? q.eq('trip_id', tripId) : q.is('trip_id', null);
  const { data } = await q.order('created_at').limit(40);
  drawChats(data || []);
  const { data: left } = await sb.rpc('ai_left');
  if (left) $('ai_left').textContent = `오늘 ${left.used}/${left.limit}회`;
}

/* AI 는 마크다운으로 씁니다. 그대로 찍으면 별표가 글자로 보입니다.
   반드시 먼저 이스케이프하고 나서 태그로 바꿉니다 — 순서를 바꾸면
   AI 가 돌려준 글이 그대로 HTML 이 됩니다. */
function md(s){
  return esc(s)
    .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
    .replace(/^\s*[*-]\s+/gm, '· ')
    .replace(/^\s*(#{1,4})\s+(.+)$/gm, '<b>$2</b>')
    .replace(/\n/g, '<br>');
}

function drawChats(rows){
  $('chat').innerHTML = rows.length
    ? rows.map(m => `<div class="msg">
        <b class="who" style="color:${m.role === 'user' ? 'var(--ink-48)' : 'var(--primary)'}">
          ${m.role === 'user' ? '나' : 'AI'}</b>
        <div class="txt">${md(m.content)}</div></div>`).join('')
    : `<div class="empty">${aiTripId ? '이 여행에 대해 물어보세요.' : '어디로 갈지, 뭘 챙길지 아무거나 물어보세요.'}</div>`;
  $('chat').scrollTop = $('chat').scrollHeight;
}

$('ai_msg').addEventListener('keydown', e => {
  if (e.key === 'Enter'){ e.preventDefault(); $('ai_send').click(); }
});

$('ai_send').addEventListener('click', async () => {
  const msg = $('ai_msg').value.trim();
  const tripId = $('ai_trip').value;
  $('aierr').classList.add('hide');
  if (!msg) return;
  $('ai_msg').value = ''; $('cards').innerHTML = '';
  $('ai_send').disabled = true; $('ai_send').textContent = '…';

  /* 물어본 것을 먼저 남깁니다. 답이 실패해도 무엇을 물었는지는 보여야 합니다.
     여행을 안 골랐으면 trip_id 를 비워 둡니다 — 그것도 남습니다 (029). */
  await sb.from('chats').insert({ trip_id: tripId || null, user_id: me.id,
                                  role: 'user', content: msg });
  await loadChats(tripId);

  const { data, error } = await sb.functions.invoke('chat',
    { body: { trip_id: tripId || null, message: msg } });

  $('ai_send').disabled = false; $('ai_send').textContent = '보내기';

  if (error){
    /* 함수가 오류를 내면 본문에 이유가 들어 있습니다. 그대로 보여줍니다. */
    let why = error.message;
    try { why = (await error.context?.json())?.error || why; } catch {}
    return fail(/not found|Failed to send/i.test(why)
      ? 'chat 함수가 아직 올라가 있지 않습니다. Supabase → Edge Functions 에서 배포해주세요.'
      : why, 'ai');
  }
  if (data?.error) return fail(data.error, 'ai');

  await sb.from('chats').insert({ trip_id: tripId || null, user_id: me.id,
                                  role: 'model', content: data.reply });
  await loadChats(tripId);
  drawCards(data);
});

/* ── 제안 카드 ──────────────────────────────────────────────────────
 * AI 는 직접 쓰지 않습니다 (문서 7장). 제안만 카드로 내고 담는 것은 사용자가 합니다.
 * 카드는 저장하지 않습니다 — 다음 질문을 하면 사라집니다.
 * 남겨두면 이미 담은 것을 또 담게 되고, 무엇이 최신인지 헷갈립니다. */
function drawCards(d){
  const acts = d?.actions || [], places = d?.places || [];
  if (!acts.length && !places.length){ $('cards').innerHTML = ''; return; }

  const far = x => x.lat == null ? '<span class="val">좌표 없음</span>' : '';
  suggested = { actions: acts, places };

  $('cards').innerHTML =
    (acts.length ? `<div class="daysep">일정으로 넣기</div>` : '') +
    acts.map((a, i) => {
      const k = a.category ? 'k-' + a.category : '';
      return `<div class="plan">
        <div class="when">${esc(a.start_time || '–')}</div>
        <span class="kdot ${esc(k)}"></span>
        <div class="body"><b>${esc(a.title)}</b>
          <span class="memo">${esc(a.date)}${a.memo ? ' · ' + esc(a.memo) : ''} ${far(a)}</span>
        </div>
        <button class="small" data-take="a" data-i="${i}">담기</button></div>`;
    }).join('') +
    (places.length ? `<div class="daysep">후보로 담기</div>` : '') +
    places.map((p, i) => {
      const k = p.category ? 'k-' + p.category : '';
      return `<div class="plan">
        <span class="kdot ${esc(k)}"></span>
        <div class="body"><b>${esc(p.name)}</b>
          <span class="memo">${esc([p.name_local, p.why].filter(Boolean).join(' · '))}
            ${far(p)}</span></div>
        <button class="small" data-take="p" data-i="${i}">담기</button></div>`;
    }).join('');
}

$('cards').addEventListener('click', async e => {
  const b = e.target.closest('button[data-take]'); if (!b) return;
  const tripId = $('ai_trip').value;
  const i = +b.dataset.i;
  b.disabled = true; b.textContent = '담는 중…';

  let r;
  if (b.dataset.take === 'a'){
    const a = suggested.actions[i];
    /* 같은 날 맨 뒤로. 좌표가 있으면 같이 넣습니다 — 이동 시간 검사의 재료입니다. */
    const same = plans.filter(p => p.date === a.date);
    r = await sb.from('plans').insert({
      trip_id: tripId, date: a.date, title: a.title,
      start_time: a.start_time || null, category: a.category,
      memo: a.memo, lat: a.lat, lng: a.lng,
      sort_order: same.length ? Math.max(...same.map(p => +p.sort_order)) + 1 : 0,
    }).select('id');
  } else {
    const p = suggested.places[i];
    r = await sb.from('candidates').insert({
      trip_id: tripId, title: p.name, title_local: p.name_local,
      category: p.category, memo: p.why, lat: p.lat, lng: p.lng,
      source: 'ai',
    }).select('id');
  }

  if (r.error){ b.disabled = false; b.textContent = '담기'; return fail(r.error, 'ai'); }
  if (!r.data?.length){ b.disabled = false; b.textContent = '담기';
                        return fail('저장되지 않았습니다 (0건).', 'ai'); }
  b.textContent = '담았어요';
  await runReview(tripId);          /* 넣었으니 검토 배지도 다시 셉니다 */
});

/* 검토는 채팅을 가리지 않게 접어둡니다. 버튼에는 몇 건인지만 답니다. */
$('reviewbtn').addEventListener('click', () => {
  $('reviewcard').classList.toggle('hide');
  if (!$('reviewcard').classList.contains('hide'))
    $('reviewcard').scrollIntoView({ behavior:'smooth', block:'nearest' });
});
$('reviewclose').addEventListener('click', () => $('reviewcard').classList.add('hide'));

async function runReview(id){
  aiTripId = id;
  /* 여행을 안 골랐으면 검토할 것이 없습니다. 배지도 지웁니다. */
  if (!id){
    $('review').innerHTML = '<div class="empty">여행을 고르면 일정을 검토해드립니다.</div>';
    $('reviewdot').classList.add('hide');
    $('reviewbtn').classList.add('hide');
    return;
  }
  $('reviewbtn').classList.remove('hide');
  const [{ data:t }, { data:ps }, { data:lg }] = await Promise.all([
    sb.from('trips').select('*').eq('id', id).maybeSingle(),
    sb.from('plans').select('date,start_time,end_time,category,title,lat,lng')
      .eq('trip_id', id).is('deleted_at', null).order('date'),
    sb.from('trip_legs').select('destination,start_date,end_date,walk_max_km,' +
      'walk_min_per_km,walk_base_min,transit_factor,transit_base_min')
      .eq('trip_id', id).order('start_date')
  ]);
  if (!t) return;
  const found = review(t, ps || [], lg || []);
  const noCoord = (ps || []).filter(p => p.lat == null).length;

  /* 버튼 배지는 짚어봐야 할 것만 셉니다. "비어 있습니다"까지 세면
     새 여행에서 숫자가 크게 뜨는데 실은 아무 문제도 아닙니다. */
  const n = found.filter(f => f.lv !== '참고').length;
  $('reviewdot').textContent = n;
  $('reviewdot').classList.toggle('hide', !n);
  $('reviewdot').style.color = found.some(f => f.lv === '심각')
    ? 'var(--bad)' : 'var(--k-food)';

  $('review').innerHTML = found.length
    ? found.map(f => `<div class="plan">
        <span class="kdot" style="background:${LVCOLOR[f.lv]}"></span>
        <div class="body"><b>${esc(f.t)}</b>
          <span class="memo">${esc(f.s)}</span></div>
        <span class="badge" style="color:${LVCOLOR[f.lv]}">${esc(f.lv)}</span></div>`).join('')
      + (noCoord ? `<div class="empty" style="text-align:left; padding:12px 0 0">
           좌표가 없는 일정 ${noCoord}개는 이동 시간을 못 쟀어요.</div>` : '')
    : `<div class="empty">문제를 못 찾았어요.<br>지금 일정은 무리가 없어 보입니다.</div>`;
}

/* ── 평가 ───────────────────────────────────────────────────────────
 * 일정 앱은 1년에 두 번 열립니다. 돌아올 이유를 만드는 자리입니다.
 * 추천은 하지 않습니다 — 예상 별점은 근거보다 세게 들리고,
 * 여행은 틀렸을 때 대가가 영화와 다릅니다.
 * 남들 평균은 예측이 아니라 사실이라 보여주되 몇 명이 매겼는지 같이 답니다. */
function starHtml(v){
  return [1,2,3,4,5].map(n => {
    const f = v == null ? 0 : Math.max(0, Math.min(1, v - (n - 1)));
    return `<span class="st" data-n="${n}"><i style="width:${(f*100).toFixed(0)}%"></i></span>`;
  }).join('');
}

async function loadRatings(){
  $('rateerr').classList.add('hide');
  await loadCities();
  fillCityList();
  const [mine, stats, vis] = await Promise.all([
    sb.from('city_ratings').select('city_id,stars,want,comment').eq('user_id', me.id),
    sb.rpc('city_stats'),
    sb.rpc('my_visited'),
  ]);
  if (mine.error) return fail(mine.error, 'rate');
  myRates  = Object.fromEntries((mine.data || []).map(r => [r.city_id, r]));
  cityStat = Object.fromEntries((stats.data || []).map(s => [s.city_id, s]));
  /* 다녀온 곳은 저장하지 않고 계산합니다 — 별점을 매겼거나 지난 여행의 구간 도시.
     켜고 끄는 스위치가 없으니 어긋날 자리도 없습니다. */
  visited = new Set((vis.data || []).map(v => v.city_id));
  justRated.clear();      /* 다시 들어왔으니 매긴 것은 이제 목록에서 뺍니다 */
  drawRatings();
}

/* 칩으로 놔둔 것은 둘뿐입니다. 나머지는 프로필 보관함에서 걸러 들어옵니다.
   그때는 무엇으로 걸렀는지 알려주고 풀 길을 같이 줍니다. */
const NARROW = { todo:'아직 평가 안 한 다녀온 곳', been:'다녀온 곳', mine:'내가 매긴 곳' };

function setRateFilter(f){
  rateFilter = f;
  document.querySelectorAll('#r_filter button').forEach(x =>
    x.classList.toggle('on', x.dataset.rf === f));
  $('r_narrow').classList.toggle('hide', !NARROW[f]);
  if (NARROW[f]) $('r_narrowtext').textContent = `${NARROW[f]}만 보는 중`;
  drawRatings();
  $('r_q').scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function drawRatings(){
  const q = $('r_q').value.trim().toLowerCase();
  const cho = /^[ㄱ-ㅎ]+$/.test(q);
  let list = (cities || []).filter(c => {
    if (q && !(cho ? c._cho.includes(q) : c._hay.includes(q))) return false;
    const r = myRates[c.id];
    if (rateFilter === 'todo') return visited.has(c.id) && r?.stars == null;
    if (rateFilter === 'been') return visited.has(c.id);
    if (rateFilter === 'want') return !!r?.want;
    if (rateFilter === 'mine') return r?.stars != null;
    if (rateFilter === 'comment') return !!r?.comment;
    /* 기본 목록에는 아직 안 매긴 곳만 둡니다. 매긴 것이 계속 쌓여 있으면
       남은 게 안 보여서 더 안 매기게 됩니다. 매긴 것은 프로필에서 봅니다.
       방금 매긴 것은 남겨둡니다 — 잘못 눌렀을 때 그 자리에서 고쳐야 합니다. */
    return r?.stars == null || justRated.has(c.id);
  });
  /* 아직 안 매긴 다녀온 곳을 맨 위로, 그다음 높은 별점 순.
     기록 화면에 왔으면 "매길 게 남았나"가 먼저 궁금합니다. */
  const rank = c => (visited.has(c.id) && myRates[c.id]?.stars == null) ? 999
                  : (myRates[c.id]?.stars ?? -1);
  list.sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name, 'ko'));

  $('r_head').textContent = { been:'다녀온 곳', want:'가보고 싶은 곳',
                              mine:'내가 매긴 곳', comment:'한줄평 남긴 곳',
                              todo:'매길 곳' }[rateFilter] || '도시';

  /* 찾는 이름이 목록에 없으면 직접 넣을 수 있게 안내합니다. */
  const exact = q && (cities || []).some(c => c.name.toLowerCase() === q);
  const canAdd = q.length >= 2 && !cho && !exact;
  $('addcity').classList.toggle('hide', !canAdd);
  if (canAdd) $('ac_hint').textContent =
    `"${$('r_q').value.trim()}" 을(를) 이 국가의 도시로 넣어요.`;

  if (!list.length && !canAdd){
    $('ratelist').innerHTML = '<div class="empty">찾는 도시가 없어요.</div>';
    return;
  }

  /* 끝까지 내리면 더 불러옵니다. 80곳에서 자르고 "검색하세요" 라고만 하면
     222곳이 영영 안 보입니다. */
  $('ratelist').innerHTML = list.slice(0, rateShown).map(c => {
    const r = myRates[c.id] || {}, s = cityStat[c.id];
    const todo = visited.has(c.id) && r.stars == null;
    /* 사진이나 이름을 누르면 그 도시 페이지가 열립니다.
       별과 하트는 아래 처리에서 먼저 걸러지므로 여기 걸리지 않습니다. */
    return `<div class="rrow" data-cityopen="${esc(c.id)}">
      ${c.image_url
        ? `<img class="thumb" src="${esc(c.image_url)}" alt="" loading="lazy"
               onerror="this.replaceWith(Object.assign(document.createElement('span'),
                 {className:'thumb ph', textContent:'${esc(c.name.slice(0,1))}'}))">`
        : `<span class="thumb ph">${esc(c.name.slice(0,1))}</span>`}
      <div class="t"><b>${esc(c.name)}</b>
        ${todo ? '<span class="ktag" style="--kc:#f5a623">평가 대기</span>' : ''}
        <span class="memo">${esc(countryName[c.country] || c.country)}${
          visited.has(c.id) ? ' · 다녀옴' : ''}${
          s?.n_rated ? ` · 평균 ${Number(s.avg_stars).toFixed(1)} (${s.n_rated}명)` : ''}</span>
      </div>
      <span class="stars" data-city="${esc(c.id)}">${starHtml(r.stars)}</span>
      <button class="ghost want${r.want ? ' on' : ''}" data-want="${esc(c.id)}"
              title="가보고 싶어요">♡</button>
    </div>`;
  }).join('') + (list.length > rateShown
    ? '<div class="empty" id="ratemore">더 불러오는 중…</div>' : '');
  /* 바닥에 닿으면 더 그립니다. 스크롤 값을 재는 것보다 어긋날 자리가 적습니다. */
  const more = $('ratemore');
  if (more){
    rateObs?.disconnect();
    rateObs = new IntersectionObserver(es => {
      if (!es[0].isIntersecting) return;
      rateShown += 60; rateObs.disconnect(); drawRatings();
    }, { rootMargin:'400px' });
    rateObs.observe(more);
  }
}

$('ac_add').addEventListener('click', async () => {
  const name = $('r_q').value.trim();
  if (name.length < 2) return;
  $('rateerr').classList.add('hide');
  $('ac_add').disabled = true;

  /* 나라만 넘기면 통화·언어·시간대는 004 의 트리거가 채웁니다.
     좌표와 이동 등급은 비워 둡니다 — 나중에 채우면 이동시간 검사가 좋아집니다. */
  const { data, error } = await sb.from('cities')
    .insert({ name, country: $('ac_country').value, created_by: me.id })
    .select('id,name,name_en,name_local,country,currency,timezone,transit_grade,image_url')
    .maybeSingle();
  $('ac_add').disabled = false;

  if (error){
    return fail(/duplicate|unique/i.test(error.message)
      ? '그 국가에 같은 이름의 도시가 이미 있습니다.' : error, 'rate');
  }
  if (!data) return fail('저장되지 않았습니다 (0건).', 'rate');

  /* 목록 뭉치에 바로 끼워 넣습니다. 다시 받아오면 화면이 한 번 껌뻑입니다. */
  cities.push({ ...data,
    _hay: [data.name, data.name_en, data.name_local, countryName[data.country]]
            .filter(Boolean).join(' ').toLowerCase(),
    _cho: chosung(data.name) });
  $('r_q').value = data.name;
  drawRatings();
});

$('r_q').addEventListener('input', drawRatings);
for (const id of ['r_filter', 'r_narrow'])
  $(id).addEventListener('click', e => {
    const b = e.target.closest('button[data-rf]');
    if (b) setRateFilter(b.dataset.rf);
  });

$('ratelist').addEventListener('click', async e => {
  /* 별 왼쪽 절반은 반 개, 오른쪽 절반은 한 개 — 왓챠피디아와 같은 방식입니다. */
  const st = e.target.closest('.st');
  if (st){
    const wrap = st.closest('.stars'), cityId = wrap.dataset.city;
    const box = st.getBoundingClientRect();
    const v = +st.dataset.n - ((e.clientX - box.left) < box.width / 2 ? 0.5 : 0);
    /* 같은 점수를 다시 누르면 지웁니다. 잘못 누른 것을 되돌릴 길이 있어야 합니다.
       "다녀옴"은 따로 켜지 않습니다 — 별점이 있으면 다녀온 것으로 계산됩니다. */
    const cur = myRates[cityId]?.stars;
    const next = Number(cur) === v ? null : v;
    /* 저장을 기다리지 않고 먼저 칠합니다. 여기서는 줄을 옮기지도 지우지도 않습니다. */
    paintStars(wrap, next, true);
    markRated(st.closest('.rrow'), next);
    await saveRate(cityId, { stars: next }, true);
    return;
  }
  const w = e.target.closest('button[data-want]');
  if (w) return saveRate(w.dataset.want, { want: !myRates[w.dataset.want]?.want });

  /* 별과 하트가 아니면 도시 페이지를 엽니다. */
  const row = e.target.closest('[data-cityopen]');
  if (row) await openCity(row.dataset.cityopen);
});

/* 별을 누르면 그 자리에서 바로 칠합니다. 저장을 기다렸다 다시 그리면
   그 사이에 아무 일도 안 일어난 것처럼 보이고, 다시 그리는 순간
   정렬이 바뀌어 줄이 위로 튀어 오릅니다 — 눌렀는지 알 수가 없습니다. */
function paintStars(wrap, v, animate){
  [...wrap.querySelectorAll('.st')].forEach((st, n) => {
    const f = Math.max(0, Math.min(1, (v ?? 0) - n));
    st.querySelector('i').style.width = (f * 100).toFixed(0) + '%';
    if (!animate) return;
    st.classList.remove('pop');
    if (f <= 0){ st.style.animationDelay = ''; return; }
    /* 같은 애니메이션을 다시 틀려면 한 번 끊어줘야 합니다.
       offsetWidth 를 읽으면 브라우저가 그 자리에서 계산해 흐름이 끊깁니다. */
    void st.offsetWidth;
    st.style.animationDelay = (n * 55) + 'ms';   /* 왼쪽부터 차례로 */
    st.classList.add('pop');
  });
}
function markRated(row, v){
  if (!row) return;
  const box = row.querySelector('.t') || row;
  let t = box.querySelector('.rtag');
  if (v == null){ t?.remove(); return; }
  if (!t){ t = document.createElement('span'); t.className = 'ktag rtag';
           t.style.cssText = '--kc:#f5a623; margin-left:6px'; box.querySelector('b')?.after(t); }
  t.textContent = `★ ${v} 기록`;
}

async function saveRate(cityId, patch, quiet){
  const r = await sb.from('city_ratings')
    .upsert({ user_id: me.id, city_id: cityId, ...patch },
            { onConflict: 'user_id,city_id' })
    .select('city_id,stars,want,comment').maybeSingle();
  if (r.error) return fail(r.error, 'rate');
  myRates[cityId] = { ...(myRates[cityId] || {}), ...r.data };
  /* 방금 매긴 것은 이번 화면에서는 남겨둡니다 — 잘못 눌렀으면 바로 고쳐야 합니다. */
  if ('stars' in patch && patch.stars != null) justRated.add(cityId);
  /* 별점을 매기면 그 도시는 다녀온 것이 됩니다. 지우면 여행 기록이 없는 한 빠집니다. */
  if ('stars' in patch){
    if (patch.stars != null) visited.add(cityId);
    else { const v = await sb.rpc('my_visited');
           visited = new Set((v.data || []).map(x => x.city_id)); }
  }
  /* 평균은 남들 것까지 합친 값이라 다시 받아야 맞습니다. */
  const s = await sb.rpc('city_stats', { p_city: cityId });
  if (s.data?.[0]) cityStat[cityId] = s.data[0]; else delete cityStat[cityId];
  /* 조용히 저장할 때는 다시 그리지 않습니다 — 누른 줄이 제자리에 있어야 합니다. */
  if (!quiet) drawRatings();
}

/* ── 도시 상세 ──────────────────────────────────────────────────────
 * 왓챠는 포스터를 누르면 작품 페이지가 열립니다. 여행앱에서는 그보다 쓸모가
 * 있는데, **내가 그 도시에서 뭘 했는지**를 같이 보여줄 수 있기 때문입니다.
 * 일정에 이미 다 적혀 있으니 새로 입력받을 것이 없습니다. */
async function openCity(id){
  const c = (cities || []).find(x => x.id === id);
  if (!c) return;
  cityOpen = c;
  if (history.state?.t2 !== 'city') history.pushState({ t2:'city' }, '');

  /* 홈에서도 지도에서도 도시를 열 수 있습니다 — 열린 탭이 뭐든 다 덮어야 합니다.
     setview 안쪽(프로필/지도/설정) 상태는 건드리지 않아서 닫으면 그대로 돌아옵니다. */
  $('rateview').classList.add('hide');
  $('homeview').classList.add('hide');
  $('setview').classList.add('hide');
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
  /* API 없이 이미 아는 것들 — 나라·대륙·통화·시간대·이동 방식. */
  const GRADE_K = { dense:'지하철 촘촘', normal:'대중교통 보통',
                    limited:'대중교통 약함', car:'차로 다니는 곳' };
  $('cv_facts').innerHTML = [
    ['대륙', continentOf[c.country]],
    ['통화', c.currency],
    ['현지 시각', (localTime(c.timezone) || '').replace('현지 ', '')],
    ['다니기', GRADE_K[c.transit_grade]],
  ].filter(([, v]) => v).map(([k, v]) =>
    `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');

  /* 남들 한줄평. 별점만 매긴 사람은 여기 안 나옵니다 — 이름이 걸리니까요. */
  const { data: cm } = await sb.rpc('city_comments', { p_city: id });
  const others = (cm || []).filter(x => x.user_id !== me.id);
  $('cv_comments').innerHTML = others.length
    ? `<div class="daysep">다른 사람들</div>` + others.map(x =>
        `<div class="rrow" style="padding:10px 0">
           <img class="thumb" style="width:36px; height:36px; border-radius:50%"
                src="${esc(x.avatar_url || '')}" alt=""
                onerror="this.style.visibility='hidden'">
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
    $('cv_trips').innerHTML =
      '<div class="empty">아직 이 도시로 간 여행이 없어요.</div>';
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
          <div class="memo">${esc(l.start_date)} ~ ${esc(l.end_date)} · ${mine.length}곳</div>
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

function closeCity(fromPop){
  if (!fromPop && history.state?.t2 === 'city'){ history.back(); return; }
  cityOpen = null;
  $('cityview').classList.add('hide');
  /* 열었던 탭으로 돌아갑니다. 홈에서 열고 기록 탭에 떨어지면 이상합니다. */
  if (appTab === 'home'){ $('homeview').classList.remove('hide'); loadHome(); }
  else if (appTab === 'set') $('setview').classList.remove('hide');
  else { $('rateview').classList.remove('hide'); drawRatings(); }
}

$('cityview').addEventListener('click', async e => {
  const t = e.target.closest('[data-cvtrip]');
  if (t){ closeCity(); return openTrip(t.dataset.cvtrip); }

  const st = e.target.closest('#cv_stars .st');
  if (st){
    const box = st.getBoundingClientRect();
    const v = +st.dataset.n - ((e.clientX - box.left) < box.width / 2 ? 0.5 : 0);
    const cur = myRates[cityOpen.id]?.stars;
    await saveRate(cityOpen.id, { stars: Number(cur) === v ? null : v });
    return openCity(cityOpen.id);
  }
  if (e.target.closest('#cv_want')){
    await saveRate(cityOpen.id, { want: !myRates[cityOpen.id]?.want });
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
  await saveRate(cityOpen.id, { comment: v });
  $('cv_save').textContent = v ? '등록됨' : '지웠어요';
  /* 남들 한줄평 목록에 내 것이 바로 끼어들어야 남긴 느낌이 납니다. */
  await openCity(cityOpen.id);
});

/* ── 홈 ─────────────────────────────────────────────────────────────
 * 세 덩어리입니다.
 *   ① 히어로   — 다음 여행을 도시 사진 위에. 여행이 없으면 가고 싶은 곳.
 *   ② 가봤어요 — 안 매긴 도시 한 곳에 별을 매깁니다.
 *   ③ 발자국   — 195개국 중 몇 곳인지.
 *
 * ①은 1년에 두세 번만 의미가 있습니다. 나머지 360일을 ②③이 채웁니다.
 * 일정과 검토는 홈에서 뺐습니다 — 여행 탭과 AI 탭에 이미 있습니다. */

/* 사진은 구간에 붙은 도시에서 가져옵니다.
   예전에 만든 여행은 trips.city_id 가 비어 있어서 구간을 먼저 봅니다. */
async function tripPhoto(t){
  const lg = await sb.from('trip_legs')
    .select('city_id, cities(image_url)').eq('trip_id', t.id).order('start_date');
  const hit = (lg.data || []).find(l => l.cities?.image_url);
  if (hit) return hit.cities.image_url;
  /* 구간에 도시가 안 붙어 있으면 이름으로 마지막 한 번 찾아봅니다. */
  const c = await sb.from('cities').select('image_url')
    .eq('name', t.destination).not('image_url', 'is', null).limit(1);
  return c.data?.[0]?.image_url || null;
}

function heroHtml(photo, dd, title, memo, btn){
  return `<div class="hero" id="hero">
    ${photo ? `<img src="${esc(photo)}" alt="" onerror="this.remove()">` : ''}
    ${dd ? `<div class="dd">${esc(dd)}</div>` : ''}
    <div class="ht">${esc(title)}</div>
    <div class="hm">${esc(memo)}</div>
    ${btn ? `<button class="hbtn" id="herobtn">${esc(btn)}</button>` : ''}
  </div>`;
}

async function loadHome(){
  const today = ymd(new Date());
  await loadCities();          /* 나라 이름과 도시 페이지에 필요합니다. 한 번만 받습니다. */

  /* 다녀왔는데 아직 별점을 안 매긴 여행. 앞으로 갈 여행이 먼저이므로
     그때는 히어로 아래 얇은 띠로만 붙입니다 — 위가 두 덩어리가 되면 무겁습니다. */
  const pend = await pendingTrip();
  const rvBar = () => {
    if (!pend) return;
    const b = document.createElement('div');
    b.className = 'rvbar';
    b.innerHTML = `<span class="t"><b>${esc(pend.trip.title)} 어땠어요?</b>
        <span>다녀오신 곳을 평가해주세요${
          pend.places.length ? ` · ${pend.places.length}곳` : ''}</span></span>
      <span class="go">평가 ›</span>`;
    b.onclick = () => openReviewTrip(pend.trip.id);
    $('home').appendChild(b);
  };

  const { data, error } = await sb.from('trips')
    .select('id,title,destination,start_date,end_date,currency,timezone')
    .gte('end_date', today)
    .order('start_date').limit(1);
  if (error) return fail(error, 'trip');

  /* 앞으로 갈 여행이 없고 평가만 남았으면, 그때는 평가를 크게 겁니다. */
  if (!data.length && pend){
    const photo = await tripPhoto(pend.trip);
    $('home').innerHTML = heroHtml(photo, '',
      `${pend.trip.title} 어땠어요?`,
      '다녀오신 곳을 평가해주세요' +
      (pend.places.length ? ` · ${pend.places.length}곳` : ''), '평가하기');
    $('hero').onclick = () => openReviewTrip(pend.trip.id);
    $('herobtn').onclick = e => { e.stopPropagation(); openReviewTrip(pend.trip.id); };
    renderAiCard();
    await renderQuiz(); await renderFoot();
    return;
  }

  if (!data.length){
    /* 여행이 없으면 가고 싶다고 표시한 곳을 겁니다. 그것도 없으면 아무 곳이나 —
       빈 화면보다는 사진 한 장이 훨씬 낫습니다. */
    const w = await sb.from('city_ratings').select('cities(name,country,image_url)')
      .eq('user_id', me.id).eq('want', true).limit(20);
    const pool = (w.data || []).map(r => r.cities).filter(c => c?.image_url);
    let pick = pool[Math.floor(Math.random() * pool.length)] || null;
    const wanted = !!pick;
    if (!pick){
      const any = await sb.from('cities').select('name,country,image_url')
        .not('image_url', 'is', null).limit(60);
      const l = any.data || [];
      pick = l[Math.floor(Math.random() * l.length)] || null;
    }
    $('home').innerHTML = heroHtml(
      pick?.image_url, '',
      pick ? `${pick.name}, 어때요?` : '아직 잡아둔 여행이 없어요',
      !pick   ? '첫 여행을 만들어보세요'
      : wanted ? '가보고 싶다고 표시해둔 곳입니다'
               : (countryName[pick.country] || pick.country),
      '새 여행');
    $('herobtn').onclick = e => { e.stopPropagation(); showApp('trips'); $('newbtn').click(); };
    /* 여행이 없으면 AI 로 시작하는 것이 첫 걸음입니다. 맨 위에 둡니다. */
    renderAiCard();
    await renderQuiz(); await renderFoot();
    return;
  }

  const t = data[0];
  const dday = Math.round((asDate(t.start_date) - asDate(today)) / D1);
  const days = Math.round((asDate(t.end_date) - asDate(t.start_date)) / D1) + 1;
  /* 여행 중이면 남은 날이 아니라 며칠째인지가 궁금합니다.
     사진 위에 크게 올라가는 자리라 짧아야 합니다. */
  const badge = dday > 0 ? `D-${dday}`
              : dday === 0 ? 'D-DAY'
              : `Day ${Math.round((asDate(today) - asDate(t.start_date)) / D1) + 1}`;

  /* 여행 중이면 오늘 몇 개인지만 한 줄로 얹습니다.
     일정 목록 자체는 여행 탭에 있으니 홈에서 또 늘어놓지 않습니다. */
  const [photo, cnt] = await Promise.all([
    tripPhoto(t),
    sb.from('plans').select('id', { count:'exact', head:true })
      .eq('trip_id', t.id).is('deleted_at', null).eq('date', today)
  ]);

  const n = cnt.count || 0;
  $('home').innerHTML = heroHtml(photo, badge, t.title,
    `${t.destination} · ${t.start_date} ~ ${t.end_date} · ${days}일` +
    (dday <= 0 ? (n ? ` · 오늘 ${n}개` : ' · 오늘은 비어 있어요') : ''), '');
  $('hero').onclick = () => openTrip(t.id);
  rvBar();                    /* 평가할 여행이 남아 있으면 얇은 띠로 붙습니다 */

  /* 여행이 있으면 다음 일정(히어로) 다음에 AI 가 옵니다. */
  renderAiCard();
  await renderQuiz();
  await renderFoot();
}

/* ── 여행 끝난 뒤 ────────────────────────────────────────────────────
 * 다녀오고 나면 앱을 안 엽니다. 그때 물어보는 것이 이 앱의 두 번째 축입니다.
 * 끝났는데 아직 별점을 안 매긴 여행이 있으면 홈 맨 위를 그것으로 채웁니다. */
let rvTrip = null;

async function pendingTrip(){
  const today = ymd(new Date());
  const { data } = await sb.from('trips')
    .select('id,title,destination,start_date,end_date')
    .lt('end_date', today)
    .order('end_date', { ascending:false }).limit(5);
  if (!data?.length) return null;

  for (const t of data){
    const [lg, ps, cr, pr] = await Promise.all([
      sb.from('trip_legs').select('city_id').eq('trip_id', t.id).not('city_id','is',null),
      sb.from('plans').select('id').eq('trip_id', t.id).is('deleted_at', null)
        .in('category', ['식사','카페']),
      sb.from('city_ratings').select('city_id').eq('user_id', me.id).not('stars','is',null),
      sb.from('plan_ratings').select('plan_id').eq('user_id', me.id).not('stars','is',null),
    ]);
    const rated = new Set((cr.data || []).map(r => r.city_id));
    const done  = new Set((pr.data || []).map(r => r.plan_id));
    const cities = [...new Set((lg.data || []).map(l => l.city_id))].filter(id => !rated.has(id));
    const places = (ps.data || []).filter(p => !done.has(p.id)).map(p => p.id);
    if (cities.length || places.length) return { trip: t, cities, places };
  }
  return null;
}

async function openReviewTrip(id){
  rvTrip = id;
  ['homeview','listview','rateview','aiview','setview','cityview','draftview','reviewview']
    .forEach(v => $(v).classList.add('hide'));
  $('reviewview').classList.remove('hide');
  $('rv_report').classList.add('hide');
  $('rv_rate').classList.remove('hide');
  window.scrollTo({ top:0 });
  if (history.state?.t2 !== 'rv') history.pushState({ t2:'rv' }, '');

  await loadCities();
  const [t, lg, ps, cr, pr] = await Promise.all([
    sb.from('trips').select('title,start_date,end_date').eq('id', id).maybeSingle(),
    sb.from('trip_legs').select('city_id').eq('trip_id', id).not('city_id','is',null),
    sb.from('plans').select('id,title,category,date').eq('trip_id', id)
      .is('deleted_at', null).in('category', ['식사','카페','관광','쇼핑']).order('date'),
    sb.from('city_ratings').select('city_id,stars').eq('user_id', me.id),
    sb.from('plan_ratings').select('plan_id,stars').eq('user_id', me.id),
  ]);
  const cs = Object.fromEntries((cr.data || []).map(r => [r.city_id, r.stars]));
  const psr = Object.fromEntries((pr.data || []).map(r => [r.plan_id, r.stars]));

  $('rv_head').textContent = `${t.data?.title || '여행'} 어땠어요?`;
  $('rv_sub').textContent  = '다녀오신 곳을 평가해주세요. 건너뛰어도 괜찮아요.';

  const ids = [...new Set((lg.data || []).map(l => l.city_id))];
  $('rvt_cities').innerHTML = ids.length
    ? '<div class="daysep">도시</div>' + ids.map(cid => {
        const c = (cities || []).find(x => x.id === cid); if (!c) return '';
        return `<div class="rrow">
          ${c.image_url ? `<img class="thumb" src="${esc(c.image_url)}" alt="">`
                        : `<span class="thumb ph">${esc(c.name.slice(0,1))}</span>`}
          <div class="t"><b>${esc(c.name)}</b>
            <span class="memo">${esc(countryName[c.country] || c.country)}</span></div>
          <span class="stars" data-city="${esc(cid)}">${starHtml(cs[cid])}</span>
        </div>`;
      }).join('') : '';

  /* 먹은 곳과 본 곳을 나눠 묻습니다. 리포트에서 둘을 견줘 보여주려면
     따로 받아야 합니다 — "5만엔 오마카세보다 라멘에 별을 더 줬다" 같은 것. */
  const ICON = { 식사:'🍽', 카페:'☕', 관광:'📸', 쇼핑:'🛍' };
  const group = (title, list) => list.length
    ? `<div class="daysep">${title}</div>` + list.map(p => `<div class="rrow">
        <span class="thumb ph">${ICON[p.category] || '📍'}</span>
        <div class="t"><b>${esc(p.title)}</b><span class="memo">${esc(p.date)}</span></div>
        <span class="stars" data-plan="${esc(p.id)}">${starHtml(psr[p.id])}</span>
      </div>`).join('') : '';
  const all = ps.data || [];
  $('rv_places').innerHTML =
    group('먹은 곳', all.filter(p => ['식사','카페'].includes(p.category))) +
    group('본 곳',   all.filter(p => ['관광','쇼핑'].includes(p.category)));
}

function closeReview(fromPop){
  if (!fromPop && history.state?.t2 === 'rv'){ history.back(); return; }
  $('reviewview').classList.add('hide');
  showApp('home');
}
$('rvback').addEventListener('click', () => closeReview());

/* 평가 줄. 도시는 city_ratings, 맛집은 plan_ratings 로 갑니다. */
$('rv_rate').addEventListener('click', async e => {
  const st = e.target.closest('.st'); if (!st) return;
  const wrap = st.closest('.stars');
  const box = st.getBoundingClientRect();
  const v = +st.dataset.n - ((e.clientX - box.left) < box.width / 2 ? 0.5 : 0);
  paintStars(wrap, v, true);
  if (wrap.dataset.city) await saveRate(wrap.dataset.city, { stars: v }, true);
  else await sb.from('plan_ratings').upsert(
    { user_id: me.id, plan_id: wrap.dataset.plan, stars: v },
    { onConflict: 'user_id,plan_id' });
});

/* ── 리포트 ──────────────────────────────────────────────────────────
 * 평가까지 마쳤으면 뭔가 남는 것이 있어야 합니다. 옆으로 넘겨 보는 카드로 냅니다. */
$('rv_done').addEventListener('click', () => drawReport(rvTrip));

let rpt = null;                       /* 공유와 이미지 저장에서 다시 씁니다 */

async function drawReport(id){
  $('rv_rate').classList.add('hide');
  $('rv_report').classList.remove('hide');
  $('rv_report').innerHTML = '<div class="card"><div class="empty">만드는 중…</div></div>';
  window.scrollTo({ top:0 });

  const [t, lg, pl, ex, cr, pr] = await Promise.all([
    sb.from('trips').select('title,destination,start_date,end_date,home_currency')
      .eq('id', id).maybeSingle(),
    sb.from('trip_legs').select('city_id').eq('trip_id', id).order('start_date'),
    sb.from('plans').select('id,title,category,lat,lng,date,start_time')
      .eq('trip_id', id).is('deleted_at', null).order('date').order('start_time'),
    sb.from('expenses').select('title,amount,amount_home,currency,category')
      .eq('trip_id', id).is('deleted_at', null),
    sb.from('city_ratings').select('city_id,stars').eq('user_id', me.id),
    sb.from('plan_ratings').select('plan_id,stars').eq('user_id', me.id),
  ]);
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

  /* 한 줄 정의. AI 를 안 부르고 지출 비중과 별점 차이로 뽑습니다 — 공짜이고 즉시 나옵니다. */
  const perDay = spots.length / days;
  const label =
    (foodPct >= 45 && (eatAvg ?? 0) >= (seeAvg ?? 0)) ? '먹으러 간 사람'
    : shopPct >= 25                                   ? '사러 간 사람'
    : perDay >= 6                                     ? '부지런히 본 사람'
    : perDay <= 3.2                                   ? '느긋하게 쉰 사람'
    : (km / days) >= 12                               ? '많이 걸은 사람'
    : (seeAvg ?? 0) > (eatAvg ?? 0)                   ? '보러 간 사람'
    : '고루 즐긴 사람';
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

  $('rv_report').innerHTML =
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

  $('rv_home').onclick  = () => closeReview();
  $('rv_share').onclick = () => shareReport();
  $('rv_img').onclick   = () => saveReportImage();
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

/* 이미지 저장. 밖에서 라이브러리를 받아오지 않고 캔버스에 직접 그립니다 —
   비행기모드에서도 되고 파일도 안 무거워집니다. */
async function saveReportImage(){
  if (!rpt) return;
  const W = 1080, H = 1350, s = 1;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');

  const grd = g.createLinearGradient(0, 0, W, H);
  grd.addColorStop(0, '#4b6cff'); grd.addColorStop(.55, '#7b4dff'); grd.addColorStop(1, '#a13cff');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);

  const F = (w, px) => `${w} ${px}px -apple-system, "Malgun Gothic", sans-serif`;
  g.fillStyle = '#fff'; g.textAlign = 'center';

  g.font = F(700, 84); g.fillText(rpt.dest || rpt.title || '여행', W/2, 250);
  g.font = F(400, 34); g.globalAlpha = .9;
  g.fillText(`${rpt.from} – ${rpt.to} · ${rpt.days}일`, W/2, 305);
  g.globalAlpha = 1;

  const nums = [
    [rpt.spend ? Math.round(rpt.spend).toLocaleString() : '–', '쓴 돈'],
    [rpt.spots + '곳', '다녀온 곳'],
    [rpt.km ? rpt.km + 'km' : '–', '움직인 거리'],
  ];
  nums.forEach(([b, k], i) => {
    const x = W/2 + (i - 1) * 320;
    g.font = F(700, 62); g.fillText(b, x, 560);
    g.font = F(400, 30); g.globalAlpha = .85; g.fillText(k, x, 615); g.globalAlpha = 1;
  });

  g.font = F(700, 60); g.fillText(`"${rpt.label}"`, W/2, 830);
  if (rpt.defLine){
    g.font = F(400, 30); g.globalAlpha = .88;
    g.fillText(rpt.defLine, W/2, 890); g.globalAlpha = 1;
  }
  g.font = F(600, 30); g.globalAlpha = .72; g.fillText('AI.Trip', W/2, H - 90);
  g.globalAlpha = 1;

  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  const file = new File([blob], 'trip-report.png', { type:'image/png' });
  /* 휴대폰은 이미지를 바로 공유창에 넘길 수 있습니다. 안 되면 내려받습니다. */
  if (navigator.canShare?.({ files:[file] })){
    try { await navigator.share({ files:[file], title:'여행 리포트' }); return; }
    catch (e){ if (e?.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'trip-report.png';
  a.click(); URL.revokeObjectURL(a.href);
  toast('이미지를 저장했어요');
}

/* AI 한마디. 계산해 둔 사실만 넘기고 문장만 받습니다 —
   AI 가 숫자를 다시 세면 틀립니다. 부를 때만 부르므로 횟수도 아낍니다. */
async function askReportAi(id, f){
  const b = $('rv_askai');
  b.disabled = true; b.textContent = '듣는 중…';
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
function renderAiCard(){
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
       <b>AI와 함께 떠나볼까요?</b>
       <span>뭘 좋아하는지만 알려주세요</span>
     </span>
     <span class="go">시작</span>`;
  box.onclick = openDraft;
  $('home').appendChild(box);
}

/* ── 여기 가봤어요? ──────────────────────────────────────────────────
 * 안 매긴 도시를 몇 곳씩 늘어놓고 아는 곳에만 별을 답니다.
 * 한 곳씩 크게 물어보면 모르는 도시가 나왔을 때 할 일이 없습니다.
 * 줄 모양은 기록 탭과 같게 맞춥니다.
 * 전부 받아오면 무거우니 임의의 구간에서 스무 곳만 집어 씁니다. */
const QUIZ_ROWS = 5;
let quizPool = [], quizFilling = false, quizFilled = 0;

/* 처음 보이는 다섯 곳이 스플리트 · 브뤼헤 · 크레타뿐이면
   "나 이런 데 안 가봤는데" 하고 바로 닫습니다.
   누구나 이름은 아는 곳을 먼저 내보내고, 다른 도시 보기를 누를수록
   생소한 곳이 나오게 합니다. 유행이 아니라 인지도 기준입니다. */
const FAMOUS = new Set([
  'seoul','busan','jeju','gyeongju','jeonju','gangneung','sokcho',
  'tokyo','osaka','kyoto','fukuoka','sapporo','okinawa','nagoya','hakone','nara',
  'beijing','shanghai','xian','hongkong','macau','taipei','qingdao',
  'bangkok','chiangmai','phuket','pattaya','singapore','kualalumpur','bali','jakarta',
  'hanoi','hochiminh','danang','nhatrang','phuquoc','siemreap','manila','cebu','boracay',
  'guam','saipan','male','kathmandu','delhi','mumbai','agra','jaipur','colombo',
  'dubai','abudhabi','doha','istanbul','cappadocia','cairo','telaviv','petra',
  'paris','nice','london','edinburgh','dublin','rome','venice','florence','milan','naples',
  'barcelona','madrid','seville','granada','lisbon','porto','amsterdam','brussels',
  'berlin','munich','frankfurt','prague','vienna','salzburg','budapest','zurich',
  'interlaken','lucerne','zermatt','copenhagen','stockholm','helsinki','oslo','reykjavik',
  'athens','santorini','dubrovnik','krakow','warsaw',
  'newyork','losangeles','sanfrancisco','lasvegas','honolulu','seattle','chicago',
  'boston','washington','orlando','miami','toronto','vancouver','banff',
  'mexicocity','cancun','rio','buenosaires','lima','cusco',
  'sydney','melbourne','goldcoast','brisbane','cairns','auckland','queenstown',
  'capetown','marrakech','nairobi',
]);

async function fillQuiz(){
  if (quizFilling) return;
  quizFilling = true;
  try {
    /* 기록 탭에서 별점을 매겨도 여기 남아 있던 것을 막습니다.
       주머니를 들고 있다가 그대로 다시 그려서 이미 매긴 곳이 또 나왔습니다.
       매번 매긴 목록을 받아 걸러냅니다. */
    {
      const r = await sb.from('city_ratings').select('city_id')
        .eq('user_id', me.id).not('stars', 'is', null);
      const done = new Set((r.data || []).map(x => x.city_id));
      quizPool = quizPool.filter(c => !done.has(c.id));
    }
    if (quizPool.length >= QUIZ_ROWS) return;
    /* 도시는 이미 다 받아 두었습니다. 서버에서 잘라 오면 id 순으로 붙어 있는
       구간이 나와서 오타루 · 오타와 · 옥스퍼드처럼 이름이 몰립니다.
       여기서 통째로 섞습니다. */
    await loadCities();
    const mine = await sb.from('city_ratings').select('city_id').eq('user_id', me.id);
    const rated = new Set((mine.data || []).map(r => r.city_id));
    const have  = new Set(quizPool.map(c => c.id));
    let pool = (cities || []).filter(c => !rated.has(c.id) && !have.has(c.id));
    /* 사진 있는 곳을 먼저 씁니다. 사진 칸을 못 받아온 경우에는 그냥 다 씁니다. */
    const withImg = pool.filter(c => c.image_url);
    if (withImg.length) pool = withImg;
    /* 피셔–예이츠. sort(() => Math.random()-0.5) 로 섞으면 앞쪽이 덜 움직입니다. */
    for (let i = pool.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    /* 처음 채울 때만 유명한 곳을 앞으로 당깁니다. 안에서는 여전히 무작위라
       열 때마다 다른 도시가 나옵니다. 다 보고 나면 다음부터는 치우침 없이
       뽑히므로, 다른 도시 보기를 누를수록 생소한 곳이 나옵니다. */
    if (!quizFilled)
      pool.sort((a, b) => (FAMOUS.has(b.id) ? 1 : 0) - (FAMOUS.has(a.id) ? 1 : 0));
    quizFilled++;
    quizPool = quizPool.concat(pool.slice(0, 40));
  } finally { quizFilling = false; }
}

const quizRow = c => `<div class="rrow" data-cityopen="${esc(c.id)}">
  ${c.image_url
    ? `<img class="thumb" src="${esc(c.image_url)}" alt="" loading="lazy"
           onerror="this.replaceWith(Object.assign(document.createElement('span'),
             {className:'thumb ph', textContent:'${esc(c.name.slice(0,1))}'}))">`
    : `<span class="thumb ph">${esc(c.name.slice(0,1))}</span>`}
  <div class="t"><b>${esc(c.name)}</b>
    <span class="memo">${esc(countryName[c.country] || c.country)}</span></div>
  <span class="stars" data-city="${esc(c.id)}">${starHtml(null)}</span>
  <button class="ghost want" data-want="${esc(c.id)}" title="가보고 싶어요">♡</button>
</div>`;

async function renderQuiz(){
  await fillQuiz();
  const list = quizPool.slice(0, QUIZ_ROWS);
  const box = document.createElement('div');
  box.className = 'card';
  box.innerHTML = `<h2>여기 가보셨어요?</h2>
    <div id="quizlist">${
      list.length ? list.map(quizRow).join('')
                  : '<div class="empty">물어볼 도시를 다 봤어요.</div>'}</div>
    ${list.length ? `<button class="ghost" id="quizmore" style="width:100%; margin-top:6px">
        다른 도시 보기</button>` : ''}`;
  $('home').appendChild(box);
}

async function renderFoot(){
  const [{ data: f }, vis] = await Promise.all([
    sb.rpc('my_footprint'),
    sb.rpc('my_visited'),          /* 작은 지도를 칠하려면 어디를 갔는지 알아야 합니다 */
  ]);
  if (!f) return;
  visited = new Set((vis.data || []).map(v => v.city_id));
  const pct = Math.min(100, f.countries / UN_COUNTRIES * 100);
  const box = document.createElement('div');
  box.className = 'card'; box.id = 'homefp'; box.style.cursor = 'pointer';
  box.innerHTML =
    `<div class="row" style="border:0; padding:0; margin:0">
       <span class="label" style="font-weight:650">내 발자국</span>
       <span class="val">더보기 ›</span></div>
     <div style="margin-top:8px; font-size:calc(15px * var(--ts))">${
       f.countries
         ? `${UN_COUNTRIES}개국 중 <b>${f.countries}개국</b> · ${pct.toFixed(1)}%`
         : '별점을 매기면 여기에 쌓입니다.'}</div>
     ${f.countries ? `<div class="fp"><i style="width:${Math.max(pct, 1.5)}%"></i></div>` : ''}
     <!-- 막대 아래에 지도도 같이. 숫자보다 칠해진 면적이 더 와닿습니다.
          지도 좌표는 이미 문서에 있으니 그대로 빌려 씁니다. -->
     <div class="minimap"><svg viewBox="0 19 1000 387"
       preserveAspectRatio="xMidYMid meet">${$('worldland').innerHTML}</svg></div>`;
  /* 다녀온 나라를 칠합니다. 누르면 큰 지도로 갑니다. */
  const gone = new Set((cities || []).filter(c => visited.has(c.id)).map(c => c.country));
  box.querySelectorAll('.minimap path').forEach(p =>
    p.classList.toggle('been', gone.has(p.dataset.c)));
  box.onclick = () => { showApp('set'); openMap(); };
  $('home').appendChild(box);
}

/* 별을 매긴 줄은 빠지고 그 자리에 다음 도시가 들어옵니다.
   화면을 통째로 다시 그리지 않아야 매기던 흐름이 안 끊깁니다. */
$('home').addEventListener('click', async e => {
  const st = e.target.closest('#quizlist .st');
  if (st){
    const wrap = st.closest('.stars'), row = st.closest('.rrow');
    const cityId = wrap.dataset.city;
    const box = st.getBoundingClientRect();
    const v = +st.dataset.n - ((e.clientX - box.left) < box.width / 2 ? 0.5 : 0);
    if (row.dataset.done) return;          /* 밀려나는 중에 또 누르는 것을 막습니다 */
    row.dataset.done = '1';

    /* 별이 차는 것을 먼저 보여주고, 잠깐 두었다가 밀어냅니다.
       바로 지우면 내가 몇 점을 줬는지 볼 새가 없습니다. */
    paintStars(wrap, v, true);
    markRated(row, v);
    await saveRate(cityId, { stars: v }, true);
    quizPool = quizPool.filter(c => c.id !== cityId);

    setTimeout(() => {
      row.classList.add('gone');
      setTimeout(async () => {
        row.remove();
        await fillQuiz();
        const shown = new Set([...document.querySelectorAll('#quizlist .rrow')]
          .map(r => r.dataset.cityopen));
        const nx = quizPool.find(c => !shown.has(c.id));
        if (nx) $('quizlist').insertAdjacentHTML('beforeend', quizRow(nx));
      }, 280);
    }, 620);
    return;
  }
  const w = e.target.closest('#quizlist button[data-want]');
  if (w){
    const on = !myRates[w.dataset.want]?.want;
    await saveRate(w.dataset.want, { want: on });
    w.classList.toggle('on', on);
    return;
  }
  /* 다섯 곳 다 모르는 곳일 수 있습니다. 통째로 갈아치웁니다. */
  if (e.target.closest('#quizmore')){
    quizPool = quizPool.slice(QUIZ_ROWS);
    return loadHome();
  }
  const row = e.target.closest('#quizlist .rrow');
  if (row) return openCity(row.dataset.cityopen);
});

/* ── 알림 ── 만드는 쪽은 아직 없습니다. 읽는 자리를 먼저 잡아둡니다. */
/* ── 내 발자국 ──────────────────────────────────────────────────────
 * 왓챠의 "696 평가 · 27 코멘트" 줄을 여행판으로 옮긴 것입니다.
 * 대륙별로 쪼개면 어디가 비었는지 보이고, 진행률은 채우고 싶게 만듭니다. */
const UN_COUNTRIES = 195;   /* UN 회원 193 + 옵서버 2. 여행앱들이 쓰는 기준값 */

async function loadFootprint(){
  const { data, error } = await sb.rpc('my_footprint');
  if (error || !data) return;
  const f = data;
  $('s_country').textContent = f.countries;
  $('s_city').textContent    = f.cities;
  $('s_rated').textContent   = f.rated;
  /* 한줄평 수는 my_footprint 에 없습니다. 개수만 따로 셉니다. */
  sb.from('city_ratings').select('city_id', { count:'exact', head:true })
    .eq('user_id', me.id).not('comment', 'is', null)
    .then(r => { $('s_comment').textContent = r.count ?? 0; });
  $('s_rated2').textContent  = f.rated;
  /* 맛집은 일정 줄에 매기므로 my_footprint 에 없습니다. 따로 셉니다.
     평가 화면에서 관광지도 매기게 했더니 그것까지 세어 18 로 나왔습니다.
     목록은 식사·카페만 보여주므로 세는 것도 같은 기준이어야 합니다. */
  sb.from('plan_ratings')
    .select('plan_id, plans!inner(category)', { count:'exact', head:true })
    .eq('user_id', me.id).not('stars', 'is', null)
    .in('plans.category', ['식사', '카페'])
    .then(r => { $('s_place').textContent = r.count ?? 0; });
  $('s_want').textContent    = f.wants;
  $('s_trips').textContent   = f.trips;

  const pct = Math.min(100, f.countries / UN_COUNTRIES * 100);
  $('s_prog').innerHTML = f.countries
    ? `${UN_COUNTRIES}개국 중 <b>${f.countries}개국</b> · ${pct.toFixed(1)}%
       <div class="bar"><i style="width:${Math.max(pct, 1.5)}%"></i></div>`
    : '다녀온 곳을 표시하면 여기에 쌓입니다.';

  const by = f.by_continent || {};
  $('s_cont').innerHTML = Object.entries(by)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `<span class="day" style="cursor:default">${esc(k)}
       <span class="n">${n}</span></span>`).join('');
}

/* ── 후보와 빈 시간 ──────────────────────────────────────────────────
 * 도쿄 앱에서 가장 잘 굴러가던 기능입니다. 가고 싶은 곳을 모아두고,
 * 일정 사이에 뜬 시간에 "여기 넣을 수 있어요"라고 알려줍니다.
 *
 * 도쿄에서 겪은 세 가지를 그대로 가져와 막습니다.
 *   1. 밤에서 아침으로 걸친 구간을 빈 시간으로 잡던 것 (Day2 02:38~10:00)
 *      → 낮 시간대로 잘라내고, 그러고도 한 시간이 남을 때만 씁니다.
 *   2. 앞뒤 일정과 사실상 같은 자리를 또 제안하던 것
 *      (우에노 공원을 우에노 온시 공원 옆에)  → 0.3km 안쪽이면 거릅니다.
 *   3. 체류 시간으로 자르면 아무것도 안 남던 것
 *      → 오가는 시간을 뺀 "머물 수 있는 시간"을 보여주고 사용자가 정하게 합니다.
 *
 * 이동 시간은 도쿄의 고정식 대신 v2 의 구간별 상수를 씁니다. 이쪽이 낫습니다. */
const STAY = { 카페:40, 식사:60, 관광:90, 쇼핑:60, 이동:30, 숙소:0, 기타:60 };
const stayMin = c => STAY[c] ?? 60;
const DAY_START = 9 * 60, DAY_END = 21 * 60;   /* 이 밖은 자거나 쉬는 시간으로 봅니다 */
const SAME_KM = 0.3;                           /* 이보다 가까우면 사실상 같은 자리 */
let cands = [], fitList = [];

const toMin = t => { const m = String(t || '').match(/^(\d{1,2}):(\d{2})/);
                     return m ? +m[1] * 60 + +m[2] : 9999; };
const hhmm = m => { m = Math.max(0, Math.round(m));
                    return ('0' + Math.floor(m / 60) % 24).slice(-2) +
                           ':' + ('0' + (m % 60)).slice(-2); };
const legOf = d => (legs || []).find(l => d >= l.start_date && d <= l.end_date) || (legs || [])[0];
const tmin = (km, d) => { const g = legOf(d); const t = travel(km, g);
                          return t ? t.min : Math.round(km * 3.5 + 13); };

function planGaps(){
  const byDay = {}, out = [];
  (plans || []).forEach(p => (byDay[p.date] = byDay[p.date] || []).push(p));
  Object.keys(byDay).forEach(d => {
    const list = byDay[d].slice().sort((a, b) => toMin(a.start_time) - toMin(b.start_time));
    for (let i = 0; i < list.length - 1; i++){
      const a = list[i], b = list[i + 1];
      const t1 = toMin(a.start_time), t2 = toMin(b.start_time);
      if (t1 >= 9999 || t2 >= 9999) continue;
      /* v2 는 끝 시각을 받으므로 있으면 그걸 씁니다. 도쿄는 없어서 늘 어림했습니다. */
      const e = toMin(a.end_time);
      const aEnd = e < 9999 ? e : t1 + stayMin(a.category);
      if (t2 - aEnd < 60) continue;              /* 한 시간도 안 남으면 넣을 자리가 아닙니다 */
      const from = Math.max(aEnd, DAY_START), to = Math.min(t2, DAY_END);
      if (to - from < 60) continue;
      out.push({ date:d, after:a, before:b, from, to });
    }
  });
  return out;
}

function findFits(){
  const gaps = planGaps();
  const cs = cands.filter(c => c.lat != null && c.lng != null);
  const best = {};
  gaps.forEach(g => {
    if (g.after.lat == null || g.before.lat == null) return;
    cs.forEach(c => {
      const dA = distKm(g.after.lat, g.after.lng, c.lat, c.lng);
      const dB = distKm(c.lat, c.lng, g.before.lat, g.before.lng);
      if (dA == null || dB == null) return;
      if (dA < SAME_KM || dB < SAME_KM) return;
      const go = tmin(dA, g.date), back = tmin(dB, g.date);
      const avail = (g.to - g.from) - go - back;
      if (avail < 40) return;                    /* 40분도 안 되면 갈 만하지 않습니다 */
      if (best[c.id] && best[c.id].avail >= avail) return;
      best[c.id] = { cand:c, date:g.date, at:g.from + go, go, back, avail,
                     tight: avail < stayMin(c.category), after:g.after.title };
    });
  });
  return Object.values(best)
    .sort((a, b) => (b.avail - a.avail) || (a.go - b.go)).slice(0, 3);
}

function drawCands(){
  fitList = findFits();
  $('fits').innerHTML = fitList.length
    ? `<div class="daysep">빈 시간에 넣기 좋은 곳</div>` + fitList.map((f, i) =>
        `<div class="picked" style="align-items:flex-start; margin-bottom:8px">
           <div class="p" style="min-width:0">
             <b>${esc(f.cand.title)}</b>
             <div class="c">${esc(dayLabel(f.date, trip))} · ${hhmm(f.at)}쯤</div>
             <div class="c">${esc(f.after)}에서 ${f.go}분 · 머물 수 있는 시간
               <b>${f.avail}분</b> · 다음까지 ${f.back}분${
               f.tight ? ' · 짧게 보고 나와야 합니다' : ''}</div>
           </div>
           <button class="small" data-fit="${i}">넣기</button>
         </div>`).join('')
    : '';

  $('cands').innerHTML = cands.length
    ? cands.map(c => `<div class="row">
        <span class="label"><b>${esc(c.title)}</b>${
          c.lat == null ? ' <span class="val">좌표 없음</span>' : ''}
          ${c.memo ? `<div class="memo">${esc(c.memo)}</div>` : ''}</span>
        <button class="ghost" data-canddel="${esc(c.id)}"
                style="color:var(--bad)">×</button></div>`).join('')
    : '<div class="empty">담아둔 곳이 없어요. AI 제안에서 담거나 아래에 적으세요.</div>';
  drawGeoBtn();
}

/* ── 좌표 채우기 ─────────────────────────────────────────────────────
 * 좌표가 없으면 빈 시간 계산과 이동 어림에서 그 줄이 통째로 빠집니다.
 * 도쿄 앱처럼 OpenStreetMap 을 씁니다 — 키도 한도도 없고 AI 횟수도 안 씁니다.
 * 다만 초당 한 번이 그쪽 규칙이라 사이를 띄우고, 실패하면 더 두드리지 않습니다. */
let geoBusy = false;

/* 일정 제목은 장소 이름이 아닌 게 많습니다.
 * "호텔 ➡️ 콜로세움 이동"은 두 지점이고 "트라스테베레 산책 & 저녁"은 할 일입니다.
 * 찾을 만한 이름을 뽑아 넓혀가며 시도합니다.
 * 이동 줄은 도착지를 씁니다 — 그 일정이 끝났을 때 서 있는 자리가 도착지입니다. */
function geoQueries(title){
  const t = String(title || '').replace(/[➡→⇒]️?|->/g, '>').replace(/\s+/g, ' ').trim();
  const out = [];
  const add = s => { s = String(s || '').replace(/\s+/g, ' ').trim();
                     if (s && !out.includes(s)) out.push(s); };
  const main = t.includes('>') ? t.split('>').pop() : t;
  add(main.replace(/\s*이동\s*$/, ''));
  if (!t.includes('>')) add(t);
  const base = main.split(/[&/·,]/)[0]
    .replace(/(쇼핑|점심|저녁|아침|브런치|산책|구경|관람|투어|체험|픽업|이동|출발|도착|입국|출국|체크인|체크아웃)/g, ' ');
  add(base);
  add(base.trim().split(' ')[0]);
  return out.slice(0, 3);
}

async function osmLookup(q){
  const u = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' +
            encodeURIComponent(q);
  try {
    const r = await fetch(u, { headers: { 'Accept-Language': 'ko,en' } });
    if (!r.ok) return r.status === 429 ? 'stop' : null;
    const a = await r.json();
    if (!a?.length) return null;
    const lat = Number(a[0].lat), lng = Number(a[0].lon);
    return (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) ? { lat, lng } : null;
  } catch { return null; }
}

/* 좌표가 없는 것들. 일정과 후보를 한 목록으로 다룹니다 —
   버튼을 따로 두면 두 번 눌러야 하고 어느 쪽이 남았는지도 헷갈립니다. */
const needCoord = () => [
  ...(plans || []).filter(p => p.lat == null)
    .map(p => ({ kind:'plans', id:p.id, title:p.title, date:p.date })),
  ...(cands || []).filter(c => c.lat == null)
    .map(c => ({ kind:'candidates', id:c.id, title:c.title })),
];

function drawGeoBtn(){
  const list = needCoord();
  const np = list.filter(x => x.kind === 'plans').length;
  const b = $('geobtn');
  b.classList.toggle('hide', !list.length && !geoBusy);
  /* 일정 몇 곳인지 같이 적습니다. 후보가 비어 있으면 왜 뜨는지 모릅니다. */
  b.textContent = geoBusy ? '중단하기'
    : `좌표 채우기 · ${list.length}곳` + (np ? ` (일정 ${np}곳 포함)` : '');
}

$('geobtn').addEventListener('click', async () => {
  if (geoBusy){ geoBusy = false; return; }
  const list = needCoord();
  if (!list.length) return;
  geoBusy = true; drawGeoBtn();
  let done = 0, miss = 0;

  for (const it of list){
    if (!geoBusy) break;
    /* 도시 이름을 붙여야 같은 이름이 여러 나라에 있을 때 엉뚱한 데로 안 갑니다. */
    const city = (legOf(it.date) || (legs || [])[0])?.destination || trip?.destination || '';
    let hit = null;
    for (const q of geoQueries(it.title)){
      hit = await osmLookup(city && !q.includes(city) ? `${q} ${city}` : q);
      if (hit === 'stop'){ geoBusy = false; break; }
      if (hit) break;
      await new Promise(r => setTimeout(r, 1100));   /* 초당 한 번이 그쪽 규칙입니다 */
    }
    if (!geoBusy) break;
    if (hit && hit !== 'stop'){
      const r = await sb.from(it.kind).update({ lat: hit.lat, lng: hit.lng })
        .eq('id', it.id).select('id');
      if (!r.error && r.data?.length) done++;
    } else miss++;
    $('geobtn').textContent = `채우는 중… ${done + miss}/${list.length}`;
    await new Promise(r => setTimeout(r, 1100));
  }

  geoBusy = false;
  await loadPlans();
  await loadCands();
  if (miss) fail(`${done}곳을 채웠어요. ${miss}곳은 못 찾았어요 — ` +
                 `이름을 장소 이름으로 고치면 찾을 수 있어요.`, 'cand');
}, false);

async function loadCands(){
  if (!trip) return;
  const r = await sb.from('candidates')
    .select('id,title,title_local,category,memo,lat,lng')
    .eq('trip_id', trip.id).is('deleted_at', null).order('created_at');
  if (r.error) return fail(r.error, 'cand');
  cands = r.data || [];
  drawCands();
}

$('candbtn').addEventListener('click', async () => {
  $('card-cand').classList.remove('hide');
  $('card-cand').scrollIntoView({ behavior:'smooth', block:'nearest' });
  await loadCands();
});
$('candclose').addEventListener('click', () => $('card-cand').classList.add('hide'));

$('c_add').addEventListener('click', async () => {
  const t = $('c_title').value.trim();
  if (!t) return;
  /* 좌표는 안 받습니다. AI 제안으로 담으면 좌표가 같이 옵니다.
     손으로 적은 것은 좌표가 없어 빈 시간 계산에서는 빠집니다. */
  const r = await sb.from('candidates')
    .insert({ trip_id: trip.id, title: t, source: 'manual' }).select('id');
  if (r.error) return fail(r.error, 'cand');
  if (!r.data?.length) return fail('저장되지 않았습니다 (0건).', 'cand');
  $('c_title').value = '';
  await loadCands();
});
$('c_title').addEventListener('keydown', e => { if (e.key === 'Enter') $('c_add').click(); });

$('card-cand').addEventListener('click', async e => {
  const f = e.target.closest('[data-fit]');
  if (f){
    /* 제안한 자리 그대로 일정 칸을 채워 엽니다. 날짜와 시각까지 미리 넣습니다. */
    const x = fitList[+f.dataset.fit]; if (!x) return;
    $('addplanbtn').click();
    $('p_title').value = x.cand.title;
    $('p_date').value  = x.date;
    $('p_start').value = hhmm(x.at);
    $('p_end').value   = hhmm(x.at + Math.min(x.avail, stayMin(x.cand.category)));
    $('p_cat').value   = x.cand.category || '';
    $('p_memo').value  = x.cand.memo || '';
    $('card-cand').classList.add('hide');
    $('plancard').scrollIntoView({ behavior:'smooth', block:'nearest' });
    return;
  }
  const d = e.target.closest('[data-canddel]');
  if (d){
    const r = await sb.from('candidates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', d.dataset.canddel).select('id');
    if (r.error) return fail(r.error, 'cand');
    if (!r.data?.length) return fail('지워지지 않았습니다 (0건).', 'cand');
    await loadCands();
  }
});

/* ── AI 일정 초안 ────────────────────────────────────────────────────
 * 문서가 "P를 끌어오는 핵심"이라고 한 자리입니다.
 * 짜준 것을 바로 넣지 않습니다. 계산으로 한 번 검사해서 보여주고,
 * 넣을지는 사람이 정합니다 — AI 는 쓰지 않고 제안만 합니다. */
let draftTrip = null, draftOut = null;

/* 짜준 것을 기기에 남겨둡니다. 화면을 나갔다 오면 사라지던 것을 막습니다 —
   AI 횟수를 써서 받은 결과인데 넣기도 전에 날리면 안 됩니다.
   서버에 두지 않는 것은 아직 내 것도 아닌 초안이기 때문입니다.
   넣거나 지우면 그때 없앱니다. */
const DKEY = id => 't2:draft:' + id;
function saveDraft(id, out){
  try { localStorage.setItem(DKEY(id), JSON.stringify({ ...out, at: Date.now() })); }
  catch {}                              /* 저장 공간이 꽉 차도 초안 자체는 살아 있습니다 */
}
function readDraft(id){
  try {
    const s = localStorage.getItem(DKEY(id));
    if (!s) return null;
    const d = JSON.parse(s);
    /* 두 주가 지난 초안은 여행 날짜가 지났을 수 있습니다. 붙들고 있지 않습니다. */
    if (!d?.actions?.length || Date.now() - (d.at || 0) > 14 * 864e5){
      localStorage.removeItem(DKEY(id)); return null;
    }
    return d;
  } catch { return null; }
}
const dropDraft = id => { try { localStorage.removeItem(DKEY(id)); } catch {} };

async function openDraft(){
  const today = ymd(new Date());
  const { data } = await sb.from('trips')
    .select('id,title,destination,start_date,end_date')
    .gte('end_date', today).order('start_date').limit(20);

  ['homeview','listview','rateview','aiview','setview','cityview']
    .forEach(v => $(v).classList.add('hide'));
  $('draftview').classList.remove('hide');
  window.scrollTo({ top:0 });
  if (history.state?.t2 !== 'draft') history.pushState({ t2:'draft' }, '');

  /* 여행이 하나도 없으면 새로 만드는 쪽이 처음부터 열려 있어야 합니다. */
  const list = data || [];
  draftTrip = list.some(t => t.id === draftTrip) ? draftTrip
            : (list[0]?.id || 'new');
  $('d_trips').innerHTML = list.map(t => {
    const n = Math.round((asDate(t.end_date) - asDate(t.start_date)) / D1) + 1;
    return `<span class="day${t.id === draftTrip ? ' on' : ''}" data-dtrip="${esc(t.id)}">
      ${esc(t.title)} <span class="n">${n}일</span></span>`;
  }).join('') +
    `<span class="day${draftTrip === 'new' ? ' on' : ''}" data-dtrip="new">새 여행</span>`;

  await loadCities();
  fillCityList();
  $('d_new').classList.toggle('hide', draftTrip !== 'new');
  if (!$('d_start').value) $('d_start').value = ymd(new Date(Date.now() + 14 * D1));
  $('drafterr').classList.add('hide');
  showSavedDraft();
}

/* 저장해 둔 초안이 있으면 되살립니다. 없으면 결과 자리를 비웁니다. */
function showSavedDraft(){
  const d = draftTrip && draftTrip !== 'new' ? readDraft(draftTrip) : null;
  if (d){ draftOut = d; drawDraft(); $('d_go').textContent = '다시 짜기'; }
  else  { draftOut = null; $('d_result').innerHTML = ''; $('d_go').textContent = '일정 짜기'; }
}

/* 새 여행을 골랐으면 먼저 만듭니다. 만들어야 구간이 생기고,
   구간이 있어야 도시별로 짤 수 있습니다. 만든 여행의 id 를 돌려줍니다. */
async function makeDraftTrip(){
  const name = $('d_city').value.trim();
  const start = $('d_start').value;
  const n = Math.min(30, Math.max(1, Number($('d_days').value) || 0));
  if (!name)  { fail('어디로 가는지 골라주세요.', 'draft'); return null; }
  if (!start) { fail('시작하는 날을 골라주세요.', 'draft'); return null; }

  const city = (cities || []).find(c =>
    [c.name, c.name_en, c.name_local].some(v => v && v.toLowerCase() === name.toLowerCase()));
  const end = ymd(new Date(asDate(start).getTime() + (n - 1) * D1));

  const row = { title: `${city ? city.name : name} 여행`,
                destination: city ? city.name : name,
                start_date: start, end_date: end };
  if (city) row.city_id = city.id;      /* 나라·통화·시간대·이동상수는 트리거가 채웁니다 */

  const r = await sb.from('trips').insert(row).select('id').maybeSingle();
  if (r.error){ fail(r.error, 'draft'); return null; }
  if (!r.data?.id){ fail('여행이 만들어지지 않았습니다.', 'draft'); return null; }
  return r.data.id;
}

function closeDraft(fromPop){
  if (!fromPop && history.state?.t2 === 'draft'){ history.back(); return; }
  $('draftview').classList.add('hide');
  $('reviewview').classList.add('hide');
  showApp('home');
}
$('draftback').addEventListener('click', () => closeDraft());

/* 칩 고르기. 속도와 아침은 하나만, 뭘 위주로는 여러 개입니다. */
$('draftview').addEventListener('click', e => {
  const t = e.target.closest('[data-dtrip]');
  if (t){
    draftTrip = t.dataset.dtrip;
    document.querySelectorAll('#d_trips .day').forEach(x =>
      x.classList.toggle('on', x.dataset.dtrip === draftTrip));
    $('d_new').classList.toggle('hide', draftTrip !== 'new');
    showSavedDraft();          /* 여행마다 초안이 따로 있습니다 */
    return;
  }
  for (const [box, key] of [['d_pace','pace'], ['d_morning','morning']]){
    const one = e.target.closest(`#${box} [data-${key}]`);
    if (one){
      document.querySelectorAll(`#${box} .day`).forEach(x => x.classList.remove('on'));
      one.classList.add('on');
      return;
    }
  }
  const f = e.target.closest('#d_focus [data-focus]');
  if (f) return f.classList.toggle('on');
});

$('d_go').addEventListener('click', async () => {
  if (!draftTrip) return fail('여행을 골라주세요.', 'draft');
  $('drafterr').classList.add('hide');
  $('d_go').disabled = true; $('d_go').textContent = '짜는 중… 20초쯤 걸립니다';
  $('d_result').innerHTML = '';

  /* 새 여행이면 먼저 만들고 그 여행에 짭니다. */
  if (draftTrip === 'new'){
    $('d_go').textContent = '여행 만드는 중…';
    const id = await makeDraftTrip();
    if (!id){ $('d_go').disabled = false; $('d_go').textContent = '일정 짜기'; return; }
    draftTrip = id;
    $('d_go').textContent = '짜는 중… 20초쯤 걸립니다';
  }

  const prefs = {
    pace:    document.querySelector('#d_pace .on')?.dataset.pace || 'normal',
    morning: document.querySelector('#d_morning .on')?.dataset.morning || 'early',
    focus:   [...document.querySelectorAll('#d_focus .on')].map(x => x.dataset.focus),
  };
  const { data, error } = await sb.functions.invoke('chat',
    { body: { trip_id: draftTrip, mode: 'draft', prefs,
              message: $('d_note').value.trim() || null } });

  $('d_go').disabled = false; $('d_go').textContent = '다시 짜기';

  if (error){
    let why = error.message;
    try { why = (await error.context?.json())?.error || why; } catch {}
    return fail(/not found|Failed to send/i.test(why)
      ? 'chat 함수가 아직 올라가 있지 않습니다. Supabase → Edge Functions 에서 배포해주세요.'
      : why, 'draft');
  }
  if (data?.error) return fail(data.error, 'draft');
  if (!data?.actions?.length)
    return fail('일정을 만들지 못했습니다. 다시 눌러보세요.', 'draft');

  draftOut = data;
  saveDraft(draftTrip, data);
  drawDraft();
});

function drawDraft(){
  const acts = [...(draftOut.actions || [])]
    .sort((a, b) => (a.date + (a.start_time || '99:99'))
                     .localeCompare(b.date + (b.start_time || '99:99')));
  /* 짜준 것을 그대로 믿지 않습니다. 우리 계산기로 한 번 훑습니다 — 공짜입니다. */
  const t = { start_date: acts[0].date, end_date: acts[acts.length - 1].date };
  const found = review(t, acts.map(a => ({ ...a, id: 'x' })), legs || []);
  const bad = found.filter(f => f.lv === '심각');

  const days = draftOut.days || [...new Set(acts.map(a => a.date))].sort();
  const empty = days.filter(d => !acts.some(a => a.date === d));

  const byDay = {};
  acts.forEach(a => (byDay[a.date] = byDay[a.date] || []).push(a));

  $('d_result').innerHTML =
    `<div class="card">
       <h2>이렇게 짜봤어요 <span class="val">${acts.length}개</span></h2>
       ${draftOut.reply ? `<div class="memo" style="margin-bottom:10px">${
         esc(draftOut.reply).slice(0, 400)}</div>` : ''}
       ${bad.length || empty.length
         ? `<div class="row" style="border:0; padding:0 0 10px; margin:0">
              <span class="kdot" style="margin-top:6px; background:var(--bad)"></span>
              <span class="label"><b>넣기 전에 봐주세요</b>
                <div class="memo">${esc([
                  ...bad.slice(0, 3).map(f => f.t),
                  empty.length ? `${empty.length}일이 비어 있어요` : ''
                ].filter(Boolean).join(' · '))}</div></span>
            </div>`
         : `<div class="memo" style="margin-bottom:10px">
              겹치거나 무리한 일정은 없어요.</div>`}

       ${days.map(d => `<div style="margin-top:10px">
         <div class="label" style="font-weight:650">${esc(dayLabel(d, { start_date: days[0] }))}</div>
         ${(byDay[d] || []).map(a => `<div class="plan">
            <div class="when">${esc(a.start_time || '–')}</div>
            <span class="kdot ${a.category ? 'k-' + esc(a.category) : ''}"></span>
            <div class="body"><b>${esc(a.title)}</b>${
              a.memo ? `<span class="memo">${esc(a.memo)}</span>` : ''}</div>
          </div>`).join('') || '<div class="empty">이 날은 비어 있어요.</div>'}
       </div>`).join('')}

       <button class="primary" id="d_apply" style="width:100%; margin-top:14px">
         이대로 ${acts.length}개 넣기</button>
       <button class="ghost" id="d_drop" style="width:100%; margin-top:6px">
         이 초안 지우기</button>
       <div class="memo" style="text-align:center; margin-top:8px">
         넣은 뒤에도 하나씩 고치거나 지울 수 있어요.
         넣기 전까지는 이 초안이 기기에 남아 있어요.</div>
     </div>`;

  $('d_drop').onclick = () => { dropDraft(draftTrip); showSavedDraft(); };

  $('d_apply').onclick = async () => {
    $('d_apply').disabled = true; $('d_apply').textContent = '넣는 중…';
    const rows = acts.map(a => ({
      trip_id: draftTrip, date: a.date, start_time: a.start_time,
      title: a.title, category: a.category, memo: a.memo,
      lat: a.lat, lng: a.lng, created_by: me.id,
    }));
    /* RLS 에 막히면 오류가 아니라 0행이 돌아옵니다. 넣은 수를 반드시 세야 합니다. */
    const r = await sb.from('plans').insert(rows).select('id');
    if (r.error){ $('d_apply').disabled = false; return fail(r.error, 'draft'); }
    if (!r.data?.length){
      $('d_apply').disabled = false;
      return fail('하나도 넣지 못했습니다. 이 여행에 쓸 권한이 있는지 확인해주세요.', 'draft');
    }
    dropDraft(draftTrip);          /* 넣었으니 더 들고 있을 이유가 없습니다 */
    closeDraft();
    openTrip(draftTrip);
  };
}

/* ── 세계지도와 통계 ─────────────────────────────────────────────────
 * 숫자만 늘어놓으면 아무도 안 봅니다. 지도 위에 얹어야 채우고 싶어집니다.
 *
 * 퍼센트는 국가로만 셉니다. 도시는 우리가 가진 313곳이 분모라
 * "전 세계 도시의 몇 퍼센트"라고 말할 수가 없습니다.
 * 분모는 UN 기준 195개국(회원 193 + 옵서버 2)을 대륙별로 나눈 수입니다. */
const CONT = [['아시아', 48], ['유럽', 44], ['아프리카', 54],
              ['북아메리카', 23], ['남아메리카', 12], ['오세아니아', 14]];
/* 대륙별로 당겨 보는 자리. 가운데와 폭만 정하고 높이는 화면 비율에서 냅니다 —
   그래야 viewBox 비율이 화면과 같아져서 여백 없이 딱 맞고, 손가락 좌표를
   지도 좌표로 바꾸는 계산도 한 줄로 끝납니다. */
const CONT_VIEW = {
  '전체':      { cx:500, cy:212, w:1000 },
  '아시아':    { cx:750, cy:193, w:380 },
  '유럽':      { cx:549, cy:105, w:195 },
  '아프리카':  { cx:544, cy:248, w:225 },
  '북아메리카':{ cx:195, cy:145, w:360 },
  '남아메리카':{ cx:340, cy:307, w:160 },
  '오세아니아':{ cx:897, cy:328, w:215 } };

const px = v => (Number(v) + 180) * (1000 / 360);   /* 경도 → x */
const py = v => (90 - Number(v)) * (500 / 180);     /* 위도 → y */
let mapCities = [], mapView = '전체';

/* 확대하면 깃발이 같이 커집니다. 화면에서 늘 같은 크기로 보이게 다시 그립니다.
   깃발 원본은 9칸 높이라, 화면에서 원하는 픽셀 크기를 그걸로 나눠 배율을 냅니다. */
function drawPins(){
  const wpx = $('worldsvg').getBoundingClientRect().width || 360;
  const k = 16 / 11 * vb.w / wpx;      /* 깃발 원본이 11칸이라 화면에서 16픽셀쯤 */
  /* 깃대는 아래가 뾰족한 막대, 깃발은 끝이 제비꼬리인 사각형입니다.
     둘 다 모서리를 둥글게 이어 붙여 작게 그려도 뭉개지지 않습니다. */
  const POLE = 'M-.62 .6L0 1.5.62 .6V-10.4H-.62Z';
  const FLAG = 'M.3 -10.5H5.9L4.7 -8.7 5.9 -6.9H.3Z';
  $('pins').innerHTML = mapCities
    .filter(c => c.center_lat != null && c.center_lng != null)
    .map(c => `<g data-pin="${esc(c.id)}" transform="translate(${
        px(c.center_lng).toFixed(1)} ${py(c.center_lat).toFixed(1)}) scale(${k.toFixed(3)})">
        <title>${esc(c.name)}</title>
        <path class="mkpole" d="${POLE}"/>
        <path class="mkflag" d="${FLAG}"/>
      </g>`).join('');
}

/* 보이는 창. 가운데와 폭만 들고 있고 높이는 화면 비율에서 냅니다. */
let vb = { ...CONT_VIEW['전체'] };
const MAP_TOP = 15, MAP_BOT = 410;      /* 남극을 뺀 세로 범위 */

function applyView(){
  const el = $('worldsvg'), r = el.getBoundingClientRect();
  const aspect = (r.width && r.height) ? r.height / r.width : 0.4;
  vb.w = Math.min(1000, Math.max(40, vb.w));        /* 40 이면 도시 하나가 꽉 찹니다 */
  const h = vb.w * aspect;
  /* 세로가 지도보다 길면 위아래에 빈 자리를 둡니다.
     가로를 줄여 맞추던 것이 문제였습니다 — 손가락으로 키워도 여기서 도로
     계산해 버려서 크게 보기에서는 확대가 아예 안 먹었습니다. */
  const span = MAP_BOT - MAP_TOP, mid = (MAP_TOP + MAP_BOT) / 2;
  vb.cx = Math.min(1000 - vb.w / 2, Math.max(vb.w / 2, vb.cx));
  vb.cy = h >= span ? mid
        : Math.min(MAP_BOT - h / 2, Math.max(MAP_TOP + h / 2, vb.cy));
  el.setAttribute('viewBox',
    `${(vb.cx - vb.w / 2).toFixed(1)} ${(vb.cy - h / 2).toFixed(1)} ` +
    `${vb.w.toFixed(1)} ${h.toFixed(1)}`);
  drawPins();
}

function setMapView(name){
  mapView = name;
  vb = { ...(CONT_VIEW[name] || CONT_VIEW['전체']) };
  applyView();
}
/* 두 번 두드리면 세계 전체로 돌아옵니다. 대륙 칩을 뺐으니 되돌릴 길이 있어야 합니다. */
$('worldsvg').addEventListener('dblclick', () => setMapView('전체'));

/* 크게 보기 — 지도만 화면을 다 덮습니다. 손바닥만 한 지도에서는
   대륙을 파고들며 보기가 어렵습니다. */
/* 큰 지도를 켠 채로 화면을 벗어나면 어두운 판과 단추가 그대로 남아
   앱 전체를 덮어버립니다. 화면을 옮길 때마다 여기서 걷어냅니다. */
function shutBigMap(){
  document.querySelector('.mapwrap')?.classList.remove('big');
  ['mapclose','mapzoombtns'].forEach(id => $(id)?.remove());
  document.body.classList.remove('sheeton');
}

$('mapbig').addEventListener('click', () => {
  const w = document.querySelector('.mapwrap');
  if (w.classList.contains('big')) return;
  w.classList.add('big');
  document.body.classList.add('sheeton');        /* 뒤가 밀리지 않게 */

  const add = (id, html, css) => {
    const el = document.createElement(id === 'mapzoombtns' ? 'div' : 'button');
    el.id = id; el.innerHTML = html; if (css) el.style.cssText = css;
    document.body.appendChild(el); return el;
  };
  const close = add('mapclose', '닫기');
  const zoom  = add('mapzoombtns',
    '<button data-z="in">+</button><button data-z="out">−</button>' +
    '<button data-z="fit">전체</button>');

  /* 손가락이 안 먹는 기기도 있고 마우스만 있는 화면도 있습니다.
     가운데를 잡고 폭만 줄이거나 늘립니다. */
  zoom.onclick = e => {
    const b = e.target.closest('[data-z]'); if (!b) return;
    if (b.dataset.z === 'fit'){ setMapView('전체'); return; }
    vb.w *= b.dataset.z === 'in' ? 1 / 1.45 : 1.45;
    applyView();
  };
  close.onclick = () => { shutBigMap(); setMapView('전체'); };

  /* 세로로 긴 화면에서 세계 전체를 펼치면 위아래가 텅 빕니다.
     열 때는 빈 곳 없이 꽉 차는 배율에서 시작하고, 전체는 단추로 봅니다. */
  applyView();
  const r = $('worldsvg').getBoundingClientRect();
  const aspect = (r.width && r.height) ? r.height / r.width : .4;
  vb.w = Math.min(1000, (MAP_BOT - MAP_TOP) / aspect);
  vb.cy = (MAP_TOP + MAP_BOT) / 2;
  /* 다녀온 곳이 있으면 그쪽을 가운데 둡니다 — 빈 바다를 보여줄 이유가 없습니다. */
  const xs = mapCities.filter(c => c.center_lng != null).map(c => px(c.center_lng));
  if (xs.length) vb.cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  applyView();
});

/* ── 손가락과 휠 ─────────────────────────────────────────────────────
 * 대륙 칩만으로는 원하는 데를 못 봅니다. 끌어서 옮기고 오므려서 키웁니다.
 * viewBox 비율을 화면 비율과 같게 맞춰뒀으므로 화면 픽셀 하나가
 * 지도 좌표 (폭/화면폭) 만큼입니다 — 변환이 곱셈 한 번입니다. */
{
  const el = $('worldsvg');
  const pts = new Map();          /* 지금 눌린 손가락들 */
  let last = null, moved = 0;

  const perPx = () => vb.w / (el.getBoundingClientRect().width || 1);
  const mid = () => {
    const a = [...pts.values()];
    return { x: a.reduce((s, p) => s + p.x, 0) / a.length,
             y: a.reduce((s, p) => s + p.y, 0) / a.length };
  };
  const spread = () => {
    const a = [...pts.values()];
    return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1;
  };

  el.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, { x:e.clientX, y:e.clientY });
    el.setPointerCapture(e.pointerId);
    el.classList.add('drag');
    moved = 0;
    last = pts.size === 2 ? { ...mid(), d: spread() } : { ...mid(), d: null };
  });

  el.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x:e.clientX, y:e.clientY });
    const m = mid();
    if (!last){ last = { ...m, d: pts.size === 2 ? spread() : null }; return; }

    const k = perPx();
    vb.cx -= (m.x - last.x) * k;         /* 끄는 방향과 지도가 같이 움직여야 합니다 */
    vb.cy -= (m.y - last.y) * k;
    moved += Math.abs(m.x - last.x) + Math.abs(m.y - last.y);

    if (pts.size === 2 && last.d){
      const d = spread();
      vb.w *= last.d / d;                /* 벌리면 폭이 줄고 = 확대 */
      last.d = d;
    }
    last.x = m.x; last.y = m.y;
    applyView();
  });

  const up = e => {
    pts.delete(e.pointerId);
    last = pts.size ? { ...mid(), d: pts.size === 2 ? spread() : null } : null;
    if (!pts.size) el.classList.remove('drag');
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);

  el.addEventListener('wheel', e => {
    e.preventDefault();
    const r = el.getBoundingClientRect(), k = perPx();
    /* 커서가 가리키던 지점이 제자리에 있어야 확대가 자연스럽습니다. */
    const ux = vb.cx + (e.clientX - r.left - r.width / 2) * k;
    const uy = vb.cy + (e.clientY - r.top - r.height / 2) * k;
    const f = e.deltaY > 0 ? 1.2 : 1 / 1.2;
    const before = vb.w;
    vb.w = Math.min(1000, Math.max(40, vb.w * f));
    const s = vb.w / before;
    vb.cx = ux + (vb.cx - ux) * s;
    vb.cy = uy + (vb.cy - uy) * s;
    applyView();
  }, { passive:false });

  /* 끌고 나서 손을 떼는 순간 핀이 눌리면 안 됩니다. */
  el.addEventListener('click', e => {
    if (moved > 8){ e.stopPropagation(); moved = 0; }
  }, true);

  addEventListener('resize', () => {
    if (!$('mappane').classList.contains('hide')) applyView();
  });
}

async function openMap(){
  $('profpane').classList.add('hide');
  $('mappane').classList.remove('hide');
  window.scrollTo({ top:0 });
  if (history.state?.t2 !== 'map') history.pushState({ t2:'map' }, '');

  await loadCities();
  const [vis, mine] = await Promise.all([
    sb.rpc('my_visited'),
    sb.from('city_ratings').select('city_id,stars').eq('user_id', me.id)
  ]);
  const ids = new Set((vis.data || []).map(v => v.city_id));
  mapCities = (cities || []).filter(c => ids.has(c.id));
  const stars = Object.fromEntries((mine.data || [])
    .filter(r => r.stars != null).map(r => [r.city_id, Number(r.stars)]));

  /* 다녀온 나라를 칠합니다. 싱가포르나 홍콩처럼 이 축척에서 면이 없는 곳은
     칠할 자리가 없어 핀으로만 보입니다. */
  const gone = new Set(mapCities.map(c => c.country));
  document.querySelectorAll('#worldland path').forEach(p =>
    p.classList.toggle('been', gone.has(p.dataset.c)));
  setMapView('전체');

  /* ── 전체 ── */
  const conts = new Set(mapCities.map(c => continentOf[c.country]).filter(Boolean));
  const pct = gone.size / UN_COUNTRIES * 100;
  $('m_total').innerHTML =
    `<div class="stats" style="margin:0">
       <button style="cursor:default"><b>${gone.size}</b><span>국가</span></button>
       <button style="cursor:default"><b>${mapCities.length}</b><span>도시</span></button>
       <button style="cursor:default"><b>${conts.size}/6</b><span>대륙</span></button>
     </div>
     <div class="memo" style="text-align:center; margin-top:10px">
       ${UN_COUNTRIES}개국 중 <b>${gone.size}개국</b> · ${pct.toFixed(1)}%</div>
     <div class="fp"><i style="width:${Math.max(pct, 1.2).toFixed(1)}%"></i></div>`;

  /* ── 대륙별 ── 퍼센트는 국가로만 셉니다 ── */
  $('m_cont').innerHTML = CONT.map(([k, total]) => {
    const cs = mapCities.filter(c => continentOf[c.country] === k);
    const ns = new Set(cs.map(c => c.country));
    const p = ns.size / total * 100;
    return `<div class="crow" data-zoom="${esc(k)}">
      <span class="nm">${esc(k)}</span>
      <span class="bar"><i style="width:${p.toFixed(1)}%"></i></span>
      <span class="n">${ns.size}/${total}국 · ${cs.length}곳</span></div>`;
  }).join('');

  /* ── 국가별 ── 많이 간 나라부터 ── */
  const byC = {};
  mapCities.forEach(c => (byC[c.country] = byC[c.country] || []).push(c));
  const order = Object.entries(byC).sort((a, b) => b[1].length - a[1].length);
  $('m_country').innerHTML = order.length
    ? order.map(([code, cs]) => `<div style="padding:9px 0; border-top:1px solid var(--line)">
        <div class="row" style="border:0; padding:0; margin:0">
          <span class="label" style="font-weight:600">${
            esc(countryName[code] || code)}</span>
          <span class="val">${cs.length}곳</span></div>
        <div class="cchips">${cs.map(c =>
          `<button data-pin="${esc(c.id)}">${esc(c.name)}${
            stars[c.id] ? ` ★${stars[c.id]}` : ''}</button>`).join('')}</div>
      </div>`).join('')
    : '<div class="empty">아직 다녀온 곳이 없어요.</div>';

  /* ── 기록 ── 숫자를 곱씹게 만드는 자리 ── */
  const withPos = mapCities.filter(c => c.center_lat != null);
  const north = withPos.reduce((a, c) => !a || c.center_lat > a.center_lat ? c : a, null);
  const south = withPos.reduce((a, c) => !a || c.center_lat < a.center_lat ? c : a, null);
  /* 다녀온 도시 가운데 가장 멀리 떨어진 두 곳. 313곳이라 다 재도 금방입니다. */
  let far = null;
  for (let i = 0; i < withPos.length; i++)
    for (let j = i + 1; j < withPos.length; j++){
      const d = distKm(withPos[i].center_lat, withPos[i].center_lng,
                       withPos[j].center_lat, withPos[j].center_lng);
      if (!far || d > far.d) far = { d, a: withPos[i], b: withPos[j] };
    }
  const sv = Object.entries(stars).filter(([id]) => ids.has(id)).map(([, v]) => v);
  const avg = sv.length ? sv.reduce((a, b) => a + b, 0) / sv.length : null;
  const rows = [
    ['가장 많이 간 국가', order.length
      ? `${countryName[order[0][0]] || order[0][0]} · ${order[0][1].length}곳` : '–'],
    ['가장 북쪽', north ? north.name : '–'],
    ['가장 남쪽', south ? south.name : '–'],
    ['가장 먼 두 도시', far
      ? `${far.a.name} ~ ${far.b.name} · ${Math.round(far.d).toLocaleString()}km` : '–'],
    ['내 별점 평균', avg != null ? `★ ${avg.toFixed(2)}` : '–'],
    ['별 다섯을 준 곳', String(sv.filter(v => v === 5).length) + '곳'],
  ];
  $('m_fun').innerHTML = rows.map(([k, v]) =>
    `<div class="row"><span class="label">${esc(k)}</span>
       <span class="val" style="color:var(--ink); font-weight:600">${esc(v)}</span></div>`)
    .join('');
}

function closeMap(fromPop){
  if (!fromPop && history.state?.t2 === 'map'){ history.back(); return; }
  shutBigMap();
  $('mappane').classList.add('hide');
  $('profpane').classList.remove('hide');
}
$('openmap').addEventListener('click', openMap);

/* 앱 자체를 권하는 자리. 여행 초대(그 여행에 들어오는 것)와는 다릅니다.
   휴대폰은 기본 공유창을 띄우고, 안 되는 브라우저는 주소만 복사합니다. */
/* 잠깐 뜨는 알림. 아이콘 버튼이라 글자를 바꿔 알릴 자리가 없습니다. */
let toastT = null;
function toast(msg){
  let t = $('toast');
  if (!t){ t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), 3200);
}

$('shareapp').addEventListener('click', async () => {
  const url  = location.origin + location.pathname;
  const text = 'AI가 여행 일정을 짜주고, 다녀온 곳은 지도에 남는 앱이에요.';
  const msg  = `${text}\n${url}`;

  /* 휴대폰은 기본 공유창을 씁니다. */
  if (navigator.share){
    try { await navigator.share({ title:'AI.Trip', text, url }); return; }
    catch (e){ if (e?.name === 'AbortError') return; }   /* 닫은 것은 실패가 아닙니다 */
  }
  /* 클립보드는 창이 포커스를 잃었거나 권한이 없으면 그냥 거절합니다.
     "복사하지 못했습니다"가 그래서 떴습니다. 옛 방식으로 한 번 더 해봅니다. */
  let ok = false;
  try { await navigator.clipboard.writeText(msg); ok = true; } catch {}
  if (!ok){
    try {
      const t = document.createElement('textarea');
      t.value = msg;
      t.style.cssText = 'position:fixed; top:-9999px; opacity:0';
      document.body.appendChild(t); t.select();
      ok = document.execCommand('copy');
      t.remove();
    } catch {}
  }
  /* 그래도 안 되면 주소를 눈앞에 띄워 직접 복사하게 합니다.
     실패했다고만 하고 끝나면 할 수 있는 것이 없습니다. */
  toast(ok ? '주소를 복사했어요' : url);
});
$('mapback').addEventListener('click', () => closeMap());

$('mappane').addEventListener('click', e => {
  const z = e.target.closest('[data-zoom]');
  if (z) return setMapView(z.dataset.zoom);
  const p = e.target.closest('[data-pin]');
  if (p) return openCity(p.dataset.pin);
});

/* 톱니를 누르면 설정, 뒤로 누르면 프로필. 설정을 프로필에 다 늘어놓으면
   정작 보러 온 숫자가 아래로 밀립니다. */
function showProfile(setting){
  shutBigMap();
  $('shelfpane').classList.add('hide');
  $('mappane').classList.add('hide');        /* 지도가 열려 있었으면 같이 닫습니다 */
  $('profpane').classList.toggle('hide', setting);
  $('setpane').classList.toggle('hide', !setting);
  window.scrollTo({ top:0, behavior:'smooth' });
}
$('gear').addEventListener('click', () => showProfile(true));
$('setback').addEventListener('click', () => showProfile(false));

/* ── 내 자료 내려받기 ────────────────────────────────────────────────
 * 데이터베이스에는 되돌리기가 없습니다. 잘못 지우면 그냥 사라집니다.
 * 서버 열쇠를 쓰지 않고 내 권한으로만 읽습니다 — RLS 가 내 것만 내줍니다.
 * 남의 여행에 초대돼 있으면 그 여행도 같이 받습니다. 볼 수 있는 것이 곧 내 자료입니다. */
$('dumpbtn').addEventListener('click', async () => {
  const b = $('dumpbtn');
  $('dumperr').classList.add('hide');
  b.disabled = true; b.textContent = '모으는 중…';

  /* 표마다 조건이 다르지 않습니다. RLS 가 이미 걸러 주므로 통째로 받습니다. */
  const TABLES = ['trips', 'trip_legs', 'trip_members', 'plans', 'expenses',
                  'expense_shares', 'bookings', 'packing', 'links', 'candidates',
                  'city_ratings', 'plan_ratings', 'trip_reviews', 'chats',
                  'profiles', 'user_prefs'];
  const out = { app:'AI.Trip', savedAt:new Date().toISOString(), user:me.id, data:{} };
  const failed = [];
  for (const t of TABLES){
    const r = await sb.from(t).select('*');
    if (r.error){ failed.push(`${t}(${r.error.code || '오류'})`); continue; }
    out.data[t] = r.data || [];
  }
  /* 도시 목록은 우리가 만든 자료라 안 넣습니다 — 잃어버릴 것은 내가 쓴 것뿐입니다. */

  const n = Object.values(out.data).reduce((s, v) => s + v.length, 0);
  const blob = new Blob([JSON.stringify(out, null, 1)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `aitrip-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(a.href);

  b.disabled = false; b.textContent = '다시 받기';
  /* 총합만 보면 맞는지 알 수가 없습니다. 표마다 몇 줄인지 늘어놓습니다 —
     "일정 0" 같은 것이 눈에 띄어야 빈 백업을 붙들고 있지 않습니다. */
  const NAME = { trips:'여행', trip_legs:'구간', trip_members:'일행', plans:'일정',
                 expenses:'지출', expense_shares:'분담', bookings:'예약',
                 packing:'준비물', links:'링크', candidates:'후보',
                 city_ratings:'도시 별점', plan_ratings:'맛집 별점',
                 trip_reviews:'여행 후기', chats:'AI 대화',
                 profiles:'프로필', user_prefs:'설정' };
  $('dumplist').classList.remove('hide');
  $('dumplist').innerHTML =
    `<div class="daysep">받은 것 · 모두 ${n.toLocaleString()}줄</div>` +
    TABLES.map(t => `<div class="row" style="padding:5px 0">
        <span class="label memo">${esc(NAME[t] || t)}</span>
        <span class="val"${(out.data[t]?.length ? '' : ' style="color:var(--ink-48)"')}>${
          out.data[t] == null ? '못 읽음' : out.data[t].length.toLocaleString()}</span>
      </div>`).join('');
  toast(`${n.toLocaleString()}줄을 저장했어요`);
  if (failed.length) fail('못 받은 표: ' + failed.join(', '), 'dump');
});

/* 보관함과 숫자를 누르면 평가 탭으로 걸러서 보냅니다. */
$('setview').addEventListener('click', e => {
  const b = e.target.closest('button[data-shelf]'); if (!b) return;
  if (b.dataset.shelf === 'trips'){ tripFilter = 'past'; return showApp('trips'); }
  openShelf(b.dataset.shelf);
});

/* ── 보관함 ──────────────────────────────────────────────────────────
 * 기록 탭으로 보내면 그 탭이 걸린 목록으로 바뀝니다. 그러면 새로 매길 곳을
 * 찾을 수가 없습니다 — 기록 탭은 안 매긴 곳을 보여주는 자리입니다.
 * 프로필 안에서 펼치고, 여기서도 바로 별점을 고칠 수 있게 합니다. */
const SHELF = { want:'가보고 싶은 곳', mine:'내 평가',
                comment:'한줄평 남긴 곳', place:'다녀온 맛집' };

/* 식당·카페는 도시가 아니라 일정 줄에 답니다. 일정 짤 때 이미 넣은 것이라
   따로 적게 하지 않고, 다녀온 여행의 식사·카페만 모아 별점을 받습니다. */
async function openPlaceShelf(){
  const today = ymd(new Date());
  const [ps, rs] = await Promise.all([
    sb.from('plans').select('id,title,memo,category,date,trip_id,trips(title,end_date)')
      .in('category', ['식사','카페']).is('deleted_at', null)
      .order('date', { ascending:false }).limit(300),
    sb.from('plan_ratings').select('plan_id,stars').eq('user_id', me.id),
  ]);
  if (ps.error) return fail(ps.error, 'trip');
  const rate = Object.fromEntries((rs.data || []).map(r => [r.plan_id, r.stars]));
  /* 아직 안 끝난 여행은 뺍니다 — 가보지도 않고 별점을 매길 수는 없습니다.
     다만 이미 매긴 것은 남깁니다. 매겼다는 것은 갔다는 뜻이고,
     프로필의 숫자와 여기 목록이 어긋나면 어느 쪽을 믿어야 할지 모릅니다. */
  const list = (ps.data || []).filter(p =>
    rate[p.id] != null || (p.trips?.end_date || p.date) < today);

  $('shelfcount').textContent = list.length ? `${list.length}곳` : '';
  $('shelflist').innerHTML = list.length
    ? list.map(p => `<div class="rrow">
        <span class="thumb ph">${p.category === '카페' ? '☕' : '🍽'}</span>
        <div class="t"><b>${esc(p.title)}</b>
          <span class="memo">${esc(p.trips?.title || '')} · ${esc(p.date)}</span></div>
        <span class="stars" data-plan="${esc(p.id)}">${starHtml(rate[p.id])}</span>
      </div>`).join('')
    : `<div class="empty">다녀온 여행에 식사·카페 일정이 아직 없어요.<br>
         일정에 넣어두면 여행이 끝난 뒤 여기서 평가할 수 있어요.</div>`;
}

async function openShelf(kind){
  $('profpane').classList.add('hide');
  $('mappane').classList.add('hide');
  $('shelfpane').classList.remove('hide');
  window.scrollTo({ top:0 });
  if (history.state?.t2 !== 'shelf') history.pushState({ t2:'shelf' }, '');
  $('shelfhead').textContent = SHELF[kind] || '보관함';
  if (kind === 'place') return openPlaceShelf();

  await loadCities();
  const [mine, vis, stats] = await Promise.all([
    sb.from('city_ratings').select('city_id,stars,want,comment').eq('user_id', me.id),
    sb.rpc('my_visited'),
    sb.rpc('city_stats'),
  ]);
  myRates  = Object.fromEntries((mine.data || []).map(r => [r.city_id, r]));
  visited  = new Set((vis.data || []).map(v => v.city_id));
  cityStat = Object.fromEntries((stats.data || []).map(s => [s.city_id, s]));

  const list = (cities || []).filter(c => {
    const r = myRates[c.id];
    if (kind === 'been')    return visited.has(c.id);
    if (kind === 'want')    return !!r?.want;
    if (kind === 'mine')    return r?.stars != null;
    if (kind === 'comment') return !!r?.comment;
    return false;
  }).sort((a, b) => (myRates[b.id]?.stars ?? -1) - (myRates[a.id]?.stars ?? -1)
                    || a.name.localeCompare(b.name, 'ko'));

  $('shelfcount').textContent = list.length ? `${list.length}곳` : '';
  $('shelflist').innerHTML = list.length
    ? list.map(c => {
        const r = myRates[c.id] || {};
        return `<div class="rrow" data-cityopen="${esc(c.id)}">
          ${c.image_url
            ? `<img class="thumb" src="${esc(c.image_url)}" alt="" loading="lazy">`
            : `<span class="thumb ph">${esc(c.name.slice(0,1))}</span>`}
          <div class="t"><b>${esc(c.name)}</b>
            <span class="memo">${esc(countryName[c.country] || c.country)}</span></div>
          <span class="stars" data-city="${esc(c.id)}">${starHtml(r.stars)}</span>
          <button class="ghost want${r.want ? ' on' : ''}" data-want="${esc(c.id)}">♡</button>
        </div>` +
        /* 한줄평은 한줄평 탭에서만 펼칩니다. 내 평가 목록에서는 별점만 봅니다 —
           어떤 줄만 두 줄이 되면 목록이 들쭉날쭉해집니다. */
        (kind === 'comment' && r.comment
          ? `<div class="memo" style="padding:0 0 10px 60px; margin-top:-6px">
               ${esc(r.comment)}</div>` : '');
      }).join('')
    : `<div class="empty">아직 없어요.</div>`;
}

function closeShelf(fromPop){
  if (!fromPop && history.state?.t2 === 'shelf'){ history.back(); return; }
  $('shelfpane').classList.add('hide');
  $('profpane').classList.remove('hide');
  loadFootprint();                  /* 여기서 매긴 것이 숫자에 바로 반영되게 */
}
$('shelfback').addEventListener('click', () => closeShelf());

/* 여기서도 별점을 고칠 수 있습니다. 기록 탭과 같은 방식입니다. */
$('shelflist').addEventListener('click', async e => {
  const st = e.target.closest('.st');
  /* 식당·카페는 일정 줄에 답니다. 도시 별점과 저장하는 표가 다릅니다. */
  const pw = st?.closest('.stars[data-plan]');
  if (pw){
    const box = st.getBoundingClientRect();
    const v = +st.dataset.n - ((e.clientX - box.left) < box.width / 2 ? 0.5 : 0);
    const cur = [...pw.querySelectorAll('.st i')]
      .reduce((s, i) => s + parseFloat(i.style.width) / 100, 0);
    const next = Math.abs(cur - v) < .01 ? null : v;
    paintStars(pw, next, true);
    const r = await sb.from('plan_ratings')
      .upsert({ user_id: me.id, plan_id: pw.dataset.plan, stars: next },
              { onConflict: 'user_id,plan_id' }).select('plan_id');
    if (r.error) return fail(r.error, 'trip');
    loadFootprint();
    return;
  }
  if (st){
    const wrap = st.closest('.stars'), cityId = wrap.dataset.city;
    const box = st.getBoundingClientRect();
    const v = +st.dataset.n - ((e.clientX - box.left) < box.width / 2 ? 0.5 : 0);
    const next = Number(myRates[cityId]?.stars) === v ? null : v;
    paintStars(wrap, next, true);
    markRated(st.closest('.rrow'), next);
    await saveRate(cityId, { stars: next }, true);
    return;
  }
  const w = e.target.closest('button[data-want]');
  if (w){
    const on = !myRates[w.dataset.want]?.want;
    await saveRate(w.dataset.want, { want: on }, true);
    w.classList.toggle('on', on);
    return;
  }
  const row = e.target.closest('[data-cityopen]');
  if (row) await openCity(row.dataset.cityopen);
});

/* AI 는 어디서든 한 번에 갑니다. 여행을 보고 있었으면 그 여행을 물어볼
   대상으로 미리 골라둡니다 — 들어가서 또 고르게 하면 안 씁니다. */
$('aibtn').addEventListener('click', () => {
  if (trip) aiTripId = trip.id;
  $('notifpanel').classList.add('hide');
  showApp('ai');
});

/* 종을 누르면 그 자리에서 펼쳐집니다. 프로필로 넘어가게 하면
   보던 화면을 잃고 돌아오기도 번거롭습니다. */
$('bell').addEventListener('click', async e => {
  e.stopPropagation();
  const open = $('notifpanel').classList.toggle('hide');
  if (!open) await loadNotifs();
});
/* 바깥을 누르면 닫힙니다. */
document.addEventListener('click', e => {
  if (!$('notifpanel').classList.contains('hide') &&
      !e.target.closest('#notifpanel')) $('notifpanel').classList.add('hide');
});

async function loadNotifs(){
  const { data, error } = await sb.from('notifications')
    .select('id,kind,body,created_at,read_at')
    .order('created_at', { ascending:false }).limit(30);
  const unread = (data || []).filter(n => !n.read_at).length;
  $('belldot').textContent = unread > 9 ? '9+' : unread;
  $('belldot').classList.toggle('hide', !unread);

  if (error || !data?.length){
    $('notifs').innerHTML = '<div class="empty">알림이 없어요.</div>';
    $('readall').classList.add('hide');
    return;
  }
  $('readall').classList.toggle('hide', !unread);
  $('notifs').innerHTML = data.map(n =>
    `<div class="row"><span class="label"${n.read_at ? ' style="opacity:.55"' : ''}>
       ${esc(n.body)}</span>
     <span class="val">${esc(n.created_at.slice(5,10))}</span></div>`).join('');
}
$('readall').addEventListener('click', async () => {
  await sb.from('notifications').update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  loadNotifs();
});

/* ── 프로필 사진 ────────────────────────────────────────────────────
 * 폰 사진은 5MB 가 넘기도 합니다. 그대로 올리면 통을 낭비하고 목록도 느려집니다.
 * 256px 정사각으로 줄여서 올립니다 — 88px 로 그리는 자리라 그 이상은 필요 없습니다. */
function shrink(file, size = 256){
  return new Promise((ok, no) => {
    const img = new Image();
    img.onload = () => {
      /* 가운데를 정사각으로 잘라냅니다. 안 그러면 세로 사진이 찌그러집니다. */
      const s = Math.min(img.width, img.height);
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      cv.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2,
                                    s, s, 0, 0, size, size);
      cv.toBlob(b => b ? ok(b) : no(new Error('사진을 바꾸지 못했습니다.')),
                'image/jpeg', 0.85);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => no(new Error('사진을 읽지 못했습니다.'));
    img.src = URL.createObjectURL(file);
  });
}

$('avatarbtn').addEventListener('click', () => $('avatarfile').click());

$('avatarfile').addEventListener('change', async e => {
  const f = e.target.files?.[0];
  e.target.value = '';                     /* 같은 파일을 또 골라도 걸리게 */
  if (!f) return;
  $('avaerr').classList.add('hide');
  if (!/^image\//.test(f.type)) return fail('사진 파일만 올릴 수 있어요.', 'ava');

  const before = $('avatar').src;
  $('avatar').style.opacity = '.4';
  try {
    const blob = await shrink(f);
    /* 파일 이름을 고정해 옛 사진이 쌓이지 않게 합니다. */
    const path = `${me.id}/avatar.jpg`;
    const up = await sb.storage.from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (up.error) throw up.error;

    /* 이름이 같으니 주소도 같습니다. 그대로 두면 옛 사진이 캐시에서 나옵니다. */
    const url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl
              + '?v=' + Date.now();
    const r = await sb.from('profiles').update({ avatar_url: url })
      .eq('id', me.id).select('avatar_url').maybeSingle();
    if (r.error) throw r.error;
    if (!r.data) throw new Error('저장되지 않았습니다 (0건).');

    $('avatar').src = url;
    myAvatar = url;
  } catch (err) {
    $('avatar').src = before;
    fail(/bucket|not found/i.test(err.message || '')
      ? 'avatars 통이 아직 없어요. 026_avatars.sql 을 먼저 실행하세요.'
      : err, 'ava');
  }
  $('avatar').style.opacity = '';
});

/* ── 이름 ── profiles.display_name 은 모든 여행에서 쓰는 이름입니다.
   여행마다 다르게 부르고 싶으면 그 여행의 trip_members.nickname 을 씁니다. */
$('editname').addEventListener('click', () => {
  $('namebox').classList.toggle('hide');
  if ($('namebox').classList.contains('hide')) return;
  $('n_name').value = $('name').textContent;
  $('n_name').focus();
});
$('n_cancel').addEventListener('click', () => $('namebox').classList.add('hide'));
$('n_save').addEventListener('click', async () => {
  const v = $('n_name').value.trim();
  if (!v) return fail('이름을 적어주세요.', 'trip');
  const r = await sb.from('profiles').update({ display_name: v })
    .eq('id', me.id).select('id');
  if (r.error) return fail(r.error, 'trip');
  if (!r.data?.length) return fail('이름을 바꾸지 못했습니다 (0건).', 'trip');
  $('name').textContent = v;
  $('namebox').classList.add('hide');
});

/* ── 글자 크기 ──────────────────────────────────────────────────────
 * 사람마다 다릅니다. 도쿄 앱은 공유값이라 한 명이 키우면 전원 화면이 커졌습니다.
 * 기기에도 저장해서 다음에 열 때 깜빡이지 않고 바로 그 크기로 뜨게 합니다. */
function applyTs(v){
  document.documentElement.style.setProperty('--ts', v);
  document.querySelectorAll('#tsbtns button').forEach(b =>
    b.classList.toggle('on', Number(b.dataset.ts) === Number(v)));
}
$('tsbtns').addEventListener('click', async e => {
  const b = e.target.closest('button[data-ts]'); if (!b) return;
  const v = Number(b.dataset.ts);
  applyTs(v);
  localStorage.setItem('t2:ts', v);
  const r = await sb.from('user_prefs')
    .update({ text_scale: v, updated_at: new Date().toISOString() })
    .eq('user_id', me.id).select('user_id');
  if (r.error) fail(r.error, 'trip');
});

async function loadTrips(){
  /* RLS 가 참여 중인 것만 내려줍니다. 만든 사람이 owner 로 자동 등록되지
     않으면 방금 만든 여행조차 여기 안 나옵니다. */
  const today = ymd(new Date());
  let q = sb.from('trips')
    .select('id,title,destination,start_date,end_date,currency,timezone,' +
            'transit_factor,city_id,cities(image_url),' +
            'trip_members(user_id,role),trip_reviews(user_id,stars)');
  /* 날짜가 지나면 저절로 "다녀온"으로 넘어갑니다 — 손으로 옮길 일이 없습니다. */
  if (tripFilter === 'past')
    q = q.lt('end_date', today)
         .order('start_date', { ascending:false });
  else
    q = q.gte('end_date', today)
         .order('start_date', { ascending:true });
  const { data, error } = await q;

  if (error){ $('trips').innerHTML = '<div class="empty">불러오지 못했습니다</div>';
              return fail(error); }
  if (!data.length){
    $('trips').innerHTML =
      tripFilter === 'past' ? '<div class="empty">아직 다녀온 여행이 없어요.</div>' :
      '<div class="empty">앞으로 갈 여행이 없어요.<br>새 여행을 눌러 만들어보세요.</div>';
    return;
  }
  $('trips').innerHTML = data.map(t => {
    const role = (t.trip_members || []).find(m => m.user_id === me.id)?.role || '';
    const days = Math.round((new Date(t.end_date) - new Date(t.start_date)) / 864e5) + 1;
    const a = `data-id="${esc(t.id)}" data-title="${esc(t.title)}"`;
    /* 소유자만 지웁니다. 일행은 나갈 뿐입니다 — 남의 여행을 지울 수는 없습니다.
       (RLS 도 같은 규칙을 걸어두었으니 버튼을 숨기는 건 안내일 뿐입니다.) */
    /* 보관은 뺐습니다. 날짜가 지나면 저절로 "다녀온"으로 넘어가는데
       거기서 또 손으로 치우게 하면 두 곳에 나뉘어 어디 있는지 헷갈립니다. */
    /* 일정 화면 위에서 사진과 정보를 걷어냈으니 고치는 길이 여기 있어야 합니다. */
    const acts = role === 'owner'
      ? `<button class="ghost" data-act="edit" ${a}>수정</button>` +
        `<button class="ghost" data-act="delete" ${a} style="color:var(--bad)">삭제</button>`
      : `<button class="ghost" data-act="leave" ${a}>나가기</button>`;
    /* 글자만 있으면 어느 여행인지 한눈에 안 들어옵니다.
       그 여행의 첫 도시 사진을 왼쪽에 답니다. 없으면 첫 글자만. */
    const img = t.cities?.image_url;
    return `<div class="trip" data-open="${esc(t.id)}">
      ${img ? `<img class="thumb" src="${esc(img)}" alt="" loading="lazy"
                   onerror="this.replaceWith(Object.assign(document.createElement('span'),
                     {className:'thumb ph', textContent:'${esc(t.title.slice(0,1))}'}))">`
            : `<span class="thumb ph">${esc(t.title.slice(0,1))}</span>`}
      <div class="t">
      <b>${esc(t.title)}</b>
      <span class="meta">${esc(t.destination)} · ${esc(t.start_date)} ~ ${esc(t.end_date)} · ${days}일</span>
      <div style="margin-top:4px">${acts}</div>
    </div>${
      /* 다녀왔는데 아직 후기를 안 남긴 여행. 여기가 평가로 들어가는 입구입니다. */
      t.end_date < today && !(t.trip_reviews || []).some(r => r.user_id === me.id)
        ? '<span class="badge" style="background:#fdf3e6; color:#f5a623; font-weight:600">' +
          '후기 전</span>'
        : `<span class="badge">${esc(role)}</span>`}</div>`;
  }).join('');
}

/* 줄마다 버튼을 달면 목록을 다시 그릴 때마다 이벤트를 다시 붙여야 합니다.
   상자 하나에만 붙이고 눌린 버튼을 찾아 씁니다. */
$('trips').addEventListener('click', async e => {
  const b = e.target.closest('button[data-act]');
  if (!b){
    /* 버튼이 아니면 줄을 누른 것입니다 — 그 여행을 엽니다. */
    const row = e.target.closest('.trip[data-open]');
    if (row) await openTrip(row.dataset.open);
    return;
  }
  const { act, id, title } = b.dataset;

  if (act === 'cancelact') return loadTrips();

  /* 고치기 — 여행을 열고 수정 칸을 바로 펼칩니다. */
  if (act === 'edit'){ await openTrip(id); $('editbtn').click(); return; }

  /* 되돌릴 수 없는 일은 그 자리에서 한 번 더 묻습니다.
     window.confirm 은 내장 브라우저나 iframe 안에서 조용히 막혀 false 를
     돌려줍니다. 그러면 요청도 안 보내고 아무 말도 없이 끝납니다 —
     실제로 그래서 "삭제가 안 먹는다"가 됐습니다. 화면 안에서 묻습니다. */
  if ((act === 'delete' || act === 'leave') && b.dataset.armed !== '1'){
    const wrap = b.parentElement;
    const msg = act === 'delete'
      ? '일정 · 지출 · 예약 · 준비물 · 사진이 함께 사라져요. 되돌릴 수 없어요.'
      : '목록에서 사라져요. 넣은 지출은 정산을 위해 남아요.';
    wrap.innerHTML =
      `<div style="color:var(--bad); font-size:calc(12px * var(--ts)); margin-bottom:4px">
         ${esc(msg)}</div>
       <button class="ghost" data-act="cancelact">취소</button>
       <button class="ghost" data-act="${esc(act)}" data-armed="1"
               data-id="${esc(id)}" data-title="${esc(title)}"
               style="color:var(--bad); font-weight:600">
         정말 ${act === 'delete' ? '삭제' : '나가기'}</button>`;
    return;
  }

  b.disabled = true;
  $('triperr').classList.add('hide');

  /* .select() 를 붙여 실제로 몇 줄이 바뀌었는지 받습니다.
     RLS 가 막으면 Postgres 는 오류를 내지 않고 0건을 처리합니다.
     이걸 안 세면 "눌러도 아무 일도 안 일어남"이 되고 원인을 알 수 없습니다. */
  let r;
  if (act === 'delete')          r = await sb.from('trips').delete().eq('id', id).select('id');
  else if (act === 'leave')      r = await sb.from('trip_members')
                                      .update({ left_at: new Date().toISOString() })
                                      .eq('trip_id', id).eq('user_id', me.id).select('trip_id');
  b.disabled = false;

  if (r?.error) return fail(r.error, 'trip');
  if (!r?.data?.length){
    return fail(
      `아무것도 바뀌지 않았습니다 (0건).\n` +
      `서버가 거부했습니다 — 이 여행의 소유자가 아닐 수 있습니다.\n` +
      `동작: ${act} · 여행: ${id}`, 'trip');
  }
  await loadTrips();
});

/* ── 여행 상세 ──────────────────────────────────────────────────── */
const D1 = 864e5;
/* 날짜는 UTC 자정으로 다뤄야 합니다.
   'T00:00:00' 으로 파싱하면 한국 시각 자정이 되고, toISOString() 이 UTC 로
   되돌리면서 하루 앞으로 밀립니다. 그래서 여행 첫날 앞에 유령 칩이 하나 생겼습니다.
   시각이 아니라 날짜를 다루는 자리이므로 처음부터 UTC 로 통일합니다. */
const asDate = s => new Date(s + 'T00:00:00Z');
const ymd = d => d.toISOString().slice(0,10);
const hm  = t => t ? String(t).slice(0,5) : '';

/* 문서의 표시 규칙 그대로입니다.
     여행 기간 안  Day 1 · 9월 12일 토요일
     시작 전       9월 5일 · 여행 전
     끝난 뒤       9월 18일 · 여행 후
   Day 번호는 start_date 로 계산합니다. 저장하지 않습니다. */
function dayLabel(dateStr, t){
  const d = asDate(dateStr), s = asDate(t.start_date), e = asDate(t.end_date);
  const f = d.toLocaleDateString('ko-KR',
    { month:'long', day:'numeric', weekday:'long', timeZone:'UTC' });
  if (d < s) return `${f} · 여행 전`;
  if (d > e) return `${f} · 여행 후`;
  return `Day ${Math.round((d - s) / D1) + 1} · ${f}`;
}

async function fetchTrip(id){
  const { data, error } = await sb.from('trips')
    .select('*, trip_members(user_id,role)').eq('id', id).maybeSingle();
  if (error) { fail(error, 'trip'); return false; }
  /* 행이 안 오면 내보내졌거나 여행이 지워진 것입니다. RLS 가 그렇게 만듭니다. */
  if (!data) return false;
  trip = data;
  trip.myRole = (data.trip_members || []).find(m => m.user_id === me.id)?.role || '';
  return true;
}

/* 시간대 이름(Europe/Rome)은 우리가 계산에 쓰는 값이지 사용자가 알 것은 아닙니다.
   같은 자료로 현지 시각을 보여주는 편이 실제로 쓸모 있습니다.
   기기와 시차가 없으면 굳이 적지 않습니다. */
function localTime(tz){
  if (!tz) return '';
  try {
    const here = new Intl.DateTimeFormat('ko-KR',
      { hour:'2-digit', minute:'2-digit', hour12:false }).format(new Date());
    const there = new Intl.DateTimeFormat('ko-KR',
      { hour:'2-digit', minute:'2-digit', hour12:false, timeZone:tz }).format(new Date());
    return here === there ? '' : `현지 ${there}`;
  } catch { return ''; }
}

function drawTripHeader(){
  const days = Math.round((asDate(trip.end_date) - asDate(trip.start_date)) / D1) + 1;
  $('t_title').textContent = trip.title;
  const now = localTime(trip.timezone);
  /* 한 줄로 붙입니다. 지도가 더 잘 보여야 하는 자리라 머리말은 짧을수록 낫습니다.
     연도는 뻔하니 뺍니다 — 목록에서 이미 봤습니다. */
  $('t_meta').textContent = [
    /* 제목과 목적지가 같으면 한 번만 씁니다 — "도쿄 / 도쿄 · 09-12…"는 군더더기입니다. */
    trip.destination === trip.title ? null : trip.destination,
    `${trip.start_date.slice(5)} ~ ${trip.end_date.slice(5)} · ${days}일`,
    trip.currency, now,
  ].filter(Boolean).join(' · ');
  /* 보기만 가능한 사람에겐 고치는 버튼을 숨깁니다. 막는 것은 RLS 입니다. */
  $('addplanbtn').classList.toggle('hide', trip.myRole === 'viewer');
  $('addexpbtn').classList.toggle('hide', trip.myRole === 'viewer');
  $('editbtn').classList.toggle('hide', trip.myRole === 'viewer');
}

async function openTrip(id){
  if (!await fetchTrip(id)) return fail('여행을 열지 못했습니다.', 'trip');
  pickedDay = null;
  /* 기록을 하나 쌓아야 화면 밀어서 뒤로 가기가 됩니다.
     이미 여행 안이면(다른 여행으로 건너뛴 경우) 또 쌓지 않습니다. */
  if (history.state?.t2 !== 'trip') history.pushState({ t2:'trip' }, '');

  /* 여행은 어느 탭에서든 열립니다 — 홈에서 열면 홈이 아래에 그대로 남아 있었습니다.
     앱 단계 화면은 하나도 빠짐없이 덮습니다. 돌아갈 탭은 appTab 이 기억합니다. */
  ['homeview','listview','rateview','aiview','setview','cityview','draftview','reviewview']
    .forEach(v => $(v).classList.add('hide'));
  cityOpen = null;
  $('appbar').classList.add('hide');
  $('tabbar').classList.remove('hide');
  $('tripview').classList.remove('hide');
  $('plancard').classList.add('hide');
  $('editcard').classList.add('hide');
  $('expcard').classList.add('hide');
  $('invitebox').classList.add('hide');

  drawTripHeader();
  document.body.classList.add('hastab');
  showTab('plans');
  /* 구간을 먼저 읽어야 날짜 칩에 도시가 붙고 지출 통화가 맞습니다.
     지출은 일행 이름을 쓰므로 일행도 먼저 읽습니다. */
  await loadLegs();
  await loadReview();
  /* 준비물은 담당 이름을 쓰므로 일행 뒤에 붙입니다. */
  await Promise.all([
    loadPlans(), loadBookings(), loadLinks(), loadCities(),
    loadMembers().then(() => Promise.all([loadExpenses(), loadPacking()])),
  ]);
  fillCityList();
  watch();
}

/* ── 실시간 ─────────────────────────────────────────────────────────
 * 도쿄 앱은 8초마다 getRevision 을 물어보고 다르면 화면을 통째로 덮었습니다.
 * 여기서는 바뀐 표만 듣고 그 부분만 다시 그립니다. REV 는 없앴습니다.
 * 여러 변경이 몰아쳐 올 때 매번 다시 그리면 화면이 떨리므로 잠깐 모았다 한 번 그립니다. */
function watch(){
  unwatch();
  const f = 'trip_id=eq.' + trip.id;
  channel = sb.channel('trip:' + trip.id)
    .on('postgres_changes', { event:'*', schema:'public', table:'plans',        filter:f },
        () => bump('plans'))
    .on('postgres_changes', { event:'*', schema:'public', table:'expenses',     filter:f },
        () => bump('expenses'))
    .on('postgres_changes', { event:'*', schema:'public', table:'bookings',     filter:f },
        () => bump('prep'))
    .on('postgres_changes', { event:'*', schema:'public', table:'packing',      filter:f },
        () => bump('prep'))
    .on('postgres_changes', { event:'*', schema:'public', table:'links',        filter:f },
        () => bump('expenses'))
    .on('postgres_changes', { event:'*', schema:'public', table:'trip_legs',    filter:f },
        () => bump('legs'))
    .on('postgres_changes', { event:'*', schema:'public', table:'trip_members', filter:f },
        () => bump('members'))
    .on('postgres_changes', { event:'*', schema:'public', table:'trips',
                              filter:'id=eq.' + trip.id },
        () => bump('trip'))
    .subscribe(st => {
      $('live').classList.toggle('hide', st !== 'SUBSCRIBED');
    });
}
function unwatch(){
  if (channel){ sb.removeChannel(channel); channel = null; }
  clearTimeout(bumpTimer); bumpPending = null;
  $('live').classList.add('hide');
}
function bump(what){
  (bumpPending ||= new Set()).add(what);
  clearTimeout(bumpTimer);
  bumpTimer = setTimeout(async () => {
    const s = bumpPending; bumpPending = null;
    if (!trip) return;
    if (s.has('trip')){
      /* 여행 자체가 바뀌었습니다. 내가 빠졌거나 지워졌으면 목록으로 돌려보냅니다. */
      if (!await fetchTrip(trip.id)){
        backToList();
        return fail('이 여행에서 나갔거나 여행이 지워졌습니다.', 'trip');
      }
      drawTripHeader();
    }
    /* 구간이 바뀌면 날짜 칩의 도시와 지출 통화가 따라 바뀝니다. */
    if (s.has('legs')){ await loadLegs(); await loadReview(); }
    if (s.has('trip')) await loadReview();   /* 날짜가 바뀌면 끝난 여행인지도 바뀝니다 */
    if (s.has('plans') || s.has('trip') || s.has('legs')) await loadPlans();
    /* 일행이 바뀌면 지출에 찍힌 이름과 정산 인원도 따라 바뀝니다. */
    if (s.has('members')) { await loadMembers(); await loadExpenses(); await loadPacking(); }
    else if (s.has('expenses')) await loadExpenses();
    if (s.has('prep'))
      await Promise.all([loadBookings(), loadPacking(), loadLinks()]);
  }, 250);
}

/* ── 구간 ───────────────────────────────────────────────────────────
 * 여행 하나가 여러 도시·나라를 도는 경우입니다.
 * 일정과 지출은 날짜로 저절로 구간에 붙습니다 — 하나하나 고를 필요가 없습니다. */
async function loadLegs(){
  const { data, error } = await sb.from('trip_legs')
    /* 도보 상수 둘을 빼먹어서 "도보 약 NaN분" 이 나왔습니다.
       travel() 이 쓰는 다섯 개를 다 가져와야 합니다. */
    .select('id,city_id,destination,country,start_date,end_date,timezone,currency,' +
            'walk_max_km,walk_min_per_km,walk_base_min,transit_factor,transit_base_min')
    .eq('trip_id', trip.id).order('start_date');
  if (error) return fail(error, 'leg');
  legs = data || [];
  /* 노선 딱지 색. 그 여행에 나오는 도시 것만 받습니다. */
  const ids = [...new Set(legs.map(l => l.city_id).filter(Boolean))];
  if (ids.length){
    const r = await sb.from('transit_lines').select('name,color,dark_text').in('city_id', ids);
    transitLines = r.data || [];
  } else transitLines = [];
  drawLegs();
}

/* 그날 어디에 있는지. 구간 밖 날짜(여행 전후)는 가장 가까운 구간을 씁니다. */
function legFor(date){
  if (!legs.length) return null;
  return legs.find(l => date >= l.start_date && date <= l.end_date)
      || (date < legs[0].start_date ? legs[0] : legs[legs.length - 1]);
}

function drawLegs(){
  /* 헤더에는 둘 이상일 때만 보여줍니다. 하나면 위 줄이 이미 그 도시입니다. */
  $('t_legs').innerHTML = legs.length > 1
    ? legs.map(l => `<span class="day" style="cursor:default">${esc(l.destination)}
        <span class="n">${esc(l.start_date.slice(5).replace('-','/'))}~${
        esc(l.end_date.slice(5).replace('-','/'))}</span></span>`).join('')
    : '';

  $('legs').innerHTML = legs.map(l =>
    `<div class="row"><span class="label"><b>${esc(l.destination)}</b>
       <div class="memo">${esc(l.start_date)} ~ ${esc(l.end_date)} ·
         ${esc(l.currency)}</div></span>
     ${legs.length > 1
       ? `<button class="ghost" data-lact="del" data-id="${esc(l.id)}"
                  style="color:var(--bad)">×</button>` : ''}</div>`).join('')
    || '<div class="empty">구간이 없어요.</div>';
}

/* 도시 목록은 native datalist 로 답니다. 폼이 여럿이라 직접 만든 검색을
   또 붙이면 코드가 두 벌이 됩니다. 모바일에서도 native 가 더 편합니다. */
function fillCityList(){
  if (!cities) return;
  $('citylist').innerHTML = cities.map(c =>
    `<option value="${esc(c.name)}">${esc(countryName[c.country] || c.country)}</option>`).join('');
  const opts = Object.entries(countryName)
    .sort((a,b) => a[1].localeCompare(b[1], 'ko'))
    .map(([code, nm]) => `<option value="${esc(code)}">${esc(nm)}</option>`).join('');
  $('g_country').innerHTML = opts;
  $('ac_country').innerHTML = opts;    /* 도시를 직접 넣을 때 고르는 나라 */
}

/* 목록에 없는 도시를 치면 나라를 물어봅니다. */
$('g_dest').addEventListener('input', () => {
  const v = $('g_dest').value.trim();
  const hit = cities?.find(c => c.name === v);
  $('g_countrywrap').classList.toggle('hide', !v || !!hit);
});

$('g_add').addEventListener('click', async () => {
  $('legerr').classList.add('hide');
  const v = $('g_dest').value.trim();
  const s = $('g_start').value, e = $('g_end').value;
  if (!v)        return fail('도시를 적어주세요.', 'leg');
  if (!s || !e)  return fail('구간 날짜를 골라주세요.', 'leg');
  if (e < s)     return fail('끝나는 날이 시작보다 빠릅니다.', 'leg');

  const hit = cities?.find(c => c.name === v);
  const row = { trip_id: trip.id, destination: v, start_date: s, end_date: e };
  if (hit) row.city_id = hit.id;
  else     row.country = $('g_country').value;

  const btn = $('g_add');
  btn.disabled = true; btn.textContent = '넣는 중…';
  const { data, error } = await sb.from('trip_legs').insert(row).select('id');
  btn.disabled = false; btn.textContent = '구간 넣기';
  if (error) return fail(error, 'leg');
  if (!data?.length) return fail('아무것도 저장되지 않았습니다 (0건).', 'leg');

  $('g_dest').value = ''; $('g_countrywrap').classList.add('hide');
  await loadLegs();
  await loadReview();
  await fetchTrip(trip.id); drawTripHeader();   /* 대표값이 바뀌었을 수 있습니다 */
  drawDays(); drawCats(); drawPlans(); drawPlanMap();
});

$('legs').addEventListener('click', async e => {
  const b = e.target.closest('button[data-lact]'); if (!b) return;
  if (b.dataset.armed !== '1'){
    arm(b, '정말?'); return;
  }
  b.disabled = true;
  /* 구간은 진짜로 지웁니다. 일정과 지출은 날짜로 붙으므로 같이 사라지지 않습니다. */
  const r = await sb.from('trip_legs').delete().eq('id', b.dataset.id).select('id');
  b.disabled = false;
  if (r.error) return fail(r.error, 'leg');
  if (!r.data?.length) return fail('아무것도 바뀌지 않았습니다 (0건).', 'leg');
  await loadLegs();
  await loadReview();
  await fetchTrip(trip.id); drawTripHeader();
  drawDays(); drawCats(); drawPlans(); drawPlanMap();
});

/* ── 여행 후기 ──────────────────────────────────────────────────────
 * 끝난 여행에만 나옵니다. 일정을 쓰던 사람이 그대로 평가로 넘어가는 자리라,
 * 기록 탭을 따로 찾아가게 하지 않습니다.
 * 같은 여행도 사람마다 느낌이 다르므로 후기는 한 사람에 한 줄입니다. */
async function loadReview(){
  const ended = trip.end_date < ymd(new Date());
  $('reviewbox').classList.toggle('hide', !ended);
  if (!ended) return;

  const ids = legs.map(l => l.city_id).filter(Boolean);
  const [mine, rates, all] = await Promise.all([
    sb.from('trip_reviews').select('stars,comment')
      .eq('trip_id', trip.id).eq('user_id', me.id).maybeSingle(),
    ids.length ? sb.from('city_ratings').select('city_id,stars')
                   .eq('user_id', me.id).in('city_id', ids)
               : Promise.resolve({ data: [] }),
    sb.from('trip_reviews').select('user_id,stars,comment').eq('trip_id', trip.id),
  ]);

  myReview = mine.data || {};
  $('rv_when').textContent = `${trip.end_date} 종료`;
  $('rv_stars').innerHTML = starHtml(myReview.stars);
  $('rv_note').value = myReview.comment || '';

  const got = Object.fromEntries((rates.data || []).map(r => [r.city_id, r.stars]));
  $('rv_cities').innerHTML = ids.length
    ? `<div class="daysep">다녀온 곳</div>` + legs.filter(l => l.city_id).map(l =>
        `<div class="rrow" style="padding:9px 0">
           <div class="t"><b>${esc(l.destination)}</b>
             <span class="stars" data-rvcity="${esc(l.city_id)}">${
               starHtml(got[l.city_id])}</span></div>
         </div>`).join('')
    : '';

  /* 일행이 남긴 후기. 같이 간 사람끼리는 서로 봅니다. */
  const others = (all.data || []).filter(r => r.user_id !== me.id && (r.stars || r.comment));
  $('rv_others').innerHTML = others.length
    ? `<div class="daysep">일행의 후기</div>` + others.map(r =>
        `<div class="rrow" style="padding:9px 0">
           <div class="t"><b>${esc(nameOf(r.user_id))}</b>
             ${r.comment ? `<span class="memo">${esc(r.comment)}</span>` : ''}
             <span class="stars" style="pointer-events:none">${starHtml(r.stars)}</span></div>
         </div>`).join('')
    : '';
}

async function saveReview(patch){
  const r = await sb.from('trip_reviews')
    .upsert({ trip_id: trip.id, user_id: me.id, ...myReview, ...patch },
            { onConflict: 'trip_id,user_id' })
    .select('stars,comment').maybeSingle();
  if (r.error) return fail(r.error, 'rv');
  myReview = r.data || myReview;
  $('rv_stars').innerHTML = starHtml(myReview.stars);
}

$('reviewbox').addEventListener('click', async e => {
  const st = e.target.closest('.st'); if (!st) return;
  const wrap = st.closest('.stars');
  const box = st.getBoundingClientRect();
  const v = +st.dataset.n - ((e.clientX - box.left) < box.width / 2 ? 0.5 : 0);

  if (wrap.dataset.rvcity){
    /* 여기서 매긴 것이 곧 기록 탭의 도시 별점입니다. 두 벌로 두지 않습니다. */
    const cur = [...wrap.querySelectorAll('.st i')]
      .reduce((s, i) => s + parseFloat(i.style.width) / 100, 0);
    const next = Math.abs(cur - v) < 0.01 ? null : v;
    const up = await sb.from('city_ratings')
      .upsert({ user_id: me.id, city_id: wrap.dataset.rvcity, stars: next },
              { onConflict: 'user_id,city_id' }).select('stars').maybeSingle();
    if (up.error) return fail(up.error, 'rv');
    wrap.innerHTML = starHtml(next);
    return;
  }
  if (wrap.id === 'rv_stars'){
    const next = Number(myReview.stars) === v ? null : v;
    await saveReview({ stars: next });
  }
});

/* 한 줄 후기는 칸을 벗어날 때 저장합니다. 글자마다 보내면 요청이 쏟아집니다. */
$('rv_note').addEventListener('change', () =>
  saveReview({ comment: $('rv_note').value.trim() || null }));

/* ── 여행 정보 수정 ─────────────────────────────────────────────── */
$('editbtn').addEventListener('click', () => {
  $('editcard').classList.toggle('hide');
  $('editerr').classList.add('hide');
  if ($('editcard').classList.contains('hide')) return;
  $('e_title').value = trip.title;
  $('e_start').value = trip.start_date;
  $('e_end').value   = trip.end_date;
  $('e_shift').checked = true;
  syncShiftText();
  fillCityList();
  /* 새 구간 기본값: 마지막 구간 다음 날부터 여행 끝까지 */
  const last = legs[legs.length - 1];
  $('g_start').value = last ? ymd(new Date(asDate(last.end_date).getTime() + D1))
                            : trip.start_date;
  $('g_end').value = trip.end_date;
});
$('e_cancel').addEventListener('click', () => {
  $('editcard').classList.add('hide'); $('editerr').classList.add('hide');
});

/* 며칠 밀리는지 미리 보여줍니다. 체크만 있고 숫자가 없으면
   무슨 일이 일어날지 모른 채 누르게 됩니다. */
function shiftDays(){
  if (!$('e_start').value) return 0;
  return Math.round((asDate($('e_start').value) - asDate(trip.start_date)) / D1);
}
function syncShiftText(){
  const n = shiftDays();
  $('e_end').min = $('e_start').value || '';
  $('e_shifttext').textContent = n === 0
    ? '일정도 같이 옮기기 (날짜를 바꾸면 켜집니다)'
    : `일정 ${plans.length}개를 ${Math.abs(n)}일 ${n > 0 ? '뒤로' : '앞으로'} 옮기기`;
}
$('e_start').addEventListener('change', () => {
  /* 시작을 옮기면 끝도 같이 끌고 갑니다. 기간을 유지하는 쪽이 흔한 뜻입니다. */
  const n = shiftDays();
  if (n !== 0) $('e_end').value = ymd(new Date(asDate(trip.end_date).getTime() + n * D1));
  syncShiftText();
});
$('e_end').addEventListener('change', syncShiftText);

$('e_save').addEventListener('click', async () => {
  const btn = $('e_save');
  $('editerr').classList.add('hide');
  const title = $('e_title').value.trim();
  const start = $('e_start').value, end = $('e_end').value;

  if (!title)       return fail('제목을 적어주세요.', 'edit');
  if (!start || !end) return fail('날짜를 골라주세요.', 'edit');
  if (end < start)  return fail('끝나는 날이 시작보다 빠릅니다.', 'edit');
  const days = Math.round((asDate(end) - asDate(start)) / D1) + 1;
  if (days > 365)   return fail(`${days}일은 너무 깁니다. 날짜를 다시 봐주세요.`, 'edit');

  const n = shiftDays();
  btn.disabled = true; btn.textContent = '저장 중…';

  const up = await sb.from('trips')
    .update({ title, start_date: start, end_date: end }).eq('id', trip.id).select('id');

  if (!up.error && up.data?.length && n !== 0 && $('e_shift').checked && plans.length){
    /* 한 줄씩 고치면 요청이 여러 번 나가고 중간에 끊기면 반만 옮겨집니다.
       서버 함수 하나로 한 번에 처리합니다. */
    const sh = await sb.rpc('shift_trip_days', { p_trip: trip.id, p_days: n });
    if (sh.error){ btn.disabled = false; btn.textContent = '저장';
                   return fail(sh.error, 'edit'); }
  }

  btn.disabled = false; btn.textContent = '저장';
  if (up.error) return fail(up.error, 'edit');
  if (!up.data?.length)
    return fail('아무것도 바뀌지 않았습니다 (0건). 편집 권한을 확인해주세요.', 'edit');

  $('editcard').classList.add('hide');
  pickedDay = null;
  await openTrip(trip.id);
});

/* 여행에 들어갈 때 브라우저 기록을 하나 쌓아 뒀습니다(openTrip).
   그래야 아이폰에서 화면을 밀어 뒤로 가기가 됩니다.
   ← 버튼도 같은 길로 보내야 기록과 화면이 어긋나지 않습니다. */
function backToList(fromPop){
  if (!fromPop && history.state?.t2 === 'trip'){ history.back(); return; }
  unwatch();
  trip = null;
  $('tripview').classList.add('hide');
  $('tabbar').classList.add('hide');
  $('appbar').classList.remove('hide');
  showApp(appTab === 'set' ? 'trips' : appTab);
}
$('backbtn').addEventListener('click', () => backToList());
window.addEventListener('popstate', () => {
  if (cityOpen) return closeCity(true);
  if (trip) return backToList(true);
  if (!$('reviewview').classList.contains('hide')) return closeReview(true);
  if (!$('draftview').classList.contains('hide')) return closeDraft(true);
  if (!$('shelfpane').classList.contains('hide')) return closeShelf(true);
  if (!$('mappane').classList.contains('hide')) return closeMap(true);
});

async function loadPlans(){
  $('planerr').classList.add('hide');
  const { data, error } = await sb.from('plans')
    .select('id,date,start_time,end_time,category,title,memo,move_note,sort_order,lat,lng')
    .eq('trip_id', trip.id)
    .is('deleted_at', null)                     /* 숨긴 것은 빼고 봅니다 */
    .order('date').order('start_time', { nullsFirst:false }).order('sort_order');
  if (error){ $('plans').innerHTML = ''; return fail(error, 'plan'); }
  plans = data;
  drawDays();
  drawCats();
  drawPlans();
  drawPlanMap();
}

function shortLabel(d){
  const lab = dayLabel(d, trip);
  const base = lab.startsWith('Day') ? lab.split(' · ')[0]
                                     : lab.split(' · ')[1] + ' ' + d.slice(5).replace('-','/');
  /* 도시를 여럿 도는 여행이면 Day 번호만으로는 어디인지 모릅니다. */
  const l = legs.length > 1 ? legFor(d) : null;
  return l ? `${base} · ${l.destination}` : base;
}

function drawDays(){
  /* 여행 기간의 날짜 + 기간 밖에 일정이 있는 날짜를 합칩니다.
     한국에서 미리 산 항공권처럼 기간 밖 일정이 실제로 생깁니다. */
  const set = new Set();
  for (let d = asDate(trip.start_date);
       ymd(d) <= trip.end_date; d = new Date(d.getTime() + D1)) set.add(ymd(d));
  plans.forEach(p => set.add(p.date));
  const list = [...set].sort();

  const all = `<button class="day${pickedDay === null ? ' on' : ''}" data-day="">전체</button>`;

  /* 짧은 여행은 칩이 한눈에 들어와서 낫습니다.
     길어지면 칩이 벽이 됩니다 — 29일짜리는 세 줄을 잡아먹었습니다.
     그때는 고르는 칸 하나로 바꿉니다. */
  if (list.length <= 12){
    $('days').innerHTML = all + list.map(d =>
      `<button class="day${pickedDay === d ? ' on' : ''}" data-day="${esc(d)}">` +
      `${esc(shortLabel(d))}</button>`).join('');
  } else {
    $('days').innerHTML = all +
      `<select id="daysel"><option value="">날짜 고르기…</option>` +
      list.map(d => `<option value="${esc(d)}"${pickedDay === d ? ' selected' : ''}>` +
                    `${esc(dayLabel(d, trip))}</option>`).join('') +
      `</select>`;
  }
}

$('days').addEventListener('change', e => {
  if (e.target.id !== 'daysel') return;
  pickedDay = e.target.value || null;
  drawDays(); drawCats(); drawPlans(); drawPlanMap();
});

/* ── 일정 지도 ───────────────────────────────────────────────────────
 * 목록만 보면 오늘 얼마나 흩어져 다니는지 안 보입니다. 위에 지도를 얹습니다.
 * 좌표가 있는 일정만 찍고, 하나도 없으면 통째로 접습니다.
 * 글자는 영어 지도를 씁니다 — 현지 문자로만 나오면 어디가 어딘지 못 읽습니다. */
let lmap = null, lmarks = null;

function drawPlanMap(){
  const box = $('planmap');
  if (!window.L){ box.classList.add('hide'); return; }   /* 못 받아왔으면 조용히 생략 */
  let show = pickedDay ? plans.filter(p => p.date === pickedDay) : plans;
  if (catFilter) show = show.filter(p => p.category === catFilter);
  const pts = show.filter(p => p.lat != null && p.lng != null);
  box.classList.toggle('hide', !pts.length);
  if (!pts.length) return;

  if (!lmap){
    lmap = L.map(box, { zoomControl:false, attributionControl:false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      { maxZoom:19, subdomains:'abcd' }).addTo(lmap);
    L.control.attribution({ prefix:false })
      .addAttribution('&copy; OpenStreetMap &copy; CARTO').addTo(lmap);
    lmarks = L.layerGroup().addTo(lmap);
  }
  lmarks.clearLayers();

  /* 번호를 붙여야 그날 어떤 차례로 도는지 보입니다. */
  pts.forEach((p, i) => {
    const m = L.marker([p.lat, p.lng], { icon: L.divIcon({
      className:'pmk', iconSize:[26,26], iconAnchor:[13,13],
      html:`<span>${i + 1}</span>` }) });
    m.bindPopup(`<b>${esc(p.title)}</b>` +
      (p.start_time ? `<br>${esc(hm(p.start_time))}` : ''));
    m.addTo(lmarks);
  });
  /* 하루만 보고 있으면 다니는 순서를 선으로 잇습니다. */
  if (pickedDay && pts.length > 1)
    L.polyline(pts.map(p => [p.lat, p.lng]),
      { color:'#0066cc', weight:2, opacity:.5, dashArray:'4 4' }).addTo(lmarks);

  const b = L.latLngBounds(pts.map(p => [p.lat, p.lng]));
  lmap.fitBounds(b, { padding:[28,28], maxZoom:15 });
  setTimeout(() => lmap.invalidateSize(), 50);   /* 접혀 있다 펴지면 크기를 다시 잽니다 */
}

/* ── 메모 쪼개기 ─────────────────────────────────────────────────────
 * 메모 한 덩어리를 그대로 뿌리면 읽히지 않습니다. 실제 메모는 이런 꼴입니다.
 *   "🚇 이동방법: 신바시역 ➡️ [긴자선] 탑승 / 💰 교통비: 약 210엔 / 7번 출구 도보 4분"
 * 슬래시로 자르되 괄호 안의 슬래시는 건드리지 않습니다.
 * "이동방법:" "교통비:" 처럼 앞에 이름이 붙은 조각은 따로 모읍니다. */
function splitParts(s){
  const raw = String(s).split(/\s+\/\s+/), out = [];
  let buf = '', depth = 0;
  for (const piece of raw){
    buf = buf ? buf + ' / ' + piece : piece;
    depth += (piece.match(/[([]/g) || []).length - (piece.match(/[)\]]/g) || []).length;
    if (depth <= 0){ out.push(buf); buf = ''; depth = 0; }
  }
  if (buf) out.push(buf);
  return out;
}
function parseMemo(memo){
  const out = { move:'', cost:'', notes:[] };
  if (!memo) return out;
  for (const part of splitParts(memo)){
    /* 앞에 붙은 이모지와 기호를 걷어냅니다. */
    const s = part.replace(/^[^가-힣A-Za-z0-9([]+/, '').trim();
    if (!s) continue;
    const m = s.match(/^([^:：]{1,16})\s*[:：]\s*([\s\S]+)$/);
    if (m){
      const k = m[1].replace(/\s/g, '');
      if (/이동|가는법/.test(k) && !/비|요금|가격/.test(k)){
        out.move = out.move ? out.move + ' · ' + m[2] : m[2]; continue;
      }
      if (/가격|비용|요금|교통비|입장료|점심|디저트|간식|커피|음료/.test(k)){
        out.cost = out.cost ? out.cost + ' · ' + m[2] : m[2]; continue;
      }
    }
    out.notes.push(s);
  }
  return out;
}
/* 화살표 이모지를 글자로 바꿉니다. 줄 안에서 크기가 들쭉날쭉해 보입니다. */
const nice = s => String(s ?? '').replace(/\s*[➡→⇒]️?\s*/g, ' → ').replace(/\s{2,}/g, ' ').trim();

/* 노선 딱지. 색은 transit_lines 에서 옵니다 — 도쿄 역 안내판과 같은 색입니다. */
function lineChips(text){
  const t = String(text || '');
  let hit = (transitLines || []).filter(L => t.includes(L.name));
  /* "세이부 신주쿠선"이 걸리면 "신주쿠선"은 버립니다 — 같은 노선을 두 번 세는 것입니다. */
  hit = hit.filter(L => !hit.some(O => O !== L && O.name.includes(L.name)));
  return hit.slice(0, 3).map(L =>
    `<span class="ln" style="background:${esc(L.color)}${
      L.dark_text ? '; color:#1c1c1e' : ''}">${esc(L.name)}</span>`).join('');
}

/* 분류 칩. 실제로 쓰인 분류만 내놓습니다 — 없는 칸을 눌러 빈 목록을 보게 할
   이유가 없습니다. */
function drawCats(){
  const used = [...new Set(plans.map(p => p.category).filter(Boolean))];
  $('cats').classList.toggle('hide', used.length < 2);
  $('cats').innerHTML = ['전체', ...used].map(k => {
    const v = k === '전체' ? '' : k;
    return `<span class="day${catFilter === v ? ' on' : ''}" data-cat="${esc(v)}">${
      esc(k)}</span>`;
  }).join('');
}
$('cats').addEventListener('click', e => {
  const b = e.target.closest('[data-cat]'); if (!b) return;
  catFilter = b.dataset.cat;
  drawCats(); drawPlans(); drawPlanMap();
});

/* 그날 몇 곳을 다니고 이동에 얼마나 쓰는지. 좌표가 있는 구간만 셉니다. */
function dayStat(date){
  const list = plans.filter(p => p.date === date);
  let min = 0, km = 0;
  for (let i = 0; i < list.length - 1; i++){
    const h = hop(list[i], list[i+1], legs);
    if (h){ min += h.min; km += h.km; }
  }
  /* fmtM 은 시:분 표기라 걸리는 시간에는 안 맞습니다. "2시간 10분"으로 적습니다. */
  const dur = m => m >= 60 ? `${Math.floor(m/60)}시간${m % 60 ? ' ' + (m%60) + '분' : ''}`
                           : `${m}분`;
  return [ `${list.length}곳`,
           min ? `이동 ${dur(min)}` : null,
           km  ? `${km.toFixed(1)}km` : null ].filter(Boolean).join(' · ');
}

function drawPlans(){
  let show = pickedDay ? plans.filter(p => p.date === pickedDay) : plans;
  if (catFilter) show = show.filter(p => p.category === catFilter);
  if (!show.length){
    $('plans').innerHTML = `<div class="empty">${pickedDay ? '이 날은 비어 있어요.'
      : '아직 일정이 없어요.<br>추가를 눌러 넣어보세요.'}</div>`;
    return;
  }
  let html = '', last = null, prev = null;
  for (const p of show){
    /* 앞 일정과 이 일정 사이에 얼마나 걸리는지. 좌표가 둘 다 있어야 잽니다.
       시간이 모자라면 빨갛게 — 이게 "이 하루가 물리적으로 가능한가"입니다. */
    if (prev && prev.date === p.date){
      const h = hop(prev, p, legs);
      if (h){
        let warn = '';
        if (prev.start_time && p.start_time){
          const end = prev.end_time ? mins(prev.end_time)
                    : mins(prev.start_time) + (STAY_MIN[prev.category] ?? 30);
          const gap = mins(p.start_time) - end;
          if (gap < h.min) warn = ` · ${gap}분밖에 없어요`;
        }
        html += `<div class="hopline${warn ? ' bad' : ''}">
          ${h.walk ? '도보' : '이동'} 약 ${h.min}분 · ${h.km.toFixed(1)}km${esc(warn)}</div>`;
      }
    }
    prev = p;

    if (p.date !== last){                       /* 전체 보기에서 날짜가 바뀌면 머리글 */
      if (!pickedDay){
        const l = legs.length > 1 ? legFor(p.date) : null;
        /* 날짜 옆에 그날 요약을 답니다 — 어느 날이 빡빡한지 여기서 바로 보입니다. */
        html += `<div class="daysep">${esc(dayLabel(p.date, trip))}` +
                `${l ? ' · ' + esc(l.destination) : ''}` +
                `<span class="dstat">${esc(dayStat(p.date))}</span></div>`;
      }
      last = p.date;
    }
    const when = p.start_time ? hm(p.start_time) + (p.end_time ? `<br>~${hm(p.end_time)}` : '')
                              : '<span style="opacity:.45">–</span>';
    /* 분류는 색으로 먼저 읽히게 합니다 — 메모를 안 읽어도 눈으로 찾게 됩니다. */
    const k = p.category ? 'k-' + p.category : '';
    const mm = parseMemo([p.memo, p.move_note].filter(Boolean).join(' / '));
    /* 부제에는 분류와 값만. 자세한 것은 펼쳐야 나옵니다. */
    const sub = [p.category, mm.cost ? mm.cost.split(/[·,]/)[0].trim() : null]
                  .filter(Boolean).join(' · ');
    const q = encodeURIComponent(p.title || '');
    const open = openPlans.has(p.id);

    html += `<div class="ev${open ? ' is-open' : ''}" data-ev="${esc(p.id)}">
      <div class="ev__row">
        <div class="when">${when}</div>
        <span class="kdot ${esc(k)}"></span>
        <div class="body"><b>${esc(p.title)}</b>
          <span class="memo">${esc(sub)}${
            /* 노선은 이동 메모에 적혀 있습니다. 제목에도 있을 수 있어 같이 봅니다. */
            ''}${lineChips((mm.move || '') + ' ' + (p.title || ''))}</span></div>
        <span class="ev__chev">›</span>
      </div>
      <div class="detail">
        ${mm.move ? `<div class="drow"><b>이동</b> ${esc(nice(mm.move))}</div>` : ''}
        ${mm.cost ? `<div class="drow"><b>예상</b> ${esc(nice(mm.cost))}</div>` : ''}
        ${mm.notes.map(n => `<div class="dnote">${esc(nice(n))}</div>`).join('')}
        <div class="dacts">
          <a href="https://www.google.com/maps/search/?api=1&query=${q}"
             target="_blank" rel="noopener">지도에서 보기</a>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=transit"
             target="_blank" rel="noopener">길찾기</a>
          ${trip.myRole === 'viewer' ? '' :
            `<button class="ghost" data-pact="edit" data-id="${esc(p.id)}">수정</button>
             <button class="ghost" data-pact="del" data-id="${esc(p.id)}"
                     style="color:var(--bad); margin-left:auto">삭제</button>`}
        </div>
      </div>
    </div>`;
  }
  $('plans').innerHTML = html;
}

/* 펼친 줄은 기억해 둡니다. 지우거나 고쳐서 다시 그려도 그대로 열려 있어야 합니다. */
const openPlans = new Set();
$('plans').addEventListener('click', e => {
  if (e.target.closest('a, button')) return;      /* 링크와 버튼은 각자 일합니다 */
  const row = e.target.closest('[data-ev]'); if (!row) return;
  const id = row.dataset.ev;
  if (openPlans.has(id)) openPlans.delete(id); else openPlans.add(id);
  row.classList.toggle('is-open');
});

$('days').addEventListener('click', e => {
  const b = e.target.closest('.day'); if (!b) return;
  pickedDay = b.dataset.day || null;
  drawDays(); drawCats(); drawPlans(); drawPlanMap();
});

/* ── 폼을 팝업으로 ───────────────────────────────────────────────────
 * 폼을 여는 자리가 여기저기라 부르는 쪽을 다 고치는 대신, 이 카드들이
 * 보이게 되는 순간을 지켜보다가 알아서 팝업으로 만듭니다.
 * 여는 쪽 코드는 그대로 두고 모양만 바뀝니다. */
const SHEETS = ['plancard', 'card-cand', 'expcard', 'bookcard', 'editcard', 'newcard'];
function syncSheets(){
  let any = false;
  for (const id of SHEETS){
    const el = $(id); if (!el) continue;
    const on = !el.classList.contains('hide');
    el.classList.toggle('assheet', on);
    if (on) any = true;
  }
  $('sheetbg').classList.toggle('hide', !any);
  document.body.classList.toggle('sheeton', any);
}
{
  const ob = new MutationObserver(syncSheets);
  SHEETS.forEach(id => $(id) &&
    ob.observe($(id), { attributes:true, attributeFilter:['class'] }));
  /* 뒤를 누르면 열려 있던 것을 닫습니다. 취소 버튼을 못 찾는 사람이 많습니다. */
  $('sheetbg').addEventListener('click', () => {
    SHEETS.forEach(id => $(id)?.classList.add('hide'));
    syncSheets();
  });
}

/* ── 탭 ─────────────────────────────────────────────────────────────
 * 카드를 한 화면에 다 쌓아두면 예약·준비물까지 붙였을 때 감당이 안 됩니다.
 * DOM 순서는 그대로 두고 보이는 것만 고릅니다 — display:none 이라 사이가 안 벌어집니다. */
const TABS = {
  plans: ['card-plans', 'card-cand', 'plancard'],
  exp:   ['card-exp', 'expcard', 'settlecard'],
  prep:  ['card-book', 'bookcard', 'card-pack', 'card-link'],
  mem:   ['card-mem']
};
/* 탭을 옮기면 열려 있던 폼은 닫습니다 */
const FORMS = ['plancard', 'expcard', 'bookcard', 'card-cand'];

function showTab(t){
  tab = t;
  for (const [k, ids] of Object.entries(TABS))
    for (const id of ids){
      const on = k === t && !FORMS.includes(id)
                 && !(id === 'settlecard' && !settleOn);
      $(id).classList.toggle('hide', !on);
    }
  $('editcard').classList.add('hide');
  document.querySelectorAll('#tabbar button').forEach(b =>
    b.classList.toggle('is-on', b.dataset.t === t));
  window.scrollTo({ top:0, behavior:'smooth' });
}
$('tabbar').addEventListener('click', e => {
  const b = e.target.closest('button[data-t]');
  if (b) showTab(b.dataset.t);
});

/* ── 지출 ───────────────────────────────────────────────────────── */
/* 통화마다 소수 자리가 다릅니다. 엔·원·동은 소수점이 없습니다. */
const NO_CENTS = ['JPY','KRW','VND','IDR','CLP','HUF','TWD'];
function money(n, cur){
  try {
    return new Intl.NumberFormat('ko-KR', { style:'currency', currency:cur,
      maximumFractionDigits: NO_CENTS.includes(cur) ? 0 : 2 }).format(n);
  } catch { return `${Math.round(n).toLocaleString('ko-KR')} ${cur}`; }
}
/* ── 환율 ───────────────────────────────────────────────────────────
 * 유럽중앙은행이 매일 내는 값을 씁니다. 키가 없어도 되고 공개 자료입니다.
 *
 * **쓴 날의 환율을 지출에 못박아 저장합니다.** 볼 때마다 새로 받아오면
 * 오늘 본 사람과 내일 본 사람의 "너 나한테 얼마"가 달라집니다.
 * 정산은 사람마다 같은 숫자가 나와야 합니다.
 *
 * 실패하면 환산을 안 하고 통화별로 나눠 보여줍니다. 틀린 숫자를 내놓느니
 * 안 내놓는 편이 낫습니다. */
/* 기준을 EUR 로 고정합니다.
   from=KRW 로 받으면 EUR 이 0.0006 처럼 네 자리로 잘려 와서 되돌릴 때
   1,667원이 됩니다. 실제는 1,658원 — 0.5% 가 틀어집니다.
   EUR 기준이면 KRW=1657.99 로 제대로 옵니다. */
async function fxFor(date){
  const key = `t2:fx:${date}`;
  const hit = localStorage.getItem(key);
  if (hit) return JSON.parse(hit);

  /* 아직 환율이 안 나온 날짜(미래·오늘)는 404 입니다. 그럴 땐 최신값을 씁니다. */
  for (const d of [date, 'latest']){
    try {
      const r = await fetch(`https://api.frankfurter.app/${d}?from=EUR`);
      if (!r.ok) continue;
      const j = await r.json();
      if (!j?.rates) continue;
      const v = { date: j.date, rates: j.rates };
      localStorage.setItem(key, JSON.stringify(v));
      return v;
    } catch { /* 다음 것으로 */ }
  }
  return null;
}

/* 현지 통화 1 = 집 통화 얼마. 못 구하면 null 이고 환산하지 않습니다. */
async function rateOf(cur, home, date){
  if (cur === home) return 1;
  const fx = await fxFor(date);
  if (!fx) return null;
  const at = c => c === 'EUR' ? 1 : fx.rates[c];   /* 기준이 EUR 이라 EUR 은 1 */
  const a = at(cur), b = at(home);
  return (a && b) ? b / a : null;
}

const nameOf = id => {
  const m = members.find(x => x.user_id === id);
  return m ? (m.nickname || m.profiles?.display_name || '이름 없음') : '알 수 없음';
};

async function loadExpenses(){
  $('experr').classList.add('hide');
  const { data, error } = await sb.from('expenses')
    .select('id,date,title,amount,currency,amount_home,fx_rate,category,payer_id,memo')
    .eq('trip_id', trip.id)
    .is('deleted_at', null)
    .order('date', { ascending:false }).order('created_at', { ascending:false });
  if (error){ $('expenses').innerHTML = ''; return fail(error, 'exp'); }
  expenses = data;
  drawExpenses();
  drawSettle();
}

function drawExpenses(){
  if (!expenses.length){
    $('exptotal').innerHTML = '';
    $('expenses').innerHTML = '<div class="empty">아직 지출이 없어요.</div>';
    return;
  }
  const byCur = {};
  for (const e of expenses) byCur[e.currency] = (byCur[e.currency] || 0) + Number(e.amount);
  const detail = Object.entries(byCur).map(([c, v]) => money(v, c)).join(' · ');

  /* 환산된 것만 합칩니다. 못 구한 환율을 짐작해 채우면 틀린 총액이 나옵니다. */
  const done = expenses.filter(e => e.amount_home != null);
  const missing = expenses.length - done.length;
  const total = done.reduce((s, e) => s + Number(e.amount_home), 0);

  /* 분류별로 얼마나 썼는지. 숫자만 늘어놓으면 어디에 많이 쓴 건지 안 보입니다.
     환산된 것만 셉니다 — 못 구한 환율을 섞으면 비중이 틀립니다. */
  const byCat = {};
  done.forEach(e => {
    const k = e.category || '기타';
    byCat[k] = (byCat[k] || 0) + Number(e.amount_home);
  });
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const bar = total > 0
    ? `<div class="cbar">${cats.map(([k, v]) =>
        `<i class="k-${esc(k)}" style="width:${(v / total * 100).toFixed(2)}%"></i>`).join('')}</div>
       <div class="clegend">${cats.map(([k, v]) =>
        `<span><i class="k-${esc(k)}"></i>${esc(k)}
           <b>${esc(money(v, trip.home_currency))}</b>
           <em>${Math.round(v / total * 100)}%</em></span>`).join('')}</div>`
    : '';

  $('exptotal').innerHTML =
    `<div class="picked" style="margin-bottom:var(--s-sm); display:block">
       <div class="c">모두 합쳐</div>
       ${done.length
         ? `<b style="font-size:calc(21px * var(--ts))">${esc(money(total, trip.home_currency))}</b>`
         : ''}
       <div class="c">${esc(detail)}</div>
       ${missing ? `<div class="c" style="color:var(--bad); margin-top:6px">
            환율을 못 구한 지출 ${missing}건은 합계에서 빠졌어요.
            <button class="ghost" id="fxfill" style="padding:2px 8px; color:var(--primary)">
              환율 채우기</button></div>` : ''}
       ${bar}
     </div>`;
  if (missing) $('fxfill').onclick = fillRates;

  let html = '', last = null;
  for (const e of expenses){
    if (e.date !== last){
      html += `<div class="daysep">${esc(dayLabel(e.date, trip))}</div>`;
      last = e.date;
    }
    const k = e.category ? 'k-' + e.category : '';
    const sub = [e.payer_id ? nameOf(e.payer_id) + ' 결제' : null, e.memo]
                .filter(Boolean).join(' · ');
    html += `<div class="plan">
      <span class="kdot ${esc(k)}"></span>
      <div class="body"><b>${esc(e.title)}</b>
        ${e.category ? `<span class="ktag ${esc(k)}">${esc(e.category)}</span>` : ''}
        ${sub ? `<span class="memo">${esc(sub)}</span>` : ''}</div>
      <div style="text-align:right; flex:none">
        <b style="white-space:nowrap">${esc(money(Number(e.amount), e.currency))}</b>
        ${e.currency !== trip.home_currency && e.amount_home != null
          ? `<div class="memo" style="white-space:nowrap">${
              esc(money(Number(e.amount_home), trip.home_currency))}</div>` : ''}</div>
      ${trip.myRole === 'viewer' ? '' :
        `<button class="ghost" data-xact="del" data-id="${esc(e.id)}"
                 style="color:var(--bad); align-self:start; padding:2px 6px">×</button>`}</div>`;
  }
  $('expenses').innerHTML = html;
}

/* 정산 — 비어 있으면 전원 균등입니다 (문서의 expense_shares 규칙).
   나간 사람도 셈에 넣습니다. 빼면 그 사람이 낸 돈이 갈 곳이 없어집니다.
   집 통화 하나로 정산합니다 — 실제로 "너 나한테 12만원" 하고 보내지,
   유로 따로 프랑 따로 보내지 않습니다. */
function drawSettle(){
  const rows = expenses.filter(e => e.amount_home != null);
  if (!rows.length || members.length < 2){
    settleOn = false; $('settlecard').classList.add('hide'); return;
  }
  settleOn = true;
  $('settlecard').classList.toggle('hide', tab !== 'exp');

  const cur = trip.home_currency;
  const total = rows.reduce((s, e) => s + Number(e.amount_home), 0);
  const share = total / members.length;

  const paid = {};
  members.forEach(m => paid[m.user_id] = 0);
  /* 결제자를 안 적은 지출은 공동으로 봅니다 — 아무에게도 안 몰아줍니다. */
  rows.forEach(e => { if (e.payer_id != null && e.payer_id in paid)
                        paid[e.payer_id] += Number(e.amount_home); });

  const bal = members.map(m => ({ id:m.user_id, v: paid[m.user_id] - share }))
                     .sort((a, b) => a.v - b.v);
  /* 적게 낸 사람이 많이 낸 사람에게 보냅니다. 큰 쪽부터 맞물려 건수를 줄입니다. */
  const moves = [];
  let i = 0, j = bal.length - 1;
  while (i < j){
    const owe = -bal[i].v, get = bal[j].v;
    if (owe < 1){ i++; continue; }
    if (get < 1){ j--; continue; }
    const v = Math.min(owe, get);
    moves.push({ from: bal[i].id, to: bal[j].id, v });
    bal[i].v += v; bal[j].v -= v;
  }

  const left = expenses.length - rows.length;
  $('settle').innerHTML =
    `<div class="row" style="border:0; padding:0; margin:0">
       <span class="label"><b>${esc(money(total, cur))}</b></span>
       <span class="val">1인 ${esc(money(share, cur))}</span></div>
     ${moves.length
       ? moves.map(m => `<div class="row"><span class="label">${esc(nameOf(m.from))}
            → ${esc(nameOf(m.to))}</span>
            <span class="val"><b>${esc(money(m.v, cur))}</b></span></div>`).join('')
       : '<div class="empty" style="padding:10px 0">딱 맞아요.</div>'}
     ${left ? `<div class="empty" style="text-align:left; color:var(--bad)">
          환율을 못 구한 ${left}건은 이 정산에 안 들어갔어요.</div>` : ''}`;
}

/* 환율이 비어 있는 지출을 그날 환율로 채웁니다.
   과거 날짜는 그날 값을, 아직 안 나온 날짜는 가장 최근 값을 씁니다. */
async function fillRates(){
  const btn = $('fxfill');
  btn.disabled = true; btn.textContent = '채우는 중…';
  let ok = 0, fail_ = 0;
  for (const e of expenses.filter(x => x.amount_home == null)){
    const r = await rateOf(e.currency, trip.home_currency, e.date);
    if (r == null){ fail_++; continue; }
    const up = await sb.from('expenses')
      .update({ fx_rate: r, amount_home: Number(e.amount) * r })
      .eq('id', e.id).select('id');
    if (up.error || !up.data?.length) fail_++; else ok++;
  }
  await loadExpenses();
  if (fail_) fail(`${ok}건을 채웠어요. ${fail_}건은 환율을 못 구했어요 ` +
                  `(유럽중앙은행이 안 내는 통화일 수 있어요).`, 'exp');
}

$('addexpbtn').addEventListener('click', () => {
  $('expcard').classList.toggle('hide');
  if ($('expcard').classList.contains('hide')) return;
  /* 통화는 그날 있는 곳이 기본입니다. 구간마다 나라가 다르면 통화도 다릅니다.
     집 통화도 함께 둡니다 — 한국에서 미리 결제한 것들 때문입니다. */
  const curs = [...new Set([...legs.map(l => l.currency),
                            trip.currency, trip.home_currency, 'USD', 'EUR'])];
  $('x_cur').innerHTML = curs.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  $('x_payer').innerHTML = members.map(m =>
    `<option value="${esc(m.user_id)}"${m.user_id === me.id ? ' selected' : ''}>` +
    `${esc(nameOf(m.user_id))}${m.left_at ? ' (탈퇴함)' : ''}</option>`).join('') +
    `<option value="">공동 (결제자 없음)</option>`;
  $('x_date').value = pickedDay || ymd(new Date());
  syncExpCur();
  $('x_title').focus();
});
/* 날짜를 바꾸면 그날 있는 곳의 통화로 맞춥니다. */
function syncExpCur(){
  const l = legFor($('x_date').value);
  if (l) $('x_cur').value = l.currency;
}
$('x_date').addEventListener('change', syncExpCur);
$('x_cancel').addEventListener('click', () => {
  $('expcard').classList.add('hide'); $('expformerr').classList.add('hide');
});

$('x_create').addEventListener('click', async () => {
  const btn = $('x_create');
  $('expformerr').classList.add('hide');
  const title = $('x_title').value.trim();
  /* 12,000 처럼 쉼표를 넣는 사람이 많습니다. 그대로 받으면 NaN 이 됩니다. */
  const amount = Number($('x_amount').value.replace(/[,\s]/g, ''));
  const date = $('x_date').value;

  if (!title)                    return fail('무엇에 썼는지 적어주세요.', 'expform');
  if (!isFinite(amount) || amount <= 0)
                                 return fail('금액을 숫자로 적어주세요.', 'expform');
  if (!date)                     return fail('날짜를 골라주세요.', 'expform');

  btn.disabled = true; btn.textContent = '넣는 중…';
  /* 쓴 날 환율을 여기서 못박습니다. 나중에 볼 때마다 새로 받아오면
     사람마다 정산 금액이 달라집니다. */
  const cur = $('x_cur').value;
  const rate = await rateOf(cur, trip.home_currency, date);

  const { data, error } = await sb.from('expenses').insert({
    trip_id: trip.id, title, amount, date, currency: cur,
    fx_rate: rate, amount_home: rate == null ? null : amount * rate,
    category: $('x_cat').value || null,
    payer_id: $('x_payer').value || null,
    memo: $('x_memo').value.trim() || null
  }).select('id');
  btn.disabled = false; btn.textContent = '넣기';

  if (error) return fail(error, 'expform');
  if (!data?.length) return fail('아무것도 저장되지 않았습니다 (0건).', 'expform');

  $('x_title').value = ''; $('x_amount').value = ''; $('x_memo').value = '';
  $('expcard').classList.add('hide');
  await loadExpenses();
});

$('expenses').addEventListener('click', async e => {
  const b = e.target.closest('button[data-xact]'); if (!b) return;
  if (b.dataset.armed !== '1'){
    arm(b, '정말?'); return;
  }
  b.disabled = true;
  const r = await sb.from('expenses')
    .update({ deleted_at: new Date().toISOString() }).eq('id', b.dataset.id).select('id');
  b.disabled = false;
  if (r.error) return fail(r.error, 'exp');
  if (!r.data?.length) return fail('아무것도 바뀌지 않았습니다 (0건).', 'exp');
  await loadExpenses();
});

/* ── 예약 ───────────────────────────────────────────────────────────
 * 여행 중에 제일 자주 열어보는 것입니다 — 항공편 번호, 숙소 예약번호.
 * 읽기 전용 공유 링크에는 절대 안 나갑니다 (get_shared_trip 에 아예 없습니다). */
const KIND_K = { 항공:'이동', 기차:'이동', 렌터카:'이동', 숙소:'숙소',
                 식당:'식사', 티켓:'관광', 기타:'기타' };

async function loadBookings(){
  $('bookerr').classList.add('hide');
  const { data, error } = await sb.from('bookings')
    .select('id,kind,title,ref,start_date,start_time,end_date,end_time,address,tel,memo')
    .eq('trip_id', trip.id).is('deleted_at', null)
    .order('start_date', { nullsFirst:false }).order('start_time', { nullsFirst:false });
  if (error){ $('bookings').innerHTML = ''; return fail(error, 'book'); }
  bookings = data;

  $('bookings').innerHTML = data.length ? data.map(b => {
    const k = 'k-' + (KIND_K[b.kind] || '기타');
    const when = [b.start_date, hm(b.start_time)].filter(Boolean).join(' ') +
      (b.end_date && b.end_date !== b.start_date
        ? ' ~ ' + b.end_date + (b.end_time ? ' ' + hm(b.end_time) : '')
        : b.end_time ? '~' + hm(b.end_time) : '');
    const sub = [when, b.address, b.tel, b.memo].filter(Boolean).join(' · ');
    return `<div class="plan">
      <span class="kdot ${esc(k)}"></span>
      <div class="body"><b>${esc(b.title)}</b>
        <span class="ktag ${esc(k)}">${esc(b.kind)}</span>
        ${b.ref ? `<span class="refno">${esc(b.ref)}</span>` : ''}
        ${sub ? `<span class="memo">${esc(sub)}</span>` : ''}</div>
      ${trip.myRole === 'viewer' ? '' :
        `<button class="ghost" data-bact="del" data-id="${esc(b.id)}"
                 style="color:var(--bad); align-self:start; padding:2px 6px">×</button>`}</div>`;
  }).join('') : '<div class="empty">항공권·숙소 예약을 넣어두면 여행 중에 찾기 쉬워요.</div>';
}

$('addbookbtn').addEventListener('click', () => {
  $('bookcard').classList.toggle('hide');
  if ($('bookcard').classList.contains('hide')) return;
  if (!$('b_sdate').value) $('b_sdate').value = trip.start_date;
  $('b_title').focus();
});
$('b_cancel').addEventListener('click', () => {
  $('bookcard').classList.add('hide'); $('bookformerr').classList.add('hide');
});

$('b_create').addEventListener('click', async () => {
  const btn = $('b_create');
  $('bookformerr').classList.add('hide');
  const title = $('b_title').value.trim();
  if (!title) return fail('무엇을 예약했는지 적어주세요.', 'bookform');

  btn.disabled = true; btn.textContent = '넣는 중…';
  const { data, error } = await sb.from('bookings').insert({
    trip_id: trip.id, kind: $('b_kind').value, title,
    ref: $('b_ref').value.trim() || null,
    start_date: $('b_sdate').value || null, start_time: $('b_stime').value || null,
    end_date: $('b_edate').value || null,   end_time: $('b_etime').value || null,
    address: $('b_addr').value.trim() || null,
    tel: $('b_tel').value.trim() || null,
    memo: $('b_memo').value.trim() || null,
  }).select('id');
  btn.disabled = false; btn.textContent = '넣기';
  if (error) return fail(error, 'bookform');
  if (!data?.length) return fail('저장되지 않았습니다 (0건).', 'bookform');

  ['b_title','b_ref','b_addr','b_tel','b_memo','b_stime','b_etime','b_edate']
    .forEach(id => $(id).value = '');
  $('bookcard').classList.add('hide');
  await loadBookings();
});

$('bookings').addEventListener('click', e => softDel(e, 'bact', 'bookings', loadBookings, 'book'));

/* ── 준비물 ─────────────────────────────────────────────────────────
 * 담당을 참여자와 이어야 "내가 챙길 것"만 볼 수 있습니다.
 * 도쿄 앱은 문자열이라 그게 안 됐습니다. */
async function loadPacking(){
  $('packerr').classList.add('hide');
  const { data, error } = await sb.from('packing')
    .select('id,title,done,assignee_id,category')
    .eq('trip_id', trip.id).is('deleted_at', null)
    .order('done').order('created_at');
  if (error){ $('packing').innerHTML = ''; return fail(error, 'pack'); }

  const done = data.filter(p => p.done).length;
  $('packcount').textContent = data.length ? `${done}/${data.length}` : '';
  $('k_who').innerHTML = `<option value="">담당 없음</option>` + members
    .filter(m => !m.left_at)
    .map(m => `<option value="${esc(m.user_id)}">${esc(nameOf(m.user_id))}</option>`).join('');

  $('packing').innerHTML = data.length ? data.map(p =>
    `<div class="row"><input type="checkbox" data-pk="${esc(p.id)}"
        ${p.done ? 'checked' : ''} ${trip.myRole === 'viewer' ? 'disabled' : ''}
        style="width:auto; flex:none; margin:0">
      <span class="label"${p.done ? ' style="opacity:.45; text-decoration:line-through"' : ''}>
        ${esc(p.title)}</span>
      ${p.assignee_id ? `<span class="badge">${esc(nameOf(p.assignee_id))}</span>` : ''}
      ${trip.myRole === 'viewer' ? '' :
        `<button class="ghost" data-kact="del" data-id="${esc(p.id)}"
                 style="color:var(--bad); padding:2px 6px">×</button>`}</div>`).join('')
    : '<div class="empty">챙길 것을 적어두세요.</div>';
}

$('k_add').addEventListener('click', async () => {
  const t = $('k_title').value.trim();
  if (!t) return;
  $('packerr').classList.add('hide');
  $('k_add').disabled = true;
  const { data, error } = await sb.from('packing').insert({
    trip_id: trip.id, title: t, assignee_id: $('k_who').value || null,
  }).select('id');
  $('k_add').disabled = false;
  if (error) return fail(error, 'pack');
  if (!data?.length) return fail('저장되지 않았습니다 (0건).', 'pack');
  $('k_title').value = '';
  await loadPacking();
});
$('k_title').addEventListener('keydown', e => {
  if (e.key === 'Enter'){ e.preventDefault(); $('k_add').click(); }
});
$('packing').addEventListener('change', async e => {
  const c = e.target.closest('input[data-pk]'); if (!c) return;
  const r = await sb.from('packing').update({ done: c.checked })
    .eq('id', c.dataset.pk).select('id');
  if (r.error){ c.checked = !c.checked; return fail(r.error, 'pack'); }
  await loadPacking();
});
$('packing').addEventListener('click', e => softDel(e, 'kact', 'packing', loadPacking, 'pack'));

/* ── 링크 ── 예약 확인 페이지, 블로그, 지도 같은 것 */
async function loadLinks(){
  $('linkerr').classList.add('hide');
  const { data, error } = await sb.from('links')
    .select('id,title,url,category').eq('trip_id', trip.id)
    .is('deleted_at', null).order('created_at');
  if (error){ $('links').innerHTML = ''; return fail(error, 'link'); }
  $('links').innerHTML = data.length ? data.map(l =>
    `<div class="row"><span class="label">
        <a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"
           style="color:var(--primary)"><b>${esc(l.title)}</b></a>
        <div class="memo" style="word-break:break-all">${esc(l.url)}</div></span>
      ${trip.myRole === 'viewer' ? '' :
        `<button class="ghost" data-lkact="del" data-id="${esc(l.id)}"
                 style="color:var(--bad); padding:2px 6px">×</button>`}</div>`).join('')
    : '<div class="empty">예약 확인 페이지나 블로그를 담아두세요.</div>';
}

$('l_add').addEventListener('click', async () => {
  const t = $('l_title').value.trim(), u = $('l_url').value.trim();
  $('linkerr').classList.add('hide');
  if (!u) return fail('주소를 넣어주세요.', 'link');
  /* http 없이 붙여넣는 일이 많습니다. 그대로 두면 앱 안 경로로 열립니다. */
  const url = /^https?:\/\//i.test(u) ? u : 'https://' + u;
  $('l_add').disabled = true;
  const { data, error } = await sb.from('links')
    .insert({ trip_id: trip.id, title: t || url, url }).select('id');
  $('l_add').disabled = false;
  if (error) return fail(error, 'link');
  if (!data?.length) return fail('저장되지 않았습니다 (0건).', 'link');
  $('l_title').value = ''; $('l_url').value = '';
  await loadLinks();
});
$('l_url').addEventListener('keydown', e => {
  if (e.key === 'Enter'){ e.preventDefault(); $('l_add').click(); }
});
$('links').addEventListener('click', e => softDel(e, 'lkact', 'links', loadLinks, 'link'));

/* 세 곳이 지우는 방식이 같습니다. 한 번 묻고, 진짜로 안 지우고 숨깁니다. */
async function softDel(e, attr, table, reload, errBox){
  const b = e.target.closest(`button[data-${attr}]`); if (!b) return;
  if (b.dataset.armed !== '1'){
    arm(b, '정말?'); return;
  }
  b.disabled = true;
  const r = await sb.from(table).update({ deleted_at: new Date().toISOString() })
    .eq('id', b.dataset.id).select('id');
  b.disabled = false;
  if (r.error) return fail(r.error, errBox);
  if (!r.data?.length) return fail('아무것도 바뀌지 않았습니다 (0건).', errBox);
  await reload();
}

/* ── 일행 ───────────────────────────────────────────────────────── */
const ROLE_KO = { owner:'소유자', editor:'편집자', viewer:'보기만' };

async function loadMembers(){
  $('memerr').classList.add('hide');
  const { data, error } = await sb.from('trip_members')
    .select('user_id,role,nickname,left_at,joined_at,profiles(display_name,avatar_url)')
    .eq('trip_id', trip.id)
    .order('joined_at');
  if (error){ $('members').innerHTML = ''; return fail(error, 'mem'); }
  members = data;

  const owner = trip.myRole === 'owner';
  $('members').innerHTML = data.map(m => {
    const p = m.profiles || {};
    const name = m.nickname || p.display_name || '이름 없음';
    const self = m.user_id === me.id;
    const gone = !!m.left_at;
    /* 나간 사람도 지웁니다가 아니라 남깁니다 — 빼면 정산이 어긋납니다. */
    const tag = gone ? '<span class="badge">탈퇴함</span>'
                     : `<span class="badge">${esc(ROLE_KO[m.role] || m.role)}</span>`;
    /* 소유자만 남의 권한을 바꾸거나 내보냅니다. 자기 자신은 못 건드립니다. */
    const admin = (owner && !self && !gone)
      ? `<select data-mrole="${esc(m.user_id)}" style="width:auto; padding:4px 8px;
                 font-size:calc(12px * var(--ts))">
           <option value="editor"${m.role === 'editor' ? ' selected' : ''}>편집자</option>
           <option value="viewer"${m.role === 'viewer' ? ' selected' : ''}>보기만</option>
         </select>
         <button class="ghost" data-mact="kick" data-id="${esc(m.user_id)}"
                 data-name="${esc(name)}" style="color:var(--bad)">내보내기</button>`
      : '';
    const mine = self && !gone
      ? `<button class="ghost" data-mact="nick" data-nick="${esc(m.nickname || '')}">별명</button>`
      : '';
    return `<div class="trip" style="cursor:default">
      <img src="${esc(p.avatar_url || '')}" alt=""
           style="width:32px;height:32px;border-radius:50%;background:var(--sunk);flex:none"
           onerror="this.style.visibility='hidden'">
      <div class="t"><b style="${gone ? 'opacity:.5' : ''}">${esc(name)}${self ? ' (나)' : ''}</b>
        <div style="margin-top:2px">${mine}${admin}</div></div>${tag}</div>`;
  }).join('');

  /* 초대는 소유자만 만듭니다. */
  $('invbtn').classList.toggle('hide', !owner);
}

$('invbtn').addEventListener('click', () => {
  $('invitebox').classList.toggle('hide');
  $('i_result').classList.add('hide');
});
$('i_cancel').addEventListener('click', () => $('invitebox').classList.add('hide'));

$('i_make').addEventListener('click', async () => {
  const btn = $('i_make');
  $('memerr').classList.add('hide');
  btn.disabled = true; btn.textContent = '만드는 중…';
  const { data, error } = await sb.from('trip_invites')
    .insert({ trip_id: trip.id, role: $('i_role').value })
    .select('code').maybeSingle();
  btn.disabled = false; btn.textContent = '초대 링크 만들기';
  if (error) return fail(error, 'mem');
  if (!data)  return fail('초대를 만들지 못했습니다 (0건). 소유자만 만들 수 있습니다.', 'mem');

  const link = location.origin + location.pathname + '?join=' + data.code;
  $('i_link').textContent = link;
  $('i_result').classList.remove('hide');
});

/* 복사는 두 번 시도합니다.
   navigator.clipboard 는 내장 브라우저나 iframe 에서 막히는 일이 있는데,
   그럴 때 옛 execCommand 방식은 대개 통합니다. 한 번 실패했다고 포기하면
   사용자가 손으로 긁어야 합니다. */
async function copyText(t){
  try { await navigator.clipboard.writeText(t); return true; } catch {}
  try {
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed; top:0; left:0; opacity:0';
    document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0, t.length);
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
}

$('i_copy').addEventListener('click', async () => {
  const ok = await copyText($('i_link').textContent);
  $('i_copy').textContent = ok ? '복사됨' : '아래 글자를 복사하세요';
  if (!ok){
    /* 둘 다 막혔으면 최소한 긁어는 놓습니다. 그대로 Ctrl+C 면 됩니다. */
    const r = document.createRange(); r.selectNodeContents($('i_link'));
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  setTimeout(() => { $('i_copy').textContent = '복사'; }, 2000);
});

$('members').addEventListener('click', async e => {
  const b = e.target.closest('button[data-mact]'); if (!b) return;

  /* prompt 도 confirm 과 같이 내장 브라우저에서 막힙니다. 화면 안에서 받습니다. */
  if (b.dataset.mact === 'nick'){
    b.outerHTML =
      `<input id="nickin" value="${esc(b.dataset.nick)}" maxlength="20"
              placeholder="비우면 계정 이름" style="width:auto; max-width:160px;
              padding:4px 10px; font-size:calc(12px * var(--ts))">
       <button class="ghost" data-mact="nicksave">저장</button>`;
    $('nickin').focus();
    return;
  }
  if (b.dataset.mact === 'nicksave'){
    b.disabled = true;
    const r = await sb.from('trip_members')
      .update({ nickname: $('nickin').value.trim() || null })
      .eq('trip_id', trip.id).eq('user_id', me.id).select('user_id');
    b.disabled = false;
    if (r.error) return fail(r.error, 'mem');
    return loadMembers();
  }

  if (b.dataset.mact === 'kick'){
    if (b.dataset.armed !== '1'){       /* 확인창을 안 쓰는 이유는 앞과 같습니다 */
      arm(b, `정말 ${b.dataset.name} 내보내기?`); return;
    }
    b.disabled = true;
    /* 지우지 않고 나간 것으로 표시합니다. 지출에 이름이 남아야 정산이 맞습니다. */
    const r = await sb.from('trip_members')
      .update({ left_at: new Date().toISOString() })
      .eq('trip_id', trip.id).eq('user_id', b.dataset.id).select('user_id');
    b.disabled = false;
    if (r.error) return fail(r.error, 'mem');
    if (!r.data?.length) return fail('아무것도 바뀌지 않았습니다 (0건).', 'mem');
    return loadMembers();
  }
});

$('members').addEventListener('change', async e => {
  const s = e.target.closest('select[data-mrole]'); if (!s) return;
  const r = await sb.from('trip_members').update({ role: s.value })
    .eq('trip_id', trip.id).eq('user_id', s.dataset.mrole).select('user_id');
  if (r.error) return fail(r.error, 'mem');
  if (!r.data?.length) return fail('권한을 바꾸지 못했습니다 (0건).', 'mem');
  await loadMembers();
});

/* ── 초대 링크로 들어왔을 때 ────────────────────────────────────── */
async function handleJoin(){
  const code = sessionStorage.getItem('t2:join');
  if (!code) return false;
  sessionStorage.removeItem('t2:join');

  const { data, error } = await sb.rpc('redeem_invite', { p_code: code });
  if (error){ fail(error, 'trip'); return false; }
  await loadTrips();
  await openTrip(data);
  return true;
}

/* ── 일정 추가 · 삭제 ───────────────────────────────────────────── */
$('addplanbtn').addEventListener('click', () => {
  editPlanId = null; $('p_create').textContent = '넣기';
  $('plancard').classList.toggle('hide');
  if ($('plancard').classList.contains('hide')) return;
  $('p_date').value = pickedDay || trip.start_date;
  $('p_date').min = '';                    /* 여행 기간 밖도 넣을 수 있어야 합니다 */
  $('p_title').focus();
});
$('p_cancel').addEventListener('click', () => {
  $('plancard').classList.add('hide'); $('planformerr').classList.add('hide');
});

$('p_create').addEventListener('click', async () => {
  const btn = $('p_create');
  $('planformerr').classList.add('hide');
  const title = $('p_title').value.trim(), date = $('p_date').value;
  const st = $('p_start').value, et = $('p_end').value;

  if (!title) return fail('무엇을 하는지 적어주세요.', 'planform');
  if (!date)  return fail('날짜를 골라주세요.', 'planform');
  if (st && et && et < st) return fail('끝나는 시각이 시작보다 빠릅니다.', 'planform');

  /* 같은 날 맨 뒤로 보냅니다. 소수를 쓰면 나중에 둘 사이에 끼울 때
     그 둘만 건드리면 됩니다 — 같이 편집할 때 서로의 순서를 안 덮습니다. */
  const sameDay = plans.filter(p => p.date === date);
  const sort = sameDay.length ? Math.max(...sameDay.map(p => +p.sort_order)) + 1 : 0;

  const row = {
    title, date,
    start_time: st || null, end_time: et || null,
    category: $('p_cat').value || null,
    memo: $('p_memo').value.trim() || null,
  };
  btn.disabled = true; btn.textContent = editPlanId ? '고치는 중…' : '넣는 중…';
  /* 고치는 중이면 그 줄만 바꿉니다. 새로 넣으면 같은 것이 두 개가 됩니다. */
  const { data, error } = editPlanId
    ? await sb.from('plans').update(row).eq('id', editPlanId).select('id')
    : await sb.from('plans').insert({ trip_id: trip.id, sort_order: sort, ...row })
        .select('id');
  btn.disabled = false; btn.textContent = '넣기';

  if (error) return fail(error, 'planform');
  if (!data?.length) return fail('아무것도 저장되지 않았습니다 (0건). 권한을 확인해주세요.',
                                 'planform');

  $('p_title').value = ''; $('p_memo').value = '';
  $('p_start').value = ''; $('p_end').value = '';
  editPlanId = null;
  $('plancard').classList.add('hide');
  await loadPlans();
});

$('plans').addEventListener('click', async e => {
  const b = e.target.closest('button[data-pact]'); if (!b) return;
  const id = b.dataset.id;

  /* 고치기 — 일정 칸을 그 줄 내용으로 채워 엽니다. 새로 적게 하지 않습니다. */
  if (b.dataset.pact === 'edit'){
    const p = plans.find(x => x.id === id); if (!p) return;
    $('addplanbtn').click();
    $('p_title').value = p.title || '';
    $('p_date').value  = p.date || '';
    $('p_start').value = p.start_time ? p.start_time.slice(0,5) : '';
    $('p_end').value   = p.end_time ? p.end_time.slice(0,5) : '';
    $('p_cat').value   = p.category || '';
    $('p_memo').value  = p.memo || '';
    editPlanId = id;
    $('p_create').textContent = '고치기';
    return;
  }

  if (b.dataset.armed !== '1'){          /* 확인창을 안 쓰는 이유는 목록 쪽과 같습니다 */
    arm(b, '정말 지울까요?'); return;
  }
  b.disabled = true;
  /* 진짜 지우지 않고 숨깁니다. 여럿이 쓰면 남이 지운 것을 되살릴 방법이 필요합니다. */
  const { data, error } = await sb.from('plans')
    .update({ deleted_at: new Date().toISOString() }).eq('id', id).select('id');
  b.disabled = false;
  if (error) return fail(error, 'plan');
  if (!data?.length) return fail('아무것도 바뀌지 않았습니다 (0건).', 'plan');
  await loadPlans();
});

/* ── 화면 전환 ──────────────────────────────────────────────────── */
async function render(session){
  if (!session){
    unwatch(); trip = null; document.body.classList.remove('hastab');
    $('signedin').classList.add('hide'); $('signedout').classList.remove('hide');
    $('errcard').classList.add('hide'); $('bell').classList.add('hide'); $('aibtn').classList.add('hide');
    $('sub').textContent = '로그인하면 여행을 만들 수 있어요.';
    me = null;

    /* 초대 링크로 왔으면 어떤 여행인지 먼저 보여줍니다.
       아직 참여자가 아니라 trips 를 못 읽으므로 이름과 날짜만 주는 함수를 씁니다. */
    const code = sessionStorage.getItem('t2:join');
    if (code){
      const { data } = await sb.rpc('peek_invite', { p_code: code });
      if (data){
        $('joinnote').classList.remove('hide');
        $('joinname').textContent = data.title;
        $('joinwhen').textContent = data.expired
          ? '만료된 초대입니다'
          : `${data.destination} · ${data.start_date} ~ ${data.end_date} · ` +
            `${ROLE_KO[data.role] || data.role}로 참여`;
      }
    }
    return;
  }
  if (me?.id === session.user.id) return;      /* 토큰 갱신마다 다시 그리지 않습니다 */
  me = session.user;

  $('signedout').classList.add('hide'); $('signedin').classList.remove('hide');
  unwatch(); trip = null;
  $('tripview').classList.add('hide');           /* 다시 그릴 때는 목록부터 */
  $('appbar').classList.remove('hide');
  $('tabbar').classList.add('hide');
  document.body.classList.add('hastab');
  $('sub').textContent = '';

  const meta = me.user_metadata || {};
  $('mail').textContent = me.email || '';
  /* 우리 통에 올린 사진과 바꾼 이름을 먼저 씁니다. 없으면 구글 것.
     이름을 구글 것만 보고 있어서, 바꿔도 다시 열면 되돌아왔습니다. */
  const prof0 = await sb.from('profiles')
    .select('avatar_url,display_name').eq('id', me.id).maybeSingle();
  $('name').textContent = prof0.data?.display_name ||
    meta.full_name || meta.name || (me.email||'').split('@')[0];
  myAvatar = prof0.data?.avatar_url || meta.avatar_url || meta.picture || '';
  if (myAvatar) $('avatar').src = myAvatar;

  /* 가입 트리거가 실제로 돌았는지 봅니다 (001 의 handle_new_user). */
  const [prof, prefs] = await Promise.all([
    sb.from('profiles').select('display_name').eq('id', me.id).maybeSingle(),
    sb.from('user_prefs').select('text_scale').eq('user_id', me.id).maybeSingle()
  ]);
  mark('p', !!prof.data, prof.data ? (prof.data.display_name || '생성됨') : '없음');
  mark('u', !!prefs.data, prefs.data ? ('배율 ' + prefs.data.text_scale) : '없음');
  /* 다른 기기에서 바꾼 값이 있으면 그걸 따릅니다. */
  if (prefs.data?.text_scale){
    applyTs(prefs.data.text_scale);
    localStorage.setItem('t2:ts', prefs.data.text_scale);
  } else applyTs(localStorage.getItem('t2:ts') || 1);

  $('bell').classList.remove('hide'); $('aibtn').classList.remove('hide');
  loadNotifs();
  showApp('home');
  /* 초대 링크로 들어왔으면 로그인 직후 그 여행으로 바로 보냅니다.
     목록만 보여주면 어디로 가야 하는지 몰라 헤맵니다. */
  await handleJoin();
}

/* ── 키보드 ─────────────────────────────────────────────────────────
 * iOS 에서 키보드가 올라오면 폼 아래 버튼이 가려 아무것도 못 누릅니다.
 * 보이는 높이를 재서 그만큼 바닥에 여백을 줘 스크롤로 닿게 합니다.
 * (도쿄 앱이 --kb 로 하던 것과 같은 방식입니다.) */
if (window.visualViewport){
  const vv = window.visualViewport;
  const fit = () => {
    const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty('--kb', Math.round(kb) + 'px');
  };
  vv.addEventListener('resize', fit);
  vv.addEventListener('scroll', fit);
  fit();
}

/* ── 시작 ───────────────────────────────────────────────────────── */
/* 초대 링크(?join=CODE)로 들어왔을 수 있습니다. 로그인을 거쳐야 쓸 수 있으므로
   먼저 담아두고 주소는 지웁니다 — 구글에 다녀오는 동안 사라지면 안 됩니다. */
{
  const code = new URLSearchParams(location.search).get('join');
  if (code){
    sessionStorage.setItem('t2:join', code.trim().toUpperCase());
    history.replaceState(null, '', location.pathname);
  }
}

try {
  const q = t => sb.from(t).select('*', { count:'exact', head:true });
  const [co, ci, gr] = await Promise.all([q('countries'), q('cities'), q('transit_grades')]);
  const bad = [co, ci, gr].find(r => r.error);
  if (bad) throw bad.error;
  mark(0, true, '연결됨');
  mark(1, co.count >= 56 && ci.count >= 138 && gr.count === 4,
        `${co.count} · ${ci.count} · ${gr.count}`);
} catch (e) {
  /* 시작할 때 도는 자체 점검입니다. 개발 중에 쓰려고 둔 것인데
     실패하면 사용자 화면 맨 아래에 빨간 오류 상자가 계속 떠 있었습니다.
     점검 줄에만 표시하고 화면은 건드리지 않습니다. */
  mark(0, false, '실패: ' + (e?.message || e?.code || '알 수 없음'));
}

const { data:{ session } } = await sb.auth.getSession();
await render(session);
sb.auth.onAuthStateChange((_e, s) => { render(s); });

$('ms').textContent = Math.round(performance.now() - t0) + 'ms';
