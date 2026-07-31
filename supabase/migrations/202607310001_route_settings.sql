-- D Route v2.1.0-p48
-- Route basic settings: name + description.

begin;

alter table public.routes
  add column if not exists description text;

alter table public.routes
  drop constraint if exists routes_description_length_check;

alter table public.routes
  add constraint routes_description_length_check
  check (description is null or char_length(description) <= 200);

create or replace function public.update_owned_route_settings(
  p_route_id uuid,
  p_name text,
  p_description text default null
)
returns public.routes
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text := trim(p_name);
  normalized_description text := nullif(trim(coalesce(p_description, '')), '');
  result public.routes;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode='42501';
  end if;

  if normalized_name = '' then
    raise exception 'Route name is required' using errcode='22023';
  end if;

  if char_length(normalized_name) > 60 then
    raise exception 'Route name is too long' using errcode='22023';
  end if;

  if normalized_description is not null and char_length(normalized_description) > 200 then
    raise exception 'Route description is too long' using errcode='22023';
  end if;

  update public.routes
  set name = normalized_name,
      description = normalized_description,
      updated_at = now()
  where id = p_route_id
    and owner_user_id = auth.uid()
    and deleted_at is null
  returning * into result;

  if result.id is null then
    raise exception 'Route not found or owner required' using errcode='42501';
  end if;

  return result;
end;
$$;

revoke all on function public.update_owned_route_settings(uuid,text,text) from public;
grant execute on function public.update_owned_route_settings(uuid,text,text) to authenticated;

commit;
notify pgrst,'reload schema';

select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='routes' and column_name='description';
