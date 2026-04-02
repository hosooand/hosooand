import type { ReactNode } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardShell from './_components/DashboardShell'
import NavWrapper from '@/components/shared/NavWrapper'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('name, avatar, role, is_approved')
    .eq('id', user.id)
    .single()

  console.log('[dashboard layout] profile', { profile, profileError: profileError?.message, userId: user.id })

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
