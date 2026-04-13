import { cache } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/** layout·페이지가 같은 요청에서 공유하는 프로필 행 */
export type SessionProfileRow = {
  id: string
  name: string | null
  avatar: string | null
  role: string | null
  is_approved: boolean | null
}

/**
 * 대시보드 라우트에서 auth.getUser + profiles 한 번만 조회하도록 캐시.
 * (middleware에서는 호출하지 않음)
 */
export const getDashboardSession = cache(async () => {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { user: null, profile: null as SessionProfileRow | null, supabase }
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, avatar, role, is_approved')
    .eq('id', user.id)
    .single()

  return {
    user,
    profile: profile as SessionProfileRow | null,
    supabase,
  }
})
