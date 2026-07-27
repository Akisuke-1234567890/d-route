-- D Route v2.1.0-p09
-- Owner-only Route soft deletion.
-- Uses existing routes.owner_user_id and routes.deleted_at.
-- Safe additive migration: no Route data is physically removed.

create or replace function public.delete_owned_route(
  p_route_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  update public.routes
  set
    deleted_at = now(),
    updated_at = now()
  where id = p_route_id
    and owner_user_id = auth.uid()
    and deleted_at is null;

  get diagnostics affected_count = row_count;

  if affected_count = 0 then
    if exists (
      select 1
      from public.routes
      where id = p_route_id
        and deleted_at is null
    ) then
      raise exception 'only the route owner can delete this route' using errcode = '42501';
    end if;

    raise exception 'route not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_owned_route(uuid) from public;
grant execute on function public.delete_owned_route(uuid) to authenticated;
