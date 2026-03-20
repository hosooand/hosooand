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

  const { meal_entries, ...rest } = values as typeof values & { meal_entries?: unknown }
  const mealEntriesIsArray = Array.isArray(meal_entries)

  console.log('[upsertDailyLog] before upsert', {
    date: values.date,
    meal_entries_present: meal_entries !== undefined,
    meal_entries_type: meal_entries == null ? String(meal_entries) : typeof meal_entries,
    meal_entries_is_array: mealEntriesIsArray,
    meal_entries_length: mealEntriesIsArray ? meal_entries.length : null,
  })

  const payload = {
    ...rest,
    meal_entries: meal_entries ?? [],
    user_id: user.id,
  }

  const { data, error } = await supabase
    .from('daily_logs')
    .upsert(
      payload,
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()

  if (error) {
    console.error('[upsertDailyLog] upsert error', { message: error.message, details: error })
    throw new Error(error.message)
  }

  console.log('[upsertDailyLog] after upsert', {
    returned_meal_entries_present: (data as unknown as { meal_entries?: unknown }).meal_entries !== undefined,
    returned_meal_entries_type:
      (data as unknown as { meal_entries?: unknown }).meal_entries == null
        ? String((data as unknown as { meal_entries?: unknown }).meal_entries)
        : typeof (data as unknown as { meal_entries?: unknown }).meal_entries,
    returned_meal_entries_is_array: Array.isArray((data as unknown as { meal_entries?: unknown }).meal_entries),
    returned_meal_entries_length: Array.isArray((data as unknown as { meal_entries?: unknown }).meal_entries)
      ? (data as unknown as { meal_entries?: unknown }).meal_entries?.length ?? null
      : null,
  })
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