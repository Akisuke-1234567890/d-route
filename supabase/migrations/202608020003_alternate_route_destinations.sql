-- D Route v2.1.0-p72
-- Destinations that belong to an alternate route.

create table if not exists public.route_branch_destinations (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  branch_id uuid not null references public.route_branches(id) on delete cascade,
  name text not null,
  location_name text null,
  description text null,
  time_type text not null default 'none' check (time_type in ('none','fixed','approx')),
  start_time time null,
  end_time time null,
  order_value numeric not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint route_branch_destinations_name_length check (char_length(trim(name)) between 1 and 40),
  constraint route_branch_destinations_description_length check (description is null or char_length(description) <= 200),
  constraint route_branch_destinations_time_required check (
    (time_type='none' and start_time is null and end_time is null)
    or (time_type in ('fixed','approx') and start_time is not null)
  )
);

create index if not exists route_branch_destinations_branch_order_idx
  on public.route_branch_destinations(branch_id, order_value, created_at);

alter table public.route_branch_destinations enable row level security;
revoke all on public.route_branch_destinations from anon;
grant select on public.route_branch_destinations to authenticated;

create policy "Route members can view alternate route destinations"
on public.route_branch_destinations for select to authenticated
using (public.is_route_member(route_id));

create or replace function public.save_alternate_route_destination(
  p_route_id uuid,
  p_branch_id uuid,
  p_destination_id uuid,
  p_name text,
  p_location_name text default null,
  p_description text default null,
  p_time_type text default 'none',
  p_start_time time default null,
  p_end_time time default null
) returns public.route_branch_destinations
language plpgsql security definer set search_path=public
as $$
declare
  result public.route_branch_destinations;
  next_order numeric;
begin
  if not exists(select 1 from public.routes r where r.id=p_route_id and r.owner_user_id=auth.uid()) then
    raise exception 'only route owner can edit alternate route destinations' using errcode='42501';
  end if;
  if not exists(select 1 from public.route_branches b where b.id=p_branch_id and b.route_id=p_route_id and b.status='active') then
    raise exception 'alternate route was not found' using errcode='P0002';
  end if;
  if trim(coalesce(p_name,''))='' or char_length(trim(p_name))>40 then
    raise exception 'destination name must be 1 to 40 characters' using errcode='22023';
  end if;
  if p_time_type not in ('none','fixed','approx') then
    raise exception 'invalid time type' using errcode='22023';
  end if;
  if p_time_type='none' then p_start_time:=null; p_end_time:=null;
  elsif p_start_time is null then raise exception 'start time is required' using errcode='22023';
  end if;

  if p_destination_id is null then
    select coalesce(max(order_value),0)+1000 into next_order
      from public.route_branch_destinations where branch_id=p_branch_id;
    insert into public.route_branch_destinations(route_id,branch_id,name,location_name,description,time_type,start_time,end_time,order_value)
    values(p_route_id,p_branch_id,trim(p_name),nullif(trim(coalesce(p_location_name,'')),''),nullif(trim(coalesce(p_description,'')),''),p_time_type,p_start_time,p_end_time,next_order)
    returning * into result;
  else
    update public.route_branch_destinations
       set name=trim(p_name), location_name=nullif(trim(coalesce(p_location_name,'')),''),
           description=nullif(trim(coalesce(p_description,'')),''), time_type=p_time_type,
           start_time=p_start_time, end_time=p_end_time, updated_at=now()
     where id=p_destination_id and branch_id=p_branch_id and route_id=p_route_id
     returning * into result;
    if result.id is null then raise exception 'destination was not found' using errcode='P0002'; end if;
  end if;
  return result;
end $$;

grant execute on function public.save_alternate_route_destination(uuid,uuid,uuid,text,text,text,text,time,time) to authenticated;

create or replace function public.delete_alternate_route_destination(
  p_route_id uuid, p_branch_id uuid, p_destination_id uuid
) returns void
language plpgsql security definer set search_path=public
as $$
begin
  if not exists(select 1 from public.routes r where r.id=p_route_id and r.owner_user_id=auth.uid()) then
    raise exception 'only route owner can delete alternate route destinations' using errcode='42501';
  end if;
  delete from public.route_branch_destinations
   where id=p_destination_id and branch_id=p_branch_id and route_id=p_route_id;
  if not found then raise exception 'destination was not found' using errcode='P0002'; end if;
end $$;

grant execute on function public.delete_alternate_route_destination(uuid,uuid,uuid) to authenticated;
