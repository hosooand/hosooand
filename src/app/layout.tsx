import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title:       'S Body Clinic',
  description: 'AI 기반 맞춤형 다이어트 관리 앱',
  manifest:    '/manifest.json',
  appleWebApp: {
    capable:        true,
    statusBarStyle: 'default',
    title:          'S Body',
  },
  icons: {
    icon:  '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  width:                'device-width',
  initialScale:         1,
  maximumScale:         1,   // 핀치줌 방지 (앱처럼 동작)
  userScalable:         false,
  themeColor:           '#EC4899',
  viewportFit:          'cover', // iPhone 노치 대응
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="mobile-web-app-capable"       content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title"   content="S Body" />
        <meta name="format-detection"             content="telephone=no" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${geist.variable} antialiased`}>
      <ServiceWorkerRegister />
       {children}
      </body>
      
    </html>
  )
}
