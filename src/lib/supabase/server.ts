import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(toSet) {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서 호출 시 무시
          }
        },
      },
    },
  )
}

/**
 * 같은 요청(렌더링 사이클) 내에서 auth + profile을 1번만 조회.
 * layout → page 간 중복 왕복을 제거한다.
 *
 * 성능: getSession()은 쿠키 디코드만 수행(0~1ms).
 * 보안: 데이터 접근은 RLS가 JWT를 재검증하므로 user.id를 신뢰해도 안전.
 *       (proxy에서도 이미 동일하게 검증된 후 전달됨)
 */
export const getAuthProfile = cache(async () => {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) return { user: null, profile: null, supabase }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, avatar, role, is_approved')
    .eq('id', user.id)
    .single()

  return { user, profile, supabase }
})