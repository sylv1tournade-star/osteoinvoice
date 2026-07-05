-- OsteoFacture — à exécuter dans Supabase → SQL Editor → Run
-- Idempotent : peut être relancé sans erreur

create table if not exists practitioner_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  profile_data jsonb not null default '{}',
  updated_at timestamptz default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  local_id text not null,
  invoice_data jsonb not null,
  created_at timestamptz not null default now(),
  unique(user_id, local_id)
);

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  local_id text not null,
  patient_data jsonb not null,
  updated_at timestamptz default now(),
  unique(user_id, local_id)
);

alter table practitioner_profiles enable row level security;
alter table invoices enable row level security;
alter table patients enable row level security;

drop policy if exists "profiles_own" on practitioner_profiles;
create policy "profiles_own" on practitioner_profiles for all using (auth.uid() = user_id);

drop policy if exists "invoices_own" on invoices;
create policy "invoices_own" on invoices for all using (auth.uid() = user_id);

drop policy if exists "patients_own" on patients;
create policy "patients_own" on patients for all using (auth.uid() = user_id);

create index if not exists invoices_user_created on invoices(user_id, created_at desc);
create index if not exists patients_user_updated on patients(user_id, updated_at desc);
