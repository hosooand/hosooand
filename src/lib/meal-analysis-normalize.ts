import type { MealAnalysis } from '@/types/diary'

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

function optNum(v: unknown): number | undefined {
  if (v == null || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

/** Gemini 등에서 온 임의 JSON을 MealAnalysis 형태로 맞춤 */
export function normalizeMealAnalysis(raw: Record<string, unknown>): MealAnalysis {
  const foodsRaw = Array.isArray(raw.foods) ? raw.foods : []
  const foods = foodsRaw.map((item: unknown) => {
    const o = item as Record<string, unknown>
    return {
      name:     String(o.name ?? ''),
      amount:   String(o.amount ?? ''),
      calories: num(o.calories, 0),
    }
  })
  const sumFromFoods = foods.reduce((s, f) => s + f.calories, 0)
  const calories = sumFromFoods > 0 ? sumFromFoods : num(raw.calories, 0)

  return {
    calories,
    carbs:       num(raw.carbs, 0),
    protein:     num(raw.protein, 0),
    fat:         num(raw.fat, 0),
    fiber:       num(raw.fiber, 0),
    sodium_mg:   optNum(raw.sodium_mg),
    sugar_g:     optNum(raw.sugar_g),
    foods,
    feedback:    String(raw.feedback ?? ''),
    analyzed_at: String(raw.analyzed_at ?? new Date().toISOString()),
  }
}
