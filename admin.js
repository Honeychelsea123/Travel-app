/* ── 관리자 화면 ───────────────────────────────────────────────────────
 * 대시보드 · 조절 · 바뀐 것. 관리자만 보는 화면 전부입니다.
 *
 * **여기는 앱 상태를 하나도 안 봅니다.** trip · plans · me · legs 어느 것도
 * 읽지 않고, 필요한 숫자는 전부 서버 함수(admin_stats · admin_settings)에서
 * 받아옵니다. 그래서 통째로 떼어낼 수 있었습니다 — 옮기기 전에 실제로
 * 세어보고 확인했습니다.
 *
 * 화면을 뜯어도 남의 자료는 안 나옵니다. 서버 쪽 함수가 is_admin() 을
 * 확인하므로 여기서 막는 것은 그저 안 보여주는 것뿐입니다.
 */
import { $, esc, toast, copyText } from './dom.js?v=b348';
import { sb } from './db.js?v=b348';
import { fail, netTimeout } from './net.js?v=b348';

/* ── 관리자 대시보드 ────────────────────────────────────────────────
 * 표를 하나씩 열어보게 하면 결국 안 봅니다. 한 화면에 모읍니다.
 * **숫자만 냅니다** — 누가 어디를 갔는지는 관리자도 볼 이유가 없습니다.
 * 서버 쪽 함수가 is_admin() 을 확인하므로 화면을 뜯어도 못 봅니다. */
export async function loadAdmin(){
  /* 들어가는 문은 프로필 우상단 아이콘 하나입니다. 관리자가 아니면 서버가
     막고, 그때 아이콘도 숨깁니다 — 눌러도 아무 일이 없는 단추를 두면 안 됩니다. */
  const show = on => $('dashbtn').classList.toggle('hide', !on);
  /* 기본 2.5초로는 모자랍니다 — 표 열몇 개를 세는 함수라 첫 호출이 느립니다.
     화면을 막고 있는 것이 아니니 넉넉하게 줍니다. */
  const r = await netTimeout(sb.rpc('admin_stats'), 8000);
  if (r.error || !r.data){ show(false); return; }
  /* 처리방침에 "오류 90일, 신고 1년"이라고 적었으니 실제로 지워져야 합니다(042).
     따로 도는 장치가 없어서 관리자가 대시보드를 열 때 한 번씩 치웁니다.
     결과를 기다릴 이유는 없습니다 — 화면과 상관없는 뒷일입니다. */
  sb.rpc('sweep_retention').then(() => {}, () => {});
  show(true);
  /* **눈금자는 자동으로 안 켭니다.** b240 에서 잠깐 켰다가 b242 에서 다시 껐습니다 —
     재려던 것(새 여행 시트가 키보드 뒤에 앉던 것)을 b241 에서 잡았습니다.
     평소에 초록 글씨가 떠 있을 이유가 없습니다.
     **다시 재야 할 때는 이 한 줄을 되살리면 됩니다:** `window.startRuler?.();`
     사파리에서는 주소 끝에 `?kb=1` 로도 켜지지만, **홈 화면 앱은 저장 공간이
     달라 그 길이 없습니다** — 거기서 재려면 반드시 여기를 켜야 합니다.
     켠 뒤 초록 상자를 손가락으로 누르면 빨강(fixed)·파랑(absolute) 자가 켜집니다. */
  /* 조절 칸도 같이 채웁니다. 여기서 기다리지 않습니다 — 통계와 상관없는
     별개 요청이라 순서대로 하면 화면만 늦게 뜹니다. */
  loadSettings();
  const d = r.data;

  const n   = v => Number(v ?? 0).toLocaleString('ko-KR');
  const num = v => Number(v ?? 0);

  /* 큰 숫자 넷. 하루에 한 번 볼 때 이것만 봐도 되는 것들입니다.
     delta 는 "어제 대비"가 아니라 "최근 7일에 늘어난 만큼"입니다 — 하루 단위는
     너무 튀어서 추세가 안 보입니다. */
  const tile = (label, value, delta) => `<div class="atile">
    <div class="k">${esc(label)}</div>
    <div class="v">${esc(value)}</div>
    ${delta ? `<div class="d">${esc(delta)}</div>` : ''}</div>`;

  /* 예산 막대. 숫자만 늘어놓으면 "많은 건가?"를 판단 못 합니다.
     80% 를 넘으면 색이 바뀝니다 — 그때부터는 손을 써야 합니다. */
  const bar = (title, used, budget, pct, foot) => {
    if (!budget) return '';
    const p = Math.min(num(pct), 100);
    const tone = p >= 90 ? 'bad' : p >= 70 ? 'warn' : '';
    return `<div class="abar ${tone}">
      <div class="t"><span>${esc(title)}</span>
        <span class="p">${n(used)} / ${n(budget)} · ${p}%</span></div>
      <div class="track"><i style="width:${p}%"></i></div>
      ${foot ? `<div class="f">${esc(foot)}</div>` : ''}</div>`;
  };

  /* 표는 .row 를 쓰다가 글자가 너무 커서 한 줄이 화면을 다 먹었습니다.
     여기는 숫자를 훑는 자리라 촘촘해야 합니다. 전용 줄을 씁니다. */
  const grp = (title, rows) =>
    `<div class="agrp">${esc(title)}</div>` +
    rows.filter(Boolean).map(([k, v, m]) => `<div class="arow">
      <span class="k">${esc(k)}${m ? `<span class="m">${esc(m)}</span>` : ''}</span>
      <span class="v">${esc(v)}</span></div>`).join('');

  /* 예산이 며칠 남았는지. 최근 7일 평균으로 나눈 값이라 어제 갑자기 몰렸으면
     짧게 나옵니다. 정확한 예언이 아니라 "슬슬 봐야 하나"의 신호입니다. */
  const days = d.ai_days_left == null ? '아직 쓴 기록이 없어 계산할 수 없습니다'
    : num(d.ai_days_left) > 60 ? `하루 평균 ${n(d.ai_avg)}회. 여유 있습니다`
    : `하루 평균 ${n(d.ai_avg)}회 · 이 속도면 ${n(d.ai_days_left)}일 뒤에 예산을 다 씁니다`;

  const blocked = num(d.ai_blocked_7d);
  const saved   = num(d.se_hits_month);

  $('adm_stats').innerHTML =
    /* 손을 써야 하는 것이 있으면 맨 위입니다. 표 안에 묻으면 안 봅니다. */
    /* **"아래 조절에서 바꾸세요"라고만 하고 갈 길을 안 줬습니다.** 조절이
       한 겹 안으로 들어갔으니 더 그렇습니다 — 눌러서 바로 가게 합니다.
       그리고 한 번 보고 판단했으면 닫을 수 있어야 합니다. 안 그러면 늘
       빨간 상자가 떠 있어서, 정말 급할 때도 배경처럼 지나칩니다.
       숫자가 늘면 다시 뜹니다(닫은 값과 다르면). */
    (blocked && String(blocked) !== localStorage.getItem('t2:adm:seenblk')
      ? `<div class="awarn">최근 7일 동안 <b>${n(blocked)}번</b> 한도에 막혔습니다.
       ${num(d.ai_blocked_today) ? `오늘만 ${n(d.ai_blocked_today)}번입니다. ` : ''}
       더 쓰고 싶은데 못 쓴 사람이 있다는 뜻이라 자주 막히면 다시 안 옵니다.
       <div style="margin-top:10px; display:flex; gap:8px">
         <button class="small" id="adm_goset">한도 바꾸기</button>
         <button class="ghost" id="adm_hideblk" data-blk="${esc(String(blocked))}">
           알겠어요</button>
       </div></div>` : '') +

    `<div class="atiles">
      ${tile('가입자', n(d.users_total) + '명', `최근 7일에 ${n(d.users_7d)}명 늘었습니다`)}
      ${tile('최근 7일 쓴 사람', n(d.touched_7d) + '명', `그중 AI까지 쓴 사람 ${n(d.active_7d)}명`)}
      ${tile('만들어진 여행', n(d.trips_total) + '개', `지금 여행 중인 것 ${n(d.trips_now)}개`)}
      ${tile('오늘 AI 호출', n(d.ai_today) + '회', `어제는 ${n(d.ai_yday)}회`)}
    </div>` +

    `<div class="agrp">이번 달 얼마나 썼나</div>` +
    bar('AI · Gemini', d.ai_month, d.ai_budget, d.ai_pct, days) +
    bar('웹 검색 · Tavily', d.se_month, d.se_budget, d.se_pct,
        saved ? `보관함이 ${n(saved)}번 막아줘서 그만큼 크레딧을 안 썼습니다`
              : '아직 보관함이 막아준 검색이 없습니다') +
    `<div class="anote">여기 예산은 <b>직접 정해둔 값</b>이에요.
      구글·Tavily가 알려주는 실제 잔여량이 아닙니다 — 그건 각 콘솔에서만 볼 수 있어서,
      거기서 확인한 뒤 <code>app_config</code> 에 옮겨 적어야 맞습니다.</div>` +

    grp('쓰는 사람', [
      ['전체 가입자', n(d.users_total) + '명'],
      ['오늘 가입', n(d.users_today) + '명'],
      ['최근 30일 가입', n(d.users_30d) + '명'],
      ['최근 7일 앱을 쓴 사람', n(d.touched_7d) + '명',
       '일정·지출·별점 중 하나라도 건드린 사람'],
      ['그중 AI까지 쓴 사람', n(d.active_7d) + '명'],
      ['가입만 하고 안 쓴 사람', n(d.users_idle) + '명',
       '여행을 하나도 안 만든 계정. 많으면 첫 화면이 문제입니다'],
    ]) +
    grp('쌓인 자료', [
      ['여행', n(d.trips_total) + '개', `최근 7일에 ${n(d.trips_7d)}개 늘었습니다`],
      ['지금 여행 중', n(d.trips_now) + '개', `출발을 앞둔 여행 ${n(d.trips_soon)}개`],
      ['일행과 함께 쓰는 여행', n(d.trips_shared) + '개',
       '혼자 쓰는 앱인지 같이 쓰는 앱인지가 여기서 갈립니다'],
      ['일정', n(d.plans_total) + '개'],
      ['지출', n(d.expenses_total) + '건'],
      ['도시 별점', n(d.ratings_total) + '개'],
      ['여행 후기', n(d.reviews_total) + '개'],
    ]) +
    grp('AI · Gemini', [
      ['오늘', n(d.ai_today) + '회', `어제는 ${n(d.ai_yday)}회였습니다`],
      ['최근 7일', n(d.ai_7d) + '회', `하루 평균 ${n(d.ai_avg)}회`],
      ['최근 30일', n(d.ai_30d) + '회'],
      ['이번 달 누적', n(d.ai_month) + '회',
       `예산 ${n(d.ai_budget)}회 가운데 ${n(d.ai_left)}회 남았습니다`],
      ['그중 일정 검토 (7일)', n(d.ai_review_7d) + '회',
       '일반 대화와 따로 셉니다. 아까워서 안 쓰게 되면 안 되니까요'],
      ['오늘 가장 많이 쓴 사람', n(d.ai_top_today) + '회', '한 사람 기준'],
      ['한도에 막힌 횟수', `오늘 ${n(d.ai_blocked_today)}회 · 7일 ${n(d.ai_blocked_7d)}회`,
       '0이 아니면 더 쓰고 싶은데 못 쓴 사람이 있다는 뜻입니다'],
    ]) +
    grp('웹 검색 · Tavily', [
      ['오늘 나간 검색', n(d.se_today) + '회', '실제로 크레딧을 쓴 횟수입니다'],
      ['최근 7일', n(d.se_7d) + '회'],
      ['이번 달 누적', n(d.se_month) + '회',
       `예산 ${n(d.se_budget)}회 가운데 ${n(d.se_left)}회 남았습니다`],
      ['보관함이 막아준 검색', n(d.se_hits_month) + '회',
       '같은 검색을 다시 안 해서 아낀 크레딧입니다'],
      ['지금 담아둔 검색', n(d.se_cached) + '건',
       '6시간이 지나면 지웁니다. 누적이 아니라 현재 보관량입니다'],
    ]) +
    grp('문제', [
      ['앱이 터진 횟수', `오늘 ${n(d.errors_today)}건 · 7일 ${n(d.errors_7d)}건`],
      ['아직 안 읽은 신고', n(d.reports_open) + '건', `지금까지 받은 신고 ${n(d.reports_total)}건`],
    ]);

  /* 빨간 상자의 두 단추. 다시 그릴 때마다 새로 달아야 하므로 여기 둡니다. */
  $('adm_goset')?.addEventListener('click', () => setPane(true));
  $('adm_hideblk')?.addEventListener('click', e => {
    localStorage.setItem('t2:adm:seenblk', e.currentTarget.dataset.blk);
    e.currentTarget.closest('.awarn')?.remove();
  });

  const f = await netTimeout(sb.rpc('admin_feed'), 8000);
  const rows = f.data || [];
  $('adm_feedcard').classList.toggle('hide', !rows.length);
  $('adm_feed').innerHTML = rows.map(x => `<div class="arow">
      <span class="k"><b>${esc(x.kind)}</b> ${esc(String(x.body).slice(0, 120))}
        <span class="m">${esc((x.at || '').slice(0, 16).replace('T', ' '))}${
          x.build ? ' · ' + esc(x.build) : ''}</span></span>
      ${Number(x.n) > 1 ? `<span class="v">${x.n}회</span>` : ''}</div>`).join('');
}

$('adm_refresh').addEventListener('click', loadAdmin);

/* ── 조절 ────────────────────────────────────────────────────────────
 * 코드에 박아두면 껐다 켤 때마다 개발 도구를 열어야 합니다. 운영하는 사람이
 * 그래야 한다면 그건 아직 만들다 만 것입니다. 값은 DB(app_settings)에 있고
 * 모양 검사는 admin_setting_set 이 합니다 — 화면만 믿으면 콘솔에서
 * 아무 값이나 넣을 수 있습니다. */
async function loadSettings(){
  const { data, error } = await sb.rpc('admin_settings');
  if (error){ $('s_note').textContent = '설정을 못 읽었어요: ' + (error.message || ''); return; }
  const a = data?.ai_limit || {}, w = data?.web_search || {}, m = data?.ai_model || {};
  $('s_ailimit').checked = !!a.on;
  $('s_ai_day').value    = a.day  ?? 15;
  $('s_ai_trip').value   = a.trip ?? 30;
  $('s_web').checked     = w.on !== false;
  $('s_model').value     = m.name || 'gemini-3.6-flash';
  syncSetRow();
  $('s_note').textContent = '바꾼 뒤 저장을 누르세요. 곧바로 모두에게 적용됩니다.';

  /* 비상 스위치는 **저장을 안 거칩니다.** 급할 때 두 번 누르게 하면 안 됩니다.
     066 을 아직 안 올렸으면 값이 없습니다 — 그때는 켜진 것으로 봅니다.
     "설정을 못 읽었으니 다 꺼둔다"는 앱을 멈추는 것과 같습니다. */
  const on = k => data?.[k]?.on !== false;
  $('s_aion').checked     = on('ai_on');
  $('s_signup').checked   = on('signup_on');
  $('s_push').checked     = on('push_on');
  $('s_readonly').checked = data?.readonly?.on === true;   /* 이건 꺼짐이 기본 */

  const nt = data?.notice || {};
  $('s_notice').value = nt.text || '';
  document.querySelectorAll('#s_tone [data-tone]').forEach(b =>
    b.classList.toggle('on', b.dataset.tone === (nt.tone || 'info')));

  const f = data?.features || {};
  document.querySelectorAll('[data-feat]').forEach(el =>
    el.checked = f[el.dataset.feat] !== false);
}

/* 켬/끔 하나짜리들. **누르는 즉시 나갑니다.** 실패하면 화면을 되돌립니다 —
   껐다고 보이는데 안 꺼져 있으면 그게 제일 나쁩니다. */
$('setadmpane').addEventListener('change', async e => {
  const el = e.target.closest('[data-now]'); if (!el) return;
  const key = el.dataset.now, want = el.checked;
  $('s_swnote').textContent = '보내는 중…';
  const r = await sb.rpc('admin_setting_set', { p_key:key, p_value:{ on:want } });
  if (r.error){
    el.checked = !want;
    $('s_swnote').textContent = '못 바꿨어요: ' + (r.error.message || '');
    return;
  }
  $('s_swnote').textContent = { ai_on: want ? 'AI 를 켰어요' : 'AI 를 껐어요',
    signup_on: want ? '가입을 다시 받아요' : '새 가입을 막았어요',
    push_on:   want ? '알림을 다시 보내요' : '알림을 멈췄어요',
    readonly:  want ? '점검 모드입니다 — 모두 읽기만 됩니다' : '점검 모드를 껐어요',
  }[key] || '바꿨어요';
});

/* 기능 스위치는 하나의 값(객체) 안에 같이 삽니다. 통째로 보냅니다. */
$('setadmpane').addEventListener('change', async e => {
  if (!e.target.closest('[data-feat]')) return;
  const row = {};
  document.querySelectorAll('[data-feat]').forEach(el => row[el.dataset.feat] = el.checked);
  const r = await sb.rpc('admin_setting_set', { p_key:'features', p_value:row });
  if (r.error) toast('못 바꿨어요: ' + (r.error.message || ''));
  else toast('기능 스위치를 바꿨어요');
});

$('s_tone').addEventListener('click', e => {
  const b = e.target.closest('[data-tone]'); if (!b) return;
  document.querySelectorAll('#s_tone [data-tone]').forEach(x =>
    x.classList.toggle('on', x === b));
});
$('s_noticesave').addEventListener('click', async () => {
  const b = $('s_noticesave');
  b.disabled = true; b.innerHTML = '<span class="load">보내는 중…</span>';
  const tone = document.querySelector('#s_tone .on')?.dataset.tone || 'info';
  const r = await sb.rpc('admin_setting_set',
    { p_key:'notice', p_value:{ text: $('s_notice').value, tone } });
  b.disabled = false; b.textContent = '띄우기';
  if (r.error) return toast('못 띄웠어요: ' + (r.error.message || ''));
  toast($('s_notice').value.trim() ? '공지를 띄웠어요' : '공지를 내렸어요');
});
/* 한도를 끈 상태에서 숫자 칸은 아무 뜻이 없습니다. 흐려서 그렇다고 알립니다 —
   지우면 켤 때 무슨 값이었는지 못 봅니다. */
function syncSetRow(){
  const on = $('s_ailimit').checked;
  $('s_ailimit_nums').style.opacity = on ? '' : '.45';
  $('s_ai_day').disabled = $('s_ai_trip').disabled = !on;
}
$('s_ailimit').addEventListener('change', syncSetRow);

$('adm_setsave').addEventListener('click', async () => {
  const b = $('adm_setsave');
  $('serr').classList.add('hide');
  b.disabled = true; b.innerHTML = '<span class="load">저장 중…</span>';
  /* 셋을 차례로 보냅니다. 하나가 막히면 거기서 멈추고 왜인지 보여줍니다 —
     서버가 값의 모양을 검사하므로 그 말을 그대로 옮기는 것이 가장 정확합니다. */
  const jobs = [
    ['ai_limit',   { on: $('s_ailimit').checked,
                     day:  Number($('s_ai_day').value),
                     trip: Number($('s_ai_trip').value) }],
    ['web_search', { on: $('s_web').checked }],
    ['ai_model',   { name: $('s_model').value }],
  ];
  for (const [key, value] of jobs){
    const { error } = await sb.rpc('admin_setting_set', { p_key: key, p_value: value });
    if (error){
      b.disabled = false; b.textContent = '저장';
      return fail(error, 's');
    }
  }
  b.disabled = false; b.textContent = '저장';
  toast('저장했어요.');
  await loadSettings();
});

/* 통계는 프로필 우상단 아이콘으로만 들어갑니다. 설정 안에도 문을 두었다가
   같은 문이 둘이 되어 없앴습니다. loadAdmin 이 로그인할 때 미리 다 받아두므로
   여는 것은 즉시입니다. */
$('dashbtn').addEventListener('click', () => {
  $('profpane').classList.add('hide');
  $('admpane').classList.remove('hide');
  window.scrollTo({ top:0, behavior:'smooth' });
});
/* 조절은 한 겹 안입니다. 관리자 화면을 열 때마다 스위치 다섯이 맨 위를
   먹었는데, 실제로 바꾸는 일은 몇 달에 한 번입니다.
   다른 카드를 다 감추지는 않습니다 — 한 화면 안에서 자리만 바꿉니다.
   그래야 '뒤로'가 앱을 나가는 것과 안 헷갈립니다. */
const setPane = on => {
  $('setadmpane').classList.toggle('hide', !on);
  /* 나머지를 **묶음째** 감춥니다. 카드를 하나씩 감추면, 원래 숨어 있던 것
     (신고가 없을 때의 adm_feedcard)까지 되살아납니다.
     조절이 사이에 끼어 있어 묶음이 둘입니다. */
  $('adm_main').classList.toggle('hide', on);
  $('adm_dash').classList.toggle('hide', on);
  window.scrollTo({ top:0 });
};
$('adm_setopen').addEventListener('click', () => setPane(true));
$('adm_setback').addEventListener('click', () => setPane(false));

$('admback').addEventListener('click', () => {
  $('admpane').classList.add('hide');
  /* 조절을 열어둔 채로 나갔다 들어오면 그 화면이 그대로 남습니다.
     대시보드로 되돌려 놓습니다 — 들어올 때는 늘 같은 화면이어야 합니다. */
  setPane(false);
  $('profpane').classList.remove('hide');
  window.scrollTo({ top:0, behavior:'smooth' });
});

/* 도시 사진을 Pexels 핫링크에서 우리 Storage 로 옮기는 일회용 카드가 여기
   있었습니다. 2026-08-08 에 469 곳 전부 옮긴 것을 확인하고 걷어냈습니다
   (image_url 이 전부 우리 storage 주소이고 pexels 는 0 곳).
   supabase/functions/migrate-images 도 같이 지웠습니다. */

/* ── 바뀐 것 ────────────────────────────────────────────────────────
 * 판마다 무엇이 바뀌었는지. 목록은 changes.js 에 따로 있습니다.
 *
 * **정적 import 를 쓰지 않습니다.** 그러면 오프라인에서 그 파일이 캐시에
 * 없을 때 모듈 로드가 통째로 실패해 앱이 안 뜹니다. 누를 때만 받아오고,
 * 못 받아오면 그 화면만 못 엽니다. 화면 판 번호를 붙여 옛 파일을 안 잡게 합니다. */
let CHG = null;
$('adm_chgcard').addEventListener('click', async () => {
  $('admpane').classList.add('hide');
  $('chgpane').classList.remove('hide');
  window.scrollTo({ top:0, behavior:'smooth' });
  if (CHG) return drawChanges();
  try {
    const v = $('build')?.textContent || '';
    ({ CHANGES: CHG } = await import(`./changes.js?v=${encodeURIComponent(v)}`));
    drawChanges();
  } catch (e){
    $('chglist').innerHTML = `<div class="card"><div class="empty" style="text-align:left">
      목록을 못 받아왔어요. 연결이 없으면 이 화면은 안 열립니다.<br>
      <span class="memo">${esc(String(e?.message || e))}</span></div></div>`;
  }
});
$('chgback').addEventListener('click', () => {
  $('chgpane').classList.add('hide');
  $('admpane').classList.remove('hide');
  window.scrollTo({ top:0, behavior:'smooth' });
});

const CHG_TAG = { '새로':'k-관광', '고침':'k-식사', '바뀜':'k-이동', '걷어냄':'' };
function drawChanges(){
  $('chglist').innerHTML = (CHG || []).map(r => `<div class="card">
    <h2><span class="grow">${esc(r.t)}</span></h2>
    <div class="memo" style="margin:-6px 0 10px">${esc(r.d)} · ${esc(r.v)}</div>
    ${r.items.map(([tag, s]) => `<div class="plan">
       <span class="kdot ${esc(CHG_TAG[tag] ?? '')}"></span>
       <div class="body"><b style="font-size:calc(13px * var(--ts))">${esc(tag)}</b>
         <span class="memo">${esc(s)}</span></div></div>`).join('')}
  </div>`).join('');
}

/* 내가 낸 오류만 봅니다(RLS 가 그렇게 막아 뒀습니다).
   문의할 때 붙일 수 있게 복사도 됩니다 — 스크린샷보다 이쪽이 고치기 쉽습니다. */
$('errbtn').addEventListener('click', async () => {
  const box = $('errlist'), btn = $('errbtn');
  if (!box.classList.contains('hide')){ box.classList.add('hide'); btn.textContent = '확인'; return; }
  btn.disabled = true; btn.innerHTML = '<span class="load">보는 중…</span>';
  const { data, error } = await sb.from('client_errors')
    .select('created_at,build,message,source')
    .order('created_at', { ascending:false }).limit(20);
  btn.disabled = false; btn.textContent = '닫기';
  box.classList.remove('hide');
  if (error){
    box.innerHTML = `<div class="empty" style="text-align:left">오류 기록을 못 읽었어요.<br>
      <span class="memo">${esc(error.message || '')}</span></div>`;
    return;
  }
  const rows = data || [];
  $('errnote').textContent = rows.length
    ? `최근 ${rows.length}건이 남아 있어요` : '남아 있는 문제가 없어요';
  box.innerHTML = rows.length
    ? rows.map(r => `<div class="row">
        <span class="label"><b style="font-size:calc(13px * var(--ts))">${esc(r.message)}</b>
          <div class="memo">${esc((r.created_at || '').slice(0, 16).replace('T', ' '))}
            · ${esc(r.build || '')} · ${esc(r.source || '')}</div></span></div>`).join('') +
      `<div style="margin-top:10px; display:flex; gap:8px">
         <button class="small" id="errcopy">복사해서 보내기</button></div>
       <div class="empty" style="text-align:left; padding-top:8px">
         복사한 내용을 만든 사람에게 보내주세요. 일정·지출 내용은 들어 있지 않아요.</div>`
    : `<div class="empty">아직 남아 있는 문제가 없어요.</div>`;
  if ($('errcopy')) $('errcopy').onclick = async () => {
    const txt = rows.map(r =>
      `${(r.created_at || '').slice(0, 19)} [${r.build}] ${r.message} @ ${r.source}`).join('\n');
    $('errcopy').textContent = await copyText(txt) ? '복사했어요' : '복사하지 못했어요';
  };
});
