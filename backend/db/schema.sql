-- Spin — Supabase/Postgres schema.
-- Run this once in the Supabase SQL editor (or `psql < db/schema.sql`).
--
-- Auth lives in Supabase's own `auth.users` (phone + OTP). `profiles` holds the
-- resident details the app collects afterwards and is keyed by the auth user id.

create extension if not exists pgcrypto;

-- PROFILES -------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  phone         text        not null,
  full_name     text        not null,
  flat          text        not null,
  building_name text        not null,
  role          text        not null default 'resident' check (role in ('resident', 'admin')),
  push_opt_in   boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- MACHINES -------------------------------------------------------------------
-- `programs` stays a JSON array to mirror the embedded sub-document the app
-- already sends; it is read as a whole and never queried by element.
create table if not exists public.machines (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  kind       text        not null check (kind in ('wash', 'dry')),
  model      text        not null,
  programs   jsonb       not null default '[]'::jsonb,
  active     boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- BOOKINGS -------------------------------------------------------------------
create table if not exists public.bookings (
  id            uuid        primary key default gen_random_uuid(),
  machine_id    uuid        not null references public.machines (id) on delete cascade,
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  cycle_label   text        not null,
  cycle_minutes integer     not null check (cycle_minutes > 0),
  start_time    timestamptz not null,
  end_time      timestamptz not null,
  state         text        not null default 'active' check (state in ('active', 'done', 'released')),
  done_at       timestamptz,
  released_at   timestamptz,
  released_by   uuid        references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists bookings_user_idx    on public.bookings (user_id, created_at desc);
create index if not exists bookings_machine_idx on public.bookings (machine_id, created_at desc);

-- A machine counts as free only once its booking is released, so at most one
-- non-released booking may exist per machine. This turns the old read-then-write
-- race in startBooking into a database-enforced guarantee: a second concurrent
-- claim fails on this constraint instead of double-booking.
create unique index if not exists bookings_one_open_per_machine
  on public.bookings (machine_id)
  where state <> 'released';

-- NOTIFICATIONS --------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  type       text        not null check (type in ('booking_done', 'collect_reminder')),
  title      text        not null,
  body       text        not null,
  machine_id uuid        references public.machines (id) on delete set null,
  read       boolean     not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- updated_at ------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists machines_touch on public.machines;
create trigger machines_touch before update on public.machines
  for each row execute function public.touch_updated_at();

drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

-- ROW LEVEL SECURITY ---------------------------------------------------------
-- The API connects as the database owner and bypasses RLS, so these policies do
-- not gate the Express routes. They exist so that the anon/publishable key can
-- never read another resident's data if the browser ever queries Supabase
-- directly (and so a leaked anon key is not a data breach).
alter table public.profiles      enable row level security;
alter table public.machines      enable row level security;
alter table public.bookings      enable row level security;
alter table public.notifications enable row level security;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for select using (auth.uid() = id);

drop policy if exists machines_readable on public.machines;
create policy machines_readable on public.machines
  for select using (auth.role() = 'authenticated');

-- Bookings are readable by any signed-in resident: the home screen has to show
-- who is using each machine. Writes stay server-side only (no insert/update
-- policy), so nothing can be booked or released except through the API.
drop policy if exists bookings_readable on public.bookings;
create policy bookings_readable on public.bookings
  for select using (auth.role() = 'authenticated');

drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications
  for select using (auth.uid() = user_id);

-- OTP TRANSACTIONS -----------------------------------------------------------
-- Audit trail only. The MSG91 widget runs the OTP lifecycle in the browser, so
-- the server never sees a code, a reqId or an attempt count, and nothing here
-- gates a sign-in. request_id is nullable for exactly that reason.
create table if not exists public.otp_transactions (
  id             uuid        primary key default gen_random_uuid(),
  request_id     text,
  phone          text        not null,
  status         text        not null default 'pending'
                   check (status in ('pending', 'verified', 'locked', 'expired')),
  verify_attempts integer    not null default 0,
  resend_count   integer     not null default 0,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null,
  verified_at    timestamptz,
  last_resend_at timestamptz
);

create index if not exists otp_tx_phone_idx on public.otp_transactions (phone, created_at desc);

-- Only the API (which connects as the owner and bypasses RLS) may touch this.
-- No policies are defined, so the anon key can read nothing here.
alter table public.otp_transactions enable row level security;

-- Migration for projects created before the widget moved to the browser:
-- request_id used to be NOT NULL when the server owned the OTP lifecycle.
alter table public.otp_transactions alter column request_id drop not null;
alter table public.otp_transactions alter column expires_at drop not null;

-- PUSH SUBSCRIPTIONS ---------------------------------------------------------
-- One row per browser/device a resident has enabled push on. The endpoint is
-- the push service's URL for that device and is globally unique, so it is the
-- natural key: re-subscribing on the same device updates rather than duplicates.
create table if not exists public.push_subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  endpoint   text        not null unique,
  p256dh     text        not null,
  auth       text        not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subs_user_idx on public.push_subscriptions (user_id);

-- Server-only, like otp_transactions: no policies, so the anon key sees nothing.
alter table public.push_subscriptions enable row level security;
