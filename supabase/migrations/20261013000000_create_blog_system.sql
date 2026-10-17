create extension if not exists "pgcrypto";

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null,
  content jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  cover_image_path text,
  cover_image_url text,
  cover_image_alt text,
  author text not null,
  published_at timestamptz,
  read_time text not null default '5 min',
  category text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_publication_idx
  on public.blog_posts (status, published_at desc);

alter table public.admin_users enable row level security;
alter table public.blog_posts enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create policy "Admins can read their own authorization"
  on public.admin_users for select
  to authenticated
  using (user_id = auth.uid());

create policy "Anyone can read published posts"
  on public.blog_posts for select
  to anon, authenticated
  using (status = 'published' and published_at is not null and published_at <= now());

create policy "Admins can manage blog posts"
  on public.blog_posts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('blog-media', 'blog-media', true)
on conflict (id) do update set public = true;

create policy "Anyone can view blog media"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'blog-media');

create policy "Admins can upload blog media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'blog-media' and public.is_admin());

create policy "Admins can update blog media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'blog-media' and public.is_admin())
  with check (bucket_id = 'blog-media' and public.is_admin());

create policy "Admins can delete blog media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'blog-media' and public.is_admin());

-- After creating the first Auth user, authorize it with:
-- insert into public.admin_users (user_id) values ('AUTH_USER_UUID');
