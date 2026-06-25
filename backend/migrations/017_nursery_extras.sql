-- ============================================================
-- Виросте — Slice 19: nursery socials + price table
-- Run in Supabase SQL Editor.
--
-- `description` now holds rich HTML (TipTap output). price_sections is a
-- JSONB array: [{ "name": "Яблуні", "rows": [{ "name","age","price" }] }].
-- ============================================================

ALTER TABLE public.nurseries
    ADD COLUMN IF NOT EXISTS youtube        TEXT,
    ADD COLUMN IF NOT EXISTS facebook       TEXT,
    ADD COLUMN IF NOT EXISTS instagram      TEXT,
    ADD COLUMN IF NOT EXISTS price_sections JSONB DEFAULT '[]'::jsonb;
