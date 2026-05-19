'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { DashboardProfile } from './DashboardShell'

interface DashboardSession {
  userId: string
  profile: DashboardProfile | null
}

const Ctx = createContext<DashboardSession | null>(null)

export function DashboardSessionProvider({
  value,
  children,
}: {
  value: DashboardSession
  children: ReactNode
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/**
 * (dashboard) 레이아웃이 SSR로 가져온 user/profile을 클라이언트에서 동기적으로 사용.
 * — 페이지가 마운트되면서 추가로 auth.getUser() 또는 profiles.role 쿼리를 할 필요 없음.
 */
export function useDashboardSession(): DashboardSession {
  const v = useContext(Ctx)
  if (!v) {
    throw new Error(
      'useDashboardSession must be used inside (dashboard) layout (DashboardSessionProvider)'
    )
  }
  return v
}
