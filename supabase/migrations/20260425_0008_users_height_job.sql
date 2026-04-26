-- users: female attributes for analytics + seed compatibility

alter table public.users
add column if not exists height int;

alter table public.users
add column if not exists job text;

