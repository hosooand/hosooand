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
 * Supabase가 권장하는 보안 패턴: 서버 컴포넌트에서는 getUser()로 JWT를 검증.
 * cache()로 감싸 같은 요청에서는 1회만 호출된다.
 */
export const getAuthProfile = cache(async () => {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { user: null, profile: null, supabase }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, avatar, role, is_approved')
    .eq('id', user.id)
    .single()

  return { user, profile, supabase }
})