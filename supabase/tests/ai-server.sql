-- Run as postgres; all dummy-key and quota fixtures are rolled back.
begin;
do $test$
declare diary uuid; sid uuid; factor uuid; n integer; result text;
begin
  select diary_user_id into diary from public.ab_access where user_id=diary_user_id;
  -- Do not read, replace, or return any actual secret. Create a separate rollback fixture.
  sid:=vault.create_secret('sk-' || repeat('x',40),'ab-test-' || gen_random_uuid()::text,'Rollback-only dummy secret');
  insert into ab_private.ai_settings(user_id,secret_id) values(diary,sid)
    on conflict(user_id) do update set secret_id=excluded.secret_id;
  if has_table_privilege('authenticated','vault.decrypted_secrets','select')
     or has_function_privilege('authenticated','public.ab_ai_server_key(uuid)','execute')
     or has_function_privilege('anon','public.ab_ai_config(text,text)','execute') then
    raise exception 'An API key path is exposed to clients';
  end if;
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  execute 'set local role service_role';
  result:=public.ab_ai_server_key(diary);
  if result is distinct from 'sk-' || repeat('x',40) then raise exception 'Server secret retrieval failed'; end if;
  for n in 1..5 loop
    if not public.ab_ai_reserve(diary) then raise exception 'Expected quota reservation to succeed'; end if;
  end loop;
  if public.ab_ai_reserve(diary) then raise exception 'Minute quota can be exceeded'; end if;
  execute 'reset role';
end $test$;
rollback;
select 'PASS: Vault key is server-only, client secret paths are denied, rate limiting enforced; dummy fixtures rolled back.' as verification;
