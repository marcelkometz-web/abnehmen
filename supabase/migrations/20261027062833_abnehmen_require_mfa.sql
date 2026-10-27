-- The MFA requirement applies only to the Abnehmen diary, not garden/recipe RLS.
begin;
create schema ab_private;
revoke all on schema ab_private from public, anon, authenticated;
grant usage on schema ab_private to authenticated;

-- A narrow privileged lookup is required because clients cannot inspect Auth
-- factor records. No caller-supplied UID, no returned secret, no mutable claims.
create function ab_private.mfa_verified() returns boolean
language sql stable security definer set search_path=''
as $$
  select (select auth.uid()) is not null
    and (select auth.jwt()->>'aal')='aal2'
    and recipe_auth.session_valid()
    and exists (select 1 from auth.mfa_factors f
      where f.user_id=(select auth.uid()) and f.status='verified' and f.factor_type='totp')
$$;
revoke all on function ab_private.mfa_verified() from public, anon, authenticated;
grant execute on function ab_private.mfa_verified() to authenticated;

create or replace function public.ab_current_diary() returns uuid
language sql stable security invoker set search_path=''
as $$select diary_user_id from public.ab_access
  where user_id=(select auth.uid()) and enabled and (select ab_private.mfa_verified())$$;
notify pgrst,'reload schema';
commit;
