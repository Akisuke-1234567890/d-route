-- D Route v2.1.0-p80 My Members foundation.
-- Personal companion directory, independent from shared route invitations.

create table if not exists public.my_members (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint my_members_name_length check (char_length(trim(name)) between 1 and 30)
);

create index if not exists my_members_owner_created_idx
  on public.my_members(owner_user_id, created_at);

alter table public.my_members enable row level security;

create policy "my_members_select_own"
  on public.my_members for select
  to authenticated
  using (owner_user_id = auth.uid());

create policy "my_members_insert_own"
  on public.my_members for insert
  to authenticated
  with check (owner_user_id = auth.uid());

create policy "my_members_update_own"
  on public.my_members for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy "my_members_delete_own"
  on public.my_members for delete
  to authenticated
  using (owner_user_id = auth.uid());

grant select, insert, update, delete on public.my_members to authenticated;
