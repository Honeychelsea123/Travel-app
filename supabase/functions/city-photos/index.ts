/**
 * 도시 사진 찾기 · 넣기. **한 번 쓰고 버리는 함수입니다.**
 *
 * 두 가지 일을 합니다.
 *   mode:'search'  사진이 없는 도시를 골라 Pexels 후보를 3장씩 찾아 **주소만** 돌려줍니다.
 *                  올리지 않습니다 — 사람이 눈으로 보고 고르는 것이 이 작업의 요점입니다.
 *   mode:'apply'   { id: 주소 } 로 고른 것만 받아 Storage 에 올리고 cities 를 갱신합니다.
 *
 * 왜 나눴나: 검색 결과가 그 도시가 맞는지 기계는 모릅니다. "Bishkek" 으로
 * 찾은 사진이 엉뚱한 곳이면 그것도 허위정보입니다. 그래서 고르는 일만은
 * 사람이 합니다.
 *
 * 키는 서버에만 둡니다(PEXELS_KEY). 화면에 두면 누구나 긁어갑니다.
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

    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } });
    const { data: isAdmin } = await asUser.rpc('is_admin');
    if (isAdmin !== true) return json({ error: '관리자만 쓸 수 있습니다.' }, 403);

    // 이름을 몇 가지로 넣어뒀을 수 있어 차례로 봅니다.
    const key = Deno.env.get('PEXELS_KEY') ?? Deno.env.get('PEXELS_API_KEY') ??
                Deno.env.get('PEXELS') ?? '';
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await req.json().catch(() => ({}));
    const mode = String(body?.mode ?? 'search');

    // ── 고른 것 넣기 ──
    if (mode === 'apply') {
      const picks: Record<string, string> = body?.picks ?? {};
      const done: string[] = [];
      const failed: { id: string; why: string }[] = [];
      for (const [id, src] of Object.entries(picks)) {
        try {
          const res = await fetch(src, { signal: AbortSignal.timeout(20000) });
          if (!res.ok) { failed.push({ id, why: `받기 ${res.status}` }); continue; }
          const type = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
          const buf = new Uint8Array(await res.arrayBuffer());
          if (!buf.length) { failed.push({ id, why: '빈 파일' }); continue; }
          const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
          const path = `${id}.${ext}`;
          const { error: upErr } = await admin.storage.from(BUCKET)
            .upload(path, buf, { contentType: type, upsert: true, cacheControl: '31536000' });
          if (upErr) { failed.push({ id, why: '올리기 ' + upErr.message }); continue; }
          // 주소를 바꾸는 것이 마지막입니다. 올리기가 실패했는데 주소만 바꾸면
          // 그 도시 사진이 영영 깨집니다.
          const { error: updErr } = await admin.from('cities')
            .update({ image_url: `${url}${MARK}${path}`, image_credit: body?.credits?.[id] ?? null })
            .eq('id', id).select('id');
          if (updErr) { failed.push({ id, why: '주소 갱신 ' + updErr.message }); continue; }
          done.push(id);
        } catch (e) {
          failed.push({ id, why: String((e as Error)?.message ?? e).slice(0, 80) });
        }
      }
      return json({ done: done.length, doneIds: done, failed });
    }

    // ── 후보 찾기 ──
    if (!key) return json({ error: 'PEXELS 키를 못 찾았습니다 (PEXELS_KEY).' }, 500);
    const limit = Math.min(Math.max(Number(body?.limit) || 12, 1), 30);
    const offset = Math.max(Number(body?.offset) || 0, 0);

    const { data: rows, error: selErr } = await admin
      .from('cities')
      .select('id,name,name_en,country')
      .is('image_url', null)
      .order('id')
      .range(offset, offset + limit - 1);
    if (selErr) return json({ error: selErr.message }, 500);

    /* **나라를 코드로 넣으면 안 됩니다.** 'Akita JP' 로 찾았더니 아키타견
       사진만 왔고, 'Angeles PH' 는 천사상이 왔습니다. 두 글자 코드는 검색어로
       아무 뜻이 없어서 도시명의 다른 뜻을 못 눌러줍니다.
       나라 이름을 붙이면 'Akita Japan' 이 되어 도시 쪽으로 기울어집니다. */
    const { data: ccRows } = await admin.from('countries').select('code,name_en');
    const ccName: Record<string, string> =
      Object.fromEntries((ccRows ?? []).map((x: any) => [x.code, x.name_en]));

    const out: unknown[] = [];
    for (const c of rows ?? []) {
      const q = `${c.name_en ?? c.id} ${ccName[c.country] ?? c.country}`;
      try {
        const r = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}` +
          `&per_page=3&orientation=landscape`,
          { headers: { Authorization: key }, signal: AbortSignal.timeout(15000) });
        if (!r.ok) { out.push({ id: c.id, ko: c.name, q, error: `pexels ${r.status}` }); continue; }
        const j = await r.json();
        out.push({
          id: c.id, ko: c.name, q,
          photos: (j.photos ?? []).map((p: any) => ({
            // large 는 가로 940 정도라 목록 썸네일과 상세 배경에 둘 다 씁니다.
            src: p.src?.large ?? p.src?.medium, by: p.photographer, page: p.url,
          })),
        });
      } catch (e) {
        out.push({ id: c.id, ko: c.name, q, error: String((e as Error)?.message ?? e).slice(0, 60) });
      }
    }
    const { count } = await admin.from('cities')
      .select('id', { count: 'exact', head: true }).is('image_url', null);
    return json({ cities: out, left: count ?? 0 });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
