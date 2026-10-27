-- PSE CRM database
-- run this in Supabase > SQL Editor


-- team members (linked to supabase login users)
create table profiles (
  id uuid primary key references auth.users(id),
  name text not null,
  email text not null,
  role text not null default 'member', -- member or manager
  created_at timestamp default now()
);


-- contacts (individual or company)
create table contacts (
  id serial primary key,
  contact_type text not null, -- individual or company
  name text not null,
  email text unique,
  phone text unique,
  designation text,
  organization text,
  website text,
  industry text,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamp default now(),

  -- need at least email or phone
  check (email is not null or phone is not null)
);


-- deal stages
create table stages (
  id serial primary key,
  name text not null,
  position int not null
);

insert into stages (name, position) values
  ('New', 1),
  ('Scoping', 2),
  ('Preparation', 3),
  ('Submitted', 4),
  ('Pending', 5),
  ('Won', 6),
  ('Lost', 7),
  ('Abandoned', 8);


-- deals (pipeline)
create table deals (
  id serial primary key,
  deal_name text not null,
  focal_person uuid references profiles(id),
  contact_id int references contacts(id),
  second_contact_id int references contacts(id),
  stage_id int references stages(id),
  contribution_type text, -- cash or in-kind
  category text, -- DSP, SAC, Disaster Campaign, Project, Event & Campaign, General
  vertical text, -- DSP, VBD, Project
  expected_amount numeric,
  actual_amount numeric, -- money actually received
  currency text default 'BDT',
  payment_interval text,
  expected_closing date,
  country text,
  description text,
  operational_budget numeric,
  notes text, -- google drive links go here too
  created_at timestamp default now()
);


-- meetings
create table meetings (
  id serial primary key,
  contact_id int references contacts(id),
  deal_id int references deals(id),
  meeting_time timestamp not null,
  status text default 'scheduled', -- scheduled or done
  description text,
  created_by uuid references profiles(id),
  created_at timestamp default now()
);


-- activities (calls, visits, events etc)
create table activities (
  id serial primary key,
  activity_type text not null, -- task, email, call, meeting, event, campaign, proposal, visit, stewardship, donor engagement, general
  owner_id uuid references profiles(id),
  contact_id int references contacts(id),
  deal_id int references deals(id),
  meeting_id int references meetings(id),
  activity_date timestamp,
  status text default 'pending', -- pending or done
  notes text,
  created_at timestamp default now()
);


-- targets
-- quarter empty = yearly target
-- user empty = whole team
create table targets (
  id serial primary key,
  year int not null,
  quarter int, -- 1, 2, 3, 4
  user_id uuid references profiles(id),
  vertical text, -- DSP, VBD, Project
  amount numeric not null,
  locked boolean default false,
  created_at timestamp default now()
);
