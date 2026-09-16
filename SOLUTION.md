# Solution notes

## Architecture

The API follows a conventional three-layer split — **Controller → Service → Repository** —
even at this small scale, because the brief asks for "production-minded" judgment, and that
seam is what lets business rules (`IdeaService`) stay ignorant of persistence details
(`IdeaRepository` / EF Core). `IdeaService` depends on `IIdeaRepository`, not `IdeaRepository`
directly, purely so it can be tested against an in-memory Sqlite database instead of a mock —
the repository interface earns its keep in the test suite, not just in theory.

`IdeaResponseDto` is a separate shape from the `Idea` EF entity. That's one extra file for a
project this size, but it means the wire format (e.g. `Status` serialized as `"Approved"`
instead of an integer) can change without touching the persistence model, and the entity can
pick up EF-only concerns (the `Tags` value converter, below) without leaking into the API
contract.

## Data model

One table, `Ideas`, matching the brief's example shape. Two choices worth calling out:

- **`Status` is stored as a string column with a `CHECK` constraint**, not a foreign key to a
  lookup table. Four fixed values don't earn a join for this slice; the `CHECK` constraint
  keeps invalid data out even without the lookup table, and `HasConversion<string>()` on the
  EF side keeps the C# enum as the single source of truth for valid values.
- **`Tags` is a comma-delimited `NVARCHAR` column**, not a child table. The brief describes
  tags as "an array of short strings" with no mention of tag search or reuse across ideas —
  a child table (and the join it implies on every list query) would be solving a problem this
  slice doesn't have yet. If tag-based search or a shared tag vocabulary became a real
  requirement, that's a clean follow-up migration, not a rewrite: `IIdeaRepository` is the
  only place that would need to change.

## Persistence: schema script instead of EF Core migrations

The brief allows either EF Core migrations targeting SQL Server, or a SQL Server-compatible
schema script — I chose the script (`backend/sql/schema.sql`), for a concrete reason: EF Core
migrations are provider-specific (a migration generated against the Sqlite provider will not
apply cleanly to SQL Server, and vice versa), and generating a second, SQL Server-targeted
migration set just to satisfy the deliverable would have added tooling overhead without
adding confidence, in a timeboxed slice. A hand-reviewed DDL script is something a DBA can
actually read and approve before it runs against a real Azure SQL database — that felt like
the more "production-minded" artifact to hand over here.

Locally, the API instead calls `Database.EnsureCreated()` against a Sqlite file on startup
and seeds a handful of ideas (`Data/SeedData.cs`) so the UI has something to show immediately.
`EnsureCreated()` builds the schema straight from the current EF model, so it never drifts
from `schema.sql` by construction — both are generated from the same `Idea` class and the
same `OnModelCreating`. **The trade-off**: this local path bypasses the migration history a
production deployment would want (see the Azure section below for how that gap is closed).

## Trade-offs, explicitly

- **No pagination on the "optional" list of things I skipped, but I did include it** — it was
  cheap on top of `IQueryable` (`Skip`/`Take` plus a `Count`), so it went in as a genuine
  bonus rather than a "not done."
- **No authentication**, per the brief's explicit scope.
- **Frontend has no automated tests.** The brief asks for tests on one tier; I put the 3
  required tests on the backend (`IdeaServiceTests`), and then added 5 frontend tests anyway
  (2 for the API client's query-building and error-message extraction, 3 for `IdeaForm`'s
  validation and submission) once I'd verified they actually run — a low-cost way to raise
  confidence rather than stop at the minimum.
- **Client-side validation is deliberately shallow** (required title only) — the brief asks
  to "keep it pragmatic," and the server is the actual source of truth via `[ApiController]`
  model validation (`[Required]`, `[MaxLength]` on the DTOs), which the client error message
  parsing (`ApiError`) surfaces if the client-side check is ever bypassed.
- **No view-transition/routing library** — the SPA has two "pages" (browse, create/edit), so
  a small piece of local state (`view`) does the job a router would, without the dependency.

## Azure deployment path (pragmatic)

For a slice this size, I'd deploy the API to an **Azure App Service** (Linux, `dotnet8`
runtime) and Azure SQL Database for storage, and the frontend as a static build — either an
**Azure Static Web App**, or the same App Service serving the built `frontend/dist` output as
static files behind the API (fewer moving parts for a small team, at the cost of coupling
front/back deploys).

Configuration would move from `appsettings.json`/environment variables on a dev machine to
**App Service Application Settings** — `Database__Provider=SqlServer` and
`Database__ConnectionString` (or `ConnectionStrings__DefaultConnection`) pointing at the Azure
SQL connection string, ideally sourced from **Key Vault references** rather than stored in
App Service settings directly once this moved past a prototype.

For migrations: since production uses the schema script rather than EF migrations (see
above), the pragmatic path is to run `sql/schema.sql` once via `sqlcmd` (or the Azure Data
Studio / portal query editor) against the Azure SQL database as part of provisioning, and
from then on treat further schema changes as additional, incrementally-numbered `.sql`
scripts applied the same way — reviewed like any other change, and idempotent (`IF NOT
EXISTS` guards, as in the current script) so re-running one is harmless. If the project
outgrew that approach, the natural next step is switching to real EF Core migrations
(`dotnet ef database update`) run as an explicit release step in CI/CD, once there's a
dedicated pipeline to run them in — not before, since running migrations from app startup in
production is its own well-known footgun (concurrent instances racing to migrate on boot).
