-- male_ranking の vote_count を「票数」ではなく「点数合計」にする
-- normal=1, good=2, excellent=3

create or replace view public.male_ranking as
select
  mp.id as profile_id,
  mp.nickname,
  mp.age,
  mp.prefecture,
  mp.job,
  mp.income_range,
  coalesce(v.score, 0)::int as vote_count
from public.male_profiles mp
left join (
  select
    target_id,
    sum(
      case rating
        when 'excellent'::public.vote_rating then 3
        when 'good'::public.vote_rating then 2
        when 'normal'::public.vote_rating then 1
        else 2
      end
    ) as score
  from public.votes
  group by target_id
) v on v.target_id = mp.id;

alter view public.male_ranking set (security_invoker = true);

