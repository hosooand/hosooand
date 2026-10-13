/** profiles.avatar 및 AvatarPicker와 동일한 키 */
export type AvatarKey = 'duck' | 'duck-run' | 'duck-pilates' | 'duck-gym'

export const AVATAR_SRC: Record<AvatarKey, string> = {
  duck: '/duck.webp',
  'duck-run': '/duck-run.webp',
  'duck-pilates': '/duck-pilates.webp',
  'duck-gym': '/duck-gym.webp',
}

export const DEFAULT_AVATAR_SRC = AVATAR_SRC.duck

export function avatarSrc(key?: string | null): string {
  if (key && key in AVATAR_SRC) return AVATAR_SRC[key as AvatarKey]
  return DEFAULT_AVATAR_SRC
}
