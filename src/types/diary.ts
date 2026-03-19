export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface MealEntry {
  type:       MealType
  time:       string | null   // "08:30" 형식
  image_url:  string | null
  text:       string | null
  analysis:   MealAnalysis | null
}
export type Condition = 1 | 2 | 3 | 4 | 5

export interface MealAnalysis {
  calories:    number
  carbs:       number
  protein:     number
  fat:         number
  fiber:       number
  foods:       FoodItem[]
  feedback:    string
  analyzed_at: string
}

export interface FoodItem {
  name:     string
  amount:   string
  calories: number
}

export interface ExerciseLog {
  type:     string
  duration: number
  calories: number
}

export interface DailyLog {
  id:              string
  user_id:         string
  date:            string
  meal_image_url:  string | null   // 기존 호환용
  meal_analysis:   MealAnalysis | null
  meals:           MealEntry[]     // ← 추가
  water_intake:    number | null
  sleep_hours:     number | null
  steps:           number | null
  exercise_logs:   ExerciseLog[]
  condition:       Condition | null
  memo:            string | null
  created_at:      string
  updated_at:      string
}

export type DailyLogInput = Omit<DailyLog,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>

export interface DailyLogSummary {
  date:         string
  calories:     number | null
  water_intake: number | null
  sleep_hours:  number | null
  steps:        number | null
  condition:    Condition | null
}