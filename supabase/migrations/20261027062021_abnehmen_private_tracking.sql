-- Additive setup in the existing garden project. No garden/recipe data is changed.
-- Membership is assigned separately by an administrator; never seed identities here.
begin;

create table public.ab_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.ab_access enable row level security;
revoke all on public.ab_access from public, anon, authenticated;
grant select on public.ab_access to authenticated;
create policy ab_access_own_read on public.ab_access for select to authenticated
  using (user_id = (select auth.uid()) and enabled and (select rg_private.rg_account_enabled()));

create table public.ab_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.ab_access(user_id) on delete cascade,
  recorded_on date not null check (recorded_on between date '2000-01-01' and date '2100-12-31'),
  weight_kg numeric(5,2) not null check (weight_kg between 1 and 700),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  unique (user_id, recorded_on)
);

create table public.ab_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.ab_access(user_id) on delete cascade,
  recorded_on date not null check (recorded_on between date '2000-01-01' and date '2100-12-31'),
  chest_cm numeric(5,1) check (chest_cm > 0 and chest_cm <= 500),
  waist_cm numeric(5,1) check (waist_cm > 0 and waist_cm <= 500),
  hip_cm numeric(5,1) check (hip_cm > 0 and hip_cm <= 500),
  upper_arm_cm numeric(5,1) check (upper_arm_cm > 0 and upper_arm_cm <= 500),
  thigh_cm numeric(5,1) check (thigh_cm > 0 and thigh_cm <= 500),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  check (num_nonnulls(chest_cm, waist_cm, hip_cm, upper_arm_cm, thigh_cm) > 0),
  unique (user_id, recorded_on)
);

create table public.ab_progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.ab_access(user_id) on delete cascade,
  recorded_on date not null check (recorded_on between date '2000-01-01' and date '2100-12-31'),
  view text not null default 'front' check (view in ('front', 'side', 'back', 'other')),
  note text not null default '' check (char_length(note) <= 1000),
  storage_path text generated always as (user_id::text || '/' || id::text || '.jpg') stored unique,
  created_at timestamptz not null default now()
);
create index ab_progress_photos_user_date_idx on public.ab_progress_photos(user_id, recorded_on desc);

-- RLS combines row ownership with the separately managed application allowlist.
-- The allowlist's own RLS checks garden approval and a current Auth session.
do $policies$
declare t text;
begin
  foreach t in array array['ab_weights','ab_measurements','ab_progress_photos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select, delete on public.%I to authenticated', t);
    execute format($p$create policy ab_owner_read on public.%I for select to authenticated
      using (user_id = (select auth.uid()) and exists (select 1 from public.ab_access a where a.user_id = (select auth.uid()) and a.enabled))$p$, t);
    execute format($p$create policy ab_owner_insert on public.%I for insert to authenticated
      with check (user_id = (select auth.uid()) and exists (select 1 from public.ab_access a where a.user_id = (select auth.uid()) and a.enabled))$p$, t);
    execute format($p$create policy ab_owner_update on public.%I for update to authenticated
      using (user_id = (select auth.uid()) and exists (select 1 from public.ab_access a where a.user_id = (select auth.uid()) and a.enabled))
      with check (user_id = (select auth.uid()) and exists (select 1 from public.ab_access a where a.user_id = (select auth.uid()) and a.enabled))$p$, t);
    execute format($p$create policy ab_owner_delete on public.%I for delete to authenticated
      using (user_id = (select auth.uid()) and exists (select 1 from public.ab_access a where a.user_id = (select auth.uid()) and a.enabled))$p$, t);
  end loop;
end
$policies$;

-- Identity, creation time, and photo paths cannot be rewritten by browser clients.
grant insert (id, user_id, recorded_on, weight_kg, note), update (recorded_on, weight_kg, note)
  on public.ab_weights to authenticated;
grant insert (id, user_id, recorded_on, chest_cm, waist_cm, hip_cm, upper_arm_cm, thigh_cm, note),
  update (recorded_on, chest_cm, waist_cm, hip_cm, upper_arm_cm, thigh_cm, note)
  on public.ab_measurements to authenticated;
grant insert (id, user_id, recorded_on, view, note), update (recorded_on, view, note)
  on public.ab_progress_photos to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ab-progress-photos', 'ab-progress-photos', false, 1048576, array['image/jpeg']);

-- Every object has a random name inside its owner's UUID folder.
-- Originals are converted to JPEG in the browser; replacement uses a new object.
create policy ab_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'ab-progress-photos'
    and (select auth.uid())::text = split_part(name, '/', 1)
    and exists (select 1 from public.ab_access a where a.user_id = (select auth.uid()) and a.enabled));
create policy ab_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'ab-progress-photos'
    and (select auth.uid())::text = split_part(name, '/', 1)
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.]jpg$'
    and exists (select 1 from public.ab_access a where a.user_id = (select auth.uid()) and a.enabled));
create policy ab_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'ab-progress-photos'
    and (select auth.uid())::text = split_part(name, '/', 1)
    and exists (select 1 from public.ab_access a where a.user_id = (select auth.uid()) and a.enabled));

-- These guards also protect the new bucket against future broad Storage policies.
-- Other buckets retain their existing rules. No Storage UPDATE policy is added.
create policy ab_photos_authenticated_guard on storage.objects as restrictive for all to authenticated
  using (bucket_id <> 'ab-progress-photos' or (
    (select auth.uid())::text = split_part(name, '/', 1)
    and exists (select 1 from public.ab_access a where a.user_id = (select auth.uid()) and a.enabled)))
  with check (bucket_id <> 'ab-progress-photos' or (
    (select auth.uid())::text = split_part(name, '/', 1)
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.]jpg$'
    and exists (select 1 from public.ab_access a where a.user_id = (select auth.uid()) and a.enabled)));
create policy ab_photos_anonymous_guard on storage.objects as restrictive for all to anon
  using (bucket_id <> 'ab-progress-photos') with check (bucket_id <> 'ab-progress-photos');

comment on table public.ab_access is 'Private Abnehmen application allowlist. Only an administrator may grant or revoke access.';
comment on table public.ab_weights is 'Personal body weight; never family-shared.';
comment on table public.ab_measurements is 'Personal body measurements; never family-shared.';
comment on table public.ab_progress_photos is 'Private photo metadata. Files live only in the private ab-progress-photos bucket.';

notify pgrst, 'reload schema';
commit;
