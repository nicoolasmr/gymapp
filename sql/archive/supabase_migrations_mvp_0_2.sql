-- MVP 0.2 Schema Updates

-- 1. Add Stripe fields to memberships table
ALTER TABLE memberships 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Ensure status column can handle new states (if it's an enum, otherwise text is fine)
-- If it's a text column, no change needed. If enum:
-- ALTER TYPE membership_status ADD VALUE IF NOT EXISTS 'past_due';
-- ALTER TYPE membership_status ADD VALUE IF NOT EXISTS 'canceled';

-- 2. Add Gym Management fields to academies table
ALTER TABLE academies
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- 3. Create Storage Buckets (if not exists)
-- This usually needs to be done via Supabase Dashboard or Storage API, 
-- but here is the SQL representation if using pg_net or similar extensions, 
-- otherwise just a reminder.
-- insert into storage.buckets (id, name) values ('avatars', 'avatars');
-- insert into storage.buckets (id, name) values ('gym-photos', 'gym-photos');

-- 4. RLS Policies (Examples)
-- Allow academies to update their own data
-- CREATE POLICY "Academies can update own data" ON academies FOR UPDATE 
-- USING (auth.uid() = owner_id); -- Assuming owner_id links to auth.users
