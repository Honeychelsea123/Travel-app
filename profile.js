/* ââ íë¡í â ì¬ì§ Â· ì´ë¦ Â· ê¸ì í¬ê¸° âââââââââââââââââââââââââââââââââ
 * ë´ ê³ì ì ë¶ë ê² ììëë¤. ë¤ë¥¸ íë©´ê³¼ ì½íì§ ìê³ , ì ë¤ ìê¸° ì¹¸ë§
 * ê³ ì³ ì°ê³  ìë²ì ì¬ë¦½ëë¤.
 *
 * ââ app.js ìì ë¼ì´ë¸ ì´ì¸ ë²ì§¸ ì¡°ê°ìëë¤(b340) ââââââââââââââââââââ
 * app.js ë§ ìë ê²ì **ë¡ê·¸ì¸í ì¬ë íë**ìëë¤.
 *
 * `myAvatar`(ì¬ë¦° ì¬ì§ ì£¼ì)ë ì¬ê¸° ë¡ëë¤. ë¡ê·¸ì¸ ì§íìë í ë² ì±ì°ë¯ë¡
 * `trip.js` ì²ë¼ **ë´ë³´ë´ë ê³ ì¹ë ê¸¸ì í¨ìë¡** ëëë¤ â ë°ìì `=` ë¡
 * ì§ì  ë£ì¼ë©´ import í ê°ì ì ë°ëê³  ì´ìª½ ììª½ë§ ì´ê¸ë©ëë¤.
 *
 * `shrink`(ì¬ì§ ì¤ì´ê¸°)ë ì¬ê¸° ììµëë¤. íê¸° ì¬ì§ ìª½ìë ë¹ì·í ê²ì´
 * ìì§ë§(`fitImage`) **ì¼ë¶ë¬ ëë¡ ë¡ëë¤** â ì´ìª½ì ì¼êµ´ì´ë¼ ê°ì´ë°ë¥¼
 * ì ì¬ê°ì¼ë¡ ìë¼ë´ê³ , ì ìª½ì íê²½ì´ë¼ ë¹ë¥¼ ì§íµëë¤. í©ì¹ë©´ ë ì¤
 * íëê° íë¦¬ê² ë©ëë¤. ì´ì ë ì ìª½ ì£¼ììë ì í ììµëë¤.
 *
 * ì¸µ: dom.js Â· db.js Â· net.js ë§ ìëë¤. */
import { $, esc, avatarOf } from './dom.js?v=b564';
import { sb } from './db.js?v=b564';
import { fail, NOROW } from './net.js?v=b564';
/* 글자 크기를 바꾸면 탭바도 자랍니다 — 아래 여백을 다시 재게 합니다(b503). */
import { fitTabBar } from './ui.js?v=b564';

let ctx = { me: () => null };
export function setProfileCtx(o){ ctx = { ...ctx, ...o }; }

/* ì¬ë ¤ë íë¡í ì¬ì§ ì£¼ì. ìì¼ë©´ ë¹ ê¸ììëë¤ â ê·¸ëë ì´ë¦ ì²« ê¸ìë¥¼
   ê·¸ë ¤ ë£ìµëë¤(dom.js ì avatarOf). ë¡ê·¸ì¸ ì§í app.js ê° ìë² ê°ì¼ë¡
   í ë² ì±ìëë¤. */
export let myAvatar = null;
export function setMyAvatar(v){ myAvatar = v ?? null; }

/* ââ íë¡í ì¬ì§ ââââââââââââââââââââââââââââââââââââââââââââââââââââ
 * í° ì¬ì§ì 5MB ê° ëê¸°ë í©ëë¤. ê·¸ëë¡ ì¬ë¦¬ë©´ íµì ë­ë¹íê³  ëª©ë¡ë ëë ¤ì§ëë¤.
 * 256px ì ì¬ê°ì¼ë¡ ì¤ì¬ì ì¬ë¦½ëë¤ â 88px ë¡ ê·¸ë¦¬ë ìë¦¬ë¼ ê·¸ ì´ìì íì ììµëë¤. */
export function shrink(file, size = 256){
  return new Promise((ok, no) => {
    const img = new Image();
    img.onload = () => {
      /* ê°ì´ë°ë¥¼ ì ì¬ê°ì¼ë¡ ìë¼ëëë¤. ì ê·¸ë¬ë©´ ì¸ë¡ ì¬ì§ì´ ì°ê·¸ë¬ì§ëë¤. */
      const s = Math.min(img.width, img.height);
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      cv.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2,
                                    s, s, 0, 0, size, size);
      cv.toBlob(b => b ? ok(b) : no(new Error('ì¬ì§ì ë°ê¾¸ì§ ëª»íì´ì.')),
                'image/jpeg', 0.85);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => no(new Error('ì¬ì§ì ì½ì§ ëª»íì´ì.'));
    img.src = URL.createObjectURL(file);
  });
}

$('avatarbtn').addEventListener('click', () => $('avatarfile').click());

$('avatarfile').addEventListener('change', async e => {
  const f = e.target.files?.[0];
  e.target.value = '';                     /* ê°ì íì¼ì ë ê³¨ë¼ë ê±¸ë¦¬ê² */
  if (!f) return;
  $('avaerr').classList.add('hide');
  if (!/^image\//.test(f.type)) return fail('ì¬ì§ íì¼ë§ ì¬ë¦´ ì ìì´ì.', 'ava');

  const before = $('avatar').src;
  $('avatar').style.opacity = '.4';
  try {
    const blob = await shrink(f);
    /* íì¼ ì´ë¦ì ê³ ì í´ ì ì¬ì§ì´ ìì´ì§ ìê² í©ëë¤. */
    const path = `${ctx.me().id}/avatar.jpg`;
    const up = await sb.storage.from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (up.error) throw up.error;

    /* ì´ë¦ì´ ê°ì¼ë ì£¼ìë ê°ìµëë¤. ê·¸ëë¡ ëë©´ ì ì¬ì§ì´ ìºììì ëìµëë¤. */
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
      ? 'ì¬ì§ ì ì¥ ê³µê°ì´ ìì§ ì¤ë¹ëì§ ììì´ì. ë§ë  ì¬ëìê² ìë ¤ì£¼ì¸ì.'
      : err, 'ava');
  }
  $('avatar').style.opacity = '';
});

/* ââ ì´ë¦ ââ profiles.display_name ì ëª¨ë  ì¬íìì ì°ë ì´ë¦ìëë¤.
   ì¬íë§ë¤ ë¤ë¥´ê² ë¶ë¥´ê³  ì¶ì¼ë©´ ê·¸ ì¬íì trip_members.nickname ì ìëë¤. */
$('editname').addEventListener('click', () => {
  $('namebox').classList.toggle('hide');
  if ($('namebox').classList.contains('hide')) return;
  $('n_name').value = $('name').textContent;
  $('n_name').focus();
});
$('n_cancel').addEventListener('click', () => $('namebox').classList.add('hide'));
$('n_save').addEventListener('click', async () => {
  const v = $('n_name').value.trim();
  if (!v) return fail('ì´ë¦ì ì ì´ì£¼ì¸ì.', 'trip');
  const r = await sb.from('profiles').update({ display_name: v })
    .eq('id', ctx.me().id).select('id');
  if (r.error) return fail(r.error, 'trip');
  if (!r.data?.length) return fail(NOROW.edit, 'trip');
  $('name').textContent = v;
  /* ì¬ì§ì ì ì¬ë¦° ì¬ëì ì²« ê¸ìê° ê³§ íë¡í ê·¸ë¦¼ìëë¤. ì´ë¦ì ë°ê¿¨ì¼ë©´ ê°ì´ ë°ëëë¤. */
  if (!myAvatar) $('avatar').src = avatarOf(ctx.me().id, v);
  $('namebox').classList.add('hide');
});

/* ââ ê¸ì í¬ê¸° ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 * ì¬ëë§ë¤ ë¤ë¦ëë¤. ëì¿ ì±ì ê³µì ê°ì´ë¼ í ëªì´ í¤ì°ë©´ ì ì íë©´ì´ ì»¤ì¡ìµëë¤.
 * ê¸°ê¸°ìë ì ì¥í´ì ë¤ìì ì´ ë ê¹ë¹¡ì´ì§ ìê³  ë°ë¡ ê·¸ í¬ê¸°ë¡ ë¨ê² í©ëë¤. */
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


/* â  **íë¡í ë¯¸ë í¤ëë¥¼ ê±·ì´ëìµëë¤(b432).** b430 ìì been ì²ë¼
   "ì¤í¬ë¡¤íë©´ ìë¨ë°ê° ìì ìë°í+ì´ë¦ì¼ë¡ ë°ëë" ê²ì ë£ìëë°,
   ì¨ ë³´ë **êµ³ì´ ë°ë ì´ì ê° ìììµëë¤** â íë¡í íë©´ì¸ ê²ì í­ ë°ê°
   ì´ë¯¸ ë§íê³  ìê³ , ë¡ê³ ê° ì¬ë¼ì¡ë¤ ëíë¬ë¤ íë ìª½ì´ ì´ìì íìµëë¤.
   ëì´ë¦´ ì¼ì´ ìì¼ë©´ git ìì b430 ì `ë¯¸ëí¤ë()` ë¥¼ ë³´ì­ìì¤.
   ê·¸ë ë°°ì´ ê² íëë ë¨ê²¨ ë¡ëë¤ â **IntersectionObserver ë¥¼ ì°ë©´ ì
   ë©ëë¤.** ì¨ì ììë¥¼ "ì ë³´ì" ì¼ë¡ ì£¼ê¸° ëë¬¸ì í­ì ì®ê¸°ë ìê°
   ì¼ì§ëë¤. ì¤í¬ë¡¤ ìì¹ë¥¼ ì§ì  ì¬ì¼ í©ëë¤. */
