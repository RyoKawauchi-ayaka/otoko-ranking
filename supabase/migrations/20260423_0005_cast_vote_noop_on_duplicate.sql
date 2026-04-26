-- cast_vote: 既に同じtargetに投票済みなら no-op（エラーにしない）
-- unique(voter_id, target_id) 制約違反をユーザーに見せないため

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

  -- 既に投票済みなら何もしない（重複で落とさない）
  if exists (select 1 from public.votes v where v.voter_id = v_uid and v.target_id = p_target_id) then
    return;
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
  values (v_uid, p_target_id, p_rating)
  on conflict (voter_id, target_id) do nothing;
end;
$$;

revoke all on function public.cast_vote(uuid, public.vote_rating, int) from public;
grant execute on function public.cast_vote(uuid, public.vote_rating, int) to authenticated;

