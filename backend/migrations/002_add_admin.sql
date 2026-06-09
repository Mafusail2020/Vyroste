-- Run in Supabase SQL Editor
-- Adds is_admin flag to user_profiles

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
