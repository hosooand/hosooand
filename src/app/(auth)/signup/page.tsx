'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Role = 'member' | 'staff'

function getStrength(pw: string) {
  if (!pw) return { score: 0, label: '', color: '' }
  let s = 0
  if (pw.length >= 8)           s++
  if (/[a-zA-Z]/.test(pw))     s++
  if (/[0-9]/.test(pw))        s++
  if (/[^a-zA-Z0-9]/.test(pw)) s++
  const labels = ['', '취약', '보통', '강함', '매우 강함']
  const colors = ['', '#F87171', '#FBBF24', '#34D399', '#10B981']
  return { score: s, label: labels[s], color: colors[s] }
}

function CheckBox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle}
      className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center
        justify-center cursor-pointer transition-all flex-shrink-0
        ${checked ? 'bg-pink-500 border-pink-500' : 'border-gray-200'}`}>
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

export default function SignupPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [role, setRole]       = useState<Role>('member')
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [pw, setPw]           = useState('')
  const [pw2, setPw2]         = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState<Partial<Record<'name'|'email'|'password'|'confirm'|'terms'|'global', string>>>({})

  const [termsAll, setTermsAll]               = useState(false)
  const [termsRequired, setTermsRequired]     = useState(false)
  const [privacyRequired, setPrivacyRequired] = useState(false)
  const [marketing, setMarketing]             = useState(false)

  const strength = getStrength(pw)

  function syncAll(tr: boolean, pr: boolean, mk: boolean) {
    setTermsAll(tr && pr && mk)
  }

  function toggleAll() {
    const next = !termsAll
    setTermsAll(next); setTermsRequired(next); setPrivacyRequired(next); setMarketing(next)
  }

  function validate() {
    const errs: typeof errors = {}
    if (!name || name.trim().length < 2)  errs.name = '이름을 2자 이상 입력하세요'
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = '올바른 이메일을 입력하세요'
    if (!pw || pw.length < 8 || !/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw))
      errs.password = '영문+숫자 포함 8자 이상 입력하세요'
    if (pw !== pw2) errs.confirm = '비밀번호가 일치하지 않습니다'
    if (!termsRequired || !privacyRequired) errs.terms = '필수 약관에 동의해주세요'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password: pw,
      options: {
        data: { name, role },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setErrors({ global: error.message })
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('profiles').insert({ id: data.user.id, name, role: 'member' })
    }

    // 가입 직후 남은 세션/쿠키로 인해 바로 로그인 시 오인증이 나는 경우 방지
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error(e)
    }

    setLoading(false)
    router.push('/login')
    router.refresh()
  }

  const inputClass = (err?: string) =>
    `w-full h-[50px] px-4 rounded-[10px] border text-[15px] outline-none transition-all
    ${err ? 'border-rose-400 ring-2 ring-rose-100' : 'border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100'}`

  return (
    <div className="w-full max-w-[400px]">

      <div className="mb-7">
        <h2 className="text-[26px] font-semibold text-gray-800 mb-1.5">함께 시작해볼까요 🌸</h2>
        <p className="text-[14px] font-light text-gray-400">계정을 만들고 맞춤 관리를 시작하세요</p>
      </div>

      {errors.global && (
        <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm text-center">
          {errors.global}
        </div>
      )}

      <form onSubmit={handleSignup} noValidate>

        {/* 가입 유형 */}
        <div className="mb-4">
          <label className="block text-[13px] font-medium text-gray-600 mb-2">가입 유형</label>
          <div className="flex gap-2.5">
            {(['member', 'staff'] as Role[]).map(r => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`flex-1 py-3.5 rounded-[10px] border-[1.5px] text-center transition-all
                  ${role === r ? 'border-pink-400 bg-pink-50' : 'border-gray-200 bg-white hover:border-pink-200'}`}>
                <div className="text-xl mb-1">{r === 'member' ? '🙋‍♀️' : '👩‍⚕️'}</div>
                <div className={`text-[13px] font-medium ${role === r ? 'text-pink-600' : 'text-gray-500'}`}>
                  {r === 'member' ? '일반 회원' : '관리 직원'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 이름 */}
        <div className="mb-4">
          <label className="block text-[13px] font-medium text-gray-600 mb-1.5">이름</label>
          <input type="text" value={name}
            onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: undefined })) }}
            placeholder="실명을 입력하세요" autoComplete="name"
            className={inputClass(errors.name)} />
          {errors.name && <p className="mt-1.5 text-xs text-rose-500">{errors.name}</p>}
        </div>

        {/* 이메일 */}
        <div className="mb-4">
          <label className="block text-[13px] font-medium text-gray-600 mb-1.5">이메일</label>
          <input type="email" value={email}
            onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })) }}
            placeholder="example@email.com" autoComplete="email"
            className={inputClass(errors.email)} />
          {errors.email && <p className="mt-1.5 text-xs text-rose-500">{errors.email}</p>}
        </div>

        {/* 비밀번호 */}
        <div className="mb-4">
          <label className="block text-[13px] font-medium text-gray-600 mb-1.5">비밀번호</label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} value={pw}
              onChange={e => { setPw(e.target.value); setErrors(p => ({ ...p, password: undefined })) }}
              placeholder="8자 이상 (영문+숫자+특수문자)" autoComplete="new-password"
              className={inputClass(errors.password) + ' pr-11'} />
            <button type="button" onClick={() => setShowPw(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-500 transition-colors p-1">
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
          {pw && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex-1 h-[3px] rounded-full transition-all duration-300"
                    style={{ background: i <= strength.score ? strength.color : '#E5E7EB' }} />
                ))}
              </div>
              <span className="text-[11px] font-medium" style={{ color: strength.color || '#9CA3AF' }}>
                {strength.label}
              </span>
            </div>
          )}
          {errors.password && <p className="mt-1.5 text-xs text-rose-500">{errors.password}</p>}
        </div>

        {/* 비밀번호 확인 */}
        <div className="mb-5">
          <label className="block text-[13px] font-medium text-gray-600 mb-1.5">비밀번호 확인</label>
          <input type="password" value={pw2}
            onChange={e => { setPw2(e.target.value); setErrors(p => ({ ...p, confirm: undefined })) }}
            placeholder="비밀번호를 다시 입력하세요" autoComplete="new-password"
            className={inputClass(errors.confirm)} />
          {errors.confirm && <p className="mt-1.5 text-xs text-rose-500">{errors.confirm}</p>}
        </div>

        {/* 약관 */}
        <div className="mb-5 p-4 bg-pink-50 rounded-[10px] border border-pink-100">
          <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-pink-100">
            <CheckBox checked={termsAll} onToggle={toggleAll} />
            <span className="text-[13px] font-semibold text-gray-700 cursor-pointer select-none" onClick={toggleAll}>
              전체 동의
            </span>
          </div>
          {[
            { key: 'terms',   label: '이용약관 동의',       checked: termsRequired,   set: setTermsRequired   },
            { key: 'privacy', label: '개인정보처리방침 동의', checked: privacyRequired, set: setPrivacyRequired },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <CheckBox checked={item.checked} onToggle={() => {
                  item.set((p: boolean) => !p)
                  syncAll(
                    item.key === 'terms'   ? !item.checked : termsRequired,
                    item.key === 'privacy' ? !item.checked : privacyRequired,
                    marketing
                  )
                }} />
                <span className="text-[13px] text-gray-600 select-none">
                  {item.label}<span className="text-[11px] font-semibold text-pink-500 ml-1">(필수)</span>
                </span>
              </div>
              <Link href="#" className="text-xs text-gray-400 border-b border-gray-200 hover:text-pink-500 transition-colors">보기</Link>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckBox checked={marketing} onToggle={() => {
                setMarketing(p => !p)
                syncAll(termsRequired, privacyRequired, !marketing)
              }} />
              <span className="text-[13px] text-gray-600 select-none">
                마케팅 수신 동의<span className="text-[11px] text-gray-400 ml-1">(선택)</span>
              </span>
            </div>
            <Link href="#" className="text-xs text-gray-400 border-b border-gray-200 hover:text-pink-500 transition-colors">보기</Link>
          </div>
          {errors.terms && <p className="mt-2 text-xs text-rose-500">{errors.terms}</p>}
        </div>

        {/* 가입 버튼 */}
        <button type="submit" disabled={loading}
          className="w-full h-[52px] rounded-[10px]
            bg-gradient-to-r from-pink-600 via-pink-500 to-rose-400
            text-white text-[16px] font-semibold tracking-[0.3px] mb-5
            shadow-[0_6px_20px_rgba(236,72,153,0.35)]
            hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(236,72,153,0.4)]
            disabled:opacity-60 transition-all flex items-center justify-center">
          {loading ? (
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : '회원가입 완료'}
        </button>
      </form>

      <p className="text-center text-[13px] text-gray-400">
        이미 계정이 있으신가요?{' '}
        <Link href="/login"
          className="text-pink-500 font-semibold underline underline-offset-2 hover:text-pink-700 transition-colors">
          로그인
        </Link>
      </p>
    </div>
  )
}