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
 * 층: dom.js · db.js · cities.js · card.js · rec.js · rate.js.
 *     rec·rate 는 b395 에서 늘었습니다 — 「어울리는 곳 · 반대로 가보면」을
 *     뽑느라 추천 계산과 다녀온 곳이 필요해졌습니다. city.js 는 b399 에서
 *     다시 뺐습니다 — 추천이 카드 그림 안으로 들어가 누를 줄이 없어졌습니다. */
import { $, esc, toast, copyText } from './dom.js?v=b439';
import { sb } from './db.js?v=b439';
import { cities, countryName, continentOf } from './cities.js?v=b439';
/* 닮은 도시로 다음 갈 곳을 고릅니다. **AI 를 안 씁니다** — 오프라인에서도
   돌아야 하고 같은 자료에는 늘 같은 답이 나와야 합니다(rec.js 맨 위 참고). */
import { similarPicks } from './rec.js?v=b439';
/* 친구와 궁합. 유입이 유입을 만드는 고리입니다(b408) — mate.js 머리말 참고. */
import { mateCode, mateLink, mateHtml } from './mate.js?v=b439';
import { visited } from './rate.js?v=b439';
import { personaStats, personaAxes, personaRank, personaMates, personaMrz,
         PERSONA16, AXIS_WORD, AXIS_NAME,
         shareCard, cardImage } from './card.js?v=b439';

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

  drawPersona(st, ax, data || []);
}

export function closePersona(fromPop){
  if (!fromPop && history.state?.t2 === 'persona'){ history.back(); return; }
  $('personapane').classList.add('hide');
  $('profpane').classList.remove('hide');
}
$('openpersona').addEventListener('click', openPersona);
$('personaback').addEventListener('click', () => closePersona());

/* 성향이 확정되는 문턱. **try.js 도 같은 5곳을 씁니다** — 맛보기에서는
   카드가 나왔는데 로그인 뒤에 "아직" 이 뜨면 속은 기분입니다. 고칠 때는
   두 곳을 같이 보십시오. */
const 문턱 = 5;

/* ── 카드 그리기 ──────────────────────────────────────────────────────
 * `s` 는 날숫자(personaStats), `ax` 는 네 축과 코드(personaAxes)입니다.
 * 여기서는 **그림에 넣을 것만 고릅니다.** 어떤 유형인지, 누구와 맞는지는
 * card.js 가 정합니다 — 계산이 두 군데 있으면 언젠가 갈라집니다. */
async function drawPersona(s, ax, rates){
  /* ⚠ **문턱을 3곳에서 5곳으로 올렸습니다(b381).** 축이 넷이라 3곳으로는
     한 곳만 바뀌어도 코드가 통째로 뒤집힙니다 — "어제는 골목 탐험가였는데
     오늘은 명소 검열관" 이면 아무도 안 믿습니다. 5곳이면 나라도 대개
     둘 이상이라 단골력이 50 에 눌러앉지 않습니다. */
  /* ── 문턱은 벽이 아니라 눈금입니다(b408) ────────────────────────────
     ⚠ **전에는 5곳 미만이면 카드를 아예 안 냈습니다** — 「아직 카드를 만들
       수 없어요」 한 줄이 전부였습니다. 로그인까지 하고 네 곳을 매긴 사람이
       **아무것도 못 받고 돌아갔습니다.** 빈손으로 돌려보내는 화면과 반쯤
       채워진 내 카드를 보여주는 화면은 다음 한 번을 누를 확률이 다릅니다.

     ⚠ **그래도 5곳은 지킵니다 — 지키는 방법을 바꿉니다.** 축이 넷이라
       3곳으로는 한 곳만 바뀌어도 코드가 통째로 뒤집힙니다(b381). 그래서
       **화면에는 내되 밖으로는 못 나가게** 합니다: 공유 단추를 감춥니다.
       확정 안 된 카드가 남에게 가면 "어제는 골목 탐험가였는데" 가 됩니다.

     ⚠ 맛보기(try.js)의 문턱은 **그대로 5곳**입니다. 거기는 카드가 목표라
       "다섯 곳만 채우면" 이 동기입니다. 여기는 이미 들어온 사람입니다. */
  const 임시 = s.cities < 문턱;
  const 남은곳 = Math.max(0, 문턱 - s.cities);

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

  /* ⚠ **해외가 문턱(3곳)에 못 미쳐도 카드는 냅니다.** 막을까 하다 안 막았습니다 —
     첫 카드를 못 보면 평가를 더 할 마음도 안 생깁니다. 대신 **덜 센 것을
     숨기지 않습니다.** 한 번도 해외에 안 간 사람에게 '먼 길 마다않는 외골수'
     라고 해 놓고 아무 말이 없으면, 맞는 줄 알거나 카드를 통째로 안 믿습니다.
     둘 다 나쁩니다. */
  const 덜셈 = ax.추정.length ? ' · 아직 모름' : '';

  /* ── 다음에 갈 만한 곳 ────────────────────────────────────────────
     ⚠ **두 줄의 성격이 다릅니다.** 「어울리는 곳」은 감추고-맞히기로 재서
     정한 것이고(상위 17.9%, 아무렇게나 하면 50%), 「반대로 가보면」은
     **정확도를 주장하지 않습니다** — 가 본 적 없는 결이라 애초에 맞히기로
     잴 수가 없습니다. 카드에서 둘을 **한 덩어리로 합치지 마십시오** —
     "다음에 갈 곳 여덟" 이 되면 뒤의 넷까지 맞다고 말하는 셈입니다.
     자세한 것은 rec.js 맨 위. */
  const picks = similarPicks(cities, rates, { visited, n: 4 });

  /* ⚠ **카드 그림 안으로 넣습니다(b399).** 전에는 카드 밑에 HTML 카드 둘을
     따로 붙였습니다(사진 · "오사카와 닮았어요" 이유까지). 걷어낸 이유는
     하나입니다 — **그건 공유가 안 됩니다.** 밖에 있으면 보는 사람만 보고
     올리는 그림에는 안 들어갑니다. 이 화면의 오래된 규칙이 "보는 것이 곧
     올리는 것" 인데, 그 규칙을 어기고 있었습니다.
     사진과 이유는 안 넣습니다(사용자 결정) — 이름만.
     ⚠ 카드가 세로로 길어지는 것은 받아들입니다. card.js 의 자(U)가 남는
       높이에 맞춰 알아서 줄입니다. */
  spec.picks = {
    match:    picks.match.map(x => x.city.name),
    opposite: picks.opposite.map(x => x.city.name),
  };

  $('personabox').innerHTML = `
    <div class="pcardwrap" id="pcardwrap"></div>

    <!-- ⚠ **단추가 둘이었습니다 — 「이미지로 저장」과 「공유」(b393).**
         그런데 공유 쪽은 글만 보냈고, 저장 쪽은 **그림·글·주소를 다** 보냈습니다.
         즉 앞엣것이 뒤엣것을 통째로 포함합니다. 카톡으로 보내보면 차이가
         분명합니다 — 하나는 글 세 줄, 하나는 카드 그림.
         **더 나은 쪽만 남깁니다.** 그림을 못 받는 기기에서는 card.js 가
         알아서 글로 떨어뜨립니다(saveCardImage). -->
    <!-- ⚠ **확정 전에는 공유 단추를 안 답니다(b408).** 카드는 보여주되
         밖으로는 못 나가게 합니다 — 흔들리는 코드가 남에게 가면 안 됩니다.
         대신 **몇 곳이 남았는지**를 그 자리에 적습니다. 단추가 있던 자리라
         눈이 거기로 가고, 그게 다음 한 번을 누르게 만듭니다. -->
    ${임시 ? `<div class="card" style="margin-bottom:var(--s-sm)">
      <div class="empty" style="padding:14px 10px">
        <b>도시 ${남은곳}곳</b>만 더 매기면 성향이 확정돼요.
        <div class="memo" style="margin-top:5px">
          지금 카드는 흔들릴 수 있어서 아직 공유는 못 해요
        </div>
        <div style="margin-top:12px">
          <button class="primary" id="pgo">평가하러 가기</button></div>
      </div></div>`
    : `<div style="margin-bottom:var(--s-sm)">
      <button class="primary" id="p_img" style="width:100%">공유하기</button>
      <!-- ⚠ **이게 유입이 유입을 만드는 유일한 고리입니다(b408).**
           카드 한 장은 한 번 퍼지고 끝인데, 궁합은 링크를 받은 사람이
           자기 카드를 만들어야 결과가 나오고 그 결과가 또 공유거리가
           됩니다. 자세한 것은 mate.js 머리말. -->
      <!-- ⚠⚠ **이 주석에 백틱을 쓰지 마십시오. 두 번째입니다(b412).** ⚠⚠
           여기는 템플릿 문자열 안이라 백틱 하나로 문자열이 끊깁니다.
           b394 에서 겪고 아래 단골력 줄에 경고까지 박아뒀는데, b410 에서
           **다른 자리에** 또 썼습니다. 그래서 성향 화면이 통째로 안 떴습니다
           ("…".ghost is not a function). 클래스 이름을 적을 때는 그냥 씁니다.

           ⚠ ghost 로 두었더니 단추로 안 보였습니다(b410). 재보니 높이 31px,
           테두리·배경 투명, 회색 11.7px — ghost 는 글자 링크용 스타일입니다.
           **이 앱에서 유입이 유입을 만드는 유일한 단추**인데 안 보이면
           아무도 안 누릅니다. 테두리 있는 보조 단추로 세웁니다. -->
      <button class="matebtn" id="p_mate">친구와 궁합 보기</button>
    </div>`}
    <!-- ?mate=CODE 로 들어왔으면 궁합을 맨 위에 놓습니다 — 그것 때문에 온
         사람이니 카드보다 먼저 봐야 합니다(아래 innerHTML 뒤에서 끼웁니다). -->
    <div id="matehere"></div>

    <!-- 왜 이렇게 나왔는지 밝힙니다. 근거를 안 보여주면 그냥 재미로만 보고 맙니다.
         무엇을 더 하면 바뀌는지 알면 평가를 더 하게 됩니다. -->
    <div class="card">
      <h2>왜 ${esc(code)} 인가요</h2>
      ${ax.추정.length ? `<div class="empty" style="text-align:left; padding:4px 0 12px">
        <b>${ax.추정.join('·')}은 아직 못 정했어요.</b> 이 둘은 <b>해외 도시로만</b>
        셉니다 — 국내 여행은 나라를 고르는 일이 아니니까요.
        해외 <b>${Math.max(1, ax.해외문턱 - ax.해외)}곳</b>만 더 매기면 정해져요.
        <div class="memo" style="margin-top:4px">그때까지는 50점(가운데)으로 둡니다</div>
      </div>` : ''}
      <div class="row"><span class="label">개척력 ${ax.개척}
        <div class="memo">유명한 곳(F) ↔ 숨은 곳(H) · 도시 유명도 평균 ${s.avgFame ? s.avgFame.toFixed(2) : '—'}</div></span>
        <span class="val">${esc(code[0])}</span></div>
      <!-- ⚠ **아래 둘은 해외만 셉니다(b394).** 그래서 근거 숫자도 s(전체)가
           아니라 ax(해외) 에서 가져옵니다 — 축은 해외로 세는데 옆에 적힌
           근거가 전체면, 왜 이렇게 나왔는지 따져보는 사람에게 앞뒤가 안 맞습니다.
           s.citiesPerCountry 를 여기 쓰지 마십시오.
           ⚠ **이 주석에 백틱을 쓰지 마십시오.** 여기는 템플릿 문자열 안이라
              백틱 하나로 문자열이 끊기고 파일 전체가 안 읽힙니다(b394 에서 겪음). -->
      <div class="row"><span class="label">단골력 ${ax.단골}${덜셈}
        <div class="memo">여러 나라(M) ↔ 한 나라(L) · 해외 한 나라당 ${ax.나라당.toFixed(1)}곳</div></span>
        <span class="val">${esc(code[1])}</span></div>
      <div class="row"><span class="label">모험력 ${ax.모험}${덜셈}
        <div class="memo">가까이(N) ↔ 멀리(D) · 서울에서 평균 ${ax.avgDist ? Math.round(ax.avgDist).toLocaleString() + 'km' : '—'}</div></span>
        <span class="val">${esc(code[2])}</span></div>
      <div class="row"><span class="label">만족력 ${ax.만족}
        <div class="memo">까다로움(P) ↔ 후함(G) · 별점 평균 ★${s.avgRating.toFixed(2)}</div></span>
        <span class="val">${esc(code[3])}</span></div>
      <div class="row"><span class="label">매긴 도시</span>
        <span class="val">${s.cities}곳 · ${s.countries}개국 · ${s.continents}대륙</span></div>
      <!-- 위 네 줄이 서로 다른 표본을 쓰므로 **그 표본을 밝힙니다.** 안 밝히면
           "74곳이라며 왜 한 나라당 3.8곳이지" 하고 계산이 틀린 줄 압니다. -->
      <div class="row"><span class="label">그중 해외
        <div class="memo">단골력·모험력은 이 ${ax.해외}곳으로만 셉니다</div></span>
        <span class="val">${ax.해외}곳</span></div>
      ${s.days ? `<div class="row"><span class="label">첫 기록으로부터</span>
        <span class="val">${s.days.toLocaleString()}일</span></div>` : ''}
      <div class="empty" style="text-align:left; padding-top:10px">
        AI 가 아니라 위 숫자로만 정합니다. 같은 기록이면 언제 봐도 같은 결과예요.
        <b>50점을 넘느냐</b>로 글자가 갈립니다.
        <b>단골력·모험력은 해외 도시만</b> 셉니다 — 부산에 간 것을 "한 나라만
        파는 성향"으로 읽으면 안 되니까요. 개척력·만족력은 국내도 다 셉니다.
      </div>
    </div>`;

  /* ⚠ 여기 「공유」 단추가 따로 있었습니다(b393 에서 합침). 그 글은 버리지
     않고 `shareText` 로 옮겼습니다 — **그림을 못 받는 기기**(문자·메모)에서는
     card.js 가 이 글로 떨어뜨립니다. 카드에 그림으로만 있는 것도 여기서는
     말로 적혀 있어야 그때 뜻이 통합니다. */
  spec.shareText = `내 여행 성향: ${code} ${type.n}\n` +
    `${spec.axisWords}\n${s.countries}개국 · ${s.cities}개 도시 · ${rank}` +
    /* 카드 그림에 들어간 것은 여기에도 있어야 합니다 — 그림을 못 받는
       기기에서는 이 글만 갑니다(b399 에서 추천을 카드 안으로 옮기면서 추가). */
    (spec.picks.match.length    ? `\n어울리는 곳: ${spec.picks.match.join(' · ')}` : '') +
    (spec.picks.opposite.length ? `\n반대로: ${spec.picks.opposite.join(' · ')}` : '');
  /* 확정 전에는 공유 단추 대신 「평가하러 가기」가 서 있습니다(b408).
     둘 중 하나만 있으므로 있는 쪽에만 답니다 — `$()` 가 없는 것을 주면
     여기서 터지고 카드가 통째로 안 그려집니다. */
  if (임시) $('pgo').onclick = () => { closePersona(); ctx.showApp('rate'); };
  else {
    $('p_img').onclick = () => shareCard(spec, `기로-${code}`);
    /* 링크 하나를 보냅니다. **그림이 아니라 글입니다** — 받는 사람이
       눌러서 자기 것을 만들어야 하므로 주소가 주인공입니다. */
    $('p_mate').onclick = () => {
      const url = mateLink(code);
      const text = `내 여행 성향은 ${code} ${type.n}.\n너랑 잘 맞나 볼래?`;
      if (navigator.share)
        navigator.share({ title:'기로 · 여행 성향 궁합', text, url })
          .catch(e => { if (e?.name !== 'AbortError') copyText(`${text}\n${url}`); });
      else copyText(`${text}\n${url}`);
    };
  }

  /* ── 친구가 보낸 궁합(b408) ────────────────────────────────────────
     `?mate=CODE` 로 들어왔으면 여기서 답니다. **카드보다 위**입니다 —
     그것 때문에 온 사람이라 제일 먼저 봐야 합니다. */
  {
    const 상대 = mateCode();
    const 칸 = $('matehere');
    if (상대 && 칸 && !임시){
      칸.innerHTML = mateHtml(code, 상대);
      /* 카드·단추보다 앞으로 옮깁니다(위 innerHTML 에서는 맨 끝에 있습니다). */
      $('personabox').prepend(칸);
    }
  }

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
