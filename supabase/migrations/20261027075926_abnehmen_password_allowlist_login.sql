-- User-requested removal of the app-specific MFA requirement.
-- No Auth users/factors, garden settings, memberships or allowlist grants change.
begin;
create or replace function public.ab_current_diary() returns uuid
language sql stable security invoker set search_path=''
as $$select diary_user_id from public.ab_access
  where user_id=(select auth.uid()) and enabled and (select rg_private.rg_account_enabled())$$;
notify pgrst,'reload schema';
commit;
