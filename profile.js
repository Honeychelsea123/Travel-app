/* ── 프로필 — 사진 · 이름 · 글자 크기 ─────────────────────────────────
 * 내 계정에 붙는 것 셋입니다. 다른 화면과 얽히지 않고, 셋 다 자기 칸만
 * 고쳐 쓰고 서버에 올립니다.
 *
 * ── app.js 에서 떼어낸 열세 번째 조각입니다(b340) ────────────────────
 * app.js 만 아는 것은 **로그인한 사람 하나**입니다.
 *
 * `myAvatar`(올린 사진 주소)는 여기 둡니다. 로그인 직후에도 한 번 채우므로
 * `trip.js` 처럼 **내보내되 고치는 길은 함수로** 냅니다 — 밖에서 `=` 로
 * 직접 넣으면 import 한 값은 안 바뀌고 이쪽 안쪽만 어긋납니다.
 *
 * `shrink`(사진 줄이기)도 여기 있습니다. 후기 사진 쪽에도 비슷한 것이
 * 있지만(`fitImage`) **일부러 둘로 둡니다** — 이쪽은 얼굴이라 가운데를
 * 정사각으로 잘라내고, 저쪽은 풍경이라 비를 지킵니다. 합치면 둘 중
 * 하나가 틀리게 됩니다. 이유는 저쪽 주석에도 적혀 있습니다.
 *
 * 층: dom.js · db.js · net.js 만 씁니다. */
import { $, esc, avatarOf } from './dom.js?v=b785';
import { sb } from './db.js?v=b785';
import { fail, NOROW } from './net.js?v=b785';
/* 글자 크기를 바꾸면 탭바도 자랍니다 — 아래 여백을 다시 재게 합니다(b503). */
import { fitTabBar } from './ui.js?v=b785';

let ctx = { me: () => null };
export function setProfileCtx(o){ ctx = { ...ctx, ...o }; }

/* 올려둔 프로필 사진 주소. 없으면 빈 글자입니다 — 그때는 이름 첫 글자를
   그려 넣습니다(dom.js 의 avatarOf). 로그인 직후 app.js 가 서버 값으로
   한 번 채웁니다. */
export let myAvatar = null;
export function setMyAvatar(v){ myAvatar = v ?? null; }

/* ── 프로필 사진 ────────────────────────────────────────────────────
 * 폰 사진은 5MB 가 넘기도 합니다. 그대로 올리면 통을 낭비하고 목록도 느려집니다.
 * 256px 정사각으로 줄여서 올립니다 — 88px 로 그리는 자리라 그 이상은 필요 없습니다. */
export function shrink(file, size = 256){
  return new Promise((ok, no) => {
    const img = new Image();
    img.onload = () => {
      /* 가운데를 정사각으로 잘라냅니다. 안 그러면 세로 사진이 찌그러집니다. */
      const s = Math.min(img.width, img.height);
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      cv.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2,
                                    s, s, 0, 0, size, size);
      cv.toBlob(b => b ? ok(b) : no(new Error('사진을 바꾸지 못했어요.')),
                'image/jpeg', 0.85);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => no(new Error('사진을 읽지 못했어요.'));
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
    const path = `${ctx.me().id}/avatar.jpg`;
    const up = await sb.storage.from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (up.error) throw up.error;

    /* 이름이 같으니 주소도 같습니다. 그대로 두면 옛 사진이 캐시에서 나옵니다. */
    const url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl
              + '?v=' + Date.now();
    const r = await sb.from('profiles').update({ avatar_url: url })
      .eq('id', ctx.me().id).select('avatar_url').maybeSingle();
    if (r.error) throw r.error;
    if (!r.data) throw new Error(NOROW.save);

    $('avatar').src = url;
    setMyAvatar(url);
  } catch (err) {
    $('avatar').src = before;
    fail(/bucket|not found/i.test(err.message || '')
      ? '사진 저장 공간이 아직 준비되지 않았어요. 만든 사람에게 알려주세요.'
      : err, 'ava');
  }
  $('avatar').style.opacity = '';
});

/* ── 이름 ── profiles.display_name 은 모든 여행에서 쓰는 이름입니다.
   여행마다 다르게 부르고 싶으면 그 여행의 trip_members.nickname 을 씁니다. */
/* ⚠⚠ **이름은 겹치지 않습니다(b783, 사용자 결정 「이름 하나를 유일하게」).** ⚠⚠
   진짜 관문은 DB 입니다(db/100) — 겹치면 색인이 23505, 못 쓰는 이름은
   트리거가 23514, 30자가 넘으면 22001 로 거절합니다. 여기서는 치는 동안
   `name_free` 로 미리 물어 한 줄로 알려 줄 뿐입니다.
   ⚠ SQL(100)을 아직 안 돌렸거나 연결이 끊겼으면 물음이 실패합니다 — 그때는
     조용히 아무 말도 안 합니다(저장은 예전처럼 됩니다).
   ⚠ 「같은 이름」의 규칙은 DB 의 `name_key` 와 **같아야** 합니다. 바꾸면 둘 다.
   ⚠ 오류는 이름 칸 밑(#nameerr)에 띄웁니다. 전에는 `fail(…, 'trip')` 이라
     여행 탭 목록 밑에 떠서 **프로필에서는 저장이 실패해도 안 보였습니다.** */
const 이름열쇠 = s => (s || '').normalize('NFKC')
  .replace(/[\s­ᅟᅠ᠎​-‏⁠ㅤ﻿ﾠ]+/g, '')
  .toLowerCase();
const 이름말 = {
  ok:       ['쓸 수 있는 이름이에요.', 'ok'],
  taken:    ['이미 있는 이름이에요. 다른 이름을 골라 주세요.', 'bad'],
  reserved: ['쓸 수 없는 이름이에요.', 'bad'],
  long:     ['이름은 30자까지 쓸 수 있어요.', 'bad'],
};
let 이름물음 = 0, 이름타이머 = 0;
function 이름알림(말, 결){
  $('n_hint').textContent = 말 || '';
  $('n_hint').dataset.s = 결 || '';
  $('n_save').disabled = 결 === 'bad';
}
/* 치고 0.35초 멈추면 묻습니다. 답이 늦게 와서 그사이 더 쳤으면 옛 답은
   버립니다(`번`). 새 답이 올 때까지는 앞의 말을 그대로 둡니다 — 칠 때마다
   지웠다 쓰면 한 줄이 깜빡입니다. */
function 이름살피기(){
  clearTimeout(이름타이머);
  const 번 = ++이름물음;
  $('nameerr').classList.add('hide');
  const v = $('n_name').value.trim();
  if (!이름열쇠(v)) return 이름알림('');
  이름타이머 = setTimeout(async () => {
    let r;
    try { r = await sb.rpc('name_free', { n: v }); } catch { return; }
    if (번 !== 이름물음) return;
    const 말 = !r.error && 이름말[r.data];
    if (!말) return 이름알림('');
    /* 지금 쓰는 이름 그대로면 「쓸 수 있어요」는 군말입니다. */
    if (r.data === 'ok' && 이름열쇠(v) === 이름열쇠($('name').textContent)) return 이름알림('');
    이름알림(...말);
  }, 350);
}
$('n_name').addEventListener('input', 이름살피기);
$('editname').addEventListener('click', () => {
  $('namebox').classList.toggle('hide');
  if ($('namebox').classList.contains('hide')) return;
  $('n_name').value = $('name').textContent;
  이름알림('');
  $('nameerr').classList.add('hide');
  $('n_name').focus();
});
$('n_cancel').addEventListener('click', () => {
  ++이름물음; clearTimeout(이름타이머);
  $('namebox').classList.add('hide');
});
$('n_save').addEventListener('click', async () => {
  const v = $('n_name').value.trim();
  if (!v) return fail('이름을 적어주세요.', 'name');
  ++이름물음; clearTimeout(이름타이머);      /* 늦게 온 물음 답이 저장 뒤에 덮지 않게 */
  const r = await sb.from('profiles').update({ display_name: v })
    .eq('id', ctx.me().id).select('id');
  if (r.error){
    const 말 = { '23505': 이름말.taken, '23514': 이름말.reserved,
                '22001': 이름말.long }[r.error.code];
    if (말) return 이름알림(...말);
    return fail(r.error, 'name');
  }
  if (!r.data?.length) return fail(NOROW.edit, 'name');
  $('name').textContent = v;
  /* 사진을 안 올린 사람은 첫 글자가 곧 프로필 그림입니다. 이름을 바꿨으면 같이 바뀝니다. */
  if (!myAvatar) $('avatar').src = avatarOf(ctx.me().id, v);
  $('namebox').classList.add('hide');
});

/* ── 글자 크기 ──────────────────────────────────────────────────────
 * 사람마다 다릅니다. 도쿄 앱은 공유값이라 한 명이 키우면 전원 화면이 커졌습니다.
 * 기기에도 저장해서 다음에 열 때 깜빡이지 않고 바로 그 크기로 뜨게 합니다. */
export function applyTs(v){
  document.documentElement.style.setProperty('--ts', v);
  /* ⚠ **탭바도 같이 자랍니다(b503).** 글자를 키우면 탭바가 58 → 64px 이
     되는데 창 크기는 안 변하므로 resize 로는 못 잡습니다. 아래 여백을 맡은
     --tabh 를 여기서 다시 재게 합니다 — 안 그러면 큰 글자에서 마지막 줄이
     탭바 뒤로 들어갑니다(ui.js 의 fitTabBar 머리말). */
  fitTabBar();
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
    .eq('user_id', ctx.me().id).select('user_id');
  if (r.error) fail(r.error, 'trip');
});


/* ⚠ **프로필 미니 헤더를 걷어냈습니다(b432).** b430 에서 been 처럼
   "스크롤하면 상단바가 작은 아바타+이름으로 바뀌는" 것을 넣었는데,
   써 보니 **굳이 바뀔 이유가 없었습니다** — 프로필 화면인 것은 탭 바가
   이미 말하고 있고, 로고가 사라졌다 나타났다 하는 쪽이 어수선했습니다.
   되살릴 일이 있으면 git 에서 b430 의 `미니헤더()` 를 보십시오.
   그때 배운 것 하나는 남겨 둡니다 — **IntersectionObserver 를 쓰면 안
   됩니다.** 숨은 요소를 "안 보임" 으로 주기 때문에 탭을 옮기는 순간
   켜집니다. 스크롤 위치를 직접 재야 합니다. */
