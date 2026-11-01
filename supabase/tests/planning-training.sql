-- Execute as postgres. Synthetic rows, temporary sessions and the temporary
-- access-toggle stay inside this transaction. No IDs, personal data or real
-- contents are returned; every change, including diary revisions, is rolled back.
begin;
do $test$
declare
 owner_uid uuid;other_uid uuid;
 owner_session uuid:=gen_random_uuid();other_session uuid:=gen_random_uuid();
 plan_id uuid:=gen_random_uuid();fixture_exercise_id uuid:=gen_random_uuid();
 fixture_day date;plan_revision bigint;diary_revision bigint;updated_stamp timestamptz;
 n bigint;
begin
 select user_id into strict owner_uid from public.ab_access where enabled and user_id=diary_user_id;
 select user_id into strict other_uid from public.ab_access where enabled and user_id<>diary_user_id and diary_user_id=owner_uid;
 if(select count(*)from public.ab_access where enabled)<>2 then raise exception 'Expected exactly two enabled diary accounts';end if;
 -- Choose an unused past exercise/day pair instead of overwriting or deleting
 -- any pre-existing entry. No existing entry is changed by this test.
 select d::date into strict fixture_day
 from generate_series(date '2000-01-01',date '2000-12-31',interval '1 day')d
 where not exists(select 1 from public.ab_exercise_logs e where e.user_id=owner_uid and e.exercise_id='tube-pallof' and e.recorded_on=d::date)
 order by d limit 1;
 insert into auth.sessions(id,user_id,created_at,updated_at,aal,not_after)values
  (owner_session,owner_uid,now(),now(),'aal1',now()+interval '10 minutes'),
  (other_session,other_uid,now(),now(),'aal1',now()+interval '10 minutes');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_uid,'role','authenticated','session_id',owner_session,'aal','aal1')::text,true);
 execute 'set local role authenticated';
 if public.ab_current_diary()is distinct from owner_uid then raise exception 'Owner diary membership failed';end if;
 select revision into strict diary_revision from public.ab_diary_state where user_id=owner_uid;

 -- The legitimate plan insert intentionally omits user_id: browser clients
 -- cannot supply even their own owner ID in this table's INSERT column grant.
 insert into public.ab_week_plan(id,planned_on,kind,slot,title,recipe_id,servings,ingredients)
 values(plan_id,fixture_day,'meal','lunch','Rollback-only meal plan',null,2,
  '[{"name":"Rollback-only ingredient","quantity":100,"unit":"g"}]'::jsonb);
 if not exists(select 1 from public.ab_week_plan where id=plan_id and user_id=owner_uid and revision=1 and servings=2)then raise exception 'Private plan insert/read/default assignment failed';end if;
 select revision,updated_at into strict plan_revision,updated_stamp from public.ab_week_plan where id=plan_id;
 if not exists(select 1 from public.ab_diary_state where user_id=owner_uid and revision>diary_revision and last_kind='planning' and last_saved_at is not null)then raise exception 'Plan did not update server diary save state';end if;

 -- A PATCH with the current per-row revision succeeds; a stale PATCH is a
 -- zero-row operation and must not silently change content or the revision.
 update public.ab_week_plan set done=true where id=plan_id and revision=plan_revision;
 get diagnostics n=row_count;
 if n<>1 or not exists(select 1 from public.ab_week_plan where id=plan_id and done and revision=plan_revision+1 and updated_at>=updated_stamp)then raise exception 'Current-revision plan PATCH failed';end if;
 update public.ab_week_plan set title='Stale overwrite must never apply' where id=plan_id and revision=plan_revision;
 get diagnostics n=row_count;
 if n<>0 or not exists(select 1 from public.ab_week_plan where id=plan_id and title='Rollback-only meal plan' and revision=plan_revision+1)then raise exception 'Stale plan PATCH changed data';end if;
 begin
  update public.ab_week_plan set revision=999 where id=plan_id;
  raise exception 'Client changed server plan revision';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.ab_week_plan(user_id,planned_on,kind,title)values(owner_uid,fixture_day,'weighin','Owner ID must not be accepted');
  raise exception 'Plan INSERT accepted client-supplied owner ID';
 exception when insufficient_privilege then null;end;
 begin
  update public.ab_week_plan set user_id=other_uid where id=plan_id;
  raise exception 'Plan ownership update was allowed';
 exception when insufficient_privilege then null;end;

 select revision into strict diary_revision from public.ab_diary_state where user_id=owner_uid;
 insert into public.ab_exercise_logs(id,recorded_on,exercise_id,band_level,band_label,sets,reps,effort,technique_ok,pain,completed,note)
 values(fixture_exercise_id,fixture_day,'tube-pallof','light','Rollback-only test band',2,8,6,true,false,true,'Synthetic test fixture');
 if not exists(select 1 from public.ab_exercise_logs where id=fixture_exercise_id and user_id=owner_uid and sets=2 and reps=8 and completed and technique_ok and not pain)then raise exception 'Private exercise insert/read/default assignment failed';end if;
 if not exists(select 1 from public.ab_diary_state where user_id=owner_uid and revision>diary_revision and last_kind='training' and last_saved_at is not null)then raise exception 'Exercise did not update server diary save state';end if;
 begin
  insert into public.ab_exercise_logs(recorded_on,exercise_id,band_level,sets,reps,effort)values(fixture_day,'tube-pallof','light',2,8,6);
  raise exception 'Duplicate exercise/day was accepted';
 exception when unique_violation then null;end;
 begin
  insert into public.ab_exercise_logs(user_id,recorded_on,exercise_id,band_level,sets,reps,effort)values(other_uid,fixture_day,'tube-row','light',2,8,6);
  raise exception 'Exercise INSERT to an unassigned diary was allowed';
 exception when insufficient_privilege then null;end;
 begin
  update public.ab_exercise_logs set user_id=other_uid where id=fixture_exercise_id;
  raise exception 'Exercise ownership update was allowed';
 exception when insufficient_privilege then null;end;
 begin
  update public.ab_exercise_logs set reps=9 where id=fixture_exercise_id;
  raise exception 'Immutable exercise summary update was allowed';
 exception when insufficient_privilege then null;end;

 -- Constraint failures happen in subtransactions; none of these attempted
 -- fixtures or their trigger effects can survive the expected exception.
 begin
  insert into public.ab_week_plan(planned_on,kind,slot,title,servings)values(fixture_day,'meal','lunch','Invalid servings',31);
  raise exception 'Plan servings over thirty were accepted';
 exception when check_violation then null;end;
 begin
  insert into public.ab_week_plan(planned_on,kind,title)values(date '2101-01-01','weighin','Invalid future range');
  raise exception 'Out-of-range plan date was accepted';
 exception when check_violation then null;end;
 begin
  insert into public.ab_week_plan(planned_on,kind,title)values('2026-02-30'::date,'weighin','Invalid calendar day');
  raise exception 'Impossible plan calendar date was accepted';
 exception when datetime_field_overflow or invalid_datetime_format then null;end;
 begin
  insert into public.ab_week_plan(planned_on,kind,slot,title,servings,ingredients)
  values(fixture_day,'meal','lunch','Invalid ingredient',2,'[{"name":"Missing quantity","unit":"g"}]'::jsonb);
  raise exception 'Incomplete ingredient structure was accepted';
 exception when check_violation then null;end;
 begin
  insert into public.ab_exercise_logs(recorded_on,exercise_id,band_level,sets,reps,effort)values(current_date+2,'tube-row','light',2,8,6);
  raise exception 'Future completed exercise was accepted';
 exception when check_violation then null;end;
 begin
  insert into public.ab_exercise_logs(recorded_on,exercise_id,band_level,sets,reps,effort)values(fixture_day,'unknown-exercise','light',2,8,6);
  raise exception 'Unknown exercise was accepted';
 exception when check_violation then null;end;
 execute 'reset role';

 -- The second explicitly allowlisted account shares these same private rows.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',other_uid,'role','authenticated','session_id',other_session,'aal','aal1')::text,true);
 execute 'set local role authenticated';
 if public.ab_current_diary()is distinct from owner_uid then raise exception 'Collaborator diary membership failed';end if;
 select(select count(*)from public.ab_week_plan where id=plan_id)+(select count(*)from public.ab_exercise_logs where id=fixture_exercise_id)into n;
 if n<>2 then raise exception 'Second allowed account cannot read the shared fixtures';end if;
 update public.ab_week_plan set done=false where id=plan_id and revision=plan_revision+1;
 get diagnostics n=row_count;
 if n<>1 then raise exception 'Second allowed account cannot edit shared plan';end if;
 execute 'reset role';

 -- Temporarily remove only the app-specific grant, retaining the same valid
 -- authentication/session. Access must stop immediately, before JWT refresh.
 update public.ab_access set enabled=false where user_id=other_uid;
 execute 'set local role authenticated';
 select(select count(*)from public.ab_week_plan)+(select count(*)from public.ab_exercise_logs)into n;
 if n<>0 then raise exception 'Disabled diary account can read planning or exercise rows';end if;
 begin
  insert into public.ab_week_plan(planned_on,kind,title)values(fixture_day,'weighin','Disabled-account plan');
  raise exception 'Disabled account can insert a plan';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.ab_exercise_logs(recorded_on,exercise_id,band_level,sets,reps,effort)values(fixture_day,'tube-row','light',2,8,6);
  raise exception 'Disabled account can insert an exercise';
 exception when insufficient_privilege then null;end;
 execute 'reset role';
 update public.ab_access set enabled=true where user_id=other_uid;

 -- An enabled account with a nonexistent session is still unauthorized.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_uid,'role','authenticated','session_id',gen_random_uuid(),'aal','aal1')::text,true);
 execute 'set local role authenticated';
 select(select count(*)from public.ab_week_plan)+(select count(*)from public.ab_exercise_logs)into n;
 if n<>0 or public.ab_current_diary()is not null then raise exception 'Nonexistent session can read planning or exercise rows';end if;
 execute 'reset role';
 -- Expiry of an existing session also takes effect without changing the JWT.
 update auth.sessions set not_after=now()-interval '1 minute' where id=owner_session;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_uid,'role','authenticated','session_id',owner_session,'aal','aal1')::text,true);
 execute 'set local role authenticated';
 select(select count(*)from public.ab_week_plan)+(select count(*)from public.ab_exercise_logs)into n;
 if n<>0 or public.ab_current_diary()is not null then raise exception 'Expired session can read planning or exercise rows';end if;
 execute 'reset role';

 perform set_config('request.jwt.claims','{"role":"anon"}',true);
 execute 'set local role anon';
 begin perform 1 from public.ab_week_plan;raise exception 'Anonymous plan SELECT was granted';exception when insufficient_privilege then null;end;
 begin perform 1 from public.ab_exercise_logs;raise exception 'Anonymous exercise SELECT was granted';exception when insufficient_privilege then null;end;
 begin
  insert into public.ab_week_plan(planned_on,kind,title)values(fixture_day,'weighin','Anonymous plan');
  raise exception 'Anonymous plan INSERT was granted';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.ab_exercise_logs(recorded_on,exercise_id,band_level,sets,reps,effort)values(fixture_day,'tube-row','light',2,8,6);
  raise exception 'Anonymous exercise INSERT was granted';
 exception when insufficient_privilege then null;end;
 execute 'reset role';
end $test$;
rollback;
select 'PASS: private planning/exercise insert and shared access; server revisions and stale PATCH rejection; diary save timestamps; owner-column protection; uniqueness and constraints; disabled grants, nonexistent/expired sessions and anonymous access blocked. All fixtures rolled back.'as verification;
