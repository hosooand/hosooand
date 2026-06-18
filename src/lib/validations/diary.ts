import { z } from 'zod'

export const DailyLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다'),

  // 레거시 데이터에서 빈 문자열('')이 저장된 경우가 있어 허용한다(저장 직전 null로 정규화).
  // (빈 문자열은 z.string().url() 검증을 통과하지 못해 저장이 조용히 막히던 원인)
  meal_image_url: z
    .union([z.string().url(), z.literal('')])
    .nullable()
    .optional(),

  // 과거에 저장된 분석 결과는 일부 필드가 비어있을 수 있으므로 관대하게 처리한다.
  // (필수로 두면 오래된 기록이 있는 날짜에서 저장이 조용히 실패함)
  meal_analysis: z.object({
    calories:    z.number().nonnegative(),
    carbs:       z.number().nonnegative().optional(),
    protein:     z.number().nonnegative().optional(),
    fat:         z.number().nonnegative().optional(),
    fiber:       z.number().nonnegative().optional(),
    sodium_mg:   z.number().nonnegative().optional(),
    sugar_g:     z.number().nonnegative().optional(),
    foods:       z.array(z.object({
      name:     z.string(),
      amount:   z.string().optional(),
      calories: z.number(),
    })).optional(),
    feedback:    z.string().optional(),
    analyzed_at: z.string().optional(),
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