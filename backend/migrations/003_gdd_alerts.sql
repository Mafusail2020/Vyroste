-- Migration 003: GDD alert tracking
-- Run manually in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.gdd_alerts_sent (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    region_id   UUID         NOT NULL REFERENCES public.climate_zones(id),
    crop_id     UUID         NOT NULL REFERENCES public.crops(id),
    season_year INTEGER      NOT NULL,
    sent_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, crop_id, season_year)
);

ALTER TABLE public.gdd_alerts_sent ENABLE ROW LEVEL SECURITY;

-- Users can only see their own alert records
CREATE POLICY "users_read_own_alerts"
    ON public.gdd_alerts_sent FOR SELECT
    USING (auth.uid() = user_id);

-- Service role (backend) can insert freely
CREATE POLICY "service_insert_alerts"
    ON public.gdd_alerts_sent FOR INSERT
    WITH CHECK (true);
