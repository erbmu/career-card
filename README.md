# Career Card Builder

A React + Tailwind interface for creating rich career cards backed by an Express API, Neon PostgreSQL for persistence, and OpenAI for the AI-assisted import flows. Accounts are now required: each user signs up/logs in before creating, viewing, or downloading their own card.

## Tech Stack
- Vite + React + TypeScript + Tailwind UI
- Express API with CORS + static hosting
- Neon PostgreSQL (`pg` driver)
- OpenAI Chat Completions API for resume and portfolio parsing

## Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the example environment file and fill in your credentials:
   ```bash
   cp .env.example .env
   ```
3. Start the API (port 4000 by default):
   ```bash
   npm run server:dev
   ```
4. In a separate terminal, run the Vite dev server:
   ```bash
   npm run dev
   ```
   The client uses `VITE_API_BASE_URL` to talk to the API (defaults to `http://localhost:4000/api`).

## Neon Database Setup
Connect to your Neon project (psql or the dashboard) and run the following statements. They create the auth + session tables along with the `cc_career_cards` table that stores each user’s card.

```sql
-- Enable uuid helpers for edit token generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS cc_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cc_user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES cc_users(id) ON DELETE CASCADE,
  session_token UUID NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cc_career_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES cc_users(id) ON DELETE CASCADE,
  card_data JSONB NOT NULL,
  edit_token UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cc_career_cards_user ON cc_career_cards (user_id);

CREATE INDEX IF NOT EXISTS idx_cc_career_cards_updated_at ON cc_career_cards (updated_at DESC);
```

> Migrating from the older Supabase-based schema? Drop or rename the previous `career_cards` table (or run the appropriate `ALTER TABLE` statements) so that every card row references a user before applying the script above.

The API writes to these tables through the `/api/auth/*` and `/api/cards/*` endpoints and uses the session cookie plus `user_id` to ensure only the logged-in creator can read or modify their card. The `edit_token` column is still generated so that private share links can continue to reference a stable UUID.

## Temporarily Disabled Features
- The AI-powered score/report generator is intentionally hidden from the UI for now. The supporting code remains in the repo so it can be re-enabled later without re-implementing it.

## Environment Variables
All configuration lives in `.env` (use `.env.example` as a guide). These are the variables Render/Neon will need:

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | frontend | Base URL for API calls. Use `http://localhost:4000/api` locally or your Render URL in production. |
| `DATABASE_URL` | server | Full Neon connection string with `sslmode=require`. |
| `OPENAI_API_KEY` | server | Key used by the AI routes for parsing and scoring. |
| `OPENAI_MODEL` | optional | Defaults to `gpt-4o-mini`. Override if you prefer another OpenAI model. |
| `CLIENT_ORIGIN` | server | Comma-separated list of allowed origins, e.g. `http://localhost:5173,https://yourdomain.com`. |
| `PORT` | optional | API port (defaults to `4000`). |

## Render Deployment
1. Build command: `npm install && npm run build && npm run build:server`
2. Start command: `npm start`
3. Set the environment variables from the table above (including `NODE_ENV=production`).
4. Render will run the Express server, which serves the API under `/api/*` and the static Vite build for every other route.

Once deployed, update `VITE_API_BASE_URL` in your production `.env` (or Render environment) to point at `https://<your-render-app>.onrender.com/api` so the client talks to the hosted API.

## API Endpoints (server)
**Auth**
- `POST /api/auth/signup` – register a new user (hashes and stores password)
- `POST /api/auth/login` – verify credentials and set the session cookie
- `POST /api/auth/logout` – destroy the current session
- `GET /api/auth/me` – returns the current user if the session cookie is valid

**Cards** *(all require authentication and only operate on the logged-in user’s record)*
- `POST /api/cards` – creates a card for the current user (ignored if one already exists)
- `PUT /api/cards/:id` – updates the specified card when it belongs to the current user
- `GET /api/cards/me` – fetches the logged-in user’s saved card
- `GET /api/cards/:id` – fetches the card only if it belongs to the current user (private “share” links)

**AI helpers** *(also require authentication)*
- `POST /api/ai/parse-resume` – parses uploaded resume text or images
- `POST /api/ai/parse-resume-experience` – extracts experience and projects from resume text
- `POST /api/ai/parse-portfolio` – pulls portfolio metadata and code samples

Feel free to customize prompts or plug in a different model/provider if you prefer.
