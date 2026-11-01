-- No real file bytes are accessed. Metadata/session/profile fixtures roll back.
begin;
do $test$
declare diary uuid;other_uid uuid;sid uuid:=gen_random_uuid();other_sid uuid:=gen_random_uuid();
 photo uuid:=gen_random_uuid();r bigint;after_r bigint;result jsonb;payload jsonb;empty_payload jsonb;day date;bad_day date;
begin
 select user_id into strict diary from public.ab_access where enabled and user_id=diary_user_id;
 select user_id into strict other_uid from public.ab_access where enabled and user_id<>diary_user_id and diary_user_id=diary;
 select d::date into strict day from generate_series(date '2001-01-01',date '2001-12-20',interval '1 day')d where not exists(select 1 from public.ab_weights where user_id=diary and recorded_on=d::date)and not exists(select 1 from public.ab_measurements where user_id=diary and recorded_on=d::date)and not exists(select 1 from public.ab_cycle_entries where user_id=diary and recorded_on=d::date)and not exists(select 1 from public.ab_exercise_logs where user_id=diary and recorded_on=d::date) limit 1;
 select d::date into strict bad_day from generate_series(date '2002-01-01',date '2002-12-20',interval '1 day')d where not exists(select 1 from public.ab_weights where user_id=diary and recorded_on=d::date)limit 1;
 insert into auth.sessions(id,user_id,created_at,updated_at,aal,not_after)values(sid,diary,now(),now(),'aal1',now()+interval '10 minutes'),(other_sid,other_uid,now(),now(),'aal1',now()+interval '10 minutes');
 insert into storage.objects(bucket_id,name,owner_id)values('ab-progress-photos',diary::text||'/'||photo::text||'.jpg',diary::text);
 -- This forces the INSERT privileges for profile/baseline restoration to be tested.
 delete from public.ab_profile where user_id=diary;
 delete from public.ab_preferences where user_id=diary;
 empty_payload:='{"profile":null,"preferences":null,"weights":[],"measurements":[],"training":[],"cycles":[],"exerciseLogs":[],"weekPlan":[],"photos":[]}'::jsonb||jsonb_build_object('expectedActor',diary,'expectedDiary',diary);
 payload:=empty_payload||jsonb_build_object(
 'profile',jsonb_build_object('height_cm',160,'user_id',other_uid),
 'preferences',jsonb_build_object('birth_year',1986,'goal_baseline_weight_kg',100,'goal_baseline_recorded_on',day,'remaining_goal_min',20,'remaining_goal_max',25),
 'weights',jsonb_build_array(jsonb_build_object('recorded_on',day,'weight_kg',80,'note','backup-test','user_id',other_uid)),
 'measurements',jsonb_build_array(jsonb_build_object('recorded_on',day,'waist_cm',90,'note','backup-test')),
 'cycles',jsonb_build_array(jsonb_build_object('recorded_on',day,'end_on',day+4,'note','backup-test')),
 'training',jsonb_build_array(jsonb_build_object('recorded_on',day,'kind','bands','minutes',20,'effort',5,'band_level','light','note','backup-test'),jsonb_build_object('recorded_on',day,'kind','bands','minutes',20,'effort',5,'band_level','light','note','backup-test')),
 'exerciseLogs',jsonb_build_array(jsonb_build_object('recorded_on',day,'exercise_id','tube-squat','band_level','light','band_label','Testband','sets',2,'reps',12,'effort',5,'technique_ok',true,'pain',false,'completed',true,'note','backup-test')),
 'weekPlan',jsonb_build_array(jsonb_build_object('planned_on',day,'kind','meal','slot','lunch','title','backup-test','recipe_id','backup-test-recipe','servings',2,'ingredients',jsonb_build_array(jsonb_build_object('name','Gurke','quantity',1,'unit','Stück')),'done',false)),
 'photos',jsonb_build_array(jsonb_build_object('id',photo,'recorded_on',day,'view','front','note','backup-test')));
 perform set_config('request.jwt.claims',jsonb_build_object('sub',diary,'role','authenticated','session_id',sid,'aal','aal1')::text,true);
 perform set_config('storage.operation','object.get_authenticated',true);
 execute 'set local role authenticated';
 select revision into r from public.ab_diary_state where user_id=diary;
 begin perform public.ab_restore_backup(r,payload||jsonb_build_object('expectedActor',other_uid));raise exception 'Changed target account accepted';exception when insufficient_privilege then null;end;
 result:=public.ab_restore_backup(r,payload);
 if not(result->>'saved')::boolean or (result->>'count')::integer<>10 then raise exception 'Full backup restore count incorrect';end if;
 if not exists(select 1 from public.ab_profile where height_cm=160 and user_id=diary)or not exists(select 1 from public.ab_preferences where user_id=diary and goal_baseline_weight_kg=100)or not exists(select 1 from public.ab_week_plan where planned_on=day and title='backup-test' and user_id=diary)or not exists(select 1 from public.ab_exercise_logs where recorded_on=day and exercise_id='tube-squat' and completed)or not exists(select 1 from public.ab_progress_photos where id=photo and user_id=diary)then raise exception 'Missing restored collection or imported identity trusted';end if;
 if(select count(*)from public.ab_training_sessions where recorded_on=day and note='backup-test')<>2 then raise exception 'Identical legitimate training sessions collapsed';end if;
 begin perform public.ab_restore_backup(r,payload);raise exception 'Stale restore accepted';exception when serialization_failure then null;end;
 select revision into r from public.ab_diary_state where user_id=diary;
 result:=public.ab_restore_backup(r,empty_payload||jsonb_build_object('profile',jsonb_build_object('height_cm',161),'weights',jsonb_build_array(jsonb_build_object('recorded_on',day,'weight_kg',81))));
 if not exists(select 1 from public.ab_weights where recorded_on=day and weight_kg=80)or not exists(select 1 from public.ab_profile where height_cm=160)then raise exception 'Existing values overwritten';end if;
 select revision into r from public.ab_diary_state where user_id=diary;
 begin
  perform public.ab_restore_backup(r,empty_payload||jsonb_build_object('weights',jsonb_build_array(jsonb_build_object('recorded_on',bad_day,'weight_kg',79)),'weekPlan',jsonb_build_array(jsonb_build_object('planned_on',bad_day,'kind','meal','slot','lunch','title','invalid','servings',999,'ingredients','[]'::jsonb))));
  raise exception 'Invalid plan accepted';
 exception when check_violation then null;end;
 select revision into after_r from public.ab_diary_state where user_id=diary;
 if after_r<>r or exists(select 1 from public.ab_weights where recorded_on=bad_day)then raise exception 'Atomic restore rollback failed';end if;
 execute 'reset role';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',other_uid,'role','authenticated','session_id',other_sid,'aal','aal1')::text,true);execute 'set local role authenticated';
 if not exists(select 1 from public.ab_progress_photos where id=photo)or not exists(select 1 from public.ab_week_plan where planned_on=day and title='backup-test')then raise exception 'Second enabled diary member blocked';end if;
 execute 'reset role';update public.ab_access set enabled=false where user_id=other_uid;execute 'set local role authenticated';
 begin perform public.ab_restore_backup(r,empty_payload);raise exception 'Disabled user can restore';exception when insufficient_privilege then null;end;
 execute 'reset role';perform set_config('request.jwt.claims','{"role":"anon"}',true);execute 'set local role anon';
 begin perform public.ab_restore_backup(0,empty_payload);raise exception 'Anonymous user can restore';exception when insufficient_privilege then null;end;
 execute 'reset role';
end $test$;
rollback;
select 'PASS: all diary collections/profile/baseline/plan/private photo metadata restored; imported account IDs ignored; multiplicity retained; no overwrites; stale retry and invalid transaction rejected; both enabled members, disabled and anonymous access checked. All fixtures rolled back.'as verification;
