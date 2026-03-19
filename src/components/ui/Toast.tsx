'use client'

import { useEffect } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

interface ToastProps {
  message:  string
  type:     'success' | 'error'
  onClose:  () => void
  duration?: number
}

export default function Toast({
  message,
  type,
  onClose,
  duration = 3000,
}: ToastProps) {

  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50
      flex items-center gap-2.5 px-4 py-3 rounded-[14px] shadow-lg
      text-[13px] font-medium whitespace-nowrap
      animate-fade-up
      ${type === 'success'
        ? 'bg-emerald-500 text-white'
        : 'bg-rose-500 text-white'
      }`}>
      {type === 'success'
        ? <CheckCircle2 size={16} className="flex-shrink-0" />
        : <XCircle      size={16} className="flex-shrink-0" />
      }
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="ml-1 opacity-70 hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </div>
  )
}