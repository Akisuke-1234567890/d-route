-- D Route v2.1.0-p76
-- Shared Planning model for main Route and sub Routes.
begin;

alter table public.phases add column if not exists branch_id uuid null references public.route_branches(id) on delete cascade;
alter table public.destinations add column if not exists legacy_branch_destination_id uuid null;

create index if not exists phases_route_branch_order_idx on public.phases(route_id, branch_id, order_value) where deleted_at is null;
drop index if exists public.phases_one_default_per_route_idx;
create unique index if not exists phases_one_default_per_route_scope_idx
  on public.phases(route_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where is_default=true and deleted_at is null;

create or replace function public.validate_phase_branch_route() returns trigger language plpgsql set search_path=public as $$
begin
  if new.branch_id is not null and not exists(
    select 1 from public.route_branches b where b.id=new.branch_id and b.route_id=new.route_id and b.status='active'
  ) then raise exception 'Phase branch must belong to the same Route' using errcode='23514'; end if;
  return new;
end; $$;
drop trigger if exists phases_validate_branch_route on public.phases;
create trigger phases_validate_branch_route before insert or update of route_id,branch_id on public.phases for each row execute function public.validate_phase_branch_route();

insert into public.phases(route_id,branch_id,name,description,order_value,status,is_optional,is_default)
select b.route_id,b.id,'',null,1000,'planned',false,true
from public.route_branches b
where b.status='active' and not exists(select 1 from public.phases p where p.route_id=b.route_id and p.branch_id=b.id and p.deleted_at is null);

insert into public.destinations(route_id,branch_id,phase_id,name,description,location_name,importance,order_value,is_optional,time_type,start_time,end_time,record_status,legacy_branch_destination_id)
select d.route_id,d.branch_id,p.id,d.name,d.description,d.location_name,'must',d.order_value,false,d.time_type,d.start_time,d.end_time,'active',d.id
from public.route_branch_destinations d
join public.phases p on p.route_id=d.route_id and p.branch_id=d.branch_id and p.is_default=true and p.deleted_at is null
where not exists(select 1 from public.destinations x where x.legacy_branch_destination_id=d.id);

create unique index if not exists destinations_legacy_branch_destination_uidx on public.destinations(legacy_branch_destination_id) where legacy_branch_destination_id is not null;

create or replace function public.delete_route_phase(p_route_id uuid,p_phase_id uuid,p_branch_id uuid default null)
returns void language plpgsql security definer set search_path=public as $$
declare target public.phases; fallback public.phases; phase_count integer;
begin
  if not exists(select 1 from public.routes r where r.id=p_route_id and r.owner_user_id=auth.uid()) then raise exception 'only route owner can delete phase' using errcode='42501'; end if;
  select * into target from public.phases where id=p_phase_id and route_id=p_route_id and branch_id is not distinct from p_branch_id and deleted_at is null;
  if target.id is null then raise exception 'phase not found' using errcode='P0002'; end if;
  select count(*) into phase_count from public.phases where route_id=p_route_id and branch_id is not distinct from p_branch_id and deleted_at is null;
  if phase_count<=1 then raise exception 'last phase cannot be deleted' using errcode='23514'; end if;
  select * into fallback from public.phases where route_id=p_route_id and branch_id is not distinct from p_branch_id and id<>p_phase_id and deleted_at is null order by is_default desc,order_value,created_at limit 1;
  if target.is_default then update public.phases set is_default=false where id=target.id; update public.phases set is_default=true where id=fallback.id; end if;
  update public.destinations set phase_id=fallback.id where route_id=p_route_id and branch_id is not distinct from p_branch_id and phase_id=target.id and deleted_at is null;
  update public.phases set deleted_at=now(),is_default=false where id=target.id;
end; $$;
grant execute on function public.delete_route_phase(uuid,uuid,uuid) to authenticated;

commit;
