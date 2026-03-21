import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const type = searchParams.get('type') // recovery, signup 등을 구분
  const isRecoveryRedirect =
    type === 'recovery' ||
    next === '/reset-password' ||
    next.endsWith('/reset-password')

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 1. 비밀번호 재설정(recovery)인 경우 전용 페이지로 리다이렉트
      if (isRecoveryRedirect) {
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      
      // 2. 그 외에는 원래 가려던 곳이나 대시보드로 이동
      return NextResponse.redirect(`${origin}${next}`)
    }

    // 터미널(Terminal) 로그에서 실제 에러 원인을 확인하세요
    console.error('Auth Callback Error:', error.message)
  }

  // 실패 시 에러 메시지를 포함해 로그인 페이지로 이동
  return NextResponse.redirect(`${origin}/login?error=invalid_token_or_expired`)
}