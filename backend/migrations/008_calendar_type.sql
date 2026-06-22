-- ============================================================
-- Виросте — Slice 14c: calendar type (restricts plant kinds)
-- Run in Supabase SQL Editor.
--
--   horod (Город)    → vegetable, herb
--   sad   (Сад)      → flower, berry, tree
--   mixed (Змішаний) → any plant (default)
-- ============================================================

ALTER TABLE public.calendars
    ADD COLUMN IF NOT EXISTS calendar_type TEXT NOT NULL DEFAULT 'mixed'
    CHECK (calendar_type IN ('horod', 'sad', 'mixed'));
