-- 일일 목표 칼로리 (다이어리 목표 달성률 UI용). 없으면 앱에서 1500kcal 기본값 사용.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_calories integer;

COMMENT ON COLUMN public.profiles.target_calories IS '일일 목표 칼로리 (kcal), null이면 클라이언트 기본값';
