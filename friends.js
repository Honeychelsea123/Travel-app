/* ── 친구(b789) — 소식 · 팔로잉 · 팔로워 · 받은 요청 · 찾기 · 내 링크 ──────
 * 프로필 탭 이름 밑의 「팔로워 N · 팔로잉 N」을 누르면 열립니다. 설계와 근거는
 * db/101_follow.sql 머리말(벤치마크: Letterboxd · Polarsteps · Beli · 왓챠).
 *
 * ⚠ **덮는 층입니다(`#friendview`, position:fixed)** — people.js 와 같은 이유.
 *   남의 프로필(`#whoview`)은 이 위에 한 겹 더 덮입니다(z-index 가 하나 위).
 * ⚠ 소식은 **한 시간 안에 한 사람이 여러 곳을 매기면 한 줄로 묶습니다**
 *   (쭉 매기기로 서른 곳을 매기면 소식이 서른 줄이 됩니다 — Letterboxd 도 몰아
 *   적은 기록은 한 시간에 한 번만 흘립니다).
 * ⚠ 이름 찾기는 **이름이 똑같을 때만** 나옵니다(서버 people_find) — 목록을 훑어
 *   사람을 긁어 갈 수 없게. 이름은 겹치지 않으므로(db/100) 정확히 한 사람입니다.
 * ⚠ SQL(101)을 아직 안 돌렸으면 친구 줄 · 설정 카드를 통째로 숨깁니다 —
 *   눌러도 안 되는 단추를 두면 안 됩니다.
 */
import { $, esc, toast, avatarImg, copyText, flagOf, flagOk, josa, emptyDo } from './dom.js?v=b797';
import { sb } from './db.js?v=b797';
import { netTimeout } from './net.js?v=b797';
import { cities } from './cities.js?v=b797';
/* 소식의 도시 칩을 누르면 여는 화면(b789). city.js 는 이 파일을 안 읽으므로 고리가 없습니다. */
import { openCity } from './city.js?v=b797';

let ctx = { me: () => null, openPerson: () => {} };
export function setFriendsCtx(o){ ctx = { ...ctx, ...o }; }

let 탭 = 'feed';
let 차례 = 0;
let 소식끝 = null;          /* 소식을 더 받을 때 기준 시각 */

export const isFriendsOpen = () => !!$('friendview') && !$('friendview').classList.contains('hide');

export async function openFriends(t, 옵션 = {}){
  if (!ctx.me()) return;
  탭 = t || 'feed';
  const 판 = $('friendview');
  판.classList.remove('hide');
  판.scrollTop = 0;
  if (history.state?.t2 !== 'friend') history.pushState({ t2:'friend' }, '');
  $('fr_q').value = '';
  $('fr_found').innerHTML = '';
  탭칠하기();
  /* 프로필의 「친구 찾기」(b791) — 찾기 칸에 커서를 둡니다. ⚠ 아래 await «전»에
     해야 아이폰이 키보드를 올립니다(누른 그 순간 안이어야 합니다). */
  if (옵션.찾기) $('fr_q').focus();
  await 그리기();
}

export function closeFriends(fromPop){
  if (!fromPop && history.state?.t2 === 'friend'){ history.back(); return; }
  $('friendview')?.classList.add('hide');
  차례++;
  loadSocialCounts();         /* 요청에 답했으면 점이 바뀌었습니다 */
}

/* ── 프로필 머리의 「팔로워 N · 팔로잉 N」과 받은 요청 점 ─────────────── */
export async function loadSocialCounts(){
  const me = ctx.me();
  if (!me) return;
  const r = await netTimeout(sb.rpc('person_head', { p_user: me.id }));
  const h = r && !r.error ? r.data : null;
  $('friendrow')?.classList.toggle('hide', !h);
  if (!h) return;
  $('fr_followers').textContent = h.followers ?? 0;
  $('fr_following').textContent = h.following ?? 0;
  /* 잠가 두었으면 여기서 늘 보이게(b789) — 잠근 걸 잊고 「왜 아무도 안 보지」가 안 되게. */
  $('fr_locked')?.classList.toggle('hide', !h.locked);
  const 요청 = (h.requests || 0) > 0;
  $('frdot')?.classList.toggle('hide', !요청);
  $('frreqdot')?.classList.toggle('hide', !요청);
}

/* 링크로 들어온 사람(?p=코드) — app.js 가 로그인 뒤에 부릅니다 */
export async function openByLink(code){
  const r = await netTimeout(sb.rpc('person_by_link', { p_code: String(code || '') }));
  if (r?.data) return ctx.openPerson(r.data);
  toast('링크가 바뀌었거나 찾을 수 없는 사람이에요');
}

/* ── 그리기 ────────────────────────────────────────────────────────── */
function 탭칠하기(){
  document.querySelectorAll('#fr_tabs [data-fr]').forEach(b =>
    b.classList.toggle('on', b.dataset.fr === 탭));
}

function 사람줄(p, 오른쪽 = ''){
  const 이름 = p.name || '이름 없음';
  return `<div class="frrow2">
    <button class="ghost frwho" data-person="${esc(p.user_id)}">
      ${avatarImg(p.avatar_url, p.user_id, 이름,
                  'width:40px;height:40px;border-radius:50%;object-fit:cover;flex:none', 'thumb')}
      <b>${esc(이름)}</b></button>
    ${오른쪽}</div>`;
}

async function 그리기(){
  const 이번 = ++차례;
  const 칸 = $('fr_list');
  칸.innerHTML = '<div class="empty"><span class="load">불러오는 중…</span></div>';
  if (탭 === 'feed'){ 소식끝 = null; return 소식그리기(이번, false); }

  if (탭 === 'following'){
    const [a, s] = await Promise.all([
      netTimeout(sb.rpc('follow_people', { p_kind: 'following' })),
      netTimeout(sb.rpc('follow_people', { p_kind: 'sent' })),
    ]);
    if (이번 !== 차례) return;
    if (a?.error) return 실패(a.error);
    const 목록 = a?.data || [], 보냄 = s?.data || [];
    칸.innerHTML = (목록.length || 보냄.length)
      ? 목록.map(p => 사람줄(p)).join('') +
        (보냄.length ? `<div class="daysep">보낸 요청</div>` + 보냄.map(p =>
          사람줄(p, `<button class="small" data-fa="cancel" data-id="${esc(p.user_id)}">요청 취소</button>`)).join('') : '')
      : 빈칸('아직 팔로우한 사람이 없어요.',
             '도시 화면 한줄평의 이름을 누르거나, 위에서 이름으로 찾거나, 친구에게 링크를 받아 보세요.');
    return;
  }

  if (탭 === 'followers'){
    const r = await netTimeout(sb.rpc('follow_people', { p_kind: 'followers' }));
    if (이번 !== 차례) return;
    if (r?.error) return 실패(r.error);
    const 목록 = r?.data || [];
    칸.innerHTML = 목록.length ? 목록.map(p => 사람줄(p)).join('')
      : 빈칸('아직 나를 팔로우한 사람이 없어요.', '프로필의 「프로필 공유」로 친구에게 링크를 보내 보세요.');
    return;
  }

  /* 받은 요청 */
  const r = await netTimeout(sb.rpc('follow_people', { p_kind: 'requests' }));
  if (이번 !== 차례) return;
  if (r?.error) return 실패(r.error);
  const 목록 = r?.data || [];
  칸.innerHTML = 목록.length
    ? `<div class="memo" style="margin-bottom:6px">수락하면 그 사람에게 내 지구본·성향·별점·한줄평이 보여요.</div>` +
      목록.map(p => 사람줄(p,
        `<span class="frbtns"><button class="small primary" data-fa="accept" data-id="${esc(p.user_id)}">수락</button>
         <button class="small" data-fa="decline" data-id="${esc(p.user_id)}">거절</button></span>`)).join('')
    : 빈칸('받은 요청이 없어요.', '');
}

function 빈칸(말, 도움){
  return emptyDo(말, '', '', 도움);   /* 빈 화면은 emptyDo 하나로(b363 규칙) */
}
function 실패(err){
  $('fr_list').innerHTML = 빈칸('지금은 불러올 수 없어요.', err?.message || '');
}

/* ── 소식 ──────────────────────────────────────────────────────────── */
function 언제(at){
  const t = Date.parse(at);
  const s = (Date.now() - t) / 1000;
  if (s < 60) return '방금';
  if (s < 3600) return Math.floor(s / 60) + '분 전';
  if (s < 86400) return Math.floor(s / 3600) + '시간 전';
  if (s < 86400 * 2) return '어제';
  if (s < 86400 * 7) return Math.floor(s / 86400) + '일 전';
  const d = new Date(t);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
function 묶기(rows){
  const out = [];
  for (const r of rows){
    const g = out[out.length - 1];
    if (g && g.kind === 'rate' && r.kind === 'rate' && g.user_id === r.user_id
        && Date.parse(g.끝) - Date.parse(r.at) < 3600e3){
      g.items.push(r); g.끝 = r.at; continue;
    }
    out.push({ kind: r.kind, user_id: r.user_id, name: r.name, avatar_url: r.avatar_url,
               at: r.at, 끝: r.at, items: [r] });
  }
  return out;
}
const 도시 = id => (cities || []).find(c => c.id === id);
function 도시칩(r){
  const c = 도시(r.city_id);
  const 국기 = c && flagOk() ? flagOf(c.cc || c.country) + ' ' : '';
  /* 누르면 그 도시 화면(b789). 도시 화면이 이 판을 가리고 위에 뜹니다(city.js 의 겹). */
  return `<button class="frchip" data-cityopen="${esc(r.city_id)}">${국기}${esc(c?.name || r.city_id)}${
    r.stars != null ? ` <i>★${Number(r.stars).toFixed(1).replace(/\.0$/, '')}</i>` : ''}</button>`;
}
function 소식줄(g){
  const 이름 = g.name || '이름 없음';
  const 사람 = `<button class="ghost frwho" data-person="${esc(g.user_id)}">
      ${avatarImg(g.avatar_url, g.user_id, 이름,
                  'width:36px;height:36px;border-radius:50%;object-fit:cover;flex:none', 'thumb')}
      <b>${esc(이름)}</b></button>`;
  if (g.kind === 'comment'){
    const r = g.items[0], c = 도시(r.city_id);
    return `<div class="frfeed">${사람}
      <div class="frwhat">${esc(c?.name || r.city_id)}에 한줄평을 남겼어요 · <span class="memo">${언제(g.at)}</span></div>
      <p class="frquote">“${esc(r.comment || '')}”</p>${도시칩(r)}</div>`;
  }
  const n = g.items.length;
  const 첫 = 도시(g.items[0].city_id)?.name || g.items[0].city_id;
  const 말 = n > 1 ? `${n}곳을 매겼어요` : `${josa(첫, '을', '를')} 매겼어요`;
  return `<div class="frfeed">${사람}
    <div class="frwhat">${esc(말)} · <span class="memo">${언제(g.at)}</span></div>
    <div class="frchips">${g.items.slice(0, 10).map(도시칩).join('')}${
      n > 10 ? `<span class="frchip">외 ${n - 10}곳</span>` : ''}</div></div>`;
}
async function 소식그리기(이번, 더){
  const r = await netTimeout(sb.rpc('friend_feed', { p_before: 소식끝, p_limit: 60 }));
  if (이번 !== 차례) return;
  if (!r || r.error) return 실패(r?.error);
  const rows = r.data || [];
  const 칸 = $('fr_list');
  if (!더 && !rows.length){
    칸.innerHTML = 빈칸('아직 소식이 없어요.',
      '팔로우한 사람이 도시를 매기거나 한줄평을 쓰면 여기 떠요. 팔로우한 사람이 없으면 「팔로잉」에서 시작해 보세요.');
    return;
  }
  const html = 묶기(rows).map(소식줄).join('');
  $('fr_more')?.remove();
  if (더) 칸.insertAdjacentHTML('beforeend', html); else 칸.innerHTML = html;
  소식끝 = rows.length ? rows[rows.length - 1].at : 소식끝;
  if (rows.length >= 60) 칸.insertAdjacentHTML('beforeend',
    `<button class="small" id="fr_more" style="display:block;margin:12px auto">더 보기</button>`);
}

/* ── 누르기 ────────────────────────────────────────────────────────── */
$('friendview')?.addEventListener('click', async e => {
  const 사람 = e.target.closest('[data-person]');
  if (사람){ ctx.openPerson(사람.dataset.person); return; }
  const 도시칸 = e.target.closest('[data-cityopen]');
  if (도시칸) return openCity(도시칸.dataset.cityopen);

  const t = e.target.closest('#fr_tabs [data-fr]');
  if (t){ 탭 = t.dataset.fr; 탭칠하기(); 그리기(); return; }

  if (e.target.closest('#fr_more')){
    $('fr_more').disabled = true;
    return 소식그리기(차례, true);
  }

  const a = e.target.closest('[data-fa]');
  if (a){
    a.disabled = true;
    const id = a.dataset.id;
    const r = a.dataset.fa === 'cancel'
      ? await netTimeout(sb.rpc('follow_drop', { p_user: id }))
      : await netTimeout(sb.rpc('follow_answer', { p_user: id, p_ok: a.dataset.fa === 'accept' }));
    if (!r || r.error){ a.disabled = false; toast(r?.error?.message || '연결을 확인해 주세요'); return; }
    toast({ accept: '수락했어요', decline: '거절했어요', cancel: '요청을 취소했어요' }[a.dataset.fa]);
    loadSocialCounts();
    그리기();
    return;
  }

  if (e.target.closest('#fr_go')) return 찾기();
  if (e.target.closest('#friendback')) return closeFriends();
});
$('fr_q')?.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); 찾기(); } });

async function 찾기(){
  const q = $('fr_q').value.trim();
  const 칸 = $('fr_found');
  if (!q){ 칸.innerHTML = ''; return; }
  칸.innerHTML = '<div class="memo">찾는 중…</div>';
  const r = await netTimeout(sb.rpc('people_find', { p_name: q }));
  if (!r || r.error){ 칸.innerHTML = 빈칸('지금은 찾을 수 없어요.', r?.error?.message || ''); return; }
  const 나 = ctx.me()?.id;
  const 목록 = (r.data || []).filter(p => p.user_id !== 나);
  칸.innerHTML = 목록.length
    ? 목록.map(p => 사람줄(p, p.mine === 'accepted' ? '<span class="memo">팔로잉</span>'
                            : p.mine === 'requested' ? '<span class="memo">요청됨</span>' : '')).join('')
    : 빈칸(`「${q}」 이름을 가진 사람이 없어요.`,
           '이름은 띄어쓰기·대소문자와 상관없이, 글자가 모두 같아야 찾아져요. ' +
           '처음 이름(메일 앞부분)을 그대로 쓰는 사람은 안 찾아져요 — 그 사람에게 프로필 링크를 받으세요.');
}

/* ── 내 프로필 링크 ─────────────────────────────────────────────────── */
/* ⚠ **링크 코드를 미리 받아 둡니다(b791).** 아이폰은 공유 창을 단추를 누른
   «그 순간»에만 띄워 줍니다 — 누른 뒤 서버에 코드를 물으러 갔다 오면 그 순간이
   지나 공유 창 대신 복사로 떨어질 수 있습니다. 설정 칸을 채울 때(loadSocialPrefs)
   받아 두고, 없을 때만 여기서 받습니다. 사람이 바뀌면 버립니다. */
let 내코드 = null, 코드주인 = null;
async function 내링크(){
  const 나 = ctx.me()?.id;
  if (!내코드 || 코드주인 !== 나){
    const r = await netTimeout(sb.from('profiles').select('link_code').eq('id', 나).maybeSingle());
    내코드 = r?.data?.link_code || null; 코드주인 = 나;
  }
  return 내코드 ? location.origin + location.pathname + '?p=' + encodeURIComponent(내코드) : null;
}
/* 프로필 머리의 「프로필 공유」(b791)가 부릅니다. 친구 화면 맨 아래에 같은 단추가 있었는데
   중복이라 b793 에 걷었습니다(「새 링크로」도 같이). */
export function shareProfile(){ return 링크보내기(); }
async function 링크보내기(){
  const url = await 내링크();
  if (!url){ toast('링크를 만들 수 없어요. 잠시 뒤에 다시 해 주세요'); return; }
  const text = '기로에서 내 여행 지구본과 기록을 볼 수 있어요. 팔로우해 주세요!';
  if (navigator.share){
    try { await navigator.share({ title: '기로', text, url }); return; }
    catch (e){ if (e?.name === 'AbortError') return; }
  }
  toast(await copyText(url) ? '링크를 복사했어요' : url);
}

/* ── 설정: 공개 범위(b790 에 이름을 바꿈) ──────────────────────────────────────────────────
 * 팔로우 받기(승인 / 누구나) · 팔로워에게 별점 보이기 · 팔로우 알림 · 차단한 사람.
 * 톱니 설정 화면이 열릴 때 app.js 가 부릅니다. */
export async function loadSocialPrefs(){
  const me = ctx.me();
  if (!me) return;
  const [p, u, bl] = await Promise.all([
    netTimeout(sb.from('profiles').select('follow_mode,show_stars,locked,link_code').eq('id', me.id).maybeSingle()),
    netTimeout(sb.from('user_prefs').select('*').eq('user_id', me.id).maybeSingle()),
    netTimeout(sb.rpc('my_blocks')),
  ]);
  const 카드 = $('socialcard');
  if (!p || p.error || !p.data){ 카드?.classList.add('hide'); return; }
  카드?.classList.remove('hide');
  모드칠하기(p.data.follow_mode || 'approve');
  if (p.data.link_code){ 내코드 = p.data.link_code; 코드주인 = me.id; }   /* 공유용(b791, 위 내링크) */
  $('sc_lock').checked = p.data.locked === true;
  잠금표시(p.data.locked === true);
  $('sc_stars').checked = p.data.show_stars !== false;
  $('sc_notify').checked = u?.data?.notify_social !== false;
  const 막음 = bl?.data || [];
  $('sc_blocks').innerHTML = 막음.length
    ? 막음.map(x => `<div class="frrow2"><span>${esc(x.name || '이름 없음')}</span>
        <button class="small" data-unblock="${esc(x.user_id)}">차단 풀기</button></div>`).join('')
    : '<span class="memo">차단한 사람이 없어요.</span>';
}
function 모드칠하기(m){
  document.querySelectorAll('#sc_mode [data-fm]').forEach(b => b.classList.toggle('on', b.dataset.fm === m));
}
$('socialcard')?.addEventListener('click', async e => {
  const m = e.target.closest('#sc_mode [data-fm]');
  if (m){
    const 전 = document.querySelector('#sc_mode .on')?.dataset.fm;
    모드칠하기(m.dataset.fm);
    const r = await netTimeout(sb.from('profiles').update({ follow_mode: m.dataset.fm })
      .eq('id', ctx.me().id).select('follow_mode'));
    if (!r || r.error || !r.data?.length){ 모드칠하기(전 || 'approve'); toast('저장하지 못했어요'); return; }
    toast(m.dataset.fm === 'anyone' ? '이제 누구나 바로 팔로우할 수 있어요' : '이제 내가 승인한 사람만 팔로우해요');
    return;
  }
  const u = e.target.closest('[data-unblock]');
  if (u){
    u.disabled = true;
    const r = await netTimeout(sb.rpc('unblock_user', { p_user: u.dataset.unblock }));
    if (!r || r.error){ u.disabled = false; toast('풀지 못했어요'); return; }
    toast('차단을 풀었어요');
    loadSocialPrefs();
  }
});
$('socialcard')?.addEventListener('change', async e => {
  /* 비공개로 잠그기(b789). 거르는 것은 서버입니다(db/102) — 여기는 칸 하나만 씁니다. */
  if (e.target.id === 'sc_lock'){
    const on = e.target.checked;
    const r = await netTimeout(sb.from('profiles').update({ locked: on })
      .eq('id', ctx.me().id).select('locked'));
    if (!r || r.error || !r.data?.length){ e.target.checked = !on; toast('저장하지 못했어요'); return; }
    toast(on ? '비공개로 잠갔어요 — 이제 아무에게도 안 보여요' : '잠금을 풀었어요 — 팔로워에게 다시 보여요');
    잠금표시(on);
    loadSocialCounts();
    return;
  }
  if (e.target.id === 'sc_stars'){
    const on = e.target.checked;
    const r = await netTimeout(sb.from('profiles').update({ show_stars: on })
      .eq('id', ctx.me().id).select('show_stars'));
    if (!r || r.error || !r.data?.length){ e.target.checked = !on; toast('저장하지 못했어요'); return; }
    toast(on ? '팔로워에게 별점을 보여요' : '팔로워에게 별점을 숨겨요');
  }
});
/* 팔로우 알림 — **알림 칸으로 옮겨 갔습니다(b790).** 그래서 위 `#socialcard`
   의 change 로는 안 옵니다. 스위치에 직접 답니다. */
$('sc_notify')?.addEventListener('change', async e => {
  const on = e.target.checked;
  const r = await netTimeout(sb.from('user_prefs')
    .upsert({ user_id: ctx.me().id, notify_social: on }, { onConflict: 'user_id' }).select('user_id'));
  if (!r || r.error || !r.data?.length){ e.target.checked = !on; toast('저장하지 못했어요'); return; }
  toast(on ? '팔로우 알림을 받아요' : '팔로우 알림을 껐어요');
});
/* 설정 목록의 「공개 범위」 줄 오른쪽 값(b790) — 잠갔을 때만 「비공개」. */
function 잠금표시(on){ if ($('sv_open')) $('sv_open').textContent = on ? '비공개' : ''; }
