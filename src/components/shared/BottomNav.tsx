'use client'

import Link from 'next/link'

export default function BottomNav({
  role,
  showAdminNav,
}: {
  role: string
  showAdminNav: boolean
}) {
  const navItems = [
    { href: '/dashboard', icon: '📊', label: '홈'      },
    { href: '/diary',     icon: '📝', label: '다이어리' },
    { href: '/mypage',    icon: '👤', label: '마이'     },
    ...(showAdminNav ? [{ href: '/admin', icon: '👩‍⚕️', label: '회원관리' }] : []),
  ]

  return (
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
  )
}
