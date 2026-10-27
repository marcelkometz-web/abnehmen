-- Password-only authorization and combined check-in regression tests.
-- All temporary sessions, database-only photo fixtures and entries roll back.
begin;
do $test$
declare owner_uid uuid;other_uid uuid;owner_session uuid:=gen_random_uuid();other_session uuid:=gen_random_uuid();photo uuid:=gen_random_uuid();n integer;
begin
 select user_id into strict owner_uid from public.ab_access where enabled and user_id=diary_user_id;
 select user_id into strict other_uid from public.ab_access where enabled and user_id<>diary_user_id and diary_user_id=owner_uid;
 if (select count(*) from public.ab_access where enabled)<>2 then raise exception 'Expected the two approved accounts';end if;
 insert into auth.sessions(id,user_id,created_at,updated_at,aal,not_after)values
  (owner_session,owner_uid,now(),now(),'aal1',now()+interval '10 minutes'),
  (other_session,other_uid,now(),now(),'aal1',now()+interval '10 minutes');
 insert into storage.objects(bucket_id,name,owner_id)values('ab-progress-photos',owner_uid::text||'/'||photo::text||'.jpg',owner_uid::text);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_uid,'role','authenticated','session_id',owner_session,'aal','aal1')::text,true);
 execute 'set local role authenticated';
 if public.ab_current_diary() is distinct from owner_uid then raise exception 'Approved password-only session is blocked';end if;
 perform public.ab_save_checkin('2099-12-28',83,170,'{"chest_cm":98,"waist_cm":88}'::jsonb,'Rollback test',jsonb_build_array(jsonb_build_object('id',photo,'view','front')));
 if not exists(select 1 from public.ab_weights where user_id=owner_uid and recorded_on='2099-12-28' and weight_kg=83)
 or not exists(select 1 from public.ab_measurements where user_id=owner_uid and recorded_on='2099-12-28' and waist_cm=88)
 or not exists(select 1 from public.ab_progress_photos where id=photo and recorded_on='2099-12-28') then raise exception 'Combined check-in was not saved';end if;
 begin
  perform public.ab_save_checkin('2099-12-28',72,null,'{"waist_cm":-1}'::jsonb,'invalid','[]'::jsonb);
  raise exception 'Invalid measurement accepted';
 exception when check_violation then null;end;
 if not exists(select 1 from public.ab_weights where user_id=owner_uid and recorded_on='2099-12-28' and weight_kg=83)then raise exception 'Atomic rollback failed';end if;
 begin
  perform public.ab_save_checkin('2099-12-28',71,null,'{}'::jsonb,'invalid',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'view','front')));
  raise exception 'Missing private photo object accepted';
 exception when insufficient_privilege then null;end;
 if not exists(select 1 from public.ab_weights where user_id=owner_uid and recorded_on='2099-12-28' and weight_kg=83)then raise exception 'Missing-photo rollback failed';end if;
 begin
  update public.ab_access set enabled=true;
  raise exception 'Client can approve users';
 exception when insufficient_privilege then null;end;
 execute 'reset role';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',other_uid,'role','authenticated','session_id',other_session,'aal','aal1')::text,true);
 execute 'set local role authenticated';
 perform public.ab_save_checkin('2099-12-28',82,null,'{"hip_cm":100}'::jsonb,'shared','[]'::jsonb);
 if not exists(select 1 from public.ab_measurements where user_id=owner_uid and recorded_on='2099-12-28' and waist_cm=88 and hip_cm=100)then raise exception 'Blank measurements were overwritten';end if;
 execute 'reset role';
 update public.ab_access set enabled=false where user_id=other_uid;
 execute 'set local role authenticated';
 select (select count(*) from public.ab_weights)+(select count(*) from public.ab_measurements)+(select count(*) from public.ab_progress_photos)+(select count(*) from storage.objects where bucket_id='ab-progress-photos') into n;
 if n<>0 then raise exception 'Unapproved account can read diary or photos';end if;
 begin
  perform public.ab_save_checkin('2099-12-28',70,null,'{}'::jsonb,'forbidden','[]'::jsonb);
  raise exception 'Unapproved account can save a check-in';
 exception when insufficient_privilege then null;end;
 execute 'reset role';
 update public.ab_access set enabled=true where user_id=other_uid;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_uid,'role','authenticated','session_id',gen_random_uuid(),'aal','aal1')::text,true);
 execute 'set local role authenticated';
 if public.ab_current_diary() is not null then raise exception 'Invalid session accepted';end if;
 execute 'reset role';
 perform set_config('request.jwt.claims','{"role":"anon"}',true);
 execute 'set local role anon';
 begin
  perform public.ab_save_checkin('2099-12-28',70,null,'{}'::jsonb,'forbidden','[]'::jsonb);
  raise exception 'Anonymous check-in accepted';
 exception when insufficient_privilege then null;end;
 select count(*) into n from storage.objects where bucket_id='ab-progress-photos';if n<>0 then raise exception 'Anonymous photo access';end if;
 execute 'reset role';
end $test$;
rollback;
select 'PASS: both approved password-only accounts can save a combined check-in; invalid fields roll back, blanks preserve values, unapproved/anonymous/revoked sessions remain blocked. Fixtures rolled back.' as verification;
