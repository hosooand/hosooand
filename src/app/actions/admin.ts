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

interface CreateStaffByAdminParams {
  name:     string
  email:    string
  password: string
}

/** 관리자 전용: 신규 직원 등록 (role=staff, is_approved=false) */
export async function createStaffByAdmin({
  name,
  email,
  password,
}: CreateStaffByAdminParams): Promise<CreateMemberResult> {
  try {
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

    if (profile?.role !== 'admin') {
      return { success: false, error: '관리자만 직원을 등록할 수 있습니다' }
    }

    const adminClient = createAdminClient()
    // 직원은 관리자가 등록하므로 이메일 인증 링크 없이 즉시 로그인 가능해야 함 (Supabase: email_confirm)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email:         email.trim(),
      password,
      email_confirm: true,
    })

    if (createError || !newUser.user) {
      return { success: false, error: createError?.message ?? '유저 생성 실패' }
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id:           newUser.user.id,
        name:         name.trim(),
        role:         'staff',
        is_approved:  false,
      })

    if (profileError) {
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return { success: false, error: profileError.message }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    return { success: false, error: message }
  }
}

/** 관리자 전용: staff 프로필의 is_approved 변경 (service role — RLS 우회) */
export async function setStaffApprovalByAdmin(
  userId: string,
  isApproved: boolean,
): Promise<CreateMemberResult> {
  try {
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

    if (profile?.role !== 'admin') {
      return { success: false, error: '관리자만 직원 승인 상태를 변경할 수 있습니다' }
    }

    const adminClient = createAdminClient()
    const { data: updated, error } = await adminClient
      .from('profiles')
      .update({ is_approved: isApproved })
      .eq('id', userId)
      .eq('role', 'staff')
      .select('id')
      .maybeSingle()

    if (error) {
      return { success: false, error: error.message }
    }
    if (!updated) {
      return { success: false, error: '해당 직원 프로필을 찾을 수 없습니다' }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    return { success: false, error: message }
  }
}