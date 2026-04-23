import { getAuthProfile } from '@/lib/supabase/server'

/** layout·페이지가 같은 요청에서 공유하는 프로필 행 */
export type SessionProfileRow = {
  id: string
  name: string | null
  avatar: string | null
  role: string | null
  is_approved: boolean | null
  target_weight: number | null
  target_calories: number | null
}

/**
 * 대시보드 라우트에서 auth.getUser + profiles 한 번만 조회하도록 캐시.
 * server.ts의 getAuthProfile을 그대로 재사용하므로
 * layout ↔ page 사이에 중복 왕복이 발생하지 않는다.
 */
export const getDashboardSession = getAuthProfile
