-- =============================================
-- P2P9JABET — SUPABASE DATABASE SCHEMA
-- Run this entire file in your Supabase SQL Editor
-- =============================================

-- PROFILES TABLE (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  email text unique not null,
  wallet_balance numeric(12,2) default 0.00,
  total_bets integer default 0,
  total_wins integer default 0,
  total_losses integer default 0,
  created_at timestamptz default now()
);

-- FIXTURES TABLE (populated from API-Football)
create table public.fixtures (
  id bigint primary key,
  league_id integer not null,
  league_name text not null,
  home_team text not null,
  away_team text not null,
  home_logo text,
  away_logo text,
  kickoff timestamptz not null,
  status text default 'NS', -- NS=Not Started, FT=Full Time, etc.
  home_goals integer,
  away_goals integer,
  updated_at timestamptz default now()
);

-- BETS TABLE
create table public.bets (
  id uuid default gen_random_uuid() primary key,
  fixture_id bigint references public.fixtures(id),
  user_id uuid references public.profiles(id),
  prediction text not null check (prediction in ('home', 'away', 'draw')),
  stake numeric(10,2) not null check (stake >= 100),
  status text default 'pending' check (status in ('pending', 'matched', 'won', 'lost', 'draw', 'refunded')),
  matched_bet_id uuid references public.bets(id),
  created_at timestamptz default now()
);

-- TRANSACTIONS TABLE
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  type text not null check (type in ('deposit', 'withdrawal', 'bet_placed', 'bet_won', 'bet_refunded', 'fee')),
  amount numeric(10,2) not null,
  reference text unique,
  status text default 'pending' check (status in ('pending', 'success', 'failed')),
  description text,
  created_at timestamptz default now()
);

-- RLS POLICIES
alter table public.profiles enable row level security;
alter table public.bets enable row level security;
alter table public.transactions enable row level security;
alter table public.fixtures enable row level security;

-- Profiles: users can read all, update only own
create policy "Public profiles are viewable" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Bets: users can see all bets (for matching), insert own
create policy "All bets visible" on public.bets for select using (true);
create policy "Users insert own bets" on public.bets for insert with check (auth.uid() = user_id);
create policy "Users update own bets" on public.bets for update using (auth.uid() = user_id);

-- Transactions: users see only own
create policy "Users see own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Users insert own transactions" on public.transactions for insert with check (auth.uid() = user_id);

-- Fixtures: public read
create policy "Fixtures public read" on public.fixtures for select using (true);

-- FUNCTION: Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    split_part(new.email, '@', 1),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
