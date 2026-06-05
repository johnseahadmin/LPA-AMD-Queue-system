-- =============================================
-- LPA & AMD Booking System — Supabase Schema
-- Run this entire file in the Supabase SQL Editor
-- =============================================

-- Sessions
create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  start_time  time not null default '13:30',
  end_time    time not null default '17:30',
  slot_cap    int  not null default 2,
  created_at  timestamptz default now()
);

-- Rooms (per session)
create table if not exists rooms (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references sessions(id) on delete cascade,
  name        text not null,
  certifier   text not null default '',
  sort_order  int  not null default 0
);

-- Bookings
create table if not exists bookings (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid references sessions(id) on delete cascade,
  booker_name   text not null,
  phone         text not null default '',
  email         text not null default '',
  slot_time     time not null,
  arrived       boolean not null default false,
  done          boolean not null default false,
  cancelled     boolean not null default false,
  room_id       uuid references rooms(id) on delete set null,
  is_walkin     boolean not null default false,
  created_at    timestamptz default now()
);

-- Persons (members of a booking group)
create table if not exists persons (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid references bookings(id) on delete cascade,
  name        text not null,
  cert        text not null default 'LPA'
);

-- PINs table (so you can change PINs without redeploying)
create table if not exists pins (
  role        text primary key,
  pin_hash    text not null
);

insert into pins (role, pin_hash) values
  ('facilitator', 'admin1234'),
  ('certifier',   'doc1234')
on conflict (role) do nothing;

-- =============================================
-- Row Level Security — allow public read/write
-- (fine for an internal-use tool behind a PIN)
-- =============================================

alter table sessions enable row level security;
alter table rooms    enable row level security;
alter table bookings enable row level security;
alter table persons  enable row level security;
alter table pins     enable row level security;

-- Sessions: anyone can read; anyone can insert/update (facilitator controls this via PIN in app)
create policy "sessions_select" on sessions for select using (true);
create policy "sessions_insert" on sessions for insert with check (true);
create policy "sessions_update" on sessions for update using (true);

-- Rooms
create policy "rooms_select" on rooms for select using (true);
create policy "rooms_insert" on rooms for insert with check (true);
create policy "rooms_update" on rooms for update using (true);
create policy "rooms_delete" on rooms for delete using (true);

-- Bookings
create policy "bookings_select" on bookings for select using (true);
create policy "bookings_insert" on bookings for insert with check (true);
create policy "bookings_update" on bookings for update using (true);

-- Persons
create policy "persons_select" on persons for select using (true);
create policy "persons_insert" on persons for insert with check (true);
create policy "persons_update" on persons for update using (true);

-- Pins: anyone can read (app checks PIN client-side)
create policy "pins_select" on pins for select using (true);

-- =============================================
-- Enable Realtime on bookings + persons + rooms
-- =============================================
alter publication supabase_realtime add table bookings;
alter publication supabase_realtime add table persons;
alter publication supabase_realtime add table rooms;
