begin;
create or replace function public.ab_save_chat_activity(p_operation uuid,p_kind text,p_expected_revision bigint,p_values jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare diary uuid;state public.ab_diary_state;day date;existing public.ab_training_sessions;
begin
 diary:=public.ab_current_diary();
 if diary is null then raise exception 'Access denied' using errcode='42501';end if;
 if p_operation is null or p_kind not in('training','cycle') or jsonb_typeof(p_values)is distinct from 'object' then raise exception 'Invalid activity'using errcode='22023';end if;
 day:=(p_values->>'recorded_on')::date;
 if day is null or day not between date '2000-01-01' and current_date+1 then raise exception 'Invalid day'using errcode='22023';end if;
 perform 1 from public.ab_diary_state where user_id=diary for update;
 if p_kind='training' then
  select * into existing from public.ab_training_sessions where id=p_operation and user_id=diary;
  if found then
   if existing.recorded_on<>day or existing.kind is distinct from(p_values->>'kind')or existing.minutes is distinct from(p_values->>'minutes')::integer or existing.effort is distinct from(p_values->>'effort')::integer or existing.band_level is distinct from(p_values->>'band_level')then raise exception 'Operation conflict'using errcode='22023';end if;
   select * into state from public.ab_diary_state where user_id=diary;
   return jsonb_build_object('saved',true,'already_saved',true,'revision',state.revision,'saved_at',state.last_saved_at);
  end if;
 end if;
 perform ab_private.lock_diary_revision(p_expected_revision);
 if p_kind='training' then
  insert into public.ab_training_sessions(id,user_id,recorded_on,kind,minutes,effort,band_level)values(p_operation,diary,day,p_values->>'kind',(p_values->>'minutes')::integer,(p_values->>'effort')::integer,p_values->>'band_level');
 else
  -- A repeated period start never clears an existing end date or personal note.
  insert into public.ab_cycle_entries(id,user_id,recorded_on)values(p_operation,diary,day)on conflict(user_id,recorded_on)do nothing;
 end if;
 perform ab_private.confirm_save(day);select * into state from public.ab_diary_state where user_id=diary;
 return jsonb_build_object('saved',true,'revision',state.revision,'saved_at',state.last_saved_at);
end$$;
revoke all on function public.ab_save_chat_activity(uuid,text,bigint,jsonb)from public,anon,authenticated;
grant execute on function public.ab_save_chat_activity(uuid,text,bigint,jsonb)to authenticated;
notify pgrst,'reload schema';
commit;
