-- ============================================================
-- Виросте — Slice 18b: allow multiple reviews per user per nursery
-- Run in Supabase SQL Editor.
--
-- The UNIQUE(nursery_id, user_id) constraint made a second submission upsert
-- (overwrite) the user's earlier review instead of adding a new one. Drop it
-- so each submission is its own moderated row.
-- ============================================================

ALTER TABLE public.nursery_reviews
    DROP CONSTRAINT IF EXISTS nursery_reviews_nursery_id_user_id_key;
