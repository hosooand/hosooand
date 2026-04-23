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

  const [{ data: log }, { data: targets }] = await Promise.all([
    supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .single(),
    supabase
      .from('profiles')
      .select('target_weight, target_calories')
      .eq('id', user.id)
      .single(),
  ])

  return (
    <DiaryClient
      date={date}
      initialLog={log ?? null}
      profile={{
        name: profile?.name ?? '',
        target_weight: targets?.target_weight ?? null,
        target_calories: targets?.target_calories ?? null,
      }}
      userId={user.id}
    />
  )
}