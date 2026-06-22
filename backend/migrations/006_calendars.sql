-- ============================================================
-- Виросте — Slice 14: Multiple calendars per user
-- Run in Supabase SQL Editor.
--
-- Each user can keep several named calendars (e.g. «Дача», «Балкон»),
-- each with its own region anchor and its own variety selection.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.calendars (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name               TEXT NOT NULL DEFAULT 'Мій календар',
    region_id          UUID REFERENCES public.climate_zones(id),
    selected_varieties UUID[] DEFAULT '{}',
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS calendars_user_idx ON public.calendars(user_id);

-- ── RLS: owner-only on every operation ──────────────────────────────────────
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "calendars_select_own" ON public.calendars
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "calendars_insert_own" ON public.calendars
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "calendars_update_own" ON public.calendars
        FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "calendars_delete_own" ON public.calendars
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Keep updated_at fresh (reuses set_updated_at() from 001) ─────────────────
DROP TRIGGER IF EXISTS calendars_updated_at ON public.calendars;
CREATE TRIGGER calendars_updated_at
    BEFORE UPDATE ON public.calendars
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
