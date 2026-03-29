-- Editable slideshow copy for /screen (admin-controlled text per slide).
alter table public.event_state
  add column if not exists presentation_slides jsonb default null;

comment on column public.event_state.presentation_slides is
  'JSON array of slide text overlays; merged with app defaults by slide index.';
