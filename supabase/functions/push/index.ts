/* 잠금화면 알림을 실제로 보내는 자리.
 *
 * **때가 되면 저절로 도는 일은 여기가 아닙니다.** 이 등급에는 pg_cron 이
 * 없어서(032·042 에 적어둔 것과 같은 사정) GitHub Actions 가 15분마다
 * 이 함수를 부릅니다 — `.github/workflows/push.yml`.
 *
 * 하는 일은 셋뿐입니다.
 *   1. `due_pushes()` 에게 "지금 보낼 것"을 묻는다 (시각 계산은 DB 가 한다)
 *   2. 그 사람의 기기들로 보낸다
 *   3. 보냈다고 적는다 (같은 것을 두 번 안 보내려고)
 *
 * **암호는 직접 안 짭니다.** Web Push 는 VAPID 서명(ES256)과 본문 암호화
 * (aes128gcm + ECDH + HKDF)를 요구하는데, 돈이나 알림이나 직접 짠 암호가
 * 조용히 틀리면 알 방법이 없습니다. 검증된 것을 씁니다.
 */
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const URL_  = Deno.env.get('SUPABASE_URL')!;
const SRV   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUB   = Deno.env.get('VAPID_PUBLIC')!;
const PRIV  = Deno.env.get('VAPID_PRIVATE')!;
/* mailto: 는 Web Push 규격이 요구합니다. 보내는 쪽에 문제가 있을 때
   푸시 서비스가 연락할 곳입니다. */
const CONTACT = Deno.env.get('VAPID_CONTACT') || 'mailto:noreply@example.com';

const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  /* 아무나 부르면 알림을 마구 쏠 수 있습니다. 서비스 키를 요구합니다 —
     이 함수는 사람이 아니라 스케줄러가 부릅니다. */
  const auth = req.headers.get('authorization') || '';
  if (!auth.includes(SRV)) return json({ error: 'forbidden' }, 403);

  const sb = createClient(URL_, SRV);
  webpush.setVapidDetails(CONTACT, PUB, PRIV);

  const { data: due, error } = await sb.rpc('due_pushes');
  if (error){ console.error('due_pushes', error); return json({ error: error.message }, 500); }
  if (!due?.length) return json({ sent: 0, due: 0 });

  /* 사람마다 기기가 여럿입니다. 한 번에 받아서 나눠 씁니다 —
     보낼 것마다 물으면 같은 질의를 수십 번 합니다. */
  const users = [...new Set(due.map((d: any) => d.user_id))];
  const { data: subs } = await sb.from('push_subs')
    .select('user_id,endpoint,p256dh,auth').in('user_id', users);

  const byUser = new Map<string, any[]>();
  for (const s of subs || []){
    if (!byUser.has(s.user_id)) byUser.set(s.user_id, []);
    byUser.get(s.user_id)!.push(s);
  }

  let sent = 0, dead = 0;
  const gone: string[] = [];

  for (const d of due as any[]){
    const mine = byUser.get(d.user_id) || [];
    if (!mine.length) continue;          /* 켜둔 기기가 없으면 보낼 곳이 없습니다 */

    const payload = JSON.stringify({
      title: d.title, body: d.body, url: d.url || '/',
      /* 같은 일정 알림이 겹치면 덮어씁니다. 기기 하나에 두 장이 쌓이면 안 됩니다. */
      tag: `${d.kind}:${d.ref_id}`,
    });

    let any = false;
    for (const s of mine){
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
        sent++; any = true;
      } catch (e: any){
        /* 404·410 은 **그 기기가 사라졌다**는 뜻입니다(앱 삭제·기기 초기화).
           지우지 않으면 15분마다 영원히 실패합니다. */
        if (e?.statusCode === 404 || e?.statusCode === 410){ gone.push(s.endpoint); dead++; }
        else console.error('send', e?.statusCode, e?.body || e?.message);
      }
    }

    /* **한 기기라도 갔을 때만 적습니다.** 다 실패했는데 적어버리면
       다음 차례에 다시 시도할 기회가 사라집니다. */
    if (any){
      const r = await sb.from('push_log')
        .insert({ user_id: d.user_id, kind: d.kind, ref_id: d.ref_id });
      if (r.error) console.error('log', r.error.message);
    }
  }

  if (gone.length) await sb.from('push_subs').delete().in('endpoint', gone);

  return json({ due: due.length, sent, dead });
});
