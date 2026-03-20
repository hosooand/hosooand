import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminClient from './_components/AdminClient'
import { mealEntriesHasRecords } from '@/lib/meal-entries'

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
  has_recent_meal_entries?: boolean
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

  // members + notes는 서로 독립이므로 병렬 실행
  const [{ data: members, error: membersError }, { data: notesRaw, error: notesError }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, height, current_weight, avatar, created_at, member_number')
        .eq('role', 'member')
        .order('created_at', { ascending: false }),
      supabase
        .from('staff_notes')
        .select('id, member_id, staff_id, content, created_at, updated_at')
        .order('created_at', { ascending: false }),
    ])

  console.log('DB에서 조회한 고객 데이터:', members)
  console.log('고객 조회 에러:', membersError)
  console.log('DB에서 조회한 메모 데이터:', notesRaw)
  console.log('메모 조회 에러:', notesError)

  // 최근 30일 daily_logs 중 meal_entries가 있는 회원 표시용 (members 필요)
  const memberList = members ?? []
  const memberIds = memberList.map(m => m.id)
  const mealUserIds = new Set<string>()
  if (memberIds.length > 0) {
    const from = new Date()
    from.setDate(from.getDate() - 30)
    const fromStr = from.toLocaleDateString('en-CA')
    const { data: mealLogs } = await supabase
      .from('daily_logs')
      .select('user_id, meal_entries')
      .gte('date', fromStr)
      .in('user_id', memberIds)

    for (const row of mealLogs ?? []) {
      if (mealEntriesHasRecords(row.meal_entries)) mealUserIds.add(row.user_id)
    }
  }

  const membersWithMealFlag: Member[] = memberList.map(m => ({
    ...m,
    has_recent_meal_entries: mealUserIds.has(m.id),
  }))

  // staff 이름 매핑
  const notes: StaffNote[] = (notesRaw ?? []).map(note => ({
    ...note,
    staff: note.staff_id === profile.id
      ? { name: profile.name ?? '직원' }
      : null,
  }))

  return (
    <AdminClient
      members={membersWithMealFlag}
      staffId={profile.id}
      initialNotes={notes}
    />
  )
}