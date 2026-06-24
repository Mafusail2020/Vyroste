-- ============================================================
-- Виросте — Slice 14d: split flowers into their own calendar type.
-- Run in Supabase SQL Editor.
--
--   horod (Город)    → vegetable, herb
--   sad   (Сад)      → berry, tree          (flowers removed)
--   kviti (Квіти)    → flower               (NEW)
--   mixed (Змішаний) → any plant (default)
-- ============================================================

ALTER TABLE public.calendars
    DROP CONSTRAINT IF EXISTS calendars_calendar_type_check;

ALTER TABLE public.calendars
    ADD CONSTRAINT calendars_calendar_type_check
    CHECK (calendar_type IN ('horod', 'sad', 'kviti', 'mixed'));
