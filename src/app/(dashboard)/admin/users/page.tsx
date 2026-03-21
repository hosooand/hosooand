import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
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

  // 미승인 staff 목록 — service role로 조회 (RLS가 타인 프로필 SELECT를 막는 경우 대비)
  const adminSb = createAdminClient()
  const { data: pending } = await adminSb
    .from('profiles')
    .select('id, name, member_number, created_at')
    .eq('role', 'staff')
    .or('is_approved.eq.false,is_approved.is.null')
    .order('created_at', { ascending: false })

  return <AdminUsersClient initialUsers={(pending ?? []) as PendingUser[]} />
}
