-- D Route v2.1.0-p36 participation response
begin;

drop policy if exists "Route owners can view members" on public.route_members;
drop policy if exists "Route members can view members" on public.route_members;
create policy "Route members can view members" on public.route_members
for select to authenticated
using (
  exists (
    select 1 from public.route_members self
    where self.route_id=route_members.route_id and self.user_id=auth.uid()
  )
);

create or replace function public.respond_to_route_invite(p_route_id uuid,p_status text)
returns public.route_members
language plpgsql security definer set search_path=public
as $$
declare result public.route_members;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_status not in ('participating','declined') then raise exception 'invalid response' using errcode='22023'; end if;
  update public.route_members
    set status=p_status
    where route_id=p_route_id and user_id=auth.uid() and role='member'
    returning * into result;
  if result.id is null then raise exception 'invitation not found' using errcode='P0002'; end if;
  return result;
end;
$$;
revoke all on function public.respond_to_route_invite(uuid,text) from public;
grant execute on function public.respond_to_route_invite(uuid,text) to authenticated;

commit;
notify pgrst,'reload schema';
select proname from pg_proc where proname='respond_to_route_invite';
