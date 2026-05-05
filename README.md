# NurseAI Web

NurseAI is an NCLEX-focused study chatbot built with React, TypeScript, OpenAI, and Supabase.

## Features Implemented

- Streaming AI chat (`Tutor` and `Topic Explainer` modes)
- Interactive NCLEX Drill mode (MCQ, check answer, next question, score chip)
- PDF/TXT upload -> extracted text -> structured summary + 5-question quiz pack
- Save upload packs and view them on Dashboard
- Supabase-backed chat sessions/messages and persisted drill/upload data

## Tech Stack

- Frontend: React + Vite + TypeScript + Zustand
- Backend routes: Vercel-style API routes under `api/`
- AI: OpenAI Chat Completions API
- Embeddings/RAG: OpenAI Embeddings + Supabase pgvector
- Database/Auth: Supabase PostgreSQL + Supabase Auth

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set:

- `OPENAI_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `KNOWLEDGE_INGEST_TOKEN` (optional, recommended)
- `VITE_ENABLE_AUTH` (optional for local)

3. Apply SQL migrations in Supabase SQL editor:

- `supabase/sql/001_init_schema.sql`
- `supabase/sql/002_upload_packs.sql`
- `supabase/sql/003_knowledge_base.sql`

4. Run locally:

```bash
npm run dev
```

## Auth Configuration (Signup/Login)

NurseAI uses Supabase Auth for login and signup.

1. In `.env`, set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ENABLE_AUTH=true`
2. In Supabase Dashboard -> Authentication -> Providers:
   - Enable `Email` provider for email/password signup and login
   - (Optional) enable `Google` provider
3. In Supabase Dashboard -> Authentication -> URL Configuration:
   - Add your local URL (for example `http://localhost:5173`) as Site URL / redirect URL
4. Keep SQL trigger from `supabase/sql/001_init_schema.sql` applied so new auth users are synced to `public.users`.

## Build and Quality

```bash
npm run lint
npm run build
```

## API Routes

- `POST /api/chat` - chat/structured drill/upload generation
- `POST /api/upload` - PDF/TXT extraction
- `POST /api/knowledge/ingest` - ingest trusted source PDF/TXT into knowledge base
- `POST /api/knowledge-ingest` - legacy alias kept for compatibility

## Trusted Knowledge Ingestion

Use `POST /api/knowledge/ingest` to load authoritative nursing references.

Required JSON fields:
- `sourceName`
- `authority`
- `fileName`
- `mimeType`
- `base64Data`

Optional:
- `sourceUrl`
- `topic` (`anatomy | pharm | medsurg | nutrition | psych`)
- `publishedAt`
- `trustTier` (1-5)

If `KNOWLEDGE_INGEST_TOKEN` is set, include request header:
- `x-ingest-token: <your token>`

## Notes

- Keep all API keys server-side only.
- Uploaded files are processed in memory and not permanently stored by the app.
- Chat grounding uses retrieved knowledge chunks when available and instructs model to cite sources.

## Vercel Deployment Checklist

1. Project settings:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
2. Add Environment Variables in Vercel (Production + Preview as needed):
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ENABLE_AUTH=true`
   - `VITE_ENABLE_MOCK_AUTH=false`
   - `KNOWLEDGE_INGEST_TOKEN` (recommended)
3. In Supabase Auth URL settings:
   - Add your Vercel domain to Site URL.
   - Add redirect URLs for auth callback/sign-in return.
4. If using Google OAuth, add the same Vercel redirect URL in Google Cloud OAuth settings.
5. Re-deploy after any env var change (Vite reads client env vars at build time).
