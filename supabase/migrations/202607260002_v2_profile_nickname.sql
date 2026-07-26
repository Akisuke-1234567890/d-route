-- D Route v2 profile nickname update RPC.
-- Additive migration for alpha.8. Existing auth/profile data is preserved.

create or replace function public.update_own_display_name(
  p_display_name text
)
returns public.user_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text := trim(p_display_name);
  result public.user_profiles;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if length(normalized_name) < 1 or length(normalized_name) > 30 then
    raise exception 'display name must be 1-30 characters' using errcode = '22023';
  end if;

  update public.user_profiles
  set display_name = normalized_name,
      updated_at = now()
  where user_id = auth.uid()
  returning * into result;

  if result.user_id is null then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  return result;
end;
$$;

revoke all on function public.update_own_display_name(text) from public;
grant execute on function public.update_own_display_name(text) to authenticated;
