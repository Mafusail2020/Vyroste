-- ============================================================
-- Виросте — Slice 19b: newsletter unsubscribe (opt-out).
-- Run in Supabase SQL Editor.
--
-- Recipients with newsletter_opt_out = true are excluded from every
-- newsletter send. The unsubscribe link in each email carries an
-- HMAC-signed user id (no stored token); the public endpoint
-- GET /api/newsletter/unsubscribe?u=&t= verifies it and sets this flag.
-- ============================================================

ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS newsletter_opt_out boolean NOT NULL DEFAULT false;
