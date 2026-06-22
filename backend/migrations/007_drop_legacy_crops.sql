-- ============================================================
-- Виросте — Slice 14b: retire the legacy flat crop model
-- Run in Supabase SQL Editor AFTER 005/006 are applied and
-- seed_crop_varieties.py has populated crop_categories/crop_varieties.
--
-- DESTRUCTIVE: removes the old `crops` table and the
-- `user_profiles.selected_crops` column. Selections now live on
-- `calendars.selected_varieties`. Take a snapshot first if unsure.
-- ============================================================

-- Onboarding/add-crop/calendar/gdd code paths no longer read these.
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS selected_crops;

-- gdd_alerts_sent.crop_id now holds VARIETY ids, so its old FK → crops is
-- stale. Drop it (column stays as a plain uuid, like calendars.selected_varieties).
ALTER TABLE public.gdd_alerts_sent DROP CONSTRAINT IF EXISTS gdd_alerts_sent_crop_id_fkey;

-- Now nothing depends on public.crops.
DROP TABLE IF EXISTS public.crops;

-- NOTE: scripts/seed_crops.py is now obsolete — use scripts/seed_crop_varieties.py.
