-- D Route v2.1.0-p22.1
-- Default Phase model
-- Every Destination belongs to a Phase.
-- The first/default Phase may have an empty name and an optional start_time.
-- Phase start_time is used later for Route priority display; end_time is not used by the UI.

begin;

alter table public.phases
  add column if not exists is_default boolean not null default false;

with first_phase as (
  select distinct on (p.route_id)
    p.id,
    p.route_id
  from public.phases p
  where p.deleted_at is null
  order by p.route_id, p.order_value asc, p.created_at asc, p.id asc
)
update public.phases p
set is_default = true
from first_phase fp
where p.id = fp.id
  and not exists (
    select 1
    from public.phases existing
    where existing.route_id = fp.route_id
      and existing.is_default = true
      and existing.deleted_at is null
  );

insert into public.phases (
  route_id, name, description, order_value, status, is_optional, is_default
)
select r.id, '', null, 1000, 'planned', false, true
from public.routes r
where not exists (
  select 1 from public.phases p
  where p.route_id = r.id and p.deleted_at is null
);

create unique index if not exists phases_one_default_per_route_idx
  on public.phases(route_id)
  where is_default = true and deleted_at is null;

update public.destinations d
set phase_id = p.id
from public.phases p
where d.phase_id is null
  and p.route_id = d.route_id
  and p.is_default = true
  and p.deleted_at is null;

alter table public.destinations
  alter column phase_id set not null;

alter table public.destinations
  drop constraint if exists destinations_phase_id_fkey;

alter table public.destinations
  add constraint destinations_phase_id_fkey
  foreign key (phase_id)
  references public.phases(id)
  on delete restrict;

create or replace function public.create_default_phase_for_route()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.phases (
    route_id, name, description, order_value, status, is_optional, is_default
  ) values (
    new.id, '', null, 1000, 'planned', false, true
  );
  return new;
end;
$$;

drop trigger if exists routes_create_default_phase on public.routes;
create trigger routes_create_default_phase
after insert on public.routes
for each row
execute function public.create_default_phase_for_route();

commit;
