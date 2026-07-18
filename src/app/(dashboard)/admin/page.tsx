import { redirect } from 'next/navigation'
import { getDashboardSession } from '@/lib/auth/session-profile'
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
  id:               string
  name:             string
  height:           number | null
  current_weight:   number | null
  avatar:           string | null
  created_at:       string
  member_number:    string | null
  target_calories?: number | null
  has_recent_meal_entries?: boolean
}

export default async function AdminPage() {
  const { user, profile, supabase } = await getDashboardSession()
  if (!user) redirect('/login')

  const allowed =
    profile?.role === 'admin' || (profile?.role === 'staff' && profile?.is_approved === true)
  if (!allowed || !profile) redirect('/select-service')

  const from = new Date()
  from.setDate(from.getDate() - 30)
  const fromStr = from.toLocaleDateString('en-CA')

  // members와 notes는 서로 독립적이라 병렬 실행. meal_logs는 memberIds가 필요해 이후 조회.
  const [membersResult, notesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, height, current_weight, avatar, created_at, member_number, target_calories')
      .eq('role', 'member')
      .order('created_at', { ascending: false }),
    supabase
      .from('staff_notes')
      .select('id, member_id, staff_id, content, created_at, updated_at')
      .order('created_at', { ascending: false }),
  ])

  const { data: members } = membersResult
  const { data: notesRaw } = notesResult

  const memberList = members ?? []
  const memberIds = memberList.map(m => m.id)

  const { data: mealLogs } =
    memberIds.length > 0
      ? await supabase
          .from('daily_logs')
          .select('user_id, meal_entries')
          .gte('date', fromStr)
          .in('user_id', memberIds)
      : { data: null as { user_id: string; meal_entries: unknown }[] | null }

  const mealUserIds = new Set<string>()
  for (const row of mealLogs ?? []) {
    if (mealEntriesHasRecords(row.meal_entries)) mealUserIds.add(row.user_id)
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
      viewerRole={profile.role ?? undefined}
    />
  )
}