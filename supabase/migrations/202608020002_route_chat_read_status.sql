-- D Route v2.1.0-p65
-- Route Chat read cursor, unread divider and read counts.
begin;

create table if not exists public.route_chat_read_status (
  route_id uuid not null references public.routes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (route_id, user_id)
);

create index if not exists route_chat_read_status_route_read_idx
  on public.route_chat_read_status(route_id, last_read_at desc);

alter table public.route_chat_read_status enable row level security;
revoke all on table public.route_chat_read_status from anon;
grant select, insert, update on table public.route_chat_read_status to authenticated;

drop policy if exists "Participating members can view chat read status" on public.route_chat_read_status;
create policy "Participating members can view chat read status"
on public.route_chat_read_status
for select
to authenticated
using (public.is_participating_route_member(route_id));

drop policy if exists "Members can create own chat read status" on public.route_chat_read_status;
create policy "Members can create own chat read status"
on public.route_chat_read_status
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_participating_route_member(route_id)
);

drop policy if exists "Members can update own chat read status" on public.route_chat_read_status;
create policy "Members can update own chat read status"
on public.route_chat_read_status
for update
to authenticated
using (
  user_id = auth.uid()
  and public.is_participating_route_member(route_id)
)
with check (
  user_id = auth.uid()
  and public.is_participating_route_member(route_id)
);

create or replace function public.touch_route_chat_read_status_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists route_chat_read_status_touch_updated_at on public.route_chat_read_status;
create trigger route_chat_read_status_touch_updated_at
before update on public.route_chat_read_status
for each row execute function public.touch_route_chat_read_status_updated_at();

alter table public.route_chat_messages replica identity full;
alter table public.route_chat_read_status replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'route_chat_messages'
  ) then
    alter publication supabase_realtime add table public.route_chat_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'route_chat_read_status'
  ) then
    alter publication supabase_realtime add table public.route_chat_read_status;
  end if;
end;
$$;

commit;
notify pgrst, 'reload schema';
