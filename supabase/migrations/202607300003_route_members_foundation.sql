-- D Route v2.1.0-p34 Members foundation
begin;

create table if not exists public.route_members (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'member' check (role in ('owner','member')),
  status text not null default 'unanswered' check (status in ('participating','unanswered','declined')),
  created_at timestamptz not null default now(),
  unique(route_id,user_id)
);

insert into public.route_members(route_id,user_id,display_name,role,status)
select r.id,r.owner_user_id,coalesce(nullif(trim(p.display_name),''),'リーダー'),'owner','participating'
from public.routes r
left join public.user_profiles p on p.user_id=r.owner_user_id
where r.deleted_at is null
on conflict(route_id,user_id) do update set role='owner',status='participating';

alter table public.route_members enable row level security;
revoke all on public.route_members from anon;
grant select on public.route_members to authenticated;

drop policy if exists "Route owners can view members" on public.route_members;
create policy "Route owners can view members" on public.route_members
for select to authenticated
using (
  exists(select 1 from public.routes r where r.id=route_members.route_id and r.owner_user_id=auth.uid() and r.deleted_at is null)
);

create or replace function public.add_owner_as_route_member()
returns trigger language plpgsql security definer set search_path=public
as $$
declare v_name text;
begin
  select coalesce(nullif(trim(display_name),''),'リーダー') into v_name
  from public.user_profiles where user_id=new.owner_user_id;
  insert into public.route_members(route_id,user_id,display_name,role,status)
  values(new.id,new.owner_user_id,coalesce(v_name,'リーダー'),'owner','participating')
  on conflict(route_id,user_id) do update set role='owner',status='participating';
  return new;
end;
$$;

drop trigger if exists routes_add_owner_member on public.routes;
create trigger routes_add_owner_member after insert on public.routes
for each row execute function public.add_owner_as_route_member();

commit;
notify pgrst,'reload schema';

select route_id,user_id,display_name,role,status from public.route_members order by created_at;
