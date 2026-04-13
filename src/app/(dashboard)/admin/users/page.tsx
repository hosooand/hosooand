import { createAdminClient } from '@/lib/supabase/admin-client'
import { redirect } from 'next/navigation'
import { getDashboardSession } from '@/lib/auth/session-profile'
import AdminUsersClient from './_components/AdminUsersClient'

export interface PendingUser {
  id:            string
  name:          string
  member_number: string | null
  created_at:    string
}

export default async function AdminUsersPage() {
  const { user, profile } = await getDashboardSession()
  if (!user) redirect('/login')
  if (profile?.role !== 'admin') redirect('/select-service')

  // 미승인 staff 목록 — service role로 조회 (RLS가 타인 프로필 SELECT를 막는 경우 대비)
  const adminSb = createAdminClient()
  const { data: pending } = await adminSb
    .from('profiles')
    .select('id, name, member_number, created_at')
    .eq('role', 'staff')
    .or('is_approved.eq.false,is_approved.is.null')
    .order('created_at', { ascending: false })

  const { data: approved } = await adminSb
    .from('profiles')
    .select('id, name, member_number, created_at')
    .eq('role', 'staff')
    .eq('is_approved', true)
    .order('created_at', { ascending: false })

  return (
    <AdminUsersClient
      initialPending={(pending ?? []) as PendingUser[]}
      initialApproved={(approved ?? []) as PendingUser[]}
    />
  )
}
