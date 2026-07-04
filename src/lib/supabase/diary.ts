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

// meal_entries(MealPanelEntry: meal_type/content/…)를 레거시 meals 컬럼
// (MealEntry: type/text/…) 형태로 변환. 한글 식사명은 영문 키로 매핑한다.
const MEAL_TYPE_TO_EN: Record<string, string> = {
  아침: 'breakfast',
  점심: 'lunch',
  저녁: 'dinner',
  간식: 'snack',
}

function toMealsColumn(rawEntries: unknown): Array<{
  type: string
  time: string | null
  image_url: string | null
  text: string | null
  analysis: unknown
}> {
  if (!Array.isArray(rawEntries)) return []
  return rawEntries
    .map((e) => {
      const entry = (e ?? {}) as {
        meal_type?: string
        type?: string
        time?: string | null
        image_url?: string | null
        content?: string | null
        text?: string | null
        analysis?: unknown
      }
      const rawType = entry.meal_type ?? entry.type ?? ''
      return {
        type: MEAL_TYPE_TO_EN[rawType] ?? rawType,
        time: entry.time ?? null,
        image_url: entry.image_url ?? null,
        text: entry.content ?? entry.text ?? null,
        analysis: entry.analysis ?? null,
      }
    })
    // 실제 데이터(텍스트·이미지·분석)가 있는 식사만 저장 (빈 슬롯 제외)
    .filter((m) => m.text || m.image_url || m.analysis)
}

export async function upsertDailyLog(
  values: DailyLogFormValues & { date: string; meal_entries?: unknown }
): Promise<DailyLog> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const { meal_entries, ...rest } = values as typeof values & { meal_entries?: unknown }
  const mealEntriesIsArray = Array.isArray(meal_entries)

  // 날짜는 절대 new Date() 로 재변환하지 않는다 — "YYYY-MM-DD" 문자열 그대로.
  const dateStr = values.date
  const dateIsValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)

  console.log('[upsertDailyLog] before upsert', {
    date: dateStr,
    dateType: typeof dateStr,
    dateIsValidFormat,
    kstToday: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }),
    utcToday: new Date().toISOString().split('T')[0],
    meal_entries_present: meal_entries !== undefined,
    meal_entries_type: meal_entries == null ? String(meal_entries) : typeof meal_entries,
    meal_entries_is_array: mealEntriesIsArray,
    meal_entries_length: mealEntriesIsArray ? meal_entries.length : null,
  })

  const payload = {
    ...rest,
    date: dateStr,
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
    console.error('[upsertDailyLog] upsert error', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      payload_date: dateStr,
    })
    throw new Error(error.message)
  }

  // 레거시 meals 컬럼 동기화 — best effort.
  // 컬럼이 존재하지 않는 환경에서 실패해도 이미 성공한 저장(meal_entries)은 유지한다.
  try {
    const meals = toMealsColumn(payload.meal_entries)
    const { error: mealsErr } = await supabase
      .from('daily_logs')
      .update({ meals })
      .eq('user_id', user.id)
      .eq('date', dateStr)
    if (mealsErr) {
      console.warn('[upsertDailyLog] meals 컬럼 동기화 건너뜀:', mealsErr.message)
    }
  } catch (e) {
    console.warn('[upsertDailyLog] meals 컬럼 동기화 예외:', e)
  }

  const returnedMealEntries = (data as unknown as { meal_entries?: unknown }).meal_entries
  const returnedMealEntriesIsArray = Array.isArray(returnedMealEntries)

  console.log('[upsertDailyLog] after upsert', {
    returned_meal_entries_present: returnedMealEntries !== undefined,
    returned_meal_entries_type:
      returnedMealEntries == null
        ? String(returnedMealEntries)
        : typeof returnedMealEntries,
    returned_meal_entries_is_array: returnedMealEntriesIsArray,
    returned_meal_entries_length: returnedMealEntriesIsArray
      ? returnedMealEntries.length
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