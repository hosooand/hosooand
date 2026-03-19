'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatRoom } from '@/types/chat'

interface Props {
  activeRoomId: string | null
  onSelectRoom: (roomId: string) => void
}

export default function ChatRoomList() {
  return null
}