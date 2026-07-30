-- D Route v2.1.0-p32
-- Route Chat baseline. Owner-only RLS until Route membership is introduced.

begin;

create table if not exists public.route_chat_messages (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  body text not null,
  is_important boolean not null default false,
  created_at timestamptz not null default now(),
  constraint route_chat_body_check check (length(trim(body)) between 1 and 500),
  constraint route_chat_author_name_check check (length(trim(author_name)) between 1 and 60)
);

create index if not exists route_chat_messages_route_created_idx
  on public.route_chat_messages(route_id, created_at desc);

alter table public.route_chat_messages enable row level security;

revoke all on table public.route_chat_messages from anon;
grant select, insert on table public.route_chat_messages to authenticated;

drop policy if exists "Owners can view route chat" on public.route_chat_messages;
create policy "Owners can view route chat"
on public.route_chat_messages
for select
to authenticated
using (
  exists (
    select 1 from public.routes r
    where r.id = route_chat_messages.route_id
      and r.owner_user_id = auth.uid()
      and r.deleted_at is null
  )
);

drop policy if exists "Owners can send route chat" on public.route_chat_messages;
create policy "Owners can send route chat"
on public.route_chat_messages
for insert
to authenticated
with check (
  author_user_id = auth.uid()
  and exists (
    select 1 from public.routes r
    where r.id = route_chat_messages.route_id
      and r.owner_user_id = auth.uid()
      and r.deleted_at is null
  )
);

commit;

notify pgrst, 'reload schema';

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'route_chat_messages';
