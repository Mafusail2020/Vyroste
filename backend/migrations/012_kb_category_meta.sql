-- ============================================================
-- Виросте — Slice 17b: KB category landing metadata
-- Run in Supabase SQL Editor.
--
-- The /knowledge landing renders a card per category with a description and a
-- short list of sub-topics. Article counts are computed at query time.
-- ============================================================

ALTER TABLE public.kb_categories
    ADD COLUMN IF NOT EXISTS description   TEXT,
    ADD COLUMN IF NOT EXISTS subcategories TEXT[] DEFAULT '{}';
