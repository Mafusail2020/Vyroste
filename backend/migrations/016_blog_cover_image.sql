-- ============================================================
-- Виросте — Slice 12b: optional photo cover for blog posts.
-- Run in Supabase SQL Editor.
--
-- When cover_image is set, the frontend shows the photo instead
-- of the emoji + gradient. NULL/empty → keep the emoji cover.
-- Uploaded photos land in the existing public `article-images` bucket.
-- ============================================================

ALTER TABLE public.blog_posts
    ADD COLUMN IF NOT EXISTS cover_image TEXT;
