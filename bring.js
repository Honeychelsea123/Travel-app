/* ── 일정 불러오기 — 파일과 사진에서 ──────────────────────────────────
 * 이미 어딘가에 적어둔 일정을 앱으로 들여옵니다. 엑셀 표를 올리거나,
 * 화면 사진을 찍어 AI 에게 읽히거나. **직접 다시 치게 하지 않는 것**이
 * 이 화면의 전부입니다 — 3박 4일이면 스무 줄이 넘습니다.
 *
 * 분류 짐작(`guessCat`)도 여기 있습니다. 들여온 줄에는 분류가 없으므로
 * 제목에서 짐작해 붙입니다 — 그래야 일정 화면의 색점이 제 색으로 나옵니다.
 *
 * ── app.js 에서 떼어낸 스물한 번째 조각입니다(b346) ──────────────────
 * app.js 만 아는 것은 셋 — AI 화면 열기, 대화 다시 받기, 그리고 다 읽은 뒤
 * 일정 다시 그리기. 셋 다 **끝나고 넘겨주는 곳**이라 이 조각이 알 필요가
 * 없는 것들입니다.
 *
 * `xlsxLib` 는 **쓸 때 받아옵니다.** 엑셀을 안 올리는 사람이 대부분인데
 * 그 라이브러리는 큽니다 — planmap.js 의 Leaflet 과 같은 이유입니다.
 *
 * 층: dom.js · db.js · net.js · trip.js · ui.js · card.js 와
 *     이미 떼어낸 aiui.js · cards.js 를 씁니다. */
import { $, esc, toast } from './dom.js?v=b548';
import { sb } from './db.js?v=b548';
import { fail } from './net.js?v=b548';
import { trip } from './trip.js?v=b548';
import { syncSheets } from './ui.js?v=b548';
import { fitJpeg, drawSources, SHOT_MAX } from './aiui.js?v=b548';
import { drawCards } from './cards.js?v=b548';

let ctx = { openAi: () => {}, loadChats: async () => {}, loadPlans: async () => {} };
export function setBringCtx(o){ ctx = { ...ctx, ...o }; }


/* ── 분류 짐작 ──────────────────────────────────────────────────────
 * "라멘"이라고 적었으면 분류는 식사입니다. 매번 고르게 할 이유가 없습니다.
 * 다만 **짐작일 뿐이라 사용자가 고른 것을 덮지 않습니다.**
 * 한 번이라도 직접 골랐으면 그때부터는 손대지 않습니다 —
 * 자동으로 바꿔버리면 고쳐도 고쳐도 되돌아가는 것처럼 느껴집니다. */
const CAT_HINTS = [
  ['카페', /커피|카페|디저트|라떼|아메리카노|빵집|베이커리|케이크|아이스크림|젤라또|스타벅스|블루보틀/],
  ['식사', /라멘|스시|초밥|식당|맛집|점심|저녁|아침|브런치|디너|런치|장어|야키니쿠|야키토리|규카츠|카레|덮밥|정식|코스|오마카세|이자카야|국수|파스타|피자|버거|타코|쌀국수|딤섬|훠궈|바비큐|스테이크|해산물|시장|포차|술집|바\b/],
  ['숙소', /호텔|숙소|체크인|체크아웃|료칸|게스트하우스|에어비앤비|민박|리조트|숙박/],
  ['이동', /공항|기차|신칸센|버스|지하철|전철|페리|렌터카|택시|이동|환승|입국|출국|탑승|고속철|KTX|열차/i],
  ['쇼핑', /쇼핑|백화점|아울렛|면세|마트|드럭스토어|기념품|상점가|편집샵|서점/],
  ['관광', /신사|절|사원|성\b|박물관|미술관|공원|전망대|타워|궁|유적|해변|해수욕장|산\b|호수|폭포|온천|테마파크|동물원|수족관|야경|다리|광장|성당|모스크/],
];
export function guessCat(text){
  const t = String(text || '');
  for (const [cat, re] of CAT_HINTS) if (re.test(t)) return cat;
  return '';
}

/* ── 일정 불러오기 ──────────────────────────────────────────────────
 * 이미 짜둔 일정을 손으로 옮겨 적는 것이 제일 귀찮은 일입니다.
 * 사진·파일·붙여넣은 글 아무 것으로나 받아서 AI 가 읽고 카드로 만듭니다.
 *
 * **바로 저장하지 않습니다.** AI 가 잘못 읽을 수 있고, 남의 일정이 통째로
 * 들어가면 되돌리기가 번거롭습니다. 카드로 보여주고 담는 것은 사용자가 합니다
 * (담기·되돌리기는 AI 시트에 이미 있는 것을 그대로 씁니다).
 *
 * 엑셀(.xlsx)은 그대로 못 읽습니다. 압축된 XML 덩어리라 읽으려면 400KB 짜리
 * 라이브러리를 붙여야 하는데, 표를 복사해서 붙여넣으면 탭으로 나뉜 글이 그대로
 * 들어옵니다. 그게 더 빠르고 가볍습니다. */
let impShots = [], impFiles = [];

/* 엑셀은 압축된 XML 덩어리라 그냥은 못 읽습니다. 읽으려면 도구가 필요한데,
   그걸 늘 받아두면 앱이 1MB 가까이 무거워집니다. 엑셀을 고른 순간에만 받습니다.
   한 번 받으면 서비스워커가 담아둬서 다음부터는 비행기모드에서도 됩니다. */
let xlsxLib = null;
async function loadXlsx(){
  if (xlsxLib) return xlsxLib;
  await new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    s.onload = ok;
    s.onerror = () => no(new Error('엑셀 읽는 도구를 못 받았어요. 연결을 확인해주세요.'));
    document.head.appendChild(s);
  });
  xlsxLib = window.XLSX;
  if (!xlsxLib) throw new Error('엑셀 읽는 도구를 못 받았어요.');
  return xlsxLib;
}

/* 엑셀을 글자로 바꿉니다. 시트가 여럿이면 시트 이름을 붙여 이어 씁니다 —
   "숙소" 시트와 "일정" 시트가 나뉘어 있는 파일이 흔합니다. */
async function xlsxToText(file){
  const X = await loadXlsx();
  const wb = X.read(await file.arrayBuffer(), { type:'array' });
  return wb.SheetNames.map(name =>
    `[${name}]\n` + X.utils.sheet_to_csv(wb.Sheets[name])).join('\n\n').slice(0, 8000);
}

/* ⚠ 전에는 머리줄의 `불러오기`(#impbtn)가 이걸 열었습니다. **그 단추가 무엇을
   불러오는지 알 수 없다**는 말을 듣고 `추가` 폼 안의 두 갈래로 옮겼습니다
   (b365). 일정이 생기는 길은 둘뿐이고 — 직접 적거나 이미 짜둔 것을 옮겨오거나 —
   둘이 같은 자리에 있어야 설명이 필요 없습니다. */
function openImport(){
  /* 폼 둘이 나란히 서 있으면 어디에 적어야 하는지 헷갈립니다. */
  $('plancard').classList.add('hide');
  $('importcard').classList.remove('hide');
  $('imperr').classList.add('hide');
  impShots = []; impFiles = [];
  $('imp_text').value = '';
  drawImpPicked();
  /* 여기도 시트라 끌어올 것이 없습니다(b366). */
}
$('p_how_import').addEventListener('click', openImport);

/* 닫으면 칩을 '직접 적기'로 되돌립니다. 안 그러면 다음에 `추가` 를 열었을 때
   폼은 적는 화면인데 칩만 '사진·링크에서'를 가리키고 서 있습니다. */
function resetHow(){
  $('p_how_write').classList.add('on');
  $('p_how_import').classList.remove('on');
}
$('p_how_write').addEventListener('click', resetHow);
$('imp_cancel').addEventListener('click', () => {
  $('importcard').classList.add('hide'); resetHow();
});
$('imp_pick').addEventListener('click', () => $('imp_file').click());

function drawImpPicked(){
  $('imp_shots').classList.toggle('hide', !impShots.length);
  $('imp_shots').innerHTML = impShots.map((s, i) =>
    `<span class="shot1"><img src="${s.url}" alt="">
       <button class="x" data-impx="${i}" aria-label="빼기">×</button></span>`).join('');
  $('imp_files').classList.toggle('hide', !impFiles.length);
  $('imp_files').textContent = impFiles.length
    ? '파일 ' + impFiles.map(f => f.name).join(' · ') : '';
}
$('imp_shots').addEventListener('click', e => {
  const b = e.target.closest('[data-impx]'); if (!b) return;
  impShots.splice(+b.dataset.impx, 1); drawImpPicked();
});

$('imp_file').addEventListener('change', async e => {
  const files = [...(e.target.files || [])];
  e.target.value = '';
  $('imperr').classList.add('hide');
  for (const f of files){
    if (f.type.startsWith('image/')){
      if (impShots.length >= SHOT_MAX){ toast(`사진은 ${SHOT_MAX}장까지예요.`); continue; }
      try { impShots.push(await fitJpeg(f)); } catch (err){ fail(err, 'imp'); }
      continue;
    }
    if (/\.xlsx?$/i.test(f.name)){
      toast('엑셀을 읽는 중…');
      try { impFiles.push({ name: f.name, text: await xlsxToText(f) }); }
      catch (err){ fail(err, 'imp'); }
      continue;
    }
    if (/\.pdf$/i.test(f.name)){
      fail('PDF 는 아직 못 읽어요. 화면을 캡처해서 사진으로 올려주세요.', 'imp');
      continue;
    }
    /* 나머지는 글자 파일로 봅니다. CSV·TSV·메모장이 여기 들어옵니다. */
    try {
      const text = await f.text();
      impFiles.push({ name: f.name, text: text.slice(0, 8000) });
    } catch { fail(`${f.name} 을 읽지 못했어요.`, 'imp'); }
  }
  drawImpPicked();
});

$('imp_go').addEventListener('click', async () => {
  const b = $('imp_go');
  $('imperr').classList.add('hide');
  const typed = $('imp_text').value.trim();
  const fileText = impFiles.map(f => `[${f.name}]\n${f.text}`).join('\n\n');
  const text = [typed, fileText].filter(Boolean).join('\n\n');
  if (!text && !impShots.length)
    return fail('사진이나 파일을 고르거나, 일정을 붙여넣어주세요.', 'imp');

  /* 20~30초가 걸리는 일입니다. "읽는 중…" 하나만 두면 멈춘 줄 알고 다시 누릅니다.
     지금 무엇을 하고 있는지 단계로 바꿔 보여줍니다. 진짜 진행률은 알 수 없지만
     **글자가 바뀌는 것만으로도 살아 있다는 신호가 됩니다.** */
  /* 문구에 '블로그'를 박아두면 구글 지도 링크를 넣었을 때 틀린 말이 됩니다.
     읽는 대상이 무엇이든 맞는 말로 둡니다. */
  const hasLink = /https?:\/\//.test(text);
  const steps = [
    [0,     hasLink ? '링크를 여는 중…' : '읽는 중…'],
    [4000,  hasLink ? '링크 안을 읽는 중…' : '내용을 살펴보는 중…'],
    [9000,  '날짜와 장소를 골라내는 중…'],
    [16000, '거의 다 됐어요…'],
    /* ⚠ **"글이 길면"은 사실이 아닐 때가 많습니다 (b389).** 실사용 점검에서
       한 줄짜리 글도 28초가 걸렸습니다. 걸리는 시간의 대부분은 글 길이가
       아니라 **모델이 답을 써 내려가는 시간**이고, 이건 짧은 글도 마찬가지입니다.
       (가벼운 모델로 바꾸면 13초가 되지만 일정이 새서 되돌렸습니다 — 위 참고.)
       사실이 아닌 이유를 대면 사용자가 엉뚱한 것을 고치려 듭니다. */
    [26000, '조금만 더요. 빠뜨리지 않으려고 꼼꼼히 보는 중이에요…'],
  ];
  const timers = steps.map(([ms, msg]) => setTimeout(
    () => { b.innerHTML = `<span class="load">${esc(msg)}</span>`; }, ms));

  b.disabled = true; b.innerHTML = `<span class="load">${esc(steps[0][1])}</span>`;
  const { data, error } = await sb.functions.invoke('chat', {
    body: { trip_id: trip.id, mode: 'import', message: text.slice(0, 8000),
            images: impShots.map(s => ({ mime: s.mime, data: s.data })) },
  });
  timers.forEach(clearTimeout);
  b.disabled = false; b.textContent = '읽어오기';

  /* 링크를 줬는데 못 읽었으면 그 사실을 말해줍니다. 조용히 넘어가면
     "링크를 왜 무시하지?"만 알고 이유를 모릅니다. */
  const bad = (data?.blogs || []).filter(x => !x.ok);
  if (bad.length)
    toast(bad.length === 1 ? '링크 1개는 못 읽었어요 (로그인이 필요하거나 막힌 글)'
                           : `링크 ${bad.length}개는 못 읽었어요`);

  if (error || data?.error){
    let why = data?.error || error?.message || '';
    try { why = (await error?.context?.json())?.error || why; } catch {}
    return fail(why, 'imp');
  }
  /* **후보(places)만 나올 수 있습니다.** 구글 지도 링크처럼 날짜가 없는 것은
     일정이 아니라 후보로 옵니다. actions 만 세면 멀쩡히 읽어놓고
     "일정을 못 찾았어요"로 튕깁니다. */
  const got = (data.actions?.length || 0) + (data.places?.length || 0);
  if (!got)
    return fail(bad.length
      ? '링크를 못 읽었어요. 로그인이 필요한 글이거나 막아둔 블로그일 수 있어요. ' +
        '글을 복사해서 아래 칸에 붙여넣으면 그대로 읽어드려요.'
      : '일정을 못 찾았어요. 사진이 흐리거나 형식이 낯설 수 있어요.', 'imp');

  /* 결과는 AI 시트에서 봅니다. 담기·되돌리기가 거기 이미 있습니다 —
     여기서 또 만들면 두 벌이 되고 언젠가 한쪽만 고칩니다. */
  $('importcard').classList.add('hide');
  syncSheets();
  ctx.openAi();
  $('ai_trip').value = trip.id;
  await ctx.loadChats(trip.id);
  drawSources(data.sources, data.web);
  drawCards(data);
  toast(`${got}개를 읽었어요. 확인하고 담아주세요.`);
});

