'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import AvatarPicker from './AvatarPicker'

export interface DashboardProfile {
  name:    string | null
  avatar:  string | null
  role:    string | null
  is_approved: boolean | null
}

export default function DashboardShell({
  children,
  profile,
  userId,
  footerNav,
}: {
  children:   ReactNode
  profile:    DashboardProfile | null
  userId:     string
  footerNav:  ReactNode
}) {
  const pathname = usePathname()
  if (pathname === '/select-service') {
    return <>{children}</>
  }

  const isRehabApp =
    pathname.startsWith('/rehab-manage') ||
    pathname === '/rehab' ||
    pathname.startsWith('/rehab/')

  const rehabLogoHref = pathname.startsWith('/rehab-manage')
    ? '/rehab-manage'
    : '/rehab'

  return (
    <div className="min-h-screen bg-[#FFF8FB]">

      <header
        className={
          isRehabApp
            ? 'sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-sky-100'
            : 'sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-pink-100'
        }
      >
        <div className="max-w-2xl mx-auto px-4">
          {isRehabApp ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                marginBottom: 8,
              }}
            >
              <Link href={rehabLogoHref} className="flex items-center shrink-0">
                <Image
                  src="/hosoo-logo.png"
                  alt="호수앤마취통증의학과"
                  width={160}
                  height={36}
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  {profile?.name ?? ''}님
                </span>
                <AvatarPicker
                  currentAvatar={profile?.avatar ?? 'duck'}
                  userId={userId}
                />
              </div>
            </div>
          ) : (
            <div className="h-14 flex items-center justify-between">
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
                  userId={userId}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {footerNav}

      <main className="pb-20">{children}</main>
    </div>
  )
}
