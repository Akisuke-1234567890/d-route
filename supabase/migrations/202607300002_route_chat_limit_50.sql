-- D Route v2.1.0-p33.3
begin;
alter table public.route_chat_messages drop constraint if exists route_chat_body_check;
alter table public.route_chat_messages add constraint route_chat_body_check check (length(trim(body)) between 1 and 50);
commit;
notify pgrst, 'reload schema';
select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.route_chat_messages'::regclass and conname='route_chat_body_check';
