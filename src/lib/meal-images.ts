export const MAX_MEAL_IMAGES = 2

export type MealImageFields = {
  image_url?: string | null
  image_url_2?: string | null
  image_urls?: unknown
}

function isNonEmptyUrl(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** 기존 1장(image_url) + 신규 2장(image_url_2 / image_urls) 모두 읽기 */
export function getMealImageUrls(entry: MealImageFields | null | undefined): string[] {
  if (!entry) return []
  if (Array.isArray(entry.image_urls)) {
    const fromArray = entry.image_urls.filter(isNonEmptyUrl).slice(0, MAX_MEAL_IMAGES)
    if (fromArray.length > 0) return fromArray
  }
  return [entry.image_url, entry.image_url_2].filter(isNonEmptyUrl).slice(0, MAX_MEAL_IMAGES)
}

export function applyMealImageUrls<T extends MealImageFields>(entry: T, urls: string[]): T {
  const next = urls.filter(isNonEmptyUrl).slice(0, MAX_MEAL_IMAGES)
  return {
    ...entry,
    image_url: next[0] ?? null,
    image_url_2: next[1] ?? null,
  }
}
