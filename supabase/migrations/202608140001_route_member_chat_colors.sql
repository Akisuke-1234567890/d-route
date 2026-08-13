-- D Route v2.1.1-RC6 participant identification colors
begin;

alter table public.route_members
  add column if not exists color_key text not null default 'purple';

alter table public.route_members
  drop constraint if exists route_members_color_key_check;

alter table public.route_members
  add constraint route_members_color_key_check
  check (color_key in ('purple','blue','green','orange','red','gray'));

create or replace function public.set_own_route_member_color(
  p_route_id uuid,
  p_color_key text
)
returns public.route_members
language plpgsql
security definer
set search_path=public
as $$
declare
  result public.route_members;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode='42501';
  end if;

  if p_color_key not in ('purple','blue','green','orange','red','gray') then
    raise exception 'invalid color' using errcode='22023';
  end if;

  update public.route_members
  set color_key = p_color_key
  where route_id = p_route_id
    and user_id = auth.uid()
  returning * into result;

  if result.id is null then
    raise exception 'Route member not found' using errcode='P0002';
  end if;

  return result;
end;
$$;

revoke all on function public.set_own_route_member_color(uuid,text) from public;
grant execute on function public.set_own_route_member_color(uuid,text) to authenticated;

commit;
notify pgrst,'reload schema';
