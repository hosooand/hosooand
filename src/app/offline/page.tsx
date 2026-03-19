'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#FFF8FB] flex flex-col items-center justify-center gap-6 px-6">
      <img src="/duck.png" alt="통통이" className="w-24 h-24 object-contain opacity-60" />
      <div className="text-center">
        <h1 className="text-[22px] font-bold text-gray-700 mb-2">인터넷 연결이 없어요</h1>
        <p className="text-[14px] text-gray-400 leading-relaxed">
          네트워크 연결을 확인하고<br />다시 시도해주세요
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-400
          text-white text-[14px] font-semibold shadow-[0_4px_14px_rgba(236,72,153,0.3)]
          active:scale-95 transition-all">
        다시 시도
      </button>
    </div>
  )
}