-- D Route v2.1.0-p53
-- Duplicate an owned Route's planning data.

begin;

create or replace function public.duplicate_owned_route(
  p_route_id uuid,
  p_name text
)
returns public.routes
language plpgsql
security definer
set search_path = public
as $$
declare
  source_route public.routes;
  new_route public.routes;
  source_phase public.phases;
  new_phase_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode='42501';
  end if;

  if trim(coalesce(p_name, '')) = '' then
    raise exception 'Route name is required' using errcode='22023';
  end if;

  if char_length(trim(p_name)) > 60 then
    raise exception 'Route name is too long' using errcode='22023';
  end if;

  select *
  into source_route
  from public.routes
  where id = p_route_id
    and owner_user_id = auth.uid()
    and deleted_at is null;

  if source_route.id is null then
    raise exception 'Route not found or owner required' using errcode='42501';
  end if;

  insert into public.routes(owner_user_id, name, description)
  values(auth.uid(), trim(p_name), source_route.description)
  returning * into new_route;

  create temporary table if not exists duplicate_phase_map (
    old_phase_id uuid primary key,
    new_phase_id uuid not null
  ) on commit drop;
  truncate duplicate_phase_map;

  for source_phase in
    select *
    from public.phases
    where route_id = source_route.id
      and deleted_at is null
    order by order_value, created_at
  loop
    insert into public.phases(
      route_id, name, description, order_value, phase_date,
      start_time, end_time, status, is_optional,
      created_by, updated_by
    )
    values(
      new_route.id, source_phase.name, source_phase.description,
      source_phase.order_value, source_phase.phase_date,
      source_phase.start_time, source_phase.end_time,
      'planned', source_phase.is_optional,
      auth.uid(), auth.uid()
    )
    returning id into new_phase_id;

    insert into duplicate_phase_map(old_phase_id, new_phase_id)
    values(source_phase.id, new_phase_id);
  end loop;

  insert into public.destinations(
    route_id, phase_id, branch_id, group_id,
    name, description, location_name, latitude, longitude,
    map_url, meeting_point, importance, order_value,
    estimated_duration_minutes, is_optional, is_hidden,
    record_status, created_by, updated_by,
    time_type, start_time, end_time, completed_at
  )
  select
    new_route.id,
    phase_map.new_phase_id,
    null,
    null,
    destination.name,
    destination.description,
    destination.location_name,
    destination.latitude,
    destination.longitude,
    destination.map_url,
    destination.meeting_point,
    destination.importance,
    destination.order_value,
    destination.estimated_duration_minutes,
    destination.is_optional,
    destination.is_hidden,
    'active',
    auth.uid(),
    auth.uid(),
    destination.time_type,
    destination.start_time,
    destination.end_time,
    null
  from public.destinations destination
  left join duplicate_phase_map phase_map
    on phase_map.old_phase_id = destination.phase_id
  where destination.route_id = source_route.id
    and destination.deleted_at is null
    and destination.record_status = 'active';

  return new_route;
end;
$$;

revoke all on function public.duplicate_owned_route(uuid,text) from public;
grant execute on function public.duplicate_owned_route(uuid,text) to authenticated;

commit;
notify pgrst,'reload schema';

select proname
from pg_proc
where proname='duplicate_owned_route';
