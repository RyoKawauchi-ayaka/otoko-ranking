-- Preferences collection + private info gating + paid flags (MVP)

-- ---- Paid flags
alter table public.users
add column if not exists is_paid_user boolean not null default false;

-- ---- Feature tags (女性が評価時に選ぶ「見た目/特徴」)
create table if not exists public.vote_feature_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label_ja text not null,
  category text not null default 'appearance',
  created_at timestamptz not null default now()
);

alter table public.vote_feature_tags enable row level security;
create policy "anyone can read vote_feature_tags"
on public.vote_feature_tags for select
using (true);

-- seed (safe re-run)
insert into public.vote_feature_tags (slug, label_ja, category) values
  ('muscular', '筋肉質', 'appearance'),
  ('fit', '引き締まっている', 'appearance'),
  ('tall', '高身長', 'appearance'),
  ('clean', '清潔感', 'appearance'),
  ('fashionable', 'おしゃれ', 'appearance'),
  ('salt_face', '塩顔', 'face'),
  ('strong_face', '濃い顔', 'face'),
  ('smart', '知的', 'vibe'),
  ('kind', '優しそう', 'vibe'),
  ('funny', '面白そう', 'vibe')
on conflict (slug) do nothing;

-- 1回の投票(votes)に対して特徴タグを紐付け（0..N）
create table if not exists public.vote_feature_selections (
  vote_id uuid not null references public.votes(id) on delete cascade,
  tag_id uuid not null references public.vote_feature_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (vote_id, tag_id)
);

alter table public.vote_feature_selections enable row level security;

-- 女性は「自分の投票」に対する特徴付けのみ作成/参照可
create policy "voter can read own vote_feature_selections"
on public.vote_feature_selections for select
using (
  exists (
    select 1 from public.votes v
    where v.id = vote_id and v.voter_id = auth.uid()
  )
);

create policy "voter can insert own vote_feature_selections"
on public.vote_feature_selections for insert
with check (
  exists (
    select 1 from public.votes v
    where v.id = vote_id and v.voter_id = auth.uid()
  )
);

create policy "voter can delete own vote_feature_selections"
on public.vote_feature_selections for delete
using (
  exists (
    select 1 from public.votes v
    where v.id = vote_id and v.voter_id = auth.uid()
  )
);

-- ---- High-rated gating helper view
create or replace view public.female_high_rated_males as
select v.voter_id, v.target_id
from public.votes v
where v.rating in ('good'::public.vote_rating, 'excellent'::public.vote_rating);

alter view public.female_high_rated_males set (security_invoker = true);

-- ---- Private profile fields (男性が入力、女性は高評価のみ閲覧)
create table if not exists public.male_private_profiles (
  profile_id uuid primary key references public.male_profiles(id) on delete cascade,
  education text,
  company_size text,
  personality text,
  private_note text,
  updated_at timestamptz not null default now()
);

alter table public.male_private_profiles enable row level security;

create policy "male can manage own male_private_profiles"
on public.male_private_profiles for all
using (
  exists (select 1 from public.male_profiles mp where mp.id = profile_id and mp.user_id = auth.uid())
)
with check (
  exists (select 1 from public.male_profiles mp where mp.id = profile_id and mp.user_id = auth.uid())
);

create policy "female high-rated can read male_private_profiles"
on public.male_private_profiles for select
using (
  exists (
    select 1
    from public.female_high_rated_males hr
    where hr.voter_id = auth.uid() and hr.target_id = profile_id
  )
);

-- ---- Private photos (separate bucket)
create table if not exists public.private_photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.male_profiles(id) on delete cascade,
  storage_path text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists private_photos_profile_id_idx on public.private_photos(profile_id);

alter table public.private_photos enable row level security;

create policy "male can manage own private_photos"
on public.private_photos for all
using (
  exists (select 1 from public.male_profiles mp where mp.id = profile_id and mp.user_id = auth.uid())
)
with check (
  exists (select 1 from public.male_profiles mp where mp.id = profile_id and mp.user_id = auth.uid())
);

create policy "female high-rated can read private_photos"
on public.private_photos for select
using (
  exists (
    select 1
    from public.female_high_rated_males hr
    where hr.voter_id = auth.uid() and hr.target_id = profile_id
  )
);

-- storage bucket (private)
insert into storage.buckets (id, name, public)
values ('profile-private-photos', 'profile-private-photos', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'male can upload private photos'
  ) then
    execute $pol$
      create policy "male can upload private photos"
      on storage.objects for insert
      with check (
        bucket_id = 'profile-private-photos'
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
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'male can delete private photos'
  ) then
    execute $pol$
      create policy "male can delete private photos"
      on storage.objects for delete
      using (
        bucket_id = 'profile-private-photos'
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

-- ---- AI usage + ideal generation cache/history (paid gated)
create table if not exists public.ai_usage (
  user_id uuid not null references public.users(id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;
create policy "user can read own ai_usage"
on public.ai_usage for select
using (auth.uid() = user_id);
create policy "user can upsert own ai_usage"
on public.ai_usage for insert
with check (auth.uid() = user_id);
create policy "user can update own ai_usage"
on public.ai_usage for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.ideal_male_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  input_hash text not null,
  result_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, input_hash)
);

alter table public.ideal_male_generations enable row level security;
create policy "user can read own ideal_male_generations"
on public.ideal_male_generations for select
using (auth.uid() = user_id);
create policy "user can insert own ideal_male_generations"
on public.ideal_male_generations for insert
with check (auth.uid() = user_id);

