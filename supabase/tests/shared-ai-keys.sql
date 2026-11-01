-- No genuine key values are read or printed. Dummy credentials, preference
-- changes and synthetic sessions all remain inside a rolled-back transaction.
begin;
do $test$
declare owner_uid uuid;other_uid uuid;owner_session uuid:=gen_random_uuid();other_session uuid:=gen_random_uuid();result jsonb;provider text;
begin
 select m.user_id into strict owner_uid from public.rg_members m join public.rg_families f on f.id=m.family_id and f.owner_id=m.user_id join public.ab_access a on a.user_id=m.user_id and a.enabled where m.role='owner';
 select user_id into strict other_uid from public.ab_access where enabled and user_id<>owner_uid;
 insert into auth.sessions(id,user_id,created_at,updated_at,aal,not_after)values(owner_session,owner_uid,now(),now(),'aal1',now()+interval '10 minutes'),(other_session,other_uid,now(),now(),'aal1',now()+interval '10 minutes');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_uid,'role','authenticated','session_id',owner_session,'aal','aal1')::text,true);
 execute 'set local role authenticated';
 begin perform public.rg_hub_set_ai_key('openai','sk-dummy-rollback-only-123456789');raise exception 'Key update without recent password accepted';exception when insufficient_privilege then null;end;
 begin perform public.rg_hub_select_ai('openai');raise exception 'Selection without recent password accepted';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_uid,'role','authenticated','session_id',owner_session,'aal','aal1','amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now())::bigint)))::text,true);
 foreach provider in array array['openai','gemini']loop
  result:=public.rg_hub_set_ai_key(provider,case when provider='openai'then 'sk-dummy-rollback-only-123456789'else 'dummy-gemini-rollback-only-123456789'end);
  if result->>'provider'<>provider or result->>'configured'<>'true'then raise exception 'Configured status not confirmed';end if;
  result:=public.rg_hub_select_ai(provider);
  if result->>'provider'<>provider or result->>'shared'<>'true'or result->>'configured'<>'true'then raise exception 'Shared selection did not resolve';end if;
  begin perform public.rg_get_ai_provider_key(provider,(result->>'family_id')::uuid,owner_uid);raise exception 'Browser was able to read a credential';exception when insufficient_privilege then null;end;
 end loop;
 begin perform public.rg_hub_select_ai('untrusted');raise exception 'Unknown provider accepted';exception when invalid_parameter_value then null;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',other_uid,'role','authenticated','session_id',other_session,'aal','aal1','amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now())::bigint)))::text,true);
 begin perform public.rg_hub_set_ai_key('gemini','dummy-gemini-rollback-only-123456789');raise exception 'Non-owner was able to replace a credential';exception when insufficient_privilege then null;end;
 result:=public.rg_hub_select_ai('gemini');
 if result->>'provider'<>'gemini'or result->>'shared'<>'true'then raise exception 'Second approved user could not choose shared Gemini';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',other_uid,'role','authenticated','session_id',other_session,'aal','aal1','amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now()-interval '6 minutes')::bigint)))::text,true);
 begin perform public.rg_hub_select_ai('openai');raise exception 'Expired password confirmation accepted';exception when insufficient_privilege then null;end;
 execute 'set local role anon';
 begin perform public.ab_shared_ai_status();raise exception 'Anonymous status access accepted';exception when insufficient_privilege then null;end;
 begin perform public.rg_hub_set_ai_key('openai','sk-dummy-rollback-only-123456789');raise exception 'Anonymous key update accepted';exception when insufficient_privilege then null;end;
 execute 'reset role';
 raise notice 'PASS: recent-password gate, owner-only key changes, both shared providers, two-user selection, server-only reads, expiry and anonymous denial; all rolled back';
end$test$;
rollback;
