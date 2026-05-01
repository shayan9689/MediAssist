-- NurseAI base schema
-- Paste this full script in Supabase SQL Editor and run once.

create extension if not exists "pgcrypto";

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.users.full_name);

  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null default 'New session',
  topic text not null check (topic in ('anatomy', 'pharm', 'medsurg', 'nutrition', 'psych')),
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  topic text not null check (topic in ('anatomy', 'pharm', 'medsurg', 'nutrition', 'psych')),
  score int not null check (score >= 0),
  total int not null check (total > 0),
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.drug_cache (
  id uuid primary key default gen_random_uuid(),
  drug_name text not null unique,
  drug_class text,
  mechanism text,
  side_effects text[] not null default '{}',
  nursing_notes text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_chat_sessions_user_created_at
  on public.chat_sessions (user_id, created_at desc);

create index if not exists idx_messages_session_created_at
  on public.messages (session_id, created_at asc);

create index if not exists idx_quiz_attempts_user_created_at
  on public.quiz_attempts (user_id, created_at desc);

create index if not exists idx_drug_cache_drug_name
  on public.drug_cache (drug_name);

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.users enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.messages enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.drug_cache enable row level security;

drop policy if exists "Users can select own profile" on public.users;
create policy "Users can select own profile"
on public.users
for select
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
on public.users
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
on public.users
for insert
with check (auth.uid() = id);

drop policy if exists "Users can manage own chat sessions" on public.chat_sessions;
create policy "Users can manage own chat sessions"
on public.chat_sessions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own messages" on public.messages;
create policy "Users can manage own messages"
on public.messages
for all
using (
  exists (
    select 1
    from public.chat_sessions cs
    where cs.id = messages.session_id and cs.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.chat_sessions cs
    where cs.id = messages.session_id and cs.user_id = auth.uid()
  )
);

drop policy if exists "Users can manage own quiz attempts" on public.quiz_attempts;
create policy "Users can manage own quiz attempts"
on public.quiz_attempts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Authenticated users can read drug cache" on public.drug_cache;
create policy "Authenticated users can read drug cache"
on public.drug_cache
for select
using (auth.role() = 'authenticated');

drop policy if exists "Service role can manage drug cache" on public.drug_cache;
create policy "Service role can manage drug cache"
on public.drug_cache
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
