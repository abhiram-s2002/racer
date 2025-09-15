-- Test notification creation
-- Replace 'your-user-id' with an actual user ID from your users table

-- 1. Check if you have users
SELECT id, username FROM auth.users LIMIT 5;

-- 2. Insert a test notification (replace the user_id)
INSERT INTO public.notifications (
  recipient_user_id,
  type,
  title,
  body,
  data
) VALUES (
  'your-user-id-here', -- Replace with actual user ID
  'request_created',
  'Test Notification',
  'This is a test notification',
  '{"test": true}'::jsonb
);

-- 3. Check the notification was created
SELECT * FROM public.notifications ORDER BY updated_at DESC LIMIT 5;

-- 4. Test the send-fcm function
-- This will send push notifications for all undelivered notifications
SELECT net.http_post(
  url := 'https://your-project-ref.supabase.co/functions/v1/send-fcm',
  headers := '{"Authorization": "Bearer your-anon-key", "Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb
);
