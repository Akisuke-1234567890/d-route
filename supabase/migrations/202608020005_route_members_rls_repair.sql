-- D Route v2.1.0-p68.2 route_members RLS repair
begin;

-- Existing routes may be missing their owner membership row. Restore it safely.
insert into public.route_members(route_id,user_id,display_name,role,status)
select
  r.id,
  r.owner_user_id,
  coalesce(nullif(trim(p.display_name),''),'リーダー'),
  'owner',
  'participating'
from public.routes r
left join public.user_profiles p on p.user_id=r.owner_user_id
where r.deleted_at is null
on conflict(route_id,user_id) do update
set role='owner', status='participating';

-- Avoid recursive RLS by checking membership inside a Security Definer helper.
create or replace function public.is_route_member(p_route_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1
    from public.route_members rm
    where rm.route_id=p_route_id
      and rm.user_id=auth.uid()
  );
$$;

revoke all on function public.is_route_member(uuid) from public;
grant execute on function public.is_route_member(uuid) to authenticated;

drop policy if exists "Route owners can view members" on public.route_members;
drop policy if exists "Route members can view members" on public.route_members;
create policy "Route members can view members" on public.route_members
for select to authenticated
using (
  public.is_route_member(route_members.route_id)
  or exists (
    select 1 from public.routes r
    where r.id=route_members.route_id
      and r.owner_user_id=auth.uid()
      and r.deleted_at is null
  )
);

commit;
notify pgrst,'reload schema';

select 'D Route v2.1.0-p68.2 route_members RLS repaired'::text as result;
