import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * 브라우저 전용 클라이언트.
 * @supabase/ssr 의 createBrowserClient 는 flowType 을 항상 pkce 로 덮어써서,
 * 크로스 브라우저 비밀번호 재설정(코드 검증기 없음)을 위해 implicit 을 사용합니다.
 */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'implicit',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  )
}