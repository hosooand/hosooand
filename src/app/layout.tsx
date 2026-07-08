import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title:       '호수앤',
  description: 'AI 기반 맞춤형 다이어트 관리 앱',
  manifest:    '/manifest.json',
  appleWebApp: {
    capable:        true,
    statusBarStyle: 'default',
    title:          '호수앤',
  },
  icons: {
    icon:  '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  width:                'device-width',
  initialScale:         1,
  maximumScale:         5,    // 이미지 뷰어 핀치줌 허용 (갤럭시 크롬 대응)
  userScalable:         true,
  themeColor:           '#EC4899',
  viewportFit:          'cover', // iPhone 노치 대응
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" style={{ colorScheme: 'light' }}>
      <head>
        <meta name="color-scheme"                 content="light only" />
        <meta name="supported-color-schemes"      content="light only" />
        <meta name="mobile-web-app-capable"       content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title"   content="호수앤" />
        <meta name="format-detection"             content="telephone=no" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${geist.variable} antialiased`}
        style={{ backgroundColor: '#ffffff', color: '#000000' }}
      >
      <ServiceWorkerRegister />
       {children}
      </body>
      
    </html>
  )
}
