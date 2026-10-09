-- Churra – Reservierungen
-- In Supabase: SQL Editor → New query → diesen ganzen Text einfügen → Run.

create extension if not exists pgcrypto;

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  date date not null,
  time text not null,
  service text not null check (service in ('lunch', 'dinner')),
  adults int not null check (adults >= 1),
  children int not null default 0 check (children >= 0),
  menu text not null check (menu in ('rodizio', 'buffet')),
  name text not null,
  email text,
  phone text,
  notes text,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'no_show', 'arrived')),
  source text not null default 'online',
  cancel_token text not null default encode(gen_random_bytes(18), 'hex')
);
create index if not exists reservations_date_idx on reservations (date, service);

create table if not exists closures (
  date date primary key,
  reason text
);

create table if not exists settings (
  key text primary key,
  value jsonb not null
);
insert into settings (key, value) values ('capacity', '{"lunch": 60, "dinner": 60}')
on conflict (key) do nothing;

-- Only the server (service role key) may read or write: RLS on, no public policies.
alter table reservations enable row level security;
alter table closures enable row level security;
alter table settings enable row level security;

-- Atomic booking: checks closure and remaining seats under a lock, then inserts.
create or replace function create_reservation(p jsonb, check_capacity boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date := (p->>'date')::date;
  v_service text := p->>'service';
  v_guests int := (p->>'adults')::int + coalesce((p->>'children')::int, 0);
  v_cap int;
  v_used int;
  v_row reservations;
begin
  perform pg_advisory_xact_lock(hashtext(v_date::text || v_service));

  if check_capacity then
    if exists (select 1 from closures where date = v_date) then
      return jsonb_build_object('ok', false, 'error', 'closed');
    end if;
    select coalesce((value->>v_service)::int, 60) into v_cap from settings where key = 'capacity';
    v_cap := coalesce(v_cap, 60);
    select coalesce(sum(adults + children), 0) into v_used
      from reservations
      where date = v_date and service = v_service and status in ('confirmed', 'arrived');
    if v_used + v_guests > v_cap then
      return jsonb_build_object('ok', false, 'error', 'full', 'remaining', greatest(v_cap - v_used, 0));
    end if;
  end if;

  insert into reservations (date, time, service, adults, children, menu, name, email, phone, notes, source)
  values (
    v_date, p->>'time', v_service, (p->>'adults')::int, coalesce((p->>'children')::int, 0),
    p->>'menu', p->>'name', nullif(p->>'email', ''), nullif(p->>'phone', ''), nullif(p->>'notes', ''),
    coalesce(p->>'source', 'online')
  )
  returning * into v_row;

  return jsonb_build_object('ok', true, 'reservation', to_jsonb(v_row));
end;
$$;

revoke all on function create_reservation(jsonb, boolean) from public, anon, authenticated;
