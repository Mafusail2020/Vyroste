-- ============================================================
-- Виросте — Initial Schema
-- Run in Supabase SQL editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- climate_zones: 25 Ukrainian oblasts + Kyiv city
CREATE TABLE IF NOT EXISTS public.climate_zones (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region                TEXT NOT NULL,         -- "Київська обл."
    city                  TEXT NOT NULL,          -- "Київ"
    usda_zone             TEXT,                   -- "5b"
    avg_last_frost_date   TEXT,                   -- "MM-DD"
    avg_first_frost_date  TEXT,                   -- "MM-DD"
    latitude              NUMERIC(9,6) NOT NULL,
    longitude             NUMERIC(9,6) NOT NULL,
    annual_active_temp_sum INTEGER,               -- cumulative GDD season total
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- crops: vegetables, herbs, flowers, berries
CREATE TABLE IF NOT EXISTS public.crops (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_uk              TEXT NOT NULL,
    name_lat             TEXT,
    type                 TEXT CHECK (type IN ('vegetable','flower','berry','tree','herb')),
    base_temperature     NUMERIC(4,1) NOT NULL,   -- GDD base °C
    gdd_to_harvest       INTEGER,                 -- total GDD to harvest
    seedling_start_week  INTEGER,                 -- weeks before last frost to start indoors (NULL = direct sow)
    ground_planting_week INTEGER,                 -- weeks relative to last frost (+after / -before)
    days_to_harvest      INTEGER,
    depth_cm             NUMERIC(5,1),
    spacing_cm           NUMERIC(5,1),
    lunar_preference     TEXT CHECK (lunar_preference IN ('above_ground','below_ground','any')),
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- user_profiles: extends auth.users
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    region_id             UUID REFERENCES public.climate_zones(id),
    plot_type             TEXT CHECK (plot_type IN ('balcony','dacha','garden')),
    selected_crops        UUID[] DEFAULT '{}',
    is_premium            BOOLEAN DEFAULT FALSE,
    is_admin              BOOLEAN DEFAULT FALSE,
    premium_until         TIMESTAMPTZ,
    onboarding_completed  BOOLEAN DEFAULT FALSE,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- nurseries: B2B map entries
CREATE TABLE IF NOT EXISTS public.nurseries (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT NOT NULL,
    description      TEXT,
    region_id        UUID REFERENCES public.climate_zones(id),
    latitude         NUMERIC(9,6) NOT NULL,
    longitude        NUMERIC(9,6) NOT NULL,
    address          TEXT,
    phone            TEXT,
    email            TEXT,
    website          TEXT,
    crops_available  UUID[] DEFAULT '{}',
    status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
    owner_id         UUID REFERENCES auth.users(id),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- gdd_accumulation: daily cron job writes here
CREATE TABLE IF NOT EXISTS public.gdd_accumulation (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id      UUID NOT NULL REFERENCES public.climate_zones(id),
    date           DATE NOT NULL,
    tmax           NUMERIC(5,2),
    tmin           NUMERIC(5,2),
    gdd_daily      NUMERIC(5,2),
    gdd_cumulative NUMERIC(8,2),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(region_id, date)
);

-- ============================================================
-- Enable Row Level Security
-- ============================================================
ALTER TABLE public.climate_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nurseries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdd_accumulation ENABLE ROW LEVEL SECURITY;

-- climate_zones: public read
CREATE POLICY "climate_zones_public_read" ON public.climate_zones
    FOR SELECT USING (true);

-- crops: public read
CREATE POLICY "crops_public_read" ON public.crops
    FOR SELECT USING (true);

-- user_profiles: own row only
CREATE POLICY "profiles_select_own" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- nurseries: verified entries are public; owner sees own pending
CREATE POLICY "nurseries_public_read_verified" ON public.nurseries
    FOR SELECT USING (status = 'verified' OR auth.uid() = owner_id);

CREATE POLICY "nurseries_insert_auth" ON public.nurseries
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "nurseries_update_own" ON public.nurseries
    FOR UPDATE USING (auth.uid() = owner_id);

-- gdd_accumulation: public read
CREATE POLICY "gdd_public_read" ON public.gdd_accumulation
    FOR SELECT USING (true);

-- ============================================================
-- Trigger: auto-update updated_at on user_profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER nurseries_updated_at
    BEFORE UPDATE ON public.nurseries
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
