-- ============================================
-- MediMap Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- USERS / PROFILES
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  date_of_birth date,
  gender text check (gender in ('Male', 'Female', 'Other')),
  height_cm numeric,
  weight_kg numeric,
  blood_group text,
  city text,
  occupation text,
  emergency_contact text,
  avatar_url text,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- USER CONDITIONS (e.g. Diabetes, Hypertension)
-- ============================================
create table public.user_conditions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  condition_name text not null,
  created_at timestamptz default now()
);

-- ============================================
-- REPORTS
-- ============================================
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  report_name text not null,
  report_type text not null, -- 'Blood Test', 'Thyroid', 'Lipid', etc.
  lab_name text,
  test_date date,
  file_url text,           -- Supabase Storage URL
  file_name text,
  upload_status text default 'processing' check (upload_status in ('processing', 'complete', 'failed')),
  abnormal_count integer default 0,
  total_parameters integer default 0,
  overall_status text,     -- 'Normal', 'Borderline', 'Abnormal'
  ai_summary text,         -- Plain language AI verdict
  next_test_date date,
  next_test_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- EXTRACTED VALUES (per report)
-- ============================================
create table public.report_values (
  id uuid default uuid_generate_v4() primary key,
  report_id uuid references public.reports(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  parameter_name text not null,
  method text,
  value numeric,
  value_text text,         -- for non-numeric values
  unit text,
  ref_range_low numeric,
  ref_range_high numeric,
  ref_range_text text,     -- raw text like "4000-10000"
  status text check (status in ('Normal', 'High', 'Low', 'Critical High', 'Critical Low', 'Watch')),
  test_date date,          -- inherited from report
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- RECOMMENDED TESTS (based on conditions)
-- ============================================
create table public.recommended_tests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  test_name text not null,
  reason text,
  frequency_days integer,  -- e.g. 90 for every 3 months
  last_done_date date,
  next_due_date date,
  status text check (status in ('Due Soon', 'Missing', 'On Track', 'Overdue')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- PRESCRIPTION MEDICINES
-- ============================================
create table public.prescription_medicines (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  medicine_name text not null,
  strength text,
  frequency text,
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- STORAGE BUCKET (run separately)
-- ============================================
-- Create a bucket called 'reports' in Supabase Storage UI
-- Or via SQL:
-- insert into storage.buckets (id, name, public) values ('reports', 'reports', false);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.profiles enable row level security;
alter table public.user_conditions enable row level security;
alter table public.reports enable row level security;
alter table public.report_values enable row level security;
alter table public.recommended_tests enable row level security;
alter table public.prescription_medicines enable row level security;

-- Profiles: users can only see/edit their own
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Conditions
create policy "Users manage own conditions" on public.user_conditions
  for all using (auth.uid() = user_id);

-- Reports
create policy "Users manage own reports" on public.reports
  for all using (auth.uid() = user_id);

-- Report values
create policy "Users manage own report values" on public.report_values
  for all using (auth.uid() = user_id);

-- Recommended tests
create policy "Users manage own recommended tests" on public.recommended_tests
  for all using (auth.uid() = user_id);

-- Prescription medicines
create policy "Users manage own prescription medicines" on public.prescription_medicines
  for all using (auth.uid() = user_id);

-- ============================================
-- TRIGGER: auto-create profile on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- TRIGGER: update updated_at timestamps
-- ============================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on public.profiles
  for each row execute procedure public.update_updated_at();
create trigger update_reports_updated_at before update on public.reports
  for each row execute procedure public.update_updated_at();
create trigger update_report_values_updated_at before update on public.report_values
  for each row execute procedure public.update_updated_at();
