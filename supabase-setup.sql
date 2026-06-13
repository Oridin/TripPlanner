create table if not exists public.trip_planner_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.trip_planner_state enable row level security;

drop policy if exists "Trip planner authenticated read" on public.trip_planner_state;
drop policy if exists "Trip planner authenticated insert" on public.trip_planner_state;
drop policy if exists "Trip planner authenticated update" on public.trip_planner_state;

create policy "Trip planner authenticated read"
on public.trip_planner_state
for select
to authenticated
using (true);

create policy "Trip planner authenticated insert"
on public.trip_planner_state
for insert
to authenticated
with check (true);

create policy "Trip planner authenticated update"
on public.trip_planner_state
for update
to authenticated
using (true)
with check (true);
