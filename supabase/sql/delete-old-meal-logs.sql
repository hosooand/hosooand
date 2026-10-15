-- =============================================================================
-- 3개월 이전 식단 기록 자동삭제
-- Supabase Dashboard > SQL Editor에서 이 파일 전체를 실행하세요.
--
-- 1) pg_cron: 매일 자정에 daily_logs / meal_logs 행 삭제
-- 2) pg_net: 매일 자정에 delete-old-meal-images Edge Function 호출
--            (meal-images 버킷만 삭제. medical-images 는 절대 건드리지 않음)
--
-- 사전 작업:
--   1. Edge Function `delete-old-meal-images` 배포
--      npx supabase functions deploy delete-old-meal-images --project-ref ehhwkkgcipdvtbskvbig
--   2. Vault에 service_role_key 저장 (Dashboard > Project Settings > API 의 service_role)
--      select vault.create_secret('<SUPABASE_SERVICE_ROLE_KEY>', 'service_role_key');
--
-- 주의: pg_cron 스케줄은 UTC 기준입니다.
--       한국 시간 자정에 맞추려면 '0 0 * * *' 대신 '0 15 * * *' 을 사용하세요.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 같은 이름으로 이미 등록된 잡이 있으면 제거 후 재등록 (재실행 안전)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN ('delete-old-meal-logs', 'delete-old-meal-images');

-- 1) DB 자동삭제 — 매일 자정
--    meal_logs 테이블이 없는 환경에서는 해당 DELETE만 건너뛴다.
SELECT cron.schedule(
  'delete-old-meal-logs',
  '0 0 * * *',
  $$
  DELETE FROM daily_logs WHERE date < NOW() - INTERVAL '3 months';
  DO $job$
  BEGIN
    IF to_regclass('public.meal_logs') IS NOT NULL THEN
      EXECUTE 'DELETE FROM meal_logs WHERE date < NOW() - INTERVAL ''3 months''';
    END IF;
  END;
  $job$;
  $$
);

-- 2) Storage 자동삭제 — 매일 자정에 Edge Function 호출
--    Vault에 service_role_key 가 있어야 한다.
--    Edge Function은 daily_logs URL + meal-images created_at 기준으로 식단 사진만 지운다.
SELECT cron.schedule(
  'delete-old-meal-images',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ehhwkkgcipdvtbskvbig.supabase.co/functions/v1/delete-old-meal-images',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'service_role_key'
      ),
      'apikey', (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'service_role_key'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);
