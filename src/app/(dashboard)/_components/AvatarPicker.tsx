'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

const AVATARS = [
  { id: 'duck',         src: '/duck.png',         label: '기본'     },
  { id: 'duck-run',     src: '/duck-run.png',     label: '달리기'   },
  { id: 'duck-pilates', src: '/duck-pilates.png', label: '필라테스' },
  { id: 'duck-gym',     src: '/duck-gym.png',     label: '헬스'     },
]

interface Props {
  currentAvatar: string
  userId: string
}

export default function AvatarPicker({ currentAvatar, userId }: Props) {
  const supabase = createClient()
  const [selected, setSelected] = useState(currentAvatar)
  const [open, setOpen]         = useState(false)
  const [saving, setSaving]     = useState(false)

  const current = AVATARS.find(a => a.id === selected) ?? AVATARS[0]

  async function selectAvatar(id: string) {
    setSaving(true)
    setSelected(id)
    await supabase.from('profiles').update({ avatar: id }).eq('id', userId)
    setSaving(false)
    setOpen(false)
  }

  return (
    <div className="relative">
      {/* 현재 아바타 버튼 */}
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-9 h-9 rounded-full overflow-hidden border-2 border-pink-200
          hover:border-pink-400 transition-all relative">
        <Image
          src={current.src}
          alt={current.label}
          fill
          className="object-cover"
        />
      </button>

      {/* 드롭다운 */}
      {open && (
        <>
          {/* 백드롭 */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-11 z-50 bg-white rounded-[16px]
            border border-pink-100 shadow-xl p-3 w-[200px]">
            <p className="text-[11px] font-semibold text-gray-400 mb-2 px-1">
              아바타 선택
            </p>
            <div className="grid grid-cols-2 gap-2">
              {AVATARS.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => selectAvatar(a.id)}
                  disabled={saving}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-[12px]
                    border-2 transition-all
                    ${selected === a.id
                      ? 'border-pink-400 bg-pink-50'
                      : 'border-transparent hover:border-pink-200 hover:bg-pink-50/50'}`}>
                  <div className="relative w-14 h-14">
                    <Image
                      src={a.src}
                      alt={a.label}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className={`text-[11px] font-medium
                    ${selected === a.id ? 'text-pink-600' : 'text-gray-400'}`}>
                    {a.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}