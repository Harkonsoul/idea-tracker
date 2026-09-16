# Idea Tracker

An internal tool for capturing innovation ideas from employees and tracking them through
review (Proposed → InReview → Approved / Rejected).

- **Backend:** ASP.NET Core 8 Web API + EF Core
- **Database:** Sqlite locally (zero setup), designed for SQL Server / Azure SQL in production
- **Frontend:** React 19 + TypeScript (Vite)

See [SOLUTION.md](./SOLUTION.md) for architecture, data-model decisions, trade-offs, and the
Azure deployment path.

---

## Prerequisites

| Tool | Version | Get it |
|------|---------|--------|
| .NET SDK | 8.0+ | https://dotnet.microsoft.com/download/dotnet/8.0 |
| Node.js | 20+ (includes npm) | https://nodejs.org/ |

Verify both are on your PATH:

```bash
dotnet --version    # expect 8.x
node --version      # expect v20+
npm --version
```

No SQL Server installation is needed for local development — the API creates and seeds a
local Sqlite database file automatically on first run.

## Setup

From the repository root:

```bash
# 1. Restore the root dev tooling (runs both apps together)
npm install

# 2. Install the frontend's dependencies
npm run install:web

# 3. Restore + build the backend
dotnet build backend/IdeaTracker.sln
```

## Run locally

```bash
npm run dev
```

This starts both apps together:

- **API** → http://localhost:5209 (Swagger UI at http://localhost:5209/swagger)
- **SPA** → http://localhost:5173 ← open this one

The first API run creates `ideatracker.db` (Sqlite) in the API project folder and seeds four
example ideas so the UI has content immediately.

To run the two apps separately instead:

```bash
# Terminal 1 — API
dotnet run --project backend/src/IdeaTracker.Api

# Terminal 2 — frontend
cd frontend
npm run dev
```

## Configuration (environment variables)

The API reads database settings from environment variables (or `appsettings.json` keys of the
same name, which default to a local Sqlite file so nothing needs configuring for local dev):

| Variable | Purpose | Local default |
|----------|---------|----------------|
| `Database__Provider` | `Sqlite` or `SqlServer` | `Sqlite` |
| `Database__ConnectionString` | Connection string for the selected provider | `Data Source=ideatracker.db` |
| `ConnectionStrings__DefaultConnection` | Standard ASP.NET Core alternative to the above | — |
| `Cors__AllowedOrigins` | Origins the API accepts calls from | `http://localhost:5173` |

The frontend reads the API base URL from `VITE_API_BASE_URL` (see `frontend/.env.example`);
it defaults to `http://localhost:5209`, so no `.env` file is required locally.

### Running against real SQL Server instead of Sqlite

```bash
# PowerShell
$env:Database__Provider = "SqlServer"
$env:Database__ConnectionString = "Server=localhost;Database=IdeaTracker;Trusted_Connection=True;TrustServerCertificate=True"
sqlcmd -S localhost -d IdeaTracker -i backend/sql/schema.sql   # apply the schema first
dotnet run --project backend/src/IdeaTracker.Api
```

On bash/macOS use `export Database__Provider=SqlServer` etc.

## Running tests

```bash
npm run test:api    # backend: 3 xUnit tests over the service/repository layer (in-memory Sqlite)
npm run test:web    # frontend: 5 Vitest tests over the API client and the idea form
```

Lint the frontend:

```bash
cd frontend
npm run lint
```

## CI

A minimal GitHub Actions workflow (`.github/workflows/ci.yml`) runs the backend tests,
frontend tests, linting, and a production build on every push/PR to `main`.

## API reference

Swagger UI: http://localhost:5209/swagger (Development only)

| Method | Route | Notes |
|--------|-------|-------|
| GET | `/api/ideas?status=&page=&pageSize=` | `status` optional (`Proposed`, `InReview`, `Approved`, `Rejected`); pagination optional |
| GET | `/api/ideas/{id}` | |
| POST | `/api/ideas` | Body: `{ title, description, tags }` |
| PUT | `/api/ideas/{id}` | Body adds `status` |
| DELETE | `/api/ideas/{id}` | |
| GET | `/health` | Basic liveness check |

## The UI: three-column workbench

The SPA is a three-column, dark-themed workbench:

- **Left — Dev Console:** every interaction (load, filter, create, edit, delete) is traced
  live with the HTTP request, the code path it travels (component → API client → controller →
  service → repository → EF Core), a plain-English explanation, and its status/duration.
- **Middle — the app:** browse ideas with the status filter, submit, edit, delete.
- **Right — Database panel:** raw `Ideas` table rows, the actual SQL EF Core just executed
  (captured by a `DbCommandInterceptor` and served from `/api/debug/sql-trace`), and notes on
  how the setup would be hardened for a real production deployment.

> The `/api/debug/*` endpoints (`raw-table`, `sql-trace`, `security-notes`) exist to power
> this panel and are demo-only — remove them or gate them behind Development-only routing
> before any production deployment.

## Project layout

```
backend/
  src/IdeaTracker.Api/     API project (controllers, services, repositories, EF Core)
  tests/IdeaTracker.Tests/ xUnit tests
  sql/schema.sql           SQL Server / Azure SQL schema script
frontend/
  src/api/                 Typed API clients (fetch-based)
  src/components/          React components
  src/types/               Shared TypeScript models
```
