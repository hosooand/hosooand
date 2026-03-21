import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

/** code 없음·교환 실패 시 — 비밀번호 재설정 링크 오류는 /login 이 아니라 여기서 안내 */
function recoveryTokenErrorPath(origin: string) {
  return `${origin}/reset-password?error=expired`
}

/**
 * OAuth / 이메일 링크 공통 콜백.
 * - ?code= : PKCE → exchangeCodeForSession
 * - ?token=…&type=recovery : 이메일 링크 → verifyOtp({ token_hash, type })
 * setAll에서 넘어온 name/value/options를 리다이렉트 응답에 그대로 복사해야 세션 쿠키가 저장됩니다.
 */
function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  try {
    const part = accessToken.split('.')[1]
    if (!part) return null
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const json = Buffer.from(b64, 'base64').toString('utf8')
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

/** 비밀번호 재설정 세션: Supabase가 amr에 otp/password/recovery 등을 넣는 경우가 있음 */
function isRecoveryFromAccessToken(accessToken: string): boolean {
  const payload = decodeJwtPayload(accessToken)
  if (!payload) return false
  const amr = payload.amr
  if (!Array.isArray(amr)) return false
  return amr.some((entry: unknown) => {
    if (entry === 'otp' || entry === 'recovery' || entry === 'password') return true
    if (typeof entry === 'string') {
      try {
        const o = JSON.parse(entry) as { method?: string }
        const m = o.method
        return m === 'otp' || m === 'recovery' || m === 'password'
      } catch {
        return false
      }
    }
    if (typeof entry === 'object' && entry !== null && 'method' in entry) {
      const m = (entry as { method: string }).method
      return m === 'otp' || m === 'recovery' || m === 'password'
    }
    return false
  })
}

const EMAIL_OTP_TYPES: EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]

function resolveOtpType(typeParam: string | null): EmailOtpType {
  if (typeParam && EMAIL_OTP_TYPES.includes(typeParam as EmailOtpType)) {
    return typeParam as EmailOtpType
  }
  return 'recovery'
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const token = url.searchParams.get('token')
  const nextRaw = url.searchParams.get('next')
  const next = nextRaw ?? '/'
  const type = url.searchParams.get('type')
  const origin = url.origin

  const isPasswordRecoveryFromQuery =
    type === 'recovery' ||
    next === '/reset-password' ||
    next.endsWith('/reset-password') ||
    (!!token && !code && (type === 'recovery' || type === null))

  if (!code && !token) {
    console.error('[auth/callback] code 또는 token 없음 — Redirect URLs·이메일 링크 형식 확인')
    return NextResponse.redirect(recoveryTokenErrorPath(origin))
  }

  const pendingCookies: { name: string; value: string; options: CookieOptions }[] = []
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((c) => {
            pendingCookies.push(c)
            response.cookies.set(c.name, c.value, c.options)
          })
        },
      },
    }
  )

  let error: { message: string } | null = null

  if (code) {
    const { error: exErr } = await supabase.auth.exchangeCodeForSession(code)
    error = exErr
  } else if (token) {
    const otpType = resolveOtpType(type)
    const { error: otpErr } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: otpType,
    })
    error = otpErr
  }

  if (error) {
    console.error('Auth Callback Error:', error.message)
    return NextResponse.redirect(recoveryTokenErrorPath(origin))
  }

  let isPasswordRecovery = isPasswordRecoveryFromQuery
  if (!isPasswordRecovery) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token && isRecoveryFromAccessToken(session.access_token)) {
      isPasswordRecovery = true
    }
  }

  const targetPath = isPasswordRecovery
    ? '/reset-password'
    : next.startsWith('/') ? next : `/${next}`

  const redirectResponse = NextResponse.redirect(`${origin}${targetPath}`)
  pendingCookies.forEach((c) => {
    redirectResponse.cookies.set(c.name, c.value, c.options)
  })

  return redirectResponse
}
