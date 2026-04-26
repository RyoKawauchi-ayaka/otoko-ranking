-- Allow high-rated females to read objects in profile-private-photos (signed URLs)

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'female high-rated can read private photos'
  ) then
    execute $pol$
      create policy "female high-rated can read private photos"
      on storage.objects for select
      using (
        bucket_id = 'profile-private-photos'
        and exists (
          select 1
          from public.female_high_rated_males hr
          where hr.voter_id = auth.uid()
            and (storage.foldername(name))[1] = 'profiles'
            and (storage.foldername(name))[2] = hr.target_id::text
        )
      )
    $pol$;
  end if;
end
$$;
