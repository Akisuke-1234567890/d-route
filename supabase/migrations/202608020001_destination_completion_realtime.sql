-- D Route v2.1.0-p64
-- Destination completion actor and realtime synchronization.
begin;

alter table public.destinations
  add column if not exists completed_by uuid null references auth.users(id) on delete set null;

create index if not exists destinations_route_completed_by_idx
  on public.destinations(route_id, completed_by)
  where deleted_at is null and record_status = 'active';

create or replace function public.set_route_destination_completed(
  p_route_id uuid,
  p_destination_id uuid,
  p_completed boolean
)
returns public.destinations
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.destinations;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not public.is_participating_route_member(p_route_id) then
    raise exception 'participating Route member required' using errcode = '42501';
  end if;

  update public.destinations
  set completed_at = case when p_completed then now() else null end,
      completed_by = case when p_completed then auth.uid() else null end
  where id = p_destination_id
    and route_id = p_route_id
    and record_status = 'active'
    and deleted_at is null
  returning * into result;

  if result.id is null then
    raise exception 'destination not found' using errcode = 'P0002';
  end if;

  return result;
end;
$$;

revoke all on function public.set_route_destination_completed(uuid, uuid, boolean) from public;
grant execute on function public.set_route_destination_completed(uuid, uuid, boolean) to authenticated;

alter table public.destinations replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'destinations'
  ) then
    alter publication supabase_realtime add table public.destinations;
  end if;
end;
$$;

commit;

notify pgrst, 'reload schema';
