import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Supabase Auth 콜백 (이메일 링크 / OAuth PKCE)
 *
 * 1) 이메일 링크(OTP): ?token_hash=…&type=… — verifyOtp({ token_hash, type })
 *    - `token` 쿼리 이름으로 오는 경우도 token_hash 로 간주 (호환)
 * 2) PKCE 폴백: ?code=… — exchangeCodeForSession(code)
 *
 * 세션 쿠키는 setAll 콜백으로 모은 뒤 리다이렉트 응답에 그대로 붙여야 브라우저에 저장됩니다.
 */

function redirectWithCookies(
  origin: string,
  path: string,
  pendingCookies: { name: string; value: string; options: CookieOptions }[],
) {
  const redirectResponse = NextResponse.redirect(`${origin}${path}`)
  pendingCookies.forEach((c) => {
    redirectResponse.cookies.set(c.name, c.value, c.options)
  })
  return redirectResponse
}

function authFailedRedirect(origin: string) {
  return NextResponse.redirect(`${origin}/reset-password?error=expired`)
}

const EMAIL_OTP_TYPES: readonly EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
] as const

function parseEmailOtpType(raw: string | null): EmailOtpType | null {
  if (!raw) return null
  return EMAIL_OTP_TYPES.includes(raw as EmailOtpType) ? (raw as EmailOtpType) : null
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const origin = url.origin

  const code = url.searchParams.get('code')
  const tokenHash =
    url.searchParams.get('token_hash') ?? url.searchParams.get('token')
  const typeParam = url.searchParams.get('type')
  const nextRaw = url.searchParams.get('next')
  const next = nextRaw ?? '/'

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

  // --- 1) token_hash + type (이메일 링크 / PKCE 토큰 검증) ---
  if (tokenHash) {
    const type = parseEmailOtpType(typeParam) ?? 'recovery'
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })

    if (error) {
      console.error('[auth/callback] verifyOtp:', error.message)
      return authFailedRedirect(origin)
    }

    const targetPath = type === 'recovery' ? '/reset-password' : next.startsWith('/') ? next : `/${next}`
    return redirectWithCookies(origin, targetPath, pendingCookies)
  }

  // --- 2) code (PKCE authorization code 교환) ---
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[auth/callback] exchangeCodeForSession:', error.message)
      return authFailedRedirect(origin)
    }

    const otpType = parseEmailOtpType(typeParam)
    const toReset =
      otpType === 'recovery' ||
      next === '/reset-password' ||
      next.endsWith('/reset-password')

    const targetPath = toReset
      ? '/reset-password'
      : next.startsWith('/') ? next : `/${next}`

    return redirectWithCookies(origin, targetPath, pendingCookies)
  }

  console.error('[auth/callback] token_hash 또는 code 가 없습니다')
  return authFailedRedirect(origin)
}
