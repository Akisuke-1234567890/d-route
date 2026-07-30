-- D Route v2.1.0-p39
-- Shared day-of progress operation.
-- Participating members can toggle Destination completion, but cannot edit Route design.

begin;

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
  set completed_at = case when p_completed then now() else null end
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

commit;

notify pgrst, 'reload schema';

select proname
from pg_proc
where proname = 'set_route_destination_completed';
