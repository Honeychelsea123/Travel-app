/* ── 남의 프로필(b789) ────────────────────────────────────────────────
 * 사용자: 「사람들 유입되기 전에 기능은 다 만들어 놔야지」 · 「다른 어플들
 *   벤치마크해서 제대로 미리 만들어 놓자」. 설계와 근거는 db/101_follow.sql 머리말.
 *
 * 보이는 것
 *   머리(누구나 — 로그인한 사람): 사진 · 이름 · 팔로워/팔로잉 수 · 함께 아는 사람 ·
 *     팔로우 단추. 나를 팔로우하겠다고 요청한 사람이면 수락/거절도 여기서.
 *   알맹이(나 자신 · 승인된 팔로워): 궁합 · 지구본 · 나라/도시/여행 수 · 성향 ·
 *     배지 · 둘 다 가 본 곳 · 별점과 한줄평(별점은 본인이 숨길 수 있음).
 *   ⚠ 가고 싶은 곳 · 일기 · AI 대화는 서버가 아예 안 보냅니다(person_body).
 *
 * ⚠ **덮는 층입니다(`#whoview`, position:fixed).** 도시 화면·여행 일행·알림·친구
 *   화면 어디서든 열립니다. 그래서 아래 화면을 숨기고 되살리는 대신 위에 덮고,
 *   닫으면 그대로 드러납니다 — 탭 덱·판 목록(네 곳)을 건드리지 않습니다.
 * ⚠ 뒤로가기는 tripview.js 의 popstate 사슬 «맨 위»에 있습니다(사진 다음).
 * ⚠ 지구본은 열 때마다 새로 띄우고 닫을 때 `끝()` 으로 치웁니다 — 안 치우면
 *   보이지도 않는 지구가 뒤에서 계속 돕니다.
 */
import { $, esc, toast, avatarImg, flagOf, flagOk, emptyDo } from './dom.js?v=b790';
import { sb } from './db.js?v=b790';
import { netTimeout } from './net.js?v=b790';
import { cities, countryName } from './cities.js?v=b790';
import { myRates, visited } from './rate.js?v=b790';
import { PERSONA16, personaMatch, personaMateLine, personaAxes } from './card.js?v=b790';
import { starsRo } from './stars.js?v=b790';
import { mountGlobe } from './globe.js?v=b790';
import { arm } from './ui.js?v=b790';
/* 친구가 매긴 도시를 누르면 여는 화면(b789). city.js 는 이 파일을 안 읽으므로 고리가 없습니다. */
import { openCity } from './city.js?v=b790';

let ctx = { me: () => null, openFriends: () => {}, onFollowChange: () => {} };
export function setPeopleCtx(o){ ctx = { ...ctx, ...o }; }

let 지금 = null;          /* 열린 사람 id */
let 머리 = null;          /* 마지막으로 받은 person_head */
let 공 = null;            /* 지구본 */
let 차례 = 0;             /* 늦게 온 답은 버립니다 */
let 배지표 = null;        /* badge_defs — 한 번만 받습니다 */

/* 성향이 서는 문턱 — persona.js · pshift.js · try.js 와 같은 5곳 */
const 문턱 = 5;

export const isPersonOpen = () => !!$('whoview') && !$('whoview').classList.contains('hide');

/* ── 도시 밑에 가려 둔 사람(b789) ─────────────────────────────────────
 * 친구가 매긴 도시를 누르면 도시 화면이 이 판을 **가리고** 위에 뜹니다
 * (city.js 의 겹). 거기서 또 다른 사람 이름을 누르면 이 판 하나를 다시
 * 써야 하므로, 가려져 있던 사람을 그린 것째(지구본까지) 챙겨 두었다가
 * 위의 사람을 닫을 때 되돌립니다. 도시를 닫으면 city.js 가 판을 되살려
 * 그대로 보입니다. 뒤로 한 번에 한 겹: 사람 B → 도시 → 사람 A.
 * ⚠ 챙긴 지구본은 끝내지 않습니다 — 떼어 낸 캔버스는 안 보이므로
 *   globe.js 의 눈(IntersectionObserver)이 알아서 멈춥니다. */
let 아래사람 = [];

export async function openPerson(uid){
  if (!uid || !ctx.me()) return;
  const 판 = $('whoview');
  if (지금 && 판.classList.contains('hide')){
    const 조각 = document.createDocumentFragment();
    const 몸 = $('whobody');
    while (몸.firstChild) 조각.appendChild(몸.firstChild);
    아래사람.push({ 지금, 머리, 공, 조각, 메뉴: !$('whomenu').classList.contains('hide') });
    공 = null;
  }
  지금 = uid;
  판.classList.remove('hide');
  판.scrollTop = 0;
  if (history.state?.t2 !== 'who') history.pushState({ t2:'who' }, '');
  await 그리기();
}

export function closePerson(fromPop){
  if (!fromPop && history.state?.t2 === 'who'){ history.back(); return; }
  $('whoview')?.classList.add('hide');
  $('whosheet')?.classList.add('hide');
  공?.끝?.(); 공 = null;
  지금 = null; 머리 = null; 차례++;
  const 전 = 아래사람.pop();
  if (전){
    /* 도시 밑에 가려 두었던 사람을 되돌립니다 — 판은 가린 채로(도시가 닫히면 보임). */
    ({ 지금, 머리, 공 } = 전);
    $('whobody').replaceChildren(전.조각);
    $('whomenu').classList.toggle('hide', !전.메뉴);
  }
}

/* 통째로 치웁니다 — 로그아웃·계정 전환, 그리고 도시 밑에 가려진 채
   탭을 옮겼을 때(app.js). 가려 둔 사람들의 지구본도 끝냅니다. */
export function resetPerson(){
  아래사람.forEach(x => x.공?.끝?.());
  아래사람 = [];
  closePerson(true);
}

/* ── 그리기 ────────────────────────────────────────────────────────── */
async function 그리기(){
  const 이번 = ++차례, uid = 지금;
  const 몸 = $('whobody');
  공?.끝?.(); 공 = null;
  몸.innerHTML = '<div class="empty"><span class="load">불러오는 중…</span></div>';
  const [h, b] = await Promise.all([
    netTimeout(sb.rpc('person_head', { p_user: uid })),
    netTimeout(sb.rpc('person_body', { p_user: uid })),
  ]);
  if (이번 !== 차례) return;
  if (!h || h.error){
    몸.innerHTML = `<div class="empty">지금은 프로필을 볼 수 없어요.<br>
      <span class="memo">${esc(h?.error?.message || '연결을 확인해 주세요')}</span></div>`;
    return;
  }
  머리 = h.data;
  if (!머리){ 몸.innerHTML = emptyDo('찾을 수 없는 사람이에요.', '', '', '계정이 없어졌을 수 있어요'); return; }
  $('whomenu').classList.toggle('hide', !!머리.self);
  const 알 = 머리.can_see ? (b && !b.error ? b.data : null) : null;
  몸.innerHTML = 머리그림(머리) + (알 ? await 알맹이그림(머리, 알) : 잠김그림(머리));
  if (알) 지구본올리기(알);
}

function 이름(h){ return h?.name || '이름 없음'; }

function 머리그림(h){
  /* 비공개로 잠근 사람(b789, db/102). 서버가 수·알맹이를 안 보냅니다.
     이미 팔로우 중이거나 요청해 둔 것은 끊거나 거둘 수 있게 둡니다. */
  const 잠김 = h.locked && !h.self;
  const 단추 = (() => {
    if (h.self) return `<button class="small" data-who="friends">내 친구 보기</button>`;
    if (h.mine === 'accepted') return `<button class="small on" data-who="unfollow">팔로잉 ✓</button>`;
    if (h.mine === 'requested') return `<button class="small" data-who="cancel">요청됨</button>`;
    if (잠김) return `<button class="small" disabled>비공개 계정</button>`;
    const 글 = h.theirs === 'accepted' ? '맞팔로우' : '팔로우';
    return `<button class="primary" data-who="follow">${글}</button>`;
  })();
  /* 나에게 온 요청은 여기서 바로 답합니다(인스타그램과 같은 자리). */
  const 요청 = !h.self && h.theirs === 'requested'
    ? `<div class="whoask">${esc(이름(h))}님이 팔로우를 요청했어요
         <span><button class="small primary" data-who="accept">수락</button>
               <button class="small" data-who="decline">거절</button></span></div>`
    : '';
  const 함께 = !h.self && h.mutual > 0 ? `<div class="memo">함께 아는 사람 ${h.mutual}명</div>` : '';
  return `<div class="card whohead">
    ${avatarImg(h.avatar_url, h.id, 이름(h),
                'width:88px;height:88px;border-radius:50%;object-fit:cover', 'thumb')}
    <div class="whoname">${esc(이름(h))}</div>
    ${잠김 ? '' : `<div class="whocounts"><span>팔로워 <b>${h.followers ?? 0}</b></span>
                           <span>팔로잉 <b>${h.following ?? 0}</b></span></div>`}
    ${h.self && h.locked ? `<div class="memo">🔒 비공개로 잠가 두었어요 — 지금은 나만 봐요</div>` : ''}
    ${함께}
    <div class="whobtns">${단추}</div>
    ${요청}
  </div>`;
}

function 잠김그림(h){
  if (h.self) return '';
  const 말 = h.locked
    ? `비공개 계정이에요. ${esc(이름(h))}님은 지금 아무에게도 기록을 보여주지 않아요.`
    : h.mine === 'requested'
    ? `요청을 보냈어요. ${esc(이름(h))}님이 승인하면 지구본과 기록이 보여요.`
    : h.follow_mode === 'anyone'
      ? `팔로우하면 ${esc(이름(h))}님의 지구본과 기록이 보여요.`
      : `${esc(이름(h))}님이 팔로우를 승인하면 지구본과 기록이 보여요.`;
  return `<div class="card wholock"><div class="i" aria-hidden="true">🔒</div><p>${말}</p></div>`;
}

/* 내 성향 코드 — 내 별점으로 계산합니다(확정 5곳부터). */
function 내코드(){
  const rows = Object.entries(myRates || {})
    .filter(([, r]) => r?.stars != null).map(([city_id, r]) => ({ city_id, stars: r.stars }));
  if (rows.length < 문턱) return null;
  return personaAxes(rows, { cities: cities || [] })?.code || null;
}
/* 그 사람 성향 — 서버에 적힌 코드(본인 앱이 적음). 없으면 보이는 별점으로 계산. */
function 그사람코드(b){
  if (b.persona && PERSONA16[b.persona]) return b.persona;
  const rows = (b.ratings || []).filter(r => r.stars != null);
  if (!b.show_stars || rows.length < 문턱) return null;
  return personaAxes(rows, { cities: cities || [] })?.code || null;
}

const 도시 = id => (cities || []).find(c => c.id === id);
const 국기 = c => (c && flagOk() ? flagOf(c.cc || c.country) + ' ' : '');

async function 배지들(){
  if (배지표) return 배지표;
  const r = await netTimeout(sb.rpc('badge_defs'));
  배지표 = Object.fromEntries((r?.data || []).map(d => [d.id, d]));
  return 배지표;
}

async function 알맹이그림(h, b){
  const 너 = 그사람코드(b), 나 = h.self ? null : 내코드();
  const 발 = b.foot || {};
  const 간것 = new Set(b.visited || []);

  /* ── 궁합 ── 성향 코드(원래 궁합 공식 그대로) + 둘 다 매긴 도시의 별점 차이.
     ⚠ 공식은 바꾸지 않습니다 — 궁합 링크로 이미 보던 숫자와 달라지면 안 됩니다
       (벤치마크: Spotify 가 말없이 공식을 바꿨다가 94% → 3% 로 들통남). */
  let 궁합 = '';
  if (!h.self){
    const 둘다 = [...간것].filter(id => visited?.has?.(id));
    const 짝 = (b.ratings || []).filter(r => r.stars != null && myRates?.[r.city_id]?.stars != null);
    const 차이 = 짝.length
      ? 짝.reduce((s, r) => s + Math.abs(Number(r.stars) - Number(myRates[r.city_id].stars)), 0) / 짝.length
      : null;
    const 별줄 = 짝.length >= 3
      ? `둘 다 매긴 도시 ${짝.length}곳 · 별점 차이 평균 ${차이.toFixed(1)}${차이 <= 0.5 ? ' — 눈이 비슷해요' : 차이 >= 1.2 ? ' — 보는 눈이 달라요' : ''}`
      : 짝.length ? `둘 다 매긴 도시 ${짝.length}곳 — 3곳부터 별점을 견줘요` : '';
    const 점수 = 나 && 너 ? personaMatch(나, 너) : null;
    궁합 = `<div class="card whomatch">
      ${점수 != null
        ? `<div class="whopct"><b>${점수}%</b><span>나와의 여행 궁합</span></div>
           <div class="memo">${esc(personaMateLine(나, 너))}</div>`
        : `<div class="memo">${나 ? `${esc(이름(h))}님의 성향이 아직 안 나왔어요` : '도시를 5곳 매기면 궁합이 나와요'}</div>`}
      ${별줄 ? `<div class="memo">${esc(별줄)}</div>` : ''}
      ${둘다.length ? `<div class="memo">둘 다 가 본 곳 ${둘다.length}곳: ${
          둘다.slice(0, 8).map(id => esc(도시(id)?.name || id)).join(' · ')}${둘다.length > 8 ? ' …' : ''}</div>` : ''}
    </div>`;
  }

  const 대륙수 = Object.keys(발.by_continent || {}).filter(k => k !== '기타').length;
  const 통계 = `<div class="card whostats">
    <div><b>${발.countries ?? 0}</b><span>나라</span></div>
    <div><b>${발.cities ?? 0}</b><span>도시</span></div>
    <div><b>${대륙수}</b><span>대륙</span></div>
    <div><b>${발.trips ?? 0}</b><span>여행</span></div>
  </div>`;

  const 성향 = 너 && PERSONA16[너]
    ? `<div class="card whopersona"><div class="memo">여행 성향</div>
         <b>${esc(PERSONA16[너].n)}</b> <span class="code">${esc(너)}</span>
         <p>${esc(PERSONA16[너].d)}</p></div>`
    : '';

  const 표 = await 배지들();
  const 받은것 = (b.badges || []).map(x => 표[x.id]).filter(Boolean);
  const 배지 = 받은것.length
    ? `<div class="card"><h2>배지 <span class="memo">${받은것.length}</span></h2>
         <div class="whobadges">${받은것.map(d =>
           `<span title="${esc(d.name)}"><i>${esc(d.icon)}</i>${esc(d.name)}</span>`).join('')}</div></div>`
    : '';

  const 별목록 = (b.ratings || []);
  const 기록 = 별목록.length
    ? `<div class="card"><h2>별점과 한줄평 <span class="memo">${별목록.length}곳${
          b.show_stars ? '' : ' · 별점은 비공개'}</span></h2>
        ${별목록.slice(0, 60).map(r => { const c = 도시(r.city_id);
          /* 누르면 그 도시 화면(b789) — 친구가 좋다는 곳을 보고 「가고 싶은 곳」에 담게. */
          return `<div class="whorow" data-cityopen="${esc(r.city_id)}">
            <div class="t"><b>${국기(c)}${esc(c?.name || r.city_id)}</b>
              ${c ? `<span class="memo">${esc(countryName[c.cc] || '')}</span>` : ''}
              ${r.comment ? `<span class="memo">“${esc(r.comment)}”</span>` : ''}</div>
            ${r.stars != null ? starsRo(r.stars) : ''}</div>`; }).join('')}
        ${별목록.length > 60 ? `<div class="memo">외 ${별목록.length - 60}곳</div>` : ''}
      </div>`
    : `<div class="card">${emptyDo('아직 매긴 도시가 없어요.')}</div>`;

  return 궁합 +
    `<div class="card whoglobe"><canvas id="whocanvas" aria-label="${esc(이름(h))}님이 다녀온 곳"></canvas></div>` +
    통계 + 성향 + 배지 + 기록;
}

function 지구본올리기(b){
  const cv = $('whocanvas');
  if (!cv) return;
  const 간도시 = new Set(b.visited || []);
  const 나라 = new Set((cities || []).filter(c => 간도시.has(c.id)).map(c => c.cc));
  공?.끝?.();
  공 = mountGlobe(cv, 나라, undefined, undefined, null, { 갔나: id => 간도시.has(id) });
}

/* ── 누르기 ────────────────────────────────────────────────────────── */
async function 부르기(fn, args, 성공말){
  const r = await netTimeout(sb.rpc(fn, args));
  if (!r || r.error){ toast(r?.error?.message || '연결을 확인해 주세요'); return null; }
  if (성공말) toast(typeof 성공말 === 'function' ? 성공말(r.data) : 성공말);
  ctx.onFollowChange();
  return r;
}

/* ⚠ confirm() 을 안 씁니다 — 카카오톡 같은 앱 안 브라우저에서 막힙니다(member.js
   머리말). 앱의 방식대로 버튼 글자를 바꿔 한 번 더 누르게 합니다(ui.js 의 arm —
   다른 데를 누르면 저절로 원래대로 돌아옵니다). */
const 한번더 = { cancel: '한 번 더 누르면 요청을 거둬요', unfollow: '한 번 더 누르면 팔로우를 끊어요' };

$('whobody')?.addEventListener('click', async e => {
  /* 도시 줄(b789). 도시 화면이 이 판을 가리고 위에 뜹니다 — 뒤로 가면 여기로. */
  const 도시칸 = e.target.closest('[data-cityopen]');
  if (도시칸) return openCity(도시칸.dataset.cityopen);
  const b = e.target.closest('[data-who]'); if (!b || !지금) return;
  const uid = 지금, h = 머리, 누구 = 이름(h);
  if (한번더[b.dataset.who] && b.dataset.armed !== '1'){ arm(b, 한번더[b.dataset.who]); return; }
  b.disabled = true;
  try {
    switch (b.dataset.who){
      case 'follow':
        await 부르기('follow_ask', { p_user: uid },
          s => s === 'accepted' ? `${누구}님을 팔로우해요` : '팔로우를 요청했어요');
        break;
      case 'cancel':
        await 부르기('follow_drop', { p_user: uid }, '요청을 거뒀어요');
        break;
      case 'unfollow':
        await 부르기('follow_drop', { p_user: uid }, '팔로우를 끊었어요');
        break;
      case 'accept':
        await 부르기('follow_answer', { p_user: uid, p_ok: true }, `${누구}님의 요청을 수락했어요`);
        break;
      case 'decline':
        await 부르기('follow_answer', { p_user: uid, p_ok: false }, '요청을 거절했어요');
        break;
      case 'friends':
        /* ⚠ `closePerson()`(= history.back)을 쓰면 뒤로가기가 «나중에» 와서
           방금 연 친구 화면을 닫습니다. 바로 닫고 기록 한 칸은 **친구 화면
           것으로 바꿔 씁니다** — 안 바꾸면 openFriends 가 한 칸을 더 쌓아서,
           친구 화면을 닫은 뒤 빈 'who' 칸에서 뒤로가기가 한 번 헛돕니다. */
        /* 친구 화면 위에서 열렸으면(목록 → 나) 한 겹 걷기만 하면 됩니다. */
        if ($('friendview') && !$('friendview').classList.contains('hide')){ closePerson(); return; }
        closePerson(true);
        if (history.state?.t2 === 'who') history.replaceState({ t2:'friend' }, '');
        ctx.openFriends('feed'); return;
    }
  } finally { b.disabled = false; }
  if (지금 === uid) 그리기();
});

/* ── 메뉴(⋯): 팔로워에서 빼기 · 차단 · 신고 ──────────────────────────── */
$('whomenu')?.addEventListener('click', () => {
  if (!머리 || 머리.self) return;
  const 시트 = $('whosheet');
  $('whosheet_rm').classList.toggle('hide', 머리.theirs !== 'accepted');
  $('whosheet_rep').classList.add('hide');
  $('whosheet_main').classList.remove('hide');
  시트.classList.remove('hide');
});
$('whosheet')?.addEventListener('click', async e => {
  const 시트 = $('whosheet');
  if (e.target === 시트 || e.target.closest('[data-ws="close"]')){ 시트.classList.add('hide'); return; }
  const b = e.target.closest('[data-ws]'); if (!b || !지금) return;
  const uid = 지금, 누구 = 이름(머리);
  if (b.dataset.ws === 'remove'){
    if (b.dataset.armed !== '1'){ arm(b, '한 번 더 누르면 빼요 — 상대에게 알림은 안 가요'); return; }
    시트.classList.add('hide');
    if (await 부르기('follower_drop', { p_user: uid }, '팔로워에서 뺐어요')) 그리기();
  } else if (b.dataset.ws === 'block'){
    if (b.dataset.armed !== '1'){
      arm(b, '한 번 더 누르면 차단해요 — 서로 안 보이고 팔로우도 양쪽 다 끊겨요'); return; }
    시트.classList.add('hide');
    if (await 부르기('block_user', { p_user: uid }, `${누구}님을 차단했어요`)) closePerson();
  } else if (b.dataset.ws === 'report'){
    $('whosheet_main').classList.add('hide');
    $('whosheet_rep').classList.remove('hide');
  } else if (b.dataset.ws === 'reason'){
    const 더 = $('whosheet_detail').value;
    시트.classList.add('hide');
    await 부르기('report_user', { p_user: uid, p_reason: b.dataset.r, p_detail: 더 },
                '신고했어요. 살펴볼게요');
    $('whosheet_detail').value = '';
  }
});
$('whoback')?.addEventListener('click', () => closePerson());
