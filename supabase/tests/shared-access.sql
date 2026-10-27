-- Execute as postgres. Every test fixture and change is rolled back, including
-- temporary sessions and database-only Storage metadata. No real file is used.
begin;
do $test$
declare
  owner_uid uuid;
  collaborator_uid uuid;
  owner_session uuid := gen_random_uuid();
  collaborator_session uuid := gen_random_uuid();
  fixture_id uuid := gen_random_uuid();
  fixture_photo uuid := gen_random_uuid();
  fixture_upload uuid := gen_random_uuid();
  owner_factor uuid := gen_random_uuid();
  collaborator_factor uuid := gen_random_uuid();
  total integer;
begin
  select user_id into strict owner_uid from public.ab_access where user_id=diary_user_id and enabled;
  select user_id into strict collaborator_uid from public.ab_access where diary_user_id=owner_uid and user_id<>owner_uid and enabled;
  if (select count(*) from public.ab_access where enabled) <> 2 then raise exception 'Expected exactly two enabled accounts'; end if;
  insert into auth.sessions(id,user_id,created_at,updated_at,aal,not_after) values
    (owner_session,owner_uid,now(),now(),'aal2',now()+interval '10 minutes'),
    (collaborator_session,collaborator_uid,now(),now(),'aal2',now()+interval '10 minutes');
  -- Database-only factor fixtures, never real enrollment secrets.
  insert into auth.mfa_factors(id,user_id,friendly_name,factor_type,status,created_at,updated_at,secret) values
    (owner_factor,owner_uid,'Rollback-' || owner_factor::text,'totp','verified',now(),now(),'rollback-only'),
    (collaborator_factor,collaborator_uid,'Rollback-' || collaborator_factor::text,'totp','verified',now(),now(),'rollback-only');
  insert into storage.objects(bucket_id,name,owner_id) values
    ('ab-progress-photos',owner_uid::text || '/' || fixture_photo::text || '.jpg',owner_uid::text);
  insert into public.ab_profile(user_id,height_cm) values(owner_uid,170)
    on conflict(user_id) do update set height_cm=excluded.height_cm;
  insert into public.ab_ai_messages(user_id,role,content) values(owner_uid,'assistant','Rollback-only message');
  insert into public.ab_ai_tips(user_id,content,context_hash,memory) values(owner_uid,'Rollback-only tip','test','Rollback-only memory')
    on conflict(user_id) do update set content=excluded.content,context_hash=excluded.context_hash,memory=excluded.memory;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_uid,'role','authenticated','session_id',owner_session,'aal','aal2')::text,true);
  execute 'set local role authenticated';
  if public.ab_current_diary() is distinct from owner_uid then raise exception 'Owner diary assignment failed'; end if;
  insert into public.ab_weights(id,recorded_on,weight_kg,note) values (fixture_id,'2099-12-29',80.5,'Rollback test');
  update public.ab_weights set weight_kg=80.6 where id=fixture_id;
  select count(*) into total from public.ab_weights where id=fixture_id and weight_kg=80.6;
  if total <> 1 then raise exception 'Owner weight write/read failed'; end if;
  insert into public.ab_measurements(id,recorded_on,waist_cm) values (fixture_id,'2099-12-29',80);
  insert into public.ab_progress_photos(id,recorded_on,view) values (fixture_photo,'2099-12-29','front');
  update public.ab_profile set height_cm=171 where user_id=owner_uid;
  select count(*) into total from public.ab_profile where height_cm=171;
  if total <> 1 then raise exception 'Profile write/read failed'; end if;
  if (select count(*) from public.ab_ai_messages where content='Rollback-only message')<>1 then raise exception 'Authorized chat read failed'; end if;
  if not (public.ab_ai_config('set','sk-' || repeat('x',40))->>'configured')::boolean then raise exception 'Encrypted key write failed'; end if;
  begin
    perform public.ab_ai_server_key(owner_uid);
    raise exception 'Browser client can read the API key';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.ab_ai_messages(user_id,role,content) values(owner_uid,'assistant','Forged response');
    raise exception 'Browser client can forge AI responses';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.ab_access(user_id,diary_user_id) values(gen_random_uuid(),owner_uid);
    raise exception 'Client was able to grant access';
  exception when insufficient_privilege then null; end;
  begin
    update public.ab_weights set user_id=collaborator_uid where id=fixture_id;
    raise exception 'Client was able to transfer diary ownership';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.ab_weights(user_id,recorded_on,weight_kg) values(collaborator_uid,'2099-12-28',80);
    raise exception 'Client was able to write to an unassigned diary';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.ab_measurements(recorded_on,waist_cm) values('2099-12-28',-1);
    raise exception 'Negative measurement was accepted';
  exception when check_violation then null; end;
  begin
    insert into public.ab_measurements(recorded_on) values('2099-12-28');
    raise exception 'Empty measurements were accepted';
  exception when check_violation then null; end;
  execute 'reset role';

  perform set_config('request.jwt.claims',jsonb_build_object('sub',collaborator_uid,'role','authenticated','session_id',collaborator_session,'aal','aal2')::text,true);
  execute 'set local role authenticated';
  if public.ab_current_diary() is distinct from owner_uid then raise exception 'Collaborator diary assignment failed'; end if;
  select count(*) into total from public.ab_weights where id=fixture_id;
  if total <> 1 then raise exception 'Collaborator cannot read shared diary'; end if;
  update public.ab_weights set note='Edited by collaborator' where id=fixture_id;
  get diagnostics total=row_count;
  if total <> 1 then raise exception 'Collaborator cannot edit shared diary'; end if;
  select count(*) into total from storage.objects where bucket_id='ab-progress-photos' and name=owner_uid::text || '/' || fixture_photo::text || '.jpg';
  if total <> 1 then raise exception 'Collaborator cannot see the private photo fixture'; end if;
  insert into storage.objects(bucket_id,name,owner_id) values
    ('ab-progress-photos',owner_uid::text || '/' || fixture_upload::text || '.jpg',collaborator_uid::text);
  begin
    insert into storage.objects(bucket_id,name,owner_id) values
      ('ab-progress-photos',collaborator_uid::text || '/' || gen_random_uuid()::text || '.jpg',collaborator_uid::text);
    raise exception 'Upload to an unassigned folder was allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.ab_progress_photos(recorded_on,storage_path) values('2099-12-28','someone-else/photo.jpg');
    raise exception 'Client was able to override the generated photo path';
  exception when insufficient_privilege or generated_always then null; end;
  begin
    update public.ab_access set enabled=true;
    raise exception 'Client can change its own access grant';
  exception when insufficient_privilege then null; end;
  select count(*) into total from public.rg_members;
  if total < 1 then raise exception 'Existing garden access was affected'; end if;
  execute 'reset role';

  -- A valid, approved garden account without an enabled app grant must see nothing.
  update public.ab_access set enabled=false where user_id=collaborator_uid;
  execute 'set local role authenticated';
  select (select count(*) from public.ab_access)+(select count(*) from public.ab_weights)+
    (select count(*) from public.ab_measurements)+(select count(*) from public.ab_progress_photos)+
    (select count(*) from public.ab_profile)+(select count(*) from public.ab_ai_messages)+(select count(*) from public.ab_ai_tips)+
    (select count(*) from storage.objects where bucket_id='ab-progress-photos') into total;
  if total <> 0 then raise exception 'Garden account without app access can read diary data'; end if;
  begin
    perform public.ab_ai_config('status',null);
    raise exception 'Unapproved garden account can access AI key administration';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.ab_weights(recorded_on,weight_kg) values('2099-12-28',80);
    raise exception 'Garden account without app access can create diary data';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects(bucket_id,name) values('ab-progress-photos',owner_uid::text || '/' || gen_random_uuid()::text || '.jpg');
    raise exception 'Garden account without app access can upload diary photos';
  exception when insufficient_privilege then null; end;
  select count(*) into total from public.rg_members;
  if total < 1 then raise exception 'Removing app access affected garden access'; end if;
  execute 'reset role';
  update public.ab_access set enabled=true where user_id=collaborator_uid;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_uid,'role','authenticated','session_id',gen_random_uuid(),'aal','aal2')::text,true);
  execute 'set local role authenticated';
  select (select count(*) from public.ab_weights)+(select count(*) from public.ab_ai_messages)+(select count(*) from public.ab_ai_tips)+(select count(*) from storage.objects where bucket_id='ab-progress-photos') into total;
  if total <> 0 then raise exception 'Revoked/nonexistent session still has access'; end if;
  begin
    insert into public.ab_weights(recorded_on,weight_kg) values('2099-12-28',80);
    raise exception 'Revoked session can still create data';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
  update auth.sessions set not_after=now()-interval '1 minute' where id=owner_session;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_uid,'role','authenticated','session_id',owner_session,'aal','aal2')::text,true);
  execute 'set local role authenticated';
  if public.ab_current_diary() is not null then raise exception 'Expired session still has diary access'; end if;
  execute 'reset role';
  update auth.sessions set not_after=now()+interval '10 minutes' where id=owner_session;

  -- Password alone must never reveal diary data, even for an allowlisted user.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_uid,'role','authenticated','session_id',owner_session,'aal','aal1')::text,true);
  execute 'set local role authenticated';
  select (select count(*) from public.ab_weights)+(select count(*) from storage.objects where bucket_id='ab-progress-photos') into total;
  if total <> 0 then raise exception 'Password-only session can read private diary data'; end if;
  execute 'reset role';
  -- A stale aal2 JWT must not keep access when all verified TOTP factors vanish.
  update auth.mfa_factors set status='unverified' where user_id=owner_uid and factor_type='totp';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_uid,'role','authenticated','session_id',owner_session,'aal','aal2')::text,true);
  execute 'set local role authenticated';
  if public.ab_current_diary() is not null then raise exception 'Stale MFA assurance accepted without a verified factor'; end if;
  execute 'reset role';
  update auth.mfa_factors set status='verified' where id=owner_factor;

  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  execute 'set local role anon';
  select count(*) into total from storage.objects where bucket_id='ab-progress-photos';
  if total <> 0 then raise exception 'Anonymous photo read was allowed'; end if;
  begin
    perform 1 from public.ab_weights;
    raise exception 'Anonymous table access was granted';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_uid,'role','authenticated','session_id',owner_session,'aal','aal2')::text,true);
  execute 'set local role authenticated';
  delete from public.ab_weights where id=fixture_id;
  get diagnostics total=row_count;
  if total <> 1 then raise exception 'Weight deletion failed'; end if;
  delete from public.ab_measurements where id=fixture_id;
  delete from public.ab_progress_photos where id=fixture_photo;
  -- Storage explicitly reserves deletion for its API. Rollback removes these
  -- database-only fixtures; the client removal sequence is tested separately.
  select count(*) into total from storage.objects where bucket_id='ab-progress-photos' and name in
    (owner_uid::text || '/' || fixture_photo::text || '.jpg',owner_uid::text || '/' || fixture_upload::text || '.jpg');
  if total <> 2 then raise exception 'Private photo write/read checks failed'; end if;
  execute 'reset role';
end
$test$;
rollback;
select 'PASS: two-account shared diary CRUD; unauthorized garden/anonymous access, missing MFA, stale MFA, invalid/expired sessions, wrong folders and self-enrollment blocked. All fixtures rolled back.' as verification;
