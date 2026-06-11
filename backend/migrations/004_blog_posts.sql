-- Migration 004: Blog posts table
-- Run manually in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.blog_posts (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    category      TEXT         NOT NULL DEFAULT 'Поради',
    title         TEXT         NOT NULL,
    excerpt       TEXT,
    content       TEXT,
    author        TEXT         NOT NULL DEFAULT 'Виросте',
    emoji         TEXT         NOT NULL DEFAULT '🌱',
    gradient_from TEXT         NOT NULL DEFAULT '#BBE3BB',
    gradient_to   TEXT         NOT NULL DEFAULT '#C2E3F5',
    is_featured   BOOLEAN      NOT NULL DEFAULT FALSE,
    views         INTEGER      NOT NULL DEFAULT 0,
    published     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_published"
    ON public.blog_posts FOR SELECT
    USING (published = TRUE);

-- Service role bypasses RLS; also allow service writes
CREATE POLICY "service_write"
    ON public.blog_posts FOR ALL
    USING (true)
    WITH CHECK (true);
