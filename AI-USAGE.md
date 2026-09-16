# AI usage

The brief explicitly allows AI tools, so here is an honest account of how I used them,
what the prompts looked like, and — more importantly — how I steered and verified the
output rather than accepting it blindly.

## Tooling

- **Claude (via the Cline agent in my terminal)** — used for scaffolding, boilerplate,
  and iterative feature work, with me reviewing every diff before it was kept.

## How the work was actually driven

### 1. Initial scaffold

The first prompt was essentially the assignment brief itself, pasted in full, with an
instruction along the lines of:

> "Build this take-home assignment as a single repo: ASP.NET Core 8 API + EF Core,
> React + TypeScript SPA, with a README and SOLUTION.md. Keep it production-minded,
> not maximal."

From there the important part is what I **kept vs. pushed back on**. Examples of
direction/review decisions that were mine, not the tool's defaults:

- **Schema script over EF Core migrations** — the tool can generate either; I chose the
  hand-written `sql/schema.sql` because EF migrations are provider-specific and a
  hand-reviewed DDL script is something a DBA can actually approve before it touches
  Azure SQL. This trade-off (and its cost — losing migration history locally) is
  written up in SOLUTION.md because it's the kind of decision I expect to be asked
  about.
- **Tags as a delimited column, not a child table** — the brief scopes tags as "short
  strings" with no tag search, so I rejected the normalized design the model leaned
  toward initially. The seam (`IIdeaRepository`) is where that changes later if needed.
- **Tests against the real repository on in-memory Sqlite** instead of mocks, so the EF
  mapping (enum-as-string, tags-as-CSV) is actually covered.

### 2. The demo workbench (second iteration)

The follow-up prompts were feature requests, e.g.:

> "Much better styling with a 3-column design, SYSPRO themed with a bit of neon and
> code snippets. Left column: a display that shows everything that happened when you
> clicked a button, code-wise, with explanation. Middle: the application. Right: the
> full database raw data on top, and below it the SQL that was just made plus the
> security around it and how it would be better when live."

The key design decision in that round: instead of letting the tool *hard-code fake SQL
strings* into the UI (its first instinct), I asked for the SQL panel to show the **real
statements** — which is why there's a `DbCommandInterceptor` ring buffer and
`/api/debug/*` endpoints on the backend. That turned a cosmetic request into something
that genuinely demonstrates EF Core internals.

### 3. Review, polish, CI

Later prompts were review-oriented:

> "Review what this is for and that it meets and exceeds all requirements."
> "Fix the lint warnings, add a basic CI workflow, commit it cleanly."

When the CI run failed on GitHub (`webidl.util.markAsUncloneable is not a function`),
the fix came from reading the stack trace: the runner's Node 20 lacks an API that
jsdom/undici need, while my machine runs Node 24 — so the workflow was pinned to
Node 22 with a comment explaining why. Classic "works on my machine," caught precisely
because CI existed.

## How output was verified (not just trusted)

Every AI-produced change went through the same gates a human colleague's PR would:

1. `dotnet build` / `dotnet test` — 3/3 backend tests green
2. `npm run build` / `npm run test` / `npm run lint` — 5/5 frontend tests, 0 lint issues
3. A **live smoke test**: the API was started and the new `/api/debug/*` endpoints were
   called with real requests to confirm the SQL trace actually captures EF Core output
4. GitHub Actions CI on every push — which did its job by catching the Node version bug

## What I'd say in an interview

AI tools here did what they're good at: boilerplate, first drafts, and fast iteration.
The architecture decisions, the trade-offs I chose to accept (and which ones I
rejected), the review of every diff, and the verification loop were mine. I'm happy to
walk through any file in the repo and explain not just what it does, but why it's
shaped the way it is — including the parts I'd do differently with more time.
