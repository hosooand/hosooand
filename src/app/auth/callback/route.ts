import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * OAuth / 이메일 링크(PKCE code) 공통 콜백.
 * setAll에서 넘어온 name/value/options를 리다이렉트 응답에 그대로 복사해야
 * exchangeCodeForSession 직후 세션 쿠키가 브라우저에 저장됩니다.
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

/** 비밀번호 재설정 이메일: redirectTo에 쿼리 없이 /auth/callback 만 쓸 때 type=recovery 가 없을 수 있음 → JWT amr로 보조 판별 */
function isRecoveryFromAccessToken(accessToken: string): boolean {
  const payload = decodeJwtPayload(accessToken)
  if (!payload) return false
  const amr = payload.amr
  if (!Array.isArray(amr)) return false
  return amr.some((entry: unknown) => {
    if (typeof entry === 'string') {
      try {
        const o = JSON.parse(entry) as { method?: string }
        return o.method === 'otp' || o.method === 'recovery'
      } catch {
        return false
      }
    }
    if (typeof entry === 'object' && entry !== null && 'method' in entry) {
      const m = (entry as { method: string }).method
      return m === 'otp' || m === 'recovery'
    }
    return false
  })
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const nextRaw = url.searchParams.get('next')
  const next = nextRaw ?? '/'
  const type = url.searchParams.get('type')
  const origin = url.origin

  const isPasswordRecoveryFromQuery =
    type === 'recovery' ||
    next === '/reset-password' ||
    next.endsWith('/reset-password')

  if (!code) {
    console.error('[auth/callback] ?code= 없음 — Redirect URLs·redirectTo 불일치 가능')
    return NextResponse.redirect(`${origin}/login?error=invalid_token_or_expired`)
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

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Auth Callback Error:', error.message)
    return NextResponse.redirect(`${origin}/login?error=invalid_token_or_expired`)
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
