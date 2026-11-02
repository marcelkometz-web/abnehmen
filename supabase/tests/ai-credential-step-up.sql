-- Production-safe rollback assertions: no keys, users, sessions or memberships are changed.
-- Uses existing live sessions internally and only invalid candidate keys.
begin;
do $audit$
declare
 owner_uid uuid; owner_session uuid; other_uid uuid; other_session uuid;
 methods jsonb; candidate jsonb; result jsonb;
begin
 select m.user_id,s.id into owner_uid,owner_session
 from public.rg_members m
 join public.rg_families f on f.id=m.family_id and f.owner_id=m.user_id
 join public.ab_access a on a.user_id=m.user_id and a.enabled
 join auth.sessions s on s.user_id=m.user_id and (s.not_after is null or s.not_after>now())
 where m.role='owner' order by s.created_at desc limit 1;
 if owner_uid is null then raise exception 'No existing approved owner session: tests cannot run'; end if;
 select a.user_id,s.id into other_uid,other_session from public.ab_access a
 join auth.sessions s on s.user_id=a.user_id and (s.not_after is null or s.not_after>now())
 where a.enabled and a.user_id<>owner_uid order by s.created_at desc limit 1;

 -- Missing, expired, future, malformed and non-password AMR all fail closed.
 for candidate in select value from jsonb_array_elements(jsonb_build_array(
   'null'::jsonb, '{}'::jsonb, '[]'::jsonb,
   jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now()-interval '6 minutes')::bigint)),
   jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now()+interval '2 minutes')::bigint)),
   jsonb_build_array(jsonb_build_object('method','password','timestamp','999999999999999999999999')),
   jsonb_build_array(jsonb_build_object('method','otp','timestamp',extract(epoch from now())::bigint))
 )) loop
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_uid,'role','authenticated','session_id',owner_session,'aal','aal1','amr',candidate)::text,true);
  execute 'set local role authenticated';
  begin perform rg_private.rg_assert_recent_ai_owner(); raise exception 'Bad AMR accepted'; exception when insufficient_privilege then null; end;
  begin perform public.rg_set_ai_provider_key('openai','invalid-audit-key'); raise exception 'Legacy provider setter unguarded'; exception when insufficient_privilege then null; end;
  begin perform public.rg_set_ai_provider_key('openai',null); raise exception 'Legacy provider delete unguarded'; exception when insufficient_privilege then null; end;
  begin perform public.rg_set_ai_key('x'); raise exception 'Legacy Gemini setter unguarded'; exception when insufficient_privilege then null; end;
  begin perform public.rg_set_ai_key(null); raise exception 'Legacy Gemini delete unguarded'; exception when insufficient_privilege then null; end;
  begin perform public.ab_ai_config('set','x'); raise exception 'Legacy diary setter unguarded'; exception when insufficient_privilege then null; end;
  begin perform public.ab_ai_config('remove',null); raise exception 'Legacy diary delete unguarded'; exception when insufficient_privilege then null; end;
  begin perform public.rg_hub_set_ai_key('openai','invalid-audit-key'); raise exception 'Hub setter unguarded'; exception when insufficient_privilege then null; end;
  begin perform public.rg_hub_set_ai_key('openai',null); raise exception 'Hub delete unguarded'; exception when insufficient_privilege then null; end;
  begin perform rg_private.rg_set_ai_provider_key('openai','invalid-audit-key'); raise exception 'Internal provider setter unguarded'; exception when insufficient_privilege then null; end;
  begin perform rg_private.rg_set_ai_key('x'); raise exception 'Internal Gemini setter unguarded'; exception when insufficient_privilege then null; end;
  begin perform ab_private.ai_config('remove',null); raise exception 'Internal diary delete unguarded'; exception when insufficient_privilege then null; end;
  result:=public.ab_ai_config('status',null);
  if jsonb_typeof(result->'configured') is distinct from 'boolean' then raise exception 'Read-only status broken'; end if;
  execute 'reset role';
 end loop;
 methods:=jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now())::bigint));
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_uid,'role','authenticated','session_id',owner_session,'aal','aal1','amr',methods)::text,true);
 execute 'set local role authenticated';
 perform rg_private.rg_assert_recent_ai_owner();
 -- A valid recent owner reaches normal format validation; no real credential writes.
 begin perform public.rg_set_ai_provider_key('openai','invalid-audit-key'); raise exception 'Invalid OpenAI key accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.rg_set_ai_key('x'); raise exception 'Invalid Gemini key accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.ab_ai_config('set','x'); raise exception 'Invalid diary key accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.rg_hub_set_ai_key('openai','invalid-audit-key'); raise exception 'Invalid hub key accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.rg_hub_set_ai_key('unknown',null); raise exception 'Unknown provider accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.ab_ai_server_key(owner_uid); raise exception 'Key reader accessible'; exception when insufficient_privilege then null; end;
 execute 'reset role';

 -- Fresh AMR cannot revive a revoked/missing login session.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_uid,'role','authenticated','session_id',gen_random_uuid(),'amr',methods)::text,true);
 execute 'set local role authenticated';
 begin perform rg_private.rg_assert_recent_ai_owner(); raise exception 'Revoked session accepted'; exception when insufficient_privilege then null; end;
 execute 'reset role';

 if other_uid is not null then
  perform set_config('request.jwt.claims',jsonb_build_object('sub',other_uid,'role','authenticated','session_id',other_session,'amr',methods)::text,true);
  execute 'set local role authenticated';
  begin perform public.rg_hub_set_ai_key('openai','invalid-audit-key'); raise exception 'Non-family-owner key write accepted'; exception when insufficient_privilege then null; end;
  begin perform public.ab_ai_config('set','x'); raise exception 'Non-family-owner diary key write accepted'; exception when insufficient_privilege then null; end;
  result:=public.ab_shared_ai_status();
  if jsonb_typeof(result->'configured') is distinct from 'boolean' then raise exception 'Collaborator status access broken'; end if;
  execute 'reset role';
 end if;

 perform set_config('request.jwt.claims','{"role":"anon"}',true);
 execute 'set local role anon';
 begin perform public.rg_hub_set_ai_key('openai',null); raise exception 'Anonymous setter access'; exception when insufficient_privilege then null; end;
 begin perform rg_private.rg_assert_recent_ai_owner(); raise exception 'Anonymous helper access'; exception when insufficient_privilege then null; end;
 execute 'reset role';
end $audit$;
select 'PASS: all legacy/internal/hub credential entrypoints gate missing/old/future/malformed AMR; valid recent owner reaches format validation; status remains readable; revoked, non-owner, anonymous denied. No credentials/session/data changed.' as audit;
rollback;
