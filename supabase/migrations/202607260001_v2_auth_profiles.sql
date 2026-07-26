-- D Route v2 authentication profile layer.
-- Safe additive migration: existing auth.users are preserved and marked as legacy.

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  login_id text,
  display_name text,
  account_origin text not null default 'new' check (account_origin in ('legacy', 'new')),
  credentials_ready_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_profiles_login_id_lower_unique
  on public.user_profiles (lower(login_id))
  where login_id is not null;

alter table public.user_profiles enable row level security;

revoke all on table public.user_profiles from anon;
revoke insert, update, delete on table public.user_profiles from authenticated;
grant select on table public.user_profiles to authenticated;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
  on public.user_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

-- Backfill every user that existed before this migration.
insert into public.user_profiles (user_id, display_name, account_origin)
select
  u.id,
  nullif(coalesce(u.raw_user_meta_data ->> 'display_name', u.raw_user_meta_data ->> 'full_name', ''), ''),
  'legacy'
from auth.users u
on conflict (user_id) do nothing;

create or replace function public.handle_new_d_route_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, display_name, account_origin)
  values (
    new.id,
    nullif(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', ''), ''),
    'new'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_d_route_profile on auth.users;
create trigger on_auth_user_created_d_route_profile
after insert on auth.users
for each row execute procedure public.handle_new_d_route_user();

create or replace function public.set_user_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute procedure public.set_user_profiles_updated_at();

create or replace function public.complete_v2_account_setup(
  p_login_id text,
  p_display_name text default null
)
returns public.user_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_id text := lower(trim(p_login_id));
  result public.user_profiles;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if length(normalized_id) < 4 or length(normalized_id) > 24 then
    raise exception 'login id must be 4-24 characters' using errcode = '22023';
  end if;

  if normalized_id !~ '^[a-z0-9._-]+$' then
    raise exception 'login id contains invalid characters' using errcode = '22023';
  end if;

  insert into public.user_profiles (user_id, login_id, display_name, account_origin, credentials_ready_at)
  values (auth.uid(), normalized_id, nullif(trim(p_display_name), ''), 'new', now())
  on conflict (user_id) do update
  set
    login_id = excluded.login_id,
    display_name = coalesce(nullif(trim(p_display_name), ''), public.user_profiles.display_name),
    credentials_ready_at = now(),
    updated_at = now()
  returning * into result;

  return result;
exception
  when unique_violation then
    raise exception 'login id already exists' using errcode = '23505';
end;
$$;

revoke all on function public.complete_v2_account_setup(text, text) from public;
grant execute on function public.complete_v2_account_setup(text, text) to authenticated;
