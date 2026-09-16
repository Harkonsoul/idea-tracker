# Idea Tracker

A focused slice of an internal Idea Tracker: submit ideas, browse them with a status filter.
Backend is ASP.NET Core 8 + EF Core; frontend is React + TypeScript (Vite).

See [SOLUTION.md](./SOLUTION.md) for architecture, design choices, and the Azure deployment path.

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 20+](https://nodejs.org/) and npm

No local SQL Server install is required — see **Database** below.

## Quick start (both apps at once)

```bash
npm install                 # installs the root dev-orchestration tooling only
npm run install:web         # installs the frontend's own dependencies
npm run dev                 # runs the API on :5209 and the SPA on :5173 together
```

Then open **http://localhost:5173**.

To run them separately instead:

```bash
# Terminal 1 — API
dotnet run --project backend/src/IdeaTracker.Api

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

## Configuration (environment variables)

The API reads its database configuration from these variables (or the equivalent
`backend/src/IdeaTracker.Api/appsettings.json` keys, which default to a local Sqlite file so
`dotnet run` works with zero setup):

| Variable                          | Purpose                                              | Local default                |
|------------------------------------|-------------------------------------------------------|-------------------------------|
| `Database__Provider`              | `Sqlite` or `SqlServer`                                | `Sqlite`                      |
| `Database__ConnectionString`      | Connection string for the selected provider            | `Data Source=ideatracker.db`  |
| `ConnectionStrings__DefaultConnection` | Alternative to the above (standard ASP.NET Core convention, used if set) | — |

To run against a real SQL Server instead of the local Sqlite file:

```bash
export Database__Provider=SqlServer
export Database__ConnectionString="Server=localhost;Database=IdeaTracker;Trusted_Connection=True;TrustServerCertificate=True"
# then apply backend/sql/schema.sql to that database first, e.g.:
sqlcmd -S localhost -d IdeaTracker -i backend/sql/schema.sql
dotnet run --project backend/src/IdeaTracker.Api
```

(On Windows PowerShell, use `$env:Database__Provider = "SqlServer"` etc. instead of `export`.)

The frontend reads the API's base URL from `VITE_API_BASE_URL` (see `frontend/.env.example`);
it defaults to `http://localhost:5209` so no `.env` file is needed for local dev.

## CI

A minimal GitHub Actions workflow (`.github/workflows/ci.yml`) runs the backend xUnit tests,
frontend Vitest suite, linting, and a production build on every push/PR to `main`.

## Running tests

```bash
npm run test:api    # 3 xUnit tests over the service/repository layer (in-memory Sqlite)
npm run test:web    # 5 Vitest tests over the API client and the idea form
```

## Demo workbench layout

The SPA is a three-column workbench, themed in SYSPRO-style dark neon:

- **Left — Dev Console**: every user action (load, filter, create, edit, delete) appears as a live
  trace with the HTTP request, the code path it travels (component → API client → controller →
  service → repository → EF Core), a plain-English explanation, and success/error with timing.
- **Middle — the app**: browse ideas with the status filter, submit, edit, delete.
- **Right — Database panel**: the raw `Ideas` table rows, the *actual* SQL EF Core just executed
  (captured via a `DbCommandInterceptor` and served from `/api/debug/sql-trace`), and production
  security/hardening notes served from `/api/debug/security-notes`.

The `/api/debug/*` endpoints (`raw-table`, `sql-trace`, `security-notes`) are demo-only and should
be removed or gated behind Development before any production deployment.

## API reference

Swagger UI is available at `http://localhost:5209/swagger` when running in Development.

| Method | Route                          | Notes                                   |
|--------|----------------------------------|------------------------------------------|
| GET    | `/api/ideas?status=&page=&pageSize=` | `status` optional; pagination optional  |
| GET    | `/api/ideas/{id}`               |                                            |
| POST   | `/api/ideas`                    | Body: `{ title, description, tags }`     |
| PUT    | `/api/ideas/{id}`                | Body adds `status` (optional endpoint)   |
| DELETE | `/api/ideas/{id}`                | Optional endpoint                        |
| GET    | `/health`                       | Basic liveness check                     |

## Project layout

```
backend/
  src/IdeaTracker.Api/     API project (controllers, services, repositories, EF Core)
  tests/IdeaTracker.Tests/ xUnit tests
  sql/schema.sql           SQL Server / Azure SQL schema script
frontend/
  src/                     React + TypeScript SPA
```
