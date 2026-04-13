import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/auth',
  '/reset-password',
  '/manifest.json',
]

export default async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          toSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isPublic =
    path === '/sw.js' ||
    PUBLIC_PATHS.some(p => path.startsWith(p))

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && (path === '/login' || path === '/signup')) {
    return NextResponse.redirect(new URL('/select-service', request.url))
  }

  // 채팅 기능 폐기 — /chat 접근 시 서비스 선택으로 리다이렉트
  if (path.startsWith('/chat')) {
    return NextResponse.redirect(new URL('/select-service', request.url))
  }

  // role·is_approved는 middleware에서 DB 조회하지 않음 → 대시보드 layout·각 admin 페이지에서 검증

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}