import { getDashboardSession } from '@/lib/auth/session-profile'
import { redirect } from 'next/navigation'
import DiaryClient from './_components/DiaryClient'

interface Props {
  searchParams: Promise<{ date?: string }>
}

export default async function DiaryPage({ searchParams }: Props) {
  const [{ user, profile, supabase }, params] = await Promise.all([
    getDashboardSession(),
    searchParams,
  ])
  if (!user) redirect('/login')

  const date = params.date ?? new Date().toLocaleDateString('en-CA')

  const { data: log } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .single()

  return (
    <DiaryClient
      date={date}
      initialLog={log ?? null}
      profile={profile ?? { name: '', target_weight: null, target_calories: null }}
      userId={user.id}
    />
  )
}