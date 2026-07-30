-- D Route v2.1.0-p38
begin;

create or replace function public.is_participating_route_member(p_route_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.route_members rm
    where rm.route_id = p_route_id
      and rm.user_id = auth.uid()
      and rm.status = 'participating'
  );
$$;

revoke all on function public.is_participating_route_member(uuid) from public;
grant execute on function public.is_participating_route_member(uuid) to authenticated;

drop policy if exists "Owners can view route chat" on public.route_chat_messages;
drop policy if exists "Owners can send route chat" on public.route_chat_messages;
drop policy if exists "Participating members can view route chat" on public.route_chat_messages;
drop policy if exists "Participating members can send route chat" on public.route_chat_messages;

create policy "Participating members can view route chat"
on public.route_chat_messages
for select
to authenticated
using (public.is_participating_route_member(route_id));

create policy "Participating members can send route chat"
on public.route_chat_messages
for insert
to authenticated
with check (
  author_user_id = auth.uid()
  and public.is_participating_route_member(route_id)
);

commit;
notify pgrst, 'reload schema';

select tablename, policyname, cmd
from pg_policies
where schemaname='public' and tablename='route_chat_messages'
order by policyname;
