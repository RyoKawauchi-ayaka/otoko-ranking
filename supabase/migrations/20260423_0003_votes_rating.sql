-- votes に評価(rating)を追加し、cast_vote RPCを拡張する

do $$
begin
  if not exists (select 1 from pg_type where typname = 'vote_rating') then
    create type public.vote_rating as enum ('normal', 'good', 'excellent');
  end if;
end
$$;

alter table public.votes
add column if not exists rating public.vote_rating not null default 'good';

create or replace function public.cast_vote(
  p_target_id uuid,
  p_rating public.vote_rating default 'good',
  p_daily_limit int default 10
)
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

  insert into public.votes (voter_id, target_id, rating)
  values (v_uid, p_target_id, p_rating);
end;
$$;

revoke all on function public.cast_vote(uuid, public.vote_rating, int) from public;
grant execute on function public.cast_vote(uuid, public.vote_rating, int) to authenticated;

