-- Share one diary between explicitly assigned accounts, with no self-enrollment.
begin;
alter table public.ab_access add column diary_user_id uuid references auth.users(id) on delete cascade;
update public.ab_access set diary_user_id=user_id;
alter table public.ab_access alter column diary_user_id set not null;
create index ab_access_diary_user_idx on public.ab_access(diary_user_id);

-- SECURITY INVOKER: the caller can only read its own enabled membership, and
-- membership RLS also validates the current garden account and Auth session.
create function public.ab_current_diary() returns uuid
language sql stable security invoker set search_path=''
as $$select diary_user_id from public.ab_access where user_id=(select auth.uid()) and enabled$$;
revoke all on function public.ab_current_diary() from public, anon, authenticated;
grant execute on function public.ab_current_diary() to authenticated;

do $policies$
declare t text;
begin
  foreach t in array array['ab_weights','ab_measurements','ab_progress_photos'] loop
    execute format('alter table public.%I alter column user_id set default public.ab_current_diary()', t);
    execute format('alter policy ab_owner_read on public.%I using (user_id = (select public.ab_current_diary()))', t);
    execute format('alter policy ab_owner_insert on public.%I with check (user_id = (select public.ab_current_diary()))', t);
    execute format('alter policy ab_owner_update on public.%I using (user_id = (select public.ab_current_diary())) with check (user_id = (select public.ab_current_diary()))', t);
    execute format('alter policy ab_owner_delete on public.%I using (user_id = (select public.ab_current_diary()))', t);
  end loop;
end
$policies$;

create table public.ab_profile (
  user_id uuid primary key default public.ab_current_diary() references public.ab_access(user_id) on delete cascade,
  height_cm numeric(4,1) not null check (height_cm between 50 and 260),
  created_at timestamptz not null default now()
);
alter table public.ab_profile enable row level security;
revoke all on public.ab_profile from public, anon, authenticated;
grant select, delete on public.ab_profile to authenticated;
grant insert(user_id,height_cm), update(height_cm) on public.ab_profile to authenticated;
create policy ab_profile_read on public.ab_profile for select to authenticated
  using (user_id=(select public.ab_current_diary()));
create policy ab_profile_insert on public.ab_profile for insert to authenticated
  with check (user_id=(select public.ab_current_diary()));
create policy ab_profile_update on public.ab_profile for update to authenticated
  using (user_id=(select public.ab_current_diary())) with check (user_id=(select public.ab_current_diary()));
create policy ab_profile_delete on public.ab_profile for delete to authenticated
  using (user_id=(select public.ab_current_diary()));

alter policy ab_photos_read on storage.objects using
  (bucket_id='ab-progress-photos' and (select public.ab_current_diary())::text=split_part(name,'/',1));
alter policy ab_photos_insert on storage.objects with check
  (bucket_id='ab-progress-photos' and (select public.ab_current_diary())::text=split_part(name,'/',1)
   and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.]jpg$');
alter policy ab_photos_delete on storage.objects using
  (bucket_id='ab-progress-photos' and (select public.ab_current_diary())::text=split_part(name,'/',1));
alter policy ab_photos_authenticated_guard on storage.objects
  using (bucket_id<>'ab-progress-photos' or (select public.ab_current_diary())::text=split_part(name,'/',1))
  with check (bucket_id<>'ab-progress-photos' or
    ((select public.ab_current_diary())::text=split_part(name,'/',1)
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.]jpg$'));

comment on column public.ab_access.diary_user_id is 'Explicitly assigned diary; clients cannot change their membership or diary assignment.';
comment on table public.ab_profile is 'Height of the diary subject, used for the BMI calculation. No medical classification.';
comment on table public.ab_weights is 'Personal diary weights, shared only with accounts explicitly assigned to that diary.';
comment on table public.ab_measurements is 'Personal diary measurements, shared only with explicitly assigned accounts.';
comment on table public.ab_progress_photos is 'Private diary photo metadata. Only explicitly assigned accounts may read the private photo bucket.';
notify pgrst,'reload schema';
commit;
