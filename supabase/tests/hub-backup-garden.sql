-- Synthetic metadata only. No real images are downloaded; everything rolls back.
begin;
do $test$
declare uid uuid;fid uuid;sid uuid:=gen_random_uuid();source_plant uuid:=gen_random_uuid();source_bed uuid:=gen_random_uuid();source_topic uuid:=gen_random_uuid();source_task uuid:=gen_random_uuid();closed_topic uuid;closed_version integer;closed_modified timestamptz;
 photo uuid:=gen_random_uuid();profile_photo uuid:=gen_random_uuid();snapshot text;result jsonb;payload jsonb;new_topic uuid;n integer;original_settings_version integer;name text:='hub-backup-test-'||gen_random_uuid()::text;
begin
 select a.user_id,m.family_id into strict uid,fid from public.ab_access a join public.rg_members m on m.user_id=a.user_id where a.enabled and m.role='owner'limit 1;
 insert into auth.sessions(id,user_id,created_at,updated_at,aal,not_after)values(sid,uid,now(),now(),'aal1',now()+interval'10 minutes');
 insert into storage.objects(bucket_id,name,owner_id)values('rg-garden-photos',fid::text||'/'||photo::text||'.jpg',uid::text),('rg-profile-photos',uid::text||'/'||profile_photo::text||'.jpg',uid::text);
 delete from public.rg_profiles where user_id=uid;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',sid,'aal','aal1')::text,true);
 perform set_config('storage.operation','object.get_authenticated',true);execute'set local role authenticated';
 insert into public.rg_forum_topics(family_id,title,category,content)values(fid,name||'-closed','Allgemein','Synthetic closed fixture')returning id into closed_topic;
 update public.rg_forum_topics set locked=true where id=closed_topic;
 select version,updated_at into closed_version,closed_modified from public.rg_forum_topics where id=closed_topic;
 select f.settings_version into original_settings_version from public.rg_families f where id=fid;
 payload:=jsonb_build_object(
 'core',jsonb_build_object('format','ramonas-garten','version',2,
  'plants',jsonb_build_array(jsonb_build_object('id',source_plant,'name',name,'variety','','category','Gemüse','months',jsonb_build_array(3),'photo_path',fid::text||'/'||photo::text||'.jpg')),
  'beds',jsonb_build_array(jsonb_build_object('id',source_bed,'name',name,'description','Synthetic','width_cm',100,'length_cm',200,'layout_x_cm',null,'layout_y_cm',null,'rotation_deg',0,'layout_source','unset','photo_path',fid::text||'/'||photo::text||'.jpg')),
  'plantings',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'plant_id',source_plant,'bed_id',source_bed,'status','geplant','season_year',2026,'quantity',2,'position','links')),
  'notes',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'plant_id',source_plant,'title',name,'content','Synthetic note')),
  'events',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'plant_id',source_plant,'bed_id',source_bed,'title',name,'event_date','2026-10-30','event_time',null,'duration',30,'reminder','day','description','','notes','','task','Pflege'))),
 'personalLife',jsonb_build_object('tasks',jsonb_build_array(jsonb_build_object('id',source_task,'origin_id',source_task,'title',name,'notes','','due_date','2026-10-30','status','offen','plant_id',source_plant,'bed_id',source_bed))),
 'familyLife',jsonb_build_object(
  'harvests',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'title',name,'harvested_on','2026-10-30','quantity',1,'unit','kg','rating',4,'taste','','notes','','plant_id',source_plant,'bed_id',source_bed,'photo_path',fid::text||'/'||photo::text||'.jpg')),
  'forum_topics',jsonb_build_array(jsonb_build_object('id',closed_topic,'title','Do not overwrite','category','Allgemein','content','Do not overwrite','locked',false),jsonb_build_object('id',source_topic,'title',name,'category','Fragen','content','Synthetic topic','locked',true)),
  'forum_replies',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'topic_id',closed_topic,'content','Must skip closed existing topic'),jsonb_build_object('id',gen_random_uuid(),'topic_id',source_topic,'content','Synthetic restored reply'))),
 'profile',jsonb_build_object('display_name','Backup fixture','city','','photo_path',uid::text||'/'||profile_photo::text||'.jpg'));
 snapshot:=public.rg_hub_backup_snapshot();
 begin perform public.rg_restore_hub_backup(gen_random_uuid(),fid,snapshot,payload);raise exception'Wrong actor accepted';exception when insufficient_privilege then null;end;
 begin perform public.rg_restore_hub_backup(uid,gen_random_uuid(),snapshot,payload);raise exception'Wrong family accepted';exception when insufficient_privilege then null;end;
 result:=public.rg_restore_hub_backup(uid,fid,snapshot,payload);
 if(result->'counts'->>'plants')::integer<>1 or(result->'counts'->>'beds')::integer<>1 or(result->'counts'->>'plantings')::integer<>1 or(result->'counts'->>'notes')::integer<>1 or(result->'counts'->>'events')::integer<>1 or(result->'counts'->>'tasks')::integer<>1 or(result->'counts'->>'harvests')::integer<>1 or(result->'counts'->>'forum_topics')::integer<>1 or(result->'counts'->>'forum_replies')::integer<>1 or(result->'counts'->>'profile')::integer<>1 then raise exception'Incomplete garden backup restore';end if;
 if(result->>'closedRepliesSkipped')::integer<>1 then raise exception'Closed existing topic not reported';end if;
 if not exists(select 1 from public.rg_forum_topics where id=closed_topic and locked and version=closed_version and updated_at=closed_modified)then raise exception'Existing closed topic was modified';end if;
 select id into strict new_topic from public.rg_forum_topics where origin_id=source_topic and family_id=fid;
 if not exists(select 1 from public.rg_forum_topics where id=new_topic and locked)or not exists(select 1 from public.rg_forum_replies where topic_id=new_topic and content='Synthetic restored reply')then raise exception'New closed topic/reply sequence failed';end if;
 if not exists(select 1 from public.rg_profiles where user_id=uid and visibility='private'and public_city=false and public_photo_path is null)then raise exception'Profile became public';end if;
 if not exists(select 1 from public.rg_families f where id=fid and f.settings_version=original_settings_version)then raise exception'Family settings were changed';end if;
 begin perform public.rg_restore_hub_backup(uid,fid,snapshot,payload);raise exception'Stale snapshot accepted';exception when serialization_failure then null;end;
 snapshot:=public.rg_hub_backup_snapshot();result:=public.rg_restore_hub_backup(uid,fid,snapshot,payload);
 for n in select(value::text)::integer from jsonb_each(result->'counts')loop if n<>0 then raise exception'Duplicate import inserted data';end if;end loop;
 execute'reset role';update public.ab_access set enabled=false where user_id=uid;execute'set local role authenticated';
 begin perform public.rg_hub_backup_snapshot();raise exception'Disabled private diary account can export';exception when insufficient_privilege then null;end;
 begin perform public.rg_restore_hub_backup(uid,fid,snapshot,payload);raise exception'Disabled account can restore';exception when insufficient_privilege then null;end;
 execute'reset role';perform set_config('request.jwt.claims','{"role":"anon"}',true);execute'set local role anon';
 begin perform public.rg_hub_backup_snapshot();raise exception'Anonymous export';exception when insufficient_privilege then null;end;
 begin perform public.rg_restore_hub_backup(uid,fid,snapshot,payload);raise exception'Anonymous restore';exception when insufficient_privilege then null;end;
 execute'reset role';
end $test$;
rollback;
select'PASS: additive garden core/life/private photos/profile metadata, ID remapping, closed-topic preservation, new closed threads with replies, repeat import, stale snapshot, account/family binding and disabled/anonymous access; all fixtures rolled back.'as verification;
