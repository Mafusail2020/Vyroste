-- ============================================================
-- Виросте — Slice 15: nursery media + tags
-- Run in Supabase SQL Editor.
--
--   photos / videos : arrays of URLs (owner-managed)
--   tags            : owner-managed search tags (used by visitors to filter)
--   admin_tags      : moderator-managed badges (e.g. «перевірено»), owner cannot set
-- ============================================================

ALTER TABLE public.nurseries
    ADD COLUMN IF NOT EXISTS photos     TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS videos     TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS tags       TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS admin_tags TEXT[] DEFAULT '{}';

-- GIN index so tag filtering (?tag=...) stays fast as the table grows.
CREATE INDEX IF NOT EXISTS nurseries_tags_idx ON public.nurseries USING GIN (tags);
