# Career Card Builder

A React + Tailwind interface for creating rich career cards backed by an Express API, Neon PostgreSQL for persistence, and OpenAI for the AI-assisted import and scoring flows.

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
Connect to your Neon project (psql or the dashboard) and run the following statements. They create everything the app needs to store and update career cards.

```sql
-- Enable uuid helpers for edit token generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS career_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_data JSONB NOT NULL,
  edit_token UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_career_cards_updated_at ON career_cards (updated_at DESC);
```

The API writes to this table through the `/api/cards` endpoints and uses the `edit_token` to ensure only the creator can update an existing card.

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
- `POST /api/cards` – creates a new card and returns `{ id, editToken }`
- `PUT /api/cards/:id` – updates card data when provided with a valid `editToken`
- `GET /api/cards/:id` – fetches shared card data
- `POST /api/ai/parse-resume` – parses uploaded resume text or images
- `POST /api/ai/parse-resume-experience` – extracts experience and projects from resume text
- `POST /api/ai/parse-portfolio` – pulls portfolio metadata and code samples

Feel free to customize prompts or plug in a different model/provider if you prefer.
