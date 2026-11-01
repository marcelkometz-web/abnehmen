-- Draft for reviewed deployment. Generated migration filename is intentionally
-- left to the Supabase CLI: that binary was unavailable in this workspace.
-- No existing rows, allowlists, sessions or photo policies are modified.
begin;
create table public.ab_exercise_logs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default public.ab_current_diary() references public.ab_access(user_id) on delete cascade,
 recorded_on date not null check(recorded_on between date '2000-01-01' and current_date+1),
 exercise_id text not null check(exercise_id in(
  'chair-squat','wall-pushup','glute-bridge','bird-dog','band-row','band-sidewalk','band-curl','band-bridge','band-abduction',
  'tube-squat','tube-hinge','tube-row','tube-chest-press','tube-curl','tube-lateral-raise','tube-triceps','tube-pallof','tube-kickback','tube-abduction')),
 band_level text not null check(band_level in('none','light','medium','firm')),
 band_label text not null default '' check(char_length(band_label)<=80),
 sets integer not null check(sets between 1 and 6),
 reps integer not null check(reps between 1 and 30),
 effort integer not null check(effort between 1 and 10),
 technique_ok boolean not null default false,
 pain boolean not null default false,
 completed boolean not null default false,
 note text not null default '' check(char_length(note)<=1000),
 created_at timestamptz not null default now(),
 unique(user_id,recorded_on,exercise_id)
);
-- Leading diary column supports private RLS reads and date-ordered history.
create index ab_exercise_logs_diary_date on public.ab_exercise_logs(user_id,recorded_on desc,id);
alter table public.ab_exercise_logs enable row level security;
revoke all on public.ab_exercise_logs from public,anon,authenticated;
grant select,delete on public.ab_exercise_logs to authenticated;
grant insert(id,user_id,recorded_on,exercise_id,band_level,band_label,sets,reps,effort,technique_ok,pain,completed,note)
 on public.ab_exercise_logs to authenticated;
create policy ab_exercise_logs_read on public.ab_exercise_logs for select to authenticated
 using(user_id=(select public.ab_current_diary()));
create policy ab_exercise_logs_insert on public.ab_exercise_logs for insert to authenticated
 with check(user_id=(select public.ab_current_diary()));
create policy ab_exercise_logs_delete on public.ab_exercise_logs for delete to authenticated
 using(user_id=(select public.ab_current_diary()));
-- Immutable daily summaries avoid silently overwriting the other diary user's
-- work. A deliberate delete/re-enter remains possible for either diary member.
create trigger ab_touch_diary after insert or delete on public.ab_exercise_logs
 for each row execute function ab_private.touch_diary();
comment on table public.ab_exercise_logs is 'Private shared-diary strength exercise day summaries. Self-reported technique/effort; not an automatic medical or movement assessment.';
notify pgrst,'reload schema';
commit;
