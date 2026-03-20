'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { DailyLogSchema, type DailyLogFormValues } from '@/lib/validations/diary'
import type { DailyLog } from '@/types/diary'
import DailyMealPanel, { type MealPanelEntry } from './DailyMealPanel'
import ConditionPicker from './ConditionPicker'
import ExerciseSection from './ExerciseSection'
import { upsertDailyLog } from '@/lib/supabase/diary'
import Toast from '@/components/ui/Toast'
import { ChevronLeft, ChevronRight, Save, Droplets, Moon } from 'lucide-react'

interface Props {
  date:       string
  initialLog: DailyLog | null
  profile:    { name: string; target_weight: number | null }
  userId:     string
}

function formatDateKo(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}
function isToday(dateStr: string) {
  return dateStr === new Date().toLocaleDateString('en-CA')
}
function shiftDate(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}
function sliderStyle(value: number, max: number) {
  const pct = Math.min((value / max) * 100, 100)
  return {
    background: `linear-gradient(to right, #EC4899 0%, #EC4899 ${pct}%, #F3E8EE ${pct}%, #F3E8EE 100%)`,
  }
}

function Section({ num, title, subtitle, accent, children }: {
  num: string; title: string; subtitle: string
  accent: 'pink' | 'blue' | 'violet' | 'emerald'
  children: React.ReactNode
}) {
  const accentMap = {
    pink:    { dot: 'bg-pink-400',    num: 'text-pink-300',    border: 'border-pink-100'    },
    blue:    { dot: 'bg-blue-400',    num: 'text-blue-300',    border: 'border-blue-100'    },
    violet:  { dot: 'bg-violet-400',  num: 'text-violet-300',  border: 'border-violet-100'  },
    emerald: { dot: 'bg-emerald-400', num: 'text-emerald-300', border: 'border-emerald-100' },
  }
  const c = accentMap[accent]
  return (
    <div className={`bg-white rounded-[20px] border ${c.border} p-5 shadow-sm`}>
      <div className="flex items-start gap-3 mb-4">
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <div className={`w-2 h-2 rounded-full ${c.dot}`} />
          <span className={`text-[10px] font-bold ${c.num} leading-none`}>{num}</span>
        </div>
        <div>
          <h3 className="text-[15px] font-semibold text-gray-800 leading-none mb-0.5">{title}</h3>
          <p className="text-[12px] text-gray-400">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

// initialLog에서 meal_entries 안전하게 추출
function extractMealEntries(log: DailyLog | null): MealPanelEntry[] {
  if (!log) return []
  const entries = (log as DailyLog & { meal_entries?: MealPanelEntry[] })?.meal_entries
  if (!Array.isArray(entries)) return []
  return entries.filter(e => e.meal_type != null)
}

export default function DiaryClient({ date, initialLog, profile, userId }: Props) {
  const router                       = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mealEntries, setMealEntries] = useState<MealPanelEntry[]>(() => extractMealEntries(initialLog))
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<DailyLogFormValues>({
      resolver: zodResolver(DailyLogSchema),
      defaultValues: {
        date,
        meal_image_url: initialLog?.meal_image_url ?? null,
        meal_analysis:  initialLog?.meal_analysis  ?? null,
        water_intake:   initialLog?.water_intake   ?? 1.5,
        sleep_hours:    initialLog?.sleep_hours    ?? 7,
        exercise_logs: initialLog?.exercise_logs ?? [],
        condition:      initialLog?.condition      ?? null,
        memo:           initialLog?.memo           ?? '',
      },
    })

  // date가 바뀌면 → 상태 즉시 초기화 → 새 날짜 데이터로 교체
  useEffect(() => {
    setMealEntries(extractMealEntries(initialLog))
    reset({
      date,
      meal_image_url: initialLog?.meal_image_url ?? null,
      meal_analysis:  initialLog?.meal_analysis  ?? null,
      water_intake:   initialLog?.water_intake   ?? 1.5,
      sleep_hours:    initialLog?.sleep_hours    ?? 7,
      exercise_logs: initialLog?.exercise_logs ?? [],
      condition:      initialLog?.condition      ?? null,
      memo:           initialLog?.memo           ?? '',
    })
  }, [date, initialLog, reset])

  const waterVal  = watch('water_intake') ?? 0
  const sleepVal  = watch('sleep_hours')  ?? 0
  const condition = watch('condition')

  function handleMealChange(entries: MealPanelEntry[]) {
    setMealEntries(entries)
    const totalCals    = entries.reduce((sum, e) => sum + (e.calories         ?? 0), 0)
    const totalCarbs   = entries.reduce((sum, e) => sum + (e.analysis?.carbs   ?? 0), 0)
    const totalProtein = entries.reduce((sum, e) => sum + (e.analysis?.protein ?? 0), 0)
    const totalFat     = entries.reduce((sum, e) => sum + (e.analysis?.fat     ?? 0), 0)
    const totalFiber   = entries.reduce((sum, e) => sum + (e.analysis?.fiber   ?? 0), 0)
    if (totalCals > 0) {
      setValue('meal_analysis', {
        calories:    totalCals,
        carbs:       totalCarbs,
        protein:     totalProtein,
        fat:         totalFat,
        fiber:       totalFiber,
        foods:       entries.flatMap(e => e.analysis?.foods ?? []),
        feedback:    entries.map(e => e.analysis?.feedback ?? '').filter(Boolean).join(' '),
        analyzed_at: new Date().toISOString(),
      }, { shouldDirty: true })
    }
  }

  function onSubmit(values: DailyLogFormValues) {
    startTransition(async () => {
      try {
        console.log('[DiaryClient] onSubmit payload check', {
          date,
          meal_entries_len: mealEntries?.length ?? 0,
          meal_entries_any: (mealEntries ?? []).some(e => e?.meal_type != null),
          meal_entries_first: (mealEntries ?? [])[0]
            ? {
                meal_type: (mealEntries ?? [])[0]?.meal_type,
                time: (mealEntries ?? [])[0]?.time,
                has_image_url: Boolean((mealEntries ?? [])[0]?.image_url),
                has_content: Boolean((mealEntries ?? [])[0]?.content),
                has_analysis: Boolean((mealEntries ?? [])[0]?.analysis),
              }
            : null,
        })
        await upsertDailyLog({ ...values, date, meal_entries: mealEntries })
        setToast({ message: '오늘의 기록이 저장됐어요 ✅', type: 'success' })
      } catch (e) {
        console.error(e)
        setToast({ message: '저장에 실패했어요. 다시 시도해주세요 ❌', type: 'error' })
      }
    })
  }

  function goDate(days: number) {
    const next  = shiftDate(date, days)
    const today = new Date().toLocaleDateString('en-CA')
    if (next > today) return
    router.push(`/diary?date=${next}`)
  }

  function handleDatePick(nextDate: string) {
    if (!nextDate) return
    router.push(`/diary?date=${nextDate}`)
  }

  return (
    <div className="min-h-screen bg-[#FFF8FB]">

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* 날짜 헤더 */}
      <div className="sticky top-14 z-30 bg-white/90 backdrop-blur-md border-b border-pink-100">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => goDate(-1)}
              className="w-8 h-8 rounded-full flex items-center justify-center
                text-gray-400 hover:text-pink-500 hover:bg-pink-50 transition-all">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center relative inline-flex flex-col items-center">
              {/*
                버튼 + showPicker()/click()은 일부 브라우저에서 "직접 사용자 제스처가 input에 닿지 않음"으로 달력이 안 뜸.
                투명 date input을 날짜 텍스트 위에 올려 클릭이 곧바로 input에 전달되게 함 (role 무관, 동일 동작).
              */}
              <label className="group relative inline-flex min-h-[22px] cursor-pointer items-center justify-center px-1">
                <span className="text-[15px] font-semibold text-gray-800 leading-none select-none pointer-events-none group-hover:text-pink-600">
                  {formatDateKo(date)}
                </span>
                <input
                  type="date"
                  value={date}
                  max={new Date().toLocaleDateString('en-CA')}
                  onChange={(e) => handleDatePick(e.target.value)}
                  className="absolute inset-0 z-[1] h-full w-full cursor-pointer opacity-0"
                  aria-label="다이어리 날짜 선택"
                />
              </label>
              {isToday(date) && <span className="text-[11px] text-pink-500 font-medium">오늘</span>}
            </div>
            <button type="button" onClick={() => goDate(1)} disabled={isToday(date)}
              className="w-8 h-8 rounded-full flex items-center justify-center
                text-gray-400 hover:text-pink-500 hover:bg-pink-50 transition-all
                disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight size={18} />
            </button>
          </div>

          <button type="button" onClick={handleSubmit(onSubmit)} disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold
              transition-all duration-200 bg-gradient-to-r from-pink-600 to-rose-400 text-white
              shadow-[0_3px_12px_rgba(236,72,153,0.3)] disabled:opacity-60">
            {isPending
              ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />저장 중</>
              : <><Save size={14} />저장하기</>}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}
        className="max-w-2xl mx-auto px-4 pb-32 space-y-4 pt-5">

        {/* 01 식단 — key={date}로 날짜 바뀌면 완전 리마운트 보장 */}
        <Section num="01" title="오늘의 식단" subtitle="아침 · 점심 · 저녁 · 간식을 기록하세요" accent="pink">
          <DailyMealPanel
            key={date}
            userId={userId}
            date={date}
            entries={mealEntries}
            onChange={handleMealChange}
          />
        </Section>

        {/* 02 수분 */}
        <Section num="02" title="수분 섭취" subtitle="하루 권장량 3L" accent="blue">
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-[42px] font-bold text-blue-500 leading-none tabular-nums">
                  {Number(waterVal).toFixed(1)}
                </span>
                <span className="text-[16px] text-blue-400 font-medium mb-1">L</span>
              </div>
              <div className="flex gap-1.5 flex-wrap justify-end">
                {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0].map(preset => (
                  <button key={preset} type="button"
                    onClick={() => setValue('water_intake', preset, { shouldDirty: true })}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all
                      ${waterVal === preset ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-400 hover:bg-blue-100'}`}>
                    {preset}L
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: 18 }).map((_, i) => {
                const filled = waterVal >= (i + 1) * 0.25
                return (
                  <button key={i} type="button"
                    onClick={() => setValue('water_intake', (i + 1) * 0.25, { shouldDirty: true })}
                    className="transition-transform hover:scale-110 active:scale-95">
                    <Droplets size={24}
                      className={`transition-all duration-200 ${filled ? 'text-blue-400' : 'text-blue-100'}`}
                      fill={filled ? 'currentColor' : 'none'} />
                  </button>
                )
              })}
              <span className="text-[11px] text-gray-400 self-end ml-1">= 250ml/개</span>
            </div>
            <input type="range" min="0" max="4.5" step="0.25"
              {...register('water_intake', { valueAsNumber: true })}
              style={sliderStyle(waterVal, 4.5)}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer" />
            <div className="flex justify-between text-[10px] text-gray-300 -mt-2">
              <span>0L</span><span>2.25L</span><span>4.5L</span>
            </div>
          </div>
        </Section>

        {/* 03 수면 */}
        <Section num="03" title="수면" subtitle="목표 7~9시간" accent="violet">
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-[42px] font-bold text-violet-500 leading-none tabular-nums">
                  {Number(sleepVal).toFixed(1)}
                </span>
                <span className="text-[16px] text-violet-400 font-medium mb-1">h</span>
              </div>
              <div className={`px-3 py-1 rounded-full text-[12px] font-semibold
                ${sleepVal >= 7 ? 'bg-emerald-50 text-emerald-600'
                  : sleepVal >= 5 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-500'}`}>
                {sleepVal >= 7 ? '😴 충분' : sleepVal >= 5 ? '😐 보통' : '😵 부족'}
              </div>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 10 }).map((_, i) => {
                const hour    = i + 1
                const filled  = sleepVal >= hour
                const partial = !filled && sleepVal > i
                return (
                  <button key={i} type="button"
                    onClick={() => setValue('sleep_hours', hour, { shouldDirty: true })}
                    className="flex-1 flex flex-col items-center gap-0.5 group transition-transform hover:scale-105">
                    <Moon size={20}
                      className={`transition-all ${filled ? 'text-violet-500' : partial ? 'text-violet-300' : 'text-violet-100'}`}
                      fill={filled || partial ? 'currentColor' : 'none'} />
                    <span className="text-[9px] text-gray-300 group-hover:text-gray-400">{hour}h</span>
                  </button>
                )
              })}
            </div>
            <input type="range" min="0" max="12" step="0.5"
              {...register('sleep_hours', { valueAsNumber: true })}
              style={sliderStyle(sleepVal, 12)}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:cursor-pointer" />
          </div>
        </Section>

        {/* 04 운동 기록 */}
        <Section num="04" title="운동 기록" subtitle="오늘 한 운동을 기록하세요" accent="emerald">
          <ExerciseSection
            value={watch('exercise_logs') ?? []}
            onChange={(logs) => setValue('exercise_logs', logs, { shouldDirty: true })}
          />
        </Section>

        {/* 05 컨디션 */}
        <Section num="05" title="오늘의 컨디션" subtitle="몸 상태를 알려주세요" accent="pink">
          <ConditionPicker
            value={condition ?? null}
            onChange={(v) => setValue('condition', v, { shouldDirty: true })}
          />
          {errors.condition && (
            <p className="text-xs text-rose-500 mt-2">{errors.condition.message}</p>
          )}
        </Section>

        {/* 06 메모 */}
        <Section num="06" title="오늘의 한 줄" subtitle="특이사항이나 느낀 점을 남겨보세요" accent="pink">
          <div className="relative">
            <textarea {...register('memo')} rows={3} maxLength={500}
              placeholder="오늘 컨디션이 좋았어요. 점심에 과식했지만 저녁은 가볍게..."
              className="w-full px-4 py-3 rounded-[12px] border border-gray-200 text-[14px]
                text-gray-700 placeholder-gray-300 outline-none resize-none
                focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all" />
            <span className="absolute bottom-3 right-3 text-[11px] text-gray-300">
              {(watch('memo') ?? '').length}/500
            </span>
          </div>
          {errors.memo && (
            <p className="text-xs text-rose-500 mt-1">{errors.memo.message}</p>
          )}
        </Section>

        {/* 모바일 저장 버튼 */}
        <div className="fixed bottom-16 left-0 right-0 px-4 md:hidden">
          <button type="submit" disabled={isPending}
            className="w-full h-[52px] rounded-[12px]
              bg-gradient-to-r from-pink-600 via-pink-500 to-rose-400
              text-white text-[16px] font-semibold
              shadow-[0_6px_20px_rgba(236,72,153,0.35)]
              disabled:opacity-60 transition-all flex items-center justify-center gap-2">
            {isPending
              ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />저장 중...</>
              : <><Save size={18} />오늘의 기록 저장</>}
          </button>
        </div>

      </form>
    </div>
  )
}
