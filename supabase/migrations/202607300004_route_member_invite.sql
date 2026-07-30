-- D Route v2.1.0-p35
-- Owner invite by login_id.

begin;

create or replace function public.invite_route_member_by_login_id(
  p_route_id uuid,
  p_login_id text
)
returns public.route_members
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_login_id text := lower(trim(p_login_id));
  target_user_id uuid;
  target_display_name text;
  result public.route_members;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.routes r
    where r.id = p_route_id
      and r.owner_user_id = auth.uid()
      and r.deleted_at is null
  ) then
    raise exception 'only the Route owner can invite members' using errcode = '42501';
  end if;

  if normalized_login_id = '' then
    raise exception 'login id is required' using errcode = '22023';
  end if;

  select p.user_id, coalesce(nullif(trim(p.display_name), ''), p.login_id)
  into target_user_id, target_display_name
  from public.user_profiles p
  where lower(p.login_id) = normalized_login_id
    and p.credentials_ready_at is not null
  limit 1;

  if target_user_id is null then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Route owner is already a member' using errcode = '23505';
  end if;

  insert into public.route_members(route_id, user_id, display_name, role, status)
  values(p_route_id, target_user_id, target_display_name, 'member', 'unanswered')
  on conflict(route_id, user_id) do update
  set display_name = excluded.display_name
  returning * into result;

  return result;
end;
$$;

revoke all on function public.invite_route_member_by_login_id(uuid, text) from public;
grant execute on function public.invite_route_member_by_login_id(uuid, text) to authenticated;

commit;

notify pgrst, 'reload schema';

select proname
from pg_proc
where proname = 'invite_route_member_by_login_id';
