-- 同一男性への再評価: 1日1回まで（voter_id + target_id + vote_day で一意）
-- 既存行は created_at から東京日付で vote_day を埋める

alter table public.votes
add column if not exists vote_day date;

update public.votes v
set vote_day = (timezone('Asia/Tokyo', v.created_at))::date
where v.vote_day is null;

alter table public.votes
alter column vote_day set not null;

alter table public.votes
drop constraint if exists votes_voter_id_target_id_key;

alter table public.votes
add constraint votes_voter_target_day unique (voter_id, target_id, vote_day);

create index if not exists votes_voter_vote_day_idx on public.votes (voter_id, vote_day);

-- 同日・同対象は no-op、日次上限は「その日の投票行数」でカウント
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
  v_today date;
  v_today_count int;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (select 1 from public.users u where u.id = v_uid and u.gender = 'female') then
    raise exception 'only female users can vote';
  end if;

  v_today := (timezone('Asia/Tokyo', now()))::date;

  if exists (
    select 1
    from public.votes v
    where v.voter_id = v_uid
      and v.target_id = p_target_id
      and v.vote_day = v_today
  ) then
    return;
  end if;

  select count(*)::int
  into v_today_count
  from public.votes v
  where v.voter_id = v_uid
    and v.vote_day = v_today;

  if v_today_count >= p_daily_limit then
    raise exception 'daily vote limit exceeded';
  end if;

  insert into public.votes (voter_id, target_id, rating, vote_day)
  values (v_uid, p_target_id, p_rating, v_today);
end;
$$;

revoke all on function public.cast_vote(uuid, public.vote_rating, int) from public;
grant execute on function public.cast_vote(uuid, public.vote_rating, int) to authenticated;
