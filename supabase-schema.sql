-- ============================================================
-- Market Terminal — Supabase Schema + RLS
-- Run this in the Supabase SQL editor (Dashboard → SQL)
-- ============================================================

-- Watchlist
create table if not exists watchlist (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  ticker       text        not null,
  created_at   timestamptz not null default now(),
  unique(user_id, ticker)
);

alter table watchlist enable row level security;

create policy "select own watchlist"
  on watchlist for select
  using (auth.uid() = user_id);

create policy "insert own watchlist"
  on watchlist for insert
  with check (auth.uid() = user_id);

create policy "delete own watchlist"
  on watchlist for delete
  using (auth.uid() = user_id);


-- Portfolio positions
create table if not exists portfolio (
  id             uuid    primary key default gen_random_uuid(),
  user_id        uuid    not null references auth.users(id) on delete cascade,
  ticker         text    not null,
  shares         numeric not null check (shares > 0),
  avg_buy_price  numeric not null check (avg_buy_price > 0),
  created_at     timestamptz not null default now(),
  unique(user_id, ticker)
);

alter table portfolio enable row level security;

create policy "select own portfolio"
  on portfolio for select
  using (auth.uid() = user_id);

create policy "insert own portfolio"
  on portfolio for insert
  with check (auth.uid() = user_id);

create policy "update own portfolio"
  on portfolio for update
  using (auth.uid() = user_id);

create policy "delete own portfolio"
  on portfolio for delete
  using (auth.uid() = user_id);
