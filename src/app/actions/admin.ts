'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'

interface CreateMemberParams {
  name:          string
  email:         string
  password:      string
  memberNumber?: string
}

interface CreateMemberResult {
  success: boolean
  error?:  string
}

export async function createMember({
  name,
  email,
  password,
  memberNumber,
}: CreateMemberParams): Promise<CreateMemberResult> {
  try {
    // 1. 현재 유저가 staff인지 서버에서 재검증
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: '로그인이 필요합니다' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'staff') {
      return { success: false, error: '권한이 없습니다' }
    }

    // 2. Admin 클라이언트로 유저 생성 (이메일 인증 없이)
    const adminClient = createAdminClient()
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError || !newUser.user) {
      return { success: false, error: createError?.message ?? '유저 생성 실패' }
    }

    // 3. profiles 테이블에 INSERT
    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id:            newUser.user.id,
        name:          name.trim(),
        role:          'member',
        member_number: memberNumber?.trim() || null,
      })

    if (profileError) {
      // 프로필 생성 실패 시 auth 유저도 롤백
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return { success: false, error: profileError.message }
    }

    return { success: true }

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    return { success: false, error: message }
  }
}