'use client'

import type { Condition } from '@/types/diary'

const CONDITIONS = [
  { value: 1 as Condition, emoji: '😵', label: '최악', color: 'text-rose-500',    bg: 'bg-rose-50',    ring: 'ring-rose-300'    },
  { value: 2 as Condition, emoji: '😔', label: '나쁨', color: 'text-orange-500',  bg: 'bg-orange-50',  ring: 'ring-orange-300'  },
  { value: 3 as Condition, emoji: '😐', label: '보통', color: 'text-amber-500',   bg: 'bg-amber-50',   ring: 'ring-amber-300'   },
  { value: 4 as Condition, emoji: '🙂', label: '좋음', color: 'text-lime-500',    bg: 'bg-lime-50',    ring: 'ring-lime-300'    },
  { value: 5 as Condition, emoji: '😄', label: '최고', color: 'text-emerald-500', bg: 'bg-emerald-50', ring: 'ring-emerald-300' },
]

interface Props {
  value: Condition | null
  onChange: (v: Condition) => void
}

export default function ConditionPicker({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 justify-between">
      {CONDITIONS.map(c => (
        <button key={c.value} type="button" onClick={() => onChange(c.value)}
          className={`flex-1 flex flex-col items-center gap-2 py-3 px-1 rounded-[14px]
            border-2 transition-all duration-200
            ${value === c.value
              ? `${c.bg} border-transparent ring-2 ${c.ring} scale-105 shadow-md`
              : 'bg-white border-gray-100 hover:border-gray-200'}`}>
          <span className="text-[28px] leading-none select-none">{c.emoji}</span>
          <span className={`text-[11px] font-semibold ${value === c.value ? c.color : 'text-gray-400'}`}>
            {c.label}
          </span>
        </button>
      ))}
    </div>
  )
}