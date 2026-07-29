-- D Route v2.1.0-p25
-- Destination progress baseline
begin;

alter table public.destinations
  add column if not exists completed_at timestamptz null;

create index if not exists destinations_route_phase_completed_idx
  on public.destinations(route_id, phase_id, completed_at)
  where deleted_at is null and record_status = 'active';

commit;

notify pgrst, 'reload schema';

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'destinations'
  and column_name = 'completed_at';
