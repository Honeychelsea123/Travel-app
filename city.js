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
import { $, esc, avatarImg, emptyDo, fitImage } from './dom.js?v=b609';
import { sb } from './db.js?v=b609';
import { cities, countryName, continentOf } from './cities.js?v=b609';
import { myRates, cityStat, visited } from './rate.js?v=b609';
import { starHtml, starValue } from './stars.js?v=b609';
import { localTime } from './calc.js?v=b609';
import { fail } from './net.js?v=b609';

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
  /* 다녀온 곳이면 도장을 찍습니다(b604). 나라 코드 두 자는 여권 도장의
     문법이고, 우리가 이미 갖고 있는 값이라 새로 받아올 것이 없습니다.
     ⚠ 없을 때 «비우지» 않고 `hide` 로 숨깁니다 — 다음 도시가 다녀온
       곳이면 다시 채우는데, 비워두면 그새 한 번 빈 원이 보입니다. */
  {
    const 갔다 = visited.has(id);
    $('cv_stamp').classList.toggle('hide', !갔다);
    if (갔다) $('cv_stamp').innerHTML =
      `<b>${esc(String(c.country || '').toUpperCase())}</b><i>다녀옴</i>`;
  }
  $('cv_avg').textContent  = s?.n_rated ? Number(s.avg_stars).toFixed(1) : '–';
  $('cv_avgn').textContent = s?.n_rated ? `${s.n_rated}명이 매김` : '아직 아무도 안 매김';
  $('cv_stars').innerHTML  = starHtml(r.stars);
  $('cv_want').classList.toggle('on', !!r.want);
  $('cv_note').value = r.comment || '';
  cvNoteDirty();
  $('cv_journal').value = r.journal || '';
  사진불러오기();
  일기바뀜();



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

  const st = e.target.closest('#cv_stars .st');
  if (st){
    const v = starValue(st, e.clientX);   /* 반칸 규칙은 stars.js 한 곳(b491) */
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



/* ── 내 일기(b537) ────────────────────────────────────────────────────
 * 사용자 결정: 이 앱의 핵심은 다녀온 곳을 남기는 것이고, 나중에 일기장처럼
 * 넘겨 볼 수 있어야 합니다. 그 「남기는 자리」가 여기입니다.
 *
 * ⚠⚠ **한줄평과 다른 칸입니다.** 한줄평(`comment`)은 남들에게 보이고
 *   (city_comments), 일기(`journal`)는 나만 봅니다(db/071). 둘을 한 칸으로
 *   합치면 **공개 한줄평이 공개 일기**가 됩니다 — 처음에 「한줄평을 여러
 *   줄로 바꾸면 된다」고 했다가 그걸 놓쳤습니다.
 * ⚠ 저장은 **누를 때만** 합니다. 자동 저장은 이 칸에 안 맞습니다 — 쓰다
 *   만 문장이 남고, 지우려던 것이 지워진 채로 굳습니다. 한줄평과 같은
 *   규칙으로 둡니다(바뀐 것이 있을 때만 단추가 살아납니다).
 * ⚠ 4000자에서 끊깁니다(db/071 의 check 와 같은 값). 화면에서 먼저
 *   막아야 서버가 거절하기 전에 사용자가 압니다. */
function 일기바뀜(){
  const 칸 = $('cv_journal'), b = $('cv_jsave');
  if (!칸 || !b) return;
  const 지금 = 칸.value.trim();
  const 적힌 = (myRates[cityOpen?.id]?.journal || '').trim();
  b.disabled = 지금 === 적힌;
  b.textContent = 지금 ? '저장' : '지우기';
  /* 남은 글자는 **끝이 가까울 때만** 말합니다. 늘 세고 있으면 일기가
     아니라 원고지가 됩니다. */
  const 남음 = 4000 - 칸.value.length;
  $('cv_jnote').textContent =
    남음 <= 200 ? `${남음}자 남았어요` : (적힌 ? '' : '나중에 일기장에서 모아 봐요.');
  키맞추기();
}

/* 쓴 만큼 칸이 자랍니다 — 네 줄에 갇혀 있으면 길게 쓸 마음이 안 납니다.
   ⚠ 먼저 auto 로 되돌려야 «줄어들 때»도 따라옵니다. */
function 키맞추기(){
  const 칸 = $('cv_journal');
  if (!칸) return;
  칸.style.height = 'auto';
  칸.style.height = Math.min(칸.scrollHeight, 520) + 'px';
}

/* ── 일기 사진 ── 여러 장(b565 한 장 → b573 여러 장, db/073) ──────────
 * ⚠ 통이 **비공개**라 주소가 오래 못 갑니다. 그래서 표에 **서명 주소**를
 *   넣어 두고(db/073 머리말), 열 때마다 남은 시간을 안 따집니다 —
 *   만료돼서 안 보이면 그때 새로 받습니다.
 * ⚠⚠ **경로에 «임의의 이름»을 씁니다: `<내 id>/<도시>/<난수>.jpg`.** ⚠⚠
 *   한 장이던 시절에는 `<내 id>/<도시>.jpg` 로 **이름을 고정해** 덮어썼는데,
 *   여러 장에서 그러면 두 번째 사진이 첫 번째를 지웁니다. 반대로 「1,2,3…」
 *   으로 세면 가운데를 지운 뒤 번호가 겹칩니다. **한 번 쓰고 안 쓰는 이름**
 *   이라야 그런 사고가 아예 안 납니다.
 * ⚠ 통 정책은 **안 고쳐도 됩니다** — 규칙이 「경로 맨 앞 칸이 내 id」라서
 *   한 겹 깊어져도 그대로 맞습니다(db/073 머리말).
 * ⚠ 올리기 전에 줄입니다. 폰 사진은 4MB 가 예사인데 일기장은 한 화면에
 *   스무 장까지 그립니다 — 줄이지 않으면 그 화면이 못 뜹니다.
 * ⚠ **`shrink` 가 아니라 `fitImage`**(b567). 프로필용은 가운데를 정사각으로
 *   잘라내고 작은 사진은 늘립니다 — 1280×1280 정사각이 되고 파일이 되레
 *   커졌습니다(dom.js 의 그 자리 참고). */
const 사진최대 = 8;
let 내사진 = [];

function 사진그리기(){
  const 판 = $('cv_jgrid'), 빈 = $('cv_jpick');
  if (!판 || !빈) return;
  판.innerHTML = 내사진.map(p => `<div class="jpcell">
      <img src="${esc(p.url)}" alt="" loading="lazy">
      <button type="button" class="jpdel" data-jpdel="${esc(p.id)}"
              aria-label="이 사진 지우기">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.2" stroke-linecap="round">
          <path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>`).join('');
  /* ⚠ 다 찼으면 단추를 **숨깁니다.** 눌리는데 아무 일도 안 나면 고장으로
     보입니다. 몇 장까지인지도 같이 알려줍니다. */
  빈.classList.toggle('hide', 내사진.length >= 사진최대);
  빈.textContent = 내사진.length ? `사진 더 넣기 (${내사진.length}/${사진최대})` : '사진 넣기';
}

async function 사진불러오기(){
  내사진 = [];
  사진그리기();
  if (!cityOpen) return;
  const r = await sb.from('journal_photos')
    .select('id,url,path,sort,created_at')
    .eq('user_id', ctx.me().id).eq('city_id', cityOpen.id)
    .order('sort').order('created_at');
  /* ⚠ 표가 아직 없을 수도 있습니다(db/073 을 안 돌린 상태). 그때는 조용히
     비워 둡니다 — 일기 자체는 멀쩡히 써야 하니 여기서 화면을 막지 않습니다. */
  if (r.error) return;
  내사진 = r.data || [];
  사진그리기();
}

/* 비공개 통에서 볼 수 있는 주소를 받아옵니다. 1년 — 일기는 오래 두고
   보는 것이라 짧게 잡으면 옛 장이 자꾸 깨집니다. */
async function 사진주소(path){
  const r = await sb.storage.from('journal-photos').createSignedUrl(path, 60 * 60 * 24 * 365);
  return r.data?.signedUrl || null;
}

$('cv_jpick')?.addEventListener('click', () => $('cv_jfile').click());
$('cv_jfile')?.addEventListener('change', async e => {
  const 고른것 = [...(e.target.files || [])];
  e.target.value = '';                 /* 같은 파일을 또 골라도 걸리게 */
  if (!고른것.length || !cityOpen) return;
  const 그림 = 고른것.filter(f => /^image\//.test(f.type));
  if (!그림.length) return fail('사진 파일만 올릴 수 있어요.', 'city');
  /* ⚠ 넘치게 고르면 **앞에서부터** 받고 나머지는 말해 줍니다. 통째로
     거절하면 왜 안 되는지 모른 채 다시 고르게 됩니다. */
  const 넣을것 = 그림.slice(0, Math.max(0, 사진최대 - 내사진.length));
  const 빈 = $('cv_jpick'), 원래 = 빈.textContent;
  빈.disabled = true;
  let 올린수 = 0;
  try {
    for (const f of 넣을것){
      빈.textContent = `올리는 중… ${올린수 + 1}/${넣을것.length}`;
      const blob = await fitImage(f, 1280);
      /* 한 번 쓰고 안 쓰는 이름 — 위 머리말 참고 */
      const 이름 = (crypto.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2));
      const path = `${ctx.me().id}/${cityOpen.id}/${이름}.jpg`;
      const up = await sb.storage.from('journal-photos')
        .upload(path, blob, { contentType: 'image/jpeg' });
      if (up.error) throw up.error;
      const url = await 사진주소(path);
      if (!url) throw new Error('사진 주소를 못 받았어요.');
      const ins = await sb.from('journal_photos')
        .insert({ user_id: ctx.me().id, city_id: cityOpen.id,
                  path, url, sort: 내사진.length + 올린수 })
        .select('id,url,path,sort').single();
      if (ins.error){
        /* ⚠ 줄을 못 넣었으면 **올린 파일도 도로 지웁니다.** 안 그러면
           아무 데서도 안 보이는 파일이 통에 남아 용량만 먹습니다. */
        await sb.storage.from('journal-photos').remove([path]);
        throw ins.error;
      }
      내사진.push(ins.data);
      올린수++;
      사진그리기();
    }
    if (그림.length > 넣을것.length)
      fail(`사진은 ${사진최대}장까지예요. ${넣을것.length}장만 넣었어요.`, 'city');
  } catch (err) {
    fail(/relation|does not exist|schema cache/i.test(err.message || '')
      ? '사진 여러 장 저장이 아직 준비되지 않았어요. 만든 사람에게 알려주세요(db/073).'
      : /bucket|not found/i.test(err.message || '')
      ? '사진 저장 공간이 아직 준비되지 않았어요. 만든 사람에게 알려주세요(db/072).'
      : err, 'city');
  }
  빈.disabled = false;
  사진그리기();
  if (!내사진.length) 빈.textContent = 원래;
});

/* ⚠ 단추가 사진마다 하나라 **위임**으로 받습니다. 그려질 때마다 새로
   붙이면 그린 횟수만큼 쌓여서 한 번 눌러도 여러 번 지웁니다. */
$('cv_jgrid')?.addEventListener('click', async e => {
  const b = e.target.closest('[data-jpdel]'); if (!b) return;
  const id = b.dataset.jpdel;
  const p = 내사진.find(x => x.id === id);
  if (!p) return;
  b.disabled = true;
  /* 통에서도 지웁니다 — 줄만 지우면 파일이 남아 용량만 먹습니다. */
  await sb.storage.from('journal-photos').remove([p.path]);
  const d = await sb.from('journal_photos').delete().eq('id', id);
  if (d.error){ b.disabled = false; return fail(d.error, 'city'); }
  내사진 = 내사진.filter(x => x.id !== id);
  사진그리기();
});

$('cv_journal')?.addEventListener('input', 일기바뀜);
$('cv_jsave')?.addEventListener('click', async () => {
  if (!cityOpen) return;
  const v = $('cv_journal').value.trim() || null;
  $('cv_jsave').disabled = true;
  await ctx.saveRate(cityOpen.id, { journal: v }, true);
  $('cv_jsave').textContent = v ? '저장했어요' : '지웠어요';
  $('cv_jnote').textContent = '';
});
