'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isProcessing = useRef(false) // 중복 실행 방지용 플래그
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const handleRecovery = async () => {
      const code = searchParams.get('code')
      
      // 이미 처리 중이거나 코드가 없으면 중단
      if (!code || isProcessing.current) return;
      
      isProcessing.current = true; // 처리 시작 표시

      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        // 이미 세션이 있는지 확인 (첫 번째 실행에서 성공했을 수도 있음)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setError('링크가 만료되었거나 잘못되었습니다. 다시 시도해 주세요.')
        }
      }
      
      setLoading(false)
    }

    handleRecovery()
  }, [searchParams, supabase.auth])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.auth.updateUser({ password })
    
    if (error) {
      alert('비밀번호 변경 실패: ' + error.message)
    } else {
      alert('비밀번호가 안전하게 변경되었습니다!')
      router.push('/login')
    }
    setLoading(false)
  }

  if (loading && !error) return <div className="p-10 text-center text-white">링크 보안 확인 중...</div>
  if (error) return (
    <div className="p-10 text-center">
      <p className="text-red-500 mb-4">{error}</p>
      <button onClick={() => router.push('/forgot-password')} className="text-blue-400 underline">
        비밀번호 찾기 다시 하기
      </button>
    </div>
  )

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleUpdatePassword} className="w-full max-w-md space-y-6 border p-8 rounded-lg shadow-xl bg-[#1a1a1a]">
        <h1 className="text-2xl font-bold text-white text-center">새 비밀번호 설정</h1>
        <p className="text-gray-400 text-sm text-center">보안을 위해 새로운 비밀번호를 입력해주세요.</p>
        <input
          type="password"
          placeholder="새 비밀번호 (6자 이상)"
          className="w-full border border-gray-700 bg-black p-3 rounded text-white focus:outline-none focus:border-pink-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-pink-500 text-white p-3 rounded font-bold hover:bg-pink-600 transition-colors"
        >
          {loading ? '변경 중...' : '비밀번호 변경하기'}
        </button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-white">로딩 중...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}