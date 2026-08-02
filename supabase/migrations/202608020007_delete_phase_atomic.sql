-- D Route v2.1.0-p70.2
-- Phase deletion must switch the default Phase atomically.

begin;

create or replace function public.delete_route_phase(
  p_route_id uuid,
  p_phase_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.phases%rowtype;
  v_fallback public.phases%rowtype;
  v_remaining_count integer;
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です。';
  end if;

  if not exists (
    select 1
    from public.routes r
    where r.id = p_route_id
      and r.owner_user_id = auth.uid()
      and r.deleted_at is null
  ) then
    raise exception 'このPhaseを削除する権限がありません。';
  end if;

  select * into v_target
  from public.phases p
  where p.id = p_phase_id
    and p.route_id = p_route_id
    and p.deleted_at is null
  for update;

  if not found then
    raise exception 'Phaseが見つかりません。';
  end if;

  select count(*) into v_remaining_count
  from public.phases p
  where p.route_id = p_route_id
    and p.id <> p_phase_id
    and p.deleted_at is null;

  if v_remaining_count < 1 then
    raise exception '最後のPhaseは削除できません。';
  end if;

  select * into v_fallback
  from public.phases p
  where p.route_id = p_route_id
    and p.id <> p_phase_id
    and p.deleted_at is null
  order by p.is_default desc, p.order_value asc, p.created_at asc, p.id asc
  limit 1
  for update;

  -- Clear the old default first so the partial unique index is never violated.
  if v_target.is_default then
    update public.phases
    set is_default = false
    where id = v_target.id;

    update public.phases
    set is_default = true
    where id = v_fallback.id;
  end if;

  update public.destinations
  set phase_id = v_fallback.id
  where route_id = p_route_id
    and phase_id = p_phase_id
    and record_status = 'active'
    and deleted_at is null;

  update public.phases
  set deleted_at = now(),
      is_default = false
  where id = p_phase_id
    and route_id = p_route_id
    and deleted_at is null;
end;
$$;

revoke all on function public.delete_route_phase(uuid, uuid) from public;
grant execute on function public.delete_route_phase(uuid, uuid) to authenticated;

commit;
