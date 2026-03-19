'use client'

import { useEffect, useMemo, useState } from 'react'

type ClinicStatusState = {
  label: string
  style: string
  emoji: string
}

function computeStatus(now: Date): ClinicStatusState {
  const day = now.getDay() // local (browser) timezone
  const hhmm = now.getHours() * 100 + now.getMinutes()

  const isClosed = day === 0 || day === 3 // 일·수 휴진 (공휴일은 별도 데이터 없어서 제외)
  const isSaturday = day === 6
  const isLunch = !isClosed && !isSaturday && hhmm >= 1330 && hhmm < 1430

  const isOpen = (() => {
    if (isClosed) return false
    if (isSaturday) return hhmm >= 1030 && hhmm < 1500
    return (hhmm >= 1030 && hhmm < 1330) || (hhmm >= 1430 && hhmm < 1900)
  })()

  if (isLunch) {
    return {
      label: '점심시간 (14:30 진료 재개)',
      style: 'bg-amber-50 text-amber-600 border border-amber-200',
      emoji: '🟡',
    }
  }
  if (isOpen) {
    return {
      label: '현재 진료 중',
      style: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      emoji: '🟢',
    }
  }
  return {
    label: '현재 진료 종료',
    style: 'bg-rose-50 text-rose-500 border border-rose-100',
    emoji: '🔴',
  }
}

export default function ClinicStatus() {
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    // 30초마다 갱신해서 분 단위 변경을 안정적으로 반영
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const status = useMemo(() => computeStatus(now), [now])

  useEffect(() => {
    console.log('[clinic status client]', {
      localIso: now.toISOString(),
      day: now.getDay(),
      hhmm: now.getHours() * 100 + now.getMinutes(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
  }, [now])

  return (
    <div className={`mt-3 px-3 py-2 rounded-[8px] text-center text-[13px] font-semibold ${status.style}`}>
      {status.emoji} {status.label}
    </div>
  )
}

