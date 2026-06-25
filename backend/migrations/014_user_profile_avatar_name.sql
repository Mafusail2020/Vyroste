-- ============================================================
-- Виросте — Slice 16b: profile display name + avatar.
-- Run in Supabase SQL Editor.
--
-- Also create a PUBLIC Storage bucket named `avatars`
-- (Dashboard → Storage → New bucket → public) for uploaded avatars.
-- ============================================================

ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS display_name TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url   TEXT;
