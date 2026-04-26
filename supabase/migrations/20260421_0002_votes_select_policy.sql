-- votes: 女性ユーザーが自分の投票履歴（重複防止/残数表示）を参照できるようにする

alter table public.votes enable row level security;

drop policy if exists "voter can read own votes" on public.votes;
create policy "voter can read own votes"
on public.votes for select
using (auth.uid() = voter_id);

