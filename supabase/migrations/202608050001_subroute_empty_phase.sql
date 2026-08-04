-- D Route v2.1.0-p84.2
begin;

create or replace function public.delete_route_phase(p_route_id uuid,p_phase_id uuid,p_branch_id uuid default null)
returns void language plpgsql security definer set search_path=public as $$
declare target public.phases; fallback public.phases; phase_count integer;
begin
  if not exists(select 1 from public.routes r where r.id=p_route_id and r.owner_user_id=auth.uid()) then raise exception 'only route owner can delete phase' using errcode='42501'; end if;
  select * into target from public.phases where id=p_phase_id and route_id=p_route_id and branch_id is not distinct from p_branch_id and deleted_at is null;
  if target.id is null then raise exception 'phase not found' using errcode='P0002'; end if;
  select count(*) into phase_count from public.phases where route_id=p_route_id and branch_id is not distinct from p_branch_id and deleted_at is null;
  if phase_count<=1 and p_branch_id is null then raise exception 'last phase cannot be deleted' using errcode='23514'; end if;
  if phase_count<=1 then
    update public.destinations set record_status='deleted',deleted_at=now() where route_id=p_route_id and branch_id is not distinct from p_branch_id and phase_id=target.id and deleted_at is null;
    update public.phases set deleted_at=now(),is_default=false where id=target.id;
    return;
  end if;
  select * into fallback from public.phases where route_id=p_route_id and branch_id is not distinct from p_branch_id and id<>p_phase_id and deleted_at is null order by is_default desc,order_value,created_at limit 1;
  if target.is_default then update public.phases set is_default=false where id=target.id; update public.phases set is_default=true where id=fallback.id; end if;
  update public.destinations set phase_id=fallback.id where route_id=p_route_id and branch_id is not distinct from p_branch_id and phase_id=target.id and deleted_at is null;
  update public.phases set deleted_at=now(),is_default=false where id=target.id;
end; $$;
grant execute on function public.delete_route_phase(uuid,uuid,uuid) to authenticated;
commit;
