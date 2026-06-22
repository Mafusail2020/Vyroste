-- ============================================================
-- Виросте — Slice 16: saved articles (Персональний кабінет)
-- Run in Supabase SQL Editor.
--
-- Stores Knowledge-Base bookmarks per user. The Knowledge Base itself ships
-- later — article_id is a plain uuid for now (no FK yet), so the cabinet can
-- already save/list bookmarks.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.saved_articles (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    article_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

CREATE INDEX IF NOT EXISTS saved_articles_user_idx ON public.saved_articles(user_id);

-- ── RLS: owner-only ─────────────────────────────────────────────────────────
ALTER TABLE public.saved_articles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "saved_articles_select_own" ON public.saved_articles
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "saved_articles_insert_own" ON public.saved_articles
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "saved_articles_delete_own" ON public.saved_articles
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
