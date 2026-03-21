import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

const authOptions = {
  flowType: 'implicit' as const,
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
}

/**
 * 브라우저: 싱글톤 — "Multiple GoTrueClient instances detected" 방지
 * 서버(RSC 등): 매 호출 새 클라이언트 — 요청 간 세션 공유 방지
 *
 * @supabase/ssr 의 createBrowserClient 는 flowType 을 항상 pkce 로 덮어써서
 * 크로스 브라우저 비밀번호 재설정에는 @supabase/supabase-js + implicit 을 사용합니다.
 */
let browserClient: SupabaseClient | null = null

export function createClient() {
  if (typeof window === 'undefined') {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: authOptions },
    )
  }

  if (!browserClient) {
    browserClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: authOptions },
    )
  }

  return browserClient
}
