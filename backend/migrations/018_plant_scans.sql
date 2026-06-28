-- ============================================================
-- Виросте — Slice 20: AI Агроном (photo plant diagnosis)
-- Run in Supabase SQL Editor.
--
-- Also create a PUBLIC Storage bucket named `plant-scans`
-- (Dashboard → Storage → New bucket → public) — uploaded plant
-- photos land there and the result card shows their public URL.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.plant_scans (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url        TEXT,
    crop             TEXT,                 -- AI-identified plant ("Томат")
    diagnosis        TEXT,                 -- short headline ("Фітофтороз")
    confidence       INT,                  -- 0..100
    severity         TEXT DEFAULT 'low'    -- healthy | low | medium | high
                       CHECK (severity IN ('healthy', 'low', 'medium', 'high')),
    is_healthy       BOOLEAN NOT NULL DEFAULT FALSE,
    steps            JSONB NOT NULL DEFAULT '[]',   -- ordered treatment steps (string[])
    timing           TEXT,                 -- region/weather-timed action window
    prevention       TEXT,                 -- prevention note
    region_snapshot  TEXT,                 -- the garden context used, for the result banner
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS plant_scans_user_idx
    ON public.plant_scans(user_id, created_at DESC);

-- ── RLS (service key bypasses; this is defense-in-depth) ────────────────────
ALTER TABLE public.plant_scans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "plant_scans_own" ON public.plant_scans
        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
