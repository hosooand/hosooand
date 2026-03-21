'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const callbackExpiredRef = useRef(false)

  useEffect(() => {
    if (searchParams.get('error') === 'expired') {
      callbackExpiredRef.current = true
      setError('링크가 만료됐어요. 다시 시도해주세요')
      setLoading(false)
      if (typeof window !== 'undefined') {
        const u = new URL(window.location.href)
        u.searchParams.delete('error')
        window.history.replaceState(null, '', `${u.pathname}${u.search}${u.hash}`)
      }
      return
    }

    if (callbackExpiredRef.current) {
      return
    }

    let cancelled = false

    const stripUrlCode = () => {
      if (typeof window === 'undefined') return
      const url = new URL(window.location.href)
      if (!url.searchParams.has('code') && !url.searchParams.has('token_hash')) return
      url.searchParams.delete('code')
      url.searchParams.delete('token_hash')
      url.searchParams.delete('type')
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    }

    const ensureRecoverySession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setLoading(false)
        return true
      }

      const code = searchParams.get('code')
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')

      if (tokenHash && type === 'recovery') {
        const { error: otpErr } = await supabase.auth.verifyOtp({
          type: 'recovery',
          token_hash: tokenHash,
        })
        if (!otpErr) {
          stripUrlCode()
          if (!cancelled) setLoading(false)
          return true
        }
        if (!cancelled) {
          setError('링크가 만료되었거나 잘못되었습니다. 다시 시도해 주세요.')
          setLoading(false)
        }
        return false
      }

      if (code) {
        const dedupeKey = `sb_recovery_pkce_${code}`
        if (typeof window !== 'undefined' && sessionStorage.getItem(dedupeKey)) {
          const { data: { session: s2 } } = await supabase.auth.getSession()
          if (!s2 && !cancelled) {
            setError('링크가 만료되었거나 잘못되었습니다. 다시 시도해 주세요.')
            setLoading(false)
          } else if (!cancelled) setLoading(false)
          return !!s2
        }
        if (typeof window !== 'undefined') sessionStorage.setItem(dedupeKey, '1')

        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code)
        const { data: { session: after } } = await supabase.auth.getSession()

        if (exErr && !after) {
          if (!cancelled) {
            setError('링크가 만료되었거나 잘못되었습니다. 다시 시도해 주세요.')
            setLoading(false)
          }
          return false
        }
        stripUrlCode()
        if (!cancelled) setLoading(false)
        return true
      }

      // 구 implicit 플로우: hash(#access_token=…&type=recovery)
      if (typeof window !== 'undefined' && window.location.hash) {
        const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const access_token = h.get('access_token')
        const refresh_token = h.get('refresh_token')
        const hType = h.get('type')
        if (access_token && refresh_token && hType === 'recovery') {
          const { error: setErr } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          })
          window.history.replaceState(null, '', pathname)
          if (setErr && !cancelled) {
            setError('링크가 만료되었거나 잘못되었습니다. 다시 시도해 주세요.')
            setLoading(false)
            return false
          }
          if (!cancelled) setLoading(false)
          return true
        }
      }

      if (!cancelled) {
        setError('링크가 만료되었거나 잘못되었습니다. 다시 시도해 주세요.')
        setLoading(false)
      }
      return false
    }

    void ensureRecoverySession()
    return () => {
      cancelled = true
    }
    // searchParams 전체는 참조가 바뀔 수 있어 문자열로 고정
    // eslint-disable-next-line react-hooks/exhaustive-deps -- supabase 클라이언트는 매 렌더마다 새 인스턴스일 수 있음
  }, [pathname, searchParams.toString()])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error: upErr } = await supabase.auth.updateUser({ password })

    if (upErr) {
      alert('비밀번호 변경 실패: ' + upErr.message)
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
