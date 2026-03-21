import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const type = searchParams.get('type') // recovery, signup 등을 구분

  /** 비밀번호 재설정 플로우: forgot-password의 redirectTo 쿼리와 맞춤 */
  const isPasswordRecovery =
    type === 'recovery' ||
    next === '/reset-password' ||
    next.endsWith('/reset-password')

  if (!code) {
    console.error('[auth/callback] ?code= 없음 — Redirect URLs·redirectTo 불일치 가능')
    return NextResponse.redirect(`${origin}/login?error=invalid_token_or_expired`)
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Auth Callback Error:', error.message)
    return NextResponse.redirect(`${origin}/login?error=invalid_token_or_expired`)
  }

  // 비밀번호 재설정(recovery): 세션 교환 후 반드시 /reset-password
  if (isPasswordRecovery) {
    return NextResponse.redirect(`${origin}/reset-password`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}