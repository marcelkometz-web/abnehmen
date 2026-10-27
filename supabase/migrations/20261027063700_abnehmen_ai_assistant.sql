-- AI history is private diary data; the API key is encrypted in Vault.
begin;
create table public.ab_ai_messages (
  id uuid primary key default gen_random_uuid(),
  sequence bigint generated always as identity unique,
  user_id uuid not null references public.ab_access(user_id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  role text not null check(role in ('user','assistant')),
  content text not null check(char_length(content) between 1 and 8000),
  created_at timestamptz not null default now()
);
create index ab_ai_messages_diary_time_idx on public.ab_ai_messages(user_id,created_at desc);
create index ab_ai_messages_author_idx on public.ab_ai_messages(author_id);
create table public.ab_ai_tips (
  user_id uuid primary key references public.ab_access(user_id) on delete cascade,
  content text not null check(char_length(content) between 1 and 1500),
  context_hash text not null,
  memory text not null default '' check(char_length(memory)<=4000),
  created_at timestamptz not null default now()
);
alter table public.ab_ai_messages enable row level security;
alter table public.ab_ai_tips enable row level security;
revoke all on public.ab_ai_messages,public.ab_ai_tips from public,anon,authenticated;
grant select on public.ab_ai_messages,public.ab_ai_tips to authenticated;
grant select,insert,update,delete on public.ab_ai_messages,public.ab_ai_tips to service_role;
revoke all on sequence public.ab_ai_messages_sequence_seq from public,anon,authenticated;
grant usage,select on sequence public.ab_ai_messages_sequence_seq to service_role;
create policy ab_ai_messages_read on public.ab_ai_messages for select to authenticated
  using(user_id=(select public.ab_current_diary()));
create policy ab_ai_tips_read on public.ab_ai_tips for select to authenticated
  using(user_id=(select public.ab_current_diary()));

create table ab_private.ai_settings (
  user_id uuid primary key references public.ab_access(user_id) on delete cascade,
  secret_id uuid references vault.secrets(id) on delete set null,
  updated_at timestamptz not null default now()
);
create table ab_private.ai_usage (
  user_id uuid primary key references public.ab_access(user_id) on delete cascade,
  minute_start timestamptz not null default now(),
  minute_count integer not null default 0,
  day_start date not null default current_date,
  day_count integer not null default 0
);
alter table ab_private.ai_settings enable row level security;
alter table ab_private.ai_usage enable row level security;
revoke all on ab_private.ai_settings,ab_private.ai_usage from public,anon,authenticated,service_role;

create function ab_private.ai_config(action text,new_key text) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare diary uuid; sid uuid;
begin
  if auth.uid() is null or not rg_private.rg_account_enabled() then raise exception 'Access denied' using errcode='42501'; end if;
  diary:=public.ab_current_diary();
  if diary is null then raise exception 'MFA and application membership required' using errcode='42501'; end if;
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
$$;
revoke all on function ab_private.ai_config(text,text) from public,anon,authenticated;
grant execute on function ab_private.ai_config(text,text) to authenticated;
create function public.ab_ai_config(action text default 'status',new_key text default null) returns jsonb
language sql security invoker set search_path=''
as $$select ab_private.ai_config(action,new_key)$$;
revoke all on function public.ab_ai_config(text,text) from public,anon,authenticated;
grant execute on function public.ab_ai_config(text,text) to authenticated;

-- The only secret read path is an ACL-restricted RPC for the Edge Function.
create function ab_private.ai_server_key(diary uuid) returns text
language plpgsql security definer set search_path=''
as $$begin
  if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Server only' using errcode='42501'; end if;
  return (select v.decrypted_secret from ab_private.ai_settings s join vault.decrypted_secrets v on v.id=s.secret_id where s.user_id=diary);
end$$;
create function public.ab_ai_server_key(diary uuid) returns text
language sql security invoker set search_path=''
as $$select ab_private.ai_server_key(diary)$$;
revoke all on function ab_private.ai_server_key(uuid),public.ab_ai_server_key(uuid) from public,anon,authenticated,service_role;
grant usage on schema ab_private to service_role;
grant execute on function ab_private.ai_server_key(uuid),public.ab_ai_server_key(uuid) to service_role;

create function ab_private.ai_reserve(diary uuid) returns boolean
language plpgsql security definer set search_path=''
as $$declare allowed boolean; begin
  if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Server only' using errcode='42501'; end if;
  insert into ab_private.ai_usage(user_id) values(diary) on conflict(user_id) do nothing;
  update ab_private.ai_usage set
    minute_count=case when minute_start<now()-interval '1 minute' then 1 else minute_count+1 end,
    minute_start=case when minute_start<now()-interval '1 minute' then now() else minute_start end,
    day_count=case when day_start<current_date then 1 else day_count+1 end,
    day_start=current_date
  where user_id=diary and (minute_start<now()-interval '1 minute' or minute_count<5)
    and (day_start<current_date or day_count<100)
  returning true into allowed;
  return coalesce(allowed,false);
end$$;
create function public.ab_ai_reserve(diary uuid) returns boolean
language sql security invoker set search_path=''
as $$select ab_private.ai_reserve(diary)$$;
revoke all on function ab_private.ai_reserve(uuid),public.ab_ai_reserve(uuid) from public,anon,authenticated,service_role;
grant execute on function ab_private.ai_reserve(uuid),public.ab_ai_reserve(uuid) to service_role;

comment on table public.ab_ai_messages is 'Shared diary conversation. Only the authenticated and MFA-checked Edge Function may write messages.';
comment on table ab_private.ai_settings is 'Only a Vault secret reference is stored here. No client may read plaintext API keys.';
notify pgrst,'reload schema';
commit;
