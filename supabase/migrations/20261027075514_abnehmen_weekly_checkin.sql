-- One transactional check-in, preserving blank measurement fields.
-- Runs with the caller's privileges and all existing diary/session/Storage RLS.
begin;
create function public.ab_save_checkin(
 p_recorded_on date,p_weight numeric default null,p_height numeric default null,
 p_body jsonb default '{}'::jsonb,p_note text default '',p_photos jsonb default '[]'::jsonb
) returns jsonb language plpgsql security invoker set search_path=''
as $$
declare diary uuid;item jsonb;photo_id uuid;photo_view text;
 c numeric;w numeric;h numeric;a numeric;t numeric;
begin
 diary:=public.ab_current_diary();
 if diary is null then raise exception 'Current session and application membership required' using errcode='42501';end if;
 if p_recorded_on is null or p_recorded_on not between date '2000-01-01' and date '2100-12-31'
 or p_note is null or char_length(p_note)>1000
 or jsonb_typeof(p_body) is distinct from 'object' or jsonb_typeof(p_photos) is distinct from 'array'
 or jsonb_array_length(p_photos)>3 then raise exception 'Invalid check-in' using errcode='22023';end if;
 c:=(p_body->>'chest_cm')::numeric;w:=(p_body->>'waist_cm')::numeric;h:=(p_body->>'hip_cm')::numeric;
 a:=(p_body->>'upper_arm_cm')::numeric;t:=(p_body->>'thigh_cm')::numeric;
 if p_weight is null and p_height is null and num_nonnulls(c,w,h,a,t)=0 and jsonb_array_length(p_photos)=0 then
  raise exception 'Empty check-in' using errcode='22023';end if;
 if p_weight is not null then
  insert into public.ab_weights(user_id,recorded_on,weight_kg,note) values(diary,p_recorded_on,p_weight,p_note)
  on conflict(user_id,recorded_on) do update set weight_kg=excluded.weight_kg,note=excluded.note;
 end if;
 if p_height is not null then
  insert into public.ab_profile(user_id,height_cm) values(diary,p_height)
  on conflict(user_id) do update set height_cm=excluded.height_cm;
 end if;
 if num_nonnulls(c,w,h,a,t)>0 then
  insert into public.ab_measurements(user_id,recorded_on,chest_cm,waist_cm,hip_cm,upper_arm_cm,thigh_cm,note)
  values(diary,p_recorded_on,c,w,h,a,t,p_note)
  on conflict(user_id,recorded_on) do update set
   chest_cm=coalesce(excluded.chest_cm,ab_measurements.chest_cm),
   waist_cm=coalesce(excluded.waist_cm,ab_measurements.waist_cm),
   hip_cm=coalesce(excluded.hip_cm,ab_measurements.hip_cm),
   upper_arm_cm=coalesce(excluded.upper_arm_cm,ab_measurements.upper_arm_cm),
   thigh_cm=coalesce(excluded.thigh_cm,ab_measurements.thigh_cm),note=excluded.note;
 end if;
 for item in select value from jsonb_array_elements(p_photos) loop
  photo_id:=(item->>'id')::uuid;photo_view:=item->>'view';
  if photo_id is null or photo_view not in ('front','side','back') then raise exception 'Invalid photo' using errcode='22023';end if;
  if not exists(select 1 from storage.objects where bucket_id='ab-progress-photos' and name=diary::text || '/' || photo_id::text || '.jpg') then
    raise exception 'Private photo upload missing' using errcode='42501';end if;
  insert into public.ab_progress_photos(id,user_id,recorded_on,view,note) values(photo_id,diary,p_recorded_on,photo_view,p_note);
 end loop;
 return jsonb_build_object('saved',true,'photo_count',jsonb_array_length(p_photos));
end$$;
revoke all on function public.ab_save_checkin(date,numeric,numeric,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function public.ab_save_checkin(date,numeric,numeric,jsonb,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
