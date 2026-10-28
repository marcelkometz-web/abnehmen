-- Operation-aware Storage access. Only database metadata fixtures are used.
-- No real photo, signed URL, user password, API key or persistent session.
begin;
do $test$
declare diary uuid;other_uid uuid;sid uuid:=gen_random_uuid();other_sid uuid:=gen_random_uuid();
 photo uuid:=gen_random_uuid();operation text;n integer;external_id uuid:=gen_random_uuid();
begin
 select user_id into strict diary from public.ab_access where enabled and user_id=diary_user_id;
 select user_id into strict other_uid from public.ab_access where enabled and user_id<>diary_user_id and diary_user_id=diary;
 insert into auth.sessions(id,user_id,created_at,updated_at,aal,not_after)values
  (sid,diary,now(),now(),'aal1',now()+interval '10 minutes'),
  (other_sid,other_uid,now(),now(),'aal1',now()+interval '10 minutes');
 insert into storage.objects(bucket_id,name,owner_id)values
  ('ab-progress-photos',diary::text||'/'||photo::text||'.jpg',diary::text);
 -- A second bucket fixture proves that unrelated garden operations stay allowed.
 insert into storage.objects(id,bucket_id,name,owner_id)
 values(external_id,'rg-profile-photos',diary::text||'/'||gen_random_uuid()::text||'.jpg',diary::text);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',diary,'role','authenticated','session_id',sid,'aal','aal1')::text,true);
 execute 'set local role authenticated';
 foreach operation in array array[
  'object.get_authenticated','storage.object.get_authenticated',
  'object.get_authenticated_info','object.head_authenticated_info',
  'object.list','object.list_v2','object.upload','object.delete','object.delete_many',''
 ]loop
  perform set_config('storage.operation',operation,true);
  select count(*)into n from storage.objects where bucket_id='ab-progress-photos'and name=diary::text||'/'||photo::text||'.jpg';
  if n<>1 then raise exception 'Required operation blocked: %',operation;end if;
 end loop;
 foreach operation in array array[
  'object.sign','storage.object.sign','object.sign_many','object.sign_upload_url',
  'render.image_sign','object.copy','object.move','s3.object.copy','s3.upload.part_copy'
 ]loop
  perform set_config('storage.operation',operation,true);
  select count(*)into n from storage.objects where bucket_id='ab-progress-photos'and name=diary::text||'/'||photo::text||'.jpg';
  if n<>0 then raise exception 'Bearer/copy operation allowed: %',operation;end if;
  select count(*)into n from storage.objects where id=external_id;
  if n<>1 then raise exception 'Unrelated garden bucket restricted: %',operation;end if;
 end loop;
 perform set_config('storage.operation','object.sign_upload_url',true);
 begin
  insert into storage.objects(bucket_id,name,owner_id)values('ab-progress-photos',diary::text||'/'||gen_random_uuid()::text||'.jpg',diary::text);
  raise exception 'Signed upload insert allowed';
 exception when insufficient_privilege then null;end;
 execute 'reset role';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',other_uid,'role','authenticated','session_id',other_sid,'aal','aal1')::text,true);
 perform set_config('storage.operation','object.get_authenticated',true);
 execute 'set local role authenticated';
 if(select count(*)from storage.objects where bucket_id='ab-progress-photos'and name=diary::text||'/'||photo::text||'.jpg')<>1 then raise exception 'Second approved account blocked';end if;
 execute 'reset role';
 update public.ab_access set enabled=false where user_id=other_uid;
 execute 'set local role authenticated';
 if exists(select 1 from storage.objects where bucket_id='ab-progress-photos')then raise exception 'Unapproved account read photo metadata';end if;
 execute 'reset role';
 perform set_config('request.jwt.claims','{"role":"anon"}',true);
 execute 'set local role anon';
 if exists(select 1 from storage.objects where bucket_id='ab-progress-photos')then raise exception 'Anonymous photo read allowed';end if;
 execute 'reset role';
end $test$;
rollback;
select 'PASS: authenticated reads/uploads/deletion metadata remain available to both approved accounts; bearer links, signed uploads and copies blocked; other buckets unaffected. All fixtures rolled back.'as verification;
