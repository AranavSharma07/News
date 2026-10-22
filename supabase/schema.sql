create extension if not exists pgcrypto;
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('Jobs','Results','Admit Cards','Answer Keys','Admissions','Notifications')),
  organization text,
  summary text,
  official_url text not null unique,
  source_url text,
  source_name text,
  published_at timestamptz,
  deadline_at timestamptz,
  status text not null default 'pending' check (status in ('pending','published','rejected','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notices_status_category_idx on public.notices(status, category);
create index if not exists notices_published_idx on public.notices(published_at desc);
-- Service-role key is server-only. Do not expose it in NEXT_PUBLIC_* variables.
alter table public.notices enable row level security;
-- No public policies: public reads are served through the server API using the service role.
