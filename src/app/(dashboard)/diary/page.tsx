import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DiaryClient from './_components/DiaryClient'

interface Props {
  searchParams: Promise<{ date?: string }>
}

export default async function DiaryPage({ searchParams }: Props) {
  const supabase = await createServerSupabaseClient()
  const [{ data: { user } }, params] = await Promise.all([
    supabase.auth.getUser(),
    searchParams,
  ])
  if (!user) redirect('/login')

  const date = params.date ?? new Date().toLocaleDateString('en-CA')

  // date 기반 log + profile은 서로 독립이므로 병렬 실행
  const [{ data: log }, { data: profile }] = await Promise.all([
    supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .single(),
    supabase
      .from('profiles')
      .select('name, target_weight, target_calories')
      .eq('id', user.id)
      .single(),
  ])

  return (
    <DiaryClient
      date={date}
      initialLog={log ?? null}
      profile={profile ?? { name: '', target_weight: null, target_calories: null }}
      userId={user.id}
    />
  )
}