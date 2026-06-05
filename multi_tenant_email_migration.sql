-- Multi-Tenant Broadcast Integration Migration

-- 1. Add email configuration columns to the stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS email_provider TEXT DEFAULT 'resend';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS email_api_key TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS sender_email TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS smtp_host TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS smtp_port TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS smtp_user TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS smtp_pass TEXT;

-- 2. Ensure RLS policies allow store owners to view/update their own store settings
-- Wait, 'stores' has 'Anyone can view stores' policy, but updates might not be allowed.
-- We need to make sure superadmins or store admins can update it.
DROP POLICY IF EXISTS "Store members can update their store" ON stores;
CREATE POLICY "Store members can update their store" ON stores FOR UPDATE USING (id = public.current_user_store_id());
