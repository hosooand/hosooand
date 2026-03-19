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

  // 미승인 staff 목록 (최초 1회 승인 후 자유 로그인)
  const { data: pending } = await supabase
    .from('profiles')
    .select('id, name, member_number, created_at')
    .eq('is_approved', false)
    .eq('role', 'staff')
    .order('created_at', { ascending: false })

  return <AdminUsersClient initialUsers={(pending ?? []) as PendingUser[]} />
}
