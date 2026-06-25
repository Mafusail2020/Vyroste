-- ============================================================
-- Виросте — Slice 18: Nursery reviews (moderated) + helpful votes
-- Run in Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nursery_reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nursery_id  UUID NOT NULL REFERENCES public.nurseries(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name TEXT,                 -- snapshot of profile display_name at submit
    avatar_url  TEXT,                 -- snapshot of profile avatar
    rating      INT  NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text        TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
    likes       INT  NOT NULL DEFAULT 0,
    dislikes    INT  NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (nursery_id, user_id)       -- one review per user per nursery (re-submit updates)
);

CREATE INDEX IF NOT EXISTS nursery_reviews_nursery_idx ON public.nursery_reviews(nursery_id, status);

-- Per-user helpful vote on a review (1 = up, -1 = down).
CREATE TABLE IF NOT EXISTS public.nursery_review_votes (
    review_id UUID NOT NULL REFERENCES public.nursery_reviews(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote      SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
    PRIMARY KEY (review_id, user_id)
);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.nursery_reviews      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nursery_review_votes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "reviews_read" ON public.nursery_reviews
        FOR SELECT USING (status = 'approved' OR auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE POLICY "reviews_insert_own" ON public.nursery_reviews
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE POLICY "reviews_update_own" ON public.nursery_reviews
        FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "votes_own" ON public.nursery_review_votes
        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS nursery_reviews_updated_at ON public.nursery_reviews;
CREATE TRIGGER nursery_reviews_updated_at
    BEFORE UPDATE ON public.nursery_reviews
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
