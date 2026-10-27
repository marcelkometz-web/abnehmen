-- Execute in a transaction: no real entries or temporary sessions persist.
begin;
do $test$
declare owner_uid uuid;other_uid uuid;owner_session uuid:=gen_random_uuid();other_session uuid:=gen_random_uuid();operation uuid:=gen_random_uuid();r bigint;result jsonb;n integer;
begin
 select user_id into strict owner_uid from public.ab_access where enabled and user_id=diary_user_id;
 select user_id into strict other_uid from public.ab_access where enabled and user_id<>diary_user_id and diary_user_id=owner_uid;
 insert into auth.sessions(id,user_id,created_at,updated_at,aal,not_after)values(owner_session,owner_uid,now(),now(),'aal1',now()+interval '10 minutes'),(other_session,other_uid,now(),now(),'aal1',now()+interval '10 minutes');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_uid,'role','authenticated','session_id',owner_session,'aal','aal1')::text,true);
 execute 'set local role authenticated';
 select revision into r from public.ab_diary_state where user_id=owner_uid;
 result:=public.ab_save_checkin_checked('2024-02-29',r,83,null,'{"waist_cm":88}'::jsonb,'Preserve this note','[]'::jsonb);
 if (result->>'saved_at')is null then raise exception 'Missing server timestamp';end if;
 begin
  perform public.ab_save_checkin_checked('2024-02-29',r,1,null,'{}'::jsonb,'conflict','[]'::jsonb);raise exception 'Stale revision accepted';
 exception when serialization_failure then null;end;
 if not exists(select 1 from public.ab_weights where recorded_on='2024-02-29' and weight_kg=83)then raise exception 'Stale write changed values';end if;
 select revision into r from public.ab_diary_state where user_id=owner_uid;
 result:=public.ab_save_chat_measurements('2024-02-29',r,82,null,'{"hip_cm":100}'::jsonb);
 if not exists(select 1 from public.ab_weights where recorded_on='2024-02-29' and note='Preserve this note' and weight_kg=82)or not exists(select 1 from public.ab_measurements where recorded_on='2024-02-29' and note='Preserve this note' and waist_cm=88 and hip_cm=100)then raise exception 'Chat overwrite removed notes or missing values';end if;
 select revision into r from public.ab_diary_state where user_id=owner_uid;
 begin perform public.ab_save_chat_activity(gen_random_uuid(),null,r,'{"recorded_on":"2024-02-29"}'::jsonb);raise exception 'Null activity accepted';exception when invalid_parameter_value then null;end;
 result:=public.ab_save_chat_activity(operation,'training',r,'{"recorded_on":"2024-02-29","kind":"bands","minutes":30,"effort":5,"band_level":"light"}'::jsonb);
 result:=public.ab_save_chat_activity(operation,'training',r,'{"recorded_on":"2024-02-29","kind":"bands","minutes":30,"effort":5,"band_level":"light"}'::jsonb);
 if not(result->>'already_saved')::boolean then raise exception 'Training retry not idempotent';end if;
 begin
  perform public.ab_save_chat_activity(operation,'training',r,'{"recorded_on":"2024-02-29","kind":"bands","minutes":60,"effort":5,"band_level":"light"}'::jsonb);raise exception 'Changed duplicate operation accepted';
 exception when invalid_parameter_value then null;end;
 insert into public.ab_cycle_entries(recorded_on,end_on,note)values('2024-02-20','2024-02-24','Keep cycle note');
 select revision into r from public.ab_diary_state where user_id=owner_uid;
 perform public.ab_save_chat_activity(gen_random_uuid(),'cycle',r,'{"recorded_on":"2024-02-20"}'::jsonb);
 if not exists(select 1 from public.ab_cycle_entries where recorded_on='2024-02-20' and end_on='2024-02-24' and note='Keep cycle note')then raise exception 'Cycle repeat erased existing information';end if;
 begin update public.ab_diary_state set revision=0;raise exception 'Client changed server timestamp/revision';exception when insufficient_privilege then null;end;
 begin perform public.ab_ai_commit(owner_uid,owner_uid,gen_random_uuid(),'clear');raise exception 'Browser can forge server AI replies';exception when insufficient_privilege then null;end;
 execute 'reset role';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',other_uid,'role','authenticated','session_id',other_session,'aal','aal1')::text,true);
 execute 'set local role authenticated';
 if not exists(select 1 from public.ab_training_sessions where id=operation)or not exists(select 1 from public.ab_cycle_entries where recorded_on='2024-02-20')then raise exception 'Second allowed account cannot see shared entries';end if;
 begin update public.ab_training_sessions set user_id=other_uid where id=operation;raise exception 'Ownership changed';exception when insufficient_privilege then null;end;
 execute 'reset role';update public.ab_access set enabled=false where user_id=other_uid;
 execute 'set local role authenticated';
 select(select count(*)from public.ab_training_sessions)+(select count(*)from public.ab_cycle_entries)+(select count(*)from public.ab_preferences)+(select count(*)from public.ab_diary_state)into n;
 if n<>0 then raise exception 'Disabled account can read wellbeing';end if;
 begin perform public.ab_save_chat_activity(gen_random_uuid(),'training',0,'{"recorded_on":"2024-02-29","kind":"bands","minutes":30}'::jsonb);raise exception 'Disabled account can save';exception when insufficient_privilege then null;end;
 execute 'reset role';
 perform set_config('request.jwt.claims','{"role":"anon"}',true);execute 'set local role anon';
 begin perform public.ab_save_chat_measurements('2024-02-29',0,80);raise exception 'Anonymous chat save';exception when insufficient_privilege then null;end;
 execute 'reset role';
end $test$;
rollback;
select 'PASS: timestamps, stale-write rejection, note preservation, activity retries, cycle preservation, shared access and RLS. All fixtures rolled back.'as verification;
