import { createClient } from '@/lib/supabase/client'
import type { DailyLog, DailyLogSummary } from '@/types/diary'
import type { DailyLogFormValues } from '@/lib/validations/diary'

export async function getDailyLog(date: string): Promise<DailyLog | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('date', date)
    .single()

  if (error?.code === 'PGRST116') return null
  if (error) throw new Error(error.message)
  return data
}

export async function getDailyLogSummaries(days = 30): Promise<DailyLogSummary[]> {
  const supabase = createClient()
  const from = new Date()
  from.setDate(from.getDate() - days)

  const { data, error } = await supabase
    .from('daily_logs')
    .select('date, meal_analysis, water_intake, sleep_hours, steps, condition')
    .gte('date', from.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (error) throw new Error(error.message)

  return (data ?? []).map(row => ({
    date:         row.date,
    calories:     row.meal_analysis?.calories ?? null,
    water_intake: row.water_intake,
    sleep_hours:  row.sleep_hours,
    steps:        row.steps,
    condition:    row.condition,
  }))
}

export async function upsertDailyLog(
  values: DailyLogFormValues & { date: string; meal_entries?: unknown }
): Promise<DailyLog> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const { data, error } = await supabase
    .from('daily_logs')
    .upsert(
      { ...values, user_id: user.id },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateMealAnalysis(
  date: string,
  imageUrl: string,
  analysis: DailyLog['meal_analysis']
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const { error } = await supabase
    .from('daily_logs')
    .upsert(
      { user_id: user.id, date, meal_image_url: imageUrl, meal_analysis: analysis },
      { onConflict: 'user_id,date' }
    )

  if (error) throw new Error(error.message)
}