import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import SelectServiceClient from './SelectServiceClient'

export default async function SelectServicePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role, is_approved')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'staff' && profile.is_approved !== true) {
    redirect('/login')
  }

  return (
    <SelectServiceClient
      profile={{
        name: profile?.name ?? '',
        role: profile?.role ?? 'member',
      }}
    />
  )
}
