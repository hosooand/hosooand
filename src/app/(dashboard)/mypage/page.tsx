'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function MyPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [name,          setName]          = useState('')
  const [email,         setEmail]         = useState('')
  const [height,        setHeight]        = useState('')
  const [currentWeight, setCurrentWeight] = useState('')
  const [avatar,        setAvatar]        = useState('duck')

  const AVATARS = [
    { id: 'duck',         src: '/duck.png',         label: '기본'     },
    { id: 'duck-run',     src: '/duck-run.png',     label: '달리기'   },
    { id: 'duck-pilates', src: '/duck-pilates.png', label: '필라테스' },
    { id: 'duck-gym',     src: '/duck-gym.png',     label: '헬스'     },
  ]

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      setEmail(user.email ?? '')

      const { data } = await supabase
        .from('profiles')
        .select('name, height, current_weight, avatar')
        .eq('id', user.id)
        .single()

      if (data) {
        setName(data.name ?? '')
        setHeight(data.height?.toString() ?? '')
        setCurrentWeight(data.current_weight?.toString() ?? '')
        setAvatar(data.avatar ?? 'duck')
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({
      name,
      height:         height ? Number(height) : null,
      current_weight: currentWeight ? Number(currentWeight) : null,
      avatar,
    }).eq('id', user.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleDelete() {
    setDeleting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').delete().eq('id', user.id)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const currentAvatarSrc = AVATARS.find(a => a.id === avatar)?.src ?? '/duck.png'

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-32">

      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-gray-800">마이페이지</h1>
        <p className="text-[14px] text-gray-400 mt-1">프로필 정보를 관리하세요</p>
      </div>

      {/* 아바타 선택 */}
      <div className="bg-white rounded-[20px] border border-pink-100 p-5 shadow-sm mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-16 h-16">
            <Image src={currentAvatarSrc} alt="아바타" fill className="object-contain" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-gray-800">{name || '이름 없음'}</p>
            <p className="text-[13px] text-gray-400">{email}</p>
          </div>
        </div>

        <p className="text-[12px] font-semibold text-gray-500 mb-2">아바타 선택</p>
        <div className="grid grid-cols-4 gap-2">
          {AVATARS.map(a => (
            <button key={a.id} type="button" onClick={() => setAvatar(a.id)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-[12px]
                border-2 transition-all
                ${avatar === a.id
                  ? 'border-pink-400 bg-pink-50'
                  : 'border-transparent hover:border-pink-200 hover:bg-pink-50/50'}`}>
              <div className="relative w-12 h-12">
                <Image src={a.src} alt={a.label} fill className="object-contain" />
              </div>
              <span className={`text-[10px] font-medium
                ${avatar === a.id ? 'text-pink-600' : 'text-gray-400'}`}>
                {a.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 프로필 정보 */}
      <div className="bg-white rounded-[20px] border border-pink-100 p-5 shadow-sm mb-4 space-y-4">
        <p className="text-[14px] font-semibold text-gray-700">기본 정보</p>

        {/* 이름 */}
        <div>
          <label className="block text-[12px] font-medium text-gray-500 mb-1.5">이름</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="이름을 입력하세요"
            className="w-full h-[46px] px-4 rounded-[10px] border border-gray-200
              text-[14px] outline-none focus:border-pink-400 focus:ring-2
              focus:ring-pink-100 transition-all"
          />
        </div>

        {/* 이메일 (읽기전용) */}
        <div>
          <label className="block text-[12px] font-medium text-gray-500 mb-1.5">이메일</label>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full h-[46px] px-4 rounded-[10px] border border-gray-100
              text-[14px] text-gray-400 bg-gray-50 cursor-not-allowed"
          />
        </div>

        {/* 키 / 현재 체중 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">키 (cm)</label>
            <input
              type="number"
              value={height}
              onChange={e => setHeight(e.target.value)}
              placeholder="예: 165"
              min={100} max={250}
              className="w-full h-[46px] px-4 rounded-[10px] border border-gray-200
                text-[14px] outline-none focus:border-pink-400 focus:ring-2
                focus:ring-pink-100 transition-all"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">현재 체중 (kg)</label>
            <input
              type="number"
              value={currentWeight}
              onChange={e => setCurrentWeight(e.target.value)}
              placeholder="예: 58.5"
              min={20} max={300} step={0.1}
              className="w-full h-[46px] px-4 rounded-[10px] border border-gray-200
                text-[14px] outline-none focus:border-pink-400 focus:ring-2
                focus:ring-pink-100 transition-all"
            />
          </div>
        </div>
      </div>

      {/* BMI 계산 */}
      {height && currentWeight && (
        <div className="bg-gradient-to-r from-pink-50 to-rose-50
          rounded-[20px] border border-pink-100 p-4 mb-4">
          {(() => {
            const bmi = Number(currentWeight) / Math.pow(Number(height) / 100, 2)
            const bmiRounded = bmi.toFixed(1)
            const bmiLabel =
              bmi < 18.5 ? { text: '저체중', color: 'text-blue-500' }
              : bmi < 23  ? { text: '정상',   color: 'text-emerald-500' }
              : bmi < 25  ? { text: '과체중', color: 'text-amber-500' }
              : { text: '비만', color: 'text-rose-500' }
            return (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] text-gray-500 mb-1">나의 BMI</p>
                  <p className="text-[28px] font-bold text-gray-800 leading-none">
                    {bmiRounded}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-[16px] font-semibold ${bmiLabel.color}`}>
                    {bmiLabel.text}
                  </span>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    정상 범위: 18.5 ~ 22.9
                  </p>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* 저장 버튼 */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full h-[52px] rounded-[12px]
          bg-gradient-to-r from-pink-600 via-pink-500 to-rose-400
          text-white text-[16px] font-semibold mb-3
          shadow-[0_6px_20px_rgba(236,72,153,0.35)]
          disabled:opacity-60 transition-all flex items-center justify-center gap-2">
        {saving ? (
          <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />저장 중...</>
        ) : saved ? (
          '✅ 저장 완료!'
        ) : (
          '저장하기'
        )}
      </button>

      {/* 로그아웃 */}
      <button
        type="button"
        onClick={handleLogout}
        className="w-full h-[48px] rounded-[12px] border border-gray-200
          text-gray-500 text-[15px] font-medium mb-3
          hover:bg-gray-50 transition-all">
        로그아웃
      </button>

      {/* 회원 탈퇴 */}
      {!showDeleteConfirm ? (
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full h-[48px] rounded-[12px] border border-rose-200
            text-rose-400 text-[15px] font-medium
            hover:bg-rose-50 transition-all">
          회원 탈퇴
        </button>
      ) : (
        <div className="bg-rose-50 rounded-[16px] border border-rose-200 p-4">
          <p className="text-[14px] font-semibold text-rose-600 mb-1">정말 탈퇴하시겠어요?</p>
          <p className="text-[12px] text-rose-400 mb-4">
            모든 기록이 삭제되며 복구할 수 없어요.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 h-10 rounded-[8px] border border-gray-200
                text-gray-500 text-[13px] hover:bg-white transition-all">
              취소
            </button>
            <button type="button" onClick={handleDelete} disabled={deleting}
              className="flex-1 h-10 rounded-[8px] bg-rose-500 text-white
                text-[13px] font-semibold disabled:opacity-60 transition-all">
              {deleting ? '처리 중...' : '탈퇴하기'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}