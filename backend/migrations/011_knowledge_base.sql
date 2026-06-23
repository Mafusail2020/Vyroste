-- ============================================================
-- Виросте — Slice 17: Knowledge Base (База знань)
-- Run in Supabase SQL Editor.
--
-- Admin-authored wiki: categories 1─many articles. Article body is a TipTap
-- document stored as JSONB (single source of truth, rendered to HTML at read
-- time). Public reads only see published articles.
-- ============================================================

-- ── Categories ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kb_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    emoji       TEXT,
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Articles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kb_articles (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id      UUID REFERENCES public.kb_categories(id) ON DELETE SET NULL,
    title            TEXT NOT NULL,
    slug             TEXT NOT NULL UNIQUE,
    excerpt          TEXT,
    content          JSONB NOT NULL DEFAULT '{}'::jsonb,   -- TipTap doc JSON
    cover_image      TEXT,
    tags             TEXT[] DEFAULT '{}',
    author           TEXT DEFAULT 'Виросте',
    published        BOOLEAN DEFAULT FALSE,
    views            INTEGER DEFAULT 0,
    reading_minutes  INTEGER DEFAULT 1,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kb_articles_category_idx ON public.kb_articles(category_id);
CREATE INDEX IF NOT EXISTS kb_articles_tags_idx     ON public.kb_articles USING GIN (tags);

-- ── RLS: public read; writes go through service-key backend (require_admin) ──
ALTER TABLE public.kb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_articles   ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "kb_categories_public_read" ON public.kb_categories
        FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "kb_articles_public_read_published" ON public.kb_articles
        FOR SELECT USING (published = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Keep updated_at fresh (reuses set_updated_at() from migration 001) ───────
DROP TRIGGER IF EXISTS kb_articles_updated_at ON public.kb_articles;
CREATE TRIGGER kb_articles_updated_at
    BEFORE UPDATE ON public.kb_articles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
