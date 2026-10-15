import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2"

const MEAL_BUCKET = "meal-images"
const MEDICAL_BUCKET = "medical-images"
const PAGE_SIZE = 1000
const REMOVE_BATCH = 100

type JsonRecord = Record<string, unknown>

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function isAuthorized(req: Request): boolean {
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  const cronSecret = Deno.env.get("CRON_SECRET") ?? ""
  const auth = req.headers.get("Authorization") ?? ""
  const headerSecret = req.headers.get("x-cron-secret") ?? ""

  if (cronSecret && (auth === `Bearer ${cronSecret}` || headerSecret === cronSecret)) {
    return true
  }
  return Boolean(serviceRole) && auth === `Bearer ${serviceRole}`
}

function cutoffDateString(): string {
  const cutoff = new Date()
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 3)
  return cutoff.toISOString().slice(0, 10)
}

function asObjectArray(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object")
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value)
      return asObjectArray(parsed)
    } catch {
      return []
    }
  }
  return []
}

function collectRawUrls(row: JsonRecord): string[] {
  const urls: string[] = []

  if (typeof row.meal_image_url === "string") urls.push(row.meal_image_url)

  for (const bag of [row.meal_entries, row.meals]) {
    for (const entry of asObjectArray(bag)) {
      for (const key of ["image_url", "image_url_2", "meal_image_url"]) {
        const value = entry[key]
        if (typeof value === "string") urls.push(value)
      }
      if (Array.isArray(entry.image_urls)) {
        for (const url of entry.image_urls) {
          if (typeof url === "string") urls.push(url)
        }
      }
    }
  }

  return urls
}

/** public/sign URL 에서 meal-images 객체 경로만 추출. medical-images 는 무조건 제외. */
function mealImagePathFromUrl(url: string): string | null {
  if (!url) return null
  if (url.includes(`/${MEDICAL_BUCKET}/`)) return null

  const markers = [
    `/object/public/${MEAL_BUCKET}/`,
    `/object/sign/${MEAL_BUCKET}/`,
    `/render/image/public/${MEAL_BUCKET}/`,
  ]

  for (const marker of markers) {
    const index = url.indexOf(marker)
    if (index === -1) continue
    const rest = url.slice(index + marker.length)
    const path = decodeURIComponent(rest.split("?")[0] ?? "").trim()
    if (!path || path.includes("..")) return null
    return path
  }

  return null
}

async function fetchOldDailyLogs(
  supabase: SupabaseClient,
  cutoffDate: string,
): Promise<JsonRecord[]> {
  const rows: JsonRecord[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from("daily_logs")
      .select("meal_image_url, meal_entries, meals")
      .lt("date", cutoffDate)
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw new Error(`daily_logs 조회 실패: ${error.message}`)
    const page = (data ?? []) as JsonRecord[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

function isFolder(item: { id: string | null; metadata: unknown }): boolean {
  return item.id === null || item.metadata == null
}

async function listPrefix(
  supabase: SupabaseClient,
  prefix: string,
): Promise<Array<{ name: string; id: string | null; metadata: unknown; created_at?: string }>> {
  const items: Array<{ name: string; id: string | null; metadata: unknown; created_at?: string }> = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase.storage.from(MEAL_BUCKET).list(prefix || undefined, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    })
    if (error) throw new Error(`meal-images 목록 조회 실패 (${prefix || "/"}): ${error.message}`)
    const page = data ?? []
    items.push(...page)
    if (page.length < PAGE_SIZE) break
    offset += page.length
  }

  return items
}

/** meal-images 버킷에서 created_at 이 3개월 이전인 파일 경로. medical-images 는 조회하지 않음. */
async function listOldMealImagePaths(
  supabase: SupabaseClient,
  cutoffIso: string,
): Promise<string[]> {
  const oldPaths: string[] = []
  const rootItems = await listPrefix(supabase, "")

  for (const item of rootItems) {
    if (isFolder(item)) {
      const files = await listPrefix(supabase, item.name)
      for (const file of files) {
        if (isFolder(file)) continue
        if (file.created_at && file.created_at < cutoffIso) {
          oldPaths.push(`${item.name}/${file.name}`)
        }
      }
      continue
    }

    if (item.created_at && item.created_at < cutoffIso) {
      oldPaths.push(item.name)
    }
  }

  return oldPaths
}

async function removePaths(supabase: SupabaseClient, paths: string[]): Promise<number> {
  let deleted = 0
  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    const batch = paths.slice(i, i + REMOVE_BATCH)
    const { error } = await supabase.storage.from(MEAL_BUCKET).remove(batch)
    if (error) throw new Error(`meal-images 삭제 실패: ${error.message}`)
    deleted += batch.length
  }
  return deleted
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
      },
    })
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  if (!isAuthorized(req)) {
    return jsonResponse({ error: "Unauthorized" }, 401)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRole) {
    return jsonResponse({ error: "Missing Supabase env" }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const cutoffDate = cutoffDateString()
  const cutoffIso = `${cutoffDate}T00:00:00.000Z`

  try {
    const logs = await fetchOldDailyLogs(supabase, cutoffDate)
    const urlPaths = new Set<string>()
    let skippedMedical = 0

    for (const row of logs) {
      for (const url of collectRawUrls(row)) {
        if (url.includes(`/${MEDICAL_BUCKET}/`)) {
          skippedMedical += 1
          continue
        }
        const path = mealImagePathFromUrl(url)
        if (path) urlPaths.add(path)
      }
    }

    const listedOldPaths = await listOldMealImagePaths(supabase, cutoffIso)
    const allPaths = new Set<string>([...urlPaths, ...listedOldPaths])
    const deleted = await removePaths(supabase, [...allPaths])

    return jsonResponse({
      ok: true,
      cutoffDate,
      scannedLogs: logs.length,
      pathsFromUrls: urlPaths.size,
      pathsFromListing: listedOldPaths.length,
      deletedFiles: deleted,
      skippedMedical,
      bucket: MEAL_BUCKET,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return jsonResponse({ ok: false, error: message, cutoffDate }, 500)
  }
})
