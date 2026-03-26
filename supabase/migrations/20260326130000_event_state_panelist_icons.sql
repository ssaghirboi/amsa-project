-- Panelist icon URLs for native event screen (admin-configurable).
alter table public.event_state
  add column if not exists panelist_1_icon_url text default null;

alter table public.event_state
  add column if not exists panelist_2_icon_url text default null;

alter table public.event_state
  add column if not exists panelist_3_icon_url text default null;

alter table public.event_state
  add column if not exists panelist_4_icon_url text default null;

comment on column public.event_state.panelist_1_icon_url is
  'Image URL for panelist 1 icon.';
comment on column public.event_state.panelist_2_icon_url is
  'Image URL for panelist 2 icon.';
comment on column public.event_state.panelist_3_icon_url is
  'Image URL for panelist 3 icon.';
comment on column public.event_state.panelist_4_icon_url is
  'Image URL for panelist 4 icon.';

