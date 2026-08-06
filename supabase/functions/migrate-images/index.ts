/**
 * 도시 사진을 우리 Storage 로 옮깁니다. **한 번 쓰고 버리는 함수입니다.**
 *
 * 왜 서버에서 하나: 브라우저에서 하면 Pexels 이미지를 가져올 때 CORS 에 막히고,
 * Storage 에 쓰려면 service_role 이 필요한데 그 키를 화면에 둘 수는 없습니다.
 *
 * 왜 조금씩 하나: 300장을 한 번에 받으면 함수 시간 제한에 걸립니다.
 * 한 번에 limit 개씩 옮기고 **남은 수를 돌려줍니다.** 부르는 쪽이 0 이 될
 * 때까지 반복하면 됩니다. 이미 옮긴 것은 건드리지 않으므로 몇 번을 불러도
 * 안전합니다.
 *
 * db/048 을 먼저 실행해 버킷을 만들어야 합니다.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

const BUCKET = 'city-images';
const MARK = `/storage/v1/object/public/${BUCKET}/`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth) return json({ error: '로그인이 필요합니다.' }, 401);

    // **관리자만.** 이 함수는 남의 자료를 건드리지는 않지만, 아무나 불러
    // 300번씩 돌리게 두면 그 자체가 비용입니다.
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } });
    const { data: isAdmin } = await asUser.rpc('is_admin');
    if (isAdmin !== true) return json({ error: '관리자만 쓸 수 있습니다.' }, 403);

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body?.limit) || 15, 1), 40);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // 아직 바깥에 있는 것만 고릅니다.
    const { data: rows, error: selErr } = await admin
      .from('cities')
      .select('id,image_url')
      .not('image_url', 'is', null)
      .not('image_url', 'like', `%${MARK}%`)
      .limit(limit);
    if (selErr) return json({ error: selErr.message }, 500);

    const moved: string[] = [];
    const failed: { id: string; why: string }[] = [];

    for (const row of rows ?? []) {
      const id = String(row.id);
      try {
        const res = await fetch(String(row.image_url), {
          headers: { 'user-agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) { failed.push({ id, why: `받기 ${res.status}` }); continue; }

        const type = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) {
          failed.push({ id, why: `형식 ${type}` }); continue;
        }
        const buf = new Uint8Array(await res.arrayBuffer());
        if (!buf.length) { failed.push({ id, why: '빈 파일' }); continue; }

        const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
        const path = `${id}.${ext}`;
        // upsert: 다시 돌려도 덮어씁니다. 중간에 끊겨도 이어서 하면 됩니다.
        const { error: upErr } = await admin.storage.from(BUCKET)
          .upload(path, buf, { contentType: type, upsert: true, cacheControl: '31536000' });
        if (upErr) { failed.push({ id, why: '올리기 ' + upErr.message }); continue; }

        const pub = `${url}${MARK}${path}`;
        // **주소를 바꾸는 것이 마지막입니다.** 올리기가 실패했는데 주소만
        // 바꾸면 그 도시 사진이 영영 깨집니다.
        const { error: updErr } = await admin.from('cities')
          .update({ image_url: pub }).eq('id', id).select('id');
        if (updErr) { failed.push({ id, why: '주소 갱신 ' + updErr.message }); continue; }

        moved.push(id);
      } catch (e) {
        failed.push({ id, why: String((e as Error)?.message ?? e).slice(0, 80) });
      }
    }

    // 남은 수를 세어 돌려줍니다. 부르는 쪽은 이게 0 이 될 때까지 반복합니다.
    const { count } = await admin
      .from('cities')
      .select('id', { count: 'exact', head: true })
      .not('image_url', 'is', null)
      .not('image_url', 'like', `%${MARK}%`);

    return json({ moved: moved.length, movedIds: moved, failed, left: count ?? 0 });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
