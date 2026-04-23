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
 * proxy.ts가 매 요청마다 auth.getUser()로 JWT를 검증·갱신하므로
 * 서버 컴포넌트에서는 getSession()으로 로컬 쿠키만 읽으면 충분하다.
 * → Supabase Auth 서버 왕복 1회 절약
 */
export const getAuthProfile = cache(async () => {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) return { user: null, profile: null, supabase }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, avatar, role, is_approved, target_weight, target_calories')
    .eq('id', user.id)
    .single()

  return { user, profile, supabase }
})