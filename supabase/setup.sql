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

create table if not exists public.admin_allowlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

update public.admin_allowlist
set email = lower(trim(email))
where email <> lower(trim(email));

with ranked_allowlist as (
  select
    id,
    row_number() over (
      partition by lower(trim(email))
      order by updated_at desc, created_at desc, id desc
    ) as duplicate_rank
  from public.admin_allowlist
)
delete from public.admin_allowlist
where id in (
  select id
  from ranked_allowlist
  where duplicate_rank > 1
);

create unique index if not exists admin_allowlist_email_key
  on public.admin_allowlist (lower(email));

create or replace function public.current_auth_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_panel_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_allowlist
    where lower(email) = public.current_auth_email()
      and active = true
      and role = 'owner'
  );
$$;

alter table public.notices enable row level security;
alter table public.quick_links enable row level security;
alter table public.gallery_items enable row level security;
alter table public.admin_allowlist enable row level security;

drop policy if exists "Public can read published notices" on public.notices;
drop policy if exists "Public can read published quick links" on public.quick_links;
drop policy if exists "Public can read published gallery items" on public.gallery_items;
drop policy if exists "Authenticated users can manage notices" on public.notices;
drop policy if exists "Authenticated users can manage quick links" on public.quick_links;
drop policy if exists "Authenticated users can manage gallery items" on public.gallery_items;
drop policy if exists "Users can read their own panel access" on public.admin_allowlist;
drop policy if exists "Owners can read all panel access" on public.admin_allowlist;
drop policy if exists "Owners can manage panel access" on public.admin_allowlist;

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

create policy "Users can read their own panel access"
on public.admin_allowlist
for select
to authenticated
using (lower(email) = public.current_auth_email());

create policy "Owners can read all panel access"
on public.admin_allowlist
for select
to authenticated
using (public.is_panel_owner());

create policy "Owners can manage panel access"
on public.admin_allowlist
for all
to authenticated
using (public.is_panel_owner())
with check (public.is_panel_owner());

insert into storage.buckets (id, name, public)
values ('portal-media', 'portal-media', true)
on conflict (id)
do update set
  public = excluded.public;

drop policy if exists "Authenticated users can manage portal media" on storage.objects;
create policy "Authenticated users can manage portal media"
on storage.objects
for all
to authenticated
using (bucket_id = 'portal-media')
with check (bucket_id = 'portal-media');

insert into public.admin_allowlist (email, role, active)
values ('chief@gmail.com', 'owner', true)
on conflict (lower(email))
do update set
  role = excluded.role,
  active = excluded.active,
  updated_at = now();
