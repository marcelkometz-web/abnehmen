begin;
-- Status contains no credential. Existing family RLS, account/session and diary
-- allowlist checks still apply; wrappers run as the current authenticated user.
create or replace function public.ab_shared_ai_status()returns jsonb
language plpgsql security invoker set search_path='' as $$
declare selected text; family uuid; configured boolean; legacy jsonb;
begin
 if public.ab_current_diary()is null then raise exception 'Current approved diary member required'using errcode='42501';end if;
 select m.family_id,coalesce(m.preferred_ai_provider,f.ai_provider,'gemini') into family,selected
 from public.rg_members m join public.rg_families f on f.id=m.family_id where m.user_id=auth.uid();
 if family is not null and selected in('openai','gemini')then
  configured:=coalesce((public.rg_ai_provider_status(selected)->>'configured')::boolean,false);
  if configured then return jsonb_build_object('configured',true,'shared',true,'provider',selected,'family_id',family,'model',case when selected='gemini'then 'gemini-3.1-flash-lite'else 'gpt-6-luna'end);end if;
 end if;
 -- Existing separately configured OpenAI remains usable until a shared provider
 -- is selected and configured. No legacy credential is returned or copied here.
 legacy:=public.ab_ai_config('status');
 return legacy||jsonb_build_object('shared',false,'provider','openai');
end$$;
revoke all on function public.ab_shared_ai_status()from public,anon,authenticated;
grant execute on function public.ab_shared_ai_status()to authenticated;

create or replace function public.rg_hub_select_ai(p_provider text)returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if public.ab_current_diary()is null then raise exception 'Current approved diary member required'using errcode='42501';end if;
 if not exists(select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'))m where m->>'method'='password' and case when m->>'timestamp'~'^[0-9]+$'then(m->>'timestamp')::numeric end between extract(epoch from now())-300 and extract(epoch from now())+60)then raise exception 'Recent password authentication required'using errcode='42501';end if;
 if p_provider is null or p_provider not in('openai','gemini')then raise exception 'Invalid provider'using errcode='22023';end if;
 perform public.rg_set_ai_preference(p_provider);
 return public.ab_shared_ai_status();
end$$;
revoke all on function public.rg_hub_select_ai(text)from public,anon,authenticated;
grant execute on function public.rg_hub_select_ai(text)to authenticated;
notify pgrst,'reload schema';
commit;
