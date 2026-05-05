-- NurseAI upload packs table (production-ready persistence)

create table if not exists public.upload_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  source_name text not null,
  topic text not null check (topic in ('anatomy', 'pharm', 'medsurg', 'nutrition', 'psych')),
  summary jsonb not null default '[]'::jsonb,
  quiz jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_upload_packs_user_created_at
  on public.upload_packs (user_id, created_at desc);

create index if not exists idx_upload_packs_session_created_at
  on public.upload_packs (session_id, created_at desc);

alter table public.upload_packs enable row level security;

drop policy if exists "Users can manage own upload packs" on public.upload_packs;
create policy "Users can manage own upload packs"
on public.upload_packs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
