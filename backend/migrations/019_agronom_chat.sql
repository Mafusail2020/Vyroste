-- ============================================================
-- Виросте — Slice 20 (phase 2): AI Агроном chat agent
-- Run in Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agronom_chats (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL DEFAULT 'Нова розмова',
    calendar_id UUID,                -- context anchor (soft ref; calendars may be deleted)
    scan_id     UUID,                -- diagnosis the chat was started from, if any
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agronom_chats_user_idx
    ON public.agronom_chats(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.agronom_messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id    UUID NOT NULL REFERENCES public.agronom_chats(id) ON DELETE CASCADE,
    role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content    TEXT NOT NULL DEFAULT '',
    tool_trace JSONB NOT NULL DEFAULT '[]',   -- tool names used (display only)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agronom_messages_chat_idx
    ON public.agronom_messages(chat_id, created_at);

-- ── RLS (service key bypasses; defense-in-depth) ────────────────────────────
ALTER TABLE public.agronom_chats    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agronom_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "agronom_chats_own" ON public.agronom_chats
        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "agronom_messages_own" ON public.agronom_messages
        FOR ALL USING (
            EXISTS (SELECT 1 FROM public.agronom_chats c
                    WHERE c.id = agronom_messages.chat_id AND c.user_id = auth.uid())
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS agronom_chats_updated_at ON public.agronom_chats;
CREATE TRIGGER agronom_chats_updated_at
    BEFORE UPDATE ON public.agronom_chats
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
