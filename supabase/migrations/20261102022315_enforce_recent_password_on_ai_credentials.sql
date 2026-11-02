-- Require fresh password confirmation at the deepest credential mutation entrypoints.
-- No user, membership, API key value, provider preference or auth setting changes.
begin;

create or replace function rg_private.rg_assert_recent_ai_owner() returns void
language plpgsql security invoker set search_path=''
as $guard$
declare methods jsonb := auth.jwt()->'amr';
begin
  perform rg_private.rg_assert_account();
  if public.ab_current_diary() is null or not exists(
    select 1 from public.rg_members m
    join public.rg_families f on f.id=m.family_id and f.owner_id=m.user_id
    where m.user_id=auth.uid() and m.role='owner'
  ) then
    raise exception 'Current approved family owner required' using errcode='42501';
  end if;
  if jsonb_typeof(methods) is distinct from 'array' then
    raise exception 'Recent password authentication required' using errcode='42501';
  end if;
  if not exists(
    select 1 from jsonb_array_elements(methods) m
    where m->>'method'='password'
      and case when m->>'timestamp' ~ '^[0-9]{1,12}$' then (m->>'timestamp')::numeric end
        between extract(epoch from now())-300 and extract(epoch from now())+60
  ) then
    raise exception 'Recent password authentication required' using errcode='42501';
  end if;
end
$guard$;
revoke all on function rg_private.rg_assert_recent_ai_owner() from public, anon, authenticated;
grant execute on function rg_private.rg_assert_recent_ai_owner() to authenticated;

CREATE OR REPLACE FUNCTION ab_private.ai_config(action text, new_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare diary uuid; sid uuid;
begin
  if action in ('set','remove') then perform rg_private.rg_assert_recent_ai_owner(); end if;
  if auth.uid() is null or not rg_private.rg_account_enabled() then raise exception 'Access denied' using errcode='42501'; end if;
  diary:=public.ab_current_diary();
  if diary is null then raise exception 'Current approved diary membership required' using errcode='42501'; end if;
  -- Serializes key replacement without exposing a secret to the browser.
  perform pg_advisory_xact_lock(hashtextextended('ab-ai-key-' || diary::text,0));
  select secret_id into sid from ab_private.ai_settings where user_id=diary;
  if action='set' then
    if new_key is null or char_length(new_key) not between 23 and 503 or new_key !~ '^sk-[A-Za-z0-9_-]+$' then raise exception 'Invalid API key format' using errcode='22023'; end if;
    if sid is null then
      sid:=vault.create_secret(new_key,'abnehmen-openai-' || diary::text,'Abnehmen OpenAI key; server-only');
    else
      perform vault.update_secret(sid,new_key);
    end if;
    insert into ab_private.ai_settings(user_id,secret_id) values(diary,sid)
      on conflict(user_id) do update set secret_id=excluded.secret_id,updated_at=now();
  elsif action='remove' then
    delete from ab_private.ai_settings where user_id=diary;
    if sid is not null then delete from vault.secrets where id=sid; end if;
    sid:=null;
  elsif action<>'status' then
    raise exception 'Invalid action' using errcode='22023';
  end if;
  return jsonb_build_object('configured',sid is not null,'model','gpt-6-luna','daily_limit',100,'minute_limit',5);
end
$function$;

CREATE OR REPLACE FUNCTION rg_private.rg_set_ai_key(gemini_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare family uuid; secret_id uuid; clean_key text;
begin
  perform rg_private.rg_assert_recent_ai_owner();
  if (select auth.uid()) is null then
    raise exception 'Bitte melde dich an.' using errcode = '42501';
  end if;
  select m.family_id into family from public.rg_members m
    join public.rg_families f on f.id = m.family_id and f.owner_id = m.user_id
    where m.user_id = (select auth.uid()) and m.role = 'owner';
  if family is null then
    raise exception 'Nur die Familienverwaltung darf den KI-Schlüssel ändern.' using errcode = '42501';
  end if;
  -- Serialisiert Speichern/Ersetzen/Entfernen für denselben Familiengarten.
  perform 1 from public.rg_families where id = family for update;
  if gemini_key is null then
    delete from rg_private.rg_ai_credentials where family_id = family;
    return jsonb_build_object('configured', false, 'updated_at', null);
  end if;
  clean_key := trim(gemini_key);
  if char_length(clean_key) not between 20 and 256 or clean_key !~ '^[A-Za-z0-9._-]+$'
    or clean_key ~ '^(sb_|eyJ)' then
    raise exception 'Bitte einen gültigen Google-Gemini-Schlüssel eintragen, keinen Supabase-Schlüssel.' using errcode = '22023';
  end if;
  select c.vault_secret_id into secret_id from rg_private.rg_ai_credentials c where c.family_id = family;
  if secret_id is null then
    secret_id := vault.create_secret(clean_key, 'ramonas-garten-gemini:' || family::text,
      'Gemeinsamer Gemini-Zugang für einen Familiengarten');
    insert into rg_private.rg_ai_credentials(family_id, vault_secret_id, updated_by)
      values(family, secret_id, (select auth.uid()));
  else
    perform vault.update_secret(secret_id, clean_key);
    update rg_private.rg_ai_credentials set updated_by = (select auth.uid()), updated_at = now()
      where family_id = family;
  end if;
  return rg_private.rg_ai_status();
end;
$function$;

CREATE OR REPLACE FUNCTION rg_private.rg_set_ai_provider_key(provider text, api_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare family uuid; secret_id uuid; clean_key text;
begin
  perform rg_private.rg_assert_recent_ai_owner();
  if provider is null or provider not in ('gemini','openai') then
    raise exception 'Unbekannter KI-Anbieter.' using errcode = '22023';
  end if;
  if provider = 'gemini' then
    return rg_private.rg_set_ai_key(api_key) || jsonb_build_object('provider',provider);
  end if;
  select m.family_id into family from public.rg_members m
    join public.rg_families f on f.id = m.family_id and f.owner_id = m.user_id
    where m.user_id = (select auth.uid()) and m.role = 'owner';
  if family is null then
    raise exception 'Nur die Familienverwaltung darf den KI-Schlüssel ändern.' using errcode = '42501';
  end if;
  perform 1 from public.rg_families where id = family for update;
  if api_key is null then
    delete from rg_private.rg_openai_credentials where family_id = family;
    return rg_private.rg_ai_provider_status(provider);
  end if;
  clean_key := trim(api_key);
  if char_length(clean_key) not between 20 and 512 or clean_key !~ '^sk-[A-Za-z0-9_-]+$' then
    raise exception 'Bitte einen gültigen OpenAI-API-Schlüssel eintragen.' using errcode = '22023';
  end if;
  select c.vault_secret_id into secret_id from rg_private.rg_openai_credentials c where c.family_id = family;
  if secret_id is null then
    secret_id := vault.create_secret(clean_key,'ramonas-garten-openai:' || family::text,
      'Gemeinsamer OpenAI-Zugang für einen Familiengarten');
    insert into rg_private.rg_openai_credentials(family_id,vault_secret_id,updated_by)
      values(family,secret_id,(select auth.uid()));
  else
    perform vault.update_secret(secret_id,clean_key);
    update rg_private.rg_openai_credentials set updated_by=(select auth.uid()),updated_at=now() where family_id=family;
  end if;
  return rg_private.rg_ai_provider_status(provider);
end;
$function$;

create or replace function public.rg_hub_set_ai_key(p_provider text,p_key text) returns jsonb
language plpgsql security invoker set search_path=''
as $hub$
begin
  perform rg_private.rg_assert_recent_ai_owner();
  if p_provider is null or p_provider not in ('openai','gemini') then
    raise exception 'Invalid provider' using errcode='22023';
  end if;
  perform public.rg_set_ai_provider_key(p_provider,p_key);
  if p_provider='openai' then
    perform public.ab_ai_config(case when p_key is null then 'remove' else 'set' end,p_key);
  end if;
  return jsonb_build_object('configured',p_key is not null,'provider',p_provider);
end
$hub$;
comment on function rg_private.rg_assert_recent_ai_owner() is
  'All AI credential writes require an active approved family owner and signed password AMR no older than five minutes; status and provider preferences are unaffected.';
notify pgrst,'reload schema';
commit;
