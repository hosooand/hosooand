/**
 * daily_logs.meal_entries 컬럼이 jsonb 배열 또는 JSON 문자열로 올 수 있음.
 * 최근 30일 "식단 기록 있음" 판별에 사용.
 */
export function mealEntriesHasRecords(raw: unknown): boolean {
  if (raw == null) return false
  if (Array.isArray(raw)) return raw.length > 0
  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s) return false
    try {
      const p = JSON.parse(s) as unknown
      return Array.isArray(p) && p.length > 0
    } catch {
      return false
    }
  }
  return false
}
