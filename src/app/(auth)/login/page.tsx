'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [errors, setErrors]     = useState<{
    email?: string
    password?: string
    global?: string
  }>({})

  function validate() {
    const errs: typeof errors = {}
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = '올바른 이메일 주소를 입력하세요'
    if (!password || password.length < 6)
      errs.password = '비밀번호를 입력하세요'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setErrors({})

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setErrors({ global: '이메일 또는 비밀번호가 올바르지 않습니다' })
      setLoading(false)
      return
    }
    router.replace('/select-service')
    router.refresh()
  }


  return (
    <div className="w-full max-w-[400px]">

      <div className="mb-7">
        <h2 className="text-[26px] font-semibold text-gray-800 mb-1.5">
          다시 만나서 반가워요 👋
        </h2>
        <p className="text-[14px] font-light text-gray-400">
          이메일과 비밀번호로 로그인하세요
        </p>
      </div>

      {errors.global && (
        <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm text-center">
          {errors.global}
        </div>
      )}

      <form onSubmit={handleLogin} noValidate>

        {/* 이메일 */}
        <div className="mb-4">
          <label className="block text-[13px] font-medium text-gray-600 mb-1.5">이메일</label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })) }}
            placeholder="example@email.com"
            autoComplete="email"
            className={`w-full h-[50px] px-4 rounded-[10px] border text-[15px] text-gray-800 outline-none transition-all
              ${errors.email
                ? 'border-rose-400 ring-2 ring-rose-100'
                : 'border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100'}`}
          />
          {errors.email && <p className="mt-1.5 text-xs text-rose-500">{errors.email}</p>}
        </div>

        {/* 비밀번호 */}
        <div className="mb-5">
          <label className="block text-[13px] font-medium text-gray-600 mb-1.5">비밀번호</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })) }}
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              className={`w-full h-[50px] px-4 pr-11 rounded-[10px] border text-[15px] text-gray-800 outline-none transition-all
                ${errors.password
                  ? 'border-rose-400 ring-2 ring-rose-100'
                  : 'border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100'}`}
            />
            <button
              type="button"
              onClick={() => setShowPw(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-500 transition-colors p-1">
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
          {errors.password && <p className="mt-1.5 text-xs text-rose-500">{errors.password}</p>}
        </div>

        {/* 로그인 유지 / 비밀번호 찾기 */}
        <div className="flex items-center justify-between mb-6">
          <label className="flex items-center gap-2 cursor-pointer" onClick={() => setRemember(p => !p)}>
            <div className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center transition-all
              ${remember ? 'bg-pink-500 border-pink-500' : 'border-gray-200'}`}>
              {remember && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-[13px] text-gray-600 select-none">로그인 상태 유지</span>
          </label>
          <Link href="/forgot-password"
            className="text-[13px] text-pink-500 font-medium hover:text-pink-700 transition-colors">
            비밀번호 찾기
          </Link>
        </div>

        {/* 로그인 버튼 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-[52px] rounded-[10px]
            bg-gradient-to-r from-pink-600 via-pink-500 to-rose-400
            text-white text-[16px] font-semibold tracking-[0.3px] mb-5
            shadow-[0_6px_20px_rgba(236,72,153,0.35)]
            hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(236,72,153,0.4)]
            active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed
            transition-all duration-200 flex items-center justify-center">
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </svg>
              로그인 중...
            </span>
          ) : (
            '로그인'
          )}
        </button>
      </form>


      <p className="text-center text-[13px] text-gray-400">
        아직 계정이 없으신가요?{' '}
        <Link href="/signup"
          className="text-pink-500 font-semibold underline underline-offset-2 hover:text-pink-700 transition-colors">
          회원가입
        </Link>
      </p>
    </div>
  )
}