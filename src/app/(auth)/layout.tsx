import type { ReactNode } from 'react'
import Image from 'next/image'

const PINK_GRADIENT = 'linear-gradient(155deg, #f472b6 0%, #ec4899 50%, #db2777 100%)'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col md:flex-row bg-white"
      style={{ backgroundColor: '#ffffff', colorScheme: 'light' }}
    >

      {/* PC 왼쪽 패널 (44%) */}
      <div
        className="hidden md:flex md:w-[44%] flex-shrink-0 flex-col relative overflow-hidden px-12 py-14"
        style={{ background: PINK_GRADIENT }}
      >
        {/* 장식용 반투명 원 */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-20 -left-16 w-60 h-60 rounded-full bg-white/10 pointer-events-none" />

        <div className="relative z-10 flex-1 flex flex-col">
          <p className="text-white/70 font-medium" style={{ fontSize: 11, letterSpacing: '2.5px' }}>
            PREMIUM HEALTHCARE
          </p>
          <h1 className="text-white mt-3 leading-tight" style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-2px' }}>
            호수앤
          </h1>
          <p className="text-white/60 mt-1" style={{ fontSize: 13 }}>
            마취통증의학과의원
          </p>
          <div className="bg-white my-6" style={{ width: 36, height: 2 }} />
          <p className="text-white/80 leading-relaxed" style={{ fontSize: 14 }}>
            AI가 분석하고, 전문가가 함께하는<br />
            체계적인 건강 관리 프로그램
          </p>
        </div>

        {/* 하단 중앙 오리 */}
        <div className="relative z-10 flex justify-center pb-2">
          <Image src="/duck-gym.png" alt="통통이" width={140} height={140}
            className="object-contain drop-shadow-lg" />
        </div>
      </div>

      {/* 모바일 상단 헤더 */}
      <div
        className="md:hidden flex flex-col items-center text-center px-6 pt-12 pb-8 relative overflow-hidden"
        style={{ background: PINK_GRADIENT }}
      >
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />

        <p className="relative z-10 text-white/70 font-medium" style={{ fontSize: 11, letterSpacing: '2.5px' }}>
          PREMIUM HEALTHCARE
        </p>
        <h1 className="relative z-10 text-white leading-tight" style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-2px' }}>
          호수앤
        </h1>
        <p className="relative z-10 text-white/60 mb-4" style={{ fontSize: 13 }}>
          마취통증의학과의원
        </p>
        <Image src="/duck-gym.png" alt="통통이" width={100} height={100}
          className="relative z-10 object-contain" />
      </div>

      {/* 오른쪽(PC 56%) / 하단(모바일) 폼 영역 */}
      <div
        className="flex-1 md:w-[56%] flex flex-col items-center justify-center bg-white px-6 py-10 md:p-[56px]"
        style={{ backgroundColor: '#ffffff' }}
      >
        {children}
      </div>
    </div>
  )
}
