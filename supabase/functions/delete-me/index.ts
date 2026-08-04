// =====================================================================
// 탈퇴 — Supabase Edge Function
//
// 왜 서버가 필요한가
//   계정(auth.users) 자체를 지우는 것은 서비스 키로만 됩니다.
//   그 키는 화면에 두면 안 됩니다 — 공개 저장소에 그대로 올라가고,
//   가진 사람은 남의 계정도 지울 수 있습니다.
//   그래서 여기서만 씁니다. 그리고 **부른 사람 본인만** 지웁니다.
//
// 올리는 법 (CLI 없이 대시보드에서)
//   1. Supabase → Edge Functions → Deploy a new function → 이름 delete-me
//   2. 이 파일 내용을 그대로 붙여넣고 Deploy
//   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 는 자동으로 들어 있습니다)
//
// 순서가 중요합니다
//   1) 앱 자료 먼저 (delete_my_data) — 계정을 먼저 지우면 외래키에 걸려 실패합니다
//   2) 그 다음 계정
//   1)만 되고 2)가 실패하면 자료는 지워지고 계정만 남습니다.
//   그 경우를 숨기지 않고 그대로 알려줍니다 — 다시 누르면 이어서 됩니다.
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth) return json({ error: '로그인이 필요합니다.' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;

    // 누가 부른 것인지 그 사람의 토큰으로 확인합니다.
    // 이 한 줄이 "남의 계정 지우기"를 막습니다.
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: '로그인이 필요합니다.' }, 401);

    // 한 번 더 확인합니다. 화면이 실수로 불러도 그냥은 안 지워집니다.
    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== 'DELETE')
      return json({ error: '확인 값이 없습니다.' }, 400);

    // ── 1. 앱 자료 ── 부른 사람의 토큰으로 돕니다.
    // 함수 안에서 auth.uid() 로 본인 것만 건드립니다 (036).
    const { data: summary, error: dataErr } = await asUser.rpc('delete_my_data');
    if (dataErr) return json({ error: '자료를 지우지 못했습니다: ' + dataErr.message }, 500);

    // ── 2. 계정 ── 여기서만 서비스 키를 씁니다.
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { error: authErr } = await admin.auth.admin.deleteUser(user.id);
    if (authErr)
      return json({
        error: '자료는 지웠는데 계정이 남았습니다: ' + authErr.message,
        partial: true, summary,
      }, 500);

    return json({ ok: true, summary });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
