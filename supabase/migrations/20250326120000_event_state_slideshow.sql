-- Pre-event presentation mode: toggled from Admin, shown on /screen
alter table public.event_state
  add column if not exists slideshow_active boolean default false;

alter table public.event_state
  add column if not exists slideshow_index int default 0;

comment on column public.event_state.slideshow_active is
  'When true, event screen shows presentation slides instead of debate UI.';

comment on column public.event_state.slideshow_index is
  '0-based index into the client-side presentation slide list.';
