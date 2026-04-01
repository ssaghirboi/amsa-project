-- MC script/notes per slide (JSON object: keys like "presentation:0", "qa:1").
alter table public.event_state
  add column if not exists mc_slide_notes jsonb default '{}'::jsonb;

comment on column public.event_state.mc_slide_notes is
  'MC notes keyed by slide id, e.g. presentation:3 and qa:0; synced to all clients.';
