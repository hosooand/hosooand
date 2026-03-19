import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminClient from './_components/AdminClient'

interface StaffNote {
  id:         string
  member_id:  string
  staff_id:   string
  content:    string
  created_at: string
  updated_at: string
  staff:      { name: string } | null
}

interface Member {
  id:             string
  name:           string
  height:         number | null
  current_weight: number | null
  avatar:         string | null
  created_at:     string
  member_number:  string | null
}

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_approved, id, name')
    .eq('id', user.id)
    .single()

  const allowed =
    profile?.role === 'admin' || (profile?.role === 'staff' && profile?.is_approved === true)
  if (!allowed) redirect('/dashboard')

  // 고객 목록 조회
  const { data: members, error: membersError } = await supabase
    .from('profiles')
    .select('id, name, height, current_weight, avatar, created_at, member_number')
    .eq('role', 'member')
    .order('created_at', { ascending: false })

  console.log('DB에서 조회한 고객 데이터:', members)
  console.log('고객 조회 에러:', membersError)

  // 메모 조회 — foreign key join 없이 단순 조회
  const { data: notesRaw, error: notesError } = await supabase
    .from('staff_notes')
    .select('id, member_id, staff_id, content, created_at, updated_at')
    .order('created_at', { ascending: false })

  console.log('DB에서 조회한 메모 데이터:', notesRaw)
  console.log('메모 조회 에러:', notesError)

  // staff 이름 매핑
  const notes: StaffNote[] = (notesRaw ?? []).map(note => ({
    ...note,
    staff: note.staff_id === profile.id
      ? { name: profile.name ?? '직원' }
      : null,
  }))

  return (
    <AdminClient
      members={(members ?? []) as Member[]}
      staffId={profile.id}
      initialNotes={notes}
    />
  )
}