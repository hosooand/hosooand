import type { ReactNode } from 'react'
import Image from 'next/image'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white">

      {/* 왼쪽 데코 패널 */}
      <div className="hidden lg:flex flex-col justify-between flex-shrink-0 w-[480px]
        bg-gradient-to-br from-[#FD4FA0] via-[#FF7EB3] to-[#FFD6E7]
        px-12 py-16 relative overflow-hidden">

        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/10 pointer-events-none" />

        {/* 로고 */}
        <div className="relative z-10">
          <Image src="/logo.png" alt="S Body clinic" width={160} height={50}
            className="object-contain brightness-0 invert" />
        </div>

        {/* 히어로 카피 */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <Image src="/duck.png" alt="통통이" width={80} height={80}
              className="object-contain drop-shadow-lg" />
            <div>
              <span className="inline-block text-xs font-medium tracking-widest uppercase
                text-white/90 bg-white/20 border border-white/30 backdrop-blur-sm
                px-4 py-1.5 rounded-full mb-2">
                AI 맞춤형 다이어트
              </span>
              <h2 className="text-[32px] font-normal leading-[1.25] text-white">
                나만의 <em>건강한</em><br />라이프스타일
              </h2>
            </div>
          </div>
          <p className="text-[15px] font-light text-white/85 leading-relaxed">
            AI가 분석하고, 전문가가 함께하는<br />
            체계적인 다이어트 관리 프로그램
          </p>
        </div>

        {/* 통계 */}
        <div className="relative z-10 grid grid-cols-2 gap-3">
          {[
            { num: '98%',  label: '회원 만족도' },
            { num: '12kg', label: '평균 감량'   },
            { num: '24/7', label: 'AI 분석'     },
            { num: '5만+', label: '누적 회원'   },
          ].map(s => (
            <div key={s.label}
              className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl p-5">
              <div className="text-[28px] font-semibold text-white leading-none mb-1">{s.num}</div>
              <div className="text-xs text-white/75">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 오른쪽 폼 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto
        bg-white relative px-6 py-10">

        <div className="lg:hidden absolute -top-20 -right-16 w-72 h-72 rounded-full
          bg-pink-300/15 blur-[60px] pointer-events-none" />
        <div className="lg:hidden absolute -bottom-16 -left-10 w-52 h-52 rounded-full
          bg-rose-300/15 blur-[60px] pointer-events-none" />

        {/* 모바일 로고 */}
        <div className="lg:hidden flex flex-col items-center mb-8 gap-3">
          <Image src="/duck.png" alt="통통이" width={60} height={60} className="object-contain" />
          <Image src="/logo.png" alt="S Body clinic" width={140} height={45} className="object-contain" />
        </div>

        {children}

        {/* 보안 배지 */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-6">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" className="text-pink-400">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          SSL 암호화로 안전하게 보호됩니다
        </div>
      </div>
    </div>
  )
}