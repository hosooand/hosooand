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

  // staff 미승인 시 로그인으로 리다이렉트 (승인 후에만 대시보드 등 이용 가능)
  if (user && !isPublic) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_approved')
      .eq('id', user.id)
      .single()
    if (profile?.role === 'staff' && profile?.is_approved === false) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // 채팅 기능 폐기 — /chat 접근 시 서비스 선택으로 리다이렉트
  if (path.startsWith('/chat')) {
    return NextResponse.redirect(new URL('/select-service', request.url))
  }

  // /admin 접근: admin 또는 승인된 staff만 허용 (/admin/users는 아래에서 admin만 허용)
  if (path.startsWith('/admin') && !path.startsWith('/admin/users') && user) {
    const { data: adminProfile, error: adminProfileError } = await supabase
      .from('profiles')
      .select('role, is_approved')
      .eq('id', user.id)
      .single()
    const allowed =
      adminProfile?.role === 'admin' ||
      (adminProfile?.role === 'staff' && adminProfile?.is_approved === true)

    console.log('[middleware] /admin access check', {
      path,
      userId: user.id,
      profile: adminProfile,
      role: adminProfile?.role ?? null,
      is_approved: adminProfile?.is_approved ?? null,
      allowed,
      error: adminProfileError?.message ?? null,
    })

    if (!allowed) {
      return NextResponse.redirect(new URL('/select-service', request.url))
    }
  }

  // /admin/users: admin 전용 경로 보호
  if (path.startsWith('/admin/users') && user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    console.log('[middleware] admin check', {
      path,
      userId: user.id,
      profile,
      profileError: profileError?.message ?? null,
    })

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/select-service', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}