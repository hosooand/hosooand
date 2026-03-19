'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PendingUser } from '../page'
import { CheckCircle2, Users, Loader2 } from 'lucide-react'

interface Props {
  initialUsers: PendingUser[]
}

export default function AdminUsersClient({ initialUsers }: Props) {
  const supabase = createClient()
  const [users,    setUsers]    = useState<PendingUser[]>(initialUsers)
  const [approving, setApproving] = useState<string | null>(null)
  const [approved,  setApproved]  = useState<string[]>([])

  async function handleApprove(userId: string) {
    setApproving(userId)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', userId)

      if (error) throw error

      // 목록에서 제거
      setApproved(prev => [...prev, userId])
      setTimeout(() => {
        setUsers(prev => prev.filter(u => u.id !== userId))
        setApproved(prev => prev.filter(id => id !== userId))
      }, 800)
    } catch (e) {
      console.error('승인 실패:', e)
      alert('승인에 실패했어요. 다시 시도해주세요.')
    } finally {
      setApproving(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">

      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
          <Users size={18} className="text-pink-500" />
        </div>
        <div>
          <h1 className="text-[20px] font-bold text-gray-800">회원 승인 관리</h1>
          <p className="text-[13px] text-gray-400">
            승인 대기 중인 회원 {users.length}명
          </p>
        </div>
      </div>

      {/* 목록 */}
      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <p className="text-[16px] font-semibold text-gray-700">모든 회원이 승인됐어요!</p>
          <p className="text-[13px] text-gray-400">승인 대기 중인 회원이 없어요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map(user => {
            const isApproving = approving === user.id
            const isDone      = approved.includes(user.id)

            return (
              <div key={user.id}
                className={`bg-white rounded-[16px] border p-4 shadow-sm
                  flex items-center gap-3 transition-all duration-500
                  ${isDone ? 'border-emerald-200 bg-emerald-50 opacity-60' : 'border-pink-100'}`}>

                {/* 아바타 */}
                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center
                  justify-center text-pink-600 font-bold text-[16px] flex-shrink-0">
                  {user.name?.[0] ?? '?'}
                </div>

                {/* 정보 */}
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

                {/* 승인 버튼 */}
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
    </div>
  )
}
