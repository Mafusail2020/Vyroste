-- ============================================================
-- Виросте — Slice 19: weekly newsletter (schedule + rich content).
-- Run in Supabase SQL Editor.
--
-- Singleton settings row (id = 1). The backend uses the service key
-- (bypasses RLS); RLS is enabled with no anon policies so the public
-- anon key cannot read or write the table.
--
-- send_dow: 0 = Monday .. 6 = Sunday (matches Python datetime.weekday()).
-- send_hour: UTC hour 0-23.
-- blocks: ordered JSON list of {type: heading|text|image|button, ...}.
-- Uploaded images land in the existing public `article-images` bucket
-- (path `newsletter/<uuid>.<ext>`).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.newsletter (
    id           smallint PRIMARY KEY DEFAULT 1,
    enabled      boolean     NOT NULL DEFAULT false,
    send_dow     smallint    NOT NULL DEFAULT 0,
    send_hour    smallint    NOT NULL DEFAULT 9,
    subject      text        NOT NULL DEFAULT '🌱 Щотижневі новини Виросте',
    audience     text        NOT NULL DEFAULT 'all',     -- all | premium
    blocks       jsonb       NOT NULL DEFAULT '[]'::jsonb,
    last_sent_at timestamptz,
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT newsletter_singleton CHECK (id = 1)
);

ALTER TABLE public.newsletter ENABLE ROW LEVEL SECURITY;

INSERT INTO public.newsletter (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
