-- NurseAI trusted knowledge base (RAG foundation)

create extension if not exists vector;

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_url text,
  authority text not null,
  topic text check (topic in ('anatomy', 'pharm', 'medsurg', 'nutrition', 'psych')),
  published_at date,
  trust_tier int not null default 1 check (trust_tier between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  chunk_index int not null,
  topic text check (topic in ('anatomy', 'pharm', 'medsurg', 'nutrition', 'psych')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_knowledge_chunks_doc_chunk
  on public.knowledge_chunks (document_id, chunk_index);

create index if not exists idx_knowledge_chunks_topic
  on public.knowledge_chunks (topic);

create index if not exists idx_knowledge_chunks_embedding
  on public.knowledge_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function public.match_knowledge_chunks(
  query_embedding vector(1536),
  match_count int default 5,
  filter_topic text default null
)
returns table (
  chunk_id uuid,
  document_id uuid,
  source_name text,
  source_url text,
  authority text,
  topic text,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    kc.id as chunk_id,
    kd.id as document_id,
    kd.source_name,
    kd.source_url,
    kd.authority,
    kc.topic,
    kc.content,
    1 - (kc.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks kc
  join public.knowledge_documents kd on kd.id = kc.document_id
  where (filter_topic is null or kc.topic = filter_topic)
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;

alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;

drop policy if exists "Authenticated users can read knowledge documents" on public.knowledge_documents;
create policy "Authenticated users can read knowledge documents"
on public.knowledge_documents
for select
using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can read knowledge chunks" on public.knowledge_chunks;
create policy "Authenticated users can read knowledge chunks"
on public.knowledge_chunks
for select
using (auth.role() = 'authenticated');

drop policy if exists "Service role can manage knowledge documents" on public.knowledge_documents;
create policy "Service role can manage knowledge documents"
on public.knowledge_documents
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage knowledge chunks" on public.knowledge_chunks;
create policy "Service role can manage knowledge chunks"
on public.knowledge_chunks
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
