begin;
alter table public.ab_preferences add column goal_baseline_weight_kg numeric(5,2) check(goal_baseline_weight_kg between 1 and 700),add column goal_baseline_recorded_on date;
create function ab_private.anchor_goal()returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.recorded_on between current_date-7 and current_date+1 then
  update public.ab_preferences set goal_baseline_weight_kg=new.weight_kg,goal_baseline_recorded_on=new.recorded_on
  where user_id=new.user_id and goal_baseline_weight_kg is null and remaining_goal_min is not null and remaining_goal_max is not null
   and new.recorded_on>=created_at::date-7;
 end if;
 return new;
end$$;
revoke all on function ab_private.anchor_goal()from public,anon,authenticated;
create trigger ab_anchor_goal after insert or update of weight_kg on public.ab_weights for each row execute function ab_private.anchor_goal();
notify pgrst,'reload schema';
commit;
