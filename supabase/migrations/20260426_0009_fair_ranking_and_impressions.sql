-- Fair ranking (Bayesian average), impression tracking, users.view_count

-- ---- users.view_count (累計「男性プロフィール表示」回数 = 男性ユーザーの累計露出)
alter table public.users
add column if not exists view_count bigint not null default 0;

-- ---- 女性×男性の表示回数（同一組み合わせは1日1回までカウント）
create table if not exists public.female_male_daily_views (
  viewer_id uuid not null references public.users(id) on delete cascade,
  profile_id uuid not null references public.male_profiles(id) on delete cascade,
  day date not null,
  view_count int not null default 0,
  primary key (viewer_id, profile_id, day)
);

create index if not exists female_male_daily_views_profile_day_idx
on public.female_male_daily_views (profile_id, day);

alter table public.female_male_daily_views enable row level security;

create policy "viewer can read own female_male_daily_views"
on public.female_male_daily_views for select
using (auth.uid() = viewer_id);

create policy "viewer can upsert own female_male_daily_views"
on public.female_male_daily_views for insert
with check (auth.uid() = viewer_id);

create policy "viewer can update own female_male_daily_views"
on public.female_male_daily_views for update
using (auth.uid() = viewer_id)
with check (auth.uid() = viewer_id);

-- ---- RPC: 表示カウント（1日1回/組み合わせ、男性オーナーの users.view_count も +1）
create or replace function public.record_male_profile_view(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_day date;
  v_owner uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (select 1 from public.users u where u.id = v_uid and u.gender = 'female') then
    raise exception 'only female users can record views';
  end if;

  v_day := (timezone('Asia/Tokyo', now()))::date;

  select mp.user_id into v_owner
  from public.male_profiles mp
  where mp.id = p_profile_id;

  if v_owner is null then
    raise exception 'profile not found';
  end if;

  insert into public.female_male_daily_views (viewer_id, profile_id, day, view_count)
  values (v_uid, p_profile_id, v_day, 1)
  on conflict (viewer_id, profile_id, day)
  do update set view_count = public.female_male_daily_views.view_count + 1;

  update public.users
  set view_count = view_count + 1
  where id = v_owner;
end;
$$;

revoke all on function public.record_male_profile_view(uuid) from public;
grant execute on function public.record_male_profile_view(uuid) to authenticated;

-- ---- male_ranking: Bayesian average of score (1..3), C=global mean, m=prior strength
create or replace view public.male_ranking as
with scored as (
  select
    v.target_id,
    count(*)::int as vote_n,
    avg(
      case v.rating
        when 'excellent'::public.vote_rating then 3.0
        when 'good'::public.vote_rating then 2.0
        when 'normal'::public.vote_rating then 1.0
        else 2.0
      end
    )::double precision as avg_score
  from public.votes v
  group by v.target_id
),
globals as (
  select
    coalesce(avg(
      case v.rating
        when 'excellent'::public.vote_rating then 3.0
        when 'good'::public.vote_rating then 2.0
        when 'normal'::public.vote_rating then 1.0
        else 2.0
      end
    ), 2.0)::double precision as c,
    8::double precision as m
  from public.votes v
)
select
  mp.id as profile_id,
  mp.nickname,
  mp.age,
  mp.prefecture,
  mp.job,
  mp.income_range,
  coalesce(s.vote_n, 0)::int as vote_count,
  coalesce(
    (globals.c * globals.m + coalesce(s.avg_score, 0) * coalesce(s.vote_n, 0)) / (globals.m + greatest(coalesce(s.vote_n, 0), 0)),
    globals.c
  )::double precision as bayes_score
from public.male_profiles mp
cross join globals
left join scored s on s.target_id = mp.id;

alter view public.male_ranking set (security_invoker = true);
