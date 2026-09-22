# AI Vehicle Search Engine

A small Node.js and TypeScript backend for searching a used-vehicle catalogue with natural-language queries. The LLM converts the query into structured filters; the backend validates those filters and builds all SQL itself.

## Problem Statement

Users should be able to ask for vehicles in plain language, for example:

- `Show SUVs under 15 lakh`
- `Diesel automatic cars below 80000 km`
- `Automatic sedans in Bangalore`
- `7 seater cars under 18 lakh`

## Features

- Natural-language vehicle search with an LLM
- Runtime validation of requests and LLM output with Zod
- PostgreSQL connection pooling and parameterized SQL
- Safe pagination and allowlisted sorting
- Direct catalogue list and vehicle-by-id endpoints
- 100 realistic sample vehicles in `database/seed.sql`
- React (Vite) frontend with Tailwind CDN — run separately in development
- Local search-parser fallback when Gemini is unavailable
- Focused API and repository tests

## Tech Stack and Architecture

Node.js, TypeScript, Express, PostgreSQL, Gemini API, Zod, Vitest, React, and Vite.

`Route -> Controller -> Service -> Repository -> PostgreSQL`

LLM parsing is kept in its own service and never has access to database query construction.

Backend and frontend are **separate npm packages**. Run them in two terminals during development.

## Setup

Prerequisites: Node.js 20+ and PostgreSQL 14+. A Gemini API key enables the hosted natural-language parser, but is optional because a local parser is included.

```bash
# Backend (repo root)
npm install
copy .env.example .env

# Frontend
cd frontend
npm install
cd ..
```

Create the database and table manually in pgAdmin4. Use [DATABASE_SETUP.md](DATABASE_SETUP.md) for the exact column types, constraints, and indexes.

```bash
createdb vehicle_search
```

The application never creates or migrates tables. After creating the table, add the 100 sample rows with `npm run seed:existing-table`, or insert your own rows in pgAdmin4.

### Run separately (recommended for local work)

| App | Port | URL |
| --- | --- | --- |
| Frontend (React) | **3000** | http://localhost:3000 |
| Backend (API) | **5000** | http://localhost:5000 |

**Terminal 1 — backend (port 5000):**

```bash
npm run dev
```

**Terminal 2 — frontend (port 3000):**

```bash
cd frontend
npm start
```

Open `http://localhost:3000`. Vite proxies `/api` requests to the backend on port 5000.

### Production (one process)

Render / production still builds the React app and lets Express serve `frontend/dist`:

```bash
npm run build
npm start
```

Then open `http://localhost:5000`.
## Environment Variables

| Variable | Description |
| --- | --- |
| `PORT` | HTTP port, defaults to `5000` |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port |
| `DB_NAME` | PostgreSQL database name |
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_SSL` | Set to `true` for cloud PostgreSQL such as Supabase |
| `DATABASE_URL` | Optional PostgreSQL connection string fallback |
| `GEMINI_API_KEY` | Gemini API key |
| `GEMINI_MODEL` | Gemini model name, defaults to `gemini-3.6-flash` |

## API

### `POST /api/vehicles/search`

Request:

```json
{
  "query": "diesel automatic SUVs under 15 lakh in Bangalore",
  "page": 1,
  "limit": 10,
  "sortBy": "price",
  "sortOrder": "asc"
}
```

Response shape:

```json
{
  "vehicles": [],
  "total": 0,
  "filters": {
    "bodyType": "suv",
    "fuelType": "diesel",
    "transmission": "automatic",
    "maxPrice": 1500000,
    "city": "Bangalore"
  },
  "page": 1,
  "limit": 10,
  "totalPages": 0
}
```

Prices are stored in INR. Supported filter values are defined in `backend/src/types/vehicle.ts`. Invalid or unclear queries return `400`; unavailable or malformed LLM responses return `502` or `503`.

When Gemini is unavailable or has no credits, the backend automatically uses a small local parser for common filters. This keeps the assignment demo usable for free; Gemini is preferred when available.

### `GET /api/vehicles`

Returns all vehicles with pagination. Query parameters: `page`, `limit`, `sortBy`, and `sortOrder`.

### `GET /api/vehicles/:id`

Returns one vehicle or `404` when it does not exist.

## Testing

```bash
npm test
npm run build
```

## Seeding

The seed runner executes `database/seed.sql` against the configured PostgreSQL database. It truncates the existing `vehicles` rows and inserts exactly 100 records; run it only when replacing the current catalogue is acceptable:

```bash
npm run seed:existing-table
```

Tests cover search responses, invalid requests, vehicle lookup, LLM failure handling, pagination, and parameterized filter SQL. Database integration tests can be added with a dedicated test PostgreSQL database.

## Security Considerations

The LLM never generates SQL. It returns JSON filters that are validated against strict TypeScript/Zod structures. SQL values use PostgreSQL parameters, and sort columns are selected from a fixed allowlist. Secrets are read from environment variables and are not returned in errors.

## Limitations and Future Improvements

The seed data is synthetic, city and make matching are exact, and the API currently has no authentication or rate limiting. A production version would add authentication, request limits, observability, a managed secrets solution, richer catalogue data, and a fallback parser for common query patterns when the LLM is unavailable.