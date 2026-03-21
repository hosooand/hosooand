'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('이메일을 입력해주세요'); return }
    setLoading(true)
    setError(null)
    try {
      // 프로덕션 콜백 URL과 Supabase Redirect URLs를 정확히 일치시켜야 ?code= 가 콜백으로 옵니다.
      const callbackBase =
        process.env.NEXT_PUBLIC_AUTH_CALLBACK_URL ??
        'https://hosooand.vercel.app/auth/callback'
      const callbackUrl = `${callbackBase}?next=${encodeURIComponent('/reset-password')}&type=recovery`
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: callbackUrl,
      })
      if (err) throw err
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했어요. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">

      {/* 뒤로가기 */}
      <Link href="/login"
        className="inline-flex items-center gap-1.5 text-[13px] text-gray-400
          hover:text-pink-500 transition-colors mb-8">
        <ArrowLeft size={14} />로그인으로 돌아가기
      </Link>

      {sent ? (
        /* 발송 완료 */
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <div>
            <h2 className="text-[20px] font-bold text-gray-800 mb-1">이메일을 확인해주세요</h2>
            <p className="text-[14px] text-gray-500 leading-relaxed">
              <span className="font-semibold text-gray-700">{email}</span>으로<br />
              비밀번호 재설정 링크를 보냈어요.
            </p>
          </div>
          <p className="text-[12px] text-gray-400">
            이메일이 오지 않으면 스팸함을 확인하거나<br />
            <button type="button" onClick={() => setSent(false)}
              className="text-pink-500 hover:underline">
              다시 시도
            </button>
            해주세요.
          </p>
        </div>
      ) : (
        /* 이메일 입력 폼 */
        <div className="space-y-6">
          <div>
            <h2 className="text-[24px] font-bold text-gray-800 mb-1">비밀번호 찾기</h2>
            <p className="text-[14px] text-gray-500">
              가입한 이메일을 입력하면 재설정 링크를 보내드려요.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="가입한 이메일"
                autoComplete="email"
                disabled={loading}
                className="w-full pl-10 pr-4 h-12 rounded-[12px] border border-gray-200
                  text-[14px] text-gray-700 placeholder-gray-300 outline-none
                  focus:border-pink-300 focus:ring-2 focus:ring-pink-100
                  disabled:opacity-50 transition-all"
              />
            </div>

            {error && (
              <p className="text-[12px] text-rose-500 bg-rose-50 px-3 py-2 rounded-[8px]">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}
              className="w-full h-12 rounded-[12px] bg-gradient-to-r from-pink-600 to-rose-400
                text-white text-[15px] font-semibold
                shadow-[0_4px_14px_rgba(236,72,153,0.3)]
                disabled:opacity-60 transition-all hover:opacity-90 active:scale-[0.98]
                flex items-center justify-center gap-2">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />전송 중...</>
                : '재설정 링크 보내기'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
