begin;
alter table public.ab_ai_messages add column operation_id uuid;
create unique index ab_ai_message_operation on public.ab_ai_messages(user_id,operation_id,role)where operation_id is not null;
create function ab_private.commit_ai(p_diary uuid,p_actor uuid,p_operation uuid,p_action text,p_message text,p_reply text,p_tip text,p_memory text,p_context_hash text,p_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare tip_saved boolean:=false;current_revision bigint;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Server role required'using errcode='42501';end if;
 if not exists(select 1 from public.ab_access where user_id=p_actor and enabled and diary_user_id=p_diary) then raise exception 'Application membership required'using errcode='42501';end if;
 if p_action='clear' then
  delete from public.ab_ai_messages where user_id=p_diary;
  delete from public.ab_ai_tips where user_id=p_diary;
  return jsonb_build_object('cleared',true);
 end if;
 if p_action not in('chat','tips')or p_operation is null or char_length(coalesce(p_reply,''))>8000 or char_length(coalesce(p_tip,''))>1500 or char_length(coalesce(p_memory,''))>4000 then raise exception 'Invalid assistant response'using errcode='22023';end if;
 select revision into current_revision from public.ab_diary_state where user_id=p_diary for update;
 if p_action='chat' then
  if nullif(btrim(p_message),'')is null or char_length(p_message)>4000 or nullif(btrim(p_reply),'')is null then raise exception 'Invalid chat message'using errcode='22023';end if;
  insert into public.ab_ai_messages(user_id,author_id,role,content,operation_id)values
   (p_diary,p_actor,'user',p_message,p_operation),(p_diary,null,'assistant',p_reply,p_operation)
  on conflict(user_id,operation_id,role)where operation_id is not null do nothing;
 end if;
 if current_revision=p_revision and nullif(btrim(p_tip),'')is not null then
  insert into public.ab_ai_tips(user_id,content,memory,context_hash,created_at)values(p_diary,p_tip,coalesce(p_memory,''),p_context_hash,now())
  on conflict(user_id)do update set content=excluded.content,memory=excluded.memory,context_hash=excluded.context_hash,created_at=excluded.created_at;
  tip_saved:=true;
 end if;
 return jsonb_build_object('committed',true,'tip_saved',tip_saved);
end$$;
create function public.ab_ai_commit(p_diary uuid,p_actor uuid,p_operation uuid,p_action text,p_message text default '',p_reply text default '',p_tip text default '',p_memory text default '',p_context_hash text default '',p_revision bigint default null)
returns jsonb language sql security invoker set search_path='' as $$select ab_private.commit_ai(p_diary,p_actor,p_operation,p_action,p_message,p_reply,p_tip,p_memory,p_context_hash,p_revision)$$;
revoke all on function ab_private.commit_ai(uuid,uuid,uuid,text,text,text,text,text,text,bigint),public.ab_ai_commit(uuid,uuid,uuid,text,text,text,text,text,text,bigint)from public,anon,authenticated,service_role;
grant execute on function ab_private.commit_ai(uuid,uuid,uuid,text,text,text,text,text,text,bigint),public.ab_ai_commit(uuid,uuid,uuid,text,text,text,text,text,text,bigint)to service_role;
notify pgrst,'reload schema';
commit;
