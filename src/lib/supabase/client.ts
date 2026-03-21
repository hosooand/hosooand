import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * 브라우저: @supabase/ssr createBrowserClient — 서버(auth/callback, 미들웨어)가 설정한
 * Supabase Auth 쿠키와 동일한 저장소를 쓰므로 getSession()이 쿠키 세션을 읽습니다.
 * (순수 @supabase/supabase-js 만 쓰면 localStorage 위주라 콜백 이후 세션이 안 보임)
 *
 * 싱글톤 — Multiple GoTrueClient 방지
 *
 * 서버(RSC 등): 요청마다 새 클라이언트 (세션 공유 방지)
 */
let browserClient: SupabaseClient | null = null

export function createClient() {
  if (typeof window === 'undefined') {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    )
  }

  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }

  return browserClient
}
