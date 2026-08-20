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
import { $, esc, toast, copyText } from './dom.js?v=b384';
import { sb } from './db.js?v=b384';
import { cities, countryName, continentOf } from './cities.js?v=b384';
import { personaStats, personaAxes, personaRank, personaMates, personaMrz,
         PERSONA16, AXIS_WORD, AXIS_NAME,
         askImageSize, cardImage } from './card.js?v=b384';

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
  /* ⚠ **성향은 `personaStats` 가 아니라 `personaAxes` 가 정합니다(b381).**
     둘 다 같은 자료를 셉니다만 쓰임이 다릅니다 — `personaStats` 는 아래
     '왜 이렇게 나왔나요' 에 그대로 보여줄 숫자들이고, `personaAxes` 는
     그 숫자를 0~100 점 네 개와 코드 네 글자로 옮깁니다. 화면에 날것을
     같이 두는 이유는, 점수만 있으면 왜 그렇게 나왔는지 따질 수가 없어서입니다. */
  const ax = personaAxes(data || [], { cities });

  /* 첫 기록으로부터 며칠. 하루 미만이면 안 씁니다 — '0일' 은 아무 말도
     안 하는 것보다 나쁩니다. */
  {
    const t = (data || []).map(r => Date.parse(r.created_at)).filter(n => n > 0);
    if (t.length){
      const d = Math.floor((Date.now() - Math.min(...t)) / 86400000);
      if (d >= 1) st.days = d;
    }
  }

  drawPersona(st, ax);
}

export function closePersona(fromPop){
  if (!fromPop && history.state?.t2 === 'persona'){ history.back(); return; }
  $('personapane').classList.add('hide');
  $('profpane').classList.remove('hide');
}
$('openpersona').addEventListener('click', openPersona);
$('personaback').addEventListener('click', () => closePersona());

/* ── 카드 그리기 ──────────────────────────────────────────────────────
 * `s` 는 날숫자(personaStats), `ax` 는 네 축과 코드(personaAxes)입니다.
 * 여기서는 **그림에 넣을 것만 고릅니다.** 어떤 유형인지, 누구와 맞는지는
 * card.js 가 정합니다 — 계산이 두 군데 있으면 언젠가 갈라집니다. */
async function drawPersona(s, ax){
  /* ⚠ **문턱을 3곳에서 5곳으로 올렸습니다(b381).** 축이 넷이라 3곳으로는
     한 곳만 바뀌어도 코드가 통째로 뒤집힙니다 — "어제는 골목 탐험가였는데
     오늘은 명소 검열관" 이면 아무도 안 믿습니다. 5곳이면 나라도 대개
     둘 이상이라 단골력이 50 에 눌러앉지 않습니다. */
  if (s.cities < 5){
    const 남 = 5 - s.cities;
    $('personabox').innerHTML = `<div class="card">
      <div class="empty" style="padding:28px 12px">
        아직 카드를 만들 수 없어요.<br>
        <b>도시 ${남}곳</b>만 더 매기면 내 여행 성향이 나와요.
        <div class="memo" style="margin-top:6px">별점을 매긴 곳만 셉니다</div>
        <div style="margin-top:14px">
          <button class="primary" id="pgo">평가하러 가기</button></div>
      </div></div>`;
    $('pgo').onclick = () => { closePersona(); ctx.showApp('rate'); };
    return;
  }

  const code = ax.code;
  const type = PERSONA16[code] || { n:'여행자', d:'' };
  const rank = personaRank(s.countries);
  const mate = personaMates(code);

  /* ⚠ **한 벌만 그립니다.** 아래 pcardwrap 에 들어가는 것은 저장·공유로
     나가는 **바로 그 파일**입니다. 화면용 HTML 카드를 따로 만들었다가
     그림 쪽만 고쳐져서 보는 것과 올리는 것이 다른 카드가 된 적이 있습니다. */
  const spec = {
    kind: 'p16',
    code,
    rank,
    axisWords: [...code].map(ch => AXIS_WORD[ch]).join(' · '),
    name: type.n,
    desc: type.d,
    countries: s.countries,
    cities: s.cities,
    bars: AXIS_NAME.map((n, i) => [n, [ax.개척, ax.단골, ax.모험, ax.만족][i]]),
    best:  { code: mate.best,  score: mate.bestScore,
             name: PERSONA16[mate.best]?.n  || mate.best,  line: mate.bestLine },
    worst: { code: mate.worst, score: mate.worstScore,
             name: PERSONA16[mate.worst]?.n || mate.worst, line: mate.worstLine },
    mrz: personaMrz(code, s.countries, s.cities, rank, new Date().getFullYear()),
    /* 공유창 제목으로도 쓰입니다(card.js 의 saveCardImage). */
    title: `${code} ${type.n}`,
  };

  $('personabox').innerHTML = `
    <div class="pcardwrap" id="pcardwrap"></div>

    <div style="display:flex; gap:8px; margin-bottom:var(--s-sm)">
      <button class="small" id="p_img" style="flex:1">이미지로 저장</button>
      <button class="small" id="p_share" style="flex:1">공유</button>
    </div>

    <!-- 왜 이렇게 나왔는지 밝힙니다. 근거를 안 보여주면 그냥 재미로만 보고 맙니다.
         무엇을 더 하면 바뀌는지 알면 평가를 더 하게 됩니다. -->
    <div class="card">
      <h2>왜 ${esc(code)} 인가요</h2>
      <div class="row"><span class="label">개척력 ${ax.개척}
        <div class="memo">유명한 곳(F) ↔ 숨은 곳(H) · 도시 유명도 평균 ${s.avgFame ? s.avgFame.toFixed(2) : '—'}</div></span>
        <span class="val">${esc(code[0])}</span></div>
      <div class="row"><span class="label">단골력 ${ax.단골}
        <div class="memo">여러 나라(M) ↔ 한 나라(L) · 한 나라당 ${s.citiesPerCountry.toFixed(1)}곳</div></span>
        <span class="val">${esc(code[1])}</span></div>
      <div class="row"><span class="label">모험력 ${ax.모험}
        <div class="memo">가까이(N) ↔ 멀리(D) · 서울에서 평균 ${ax.avgDist ? Math.round(ax.avgDist).toLocaleString() + 'km' : '—'}</div></span>
        <span class="val">${esc(code[2])}</span></div>
      <div class="row"><span class="label">만족력 ${ax.만족}
        <div class="memo">까다로움(P) ↔ 후함(G) · 별점 평균 ★${s.avgRating.toFixed(2)}</div></span>
        <span class="val">${esc(code[3])}</span></div>
      <div class="row"><span class="label">매긴 도시</span>
        <span class="val">${s.cities}곳 · ${s.countries}개국 · ${s.continents}대륙</span></div>
      ${s.days ? `<div class="row"><span class="label">첫 기록으로부터</span>
        <span class="val">${s.days.toLocaleString()}일</span></div>` : ''}
      <div class="empty" style="text-align:left; padding-top:10px">
        AI 가 아니라 위 숫자로만 정합니다. 같은 기록이면 언제 봐도 같은 결과예요.
        <b>50점을 넘느냐</b>로 글자가 갈립니다.
      </div>
    </div>`;

  $('p_img').onclick = () => askImageSize(spec, `기로-${code}`);
  $('p_share').onclick = async () => {
    /* 글로 나가는 것은 카드와 별개입니다 — 그림을 못 보는 곳(문자·메모)에서는
       이 글이 전부라, 카드에 그림으로만 있는 것도 여기서는 말로 씁니다. */
    const text = `내 여행 성향: ${code} ${type.n}\n` +
      `${spec.axisWords}\n${s.countries}개국 · ${s.cities}개 도시 · ${rank}`;
    const url = location.origin + location.pathname;
    if (navigator.share){
      try { await navigator.share({ title:'내 여행 성향', text, url }); return; }
      catch (e){ if (e?.name === 'AbortError') return; }
    }
    toast(await copyText(`${text}\n${url}`) ? '복사했어요' : text);
  };

  /* 4:5 로 만듭니다. 인스타 피드에서 세로가 정사각보다 화면을 훨씬 많이
     먹고, 고르는 목록에서도 세로가 먼저입니다(card.js 의 IMG_SIZES).
     못 그려도 조용히 넘어갑니다 — 위 '왜 이런가요' 는 그대로 보이고,
     저장·공유 단추도 따로 그리므로 여전히 됩니다. */
  try {
    const { blob } = await cardImage(spec, 'portrait');
    if (personaUrl) URL.revokeObjectURL(personaUrl);   /* 다시 그릴 때마다 쌓입니다 */
    personaUrl = URL.createObjectURL(blob);
    const box = $('pcardwrap');
    if (box) box.innerHTML =
      `<img src="${personaUrl}" alt="${esc(code)} ${esc(type.n)} 성향 카드">`;
  } catch {}
}
/* 방금 만든 카드 그림의 주소. 다시 그릴 때 앞것을 놓아줍니다 —
   안 놓으면 화면을 드나들 때마다 메모리에 그림이 쌓입니다. */
let personaUrl = '';
