-- D Route v2.1.0-p14
-- Planning Core Database Foundation
-- Applied to Supabase on 2026-07-28 through D Route SQL Runner.

begin;

create table if not exists public.phases (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  name text not null,
  description text null,
  order_value numeric(12,4) not null,
  phase_date date null,
  start_time time null,
  end_time time null,
  status text not null default 'planned',
  is_optional boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null,
  updated_by uuid null,
  version integer not null default 1,
  deleted_at timestamptz null,
  constraint phases_status_check check (
    status in ('planned','current','completed','skipped','cancelled')
  ),
  constraint phases_time_check check (
    end_time is null or start_time is null or end_time >= start_time
  )
);

create index if not exists phases_route_order_idx
  on public.phases(route_id, order_value)
  where deleted_at is null;

create index if not exists phases_route_date_idx
  on public.phases(route_id, phase_date)
  where deleted_at is null;

create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  phase_id uuid null references public.phases(id) on delete set null,
  branch_id uuid null,
  group_id uuid null,
  name text not null,
  description text null,
  location_name text null,
  latitude numeric(9,6) null,
  longitude numeric(9,6) null,
  map_url text null,
  meeting_point text null,
  importance text not null default 'want',
  order_value numeric(12,4) not null,
  estimated_duration_minutes integer null,
  is_optional boolean not null default false,
  is_hidden boolean not null default false,
  record_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null,
  updated_by uuid null,
  version integer not null default 1,
  deleted_at timestamptz null,
  constraint destinations_importance_check check (
    importance in ('must','want','optional','information')
  ),
  constraint destinations_record_status_check check (
    record_status in ('active','archived')
  ),
  constraint destinations_latitude_check check (
    latitude is null or latitude between -90 and 90
  ),
  constraint destinations_longitude_check check (
    longitude is null or longitude between -180 and 180
  ),
  constraint destinations_duration_check check (
    estimated_duration_minutes is null or estimated_duration_minutes >= 0
  )
);

create index if not exists destinations_route_phase_order_idx
  on public.destinations(route_id, phase_id, order_value)
  where deleted_at is null;

create index if not exists destinations_route_branch_group_order_idx
  on public.destinations(route_id, branch_id, group_id, order_value)
  where deleted_at is null;

create index if not exists destinations_route_status_idx
  on public.destinations(route_id, record_status)
  where deleted_at is null;

create or replace function public.validate_destination_phase_route()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.phase_id is not null then
    if not exists (
      select 1
      from public.phases p
      where p.id = new.phase_id
        and p.route_id = new.route_id
        and p.deleted_at is null
    ) then
      raise exception 'Destination phase must belong to the same Route'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists destinations_validate_phase_route on public.destinations;
create trigger destinations_validate_phase_route
before insert or update of route_id, phase_id
on public.destinations
for each row
execute function public.validate_destination_phase_route();

create or replace function public.touch_planning_record()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  if tg_op = 'UPDATE' then
    new.version = old.version + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists phases_touch_record on public.phases;
create trigger phases_touch_record
before update on public.phases
for each row execute function public.touch_planning_record();

drop trigger if exists destinations_touch_record on public.destinations;
create trigger destinations_touch_record
before update on public.destinations
for each row execute function public.touch_planning_record();

alter table public.phases enable row level security;
alter table public.destinations enable row level security;

drop policy if exists "Owners can view route phases" on public.phases;
create policy "Owners can view route phases"
on public.phases for select to authenticated
using (
  deleted_at is null and exists (
    select 1 from public.routes r
    where r.id = phases.route_id
      and r.owner_user_id = auth.uid()
      and r.deleted_at is null
  )
);

drop policy if exists "Owners can create route phases" on public.phases;
create policy "Owners can create route phases"
on public.phases for insert to authenticated
with check (
  exists (
    select 1 from public.routes r
    where r.id = phases.route_id
      and r.owner_user_id = auth.uid()
      and r.deleted_at is null
  )
);

drop policy if exists "Owners can update route phases" on public.phases;
create policy "Owners can update route phases"
on public.phases for update to authenticated
using (
  exists (
    select 1 from public.routes r
    where r.id = phases.route_id
      and r.owner_user_id = auth.uid()
      and r.deleted_at is null
  )
)
with check (
  exists (
    select 1 from public.routes r
    where r.id = phases.route_id
      and r.owner_user_id = auth.uid()
      and r.deleted_at is null
  )
);

drop policy if exists "Owners can view route destinations" on public.destinations;
create policy "Owners can view route destinations"
on public.destinations for select to authenticated
using (
  deleted_at is null and exists (
    select 1 from public.routes r
    where r.id = destinations.route_id
      and r.owner_user_id = auth.uid()
      and r.deleted_at is null
  )
);

drop policy if exists "Owners can create route destinations" on public.destinations;
create policy "Owners can create route destinations"
on public.destinations for insert to authenticated
with check (
  exists (
    select 1 from public.routes r
    where r.id = destinations.route_id
      and r.owner_user_id = auth.uid()
      and r.deleted_at is null
  )
);

drop policy if exists "Owners can update route destinations" on public.destinations;
create policy "Owners can update route destinations"
on public.destinations for update to authenticated
using (
  exists (
    select 1 from public.routes r
    where r.id = destinations.route_id
      and r.owner_user_id = auth.uid()
      and r.deleted_at is null
  )
)
with check (
  exists (
    select 1 from public.routes r
    where r.id = destinations.route_id
      and r.owner_user_id = auth.uid()
      and r.deleted_at is null
  )
);

commit;
