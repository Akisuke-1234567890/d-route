-- D Route v2.1.0-p69
-- Alternate Route connection model.
-- Supports: split and rejoin, join later, and leave permanently.

begin;

alter table public.route_branches
  add column if not exists connection_type text null,
  add column if not exists start_destination_id uuid null references public.destinations(id) on delete restrict,
  add column if not exists end_destination_id uuid null references public.destinations(id) on delete restrict,
  add column if not exists description text not null default '';

alter table public.route_branches
  drop constraint if exists route_branches_connection_type_check;
alter table public.route_branches
  add constraint route_branches_connection_type_check
  check (connection_type is null or connection_type in ('split_merge','join','leave'));

alter table public.route_branches
  drop constraint if exists route_branches_description_length_check;
alter table public.route_branches
  add constraint route_branches_description_length_check
  check (char_length(description) <= 200);

create index if not exists route_branches_start_destination_idx
  on public.route_branches(start_destination_id)
  where start_destination_id is not null;

create index if not exists route_branches_end_destination_idx
  on public.route_branches(end_destination_id)
  where end_destination_id is not null;

create or replace function public.validate_route_branch_connections()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  start_route uuid;
  start_time_value time;
  end_route uuid;
  end_time_value time;
begin
  -- Existing p68 rows remain valid as unconfigured drafts until a type is selected.
  if new.connection_type is null then
    if new.start_destination_id is not null or new.end_destination_id is not null then
      raise exception 'connection type is required when an anchor is selected' using errcode='23514';
    end if;
    return new;
  end if;

  if new.connection_type = 'split_merge' then
    if new.start_destination_id is null or new.end_destination_id is null then
      raise exception 'split_merge requires both start and end destinations' using errcode='23514';
    end if;
  elsif new.connection_type = 'join' then
    if new.start_destination_id is not null or new.end_destination_id is null then
      raise exception 'join requires only an end destination' using errcode='23514';
    end if;
  elsif new.connection_type = 'leave' then
    if new.start_destination_id is null or new.end_destination_id is not null then
      raise exception 'leave requires only a start destination' using errcode='23514';
    end if;
  end if;

  if new.start_destination_id is not null then
    select d.route_id, d.start_time
      into start_route, start_time_value
      from public.destinations d
     where d.id = new.start_destination_id
       and d.deleted_at is null;

    if start_route is null or start_route <> new.route_id then
      raise exception 'start destination must belong to the same route' using errcode='23514';
    end if;
    if start_time_value is null then
      raise exception 'start destination must have a time' using errcode='23514';
    end if;
  end if;

  if new.end_destination_id is not null then
    select d.route_id, d.start_time
      into end_route, end_time_value
      from public.destinations d
     where d.id = new.end_destination_id
       and d.deleted_at is null;

    if end_route is null or end_route <> new.route_id then
      raise exception 'end destination must belong to the same route' using errcode='23514';
    end if;
    if end_time_value is null then
      raise exception 'end destination must have a time' using errcode='23514';
    end if;
  end if;

  if new.start_destination_id is not null and new.end_destination_id is not null then
    if new.start_destination_id = new.end_destination_id then
      raise exception 'start and end destinations must be different' using errcode='23514';
    end if;
    if start_time_value >= end_time_value then
      raise exception 'end destination must be later than start destination' using errcode='23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists route_branches_validate_connections on public.route_branches;
create trigger route_branches_validate_connections
before insert or update of route_id, connection_type, start_destination_id, end_destination_id
on public.route_branches
for each row execute function public.validate_route_branch_connections();

create or replace function public.configure_route_branch(
  p_route_id uuid,
  p_branch_id uuid,
  p_name text,
  p_connection_type text,
  p_start_destination_id uuid default null,
  p_end_destination_id uuid default null,
  p_description text default ''
)
returns public.route_branches
language plpgsql
security definer
set search_path=public
as $$
declare
  result public.route_branches;
  normalized_name text := trim(coalesce(p_name, ''));
  normalized_description text := trim(coalesce(p_description, ''));
begin
  if not exists (
    select 1 from public.routes r
     where r.id = p_route_id
       and r.owner_user_id = auth.uid()
       and r.deleted_at is null
  ) then
    raise exception 'only route owner can configure alternate routes' using errcode='42501';
  end if;

  if normalized_name = '' or char_length(normalized_name) > 40 then
    raise exception 'alternate route name must be 1 to 40 characters' using errcode='22023';
  end if;
  if char_length(normalized_description) > 200 then
    raise exception 'alternate route description must be 200 characters or fewer' using errcode='22023';
  end if;

  update public.route_branches
     set name = normalized_name,
         connection_type = p_connection_type,
         start_destination_id = p_start_destination_id,
         end_destination_id = p_end_destination_id,
         description = normalized_description
   where id = p_branch_id
     and route_id = p_route_id
   returning * into result;

  if result.id is null then
    raise exception 'alternate route was not found' using errcode='P0002';
  end if;

  return result;
end;
$$;

create or replace function public.create_alternate_route(
  p_route_id uuid,
  p_name text,
  p_connection_type text,
  p_start_destination_id uuid default null,
  p_end_destination_id uuid default null,
  p_description text default ''
)
returns public.route_branches
language plpgsql
security definer
set search_path=public
as $$
declare
  result public.route_branches;
  normalized_name text := trim(coalesce(p_name, ''));
  normalized_description text := trim(coalesce(p_description, ''));
  next_order numeric;
begin
  if not exists (
    select 1 from public.routes r
     where r.id = p_route_id
       and r.owner_user_id = auth.uid()
       and r.deleted_at is null
  ) then
    raise exception 'only route owner can create alternate routes' using errcode='42501';
  end if;

  if normalized_name = '' or char_length(normalized_name) > 40 then
    raise exception 'alternate route name must be 1 to 40 characters' using errcode='22023';
  end if;
  if char_length(normalized_description) > 200 then
    raise exception 'alternate route description must be 200 characters or fewer' using errcode='22023';
  end if;

  select coalesce(max(order_value), 0) + 1000
    into next_order
    from public.route_branches
   where route_id = p_route_id;

  insert into public.route_branches(
    route_id, name, connection_type, start_destination_id,
    end_destination_id, description, order_value
  ) values (
    p_route_id, normalized_name, p_connection_type, p_start_destination_id,
    p_end_destination_id, normalized_description, next_order
  ) returning * into result;

  return result;
end;
$$;

grant execute on function public.configure_route_branch(uuid,uuid,text,text,uuid,uuid,text) to authenticated;
grant execute on function public.create_alternate_route(uuid,text,text,uuid,uuid,text) to authenticated;

commit;
notify pgrst, 'reload schema';
