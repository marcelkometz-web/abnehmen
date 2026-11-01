-- Review/apply on the shared Garden project. Supabase CLI was unavailable in this workspace.
begin;
create function ab_private.plan_ingredients_valid(value jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare item jsonb;
begin
 if jsonb_typeof(value) is distinct from 'array' or jsonb_array_length(value)>100 then return false;end if;
 for item in select * from jsonb_array_elements(value) loop
  if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'name') is distinct from 'string' or char_length(item->>'name') not between 1 and 160
   or jsonb_typeof(item->'unit') is distinct from 'string' or char_length(item->>'unit')>40 then return false;end if;
  if not (item ? 'quantity') or (item->'quantity'<>'null'::jsonb and (jsonb_typeof(item->'quantity')<>'number' or (item->>'quantity')::numeric<=0 or (item->>'quantity')::numeric>1000000)) then return false;end if;
  if exists(select 1 from jsonb_object_keys(item) k where k not in('name','quantity','unit')) then return false;end if;
 end loop;
 return true;
exception when others then return false;
end$$;
revoke all on function ab_private.plan_ingredients_valid(jsonb) from public,anon;
grant execute on function ab_private.plan_ingredients_valid(jsonb) to authenticated;
create table public.ab_week_plan(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default public.ab_current_diary() references public.ab_access(user_id) on delete cascade,
 planned_on date not null check(planned_on between date '2000-01-01' and date '2100-12-31'),
 kind text not null check(kind in('meal','training','weighin')),
 slot text check(slot in('breakfast','lunch','dinner','snack')),
 title text not null check(char_length(title) between 1 and 200),
 recipe_id text check(recipe_id is null or char_length(recipe_id) between 1 and 120),
 servings numeric(6,2) check(servings between 0.25 and 30),
 ingredients jsonb not null default '[]' check(ab_private.plan_ingredients_valid(ingredients)),
 minutes integer check(minutes between 1 and 300),
 done boolean not null default false,
 revision bigint not null default 1 check(revision>0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check((kind='meal' and slot is not null and servings is not null and minutes is null)
    or (kind='training' and slot is null and servings is null and recipe_id is null and ingredients='[]'::jsonb)
    or (kind='weighin' and slot is null and servings is null and recipe_id is null and ingredients='[]'::jsonb and minutes is null))
);
create index ab_week_plan_diary_date on public.ab_week_plan(user_id,planned_on,id);
alter table public.ab_week_plan enable row level security;
revoke all on public.ab_week_plan from public,anon,authenticated;
grant select,delete on public.ab_week_plan to authenticated;
grant insert(id,planned_on,kind,slot,title,recipe_id,servings,ingredients,minutes,done),
 update(planned_on,kind,slot,title,recipe_id,servings,ingredients,minutes,done) on public.ab_week_plan to authenticated;
create policy ab_plan_read on public.ab_week_plan for select to authenticated using(user_id=(select public.ab_current_diary()));
create policy ab_plan_insert on public.ab_week_plan for insert to authenticated with check(user_id=(select public.ab_current_diary()));
create policy ab_plan_update on public.ab_week_plan for update to authenticated using(user_id=(select public.ab_current_diary())) with check(user_id=(select public.ab_current_diary()));
create policy ab_plan_delete on public.ab_week_plan for delete to authenticated using(user_id=(select public.ab_current_diary()));
create function ab_private.bump_plan_revision() returns trigger language plpgsql security invoker set search_path='' as $$
begin new.revision:=old.revision+1;new.updated_at:=clock_timestamp();return new;end$$;
revoke all on function ab_private.bump_plan_revision() from public,anon,authenticated;
create trigger ab_plan_revision before update on public.ab_week_plan for each row execute function ab_private.bump_plan_revision();
create function ab_private.touch_plan_diary() returns trigger language plpgsql security definer set search_path='' as $$
declare diary uuid;day date;
begin
 if tg_op='DELETE' then diary:=old.user_id;day:=old.planned_on;else diary:=new.user_id;day:=new.planned_on;end if;
 insert into public.ab_diary_state(user_id,revision,last_saved_at,last_recorded_on,last_kind)
 values(diary,1,clock_timestamp(),day,'planning') on conflict(user_id)do update set revision=ab_diary_state.revision+1,last_saved_at=excluded.last_saved_at,last_recorded_on=excluded.last_recorded_on,last_kind=excluded.last_kind;
 if tg_op='DELETE' then return old;else return new;end if;
end$$;
revoke all on function ab_private.touch_plan_diary() from public,anon,authenticated;
create trigger ab_plan_touch_diary after insert or update or delete on public.ab_week_plan for each row execute function ab_private.touch_plan_diary();
notify pgrst,'reload schema';
commit;
