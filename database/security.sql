-- PSE CRM login + access rules
-- run this in Supabase > SQL Editor (after schema.sql)


-- 1. when a new login user is added, make a profile for them

create or replace function public.add_new_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), new.email, 'member');
  return new;
end;
$$;

create trigger on_new_user
  after insert on auth.users
  for each row execute function public.add_new_profile();


-- 2. turn on security for all tables (in case it is not on)

alter table profiles enable row level security;
alter table contacts enable row level security;
alter table stages enable row level security;
alter table deals enable row level security;
alter table meetings enable row level security;
alter table activities enable row level security;
alter table targets enable row level security;


-- 3. logged in users can do everything on these

create policy "team access" on contacts
  for all to authenticated using (true) with check (true);

create policy "team access" on deals
  for all to authenticated using (true) with check (true);

create policy "team access" on meetings
  for all to authenticated using (true) with check (true);

create policy "team access" on activities
  for all to authenticated using (true) with check (true);


-- 4. profiles: everyone can see the team list
-- (roles are changed from the supabase dashboard)

create policy "team can view" on profiles
  for select to authenticated using (true);


-- 5. stages: everyone can see, only managers can change

create policy "team can view" on stages
  for select to authenticated using (true);

create policy "managers can change" on stages
  for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'manager'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'manager'));


-- 6. targets: everyone can see, only managers can add/edit
-- locked targets can not be edited or deleted

create policy "team can view" on targets
  for select to authenticated using (true);

create policy "managers can add" on targets
  for insert to authenticated
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'manager'));

create policy "managers can delete unlocked" on targets
  for delete to authenticated
  using (locked = false and exists (select 1 from profiles where id = auth.uid() and role = 'manager'));
