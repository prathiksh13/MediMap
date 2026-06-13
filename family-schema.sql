-- ============================================
-- MediMap Family Records Schema
-- Run this in your Supabase SQL Editor (after supabase-schema.sql)
-- ============================================

-- ============================================
-- FAMILIES
-- ============================================
create table public.families (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  code text unique not null,
  head_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now()
);

-- ============================================
-- FAMILY MEMBERS (join requests + accepted members)
-- ============================================
create table public.family_members (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references public.families(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  role text not null default 'member' check (role in ('head', 'member')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (family_id, user_id)
);

alter table public.families enable row level security;
alter table public.family_members enable row level security;

-- ============================================
-- FAMILIES policies
-- ============================================
create policy "Family visible to members and head" on public.families
  for select using (
    head_id = auth.uid()
    or exists (
      select 1 from public.family_members fm
      where fm.family_id = families.id and fm.user_id = auth.uid() and fm.status = 'accepted'
    )
  );

create policy "Users can create a family" on public.families
  for insert with check (head_id = auth.uid());

create policy "Head can update family" on public.families
  for update using (head_id = auth.uid());

create policy "Head can delete family" on public.families
  for delete using (head_id = auth.uid());

-- ============================================
-- FAMILY MEMBERS policies
-- ============================================
create policy "View own membership or family-related rows" on public.family_members
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.families f where f.id = family_members.family_id and f.head_id = auth.uid())
    or exists (
      select 1 from public.family_members fm2
      where fm2.family_id = family_members.family_id and fm2.user_id = auth.uid() and fm2.status = 'accepted'
    )
  );

create policy "Users can request to join a family" on public.family_members
  for insert with check (user_id = auth.uid());

create policy "Head can update membership status" on public.family_members
  for update using (
    exists (select 1 from public.families f where f.id = family_members.family_id and f.head_id = auth.uid())
  );

create policy "Members can leave or head can remove" on public.family_members
  for delete using (
    user_id = auth.uid()
    or exists (select 1 from public.families f where f.id = family_members.family_id and f.head_id = auth.uid())
  );

-- ============================================
-- Allow accepted family members to view each other's health data
-- ============================================
create policy "Family members can view each other's profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.family_members fm1
      join public.family_members fm2 on fm1.family_id = fm2.family_id
      where fm1.user_id = auth.uid() and fm1.status = 'accepted'
        and fm2.user_id = profiles.id and fm2.status = 'accepted'
    )
  );

create policy "Family members can view each other's reports" on public.reports
  for select using (
    exists (
      select 1 from public.family_members fm1
      join public.family_members fm2 on fm1.family_id = fm2.family_id
      where fm1.user_id = auth.uid() and fm1.status = 'accepted'
        and fm2.user_id = reports.user_id and fm2.status = 'accepted'
    )
  );

create policy "Family members can view each other's report values" on public.report_values
  for select using (
    exists (
      select 1 from public.family_members fm1
      join public.family_members fm2 on fm1.family_id = fm2.family_id
      where fm1.user_id = auth.uid() and fm1.status = 'accepted'
        and fm2.user_id = report_values.user_id and fm2.status = 'accepted'
    )
  );

create policy "Family members can view each other's conditions" on public.user_conditions
  for select using (
    exists (
      select 1 from public.family_members fm1
      join public.family_members fm2 on fm1.family_id = fm2.family_id
      where fm1.user_id = auth.uid() and fm1.status = 'accepted'
        and fm2.user_id = user_conditions.user_id and fm2.status = 'accepted'
    )
  );

-- ============================================
-- TRIGGER: update updated_at on family_members
-- ============================================
create trigger update_family_members_updated_at before update on public.family_members
  for each row execute procedure public.update_updated_at();
