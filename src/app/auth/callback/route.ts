import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * OAuth / 이메일 링크(PKCE code) 공통 콜백.
 * Route Handler에서는 cookies() 헬퍼 대신 request·response에 쿠키를 붙여야
 * exchangeCodeForSession 직후 리다이렉트 응답에 세션이 포함됩니다.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/'
  const type = url.searchParams.get('type')
  const origin = url.origin

  const isPasswordRecovery =
    type === 'recovery' ||
    next === '/reset-password' ||
    next.endsWith('/reset-password')

  if (!code) {
    console.error('[auth/callback] ?code= 없음 — Redirect URLs·redirectTo 불일치 가능')
    return NextResponse.redirect(`${origin}/login?error=invalid_token_or_expired`)
  }

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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Auth Callback Error:', error.message)
    return NextResponse.redirect(`${origin}/login?error=invalid_token_or_expired`)
  }

  const targetPath = isPasswordRecovery ? '/reset-password' : next.startsWith('/') ? next : `/${next}`
  const redirectResponse = NextResponse.redirect(`${origin}${targetPath}`)

  response.cookies.getAll().forEach(({ name, value }) => {
    redirectResponse.cookies.set(name, value)
  })

  return redirectResponse
}
