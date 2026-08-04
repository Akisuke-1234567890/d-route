-- p81.6: per-schedule My Members override
alter table public.destinations add column if not exists assignment_mode text not null default 'inherit';
alter table public.destinations drop constraint if exists destinations_assignment_mode_check;
alter table public.destinations add constraint destinations_assignment_mode_check check (assignment_mode in ('inherit','override'));

create table if not exists public.route_destination_my_members (
  route_id uuid not null references public.routes(id) on delete cascade,
  destination_id uuid not null references public.destinations(id) on delete cascade,
  my_member_id uuid not null references public.my_members(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key(destination_id,my_member_id)
);
create index if not exists route_destination_my_members_route_idx on public.route_destination_my_members(route_id,destination_id);
alter table public.route_destination_my_members enable row level security;
create policy "route_destination_my_members_select_own" on public.route_destination_my_members for select to authenticated using (
  exists(select 1 from public.routes r where r.id=route_id and r.owner_user_id=auth.uid()) and
  exists(select 1 from public.my_members m where m.id=my_member_id and m.owner_user_id=auth.uid())
);
create policy "route_destination_my_members_insert_own" on public.route_destination_my_members for insert to authenticated with check (
  exists(select 1 from public.routes r where r.id=route_id and r.owner_user_id=auth.uid()) and
  exists(select 1 from public.my_members m where m.id=my_member_id and m.owner_user_id=auth.uid()) and
  exists(select 1 from public.destinations d where d.id=destination_id and d.route_id=route_id)
);
create policy "route_destination_my_members_delete_own" on public.route_destination_my_members for delete to authenticated using (
  exists(select 1 from public.routes r where r.id=route_id and r.owner_user_id=auth.uid()) and
  exists(select 1 from public.my_members m where m.id=my_member_id and m.owner_user_id=auth.uid())
);
grant select,insert,delete on public.route_destination_my_members to authenticated;
