begin;
-- An explicit shared-provider choice must never silently reactivate a legacy
-- diary key after that shared provider was removed or is not configured.
create or replace function public.ab_shared_ai_status()returns jsonb
language plpgsql security invoker set search_path='' as $$
declare selected text; preference text; family uuid; configured boolean; legacy jsonb;
begin
 if public.ab_current_diary()is null then raise exception 'Current approved diary member required'using errcode='42501';end if;
 select m.family_id,coalesce(m.preferred_ai_provider,f.ai_provider,'gemini'),m.preferred_ai_provider into family,selected,preference
 from public.rg_members m join public.rg_families f on f.id=m.family_id where m.user_id=auth.uid();
 if family is not null and selected in('openai','gemini')then
  configured:=coalesce((public.rg_ai_provider_status(selected)->>'configured')::boolean,false);
  if configured or preference is not null then return jsonb_build_object('configured',configured,'shared',true,'provider',selected,'family_id',family,'model',case when selected='gemini'then 'gemini-3.1-flash-lite'else 'gpt-6-luna'end);end if;
 end if;
 -- Existing separately configured OpenAI remains usable until a shared provider
 -- is selected and configured. No legacy credential is returned or copied here.
 legacy:=public.ab_ai_config('status');
 return legacy||jsonb_build_object('shared',false,'provider','openai');
end$$;
revoke all on function public.ab_shared_ai_status()from public,anon,authenticated;
grant execute on function public.ab_shared_ai_status()to authenticated;

notify pgrst,'reload schema';
commit;
