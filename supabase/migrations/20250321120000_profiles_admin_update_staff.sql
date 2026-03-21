-- profiles: admin이 staff 행의 is_approved 등을 UPDATE할 수 있도록 RLS 정책
-- (클라이언트 세션으로 직접 update할 때 필요. 서버 액션은 service role로 RLS 우회)
--
-- 적용: Supabase SQL Editor에서 실행하거나 `supabase db push`

-- RLS 내부에서 profiles를 다시 읽을 때 재귀를 피하기 위해 SECURITY DEFINER 사용
CREATE OR REPLACE FUNCTION public.profiles_is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.profiles_is_admin_user() IS '현재 사용자가 admin인지 (RLS 우회 조회)';

DROP POLICY IF EXISTS "profiles_admin_update_staff" ON public.profiles;

CREATE POLICY "profiles_admin_update_staff"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.profiles_is_admin_user() AND role = 'staff')
WITH CHECK (public.profiles_is_admin_user() AND role = 'staff');
