// =====================================================================
// AI 대화 — Supabase Edge Function
//
// 왜 서버가 필요한가
//   화면은 공개 저장소에 그대로 올라갑니다. 거기 API 키를 두면 전 세계에 공개됩니다.
//   키는 이 함수의 비밀값(Secrets)에만 두고, 화면은 이 함수만 부릅니다.
//
// 올리는 법 (CLI 없이 대시보드에서)
//   1. Supabase → Edge Functions → Deploy a new function → 이름 chat
//   2. 이 파일 내용을 그대로 붙여넣고 Deploy
//   3. Edge Functions → Secrets 에 GEMINI_KEY 추가 (값은 대시보드에만 넣습니다)
//
// 안전장치 (문서 7장)
//   - AI 는 직접 쓰지 않습니다. 말만 하고, 저장은 사용자가 화면에서 합니다.
//   - 여행 자료는 부른 사람의 토큰으로 읽습니다. RLS 가 그대로 걸리므로
//     남의 여행 id 를 넣어도 아무것도 안 나옵니다.
//   - 사용량은 서비스 키로만 셉니다. 화면에서 건너뛸 수 없습니다.
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MODEL = 'gemini-3.6-flash';              // 도쿄 앱에서 쓰던 것과 같은 모델
const MODEL_FALLBACK = 'gemini-3.5-flash-lite'; // 한도(429)에 걸리면 가벼운 쪽으로

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  });

async function callGemini(model: string, key: string, contents: unknown) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',   // 제안을 카드로 만들려면 형식이 있어야 합니다
        },
      }),
    },
  );
  return { code: res.status, body: await res.text() };
}

/** 두 좌표 사이 거리(km). 이동 시간과 "너무 먼 좌표 버리기"에 씁니다. */
function distKm(a: number, b: number, c: number, d: number) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (c - a) * r, dLng = (d - b) * r;
  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const key = Deno.env.get('GEMINI_KEY');
    if (!key) return json({ error: 'GEMINI_KEY 가 설정되지 않았습니다.' }, 500);

    const auth = req.headers.get('Authorization') ?? '';
    if (!auth) return json({ error: '로그인이 필요합니다.' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    // 부른 사람의 토큰으로 읽습니다 — RLS 가 그대로 걸립니다.
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: '로그인이 필요합니다.' }, 401);

    const { trip_id, message } = await req.json().catch(() => ({}));
    if (!message || !String(message).trim())
      return json({ error: '물어볼 말을 적어주세요.' }, 400);

    // ── 사용량 ── 서비스 키로만. 화면에서 건너뛸 수 없습니다.
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: take, error: takeErr } =
      await admin.rpc('ai_take', { p_user: user.id, p_kind: 'chat' });
    if (takeErr) return json({ error: takeErr.message }, 500);
    if (!take?.ok)
      return json({
        error: `오늘 쓸 수 있는 횟수를 다 썼습니다 (${take?.used}/${take?.limit}회). ` +
               `내일 다시 열립니다.`,
        used: take?.used, limit: take?.limit,
      }, 429);

    // ── 여행 자료 ── 없으면 없는 대로 답합니다.
    let ctx = '';
    // 아래 안전장치에서도 씁니다 — 좌표가 구간 중심에서 먼지 봐야 하므로.
    // deno-lint-ignore no-explicit-any
    let legs: any[] = [];
    if (trip_id) {
      const { data: trip } = await asUser.from('trips')
        .select('title,destination,country,start_date,end_date,timezone,currency,' +
                'home_currency,walk_max_km,transit_factor,transit_base_min')
        .eq('id', trip_id).maybeSingle();

      if (trip) {
        // 여러 도시·나라를 도는 여행이면 구간마다 통화·시간대·이동방식이 다릅니다.
        // 이걸 안 주면 AI 가 여행 전체를 한 도시로 보고 답합니다.
        const legRes = await asUser.from('trip_legs')
          .select('destination,country,start_date,end_date,timezone,currency,' +
                  'center_lat,center_lng,walk_max_km,transit_factor,transit_base_min')
          .eq('trip_id', trip_id).order('start_date');
        legs = legRes.data ?? [];

        const { data: plans } = await asUser.from('plans')
          .select('date,start_time,end_time,category,title,memo')
          .eq('trip_id', trip_id).is('deleted_at', null)
          .order('date').order('start_time');
        const { data: exp } = await asUser.from('expenses')
          .select('date,title,amount,currency,category')
          .eq('trip_id', trip_id).is('deleted_at', null)
          .order('date', { ascending: false }).limit(30);

        ctx = [
          `[여행] ${trip.title}`,
          `기간 ${trip.start_date} ~ ${trip.end_date} · 정산 통화 ${trip.home_currency}`,
          '',
          '[구간] 언제 어디에 있는지. 날짜로 일정·지출이 여기 붙는다.',
          (legs ?? []).map((l) =>
            `- ${l.start_date}~${l.end_date} ${l.destination}(${l.country}) · ` +
            `${l.currency} · ${l.timezone} · 이동 어림 ${l.walk_max_km}km 미만 도보, ` +
            `그 위는 거리×${l.transit_factor}+${l.transit_base_min}분`).join('\n') ||
            `- ${trip.start_date}~${trip.end_date} ${trip.destination}(${trip.country})`,
          '',
          '[일정]',
          (plans ?? []).map((p) =>
            `- ${p.date} ${p.start_time?.slice(0, 5) ?? '시각미정'}` +
            `${p.end_time ? '~' + p.end_time.slice(0, 5) : ''} ` +
            `${p.title}${p.category ? ' (' + p.category + ')' : ''}` +
            `${p.memo ? ' — ' + p.memo : ''}`).join('\n') || '- (없음)',
          '',
          '[최근 지출]',
          (exp ?? []).map((e) =>
            `- ${e.date} ${e.title} ${e.amount}${e.currency}` +
            `${e.category ? ' (' + e.category + ')' : ''}`).join('\n') || '- (없음)',
        ].join('\n');
      }
    }

    const system = [
      '너는 여행 계획을 돕는 조수다. 한국어로, 짧고 구체적으로 답한다.',
      '',
      '규칙:',
      '- 자료에 없는 것을 지어내지 않는다. 모르면 모른다고 한다.',
      '- 특히 영업시간 · 휴무일 · 가격 · 평점은 확인한 것만 말하고,',
      '  아니면 "직접 확인이 필요합니다"라고 적는다.',
      '- 일정을 직접 고치지 않는다. 제안만 하고 사용자가 앱에서 넣게 한다.',
      '- 하루에 4~5개를 넘겨 채우지 않는다. 빈 시간을 남기는 편이 낫다.',
      '- 이동 시간을 무시하지 않는다. 그날이 속한 구간의 이동 어림값을 쓴다.',
      '- 도시가 여러 곳이면 그날 어느 구간인지 보고 답한다.',
      '  로마 일정에 피렌체 식당을 넣지 않는다.',
      '- 예약번호 · 주소 · 전화번호를 새로 지어내지 않는다.',
      '',
      '반드시 아래 JSON 하나만 낸다. 설명이나 코드블록을 덧붙이지 않는다.',
      '{',
      '  "reply": "사람에게 할 말. 마크다운 써도 된다.",',
      '  "places": [',
      '    { "name":"한국어 이름", "name_local":"현지 표기", "category":"식사|카페|관광|쇼핑|이동|숙소|기타",',
      '      "lat":숫자, "lng":숫자, "why":"한 줄 이유" }',
      '  ],',
      '  "actions": [',
      '    { "type":"add_plan", "date":"YYYY-MM-DD", "start_time":"HH:MM" 또는 null,',
      '      "title":"제목", "category":"위와 같음", "memo":"한 줄" 또는 null,',
      '      "lat":숫자 또는 null, "lng":숫자 또는 null }',
      '  ]',
      '}',
      '',
      'places · actions 규칙:',
      '- 단순히 묻는 말이면 places 와 actions 를 빈 배열로 둔다. 억지로 채우지 않는다.',
      '- 좌표는 아는 곳만 넣는다. 모르면 null 로 둔다. 지어낸 좌표는 넣지 않는다.',
      '- 날짜는 위 구간을 보고 그 도시에 맞는 날로 넣는다.',
      '- 한 번에 5개를 넘기지 않는다.',
      ctx ? '\n아래는 지금 이 여행의 자료다.\n' + ctx : '\n(선택된 여행이 없다.)',
    ].join('\n');

    const contents = [
      { role: 'user', parts: [{ text: system }] },
      { role: 'model', parts: [{ text: '알겠습니다. 자료를 보고 답하겠습니다.' }] },
      { role: 'user', parts: [{ text: String(message) }] },
    ];

    let r = await callGemini(MODEL, key, contents);
    if (r.code === 429) r = await callGemini(MODEL_FALLBACK, key, contents);
    if (r.code !== 200)
      return json({ error: `AI 가 응답하지 않았습니다 (${r.code}).` }, 502);

    const parsed = JSON.parse(r.body);
    const parts = parsed?.candidates?.[0]?.content?.parts ?? [];
    const raw = parts.map((p: { text?: string }) => p.text ?? '').join('').trim();
    if (!raw) {
      const why = parsed?.promptFeedback?.blockReason ??
                  parsed?.candidates?.[0]?.finishReason ?? '알 수 없음';
      return json({ error: `답을 받지 못했습니다 (${why}).` }, 502);
    }

    // JSON 을 못 받아도 말은 전합니다. 형식이 깨졌다고 답까지 버릴 이유는 없습니다.
    let out: { reply?: string; places?: unknown[]; actions?: unknown[] } = {};
    try { out = JSON.parse(raw); } catch { out = { reply: raw }; }

    // ── 안전장치 (문서 7장) ──
    // AI 는 직접 쓰지 않습니다. 여기서 걸러 카드로만 내보내고, 저장은 사용자가 합니다.
    const CATS = ['식사', '카페', '관광', '쇼핑', '이동', '숙소', '기타'];
    const inTrip = (d: string) =>
      typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);

    // 좌표가 구간 중심에서 너무 멀면 버립니다.
    // 도쿄를 물었는데 이탈리아 좌표가 오는 일이 실제로 있었습니다.
    const centers: number[][] = legs
      .filter((l) => l.center_lat != null && l.center_lng != null)
      .map((l) => [Number(l.center_lat), Number(l.center_lng)]);
    const nearOk = (lat: unknown, lng: unknown) => {
      if (typeof lat !== 'number' || typeof lng !== 'number') return false;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
      if (!centers.length) return true;              // 중심을 모르면 판단하지 않습니다
      return centers.some(([a, b]) => distKm(a, b, lat, lng) <= 120);
    };
    const coords = (o: Record<string, unknown>) =>
      nearOk(o.lat, o.lng) ? { lat: o.lat as number, lng: o.lng as number }
                           : { lat: null, lng: null };

    const places = (Array.isArray(out.places) ? out.places : [])
      .slice(0, 5)
      .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
      .map((p) => ({
        name: String(p.name ?? '').slice(0, 60),
        name_local: p.name_local ? String(p.name_local).slice(0, 60) : null,
        category: CATS.includes(String(p.category)) ? String(p.category) : null,
        why: p.why ? String(p.why).slice(0, 120) : null,
        ...coords(p),
      }))
      .filter((p) => p.name);

    const actions = (Array.isArray(out.actions) ? out.actions : [])
      .slice(0, 5)
      .filter((a): a is Record<string, unknown> => !!a && typeof a === 'object')
      .filter((a) => a.type === 'add_plan' && inTrip(String(a.date)))
      .map((a) => ({
        type: 'add_plan',
        date: String(a.date),
        start_time: /^\d{2}:\d{2}$/.test(String(a.start_time)) ? String(a.start_time) : null,
        title: String(a.title ?? '').slice(0, 60),
        category: CATS.includes(String(a.category)) ? String(a.category) : null,
        memo: a.memo ? String(a.memo).slice(0, 200) : null,
        ...coords(a),
      }))
      .filter((a) => a.title);

    return json({
      reply: String(out.reply ?? raw).slice(0, 4000),
      places, actions, used: take.used, limit: take.limit,
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
