import { createClient } from '@supabase/supabase-js'

// ⚠️ 서버 전용 파일 — 절대 클라이언트에서 import 금지
export function createAdminClient() {
    const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
    console.log('SUPABASE_URL:', supabaseUrl)
    console.log('SERVICE_ROLE_KEY 앞 20자:', serviceRoleKey?.slice(0, 20))
  
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession:   false,
      },
    })
  }