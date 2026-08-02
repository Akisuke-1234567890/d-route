-- D Route v2.1.0-p68
-- Branch creation and participant assignment foundation.

begin;

create table if not exists public.route_branches (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  name text not null,
  color_key text not null default 'blue',
  status text not null default 'active' check (status in ('active','merged','archived')),
  order_value numeric not null default 1000,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(name)) between 1 and 40),
  unique(route_id, name)
);

create index if not exists route_branches_route_order_idx
  on public.route_branches(route_id, status, order_value, created_at);

create table if not exists public.route_branch_members (
  route_id uuid not null references public.routes(id) on delete cascade,
  branch_id uuid not null references public.route_branches(id) on delete cascade,
  member_user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  primary key(route_id, member_user_id),
  unique(branch_id, member_user_id)
);

create index if not exists route_branch_members_branch_idx
  on public.route_branch_members(branch_id, assigned_at);

create or replace function public.touch_route_branch_updated_at()
returns trigger language plpgsql set search_path=public as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

drop trigger if exists route_branches_touch_updated_at on public.route_branches;
create trigger route_branches_touch_updated_at
before update on public.route_branches
for each row execute function public.touch_route_branch_updated_at();

create or replace function public.validate_route_branch_member_assignment()
returns trigger language plpgsql set search_path=public as $$
begin
  if not exists (
    select 1 from public.route_branches b
    where b.id=new.branch_id and b.route_id=new.route_id and b.status='active'
  ) then
    raise exception 'branch does not belong to route or is not active' using errcode='23514';
  end if;
  if not exists (
    select 1 from public.route_members rm
    where rm.route_id=new.route_id and rm.user_id=new.member_user_id and rm.status='participating'
  ) then
    raise exception 'user is not a participating route member' using errcode='23514';
  end if;
  return new;
end;
$$;

drop trigger if exists route_branch_members_validate on public.route_branch_members;
create trigger route_branch_members_validate
before insert or update on public.route_branch_members
for each row execute function public.validate_route_branch_member_assignment();

alter table public.route_branches enable row level security;
alter table public.route_branch_members enable row level security;
revoke all on public.route_branches from anon;
revoke all on public.route_branch_members from anon;
grant select on public.route_branches, public.route_branch_members to authenticated;

create policy "Route members can view branches" on public.route_branches
for select to authenticated using (
  exists (
    select 1 from public.route_members rm
    where rm.route_id=route_branches.route_id and rm.user_id=auth.uid() and rm.status='participating'
  )
);

create policy "Route members can view branch assignments" on public.route_branch_members
for select to authenticated using (
  exists (
    select 1 from public.route_members rm
    where rm.route_id=route_branch_members.route_id and rm.user_id=auth.uid() and rm.status='participating'
  )
);

create or replace function public.create_route_branch(p_route_id uuid, p_name text)
returns public.route_branches
language plpgsql security definer set search_path=public as $$
declare result public.route_branches; normalized text:=trim(coalesce(p_name,'')); next_order numeric;
begin
  if not exists(select 1 from public.routes r where r.id=p_route_id and r.owner_user_id=auth.uid() and r.deleted_at is null) then
    raise exception 'only route owner can create branches' using errcode='42501';
  end if;
  if normalized='' or char_length(normalized)>40 then
    raise exception 'branch name must be 1 to 40 characters' using errcode='22023';
  end if;
  select coalesce(max(order_value),0)+1000 into next_order from public.route_branches where route_id=p_route_id;
  insert into public.route_branches(route_id,name,order_value) values(p_route_id,normalized,next_order) returning * into result;
  return result;
end;
$$;

create or replace function public.assign_route_member_to_branch(p_route_id uuid, p_branch_id uuid, p_member_user_id uuid)
returns public.route_branch_members
language plpgsql security definer set search_path=public as $$
declare result public.route_branch_members;
begin
  if not exists(select 1 from public.routes r where r.id=p_route_id and r.owner_user_id=auth.uid() and r.deleted_at is null) then
    raise exception 'only route owner can assign branches' using errcode='42501';
  end if;
  insert into public.route_branch_members(route_id,branch_id,member_user_id,assigned_by)
  values(p_route_id,p_branch_id,p_member_user_id,auth.uid())
  on conflict(route_id,member_user_id) do update set branch_id=excluded.branch_id,assigned_by=auth.uid(),assigned_at=now()
  returning * into result;
  return result;
end;
$$;

create or replace function public.clear_route_member_branch(p_route_id uuid, p_member_user_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.routes r where r.id=p_route_id and r.owner_user_id=auth.uid() and r.deleted_at is null) then
    raise exception 'only route owner can clear branches' using errcode='42501';
  end if;
  delete from public.route_branch_members where route_id=p_route_id and member_user_id=p_member_user_id;
  return found;
end;
$$;

grant execute on function public.create_route_branch(uuid,text) to authenticated;
grant execute on function public.assign_route_member_to_branch(uuid,uuid,uuid) to authenticated;
grant execute on function public.clear_route_member_branch(uuid,uuid) to authenticated;

commit;
notify pgrst,'reload schema';
