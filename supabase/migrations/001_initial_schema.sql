-- 75 HQ Initial Schema

create extension if not exists "pgcrypto";

create table meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  week_start date not null,
  day_of_week int not null,
  meal_type text not null,
  title text not null,
  recipe_json jsonb,
  created_at timestamptz default now()
);

create table macro_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  logged_at timestamptz not null,
  meal_type text not null,
  description text,
  calories int not null,
  protein_g numeric not null,
  fat_g numeric not null,
  carbs_g numeric not null,
  created_at timestamptz default now()
);

create table workouts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  week_start date not null,
  day_of_week int not null,
  session text not null,
  name text not null,
  environment text,
  exercises_json jsonb,
  completed boolean default false,
  created_at timestamptz default now()
);

create table checklist_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  date date not null,
  item text not null,
  completed boolean default false,
  created_at timestamptz default now()
);

create table progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  date date not null,
  storage_url text not null,
  notes text,
  created_at timestamptz default now()
);

create table weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  date date not null,
  weight_lbs numeric not null,
  created_at timestamptz default now()
);

-- Indexes for common queries
create index idx_checklist_logs_user_date on checklist_logs (user_id, date);
create index idx_macro_logs_user_date on macro_logs (user_id, logged_at);
create index idx_meal_plans_user_week on meal_plans (user_id, week_start);
create index idx_workouts_user_week on workouts (user_id, week_start);
create index idx_weight_logs_user_date on weight_logs (user_id, date);
create index idx_progress_photos_user_date on progress_photos (user_id, date);
