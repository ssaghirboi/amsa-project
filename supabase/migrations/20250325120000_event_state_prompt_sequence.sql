-- Run this in Supabase → SQL Editor (once) if the column does not exist yet.
-- Stores the slideshow prompt list for Admin Prompt Manager (survives refresh).

alter table public.event_state
  add column if not exists prompt_sequence jsonb;

comment on column public.event_state.prompt_sequence is
  'JSON array of prompt strings for Next/Previous slideshow; null uses app defaults until first save.';
