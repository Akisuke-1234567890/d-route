-- D Route 2.1.1-RC2 invited Route open/access repair
begin;

-- Invited users need to resolve the Route itself before answering the invitation.
create or replace function public.get_my_route(p_route_id uuid)
returns public.routes
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  result public.routes;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode='42501';
  end if;

  select r.*
    into result
  from public.routes r
  where r.id = p_route_id
    and r.deleted_at is null
    and (
      r.owner_user_id = auth.uid()
      or exists (
        select 1
        from public.route_members rm
        where rm.route_id = r.id
          and rm.user_id = auth.uid()
      )
    )
  limit 1;

  if result.id is null then
    raise exception 'Route not found or access denied' using errcode='P0002';
  end if;

  return result;
end;
$$;

revoke all on function public.get_my_route(uuid) from public;
grant execute on function public.get_my_route(uuid) to authenticated;

-- Once an invitation is accepted, participants must be able to read the
-- planning data used by the participant dashboard.
drop policy if exists "Owners can view route phases" on public.phases;
create policy "Route participants can view route phases"
on public.phases for select to authenticated
using (
  deleted_at is null
  and (
    exists (
      select 1 from public.routes r
      where r.id = phases.route_id
        and r.owner_user_id = auth.uid()
        and r.deleted_at is null
    )
    or public.is_participating_route_member(phases.route_id)
  )
);

drop policy if exists "Owners can view route destinations" on public.destinations;
create policy "Route participants can view route destinations"
on public.destinations for select to authenticated
using (
  deleted_at is null
  and (
    exists (
      select 1 from public.routes r
      where r.id = destinations.route_id
        and r.owner_user_id = auth.uid()
        and r.deleted_at is null
    )
    or public.is_participating_route_member(destinations.route_id)
  )
);

commit;
notify pgrst,'reload schema';
