import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getDashboardSession } from '@/lib/auth/session-profile'
import DashboardShell from './_components/DashboardShell'
import NavWrapper from '@/components/shared/NavWrapper'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await getDashboardSession()
  if (!user) redirect('/login')
  if (profile?.role === 'staff' && profile.is_approved !== true) {
    redirect('/login')
  }

  const showAdminNav =
    profile?.role === 'admin' || (profile?.role === 'staff' && profile?.is_approved === true)

  return (
    <DashboardShell
      profile={profile}
      userId={user.id}
      footerNav={
        <NavWrapper
          role={profile?.role ?? 'member'}
          showAdminNav={showAdminNav}
        />
      }
    >
      <div className="mx-auto w-full max-w-2xl">
        {children}
      </div>
    </DashboardShell>
  )
}
