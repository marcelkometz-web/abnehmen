-- Additive three-app hub backup support; no existing application rights change.
begin;
create or replace function ab_private.lock_backup_family(fid uuid)returns void
language plpgsql security definer set search_path='' as $$
begin
 if public.ab_current_diary()is null or not exists(select 1 from public.rg_members where user_id=auth.uid() and family_id=fid and role='owner')then raise exception 'Current approved owner required'using errcode='42501';end if;
 perform 1 from public.rg_families where id=fid for update;
end$$;
revoke all on function ab_private.lock_backup_family(uuid)from public,anon,authenticated;
grant execute on function ab_private.lock_backup_family(uuid)to authenticated;
create or replace function public.rg_hub_backup_snapshot()returns text
language plpgsql volatile security invoker set search_path='' as $$
declare fid uuid;uid uuid:=auth.uid();result jsonb;
begin
 if uid is null or public.ab_current_diary()is null then raise exception 'Approved diary account required'using errcode='42501';end if;
 select family_id into fid from public.rg_members where user_id=uid;
 if fid is null then raise exception 'Family membership required'using errcode='42501';end if;
 result:=jsonb_build_object(
  'plants',(select coalesce(jsonb_agg(jsonb_build_array(id,version)order by id),'[]')from public.rg_plants where family_id=fid or is_catalog),
  'beds',(select coalesce(jsonb_agg(jsonb_build_array(id,version)order by id),'[]')from public.rg_beds where family_id=fid),
  'plantings',(select coalesce(jsonb_agg(jsonb_build_array(id,version)order by id),'[]')from public.rg_plantings where family_id=fid),
  'notes',(select coalesce(jsonb_agg(jsonb_build_array(id,version)order by id),'[]')from public.rg_notes where family_id=fid),
  'events',(select coalesce(jsonb_agg(jsonb_build_array(id,version)order by id),'[]')from public.rg_events where family_id=fid),
  'tasks',(select coalesce(jsonb_agg(jsonb_build_array(id,version)order by id),'[]')from public.rg_tasks where family_id=fid),
  'harvests',(select coalesce(jsonb_agg(jsonb_build_array(id,version)order by id),'[]')from public.rg_harvests where family_id=fid),
  'topics',(select coalesce(jsonb_agg(jsonb_build_array(id,version)order by id),'[]')from public.rg_forum_topics where family_id=fid),
  'replies',(select coalesce(jsonb_agg(jsonb_build_array(id,version)order by id),'[]')from public.rg_forum_replies where family_id=fid),
  'profile',(select version from public.rg_profiles where user_id=uid),
  'settings',(select settings_version from public.rg_families where id=fid));
 return md5(result::text);
end$$;
revoke all on function public.rg_hub_backup_snapshot()from public,anon,authenticated;
grant execute on function public.rg_hub_backup_snapshot()to authenticated;

create or replace function public.rg_restore_hub_backup(p_expected_actor uuid,p_expected_family uuid,p_expected_snapshot text,p_data jsonb)returns jsonb
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid();fid uuid;row jsonb;ref jsonb;part text;core jsonb;origin uuid;existing uuid;topic uuid;pid uuid;bid uuid;photo text;new_topics jsonb:='{}';topic_map jsonb:='{}';locks uuid[]:='{}';counts jsonb;tasks integer:=0;harvests integer:=0;topics integer:=0;replies integer:=0;closed_skipped integer:=0;profile_count integer:=0;
begin
 if uid is null or uid is distinct from p_expected_actor or public.ab_current_diary()is null then raise exception 'Approved current backup account required'using errcode='42501';end if;
 select family_id into fid from public.rg_members where user_id=uid and role='owner';
 if fid is null or fid is distinct from p_expected_family then raise exception 'Current family owner required'using errcode='42501';end if;
 if jsonb_typeof(p_data)is distinct from'object'or octet_length(p_data::text)>20000000 then raise exception 'Invalid garden backup'using errcode='22023';end if;
 core:=p_data->'core';
 if jsonb_typeof(core)is distinct from'object'or jsonb_typeof(p_data->'personalLife')is distinct from'object'or jsonb_typeof(p_data->'familyLife')is distinct from'object'then raise exception 'Incomplete garden backup'using errcode='22023';end if;
 foreach part in array array['tasks','harvests','forum_topics','forum_replies']loop
  if part='tasks'then ref:=p_data->'personalLife'->part;else ref:=p_data->'familyLife'->part;end if;
  if jsonb_typeof(ref)is distinct from'array'or jsonb_array_length(ref)>9999 then raise exception 'Invalid garden life data'using errcode='22023';end if;
 end loop;
 perform ab_private.lock_backup_family(fid);
 -- Ordinary app writes must finish before the snapshot is compared. Holding
 -- these locks through the additive import prevents a stale concurrent insert
 -- or edit from slipping between the preview check and the restore transaction.
 -- Authenticated already has DELETE on these RLS-protected tables; no new
 -- mutation privileges are granted for this lock.
 lock table public.rg_plants,public.rg_beds,public.rg_plantings,public.rg_notes,public.rg_events,public.rg_tasks,public.rg_harvests,public.rg_forum_topics,public.rg_forum_replies,public.rg_profiles in share row exclusive mode;
 if p_expected_snapshot is null or p_expected_snapshot is distinct from public.rg_hub_backup_snapshot()then raise exception 'DATA_CHANGED'using errcode='40001';end if;
 foreach part in array array['plants','beds']loop
  for row in select value from jsonb_array_elements(core->part)loop
   photo:=row->>'photo_path';if photo is not null and not exists(select 1 from storage.objects where bucket_id='rg-garden-photos'and name=photo and split_part(name,'/',1)=fid::text)then raise exception 'Private garden photo missing'using errcode='42501';end if;
  end loop;
 end loop;
 counts:=public.rg_import_garden(core);
 foreach part in array array['tasks','harvests']loop
  if part='tasks'then ref:=p_data->'personalLife'->part;else ref:=p_data->'familyLife'->part;end if;
  for row in select value from jsonb_array_elements(ref)loop
   origin:=coalesce((row->>'origin_id')::uuid,(row->>'id')::uuid);if origin is null then raise exception 'Missing origin'using errcode='22023';end if;
   if part='tasks'then
    if exists(select 1 from public.rg_tasks where family_id=fid and created_by=uid and(id=(row->>'id')::uuid or origin_id=origin))then continue;end if;
   elsif exists(select 1 from public.rg_harvests where family_id=fid and(id=(row->>'id')::uuid or origin_id=origin))then continue;end if;
   pid:=null;bid:=null;
   select p.id into pid from jsonb_array_elements(core->'plants')r join public.rg_plants p on p.family_id=fid and lower(trim(p.name))=lower(trim(r->>'name'))and lower(trim(p.variety))=lower(trim(coalesce(r->>'variety','')))and p.category=r->>'category'where r->>'id'=row->>'plant_id'order by p.id limit 1;
   select b.id into bid from jsonb_array_elements(core->'beds')r join public.rg_beds b on b.family_id=fid and lower(trim(b.name))=lower(trim(r->>'name'))where r->>'id'=row->>'bed_id'order by b.id limit 1;
   if row->>'plant_id'is not null and pid is null or row->>'bed_id'is not null and bid is null then raise exception 'Missing garden reference'using errcode='22023';end if;
   if part='tasks'then
    insert into public.rg_tasks(family_id,origin_id,title,notes,due_date,status,plant_id,bed_id,suggestion_key)values(fid,origin,row->>'title',coalesce(row->>'notes',''),(row->>'due_date')::date,row->>'status',pid,bid,row->>'suggestion_key')on conflict do nothing;
    if found then tasks:=tasks+1;end if;
   else
    photo:=row->>'photo_path';if photo is not null and not exists(select 1 from storage.objects where bucket_id='rg-garden-photos'and name=photo and split_part(name,'/',1)=fid::text)then raise exception 'Private garden photo missing'using errcode='42501';end if;
    insert into public.rg_harvests(family_id,origin_id,title,harvested_on,quantity,unit,rating,taste,notes,plant_id,bed_id,photo_path)values(fid,origin,row->>'title',(row->>'harvested_on')::date,(row->>'quantity')::numeric,row->>'unit',(row->>'rating')::smallint,coalesce(row->>'taste',''),coalesce(row->>'notes',''),pid,bid,photo)on conflict do nothing;
    if found then harvests:=harvests+1;end if;
   end if;
  end loop;
 end loop;
 for row in select value from jsonb_array_elements(p_data->'familyLife'->'forum_topics')loop
  origin:=coalesce((row->>'origin_id')::uuid,(row->>'id')::uuid);topic:=null;
  if origin is null then raise exception 'Missing topic origin'using errcode='22023';end if;
  select id into topic from public.rg_forum_topics where family_id=fid and(id=(row->>'id')::uuid or origin_id=origin)order by id limit 1;
  if topic is null then
   insert into public.rg_forum_topics(family_id,origin_id,title,category,content)values(fid,origin,row->>'title',row->>'category',row->>'content')returning id into topic;topics:=topics+1;new_topics:=new_topics||jsonb_build_object(topic::text,true);
   if coalesce((row->>'locked')::boolean,false)then locks:=array_append(locks,topic);end if;
  end if;
  topic_map:=topic_map||jsonb_build_object(row->>'id',topic);
 end loop;
 for row in select value from jsonb_array_elements(p_data->'familyLife'->'forum_replies')loop
  origin:=coalesce((row->>'origin_id')::uuid,(row->>'id')::uuid);if origin is null then raise exception 'Missing reply origin'using errcode='22023';end if;
  if exists(select 1 from public.rg_forum_replies where family_id=fid and(id=(row->>'id')::uuid or origin_id=origin))then continue;end if;
  topic:=(topic_map->>(row->>'topic_id'))::uuid;if topic is null then raise exception 'Missing topic'using errcode='22023';end if;
  if not(new_topics?topic::text)and exists(select 1 from public.rg_forum_topics where id=topic and locked)then closed_skipped:=closed_skipped+1;continue;end if;
  insert into public.rg_forum_replies(family_id,origin_id,topic_id,content)values(fid,origin,topic,row->>'content')on conflict do nothing;if found then replies:=replies+1;end if;
 end loop;
 -- Only topics created by this transaction acquire their archived closed state.
 update public.rg_forum_topics set locked=true where family_id=fid and id=any(locks);
 if jsonb_typeof(p_data->'profile')='object'and not exists(select 1 from public.rg_profiles where user_id=uid)then
  row:=p_data->'profile';photo:=row->>'photo_path';if photo is not null and not exists(select 1 from storage.objects where bucket_id='rg-profile-photos'and name=photo and split_part(name,'/',1)=uid::text)then raise exception 'Private profile photo missing'using errcode='42501';end if;
  insert into public.rg_profiles(user_id,display_name,city,photo_path,visibility,public_city)values(uid,coalesce(row->>'display_name',''),coalesce(row->>'city',''),photo,'private',false);profile_count:=1;
 end if;
 return jsonb_build_object('ok',true,'counts',counts||jsonb_build_object('tasks',tasks,'harvests',harvests,'forum_topics',topics,'forum_replies',replies,'profile',profile_count),'closedRepliesSkipped',closed_skipped,'snapshot',public.rg_hub_backup_snapshot());
end$$;
revoke all on function public.rg_restore_hub_backup(uuid,uuid,text,jsonb)from public,anon,authenticated;
grant execute on function public.rg_restore_hub_backup(uuid,uuid,text,jsonb)to authenticated;
notify pgrst,'reload schema';
commit;
