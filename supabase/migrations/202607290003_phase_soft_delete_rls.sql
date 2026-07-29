-- D Route v2.1.0-p25.1.2
-- Allow Route owners to read their own soft-deleted phases so UPDATE ... deleted_at
-- can complete under PostgREST/RLS. Application queries still filter deleted_at is null.

begin;

drop policy if exists "Owners can view route phases" on public.phases;

create policy "Owners can view route phases"
on public.phases
for select
to authenticated
using (
  exists (
    select 1
    from public.routes r
    where r.id = phases.route_id
      and r.owner_user_id = auth.uid()
      and r.deleted_at is null
  )
);

commit;

notify pgrst, 'reload schema';

select
  policyname,
  cmd,
  qual
from pg_policies
where schemaname = 'public'
  and tablename = 'phases'
  and policyname = 'Owners can view route phases';
