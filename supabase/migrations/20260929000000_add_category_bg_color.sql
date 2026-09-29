-- Category tile background color, independent of the icon color.
-- Null means "auto": the tile uses a soft tint of the icon color.
-- Run this manually in the Supabase SQL editor (this repo has no linked Supabase CLI project yet).

alter table public.categories add column bg_color text;
