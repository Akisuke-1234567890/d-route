-- D Route v2.1.0-p81.0 My Members assignment for sub routes.

create table if not exists public.route_branch_my_members (
  route_id uuid not null references public.routes(id) on delete cascade,
  branch_id uuid not null references public.route_branches(id) on delete cascade,
  my_member_id uuid not null references public.my_members(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (branch_id, my_member_id)
);

create index if not exists route_branch_my_members_route_idx
  on public.route_branch_my_members(route_id, branch_id);

alter table public.route_branch_my_members enable row level security;

create policy "route_branch_my_members_select_own"
  on public.route_branch_my_members for select to authenticated
  using (
    exists(select 1 from public.routes r where r.id=route_id and r.owner_user_id=auth.uid() and r.deleted_at is null)
    and exists(select 1 from public.my_members m where m.id=my_member_id and m.owner_user_id=auth.uid())
  );

create policy "route_branch_my_members_insert_own"
  on public.route_branch_my_members for insert to authenticated
  with check (
    exists(select 1 from public.routes r where r.id=route_id and r.owner_user_id=auth.uid() and r.deleted_at is null)
    and exists(select 1 from public.route_branches b where b.id=branch_id and b.route_id=route_id and b.status='active')
    and exists(select 1 from public.my_members m where m.id=my_member_id and m.owner_user_id=auth.uid())
  );

create policy "route_branch_my_members_delete_own"
  on public.route_branch_my_members for delete to authenticated
  using (
    exists(select 1 from public.routes r where r.id=route_id and r.owner_user_id=auth.uid() and r.deleted_at is null)
    and exists(select 1 from public.my_members m where m.id=my_member_id and m.owner_user_id=auth.uid())
  );

grant select, insert, delete on public.route_branch_my_members to authenticated;
