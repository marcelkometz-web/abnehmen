begin;
create function public.ab_save_chat_measurements(p_recorded_on date,p_expected_revision bigint,p_weight numeric default null,p_height numeric default null,p_body jsonb default '{}')returns jsonb language plpgsql security invoker set search_path='' as $$
declare diary uuid;state public.ab_diary_state;c numeric;w numeric;h numeric;a numeric;t numeric;
begin
 perform ab_private.lock_diary_revision(p_expected_revision);diary:=public.ab_current_diary();
 if p_recorded_on is null or p_recorded_on not between date '2000-01-01' and date '2100-12-31' or jsonb_typeof(p_body)is distinct from 'object' then raise exception 'Invalid entry'using errcode='22023';end if;
 c:=(p_body->>'chest_cm')::numeric;w:=(p_body->>'waist_cm')::numeric;h:=(p_body->>'hip_cm')::numeric;a:=(p_body->>'upper_arm_cm')::numeric;t:=(p_body->>'thigh_cm')::numeric;
 if p_weight is null and p_height is null and num_nonnulls(c,w,h,a,t)=0 then raise exception 'Empty entry'using errcode='22023';end if;
 if p_weight is not null then insert into public.ab_weights(user_id,recorded_on,weight_kg)values(diary,p_recorded_on,p_weight)on conflict(user_id,recorded_on)do update set weight_kg=excluded.weight_kg;end if;
 if p_height is not null then insert into public.ab_profile(user_id,height_cm)values(diary,p_height)on conflict(user_id)do update set height_cm=excluded.height_cm;end if;
 if num_nonnulls(c,w,h,a,t)>0 then
  insert into public.ab_measurements(user_id,recorded_on,chest_cm,waist_cm,hip_cm,upper_arm_cm,thigh_cm)values(diary,p_recorded_on,c,w,h,a,t)
  on conflict(user_id,recorded_on)do update set chest_cm=coalesce(excluded.chest_cm,ab_measurements.chest_cm),waist_cm=coalesce(excluded.waist_cm,ab_measurements.waist_cm),hip_cm=coalesce(excluded.hip_cm,ab_measurements.hip_cm),upper_arm_cm=coalesce(excluded.upper_arm_cm,ab_measurements.upper_arm_cm),thigh_cm=coalesce(excluded.thigh_cm,ab_measurements.thigh_cm);
 end if;
 perform ab_private.confirm_save(p_recorded_on);select * into state from public.ab_diary_state where user_id=diary;
 return jsonb_build_object('saved',true,'recorded_on',p_recorded_on,'saved_at',state.last_saved_at,'revision',state.revision);
end$$;
revoke all on function public.ab_save_chat_measurements(date,bigint,numeric,numeric,jsonb)from public,anon,authenticated;
grant execute on function public.ab_save_chat_measurements(date,bigint,numeric,numeric,jsonb)to authenticated;
notify pgrst,'reload schema';
commit;
