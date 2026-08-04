-- D Route v2.1.0-p81.5 My Members identification colors
alter table public.my_members
  add column if not exists color_key text not null default 'purple';

alter table public.my_members
  drop constraint if exists my_members_color_key_check;

alter table public.my_members
  add constraint my_members_color_key_check
  check (color_key in ('purple','blue','green','orange','red','gray'));
