/* ── 성향 카드 화면 ──────────────────────────────────────────────────
 * "나는 뭐로 나올까"가 궁금해서 평가를 더 하게 만드는 화면입니다.
 * 무엇으로 판정하고 어떻게 그리는지는 **card.js** 가 압니다. 여기는
 * 화면을 여닫고, 자료를 받아오고, 카드에 넘길 것을 고릅니다.
 *
 * ── app.js 에서 떼어낸 첫 조각입니다(b321) ──────────────────────────
 * app.js 가 9,169줄이었습니다. 한 파일에 로그인·여행·지출·평가·지도·AI·
 * 카드가 다 들어 있어서, 한 곳을 고치면 먼 곳이 깨지고 그걸 실기기에서야
 * 알게 됐습니다. 화면 단위로 떼어냅니다.
 * 이 조각을 먼저 고른 이유: **딸린 것이 제일 적습니다.** app.js 만 아는
 * 것이 셋뿐이고(아래 ctx) 나머지는 이미 모듈입니다.
 *
 * ⚠ **app.js 를 import 하지 않습니다.** 그러면 app → persona → app 으로
 *   고리가 생깁니다. 필요한 셋은 app.js 가 넣어줍니다(setPersonaCtx).
 *   `me` 는 로그인할 때마다 바뀌므로 **값이 아니라 함수**로 받습니다 —
 *   값으로 받으면 로그인 전의 null 을 영영 들고 있게 됩니다.
 *
 * 층: dom.js · db.js · cities.js · card.js 만 씁니다. */
import { $, esc, toast, copyText } from './dom.js?v=b333';
import { sb } from './db.js?v=b333';
import { cities, countryName, continentOf } from './cities.js?v=b333';
import { PERSONA_ICON, personaStats, judgePersona,
         askImageSize, cardImage } from './card.js?v=b333';

let ctx = { me: () => null, loadCities: async () => {}, showApp: () => {} };
export function setPersonaCtx(o){ ctx = { ...ctx, ...o }; }

/* ── 성향 카드 화면 ─────────────────────────────────────────────────
 * 한 줄평이 주인공이라 제일 크게, 나머지는 근거로 작게 답니다.
 * 앱 이름은 구석에 작게 — 크게 넣으면 광고처럼 보입니다.
 * 보는 사람이 궁금해서 찾아오는 정도면 충분합니다. */
export async function openPersona(){
  $('profpane').classList.add('hide');
  $('mappane').classList.add('hide');
  $('shelfpane').classList.add('hide');
  $('personapane').classList.remove('hide');
  window.scrollTo({ top:0 });
  if (history.state?.t2 !== 'persona') history.pushState({ t2:'persona' }, '');

  await ctx.loadCities();
  const { data, error } = await sb.from('city_ratings')
    .select('city_id,stars,want,comment,created_at').eq("user_id", ctx.me().id);
  if (error){
    $('personabox').innerHTML =
      `<div class="card"><div class="empty">불러오지 못했어요.</div></div>`;
    return;
  }
  /* card.js 는 도시 목록을 모릅니다 — 넣어줍니다(위 loadCities 가 채워둡니다). */
  const st = personaStats(data || [], { cities, continentOf, countryName });
  /* 카드 지도에 칠할 나라 코드. `personaStats` 는 **개수만** 셉니다 —
     세는 것과 칠하는 것은 다른 일이라 거기 넣지 않았습니다.
     별점을 매긴 도시의 나라만 씁니다(가보고 싶은 곳은 아직 안 간 곳입니다). */
  st.codes = [...new Set((data || [])
    .filter(r => r.stars != null)
    .map(r => (cities || []).find(c => c.id === r.city_id)?.country)
    .filter(Boolean))];

  /* 별자리 지도에 찍을 점. 별점을 매긴 도시의 좌표를 지도 좌표로 옮깁니다.
     좌표가 없는 도시는 건너뜁니다 — 한 점 없는 것이 엉뚱한 자리보다 낫습니다. */
  st.dots = (data || [])
    .filter(r => r.stars != null)
    .map(r => (cities || []).find(c => c.id === r.city_id))
    .filter(c => c && c.center_lat != null && c.center_lng != null)
    .map(c => ({ x: (c.center_lng + 180) / 360 * 1000,
                 y: (90 - c.center_lat) / 180 * 500 }));

  /* ── 카드에 올릴 그 사람의 문장 ────────────────────────────────────
   * **제일 높게 매긴 곳의 한줄평**을 씁니다. 아무 문장이나 가져오면
   * 불평이 카드에 박힐 수 있습니다 — 자랑하려고 올리는 카드입니다.
   * 같은 별점이면 짧은 것을 고릅니다. 카드에서 세 줄이 넘으면 잘립니다. */
  {
    const withText = (data || [])
      .filter(r => r.stars != null && String(r.comment || '').trim())
      .sort((a, b) => (b.stars - a.stars) ||
                      (String(a.comment).length - String(b.comment).length));
    const q = withText[0];
    if (q){
      const city = (cities || []).find(c => c.id === q.city_id);
      const yr = String(q.created_at || '').slice(0, 4);
      st.quote = { text: String(q.comment).trim(),
                   from: [city?.name, yr].filter(Boolean).join(', ') };
    }
  }

  /* 첫 기록으로부터 며칠. 하루 미만이면 안 씁니다 — '0일' 은 아무 말도
     안 하는 것보다 나쁩니다. */
  {
    const t = (data || []).map(r => Date.parse(r.created_at)).filter(n => n > 0);
    if (t.length){
      const d = Math.floor((Date.now() - Math.min(...t)) / 86400000);
      if (d >= 1) st.days = d;
    }
  }

  drawPersona(st);
}

export function closePersona(fromPop){
  if (!fromPop && history.state?.t2 === 'persona'){ history.back(); return; }
  $('personapane').classList.add('hide');
  $('profpane').classList.remove('hide');
}
$('openpersona').addEventListener('click', openPersona);
$('personaback').addEventListener('click', () => closePersona());

async function drawPersona(s){
  /* 도시 3곳 미만이면 카드를 안 만듭니다. "이제 막 시작한 여행자"도
     3곳은 있어야 말이 됩니다. 대신 뭘 하면 되는지 알려줍니다. */
  if (s.cities < 3){
    $('personabox').innerHTML = `<div class="card">
      <div class="empty" style="padding:28px 12px">
        아직 카드를 만들 수 없어요.<br>
        <b>도시 ${3 - s.cities}곳</b>만 더 평가하면 나와요.
        <div style="margin-top:14px">
          <button class="primary" id="pgo">평가하러 가기</button></div>
      </div></div>`;
    $('pgo').onclick = () => { closePersona(); ctx.showApp('rate'); };
    return;
  }

  const p = judgePersona(s);
  const conts = Object.entries(s.byContinent).sort((a, b) => b[1] - a[1]).slice(0, 3);

  /* ⚠ **화면 카드를 따로 그리지 않습니다.** 아래 pcardwrap 은 이 함수
     끝에서 만드는 **진짜 그림**이 들어올 자리입니다.
     전에는 거기에 pcard 를 HTML 로 다시 그렸습니다. 그런데 내보내는 그림
     쪽만 사진 배경으로 고쳐지고 화면 쪽은 옛 그러데이션 그대로 남아서,
     보는 것과 올리는 것이 아예 다른 카드가 됐습니다. 보는 쪽이 겨자색
     증명서라 아무도 안 올립니다. 본 것이 곧 올리는 것이어야 합니다.

     ⚠ 이 설명을 **아래 템플릿 문자열 안에 HTML 주석으로** 넣었다가 앱이
       통째로 안 떴습니다. 글 안에 백틱(`)이 있어서 템플릿이 거기서
       끊겼습니다. 템플릿 안에는 백틱을 쓰지 마십시오 — 설명은 여기 밖에. */
  $('personabox').innerHTML = `
    <div class="pcardwrap" id="pcardwrap"></div>

    <div style="display:flex; gap:8px; margin-bottom:var(--s-sm)">
      <button class="small" id="p_img" style="flex:1">이미지로 저장</button>
      <button class="small" id="p_share" style="flex:1">공유</button>
    </div>

    <!-- 왜 이렇게 나왔는지 밝힙니다. 근거를 안 보여주면 그냥 재미로만 보고 맙니다.
         무엇을 더 하면 바뀌는지 알면 평가를 더 하게 됩니다. -->
    <div class="card">
      <h2>왜 이렇게 나왔나요</h2>
      <div class="row"><span class="label">평가한 도시</span>
        <span class="val">${s.cities}곳 · ${s.countries}개국 · ${s.continents}대륙</span></div>
      <div class="row"><span class="label">별점 평균</span>
        <span class="val">★${s.avgRating.toFixed(2)}</span></div>
      <div class="row"><span class="label">도시 유명도 평균
        <div class="memo">1 누구나 아는 곳 ~ 3 덜 알려진 곳</div></span>
        <span class="val">${s.avgFame ? s.avgFame.toFixed(2) : '—'}</span></div>
      <div class="row"><span class="label">한 나라당 도시</span>
        <span class="val">${s.citiesPerCountry.toFixed(1)}곳</span></div>
      <div class="row"><span class="label">가보고 싶은 곳</span>
        <span class="val">${s.wishCount}곳</span></div>
      ${s.topCountry ? `<div class="row"><span class="label">가장 많이 간 나라</span>
        <span class="val">${esc(countryName[s.topCountry] || s.topCountry)}
          ${s.topCountryN}곳</span></div>` : ''}
      <div class="empty" style="text-align:left; padding-top:10px">
        AI 가 아니라 위 숫자로만 정합니다. 같은 기록이면 언제 봐도 같은 결과예요.
      </div>
    </div>`;

  /* 이미지와 공유는 화면 카드와 **같은 내용**을 넘깁니다.
     따로 만들면 언젠가 한쪽만 고쳐서 둘이 어긋납니다. */
  /* **제일 좋았던 곳의 사진을 배경으로 깝니다.** 카드가 단색 배경 위의
     글자 덩어리라 아무도 안 올렸습니다. 이 앱이 가진 제일 좋은 자산은
     도시 사진인데 카드에서 안 쓰고 있었습니다.
     아무 사진이 아니라 **그 사람이 제일 높게 매긴 곳**이라야 뜻이 있습니다. */
  /* ── 사진 대신 지도 ──────────────────────────────────────────────
   * ⚠ **사진 배경을 걷었습니다(b314).** 도시 사진 469장은 출처가 제각각이라
   *   어떤 카드는 좋고 어떤 카드는 흐렸습니다. 듀오톤으로 그 편차를 덮으려다
   *   세피아가 됐고(b305 → b313), 채도만 빼도 편차는 남았습니다.
   *   **품질을 못 고르면 안 쓰는 것이 낫습니다.**
   *
   * 대신 이 앱에만 있는 것을 씁니다 — **다녀온 나라가 칠해진 세계지도.**
   * 진짜 자료라 사람마다 다르고, 그리는 것이라 **품질이 늘 같습니다.**
   *
   * ⚠ 화면에 그려진 `#worldland` 를 그대로 쓰지 않습니다. 지도 화면을
   *   한 번도 안 열었으면 `been` 표시가 없어 텅 빈 지도가 나옵니다.
   *   여기서 사본을 떠서 직접 칠합니다. */
  /* ⚠ **나라를 칠하는 대신 도시에 점을 찍습니다(b317).** 칠한 정치 지도는
   *   정확하지만 딱딱합니다 — 국경선이 주인공이 되어 버립니다. 다녀온 도시
   *   자리에 점만 찍으면 **별자리**처럼 보이고, 나라가 아니라 그 사람이
   *   지나온 자리가 보입니다. 좌표는 `cities` 에 이미 있습니다.
   *   땅은 아주 흐리게 남겨 어디가 어디인지만 알게 합니다.
   *
   * 좌표 옮기기: 세계지도는 등장방형이라 그냥 비례로 놓으면 맞습니다.
   *   x = (경도+180)/360 × 1000,  y = (90-위도)/180 × 500
   *   보기창이 `0 19 1000 387` 인 것은 남극과 북극 끝을 잘라낸 것입니다. */
  let art = '';
  const src = document.getElementById('worldland');
  if (src){
    const dots = (s.dots || [])
      .map(d => `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="4.6"/>`).join('');
    art = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 19 1000 387">
             <style>path{fill:rgba(255,255,255,.10)} circle{fill:#fff}</style>
             ${src.innerHTML}${dots}</svg>`;
  }
  const spec = {
    g: p.g, icon: PERSONA_ICON[p.ic] || '',
    art, artRatio: 387 / 1000,
    /* 훑는 눈에 남는 것은 큰 숫자 하나입니다. 나라 수를 주인공으로. */
    big: String(s.countries), bigUnit: '개국',
    sub: '여행 성향',
    title: p.title,
    /* 한줄평이 있으면 이 줄도 뺍니다 — 큰 숫자(27개국)와 제목과 문장,
       셋이면 충분합니다. 넷째 줄부터는 카드가 목록으로 읽힙니다.
       '74개 도시 · 3대륙' 은 화면의 '왜 이렇게 나왔나요' 에 그대로 있습니다. */
    nums: s.quote ? '' : `${s.cities}개 도시 · ${s.continents}대륙`,
    /* 첫 기록으로부터 며칠. **만든 날짜가 아니라 쌓아온 시간**입니다 —
       '2026.08.13 기준' 은 아무 감흥이 없지만 '1,247일' 은 다릅니다. */
    date: s.days ? `첫 기록으로부터 ${s.days.toLocaleString()}일` : '',
    /* ⚠ **그 사람이 쓴 문장이 있으면 그것이 주인공입니다(b317).**
       숫자는 자랑이고 문장은 감성입니다. 한줄평이 있으면 목록 대신 그것을
       넣고, 없을 때만 '가장 좋았던 곳' 세 줄로 돌아갑니다 —
       둘 다 넣으면 다시 여섯 덩어리가 되어 목록으로 읽힙니다.
       대륙별 숫자('아시아 40 · 유럽 32')는 b315 에서 뺐습니다. 위 `nums` 가
       '3대륙' 이라고 말한 것을 풀어 쓴 줄이라 새로 주는 것이 없었습니다. */
    quote: s.quote || null,
    listTitle: !s.quote && s.best.length ? '가장 좋았던 곳' : '',
    list: s.quote ? [] :
      s.best.map(b => `${b.name} ★${Number(b.stars) % 1 ? b.stars : Math.round(b.stars)}`),
  };
  $('p_img').onclick = () => askImageSize(spec, 'aitrip-성향');
  $('p_share').onclick = async () => {
    /* 글로 나가는 것은 카드와 별개입니다 — 카드에서 뺀 숫자도 여기서는
       씁니다. 그림을 못 보는 곳(문자·메모)에서는 그 숫자가 전부입니다. */
    const text = `내 여행 성향: ${p.title}\n` +
      `${s.countries}개국 · ${s.cities}개 도시 · ${s.continents}대륙`;
    const url = location.origin + location.pathname;
    if (navigator.share){
      try { await navigator.share({ title:'내 여행 성향', text, url }); return; }
      catch (e){ if (e?.name === 'AbortError') return; }
    }
    toast(await copyText(`${text}\n${url}`) ? '복사했어요' : text);
  };

  /* ── 화면 카드 = 내보내는 그림 ──────────────────────────────────
     같은 `spec` 으로 만든 **그 파일**을 그대로 띄웁니다. 두 벌로 그리면
     언젠가 한쪽만 고쳐서 둘이 어긋납니다 — 실제로 그랬습니다.
     4:5 로 만듭니다. 인스타 피드에서 세로가 정사각보다 화면을 훨씬 많이
     먹고, 고르는 목록에서도 세로가 먼저입니다(card.js 의 IMG_SIZES).
     못 그려도 조용히 넘어갑니다 — 아래 '왜 이렇게 나왔나요' 는 그대로
     보이고, 저장·공유 단추도 따로 그리므로 여전히 됩니다. */
  try {
    const { blob } = await cardImage(spec, 'portrait');
    if (personaUrl) URL.revokeObjectURL(personaUrl);   /* 다시 그릴 때마다 쌓입니다 */
    personaUrl = URL.createObjectURL(blob);
    const box = $('pcardwrap');
    if (box) box.innerHTML =
      `<img src="${personaUrl}" alt="${esc(p.title)} 성향 카드">`;
  } catch {}
}
/* 방금 만든 카드 그림의 주소. 다시 그릴 때 앞것을 놓아줍니다 —
   안 놓으면 화면을 드나들 때마다 메모리에 그림이 쌓입니다. */
let personaUrl = '';
