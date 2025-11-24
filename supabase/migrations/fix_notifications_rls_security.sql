-- FIX CRITICAL SECURITY ISSUE: Notifications RLS Policy Spoofing
-- 
-- IMPORTANT: This migration MUST be run in production Supabase dashboard
-- Cannot be tested in dev environment (no auth schema)
--
-- VULNERABILITY: Current INSERT policy allows any user to spoof actor_id
-- FIX: Enforce that actor_id must match authenticated user
--

-- Drop insecure policy
DROP POLICY IF EXISTS "Allow all notifications operations" ON notifications;

-- Create secure INSERT policy (only create notifications as yourself)
CREATE POLICY "Users can create notifications as themselves" 
  ON notifications FOR INSERT 
  WITH CHECK (auth.uid()::text = actor_id);

-- Create SELECT policy (view your own notifications)
CREATE POLICY "Users can view their own notifications" 
  ON notifications FOR SELECT 
  USING (auth.uid()::text = user_id);

-- Create UPDATE policy (mark your own notifications as read)
CREATE POLICY "Users can update their own notifications" 
  ON notifications FOR UPDATE 
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- DEPLOY INSTRUCTIONS:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Paste and run this entire migration
-- 3. Verify in Table Editor > notifications > RLS that policies are correct
-- 4. Test: Try to create notification with different actor_id (should fail)
