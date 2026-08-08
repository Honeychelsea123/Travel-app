/* ── Supabase 연결 ─────────────────────────────────────────────────────
 * publishable 키는 브라우저에 있어도 됩니다. RLS 가 지킵니다.
 * (secret / service_role 키는 절대 여기 두지 않습니다 — RLS 를 통째로 무시합니다.)
 *
 * 저장 키에 t2 를 붙입니다. 도쿄 앱과 같은 github.io 도메인이라
 * localStorage 를 공유하기 때문입니다. 겹치면 여행 중에 터집니다.
 *
 * app.js 에 있던 것을 여기로 옮겼습니다. admin.js 도 sb 가 필요한데,
 * app.js 에서 가져오면 admin → app → admin 으로 고리가 생깁니다.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://qahqqhjleqfrsjiixnas.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ymbrt_00OqzQjT3SrweZgQ_Lu0cw64V';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storageKey:'t2-auth', persistSession:true, autoRefreshToken:true,
          detectSessionInUrl:true }
});
