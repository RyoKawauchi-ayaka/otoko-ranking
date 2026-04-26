-- users.age (女性属性分析用) + 男性向け評価分析RPC

alter table public.users
add column if not exists age int;

-- 男性向け: 自分のプロフィールへの評価内訳を取得
create or replace function public.get_my_male_vote_stats(p_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_owner boolean;
  v_avg numeric;
  v_total int;
  v_normal int;
  v_good int;
  v_excellent int;
  v_female_age_20s int;
  v_female_age_30s int;
  v_female_age_40s int;
  v_female_age_50s int;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select exists(
    select 1 from public.male_profiles mp
    where mp.id = p_profile_id and mp.user_id = v_uid
  )
  into v_owner;
  if not v_owner then
    raise exception 'forbidden';
  end if;

  select
    count(*)::int,
    sum(case when v.rating = 'normal'::public.vote_rating then 1 else 0 end)::int,
    sum(case when v.rating = 'good'::public.vote_rating then 1 else 0 end)::int,
    sum(case when v.rating = 'excellent'::public.vote_rating then 1 else 0 end)::int,
    avg(case
      when v.rating = 'excellent'::public.vote_rating then 3
      when v.rating = 'good'::public.vote_rating then 2
      when v.rating = 'normal'::public.vote_rating then 1
      else 2
    end)
  into v_total, v_normal, v_good, v_excellent, v_avg
  from public.votes v
  where v.target_id = p_profile_id;

  -- 女性年齢帯（users.age を利用。未設定は除外）
  select
    sum(case when u.age between 20 and 29 then 1 else 0 end)::int,
    sum(case when u.age between 30 and 39 then 1 else 0 end)::int,
    sum(case when u.age between 40 and 49 then 1 else 0 end)::int,
    sum(case when u.age between 50 and 59 then 1 else 0 end)::int
  into v_female_age_20s, v_female_age_30s, v_female_age_40s, v_female_age_50s
  from public.votes v
  join public.users u on u.id = v.voter_id
  where v.target_id = p_profile_id and u.gender = 'female' and u.age is not null;

  return jsonb_build_object(
    'total', coalesce(v_total, 0),
    'normal', coalesce(v_normal, 0),
    'good', coalesce(v_good, 0),
    'excellent', coalesce(v_excellent, 0),
    'avg_score', coalesce(v_avg, 0),
    'female_age', jsonb_build_object(
      '20s', coalesce(v_female_age_20s, 0),
      '30s', coalesce(v_female_age_30s, 0),
      '40s', coalesce(v_female_age_40s, 0),
      '50s', coalesce(v_female_age_50s, 0)
    )
  );
end;
$$;

revoke all on function public.get_my_male_vote_stats(uuid) from public;
grant execute on function public.get_my_male_vote_stats(uuid) to authenticated;

