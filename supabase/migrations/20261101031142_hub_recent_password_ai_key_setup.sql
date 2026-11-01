begin;
create or replace function public.rg_hub_set_ai_key(p_provider text,p_key text)returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if public.ab_current_diary()is null or not exists(select 1 from public.rg_members where user_id=auth.uid() and role='owner') then raise exception 'Current approved owner required'using errcode='42501';end if;
 if not exists(select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'))m where m->>'method'='password' and case when m->>'timestamp'~'^[0-9]+$' then(m->>'timestamp')::numeric end between extract(epoch from now())-300 and extract(epoch from now())+60)then raise exception 'Recent password authentication required'using errcode='42501';end if;
 if p_provider not in('openai','gemini')or p_key is null then raise exception 'Invalid provider/key'using errcode='22023';end if;
 result:=public.rg_set_ai_provider_key(p_provider,p_key);
 if p_provider='openai'then perform public.ab_ai_config('set',p_key);end if;
 return jsonb_build_object('configured',true,'provider',p_provider);
end$$;
revoke all on function public.rg_hub_set_ai_key(text,text)from public,anon,authenticated;
grant execute on function public.rg_hub_set_ai_key(text,text)to authenticated;
notify pgrst,'reload schema';
commit;
