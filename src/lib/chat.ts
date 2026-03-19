import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// 채팅방 가져오기 or 생성 (핵심 함수)
export async function getOrCreateChatRoom(memberId: string, staffId: string) {
  // 기존 채팅방 조회
  const { data: existing } = await supabase
    .from('chat_rooms')
    .select('*')
    .eq('member_id', memberId)
    .single()

  if (existing) {
    // staff_id 업데이트 (다른 직원이 상담 시작할 경우)
    if (existing.staff_id !== staffId) {
      await supabase
        .from('chat_rooms')
        .update({ staff_id: staffId, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    }
    return existing.id
  }

  // 새 채팅방 생성
  const { data: newRoom, error } = await supabase
    .from('chat_rooms')
    .insert({ member_id: memberId, staff_id: staffId, status: 'active' })
    .select()
    .single()

  if (error) throw error
  return newRoom.id
}

// 회원용: 본인 채팅방 조회
export async function getMyChatRoom(memberId: string) {
  const { data } = await supabase
    .from('chat_rooms')
    .select(`
      *,
      staff:profiles!chat_rooms_staff_id_fkey(id, name, avatar_url)
    `)
    .eq('member_id', memberId)
    .single()

  return data
}

// 읽음 처리
export async function markMessagesAsRead(roomId: string, userId: string) {
  await supabase
    .from('chat_messages')
    .update({ is_read: true })
    .eq('room_id', roomId)
    .neq('sender_id', userId)
    .eq('is_read', false)
}