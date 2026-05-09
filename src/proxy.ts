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

  // getSession()은 쿠키 디코드(0~1ms)만 수행. JWT가 만료된 경우에만 Auth 서버 왕복.
  // getUser()는 매 요청마다 Auth 서버 호출(~100ms)이라 미들웨어에는 부적합.
  // 보안: 실제 데이터 접근은 RLS가 JWT를 재검증하므로 안전.
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  const path = request.nextUrl.pathname
  const isPublic =
    path === '/sw.js' ||
    PUBLIC_PATHS.some(p => path.startsWith(p))

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && (path === '/' || path === '/login' || path === '/signup')) {
    return NextResponse.redirect(new URL('/select-service', request.url))
  }

  if (path.startsWith('/chat')) {
    return NextResponse.redirect(new URL('/select-service', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}