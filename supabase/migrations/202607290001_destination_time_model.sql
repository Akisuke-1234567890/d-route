-- D Route v2.1.0-p23
-- Destination time model
begin;
alter table public.destinations
  add column if not exists time_type text not null default 'none',
  add column if not exists start_time time null,
  add column if not exists end_time time null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='destinations_time_type_check' and conrelid='public.destinations'::regclass) then
    alter table public.destinations add constraint destinations_time_type_check check (time_type in ('none','fixed','approx'));
  end if;
end; $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='destinations_time_value_check' and conrelid='public.destinations'::regclass) then
    alter table public.destinations add constraint destinations_time_value_check check (
      (time_type='none' and start_time is null and end_time is null)
      or (time_type in ('fixed','approx') and start_time is not null)
    );
  end if;
end; $$;

create index if not exists destinations_route_phase_time_idx
  on public.destinations(route_id, phase_id, start_time)
  where deleted_at is null and start_time is not null;
commit;
notify pgrst, 'reload schema';
select column_name, data_type, is_nullable from information_schema.columns
where table_schema='public' and table_name='destinations' and column_name in ('time_type','start_time','end_time')
order by column_name;
