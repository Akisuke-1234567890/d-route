-- D Route v2.1.0-p71
-- Archive an alternate route and clear its member assignments.

begin;

create or replace function public.delete_alternate_route(
  p_route_id uuid,
  p_branch_id uuid
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not exists (
    select 1
      from public.routes r
     where r.id = p_route_id
       and r.owner_user_id = auth.uid()
       and r.deleted_at is null
  ) then
    raise exception 'only route owner can delete alternate routes' using errcode='42501';
  end if;

  if not exists (
    select 1
      from public.route_branches b
     where b.id = p_branch_id
       and b.route_id = p_route_id
       and b.status = 'active'
  ) then
    raise exception 'alternate route was not found' using errcode='P0002';
  end if;

  delete from public.route_branch_members
   where route_id = p_route_id
     and branch_id = p_branch_id;

  update public.route_branches
     set status = 'archived'
   where id = p_branch_id
     and route_id = p_route_id;
end;
$$;

grant execute on function public.delete_alternate_route(uuid,uuid) to authenticated;

commit;
notify pgrst, 'reload schema';
