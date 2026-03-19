import type { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AvatarPicker from './_components/AvatarPicker'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('name, avatar, role, is_approved')
    .eq('id', user.id)
    .single()

  console.log('[dashboard layout] profile', { profile, profileError: profileError?.message, userId: user.id })

  // admin이면 무조건 회원관리 표시, staff는 승인된 경우만
  const showAdminNav =
    profile?.role === 'admin' || (profile?.role === 'staff' && profile?.is_approved === true)
  const navItems = [
    { href: '/dashboard', icon: '📊', label: '홈'      },
    { href: '/diary',     icon: '📝', label: '다이어리' },
    { href: '/mypage',    icon: '👤', label: '마이'     },
    ...(showAdminNav ? [{ href: '/admin', icon: '👩‍⚕️', label: '회원관리' }] : []),
  ]

  return (
    <div className="min-h-screen bg-[#FFF8FB]">

      {/* 상단 헤더 */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-pink-100">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/logo.png"
              alt="S Body clinic"
              width={120}
              height={40}
              className="object-contain"
              priority
            />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-gray-500">{profile?.name ?? ''}님</span>
            <AvatarPicker
              currentAvatar={profile?.avatar ?? 'duck'}
              userId={user.id}
            />
          </div>
        </div>
      </header>

      {/* 하단 탭 */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-pink-100">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-around">
          {navItems.map(nav => (
            <Link key={nav.href} href={nav.href}
              className="flex flex-col items-center gap-1 px-3 py-1
                text-gray-400 hover:text-pink-500 transition-colors">
              <span className="text-[22px] leading-none">{nav.icon}</span>
              <span className="text-[10px] font-medium">{nav.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <main className="pb-20">{children}</main>
    </div>
  )
}