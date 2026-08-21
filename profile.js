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
import { $, esc, avatarOf } from './dom.js?v=b433';
import { sb } from './db.js?v=b433';
import { fail, NOROW } from './net.js?v=b433';

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
    .eq('id', ctx.me().id).select('id');
  if (r.error) return fail(r.error, 'trip');
  if (!r.data?.length) return fail(NOROW.edit, 'trip');
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
