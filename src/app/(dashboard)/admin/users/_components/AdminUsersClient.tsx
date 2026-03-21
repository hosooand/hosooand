'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createStaffByAdmin, setStaffApprovalByAdmin } from '@/app/actions/admin'
import type { PendingUser } from '../page'
import { CheckCircle2, Users, Loader2, UserPlus, UserMinus } from 'lucide-react'

interface Props {
  initialPending:  PendingUser[]
  initialApproved: PendingUser[]
}

export default function AdminUsersClient({ initialPending, initialApproved }: Props) {
  const router = useRouter()
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>(initialPending)
  const [approvedUsers, setApprovedUsers] = useState<PendingUser[]>(initialApproved)
  const [approving, setApproving] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [approvedAnim, setApprovedAnim] = useState<string[]>([])

  const [staffName, setStaffName] = useState('')
  const [staffEmail, setStaffEmail] = useState('')
  const [staffPw, setStaffPw] = useState('')
  const [staffPw2, setStaffPw2] = useState('')
  const [registering, setRegistering] = useState(false)
  const [registerError, setRegisterError] = useState<string | null>(null)

  useEffect(() => {
    setPendingUsers(initialPending)
  }, [initialPending])

  useEffect(() => {
    setApprovedUsers(initialApproved)
  }, [initialApproved])

  async function handleApprove(userId: string) {
    setApproving(userId)
    try {
      const res = await setStaffApprovalByAdmin(userId, true)
      if (!res.success) {
        throw new Error(res.error ?? '승인 요청 실패')
      }

      setApprovedAnim(prev => [...prev, userId])
      setTimeout(() => {
        setPendingUsers(prev => {
          const u = prev.find(x => x.id === userId)
          if (u) setApprovedUsers(au => [u, ...au])
          return prev.filter(x => x.id !== userId)
        })
        setApprovedAnim(prev => prev.filter(id => id !== userId))
      }, 800)
    } catch (e) {
      console.error('승인 실패:', e)
      const msg = e instanceof Error ? e.message : '승인에 실패했어요. 다시 시도해주세요.'
      alert(msg)
    } finally {
      setApproving(null)
    }
  }

  async function handleRevoke(user: PendingUser) {
    setRevoking(user.id)
    try {
      const res = await setStaffApprovalByAdmin(user.id, false)
      if (!res.success) {
        throw new Error(res.error ?? '권한 박탈 요청 실패')
      }

      setApprovedUsers(prev => prev.filter(u => u.id !== user.id))
      setPendingUsers(prev => [user, ...prev])
      router.refresh()
    } catch (e) {
      console.error('권한 박탈 실패:', e)
      const msg = e instanceof Error ? e.message : '권한 박탈에 실패했어요. 다시 시도해주세요.'
      alert(msg)
    } finally {
      setRevoking(null)
    }
  }

  async function handleRegisterStaff(e: React.FormEvent) {
    e.preventDefault()
    setRegisterError(null)

    if (!staffName.trim() || staffName.trim().length < 2) {
      setRegisterError('이름을 2자 이상 입력해주세요')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffEmail.trim())) {
      setRegisterError('올바른 이메일을 입력해주세요')
      return
    }
    if (staffPw.length < 8 || !/[a-zA-Z]/.test(staffPw) || !/[0-9]/.test(staffPw)) {
      setRegisterError('비밀번호는 영문+숫자 포함 8자 이상이어야 합니다')
      return
    }
    if (staffPw !== staffPw2) {
      setRegisterError('비밀번호가 일치하지 않습니다')
      return
    }

    setRegistering(true)
    const res = await createStaffByAdmin({
      name:     staffName.trim(),
      email:    staffEmail.trim(),
      password: staffPw,
    })
    setRegistering(false)

    if (!res.success) {
      setRegisterError(res.error ?? '등록에 실패했습니다')
      return
    }

    setStaffName('')
    setStaffEmail('')
    setStaffPw('')
    setStaffPw2('')
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">

      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
          <Users size={18} className="text-pink-500" />
        </div>
        <div>
          <h1 className="text-[20px] font-bold text-gray-800">직원 승인 · 등록</h1>
          <p className="text-[13px] text-gray-400">
            승인 대기 {pendingUsers.length}명 · 승인됨 {approvedUsers.length}명
          </p>
        </div>
      </div>

      {/* 신규 직원 등록 */}
      <div className="mb-8 p-5 rounded-[16px] border border-pink-100 bg-gradient-to-b from-pink-50/80 to-white shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus size={18} className="text-pink-500" />
          <h2 className="text-[15px] font-bold text-gray-800">신규 직원 등록</h2>
        </div>
        <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
          등록 시 <span className="font-medium text-gray-700">role은 staff</span>,{' '}
          <span className="font-medium text-gray-700">승인 전까지 is_approved는 false</span>로 저장됩니다.
          직원은 관리자 승인 후 로그인할 수 있어요.
        </p>
        <form onSubmit={handleRegisterStaff} className="space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">이름</label>
            <input
              type="text"
              value={staffName}
              onChange={e => setStaffName(e.target.value)}
              placeholder="실명"
              autoComplete="name"
              disabled={registering}
              className="w-full h-11 px-3 rounded-[10px] border border-gray-200 text-[14px]
                outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">이메일 (로그인 ID)</label>
            <input
              type="email"
              value={staffEmail}
              onChange={e => setStaffEmail(e.target.value)}
              placeholder="staff@example.com"
              autoComplete="email"
              disabled={registering}
              className="w-full h-11 px-3 rounded-[10px] border border-gray-200 text-[14px]
                outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 disabled:opacity-60"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">비밀번호</label>
              <input
                type="password"
                value={staffPw}
                onChange={e => setStaffPw(e.target.value)}
                placeholder="영문+숫자 8자 이상"
                autoComplete="new-password"
                disabled={registering}
                className="w-full h-11 px-3 rounded-[10px] border border-gray-200 text-[14px]
                  outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">비밀번호 확인</label>
              <input
                type="password"
                value={staffPw2}
                onChange={e => setStaffPw2(e.target.value)}
                placeholder="한 번 더 입력"
                autoComplete="new-password"
                disabled={registering}
                className="w-full h-11 px-3 rounded-[10px] border border-gray-200 text-[14px]
                  outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 disabled:opacity-60"
              />
            </div>
          </div>
          {registerError && (
            <p className="text-[12px] text-rose-600 bg-rose-50 px-3 py-2 rounded-[8px]">
              {registerError}
            </p>
          )}
          <button
            type="submit"
            disabled={registering}
            className="w-full h-11 rounded-[10px] bg-gray-900 text-white text-[14px] font-semibold
              hover:bg-gray-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {registering ? (
              <><Loader2 size={16} className="animate-spin" />등록 중...</>
            ) : (
              '직원 계정 만들기'
            )}
          </button>
        </form>
      </div>

      {/* 승인 대기 */}
      <h2 className="text-[14px] font-bold text-gray-700 mb-3">승인 대기</h2>
      {pendingUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 mb-10 rounded-[16px] border border-dashed border-gray-200 bg-gray-50/50">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 size={28} className="text-emerald-500" />
          </div>
          <p className="text-[15px] font-semibold text-gray-700">승인 대기 직원이 없어요</p>
          <p className="text-[12px] text-gray-400 text-center px-4">
            위에서 직원을 등록하면 여기 목록에 표시됩니다
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-10">
          {pendingUsers.map(user => {
            const isApproving = approving === user.id
            const isDone      = approvedAnim.includes(user.id)

            return (
              <div key={user.id}
                className={`bg-white rounded-[16px] border p-4 shadow-sm
                  flex items-center gap-3 transition-all duration-500
                  ${isDone ? 'border-emerald-200 bg-emerald-50 opacity-60' : 'border-pink-100'}`}>

                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center
                  justify-center text-pink-600 font-bold text-[16px] flex-shrink-0">
                  {user.name?.[0] ?? '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold text-gray-800 truncate">
                      {user.name}
                    </p>
                    {user.member_number && (
                      <span className="text-[11px] text-gray-400 bg-gray-100
                        px-2 py-0.5 rounded-full flex-shrink-0">
                        #{user.member_number}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-gray-400 mt-0.5">
                    가입일 {new Date(user.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleApprove(user.id)}
                  disabled={isApproving || isDone}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2
                    rounded-full text-[13px] font-semibold transition-all
                    ${isDone
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-sm hover:opacity-90 active:scale-95'
                    }
                    disabled:cursor-not-allowed`}>
                  {isDone ? (
                    <><CheckCircle2 size={14} />승인됨</>
                  ) : isApproving ? (
                    <><Loader2 size={14} className="animate-spin" />승인 중</>
                  ) : (
                    '승인하기'
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* 승인된 직원 */}
      <h2 className="text-[14px] font-bold text-gray-700 mb-3">승인된 직원</h2>
      {approvedUsers.length === 0 ? (
        <p className="text-[13px] text-gray-400 py-6 text-center rounded-[16px] border border-dashed border-gray-200 bg-gray-50/50">
          아직 승인된 직원이 없어요
        </p>
      ) : (
        <div className="space-y-3">
          {approvedUsers.map(user => {
            const isRevoking = revoking === user.id

            return (
              <div key={user.id}
                className="bg-white rounded-[16px] border border-gray-100 p-4 shadow-sm
                  flex items-center gap-3">

                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center
                  justify-center text-slate-600 font-bold text-[16px] flex-shrink-0">
                  {user.name?.[0] ?? '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold text-gray-800 truncate">
                      {user.name}
                    </p>
                    {user.member_number && (
                      <span className="text-[11px] text-gray-400 bg-gray-100
                        px-2 py-0.5 rounded-full flex-shrink-0">
                        #{user.member_number}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-gray-400 mt-0.5">
                    가입일 {new Date(user.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRevoke(user)}
                  disabled={isRevoking}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2
                    rounded-full text-[13px] font-semibold transition-all
                    border border-rose-200 bg-rose-50 text-rose-700
                    hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed">
                  {isRevoking ? (
                    <><Loader2 size={14} className="animate-spin" />처리 중</>
                  ) : (
                    <><UserMinus size={14} />권한 박탈</>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
