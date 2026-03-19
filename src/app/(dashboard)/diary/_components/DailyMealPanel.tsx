'use client'

import { useMemo } from 'react'
import { useRef, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Camera, Loader2, Sparkles, RefreshCw, X, ChevronDown, ChevronUp, CheckCircle2, Clock } from 'lucide-react'

// ── 타입 ──────────────────────────────────────────────────────
export type MealType = '아침' | '점심' | '저녁' | '간식'

export interface MealAnalysis {
  calories:    number
  carbs:       number
  protein:     number
  fat:         number
  fiber:       number
  foods:       { name: string; amount: string; calories: number }[]
  feedback:    string
  analyzed_at: string
}

export interface MealPanelEntry {
  meal_type:  MealType
  time:       string | null   // ← 추가: "HH:MM" 형식
  image_url:  string | null
  content:    string | null
  calories:   number | null
  analysis:   MealAnalysis | null
}

// ── 상수 ──────────────────────────────────────────────────────
const MEAL_ORDER: MealType[] = ['아침', '점심', '저녁', '간식']

const MEAL_DEFAULTS: Record<MealType, { style: { bg: string; badge: string; label: string; emoji: string }; defaultTime: string }> = {
  아침: { style: { bg: 'bg-amber-50',  badge: 'bg-amber-100 text-amber-700',  label: '아침', emoji: '🌅' }, defaultTime: '08:00' },
  점심: { style: { bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700', label: '점심', emoji: '☀️' }, defaultTime: '12:00' },
  저녁: { style: { bg: 'bg-indigo-50', badge: 'bg-indigo-100 text-indigo-700', label: '저녁', emoji: '🌙' }, defaultTime: '18:00' },
  간식: { style: { bg: 'bg-pink-50',   badge: 'bg-pink-100 text-pink-700',     label: '간식', emoji: '🍬' }, defaultTime: '15:00' },
}

// ── MealCard ──────────────────────────────────────────────────
interface MealCardProps {
  userId:   string
  date:     string
  mealType: MealType
  entry:    MealPanelEntry
  onChange: (entry: MealPanelEntry) => void
}

function MealCard({ userId, date, mealType, entry, onChange }: MealCardProps) {
  const supabase  = createClient()
  const { style, defaultTime } = MEAL_DEFAULTS[mealType]
  const fileRef   = useRef<HTMLInputElement>(null)

  const [inputMode, setInputMode] = useState<'photo' | 'text'>('photo')
  const [content,   setContent]   = useState(entry.content ?? '')
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [expanded,  setExpanded]  = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [saved,     setSaved]     = useState(false)

  const isLoading  = uploading || analyzing
  const currentTime = entry.time ?? defaultTime

  async function uploadFile(file: File): Promise<string> {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const mealTypeMap: Record<MealType, string> = {
      아침: 'breakfast', 점심: 'lunch', 저녁: 'dinner', 간식: 'snack'
    }
    const path = `${userId}/${date}-${mealTypeMap[mealType]}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('meal-images')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) throw new Error(upErr.message)
    return supabase.storage.from('meal-images').getPublicUrl(path).data.publicUrl
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('이미지 파일만 가능해요'); return }
    if (file.size > 10 * 1024 * 1024)   { setError('10MB 이하만 가능해요');   return }
    setError(null)
    setUploading(true)
    try {
      const url = await uploadFile(file)
      setUploading(false)
      setAnalyzing(true)
      const res = await fetch('/api/analyze-meal', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ imageUrl: url, date }),
      })
      if (!res.ok) throw new Error('이미지 분석 실패')
      const analysis: MealAnalysis = await res.json()
      onChange({ ...entry, meal_type: mealType, image_url: url, calories: analysis.calories, analysis })
      flashSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : '업로드 실패')
    } finally {
      setUploading(false)
      setAnalyzing(false)
    }
  }

  async function handleAnalyzeText() {
    if (!content.trim()) return
    setError(null)
    setAnalyzing(true)
    try {
      const res = await fetch('/api/analyze-meal-text', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: content, date }),
      })
      if (!res.ok) throw new Error('텍스트 분석 실패')
      const analysis: MealAnalysis = await res.json()
      onChange({ ...entry, meal_type: mealType, content: content.trim(), calories: analysis.calories, analysis })
      flashSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 분석 실패')
    } finally {
      setAnalyzing(false)
    }
  }

  function handleClear() {
    onChange({ meal_type: mealType, time: entry.time, image_url: null, content: null, calories: null, analysis: null })
    setContent('')
    setError(null)
  }

  function handleTimeChange(time: string) {
    onChange({ ...entry, time })
  }

  function flashSaved() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className={`rounded-2xl border border-gray-100 overflow-hidden shadow-sm ${style.bg}`}>

      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[13px] font-semibold px-2.5 py-1 rounded-full ${style.badge}`}>
            {style.emoji} {style.label}
          </span>
          {entry.analysis && (
            <span className="text-[12px] font-bold text-pink-600 bg-pink-100 px-2 py-0.5 rounded-full">
              {Math.round(entry.analysis.calories)} kcal
            </span>
          )}
          {saved && <CheckCircle2 size={15} className="text-emerald-500" />}
        </div>
        <div className="flex items-center gap-1.5">
          {(entry.image_url || entry.content) && (
            <button type="button" onClick={handleClear} disabled={isLoading}
              className="w-7 h-7 rounded-full flex items-center justify-center
                text-gray-300 hover:text-rose-400 hover:bg-rose-50 transition-all">
              <X size={14} />
            </button>
          )}
          <button type="button" onClick={() => setExpanded(p => !p)}
            className="w-7 h-7 rounded-full flex items-center justify-center
              text-gray-300 hover:text-pink-400 hover:bg-pink-50 transition-all">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* 본문 */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">

          {/* 시간 선택 */}
          <div className="flex items-center gap-2 bg-white/70 rounded-xl px-3 py-2">
            <Clock size={13} className="text-gray-400 flex-shrink-0" />
            <span className="text-[12px] text-gray-400 flex-shrink-0">식사 시간</span>
            <input
              type="time"
              value={currentTime}
              onChange={e => handleTimeChange(e.target.value)}
              className="flex-1 text-[13px] font-semibold text-gray-700
                bg-transparent outline-none cursor-pointer
                [&::-webkit-calendar-picker-indicator]:opacity-50
                [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </div>

          {/* 탭 */}
          <div className="flex gap-2 p-1 bg-white/70 rounded-xl">
            <button type="button" onClick={() => setInputMode('photo')}
              className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-all
                ${inputMode === 'photo' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-400'}`}>
              📷 사진
            </button>
            <button type="button" onClick={() => setInputMode('text')}
              className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-all
                ${inputMode === 'text' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-400'}`}>
              ✏️ 직접입력
            </button>
          </div>

          {/* 사진 모드 */}
          {inputMode === 'photo' && (
            entry.image_url ? (
              <div className="relative w-full rounded-xl overflow-hidden">
                <div className="relative w-full aspect-[4/3]">
                  <Image src={entry.image_url} alt={`${mealType} 식단`} fill
                    className="object-cover" sizes="(max-width: 640px) 100vw, 400px" />
                  {isLoading && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                      <Loader2 size={28} className="text-white animate-spin" />
                      <p className="text-white text-[13px] font-medium">
                        {uploading ? '업로드 중...' : 'AI 분석 중...'}
                      </p>
                    </div>
                  )}
                </div>
                {!isLoading && (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="absolute top-2 right-2 bg-white/90 rounded-full px-2.5 py-1
                      text-[11px] font-medium text-gray-600 flex items-center gap-1 shadow">
                    <RefreshCw size={10} />교체
                  </button>
                )}
              </div>
            ) : (
              <button type="button" onClick={() => !isLoading && fileRef.current?.click()}
                disabled={isLoading}
                className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200
                  bg-white/70 flex flex-col items-center justify-center gap-2
                  hover:border-pink-300 hover:bg-pink-50/50
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all group">
                {isLoading
                  ? <Loader2 size={24} className="text-pink-400 animate-spin" />
                  : <>
                      <Camera size={24} className="text-gray-300 group-hover:text-pink-400 transition-colors" />
                      <span className="text-[12px] text-gray-400 group-hover:text-pink-400">사진을 추가하세요</span>
                      <span className="text-[10px] text-gray-300">최대 10MB</span>
                    </>
                }
              </button>
            )
          )}

          {/* 텍스트 모드 */}
          {inputMode === 'text' && (
            <div className="space-y-2">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder={`${mealType}에 먹은 음식을 입력하세요\n예) 현미밥 1공기, 된장국, 김치`}
                disabled={isLoading}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white
                  text-[13px] text-gray-700 placeholder-gray-300 outline-none resize-none
                  focus:border-pink-300 focus:ring-2 focus:ring-pink-100
                  disabled:opacity-50 transition-all"
              />
              <button type="button" onClick={handleAnalyzeText}
                disabled={!content.trim() || isLoading}
                className="w-full py-2 rounded-xl bg-pink-500 text-white text-[13px]
                  font-semibold flex items-center justify-center gap-1.5
                  hover:bg-pink-600 disabled:opacity-40 transition-all">
                {analyzing
                  ? <><Loader2 size={13} className="animate-spin" />분석 중...</>
                  : <><Sparkles size={13} />AI 칼로리 분석</>}
              </button>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={handleFileChange} />

          {/* 에러 */}
          {error && (
            <p className="text-[12px] text-rose-500 bg-rose-50 px-3 py-2 rounded-xl">{error}</p>
          )}

          {/* 분석 결과 */}
          {entry.analysis && (
            <div className="bg-white rounded-xl border border-pink-100 p-3">
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-[26px] font-bold text-pink-600 leading-none tabular-nums">
                    {Math.round(entry.analysis.calories)}
                  </p>
                  <p className="text-[10px] text-pink-400 mt-0.5">kcal</p>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-1 text-center">
                  {([
                    { label: '탄수화물', value: entry.analysis.carbs   },
                    { label: '단백질',   value: entry.analysis.protein },
                    { label: '지방',     value: entry.analysis.fat     },
                  ] as const).map(n => (
                    <div key={n.label}>
                      <p className="text-[13px] font-bold text-gray-700">{Math.round(n.value)}g</p>
                      <p className="text-[10px] text-gray-400">{n.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              {entry.analysis.feedback && (
                <p className="text-[11px] text-gray-500 mt-2 pt-2 border-t border-pink-100 leading-relaxed">
                  {entry.analysis.feedback}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── DailyMealPanel ────────────────────────────────────────────
interface Props {
  userId:   string
  date:     string
  entries:  MealPanelEntry[]
  onChange: (entries: MealPanelEntry[]) => void
}

export default function DailyMealPanel({ userId, date, entries, onChange }: Props) {

  const entryMap = useMemo(() => {
    const map: Partial<Record<MealType, MealPanelEntry>> = {}
    for (const e of entries) map[e.meal_type] = e
    return map
  }, [entries])

  const totalCalories = useMemo(
    () => entries.reduce((sum, e) => sum + (e.calories ?? 0), 0),
    [entries]
  )

  // 시간 기준으로 정렬된 표시 순서
  const sortedOrder = useMemo(() => {
    return [...MEAL_ORDER].sort((a, b) => {
      const timeA = entryMap[a]?.time ?? MEAL_DEFAULTS[a].defaultTime
      const timeB = entryMap[b]?.time ?? MEAL_DEFAULTS[b].defaultTime
      return timeA.localeCompare(timeB)
    })
  }, [entryMap])

  function handleChange(updated: MealPanelEntry) {
    const next = MEAL_ORDER.map((type) =>
      type === updated.meal_type
        ? updated
        : entryMap[type] ?? {
            meal_type: type,
            time:      null,
            image_url: null,
            content:   null,
            calories:  null,
            analysis:  null,
          }
    )
    onChange(next)
  }

  return (
    <div className="space-y-4">

      {/* 총 칼로리 */}
      {totalCalories > 0 && (
        <div className="flex items-center justify-between
          bg-white rounded-2xl border border-pink-100 px-4 py-3 shadow-sm">
          <span className="text-[13px] text-gray-500 font-medium">오늘 총 섭취 칼로리</span>
          <div className="flex items-baseline gap-1">
            <span className="text-[22px] font-bold text-pink-500 tabular-nums">
              {Math.round(totalCalories).toLocaleString()}
            </span>
            <span className="text-[13px] text-pink-400">kcal</span>
          </div>
        </div>
      )}

      {/* 식사별 카드 — 시간순 정렬 */}
      {sortedOrder.map((mealType) => (
        <MealCard
          key={mealType}
          userId={userId}
          date={date}
          mealType={mealType}
          entry={entryMap[mealType] ?? {
            meal_type: mealType,
            time:      null,
            image_url: null,
            content:   null,
            calories:  null,
            analysis:  null,
          }}
          onChange={handleChange}
        />
      ))}
    </div>
  )
}
