-- Churra – Gutscheine
-- In Supabase: SQL Editor → New query → diesen ganzen Text einfügen → Run.

create extension if not exists pgcrypto;

create table if not exists vouchers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  code text not null unique,
  token text not null default encode(gen_random_bytes(16), 'hex'),
  amount numeric(10, 2) not null check (amount > 0),
  balance numeric(10, 2) not null check (balance >= 0),
  buyer_name text not null,
  buyer_email text,
  recipient_name text,
  message text,
  expires_at date not null,
  status text not null default 'active' check (status in ('active', 'redeemed', 'cancelled')),
  source text not null default 'online',
  stripe_session_id text unique,
  history jsonb not null default '[]'::jsonb
);
create index if not exists vouchers_created_idx on vouchers (created_at desc);

-- Only the server (service role key) may read or write: RLS on, no public policies.
alter table vouchers enable row level security;
