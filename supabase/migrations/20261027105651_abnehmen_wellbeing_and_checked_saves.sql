begin;
create table public.ab_diary_state(
 user_id uuid primary key references public.ab_access(user_id) on delete cascade,
 revision bigint not null default 0 check(revision>=0),last_saved_at timestamptz,
 last_recorded_on date,last_kind text
);
create table public.ab_preferences(
 user_id uuid primary key default public.ab_current_diary() references public.ab_access(user_id) on delete cascade,
 birth_year integer check(birth_year between 1900 and 2100),activity_level text check(activity_level in('gentle','active')),
 reported_loss_kg numeric(5,1) check(reported_loss_kg>0 and reported_loss_kg<=500),reported_loss_approx boolean not null default true,
 remaining_goal_min numeric(5,1) check(remaining_goal_min>0 and remaining_goal_min<=200),remaining_goal_max numeric(5,1) check(remaining_goal_max>0 and remaining_goal_max<=200),
 cycle_length_days integer check(cycle_length_days between 18 and 45),motivation_enabled boolean not null default true,
 instagram_url text check(instagram_url is null or (char_length(instagram_url)<=300 and instagram_url ~ '^https://(www\.)?instagram\.com/[A-Za-z0-9_.]+/?$')),
 tiktok_url text check(tiktok_url is null or(char_length(tiktok_url)<=300 and tiktok_url ~ '^https://(www\.)?tiktok\.com/@[A-Za-z0-9_.]+/?$')),
 youtube_url text check(youtube_url is null or(char_length(youtube_url)<=300 and youtube_url ~ '^https://(www\.)?youtube\.com/(@[A-Za-z0-9_.-]+|channel/[A-Za-z0-9_-]+)/?$')),
 created_at timestamptz not null default now(),
 check(remaining_goal_min is null or remaining_goal_max is null or remaining_goal_min<=remaining_goal_max)
);
create table public.ab_training_sessions(
 id uuid primary key default gen_random_uuid(),user_id uuid not null default public.ab_current_diary() references public.ab_access(user_id) on delete cascade,
 recorded_on date not null check(recorded_on between date '2000-01-01' and date '2100-12-31'),
 kind text not null check(kind in('treadmill','bodyweight','bands','strength-a','strength-b','mobility')),
 minutes integer not null check(minutes between 1 and 300),effort integer check(effort between 1 and 10),band_level text check(band_level in('none','light','medium','firm')),
 note text not null default '' check(char_length(note)<=1000),created_at timestamptz not null default now()
);
create index ab_training_diary_date on public.ab_training_sessions(user_id,recorded_on desc);
create table public.ab_cycle_entries(
 id uuid primary key default gen_random_uuid(),user_id uuid not null default public.ab_current_diary() references public.ab_access(user_id) on delete cascade,
 recorded_on date not null check(recorded_on between date '2000-01-01' and date '2100-12-31'),
 end_on date check(end_on is null or(end_on>=recorded_on and end_on<=recorded_on+20)),
 note text not null default '' check(char_length(note)<=1000),created_at timestamptz not null default now(),unique(user_id,recorded_on)
);
create index ab_cycle_diary_date on public.ab_cycle_entries(user_id,recorded_on desc);
alter table public.ab_diary_state enable row level security;
alter table public.ab_preferences enable row level security;
alter table public.ab_training_sessions enable row level security;
alter table public.ab_cycle_entries enable row level security;
revoke all on public.ab_diary_state,public.ab_preferences,public.ab_training_sessions,public.ab_cycle_entries from anon,authenticated;
grant select on public.ab_diary_state to authenticated;
create policy ab_state_read on public.ab_diary_state for select to authenticated using(user_id=(select public.ab_current_diary()));
grant select,delete on public.ab_preferences,public.ab_training_sessions,public.ab_cycle_entries to authenticated;
grant insert(user_id,birth_year,activity_level,reported_loss_kg,reported_loss_approx,remaining_goal_min,remaining_goal_max,cycle_length_days,motivation_enabled,instagram_url,tiktok_url,youtube_url),
 update(birth_year,activity_level,reported_loss_kg,reported_loss_approx,remaining_goal_min,remaining_goal_max,cycle_length_days,motivation_enabled,instagram_url,tiktok_url,youtube_url) on public.ab_preferences to authenticated;
grant insert(id,user_id,recorded_on,kind,minutes,effort,band_level,note),update(recorded_on,kind,minutes,effort,band_level,note) on public.ab_training_sessions to authenticated;
grant insert(id,user_id,recorded_on,end_on,note),update(recorded_on,end_on,note) on public.ab_cycle_entries to authenticated;
do $$declare t text;begin foreach t in array array['ab_preferences','ab_training_sessions','ab_cycle_entries']loop
 execute format('create policy ab_wellbeing_read on public.%I for select to authenticated using(user_id=(select public.ab_current_diary()))',t);
 execute format('create policy ab_wellbeing_insert on public.%I for insert to authenticated with check(user_id=(select public.ab_current_diary()))',t);
 execute format('create policy ab_wellbeing_update on public.%I for update to authenticated using(user_id=(select public.ab_current_diary())) with check(user_id=(select public.ab_current_diary()))',t);
 execute format('create policy ab_wellbeing_delete on public.%I for delete to authenticated using(user_id=(select public.ab_current_diary()))',t);
end loop;end$$;
insert into public.ab_diary_state(user_id)select distinct diary_user_id from public.ab_access where enabled on conflict do nothing;
create function ab_private.touch_diary()returns trigger language plpgsql security definer set search_path='' as $$
declare diary uuid;day date;kind text;
begin
 if tg_op='UPDATE' and to_jsonb(new)=to_jsonb(old) then return new;end if;
 if tg_op='DELETE' then diary:=old.user_id;else diary:=new.user_id;end if;
 if tg_table_name='ab_profile' or tg_table_name='ab_preferences' then kind:='profile';day:=null;
 else kind:=case tg_table_name when 'ab_weights' then 'weight' when 'ab_measurements' then 'measurements' when 'ab_progress_photos' then 'photo' when 'ab_cycle_entries' then 'cycle' else 'training' end;
 if tg_op='DELETE' then day:=old.recorded_on;else day:=new.recorded_on;end if;end if;
 insert into public.ab_diary_state(user_id,revision,last_saved_at,last_recorded_on,last_kind)values(diary,1,clock_timestamp(),day,kind)
 on conflict(user_id)do update set revision=ab_diary_state.revision+1,last_saved_at=excluded.last_saved_at,last_recorded_on=excluded.last_recorded_on,last_kind=excluded.last_kind;
 if tg_op='DELETE' then return old;else return new;end if;
end$$;
revoke all on function ab_private.touch_diary()from public,anon,authenticated;
do $$declare t text;begin foreach t in array array['ab_profile','ab_weights','ab_measurements','ab_progress_photos','ab_preferences','ab_training_sessions','ab_cycle_entries']loop
 execute format('create trigger ab_touch_diary after insert or update or delete on public.%I for each row execute function ab_private.touch_diary()',t);
end loop;end$$;
create function ab_private.lock_diary_revision(expected bigint)returns void language plpgsql security definer set search_path='' as $$
declare diary uuid;actual bigint;
begin
 diary:=public.ab_current_diary();if diary is null then raise exception 'Application membership required'using errcode='42501';end if;
 insert into public.ab_diary_state(user_id)values(diary)on conflict do nothing;
 select revision into actual from public.ab_diary_state where user_id=diary for update;
 if expected is null or expected<>actual then raise exception 'DATA_CHANGED'using errcode='40001';end if;
end$$;
revoke all on function ab_private.lock_diary_revision(bigint)from public,anon,authenticated;
grant execute on function ab_private.lock_diary_revision(bigint)to authenticated;
create function ab_private.confirm_save(day date)returns void language plpgsql security definer set search_path='' as $$
declare diary uuid;begin diary:=public.ab_current_diary();if diary is null then raise exception 'Application membership required'using errcode='42501';end if;
 update public.ab_diary_state set last_saved_at=clock_timestamp(),last_recorded_on=day,last_kind='checkin' where user_id=diary;
end$$;
revoke all on function ab_private.confirm_save(date)from public,anon,authenticated;
grant execute on function ab_private.confirm_save(date)to authenticated;
create function public.ab_save_checkin_checked(p_recorded_on date,p_expected_revision bigint,p_weight numeric default null,p_height numeric default null,p_body jsonb default '{}',p_note text default '',p_photos jsonb default '[]')returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;state public.ab_diary_state;
begin
 perform ab_private.lock_diary_revision(p_expected_revision);
 result:=public.ab_save_checkin(p_recorded_on,p_weight,p_height,p_body,p_note,p_photos);
 perform ab_private.confirm_save(p_recorded_on);
 select * into state from public.ab_diary_state where user_id=public.ab_current_diary();
 return result||jsonb_build_object('saved_at',state.last_saved_at,'revision',state.revision);
end$$;
revoke all on function public.ab_save_checkin_checked(date,bigint,numeric,numeric,jsonb,text,jsonb)from public,anon,authenticated;
grant execute on function public.ab_save_checkin_checked(date,bigint,numeric,numeric,jsonb,text,jsonb)to authenticated;
notify pgrst,'reload schema';
commit;
