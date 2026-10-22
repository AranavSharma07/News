create extension if not exists pgcrypto;
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('Jobs','Results','Admit Cards','Answer Keys','Admissions','Notifications')),
  organization text,
  summary text,
  official_url text unique,
  article_url text,
  official_verified boolean not null default false,
  source_url text,
  source_name text,
  published_at timestamptz,
  deadline_at timestamptz,
  status text not null default 'pending' check (status in ('pending','published','rejected','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe for existing installations: add review fields and preserve existing records.
alter table public.notices add column if not exists article_url text;
alter table public.notices add column if not exists official_verified boolean not null default false;
alter table public.notices alter column official_url drop not null;
-- Move legacy FreeJobAlert links out of official_url and back into the review queue.
-- This prevents third-party articles from being presented as verified official destinations.
update public.notices
set article_url = coalesce(article_url, official_url),
    official_url = null,
    official_verified = false,
    status = 'pending',
    updated_at = now()
where source_name ilike '%freejobalert%'
  and official_url ilike '%freejobalert.com%';
create unique index if not exists notices_article_url_unique on public.notices(article_url) where article_url is not null;
create index if not exists notices_status_category_idx on public.notices(status, category);
create index if not exists notices_published_idx on public.notices(published_at desc);

-- Existing already-published rows are not automatically reclassified. Review their links.
-- Ingestion writes only pending records and never marks links as verified.
alter table public.notices enable row level security;
-- No public policies: reads and moderation are served through server API routes.
