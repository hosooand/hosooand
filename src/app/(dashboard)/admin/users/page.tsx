import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminUsersClient from './_components/AdminUsersClient'

export interface PendingUser {
  id:            string
  name:          string
  member_number: string | null
  created_at:    string
}

export default async function AdminUsersPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // admin 권한 재확인
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (me?.role !== 'admin') redirect('/dashboard')

  // 미승인 회원 목록
  const { data: pending } = await supabase
    .from('profiles')
    .select('id, name, member_number, created_at')
    .eq('is_approved', false)
    .eq('role', 'member')
    .order('created_at', { ascending: false })

  return <AdminUsersClient initialUsers={(pending ?? []) as PendingUser[]} />
}
