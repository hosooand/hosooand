'use client'

import { useState } from 'react'
import type { ExerciseLog } from '@/types/diary'
import { Plus, X, Dumbbell } from 'lucide-react'

// ── 운동 종류별 분당 칼로리 ────────────────────────────────────
const PRESETS: { type: string; duration: number; caloriesPerMin: number }[] = [
  { type: '걷기',         duration: 30, caloriesPerMin: 4  },
  { type: '가벼운 런닝',  duration: 30, caloriesPerMin: 5  },
  { type: '수영',         duration: 30, caloriesPerMin: 8  },
  { type: '요가',         duration: 60, caloriesPerMin: 3  },
  { type: '헬스',         duration: 30, caloriesPerMin: 6  },
  { type: '자전거',       duration: 60, caloriesPerMin: 5  },
  { type: '하이킹',       duration: 30, caloriesPerMin: 7  },
  { type: '필라테스',     duration: 50, caloriesPerMin: 3  },
  { type: '축구',         duration: 90, caloriesPerMin: 8  },
]

interface Props {
  value:    ExerciseLog[]
  onChange: (logs: ExerciseLog[]) => void
}

interface FormState {
  type:     string
  duration: number
  calories: number
  isManualCalories: boolean  // 사용자가 직접 칼로리 수정했는지
}

export default function ExerciseSection({ value, onChange }: Props) {
  const [adding, setAdding] = useState(false)
  const [form, setForm]     = useState<FormState>({
    type:             '',
    duration:         30,
    calories:         0,
    isManualCalories: false,
  })

  const totalCalories = value.reduce((sum, e) => sum + e.calories, 0)

  // ── 프리셋 선택 시 칼로리 자동 계산 ──
  function handlePresetSelect(preset: typeof PRESETS[number]) {
    setForm({
      type:             preset.type,
      duration:         preset.duration,
      calories:         Math.round(preset.caloriesPerMin * preset.duration),
      isManualCalories: false,
    })
  }

  // ── 운동 시간 변경 시 칼로리 자동 재계산 ──
  function handleDurationChange(duration: number) {
    const preset = PRESETS.find(p => p.type === form.type)
    if (preset && !form.isManualCalories) {
      // 프리셋 운동이고 수동 수정 안 했으면 자동 계산
      setForm(prev => ({
        ...prev,
        duration,
        calories: Math.round(preset.caloriesPerMin * duration),
      }))
    } else {
      setForm(prev => ({ ...prev, duration }))
    }
  }

  // ── 칼로리 직접 수정 시 수동 모드로 전환 ──
  function handleCaloriesChange(calories: number) {
    setForm(prev => ({ ...prev, calories, isManualCalories: true }))
  }

  // ── 운동 타입 직접 입력 ──
  function handleTypeChange(type: string) {
    const preset = PRESETS.find(p => p.type === type)
    if (preset && !form.isManualCalories) {
      setForm(prev => ({
        ...prev,
        type,
        calories: Math.round(preset.caloriesPerMin * prev.duration),
      }))
    } else {
      setForm(prev => ({ ...prev, type }))
    }
  }

  function addExercise() {
    if (!form.type.trim()) return
    onChange([...value, { type: form.type, duration: form.duration, calories: form.calories }])
    setAdding(false)
    setForm({ type: '', duration: 30, calories: 0, isManualCalories: false })
  }

  function resetForm() {
    setAdding(false)
    setForm({ type: '', duration: 30, calories: 0, isManualCalories: false })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold text-gray-700">
          운동 기록
          {value.length > 0 && (
            <span className="ml-2 text-[11px] text-emerald-500 font-medium">
              -{Math.round(totalCalories)} kcal
            </span>
          )}
        </p>
        {value.length < 10 && !adding && (
          <button type="button" onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-[12px] text-emerald-600 font-medium hover:text-emerald-700">
            <Plus size={14} />추가
          </button>
        )}
      </div>

      {/* 운동 목록 */}
      {value.length > 0 && (
        <div className="space-y-2 mb-3">
          {value.map((log, i) => (
            <div key={i} className="flex items-center gap-3 bg-emerald-50
              rounded-[10px] px-3 py-2.5 border border-emerald-100">
              <Dumbbell size={14} className="text-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-700 truncate">{log.type}</p>
                <p className="text-[11px] text-gray-400">{log.duration}분 · {Math.round(log.calories)}kcal 소모</p>
              </div>
              <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="text-gray-300 hover:text-rose-400 transition-colors flex-shrink-0">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 빠른 추가 프리셋 (운동 없을 때) */}
      {!adding && value.length === 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {PRESETS.slice(0, 4).map(p => (
            <button key={p.type} type="button"
              onClick={() => {
                onChange([...value, {
                  type:     p.type,
                  duration: p.duration,
                  calories: Math.round(p.caloriesPerMin * p.duration),
                }])
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full
                bg-emerald-50 border border-emerald-100 text-[12px] font-medium
                text-emerald-600 hover:bg-emerald-100 transition-all">
              {p.type}
              <span className="text-[10px] text-emerald-400">{p.duration}분</span>
            </button>
          ))}
        </div>
      )}

      {/* 운동 추가 폼 */}
      {adding && (
        <div className="bg-gray-50 rounded-[12px] p-3 border border-gray-200 space-y-3">

          {/* 프리셋 선택 */}
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button key={p.type} type="button" onClick={() => handlePresetSelect(p)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all
                  ${form.type === p.type
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-500 hover:border-emerald-300'}`}>
                {p.type}
              </button>
            ))}
          </div>

          {/* 입력 필드 */}
          <div className="grid grid-cols-3 gap-2">
            {/* 운동 종류 */}
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">운동 종류</label>
              <input type="text" value={form.type} placeholder="예: 수영"
                onChange={e => handleTypeChange(e.target.value)}
                className="w-full h-9 px-2.5 rounded-[8px] border border-gray-200
                  text-[13px] outline-none focus:border-emerald-400 transition-all" />
            </div>

            {/* 시간 (분) */}
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">시간 (분)</label>
              <input type="number" value={form.duration} placeholder="30" min={1} max={600}
                onChange={e => handleDurationChange(Number(e.target.value))}
                className="w-full h-9 px-2.5 rounded-[8px] border border-gray-200
                  text-[13px] outline-none focus:border-emerald-400 transition-all" />
            </div>

            {/* 소모 칼로리 */}
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">
                소모 칼로리
                {!form.isManualCalories && form.type && PRESETS.find(p => p.type === form.type) && (
                  <span className="ml-1 text-emerald-400">자동</span>
                )}
              </label>
              <input type="number" value={form.calories} placeholder="0" min={0}
                onChange={e => handleCaloriesChange(Number(e.target.value))}
                className="w-full h-9 px-2.5 rounded-[8px] border border-gray-200
                  text-[13px] outline-none focus:border-emerald-400 transition-all" />
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <button type="button" onClick={addExercise} disabled={!form.type.trim()}
              className="flex-1 h-9 rounded-[8px] bg-emerald-500 text-white
                text-[13px] font-semibold disabled:opacity-40 transition-all hover:bg-emerald-600">
              추가
            </button>
            <button type="button" onClick={resetForm}
              className="flex-1 h-9 rounded-[8px] border border-gray-200
                text-gray-500 text-[13px] hover:bg-gray-100 transition-all">
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
