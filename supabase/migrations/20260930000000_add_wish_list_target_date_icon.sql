-- Wish list goals: an optional "want it by" date (drives on-track / behind and the amount
-- to set aside per period) and an optional icon key from the same set categories use
-- (src/lib/icon-map.ts), shown instead of the name-matched icon.
-- Run this manually in the Supabase SQL editor (this repo has no linked Supabase CLI project yet).
-- The app works before it runs: it only sends these columns once a value is set.

alter table public.wish_list
    add column if not exists target_date date,
    add column if not exists icon text;

-- An earlier draft of this migration added an emoji column instead of icon.
alter table public.wish_list drop constraint if exists wish_list_emoji_length;
alter table public.wish_list drop column if exists emoji;
