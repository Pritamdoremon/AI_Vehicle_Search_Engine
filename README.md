# AI Vehicle Search Engine (Driveloop)

A full-stack used-vehicle search app. Users ask in plain English; the backend turns that into structured filters, queries PostgreSQL safely, ranks results, and optionally asks Gemini to explain the top matches.

## Problem Statement

Users should be able to say things like:

- `Show SUVs under 15 lakh`
- `Diesel automatic cars below 80000 km`
- `Automatic sedans in Bangalore`
- `I need a family car under ₹15 lakh, automatic, good mileage`

…and get ranked catalogue results with match scores, reasons, price context, and a short AI advisor summary.

## Features

### Core search
- Natural-language search via Gemini (with a local regex parser fallback)
- Zod-validated filters → parameterized PostgreSQL SQL (LLM never writes SQL)
- Pagination and allowlisted sorting
- Follow-up search: merge new filters onto previous ones (e.g. “Only automatic”)
- Filter chips on the UI to remove individual constraints

### Result enrichment
- **Match score** — weighted score from active filters (budget, body type, km, transmission, seats, city)
- **Why this car** — simple rule-based reasons from filters + vehicle fields (no LLM)
- **Price insight** — vs average price of similar vehicles (same body type + fuel)
- Vehicle photos (`image_url`) with body-type placeholders when missing

### AI Vehicle Advisor
- After search, top 3–5 ranked vehicles are sent to Gemini **once**
- Gemini only explains already-ranked results; it does not query the database
- If Gemini fails, normal search results still work
- Optional `ai_advisor_history` rows for the logged-in user

### Auth & personal garage
- JWT register / login (register then login; no auto-login after register)
- Guests see a fixed landing page; the full dashboard unlocks after login
- Favourites, search history, saved searches, saved comparisons
- Shareable comparison links (`/?ids=1,2,3`)

### Compare & finance
- Compare up to 3 vehicles side by side
- EMI calculator on vehicle details / compare
- Copy share link for a comparison

## Tech Stack

| Layer | Stack |
| --- | --- |
| Backend | Node.js, TypeScript, Express, Zod, JWT, bcrypt, `pg` |
| AI | Gemini API (`GEMINI_API_KEY`) + local filter fallback |
| Database | PostgreSQL |
| Frontend | React (Vite), Tailwind CDN |
| Tests | Vitest + Supertest |

### Architecture

```
Route → Controller → Service → Repository → PostgreSQL
                ↘ Gemini (filter parse / advisor only)
```

- **Database** owns vehicle facts  
- **Backend** owns search, filtering, match score, ranking  
- **Gemini** explains ranked results or parses NL → filters  
- **React** displays results and advisor text  

## Project layout

```
backend/src/          Express API, services, repositories
backend/scripts/      Seed + migration helpers
frontend/src/         React app (App.jsx, VehicleCard, EMI, …)
sql/                  pgAdmin-friendly CREATE TABLE scripts
database/seed.sql     100 sample vehicles
```

## Setup

**Prerequisites:** Node.js 20+, PostgreSQL 14+.

```bash
# Backend (repo root)
npm install
copy .env.example .env

# Frontend
cd frontend
npm install
cd ..
```

### Database

1. Create a database (example: `vehicle_search` or the name in your `.env`).
2. Run SQL from:
   - [`sql/pgadmin4-vehicles.sql`](sql/pgadmin4-vehicles.sql) — vehicles table
   - [`sql/pgadmin4-user-tables.sql`](sql/pgadmin4-user-tables.sql) — users, favourites, history, saved searches/comparisons, AI advisor history
3. Optional: [`DATABASE_SETUP.md`](DATABASE_SETUP.md) for detailed column notes.
4. Seed sample vehicles:

```bash
npm run seed:existing-table
```

Optional photo / saved-search migration helper:

```bash
npx tsx backend/scripts/migratePhotosAndSavedSearches.ts
```

### Environment variables

| Variable | Description |
| --- | --- |
| `PORT` | API port (default `5000`) |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | PostgreSQL |
| `DB_SSL` | `true` for cloud Postgres (e.g. Supabase) |
| `DATABASE_URL` | Optional connection-string fallback |
| `GEMINI_API_KEY` | Gemini key (optional; local parser used if missing) |
| `GEMINI_MODEL` | Default `gemini-3.6-flash` |
| `JWT_SECRET` | **Required** for auth, favourites, history, advisor history |

## Run locally

| App | Port | URL |
| --- | --- | --- |
| Frontend | **3000** | http://localhost:3000 |
| Backend | **5000** | http://localhost:5000 |

**Terminal 1 — API:**

```bash
npm run dev
```

**Terminal 2 — React:**

```bash
cd frontend
npm start
```

Vite proxies `/api` to port `5000`.

### Production (one process)

```bash
npm run build
npm start
```

Express serves `frontend/dist` and the API on `http://localhost:5000`.

## Main APIs

### Auth
- `POST /api/auth/register` — create account (then login)
- `POST /api/auth/login` — returns JWT + user

### Vehicles
- `POST /api/vehicles/search` — NL search  
  Body may include `previousFilters` for follow-up merges.  
  Vehicles may include `matchScore`, `similarAveragePrice`, `priceDelta`.
- `GET /api/vehicles` — catalogue list (pagination / sort)
- `GET /api/vehicles/:id` — one vehicle (+ price insight fields)

### AI Vehicle Advisor
- `POST /api/vehicle-advisor` (JWT)  
  Body: `{ query?, filters, vehicles }` (max 5 vehicles)  
  Response: `{ advice }` or `{ advice: null, error }`

### User (JWT)
- Favourites, search history, saved searches, saved comparisons under `/api/user/...`

## Example search flow

1. User (logged in) searches: `SUV under ₹15 lakh in Bangalore`
2. Gemini / local parser → filters `{ bodyType, maxPrice, city }`
3. PostgreSQL returns matching vehicles
4. Backend attaches match scores and similar-price averages
5. UI shows cards (Why this car, price insight) + chips
6. Frontend calls `/api/vehicle-advisor` with top 3–5 cars
7. Gemini returns a short explanation for the dashboard panel

Follow-up: `Only automatic` → merge `{ transmission: "automatic" }` with previous filters.

## Testing

```bash
npm test
npm run build
```

Tests cover search responses, filter merge / match enrichment, invalid requests, vehicle lookup, LLM failure mapping, and parameterized SQL.

## Security

- LLM never generates SQL; filters are Zod-validated
- Query values are parameterized; sort columns are allowlisted
- Gemini API key stays on the backend (never sent to React)
- JWT protects user data and the advisor endpoint
- Advisor/history failures do not break vehicle search

## Limitations

- Seed data is synthetic; city/make matching is exact
- Advisor quality depends on Gemini availability/credits
- No rate limiting or advanced observability yet

## License

Private student / portfolio project.
