-- D Route 2.1.1-RC3 invited Route list repair
begin;

create or replace function public.list_my_routes(p_status text default 'active')
returns table(
  id uuid, owner_user_id uuid, name text, description text, status text,
  created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path=public
as $$
  select r.id, r.owner_user_id, r.name, r.description, r.status, r.created_at, r.updated_at
  from public.routes r
  where r.deleted_at is null
    and r.status = p_status
    and (
      r.owner_user_id = auth.uid()
      or exists (
        select 1 from public.route_members rm
        where rm.route_id = r.id
          and rm.user_id = auth.uid()
          and rm.role = 'member'
          and rm.status in ('unanswered','participating')
      )
    )
  order by r.updated_at desc;
$$;

revoke all on function public.list_my_routes(text) from public;
grant execute on function public.list_my_routes(text) to authenticated;

commit;
notify pgrst,'reload schema';
