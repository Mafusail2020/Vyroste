-- ============================================================
-- Виросте — Slice 13: Category / Variety split + frost-relative offsets
-- Run in Supabase SQL Editor.
--
-- Splits the flat `crops` table into:
--   crop_categories (Томат)  1──many  crop_varieties (Сорт «Волове серце»)
-- Variety planting dates become FROST-RELATIVE offsets (days), so the
-- calendar endpoint anchors every date to climate_zones.avg_last_frost_date.
-- Mirrors backend/app/models.py.
-- ============================================================

-- ── Enums ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE growing_method AS ENUM ('seedling', 'direct', 'both');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Categories ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crop_categories (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_uk          TEXT NOT NULL UNIQUE,           -- "Томат"
    name_lat         TEXT,
    type             TEXT NOT NULL CHECK (type IN ('vegetable','flower','herb','berry','tree')),
    base_temperature NUMERIC(4,1) NOT NULL,          -- GDD base °C
    lunar_preference TEXT NOT NULL DEFAULT 'any'
                       CHECK (lunar_preference IN ('above_ground','below_ground','any')),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Varieties ───────────────────────────────────────────────────────────────
-- All *_offset columns are integer DAYS relative to avg_last_frost_date
-- (negative = before frost). NULL offset = phase does not apply, which is how
-- a single-method (seedling-only or direct-only) variety is represented.
CREATE TABLE IF NOT EXISTS public.crop_varieties (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id                 UUID NOT NULL REFERENCES public.crop_categories(id) ON DELETE CASCADE,
    name_uk                     TEXT NOT NULL,        -- "Волове серце"
    growing_method              growing_method NOT NULL,

    -- Seedling track
    seedling_sow_start_offset   INTEGER,
    seedling_sow_end_offset     INTEGER,
    prick_out_weeks_after_sprout INTEGER,             -- relative to sprouting, not frost
    hardening_offset            INTEGER,
    transplant_start_offset     INTEGER,
    transplant_end_offset       INTEGER,

    -- Direct-sow track
    direct_sow_start_offset     INTEGER,
    direct_sow_end_offset       INTEGER,

    -- Harvest & GDD
    days_to_harvest             INTEGER,
    gdd_to_harvest              INTEGER,

    notes                       TEXT,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),

    -- A seedling variety must have a transplant window; a direct variety must
    -- have a direct-sow window. Guarantees the calc always has a ground anchor.
    CONSTRAINT seedling_requires_transplant
        CHECK (growing_method = 'direct' OR transplant_start_offset IS NOT NULL),
    CONSTRAINT direct_requires_sow_window
        CHECK (growing_method = 'seedling' OR direct_sow_start_offset IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS crop_varieties_category_idx
    ON public.crop_varieties(category_id);

-- ── user_profiles: point selections at varieties, not the old crops table ──
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS selected_varieties UUID[] DEFAULT '{}';

-- ── RLS (public read, same posture as crops) ────────────────────────────────
ALTER TABLE public.crop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_varieties  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "crop_categories_public_read" ON public.crop_categories
        FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "crop_varieties_public_read" ON public.crop_varieties
        FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- NOTE: the legacy `crops` table and `user_profiles.selected_crops` are left in
-- place for backwards compatibility. Drop them in a later migration once the
-- catalog/onboarding code paths fully switch to varieties.
