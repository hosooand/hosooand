import type ExcelJS from 'exceljs'
import type { DailyLog } from '@/types/diary'

interface Member {
  name:           string
  member_number:  string | null
  height:         number | null
  current_weight: number | null
  staff_name?:    string | null
}

interface MealPanelEntry {
  meal_type:    '아침' | '점심' | '저녁' | '간식'
  time:         string | null
  image_url:    string | null
  content:      string | null
  calories:     number | null
  intake_ratio?: number
  analysis: {
    calories: number
    foods:    { name: string; amount: string; calories: number }[]
    feedback: string
  } | null
}

interface ExerciseLog {
  type:     string
  duration: number
  calories: number
}

type MealType = '아침' | '점심' | '저녁' | '간식'

const MEAL_TYPES: MealType[] = ['아침', '점심', '저녁', '간식']
const MEAL_DEFAULTS: Record<MealType, string> = {
  아침: '08:00', 점심: '12:00', 저녁: '18:00', 간식: '15:00',
}

/** 괄호 안 영어 번역 제거 (엑셀 등 표시용) */
export function removeEnglishInParens(text: string): string {
  return text.replace(/\s*\([A-Za-z\s&,]+\)/g, '').trim()
}

// 열 너비 (pt 단위 근사값, 1col ≈ 8px)
const COL_WIDTHS = [16, 32, 32, 32, 22, 10, 14]

function parseExerciseLogs(raw: ExerciseLog[] | string | null): ExerciseLog[] {
  try {
    if (!raw) return []
    if (typeof raw === 'string') {
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as ExerciseLog[]) : []
    }
    if (Array.isArray(raw)) return raw
    return []
  } catch { return [] }
}

function parseMealEntries(raw: unknown): MealPanelEntry[] {
  try {
    if (!raw) return []
    if (typeof raw === 'string') {
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as MealPanelEntry[]) : []
    }
    if (Array.isArray(raw)) return raw as MealPanelEntry[]
    return []
  } catch { return [] }
}

function getMealEntry(entries: MealPanelEntry[], mealType: MealType): MealPanelEntry | null {
  return entries.find(e => e.meal_type === mealType) ?? null
}

// 식단 텍스트 생성 (시간 + 음식 + 칼로리)
function mealIntakeRatio(entry: MealPanelEntry): number {
  const r = entry.intake_ratio
  if (r === 0.25 || r === 0.5 || r === 0.75 || r === 1) return r
  return 1
}

function getMealText(entry: MealPanelEntry | null, mealType: MealType): string {
  if (!entry) return '-'
  const ratio = mealIntakeRatio(entry)
  const lines: string[] = []
  const time = entry.time ?? MEAL_DEFAULTS[mealType]
  lines.push(`⏰ ${time}`)
  if (ratio < 1) {
    const label = ratio === 0.25 ? '1/4' : ratio === 0.5 ? '1/2' : ratio === 0.75 ? '3/4' : ''
    if (label) lines.push(`섭취: ${label} 먹음`)
  }
  if (entry.analysis?.foods && entry.analysis.foods.length > 0) {
    entry.analysis.foods.forEach(f => {
      const name = removeEnglishInParens(f.name)
      lines.push(`${name} ${f.amount} (${Math.round(f.calories * ratio)}kcal)`)
    })
  } else if (entry.content) {
    lines.push(entry.content)
  }
  const cal = entry.calories ?? Math.round((entry.analysis?.calories ?? 0) * ratio)
  if (cal > 0) lines.push(`합계: ${Math.round(cal)}kcal`)
  return lines.join('\n')
}

function formatDateKo(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('ko-KR', {
    year: '2-digit', month: '2-digit', day: '2-digit', weekday: 'short'
  })
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; ext: 'png' | 'jpeg' } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const ext: 'png' | 'jpeg' = blob.type.includes('png') ? 'png' : 'jpeg'
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        resolve({ base64: result.split(',')[1], ext })
      }
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

export async function generateMemberExcel(
  member:     Member,
  logs:       DailyLog[],
  dateRange?: { from: string; to: string }
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'S Body Clinic'
  wb.created = new Date()

  const filteredLogs = (dateRange
    ? logs.filter(l => l.date >= dateRange.from && l.date <= dateRange.to)
    : logs
  ).sort((a, b) => a.date.localeCompare(b.date))

  const rangeLabel = dateRange ? `${dateRange.from} ~ ${dateRange.to}` : `전체 ${logs.length}일`

  // ── 스타일 헬퍼 ───────────────────────────────────────────────
  function headerStyle(argb: string): Partial<ExcelJS.Style> {
    return {
      fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb } },
      font:      { bold: true, size: 11, color: { argb: 'FF333333' } },
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
      border:    { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
    }
  }

  function dataStyle(vertical: ExcelJS.Alignment['vertical'] = 'top'): Partial<ExcelJS.Style> {
    return {
      alignment: { vertical, horizontal: 'left', wrapText: true },
      border:    { top: { style: 'thin', color: { argb: 'FFE0E0E0' } }, bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } }, left: { style: 'thin', color: { argb: 'FFE0E0E0' } }, right: { style: 'thin', color: { argb: 'FFE0E0E0' } } },
    }
  }

  // ════════════════════════════════════════════════════════════
  // Sheet 1: 식단관리표
  // ════════════════════════════════════════════════════════════
  const ws = wb.addWorksheet('식단관리표')
  ws.columns = COL_WIDTHS.map(width => ({ width }))

  // 제목
  ws.mergeCells('A1:G1')
  ws.getCell('A1').value = '식단관리표'
  ws.getCell('A1').style = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFB3C6' } },
    font: { bold: true, size: 16, color: { argb: 'FF9B1942' } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  }
  ws.getRow(1).height = 40

  // 고객 정보
  ws.mergeCells('A2:B2'); ws.getCell('A2').value = `고객명: ${member.name}`
  ws.mergeCells('C2:D2'); ws.getCell('C2').value = `최근내원일: ${new Date().toLocaleDateString('ko-KR')}`
  ws.mergeCells('E2:G2'); ws.getCell('E2').value = `다음 예약일:`
  ws.getRow(2).height = 24
  ws.mergeCells('A3:B3'); ws.getCell('A3').value = `담당실장: ${member.staff_name ?? ''}`
  ws.mergeCells('C3:D3'); ws.getCell('C3').value = `기간: ${rangeLabel}`
  ws.mergeCells('E3:G3'); ws.getCell('E3').value = `식단관리시간:`
  ws.getRow(3).height = 24
  ;[2, 3].forEach(r => ws.getRow(r).eachCell(c => {
    c.font = { size: 11 }
    c.alignment = { vertical: 'middle' }
  }))

  ws.addRow([]).height = 24 // 빈 행

  // 컬럼 헤더
  const hRow = ws.addRow(['등록일', '아침', '점심', '저녁', '간식', '수분', '총칼로리'])
  hRow.height = 30
  const hColors = ['FFE8F5E9', 'FFFFF8E1', 'FFFFF3E0', 'FFE8EAF6', 'FFFCE4EC', 'FFE3F2FD', 'FFF3E5F5']
  hRow.eachCell((cell, col) => { cell.style = headerStyle(hColors[col - 1] ?? 'FFF5F5F5') })

  let totalCalSum = 0

  for (const log of filteredLogs) {
    const entries  = parseMealEntries((log as DailyLog & { meal_entries?: unknown }).meal_entries)
    const hasImage = MEAL_TYPES.some(mt => !!getMealEntry(entries, mt)?.image_url)

    const ROW_H = hasImage ? 180 : 100

    const mealCals = MEAL_TYPES.map(mt => {
      const e = getMealEntry(entries, mt)
      return Math.round(e?.calories ?? e?.analysis?.calories ?? 0)
    })
    const totalCal = mealCals.reduce((s, c) => s + c, 0)
    totalCalSum += totalCal

    const rowIndex = ws.rowCount + 1
    const row      = ws.addRow([
      formatDateKo(log.date),
      '', '', '', '',
      log.water_intake ? `${log.water_intake}L` : '-',
      totalCal > 0 ? `${totalCal}kcal` : '-',
    ])
    row.height = ROW_H

    // 날짜 셀
    row.getCell(1).style = {
      ...dataStyle('middle'),
      font:      { bold: true, size: 10 },
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: false },
    }
    // 수분
    row.getCell(6).style = { ...dataStyle('middle'), alignment: { vertical: 'middle', horizontal: 'center', wrapText: false } }
    // 총칼로리
    row.getCell(7).style = {
      ...dataStyle('middle'),
      font:      { bold: true, color: { argb: 'FFCC3366' } },
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: false },
    }

    // 식사별 처리
    for (let i = 0; i < MEAL_TYPES.length; i++) {
      const mealType = MEAL_TYPES[i]
      const colIdx   = i + 2       // B=2 ~ E=5 (1-based)
      const colIdxZ  = colIdx - 1  // 0-based for image
      const entry    = getMealEntry(entries, mealType)
      const cell     = row.getCell(colIdx)
      const time     = entry?.time ?? MEAL_DEFAULTS[mealType]

      if (entry?.image_url) {
        // ── 텍스트: 시간(상단) + 칼로리/음식명(하단) ──
        const cal   = entry.calories ?? entry.analysis?.calories ?? 0
        const foods = entry.analysis?.foods ?? []
        const foodLines = foods.length > 0
          ? foods.map(f =>
            `${removeEnglishInParens(f.name)} (${Math.round(f.calories)}kcal)`
          ).join('\n')
          : entry.content ?? ''
        const bottomText = [
          foodLines,
          cal > 0 ? `합계: ${Math.round(cal)}kcal` : '',
        ].filter(Boolean).join('\n')

        // RichText: 상단 시간 + 하단 식단 정보
        cell.value = {
          richText: [
            { text: `⏰ ${time}\n`,           font: { size: 9, bold: true,  color: { argb: 'FF555555' } } },
            { text: '\n\n\n\n\n\n',           font: { size: 9 } }, // 이미지 공간 확보
            { text: `\n${bottomText}`,        font: { size: 9,              color: { argb: 'FF333333' } } },
          ],
        }
        cell.style = {
          ...dataStyle('top'),
          alignment: { vertical: 'top', horizontal: 'left', wrapText: true },
        }

        // 이미지 삽입: 시간 텍스트 아래 ~ 칼로리 텍스트 위
        const imgData = await fetchImageAsBase64(entry.image_url)
        if (imgData) {
          const imageId = wb.addImage({ base64: imgData.base64, extension: imgData.ext })

          // 1pt ≈ 0.75px, ExcelJS row/col은 0-based
          // 상단 오프셋: 시간 텍스트 높이 만큼 (약 18pt)
          // 하단 오프셋: 칼로리 텍스트 높이 만큼 (약 30pt)
          ws.addImage(imageId, {
            tl: { col: colIdxZ + 0.05, row: rowIndex - 1 + (18  / ROW_H) } as ExcelJS.Anchor,
            br: { col: colIdxZ + 0.95, row: rowIndex - 1 + ((ROW_H - 32) / ROW_H) } as ExcelJS.Anchor,
            editAs: 'oneCell',
          })
        }
      } else {
        // 텍스트만
        cell.value = getMealText(entry, mealType)
        cell.style = dataStyle('top')
      }
    }
  }

  // 합계 행
  ws.addRow([]).height = 24
  const sumRowNum = ws.rowCount + 1
  const sumRow    = ws.addRow(['합계', '', '', '', '', '', `총 ${Math.round(totalCalSum)}kcal`])
  sumRow.height   = 30
  ws.mergeCells(`A${sumRowNum}:F${sumRowNum}`)
  sumRow.eachCell(cell => {
    cell.style = {
      fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0F5' } },
      font:      { bold: true, size: 12, color: { argb: 'FFCC3366' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border:    { top: { style: 'medium', color: { argb: 'FFFFB3C6' } }, bottom: { style: 'medium', color: { argb: 'FFFFB3C6' } }, left: { style: 'thin' }, right: { style: 'thin' } },
    }
  })

  // ════════════════════════════════════════════════════════════
  // Sheet 2: 일별 건강 기록
  // ════════════════════════════════════════════════════════════
  const ws2 = wb.addWorksheet('일별 건강 기록')
  ws2.columns = [
    { width: 14 }, { width: 16 }, { width: 13 }, { width: 13 },
    { width: 10 }, { width: 10 }, { width: 10 }, { width: 12 },
    { width: 40 }, { width: 30 },
  ]
  const h2 = ws2.addRow([
    '날짜', '총칼로리(kcal)', '탄수화물(g)', '단백질(g)',
    '지방(g)', '수분(L)', '수면(h)', '컨디션', 'AI 피드백', '메모'
  ])
  h2.height = 28
  h2.eachCell(cell => { cell.style = headerStyle('FFFFF0F5') })

  const conditionMap: Record<number, string> = {
    1: '😵 최악', 2: '😔 나쁨', 3: '😐 보통', 4: '🙂 좋음', 5: '😄 최고'
  }
  filteredLogs.forEach(log => {
    const r = ws2.addRow([
      log.date,
      log.meal_analysis ? Math.round(log.meal_analysis.calories) : '-',
      log.meal_analysis ? Math.round(log.meal_analysis.carbs)    : '-',
      log.meal_analysis ? Math.round(log.meal_analysis.protein)  : '-',
      log.meal_analysis ? Math.round(log.meal_analysis.fat)      : '-',
      log.water_intake  ?? '-',
      log.sleep_hours   ?? '-',
      log.condition     ? conditionMap[log.condition] : '-',
      log.meal_analysis?.feedback ?? '-',
      log.memo          ?? '-',
    ])
    r.height = 20
    r.eachCell(cell => { cell.style = dataStyle('middle') })
  })

  // ════════════════════════════════════════════════════════════
  // Sheet 3: 운동 기록
  // ════════════════════════════════════════════════════════════
  const ws3 = wb.addWorksheet('운동 기록')
  ws3.columns = [{ width: 14 }, { width: 14 }, { width: 12 }, { width: 18 }]
  const h3 = ws3.addRow(['날짜', '운동 종류', '시간(분)', '소모 칼로리(kcal)'])
  h3.height = 28
  h3.eachCell(cell => { cell.style = headerStyle('FFE8F5E9') })

  let hasExercise = false
  filteredLogs.forEach(log => {
    parseExerciseLogs(log.exercise_logs as ExerciseLog[] | string | null).forEach(e => {
      hasExercise = true
      const r = ws3.addRow([log.date, e.type ?? '-', Number(e.duration) || 0, Math.round(Number(e.calories) || 0)])
      r.height = 20
      r.eachCell(cell => { cell.style = dataStyle('middle') })
    })
  })
  if (!hasExercise) ws3.addRow(['운동 기록이 없습니다', '', '', ''])

  // ── 다운로드 ─────────────────────────────────────────────────
  const buffer   = await wb.xlsx.writeBuffer()
  const blob     = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url      = URL.createObjectURL(blob)
  const a        = document.createElement('a')
  const fileDate = new Date().toLocaleDateString('en-CA').replace(/-/g, '')
  const safeName = member.name.replace(/[^\w가-힣]/g, '_')
  a.href         = url
  a.download     = `${safeName}_${member.member_number ?? '회원'}_식단관리표_${fileDate}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}