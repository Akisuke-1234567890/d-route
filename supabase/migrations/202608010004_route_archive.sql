-- D Route v2.1.0-p60
-- Archive / restore owned Routes.

begin;

create or replace function public.set_owned_route_archived(
  p_route_id uuid,
  p_archived boolean
)
returns public.routes
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.routes;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode='42501';
  end if;

  update public.routes
  set status = case when p_archived then 'archived' else 'active' end,
      updated_at = now()
  where id = p_route_id
    and owner_user_id = auth.uid()
    and deleted_at is null
  returning * into result;

  if result.id is null then
    raise exception 'Route not found or owner required' using errcode='42501';
  end if;

  return result;
end;
$$;

revoke all on function public.set_owned_route_archived(uuid,boolean) from public;
grant execute on function public.set_owned_route_archived(uuid,boolean) to authenticated;

commit;
notify pgrst,'reload schema';

select proname
from pg_proc
where proname='set_owned_route_archived';
