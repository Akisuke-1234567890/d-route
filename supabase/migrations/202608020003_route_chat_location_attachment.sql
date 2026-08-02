-- D Route v2.1.0-p66
-- Add one-time location attachments to Route Chat messages.

begin;

alter table public.route_chat_messages
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_accuracy_meters double precision,
  add column if not exists location_captured_at timestamptz;

alter table public.route_chat_messages
  drop constraint if exists route_chat_location_pair_check,
  drop constraint if exists route_chat_latitude_check,
  drop constraint if exists route_chat_longitude_check,
  drop constraint if exists route_chat_location_accuracy_check;

alter table public.route_chat_messages
  add constraint route_chat_location_pair_check check (
    (latitude is null and longitude is null and location_captured_at is null)
    or
    (latitude is not null and longitude is not null and location_captured_at is not null)
  ),
  add constraint route_chat_latitude_check check (latitude is null or latitude between -90 and 90),
  add constraint route_chat_longitude_check check (longitude is null or longitude between -180 and 180),
  add constraint route_chat_location_accuracy_check check (location_accuracy_meters is null or location_accuracy_meters >= 0);

commit;

notify pgrst, 'reload schema';

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'route_chat_messages'
  and column_name in ('latitude','longitude','location_accuracy_meters','location_captured_at')
order by ordinal_position;
