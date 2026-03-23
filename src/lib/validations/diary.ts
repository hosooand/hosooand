import { z } from 'zod'

export const DailyLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다'),

  meal_image_url: z.string().url().nullable().optional(),

  meal_analysis: z.object({
    calories:    z.number().nonnegative(),
    carbs:       z.number().nonnegative(),
    protein:     z.number().nonnegative(),
    fat:         z.number().nonnegative(),
    fiber:       z.number().nonnegative(),
    sodium_mg:   z.number().nonnegative().optional(),
    sugar_g:     z.number().nonnegative().optional(),
    foods:       z.array(z.object({
      name:     z.string(),
      amount:   z.string(),
      calories: z.number(),
    })),
    feedback:    z.string(),
    analyzed_at: z.string(),
  }).nullable().optional(),

  water_intake: z.number().min(0).max(10).nullable().optional(),

  sleep_hours: z.number().min(0).max(24).nullable().optional(),

  steps: z.number().int().min(0).max(100000).nullable().optional(),

  exercise_logs: z.array(z.object({
    type:     z.string().min(1),
    duration: z.number().int().min(1).max(600),
    calories: z.number().nonnegative(),
  })).optional(),

  condition: z.union([
    z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)
  ]).nullable().optional(),

  memo: z.string().max(500).nullable().optional(),

  meal_text: z.string().max(500).nullable().optional(),
})

export type DailyLogFormValues = z.infer<typeof DailyLogSchema>