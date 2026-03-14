create extension if not exists pgcrypto;

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  category text not null default 'Aviso',
  date date not null default current_date,
  featured boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quick_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  alt text not null default '',
  image_path text not null,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notices enable row level security;
alter table public.quick_links enable row level security;
alter table public.gallery_items enable row level security;

drop policy if exists "Public can read published notices" on public.notices;
drop policy if exists "Public can read published quick links" on public.quick_links;
drop policy if exists "Public can read published gallery items" on public.gallery_items;
drop policy if exists "Authenticated users can manage notices" on public.notices;
drop policy if exists "Authenticated users can manage quick links" on public.quick_links;
drop policy if exists "Authenticated users can manage gallery items" on public.gallery_items;

create policy "Public can read published notices"
on public.notices
for select
to anon
using (published = true);

create policy "Public can read published quick links"
on public.quick_links
for select
to anon
using (published = true);

create policy "Public can read published gallery items"
on public.gallery_items
for select
to anon
using (published = true);

create policy "Authenticated users can manage notices"
on public.notices
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage quick links"
on public.quick_links
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage gallery items"
on public.gallery_items
for all
to authenticated
using (true)
with check (true);
