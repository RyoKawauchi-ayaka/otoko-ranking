-- 男ランキングアプリ: 初期スキーマ + RLS + Storage + 投票RPC
-- 1) このSQLをSupabaseのSQL Editorで実行してください。
-- 2) Storage bucket `profile-photos` はこのSQL内で作成します。

create extension if not exists "pgcrypto";

-- ---- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'gender') then
    create type public.gender as enum ('male', 'female');
  end if;
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('user', 'admin');
  end if;
end
$$;

-- ---- Base user profile (auth.users を正として参照)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  gender public.gender not null,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users can read self"
on public.users for select
using (auth.uid() = id);

create policy "users can insert self"
on public.users for insert
with check (auth.uid() = id);

create policy "users can update self (except role)"
on public.users for update
using (auth.uid() = id)
with check (auth.uid() = id and role = (select role from public.users u2 where u2.id = auth.uid()));

-- ---- Male profiles
create table if not exists public.male_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) <= 20),
  age int not null check (age between 18 and 60),
  prefecture text not null,
  job text not null,
  income_range text,
  height int,
  hobbies text[] not null default '{}',
  appeal text check (char_length(appeal) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists male_profiles_user_id_idx on public.male_profiles(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_male_profiles_updated_at on public.male_profiles;
create trigger trg_male_profiles_updated_at
before update on public.male_profiles
for each row execute function public.set_updated_at();

alter table public.male_profiles enable row level security;

create policy "anyone can read male_profiles"
on public.male_profiles for select
using (true);

create policy "male can insert own profile"
on public.male_profiles for insert
with check (
  auth.uid() = user_id
  and exists (select 1 from public.users u where u.id = auth.uid() and u.gender = 'male')
);

create policy "male can update own profile"
on public.male_profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ---- Photos (Supabase Storage path を保持)
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.male_profiles(id) on delete cascade,
  storage_path text not null,
  is_main boolean not null default false,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists photos_profile_id_idx on public.photos(profile_id);
create unique index if not exists photos_one_main_per_profile
on public.photos(profile_id)
where is_main = true;

alter table public.photos enable row level security;

create policy "anyone can read photos"
on public.photos for select
using (true);

create policy "male can manage own photos"
on public.photos for all
using (
  exists (
    select 1
    from public.male_profiles mp
    where mp.id = profile_id and mp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.male_profiles mp
    where mp.id = profile_id and mp.user_id = auth.uid()
  )
);

-- ---- Votes
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  voter_id uuid not null references public.users(id) on delete cascade,
  target_id uuid not null references public.male_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (voter_id, target_id)
);

create index if not exists votes_target_id_idx on public.votes(target_id);
create index if not exists votes_voter_id_created_at_idx on public.votes(voter_id, created_at desc);

alter table public.votes enable row level security;

create policy "anyone can read votes aggregate via view"
on public.votes for select
using (false); -- 直接selectは禁止（集計ビュー経由で）

create policy "female can insert votes"
on public.votes for insert
with check (
  auth.uid() = voter_id
  and exists (select 1 from public.users u where u.id = auth.uid() and u.gender = 'female')
);

-- ---- Ranking view (票数)
create or replace view public.male_ranking as
select
  mp.id as profile_id,
  mp.nickname,
  mp.age,
  mp.prefecture,
  mp.job,
  mp.income_range,
  coalesce(v.cnt, 0)::int as vote_count
from public.male_profiles mp
left join (
  select target_id, count(*) as cnt
  from public.votes
  group by target_id
) v on v.target_id = mp.id;

alter view public.male_ranking set (security_invoker = true);

-- ---- Reports (通報)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id) on delete cascade,
  target_profile_id uuid not null references public.male_profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists reports_target_profile_id_idx on public.reports(target_profile_id);
create index if not exists reports_resolved_at_idx on public.reports(resolved_at);

alter table public.reports enable row level security;

create policy "anyone can insert report"
on public.reports for insert
with check (auth.uid() = reporter_id);

create policy "reporter can read own reports"
on public.reports for select
using (auth.uid() = reporter_id);

create policy "admin can read all reports"
on public.reports for select
using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

create policy "admin can resolve reports"
on public.reports for update
using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

-- ---- Storage bucket & policies
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

-- Objects: path 例 `profiles/<profile_id>/<uuid>.jpg`
-- NOTE:
-- Supabase環境によっては `storage.objects` の ALTER/DROP が「ownerのみ」に制限され、
-- SQL Editor（通常権限）だと 42501 で失敗します。
-- そのため、ここでは ALTER TABLE / DROP POLICY を行わず、
-- 「未作成なら作る」方針でポリシーを追加します（再実行しても安全）。

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'public read profile photos'
  ) then
    execute $pol$
      create policy "public read profile photos"
      on storage.objects for select
      using (bucket_id = 'profile-photos')
    $pol$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'male can upload to own profile folder'
  ) then
    execute $pol$
      create policy "male can upload to own profile folder"
      on storage.objects for insert
      with check (
        bucket_id = 'profile-photos'
        and exists (
          select 1
          from public.male_profiles mp
          where mp.user_id = auth.uid()
            and (storage.foldername(name))[1] = 'profiles'
            and (storage.foldername(name))[2] = mp.id::text
        )
      )
    $pol$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'male can delete own profile photos'
  ) then
    execute $pol$
      create policy "male can delete own profile photos"
      on storage.objects for delete
      using (
        bucket_id = 'profile-photos'
        and exists (
          select 1
          from public.male_profiles mp
          where mp.user_id = auth.uid()
            and (storage.foldername(name))[1] = 'profiles'
            and (storage.foldername(name))[2] = mp.id::text
        )
      )
    $pol$;
  end if;
end
$$;

-- ---- 投票RPC（1日N票制限）
create or replace function public.cast_vote(p_target_id uuid, p_daily_limit int default 10)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_today_count int;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (select 1 from public.users u where u.id = v_uid and u.gender = 'female') then
    raise exception 'only female users can vote';
  end if;

  select count(*)::int
  into v_today_count
  from public.votes v
  where v.voter_id = v_uid
    and v.created_at >= date_trunc('day', now());

  if v_today_count >= p_daily_limit then
    raise exception 'daily vote limit exceeded';
  end if;

  insert into public.votes (voter_id, target_id)
  values (v_uid, p_target_id);
end;
$$;

revoke all on function public.cast_vote(uuid, int) from public;
grant execute on function public.cast_vote(uuid, int) to authenticated;

