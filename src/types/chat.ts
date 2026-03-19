export interface ChatRoom {
    id: string
    member_id: string
    staff_id: string | null
    status: 'active' | 'closed'
    created_at: string
    updated_at: string
    // join
    member?: Profile
    staff?: Profile
    last_message?: ChatMessage
    unread_count?: number
  }
  
  export interface ChatMessage {
    id: string
    room_id: string
    sender_id: string
    content: string | null
    image_url: string | null
    is_read: boolean
    created_at: string
    // join
    sender?: Profile
  }
  
  export interface Profile {
    id: string
    name: string
    email: string
    role: 'member' | 'staff'
    avatar_url?: string
    member_number?: string
  }