-- ============================================================
-- Виросте — Slice 17b: per-user article reads (Knowledge Base progress)
-- Run in Supabase SQL Editor.
--
-- One row per (user, article) the first time a user opens an article. Powers
-- (a) the per-category read-progress bar on the /knowledge landing cards, and
-- (b) a once-per-user global view count (no more double-counting on revisit /
-- React StrictMode double-mount).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.kb_article_reads (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES public.kb_articles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

CREATE INDEX IF NOT EXISTS kb_article_reads_user_idx ON public.kb_article_reads(user_id);

-- ── RLS: owner-only ─────────────────────────────────────────────────────────
ALTER TABLE public.kb_article_reads ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "kb_article_reads_select_own" ON public.kb_article_reads
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "kb_article_reads_insert_own" ON public.kb_article_reads
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
