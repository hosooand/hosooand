'use client'

import { SkeletonChart } from '@/components/ui/Skeleton'
import { useState, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts'

interface ExerciseLog {
  type:     string
  duration: number
  calories: number
}

interface Log {
  date:          string
  meal_analysis: { calories: number } | null
  water_intake:  number | null
  condition:     number | null
  sleep_hours:   number | null
  exercise_logs: ExerciseLog[] | string | null
}

interface Props {
  logs: Log[]
}

const PERIOD_OPTIONS = [
  { label: '7일',  value: 7  },
  { label: '30일', value: 30 },
]

function PeriodToggle({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1 p-0.5 bg-gray-100 rounded-full">
      {PERIOD_OPTIONS.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-all
            ${value === o.value
              ? 'bg-white text-pink-600 shadow-sm'
              : 'text-gray-400 hover:text-gray-600'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function ChartCard({ title, subtitle, children, period, onPeriodChange, badge }: {
  title:          string
  subtitle:       string
  children:       React.ReactNode
  period:         number
  onPeriodChange: (v: number) => void
  badge?:         React.ReactNode
}) {
  return (
    <div className="bg-white rounded-[20px] border border-pink-100 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold text-gray-800">{title}</h3>
            {badge}
          </div>
          <p className="text-[12px] text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        <PeriodToggle value={period} onChange={onPeriodChange} />
      </div>
      {children}
    </div>
  )
}

function getDateRange(days: number): string[] {
  const dates: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toLocaleDateString('en-CA'))
  }
  return dates
}

function fmtDate(dateStr: string, period: number) {
  const d = new Date(dateStr + 'T00:00:00')
  if (period === 7) return d.toLocaleDateString('ko-KR', { weekday: 'short' })
  return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

function parseExerciseLogs(raw: ExerciseLog[] | string | null): ExerciseLog[] {
  try {
    if (!raw) return []
    if (typeof raw === 'string') {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed as ExerciseLog[]
    }
    if (Array.isArray(raw)) return raw
    return []
  } catch { return [] }
}

function parseTotalDuration(raw: ExerciseLog[] | string | null): number {
  try {
    return parseExerciseLogs(raw).reduce((sum, e) => {
      const d = Number(e?.duration)
      return sum + (isNaN(d) ? 0 : d)
    }, 0)
  } catch { return 0 }
}

function parseTotalCalories(raw: ExerciseLog[] | string | null): number {
  try {
    return parseExerciseLogs(raw).reduce((sum, e) => {
      const c = Number(e?.calories)
      return sum + (isNaN(c) ? 0 : c)
    }, 0)
  } catch { return 0 }
}

interface CalDataItem      { date: string; label: string; calories: number }
interface WaterDataItem    { date: string; label: string; water: number | null }
interface ExerciseDataItem { date: string; label: string; duration: number }


// ── 주간 운동 요약 배지 ───────────────────────────────────────
function WeeklyExerciseBadge({ totalMinutes }: { totalMinutes: number }) {
  const totalHours  = Math.round(totalMinutes / 60 * 10) / 10
  const isSufficient = totalMinutes >= 150 // 15시간 = 900분

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold
      ${isSufficient
        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
        : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
      <span>{isSufficient ? '😊' : '😐'}</span>
      <span>7일 {totalHours}h · {isSufficient ? '충분' : '부족'}</span>
    </div>
  )
}

export default function DashboardCharts({ logs }: Props) {
  const [calPeriod,      setCalPeriod]      = useState(7)
  const [waterPeriod,    setWaterPeriod]    = useState(7)
  const [exercisePeriod, setExercisePeriod] = useState(7)

  const today = new Date().toLocaleDateString('en-CA')

  if (!logs) {
    return (
      <div className="space-y-4">
        <SkeletonChart /><SkeletonChart /><SkeletonChart />
      </div>
    )
  }

  const logMap = useMemo(() => {
    const map: Record<string, Log> = {}
    logs.forEach(l => { map[l.date] = l })
    return map
  }, [logs])

  const calData = useMemo<CalDataItem[]>(() =>
    getDateRange(calPeriod).map(date => ({
      date,
      label:    fmtDate(date, calPeriod),
      calories: Math.round(logMap[date]?.meal_analysis?.calories ?? 0),
    })), [logMap, calPeriod])

  const waterData = useMemo<WaterDataItem[]>(() =>
    getDateRange(waterPeriod).map(date => ({
      date,
      label: fmtDate(date, waterPeriod),
      water: logMap[date]?.water_intake ?? null,
    })), [logMap, waterPeriod])

  const exerciseData = useMemo<ExerciseDataItem[]>(() =>
    getDateRange(exercisePeriod).map(date => ({
      date,
      label:    fmtDate(date, exercisePeriod),
      duration: parseTotalDuration(logMap[date]?.exercise_logs ?? null),
    })), [logMap, exercisePeriod])

  // ── 7일 총 운동 시간 (항상 7일 고정) ──
  const weeklyTotalMinutes = useMemo(() =>
    getDateRange(7).reduce((sum, date) =>
      sum + parseTotalDuration(logMap[date]?.exercise_logs ?? null), 0
    ), [logMap])

  const todayLog              = logMap[today]
  const todayCal              = Math.round(todayLog?.meal_analysis?.calories ?? 0)
  const todayWater            = todayLog?.water_intake ?? 0
  const todayExerciseDuration = parseTotalDuration(todayLog?.exercise_logs ?? null)
  const todayExerciseCal      = parseTotalCalories(todayLog?.exercise_logs ?? null)

  return (
    <div className="space-y-4">

      {/* 오늘 요약 카드 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '오늘 칼로리', value: `${todayCal}`,                          unit: 'kcal',                          color: 'text-pink-500',   bg: 'bg-pink-50',   border: 'border-pink-100'   },
          { label: '수분 섭취',   value: Number(todayWater).toFixed(1),           unit: 'L',                             color: 'text-blue-500',   bg: 'bg-blue-50',   border: 'border-blue-100'   },
          { label: '운동 시간',   value: `${todayExerciseDuration}`,              unit: `분 (-${Math.round(todayExerciseCal)}kcal)`, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-[16px] p-3 text-center`}>
            <p className="text-[10px] text-gray-400 mb-1">{s.label}</p>
            <p className={`text-[20px] font-bold ${s.color} leading-none`}>{s.value}</p>
            <p className={`text-[10px] ${s.color} mt-0.5`}>{s.unit}</p>
          </div>
        ))}
      </div>

      {/* 칼로리 섭취 차트 */}
      <ChartCard
        title="칼로리 섭취" subtitle="일일 권장 1,500~2,000 kcal"
        period={calPeriod} onPeriodChange={setCalPeriod}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={calData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#FEE2E2" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: '10px', border: '1px solid #FCE7F3', fontSize: 12 }}
              formatter={(value) => [`${Number(value)} kcal`, '칼로리']}
              labelStyle={{ color: '#6B7280' }}
            />
            <ReferenceLine y={1800} stroke="#FCA5A5" strokeDasharray="4 4"
              label={{ value: '권장', position: 'right', fontSize: 10, fill: '#FCA5A5' }} />
            <Bar dataKey="calories" radius={[6, 6, 0, 0]} maxBarSize={40}>
              {calData.map((entry, i) => (
                <Cell key={i} fill={entry.date === today ? '#EC4899' : '#FBCFE8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[11px] text-gray-400 text-center mt-1">진한 색 = 오늘 · 점선 = 권장량</p>
      </ChartCard>

      {/* 수분 섭취 차트 */}
      <ChartCard
        title="수분 섭취" subtitle="하루 권장 3L"
        period={waterPeriod} onPeriodChange={setWaterPeriod}>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={waterData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#DBEAFE" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} domain={[0, 4.5]} />
            <Tooltip
              contentStyle={{ borderRadius: '10px', border: '1px solid #DBEAFE', fontSize: 12 }}
              content={(props) => {
                if (!props.active || !props.payload?.length) return null
                const val = props.payload[0].value
                return (
                  <div className="bg-white border border-blue-100 rounded-[10px] px-3 py-2 text-[12px]">
                    <p className="text-gray-500 mb-0.5">{props.label}</p>
                    <p className="font-semibold text-blue-600">{val != null ? `${val}L` : '미기록'}</p>
                  </div>
                )
              }}
            />
            <ReferenceLine y={3} stroke="#93C5FD" strokeDasharray="4 4"
              label={{ value: '권장', position: 'right', fontSize: 10, fill: '#93C5FD' }} />
            <Line type="monotone" dataKey="water" stroke="#3B82F6" strokeWidth={2.5} connectNulls={false}
           dot={(props) => {
            const cx = props.cx ?? 0
            const cy = props.cy ?? 0
            const payload = props.payload as WaterDataItem
            if (payload.water === null) return <g key={props.key} />
            return (
              <circle key={props.key} cx={cx} cy={cy}
                r={payload.date === today ? 5 : 3.5}
                fill={payload.date === today ? '#3B82F6' : '#BFDBFE'}
                stroke="#3B82F6"
                strokeWidth={payload.date === today ? 2 : 1.5}
              />
            )
          }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 운동 기록 차트 — 주간 요약 배지 포함 */}
      <ChartCard
        title="운동 기록"
        subtitle="날짜별 총 운동 시간"
        period={exercisePeriod}
        onPeriodChange={setExercisePeriod}
        badge={<WeeklyExerciseBadge totalMinutes={weeklyTotalMinutes} />}
      >
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={exerciseData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#D1FAE5" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
              tickFormatter={(v: number) => `${v}분`}
              ticks={[0, 30, 60, 90, 120]}
              domain={[0, (dataMax: number) => Math.max(dataMax, 120)]}
            />
            <Tooltip
              contentStyle={{ borderRadius: '10px', border: '1px solid #D1FAE5', fontSize: 12 }}
              formatter={(value) => [`${Number(value)}분`, '운동 시간']}
              labelStyle={{ color: '#6B7280' }}
            />
            <ReferenceLine y={60} stroke="#6EE7B7" strokeDasharray="4 4"
              label={{ value: '목표 60분', position: 'right', fontSize: 10, fill: '#6EE7B7' }} />
            <Bar dataKey="duration" radius={[6, 6, 0, 0]} maxBarSize={40}>
              {exerciseData.map((entry, i) => (
                <Cell key={i}
                  fill={
                    entry.duration === 0    ? '#F3F4F6'
                    : entry.duration >= 60  ? '#10B981'
                    : entry.date === today  ? '#34D399'
                    : '#A7F3D0'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[11px] text-gray-400 text-center mt-1">
          진한 초록 = 목표 달성(60분↑) · 점선 = 목표 · 배지 기준: 7일 합산 150분
        </p>
      </ChartCard>

    </div>
  )
}

