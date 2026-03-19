import Image from 'next/image'

interface EmptyStateProps {
  title:        string
  description?: string
  actionLabel?: string
  onAction?:    () => void
  imageSrc?:    string
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  imageSrc = '/duck.png',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
      <div className="relative w-24 h-24">
        <Image
          src={imageSrc}
          alt="통통이"
          fill
          className="object-contain"
        />
      </div>
      <div>
        <p className="text-[15px] font-semibold text-gray-700 mb-1">{title}</p>
        {description && (
          <p className="text-[13px] text-gray-400 leading-relaxed">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction}
          className="px-5 py-2.5 rounded-full
            bg-gradient-to-r from-pink-500 to-rose-400
            text-white text-[13px] font-semibold
            shadow-[0_3px_10px_rgba(236,72,153,0.3)]
            hover:-translate-y-0.5 transition-all">
          {actionLabel}
        </button>
      )}
    </div>
  )
}