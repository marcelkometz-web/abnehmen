-- Apply after the shared-week-plan and training-exercise-progress migrations.
-- All writes run as the authenticated caller under existing session/diary RLS.
begin;

-- Goal baselines may be recreated only while inserting a missing preference row.
-- Existing baselines remain non-updatable by clients and this RPC never updates.
grant insert(goal_baseline_weight_kg,goal_baseline_recorded_on)
on public.ab_preferences to authenticated;

create or replace function public.ab_restore_backup(p_expected_revision bigint,p_data jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 diary uuid;item jsonb;kind text;n integer;total integer:=0;counts jsonb:='{}';
 photo_id uuid;photo_view text;actual bigint;row_count integer;array_count integer:=0;
begin
 diary:=public.ab_current_diary();
 if auth.uid() is null or diary is null then raise exception 'Current approved diary session required' using errcode='42501';end if;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>8388608 then raise exception 'Invalid backup payload' using errcode='22023';end if;
 if p_data->>'expectedActor' is distinct from auth.uid()::text or p_data->>'expectedDiary' is distinct from diary::text then raise exception 'Backup target account changed'using errcode='42501';end if;
 foreach kind in array array['weights','measurements','training','cycles','exerciseLogs','weekPlan','photos'] loop
  if jsonb_typeof(p_data->kind) is distinct from 'array' then raise exception 'Invalid backup collection' using errcode='22023';end if;
  n:=jsonb_array_length(p_data->kind);array_count:=array_count+n;
  if n>20000 or (kind='photos' and n>300) then raise exception 'Backup collection too large' using errcode='22023';end if;
 end loop;
 if array_count>20300 then raise exception 'Backup too large' using errcode='22023';end if;
 if coalesce(jsonb_typeof(p_data->'profile'),'null') not in('object','null') or coalesce(jsonb_typeof(p_data->'preferences'),'null') not in('object','null') then raise exception 'Invalid profile' using errcode='22023';end if;
 perform ab_private.lock_diary_revision(p_expected_revision);
 -- Profile first: following historical weights cannot replace a restored baseline.
 n:=0;
 if jsonb_typeof(p_data->'profile')='object' then
  insert into public.ab_profile(user_id,height_cm)values(diary,(p_data->'profile'->>'height_cm')::numeric)on conflict(user_id)do nothing;
  get diagnostics n=row_count;
 end if;
 counts:=counts||jsonb_build_object('profile',n);total:=total+n;n:=0;
 if jsonb_typeof(p_data->'preferences')='object' then
  item:=p_data->'preferences';
  insert into public.ab_preferences(user_id,birth_year,activity_level,reported_loss_kg,reported_loss_approx,remaining_goal_min,remaining_goal_max,cycle_length_days,motivation_enabled,instagram_url,tiktok_url,youtube_url,goal_baseline_weight_kg,goal_baseline_recorded_on)
  values(diary,(item->>'birth_year')::integer,item->>'activity_level',(item->>'reported_loss_kg')::numeric,coalesce((item->>'reported_loss_approx')::boolean,true),(item->>'remaining_goal_min')::numeric,(item->>'remaining_goal_max')::numeric,(item->>'cycle_length_days')::integer,coalesce((item->>'motivation_enabled')::boolean,true),item->>'instagram_url',item->>'tiktok_url',item->>'youtube_url',(item->>'goal_baseline_weight_kg')::numeric,(item->>'goal_baseline_recorded_on')::date)
  on conflict(user_id)do nothing;
  get diagnostics n=row_count;
 end if;
 counts:=counts||jsonb_build_object('preferences',n);total:=total+n;n:=0;
 for item in select value from jsonb_array_elements(p_data->'weights') loop
  insert into public.ab_weights(user_id,recorded_on,weight_kg,note)values(diary,(item->>'recorded_on')::date,(item->>'weight_kg')::numeric,coalesce(item->>'note',''))on conflict(user_id,recorded_on)do nothing;
  get diagnostics row_count=row_count;n:=n+row_count;
 end loop;
 counts:=counts||jsonb_build_object('weights',n);total:=total+n;n:=0;
 for item in select value from jsonb_array_elements(p_data->'measurements') loop
  insert into public.ab_measurements(user_id,recorded_on,chest_cm,waist_cm,hip_cm,upper_arm_cm,thigh_cm,note)values(diary,(item->>'recorded_on')::date,(item->>'chest_cm')::numeric,(item->>'waist_cm')::numeric,(item->>'hip_cm')::numeric,(item->>'upper_arm_cm')::numeric,(item->>'thigh_cm')::numeric,coalesce(item->>'note',''))on conflict(user_id,recorded_on)do nothing;
  get diagnostics row_count=row_count;n:=n+row_count;
 end loop;
 counts:=counts||jsonb_build_object('measurements',n);total:=total+n;n:=0;
 for item in select value from jsonb_array_elements(p_data->'cycles') loop
  insert into public.ab_cycle_entries(user_id,recorded_on,end_on,note)values(diary,(item->>'recorded_on')::date,(item->>'end_on')::date,coalesce(item->>'note',''))on conflict(user_id,recorded_on)do nothing;
  get diagnostics row_count=row_count;n:=n+row_count;
 end loop;
 counts:=counts||jsonb_build_object('cycles',n);total:=total+n;n:=0;
 for item in select value from jsonb_array_elements(p_data->'training') loop
  insert into public.ab_training_sessions(user_id,recorded_on,kind,minutes,effort,band_level,note)values(diary,(item->>'recorded_on')::date,item->>'kind',(item->>'minutes')::integer,(item->>'effort')::integer,item->>'band_level',coalesce(item->>'note',''));n:=n+1;
 end loop;
 counts:=counts||jsonb_build_object('training',n);total:=total+n;n:=0;
 for item in select value from jsonb_array_elements(p_data->'exerciseLogs') loop
  insert into public.ab_exercise_logs(user_id,recorded_on,exercise_id,band_level,band_label,sets,reps,effort,technique_ok,pain,completed,note)values(diary,(item->>'recorded_on')::date,item->>'exercise_id',item->>'band_level',coalesce(item->>'band_label',''),(item->>'sets')::integer,(item->>'reps')::integer,(item->>'effort')::integer,(item->>'technique_ok')::boolean,(item->>'pain')::boolean,(item->>'completed')::boolean,coalesce(item->>'note',''))on conflict(user_id,recorded_on,exercise_id)do nothing;
  get diagnostics row_count=row_count;n:=n+row_count;
 end loop;
 counts:=counts||jsonb_build_object('exerciseLogs',n);total:=total+n;n:=0;
 for item in select value from jsonb_array_elements(p_data->'weekPlan') loop
  insert into public.ab_week_plan(planned_on,kind,slot,title,recipe_id,servings,ingredients,minutes,done)values((item->>'planned_on')::date,item->>'kind',item->>'slot',item->>'title',item->>'recipe_id',(item->>'servings')::numeric,coalesce(item->'ingredients','[]'),(item->>'minutes')::integer,coalesce((item->>'done')::boolean,false));n:=n+1;
 end loop;
 counts:=counts||jsonb_build_object('weekPlan',n);total:=total+n;n:=0;
 for item in select value from jsonb_array_elements(p_data->'photos') loop
  photo_id:=(item->>'id')::uuid;photo_view:=item->>'view';
  if photo_id is null or photo_view not in('front','side','back','other') or not exists(select 1 from storage.objects where bucket_id='ab-progress-photos' and name=diary::text||'/'||photo_id::text||'.jpg') then raise exception 'Private photo upload missing'using errcode='42501';end if;
  insert into public.ab_progress_photos(id,user_id,recorded_on,view,note)values(photo_id,diary,(item->>'recorded_on')::date,photo_view,coalesce(item->>'note',''));n:=n+1;
 end loop;
 counts:=counts||jsonb_build_object('photos',n);total:=total+n;
 select revision into actual from public.ab_diary_state where user_id=diary;
 return jsonb_build_object('saved',true,'count',total,'counts',counts,'revision',actual);
end$$;
revoke all on function public.ab_restore_backup(bigint,jsonb)from public,anon,authenticated;
grant execute on function public.ab_restore_backup(bigint,jsonb)to authenticated;
comment on function public.ab_restore_backup(bigint,jsonb)is 'Additive personal backup restore. Explicit current session/diary membership, revision lock, existing RLS and column privileges apply; no overwrites/deletes, no imported account IDs.';
notify pgrst,'reload schema';
commit;
