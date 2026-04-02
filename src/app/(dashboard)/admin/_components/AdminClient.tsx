'use client'

import EmptyState from '@/components/ui/EmptyState'
import { SkeletonList, SkeletonCard } from '@/components/ui/Skeleton'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import type { DailyLog } from '@/types/diary'
import { createMember } from '@/app/actions/admin'
import { generateMemberExcel } from '@/lib/export'
import { mealEntriesHasRecords } from '@/lib/meal-entries'
import Link from 'next/link'

interface Member {
  id:             string
  name:           string
  height:         number | null
  current_weight: number | null
  avatar:         string | null
  created_at:     string
  member_number:  string | null
  target_calories?: number | null
  /** 최근 30일 daily_logs에 meal_entries(배열)가 1건 이상 있는지 */
  has_recent_meal_entries?: boolean
}

interface StaffNote {
  id:         string
  member_id:  string
  staff_id:   string
  content:    string
  created_at: string
  updated_at: string
  staff:      { name: string } | null
}

interface Props {
  members:      Member[]
  staffId:      string
  initialNotes: StaffNote[]
  staffName?:   string
  viewerRole?:  string
}

const AVATARS: Record<string, string> = {
  'duck':         '/duck.png',
  'duck-run':     '/duck-run.png',
  'duck-pilates': '/duck-pilates.png',
  'duck-gym':     '/duck-gym.png',
}

function getBMI(height: number | null, weight: number | null) {
  if (!height || !weight) return null
  return weight / Math.pow(height / 100, 2)
}

function MealLogStatusBadge({ hasLog }: { hasLog: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        hasLog
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-rose-200 bg-rose-50 text-rose-800'
      }`}
    >
      {hasLog ? '🟢 식단 기록 있음' : '🔴 식단 미기록'}
    </span>
  )
}

function BMIBadge({ bmi }: { bmi: number | null }) {
  if (!bmi) return <span className="text-[11px] text-gray-300">-</span>
  const { label, color } =
    bmi < 18.5 ? { label: '저체중', color: 'bg-blue-100 text-blue-600'       }
    : bmi < 23  ? { label: '정상',   color: 'bg-emerald-100 text-emerald-600' }
    : bmi < 25  ? { label: '과체중', color: 'bg-amber-100 text-amber-600'     }
    :             { label: '비만',   color: 'bg-rose-100 text-rose-500'       }
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {bmi.toFixed(1)} {label}
    </span>
  )
}

// 기본 날짜 범위: 최근 30일
function getDefaultDateRange() {
  const to   = new Date().toLocaleDateString('en-CA')
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return { from: from.toLocaleDateString('en-CA'), to }
}

/** 최근 30일 내 meal_entries 배열이 비어 있지 않은 user_id 집합 */
function userIdsWithMealEntriesInLogs(
  logs: { user_id: string; meal_entries: unknown }[] | null,
): Set<string> {
  const set = new Set<string>()
  for (const row of logs ?? []) {
    if (mealEntriesHasRecords(row.meal_entries)) set.add(row.user_id)
  }
  return set
}

async function fetchMembersWithMealFlags(supabase: ReturnType<typeof createClient>) {
  const { data: rows } = await supabase
    .from('profiles')
    .select('id, name, height, current_weight, avatar, created_at, member_number, target_calories')
    .eq('role', 'member')
    .order('created_at', { ascending: false })

  const list = rows ?? []
  const ids = list.map(m => m.id)
  if (ids.length === 0) return list.map(m => ({ ...m, has_recent_meal_entries: false }))

  const from = new Date()
  from.setDate(from.getDate() - 30)
  const fromStr = from.toLocaleDateString('en-CA')

  const { data: logs } = await supabase
    .from('daily_logs')
    .select('user_id, meal_entries')
    .gte('date', fromStr)
    .in('user_id', ids)

  const withMeals = userIdsWithMealEntriesInLogs(logs ?? [])
  return list.map(m => ({
    ...m,
    has_recent_meal_entries: withMeals.has(m.id),
  }))
}

export default function AdminClient({ members: initialMembers, staffId, initialNotes, staffName, viewerRole }: Props) {
  const supabase = createClient()

  const [members,      setMembers]      = useState<Member[]>(initialMembers ?? [])
  const [search,       setSearch]       = useState('')
  const [selected,     setSelected]     = useState<Member | null>(null)
  const [logs,         setLogs]         = useState<DailyLog[]>([])
  const [loadingLogs,  setLoadingLogs]  = useState(false)
  const [period,       setPeriod]       = useState(7)

  const [editName,   setEditName]   = useState('')
  const [editNumber, setEditNumber] = useState('')
  const [editTargetCalories, setEditTargetCalories] = useState('')
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)

  const [notes,       setNotes]       = useState<StaffNote[]>(initialNotes ?? [])
  const [newNote,     setNewNote]     = useState('')
  const [savingNote,  setSavingNote]  = useState(false)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  // 신규 고객 등록 모달
  const [showModal,     setShowModal]     = useState(false)
  const [newName,       setNewName]       = useState('')
  const [newEmail,      setNewEmail]      = useState('')
  const [newPassword,   setNewPassword]   = useState('')
  const [newMemberNum,  setNewMemberNum]  = useState('')
  const [registering,   setRegistering]   = useState(false)
  const [registerError, setRegisterError] = useState<string | null>(null)

  // 엑셀 날짜 범위
  const [excelRange,      setExcelRange]      = useState(getDefaultDateRange())
  const [showExcelPanel,  setShowExcelPanel]  = useState(false)
  const [downloadingExcel, setDownloadingExcel] = useState(false)

  const [excelRangeHasMeal,      setExcelRangeHasMeal]      = useState<boolean | null>(null)
  const [checkingExcelRangeMeal, setCheckingExcelRangeMeal] = useState(false)

  // 선택된 회원(selected)에 대해, 현재 excelRange(시작일~종료일) 기간 내 meal_entries 존재 여부를 실시간 갱신
  useEffect(() => {
    if (!selected) return
    if (!showExcelPanel) return
    if (!excelRange.from || !excelRange.to) return

    let cancelled = false
    setCheckingExcelRangeMeal(true)
    setExcelRangeHasMeal(null)

    const t = window.setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('daily_logs')
          .select('meal_entries')
          .eq('user_id', selected.id)
          .gte('date', excelRange.from)
          .lte('date', excelRange.to)

        if (cancelled) return
        if (error) throw error

        const has = (data ?? []).some(row =>
          mealEntriesHasRecords((row as { meal_entries: unknown }).meal_entries),
        )
        setExcelRangeHasMeal(has)
      } catch (e) {
        console.error('[AdminClient] excelRange meal check failed', e)
        if (!cancelled) setExcelRangeHasMeal(false)
      } finally {
        if (!cancelled) setCheckingExcelRangeMeal(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [selected?.id, excelRange.from, excelRange.to, showExcelPanel])

  const filtered = (members ?? []).filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.member_number?.includes(search)
  )

  const selectedNotes = selected
    ? (notes ?? []).filter(n => n.member_id === selected.id)
    : []

  async function openMember(member: Member) {
    setSelected(member)
    setEditName(member.name ?? '')
    setEditNumber(member.member_number ?? '')
    setEditTargetCalories(
      member.target_calories != null && member.target_calories > 0
        ? String(member.target_calories)
        : ''
    )
    setLoadingLogs(true)

    const from = new Date()
    from.setDate(from.getDate() - 30)

    const { data } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', member.id)
      .gte('date', from.toISOString().split('T')[0])
      .order('date', { ascending: false })

    setLogs(data ?? [])
    setLoadingLogs(false)
  }

  async function saveInfo() {
    if (!selected) return
    setSaving(true)
    const calTrim = editTargetCalories.trim()
    let target_calories: number | null = null
    if (calTrim !== '') {
      const n = Number(calTrim.replace(/,/g, ''))
      if (Number.isFinite(n) && n > 0) target_calories = Math.round(n)
    }

    await supabase
      .from('profiles')
      .update({
        name:            editName,
        member_number:   editNumber || null,
        target_calories: target_calories,
      })
      .eq('id', selected.id)

    setMembers(prev => prev.map(m =>
      m.id === selected.id
        ? { ...m, name: editName, member_number: editNumber, target_calories }
        : m
    ))
    setSelected(prev => prev
      ? { ...prev, name: editName, member_number: editNumber, target_calories }
      : prev)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function downloadExcel() {
    if (!selected) return
    setDownloadingExcel(true)
    try {
      // 선택한 날짜 범위로 로그 재조회
      const { data } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', selected.id)
        .gte('date', excelRange.from)
        .lte('date', excelRange.to)
        .order('date', { ascending: true })

      await generateMemberExcel(
        {
          name:           selected.name,
          member_number:  selected.member_number,
          height:         selected.height,
          current_weight: selected.current_weight,
          staff_name:     staffName ?? null,
        },
        data ?? [],
        excelRange
      )
    } finally {
      setDownloadingExcel(false)
      setShowExcelPanel(false)
    }
  }

  async function registerMember() {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setRegisterError('이름, 이메일, 비밀번호는 필수입니다')
      return
    }
    if (newPassword.length < 8) {
      setRegisterError('비밀번호는 8자 이상이어야 합니다')
      return
    }
    setRegistering(true)
    setRegisterError(null)

    const result = await createMember({
      name:         newName.trim(),
      email:        newEmail.trim(),
      password:     newPassword,
      memberNumber: newMemberNum.trim() || undefined,
    })

    if (!result.success) {
      setRegisterError(result.error ?? '등록 실패')
      setRegistering(false)
      return
    }

    const withFlags = await fetchMembersWithMealFlags(supabase)
    setMembers(withFlags)
    setShowModal(false)
    setNewName('')
    setNewEmail('')
    setNewPassword('')
    setNewMemberNum('')
    setRegistering(false)
  }

  async function addNote() {
    if (!selected || !newNote.trim()) return
    setSavingNote(true)
    const { data, error } = await supabase
      .from('staff_notes')
      .insert({ member_id: selected.id, staff_id: staffId, content: newNote.trim() })
      .select('id, member_id, staff_id, content, created_at, updated_at')
      .single()

    if (!error && data) {
      setNotes(prev => [{ ...data, staff: null }, ...(prev ?? [])])
      setNewNote('')
    }
    setSavingNote(false)
  }

  async function updateNote(id: string) {
    if (!editContent.trim()) return
    const { error } = await supabase
      .from('staff_notes')
      .update({ content: editContent.trim() })
      .eq('id', id)

    if (!error) {
      setNotes(prev => (prev ?? []).map(n =>
        n.id === id ? { ...n, content: editContent.trim() } : n
      ))
      setEditingNote(null)
      setEditContent('')
    }
  }

  async function deleteNote(id: string) {
    const { error } = await supabase.from('staff_notes').delete().eq('id', id)
    if (!error) setNotes(prev => (prev ?? []).filter(n => n.id !== id))
  }

  const bmi = selected ? getBMI(selected.height, selected.current_weight) : null

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-800">고객 관리</h1>
          <p className="text-[14px] text-gray-400 mt-1">총 {members.length}명의 고객</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {viewerRole === 'admin' && (
            <Link
              href="/admin/users"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full
                border border-pink-200 bg-white text-pink-600
                text-[13px] font-semibold shadow-sm
                hover:bg-pink-50 transition-all"
            >
              직원 승인
            </Link>
          )}
          <button type="button" onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full
              bg-gradient-to-r from-pink-500 to-rose-400 text-white
              text-[13px] font-semibold shadow-[0_3px_10px_rgba(236,72,153,0.3)]
              hover:-translate-y-0.5 transition-all">
            + 신규 등록
          </button>
        </div>
      </div>

      {/* 검색 */}
      <div className="relative mb-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">🔍</span>
        <input type="text" value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="이름 또는 회원번호 검색"
          className="w-full h-[46px] pl-10 pr-4 rounded-[12px] border border-gray-200
            text-[14px] outline-none focus:border-pink-400 focus:ring-2
            focus:ring-pink-100 transition-all bg-white" />
      </div>

      {/* 고객 목록 */}
      {!selected && (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <EmptyState
              title={search ? '검색 결과가 없어요' : '등록된 고객이 없어요'}
              description={search ? '다른 이름이나 회원번호로 검색해보세요' : '신규 등록 버튼으로 첫 고객을 추가해보세요!'}
              actionLabel={!search ? '+ 신규 등록' : undefined}
              onAction={!search ? () => setShowModal(true) : undefined}
            />
          )}
          {filtered.map(member => {
            const bmi = getBMI(member.height, member.current_weight)
            const hasMeal = member.has_recent_meal_entries === true
            return (
              <button key={member.id} type="button"
                onClick={() => openMember(member)}
                className="w-full bg-white rounded-[16px] border border-pink-100
                  p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5
                  transition-all text-left flex items-stretch gap-3">
                <div className="relative w-10 h-10 flex-shrink-0 self-center">
                  <Image src={AVATARS[member.avatar ?? 'duck'] ?? '/duck.png'}
                    alt={member.name} fill className="object-contain" />
                </div>
                <div className="flex-1 min-w-0 overflow-visible">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-semibold text-gray-800">{member.name}</p>
                    {member.member_number && (
                      <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        #{member.member_number}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-gray-400">
                    {member.current_weight != null && member.current_weight !== 0 && (
                      <span>{member.current_weight}kg</span>
                    )}
                    {member.height != null && member.height !== 0 && (
                      <span>{member.height}cm</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end justify-center gap-1.5 self-center">
                  <MealLogStatusBadge hasLog={hasMeal} />
                  <div className="flex items-center gap-1">
                    <BMIBadge bmi={bmi} />
                    <span className="text-gray-300 text-[16px] leading-none">›</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* 고객 상세 */}
      {selected && (
        <div>
          <button type="button"
            onClick={() => { setSelected(null); setLogs([]) }}
            className="flex items-center gap-1.5 text-[13px] text-pink-500
              font-medium mb-4 hover:text-pink-700 transition-colors">
            ← 목록으로
          </button>

          {/* 프로필 카드 */}
          <div className="bg-white rounded-[20px] border border-pink-100 p-5 shadow-sm mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-14 h-14">
                <Image src={AVATARS[selected.avatar ?? 'duck'] ?? '/duck.png'}
                  alt={selected.name} fill className="object-contain" />
              </div>
              <div>
                <p className="text-[18px] font-bold text-gray-800">{selected.name}</p>
                <p className="text-[12px] text-gray-400 mt-0.5">
                  가입일 {new Date(selected.created_at).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>

            {/* 직원 전용 수정 */}
            <div className="bg-gray-50 rounded-[14px] p-4 border border-gray-100 mb-4 space-y-3">
              <p className="text-[12px] font-semibold text-gray-500">✏️ 직원 전용 수정</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">이름</label>
                  <input type="text" value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full h-[38px] px-3 rounded-[8px] border border-gray-200
                      text-[13px] outline-none focus:border-pink-400 transition-all bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">회원번호</label>
                  <input type="text" value={editNumber}
                    onChange={e => setEditNumber(e.target.value)}
                    placeholder="예: 2024-001"
                    className="w-full h-[38px] px-3 rounded-[8px] border border-gray-200
                      text-[13px] outline-none focus:border-pink-400 transition-all bg-white" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] text-gray-400 mb-1">목표 칼로리</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={editTargetCalories}
                    onChange={e => setEditTargetCalories(e.target.value)}
                    placeholder="예: 1500"
                    className="w-full h-[38px] px-3 rounded-[8px] border border-gray-200
                      text-[13px] outline-none focus:border-pink-400 transition-all bg-white
                      [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                      [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
              <button type="button" onClick={saveInfo} disabled={saving}
                className="w-full h-[38px] rounded-[8px] bg-pink-500 text-white
                  text-[13px] font-semibold disabled:opacity-40 hover:bg-pink-600 transition-all">
                {saved ? '✅ 저장 완료!' : saving ? '저장 중...' : '저장하기'}
              </button>
            </div>

            {/* 신체 정보 */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '키',   value: selected.height         ? `${selected.height}cm`         : '-' },
                { label: '체중', value: selected.current_weight ? `${selected.current_weight}kg` : '-' },
                { label: 'BMI',  value: bmi                     ? bmi.toFixed(1)                 : '-' },
              ].map(s => (
                <div key={s.label}
                  className="bg-pink-50 rounded-[12px] p-3 text-center border border-pink-100">
                  <p className="text-[10px] text-gray-400 mb-1">{s.label}</p>
                  <p className="text-[16px] font-bold text-pink-600">{s.value}</p>
                </div>
              ))}
            </div>
            {bmi && <div className="mt-3 text-center"><BMIBadge bmi={bmi} /></div>}
          </div>

          {/* 엑셀 저장 패널 */}
          <div className="bg-white rounded-[20px] border border-emerald-100 p-5 shadow-sm mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[16px]">📊</span>
                <p className="text-[15px] font-semibold text-gray-800">식단관리표 엑셀 저장</p>
              </div>
              <button type="button"
                onClick={() => setShowExcelPanel(p => !p)}
                className="text-[12px] text-emerald-600 font-medium hover:text-emerald-700">
                {showExcelPanel ? '접기 ▲' : '펼치기 ▼'}
              </button>
            </div>

            {showExcelPanel && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">시작일</label>
                    <input type="date" value={excelRange.from}
                      max={excelRange.to}
                      onChange={e => setExcelRange(prev => ({ ...prev, from: e.target.value }))}
                      className="w-full h-[38px] px-3 rounded-[8px] border border-gray-200
                        text-[13px] text-gray-800 outline-none focus:border-emerald-400 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">종료일</label>
                    <input type="date" value={excelRange.to}
                      min={excelRange.from}
                      max={new Date().toLocaleDateString('en-CA')}
                      onChange={e => setExcelRange(prev => ({ ...prev, to: e.target.value }))}
                      className="w-full h-[38px] px-3 rounded-[8px] border border-gray-200
                        text-[13px] text-gray-800 outline-none focus:border-emerald-400 transition-all" />
                  </div>
                </div>

                {/* 기간별 식단 기록 여부 */}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] text-gray-500 font-medium">선택 기간 식단 기록</p>
                  {checkingExcelRangeMeal ? (
                    <span className="text-[11px] text-gray-400">확인 중...</span>
                  ) : excelRangeHasMeal ? (
                    <span className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                      🟢 식단 기록 있음
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-800">
                      🔴 식단 미기록
                    </span>
                  )}
                </div>

                {/* 빠른 선택 */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: '최근 7일',  days: 7  },
                    { label: '최근 14일', days: 14 },
                    { label: '최근 30일', days: 30 },
                    { label: '최근 90일', days: 90 },
                  ].map(({ label, days }) => (
                    <button key={days} type="button"
                      onClick={() => {
                        const to   = new Date().toLocaleDateString('en-CA')
                        const from = new Date()
                        from.setDate(from.getDate() - days)
                        setExcelRange({ from: from.toLocaleDateString('en-CA'), to })
                      }}
                      className="px-3 py-1 rounded-full text-[11px] font-medium
                        bg-emerald-50 text-emerald-600 border border-emerald-100
                        hover:bg-emerald-100 transition-all">
                      {label}
                    </button>
                  ))}
                </div>

                <button type="button" onClick={downloadExcel} disabled={downloadingExcel}
                  className="w-full h-[42px] rounded-[10px]
                    bg-gradient-to-r from-emerald-500 to-teal-400 text-white
                    text-[13px] font-semibold
                    disabled:opacity-40 disabled:cursor-not-allowed
                    hover:opacity-90 transition-all flex items-center justify-center gap-2">
                  {downloadingExcel
                    ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />다운로드 중...</>
                    : <>📥 {excelRange.from} ~ {excelRange.to} 다운로드</>}
                </button>
              </div>
            )}
          </div>

          {/* 관리 메모 섹션 */}
          <div className="bg-white rounded-[20px] border border-pink-100 p-5 shadow-sm mb-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[16px]">📝</span>
              <p className="text-[15px] font-semibold text-gray-800">관리 메모</p>
              <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">직원 전용</span>
            </div>

            {selectedNotes.length === 0 ? (
              <p className="text-[13px] text-gray-400 text-center py-4 mb-3">아직 메모가 없어요</p>
            ) : (
              <div className="space-y-2 mb-4">
                {selectedNotes.map(note => (
                  <div key={note.id} className="bg-gray-50 rounded-[12px] p-3 border border-gray-100">
                    {editingNote === note.id ? (
                      <div className="space-y-2">
                        <textarea value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          rows={3} maxLength={1000}
                          className="w-full px-3 py-2 rounded-[8px] border border-gray-200
                            text-[13px] outline-none focus:border-pink-400 resize-none transition-all" />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => updateNote(note.id)}
                            className="flex-1 h-8 rounded-[6px] bg-pink-500 text-white text-[12px] font-semibold hover:bg-pink-600 transition-all">
                            저장
                          </button>
                          <button type="button" onClick={() => { setEditingNote(null); setEditContent('') }}
                            className="flex-1 h-8 rounded-[6px] border border-gray-200 text-gray-500 text-[12px] hover:bg-gray-100 transition-all">
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-[11px] text-gray-400">
                            {new Date(note.created_at).toLocaleDateString('ko-KR')}
                            {note.staff?.name && ` · ${note.staff.name}`}
                          </p>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button type="button"
                              onClick={() => { setEditingNote(note.id); setEditContent(note.content) }}
                              className="text-[11px] text-gray-400 hover:text-pink-500 transition-colors">수정</button>
                            <button type="button" onClick={() => deleteNote(note.id)}
                              className="text-[11px] text-gray-400 hover:text-rose-500 transition-colors">삭제</button>
                          </div>
                        </div>
                        <p className="text-[13px] text-gray-700 leading-relaxed">{note.content}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <textarea value={newNote} onChange={e => setNewNote(e.target.value)}
                rows={3} maxLength={1000} placeholder="새 메모를 입력하세요..."
                className="w-full px-4 py-3 rounded-[12px] border border-gray-200 text-[13px]
                  text-gray-700 placeholder-gray-300 outline-none resize-none
                  focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-300">{newNote.length}/1000</span>
                <button type="button" onClick={addNote} disabled={!newNote.trim() || savingNote}
                  className="px-4 h-9 rounded-[8px] bg-pink-500 text-white text-[13px] font-semibold
                    disabled:opacity-40 hover:bg-pink-600 transition-all">
                  {savingNote ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </div>
          </div>

          {/* 다이어리 기록 */}
          <div className="bg-white rounded-[20px] border border-pink-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[15px] font-semibold text-gray-800">최근 기록</p>
              <div className="flex gap-1 p-0.5 bg-gray-100 rounded-full">
                {[7, 30].map(d => (
                  <button key={d} type="button" onClick={() => setPeriod(d)}
                    className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-all
                      ${period === d ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-400'}`}>
                    {d}일
                  </button>
                ))}
              </div>
            </div>

            {loadingLogs ? (
              <div className="space-y-3">
                <SkeletonCard /><SkeletonCard /><SkeletonCard />
              </div>
            ) : logs.length === 0 ? (
              <EmptyState title="아직 기록이 없어요" description="다이어리를 작성하면 여기에 표시돼요" />
            ) : (
              <div className="space-y-3">
                {(logs ?? [])
                  .filter(log => {
                    const d     = new Date(log.date + 'T00:00:00')
                    const limit = new Date()
                    limit.setDate(limit.getDate() - period)
                    return d >= limit
                  })
                  .map(log => (
                    <div key={log.id} className="border border-gray-100 rounded-[12px] p-3">
                      <p className="text-[13px] font-semibold text-gray-700 mb-2">
                        {new Date(log.date + 'T00:00:00').toLocaleDateString('ko-KR', {
                          month: 'long', day: 'numeric', weekday: 'short'
                        })}
                      </p>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        {[
                          { label: '칼로리', value: log.meal_analysis ? `${Math.round(log.meal_analysis.calories)}kcal` : '-', color: 'text-pink-500'   },
                          { label: '수분',   value: log.water_intake  ? `${log.water_intake}L`                           : '-', color: 'text-blue-500'   },
                          { label: '수면',   value: log.sleep_hours   ? `${log.sleep_hours}h`                            : '-', color: 'text-violet-500' },
                        ].map(s => (
                          <div key={s.label} className="text-center bg-gray-50 rounded-[8px] py-2">
                            <p className={`text-[12px] font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>
                      {log.condition && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-gray-400">컨디션</span>
                          <span className="text-[16px]">{['😵','😔','😐','🙂','😄'][log.condition - 1]}</span>
                        </div>
                      )}
                      {/* 식사별 기록 */}
                      {(() => {
                        const entries = (log as unknown as Record<string, unknown>).meal_entries as
                          | { meal_type: string; image_url?: string | null; content?: string | null; calories?: number | null }[]
                          | undefined
                        if (!Array.isArray(entries) || entries.length === 0) return null
                        return (
                          <div className="mt-2 space-y-2.5">
                            {entries.map((entry, idx) => (
                              <div key={idx} style={{
                                backgroundColor: '#ffffff',
                                borderRadius: 16,
                                border: '1px solid #fce7f3',
                                padding: 14,
                              }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '3px 10px',
                                  borderRadius: 20,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  backgroundColor: '#fdf2f8',
                                  color: '#ec4899',
                                  marginBottom: 8,
                                }}>
                                  {entry.meal_type}
                                </span>
                                {entry.image_url && (
                                  <img
                                    src={entry.image_url}
                                    alt={entry.meal_type}
                                    style={{
                                      width: '100%',
                                      maxHeight: 160,
                                      objectFit: 'cover',
                                      borderRadius: 12,
                                      display: 'block',
                                      marginBottom: 8,
                                    }}
                                  />
                                )}
                                {entry.content && (
                                  <p style={{ fontSize: 14, color: '#334155', margin: 0, marginBottom: 4 }}>
                                    {entry.content}
                                  </p>
                                )}
                                {entry.calories != null && entry.calories > 0 && (
                                  <p style={{ fontSize: 13, color: '#f472b6', fontWeight: 600, margin: 0 }}>
                                    {Math.round(entry.calories)} kcal
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                      {log.memo && (
                        <div className="mt-2 bg-gray-50 rounded-[8px] p-2.5">
                          <p className="text-[12px] text-gray-500">📝 {log.memo}</p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 신규 고객 등록 모달 */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setShowModal(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
            z-50 w-[calc(100%-2rem)] max-w-md bg-white rounded-[20px] shadow-2xl p-6">
            <h2 className="text-[17px] font-bold text-gray-800 mb-1">신규 고객 등록</h2>
            <p className="text-[12px] text-gray-400 mb-5">이메일 인증 없이 직접 계정을 생성합니다</p>

            <div className="space-y-3">
              {[
                { label: '이름',       value: newName,      setter: setNewName,      type: 'text',     placeholder: '홍길동',           required: true  },
                { label: '이메일',     value: newEmail,     setter: setNewEmail,     type: 'email',    placeholder: 'example@email.com', required: true  },
                { label: '임시 비밀번호', value: newPassword, setter: setNewPassword, type: 'password', placeholder: '8자 이상',          required: true  },
                { label: '회원번호',   value: newMemberNum, setter: setNewMemberNum, type: 'text',     placeholder: '예: 2024-001',      required: false },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-[12px] font-medium text-gray-500 mb-1">
                    {f.label} {f.required
                      ? <span className="text-rose-400">*</span>
                      : <span className="text-gray-300">(선택)</span>}
                  </label>
                  <input type={f.type} value={f.value}
                    onChange={e => f.setter(e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full h-[42px] px-3 rounded-[10px] border border-gray-200
                      text-[14px] outline-none focus:border-pink-400 focus:ring-2
                      focus:ring-pink-100 transition-all" />
                </div>
              ))}
            </div>

            {registerError && (
              <p className="mt-3 text-[13px] text-rose-500 bg-rose-50 px-3 py-2 rounded-[8px] border border-rose-100">
                {registerError}
              </p>
            )}

            <div className="flex gap-2 mt-5">
              <button type="button"
                onClick={() => { setShowModal(false); setRegisterError(null); setNewName(''); setNewEmail(''); setNewPassword(''); setNewMemberNum('') }}
                className="flex-1 h-[44px] rounded-[10px] border border-gray-200 text-gray-500 text-[14px] hover:bg-gray-50 transition-all">
                취소
              </button>
              <button type="button" onClick={registerMember} disabled={registering}
                className="flex-1 h-[44px] rounded-[10px]
                  bg-gradient-to-r from-pink-600 to-rose-400 text-white
                  text-[14px] font-semibold disabled:opacity-60 transition-all
                  flex items-center justify-center gap-2">
                {registering
                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />등록 중...</>
                  : '등록하기'}
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  )
}
