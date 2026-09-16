# AI usage

The brief explicitly allows AI tools and asks how they were used. Short version:
**I ran this build the way a tech lead runs a fast junior pair — I set the direction,
defined what "done" means at each step, reviewed every diff, and made the calls.
The AI (Claude, via Cline in my terminal) typed fast.**

## Division of labour

| Me | The AI tool |
|----|-------------|
| Decided what to build at each stage, and in what order | Drafted the code for each stage |
| Set the acceptance bar (must meet *and* exceed the brief, must stay explainable) | Produced first-pass implementations against that bar |
| Reviewed every change before it was kept | Revised on my feedback |
| Owned the verification loop (build, tests, lint, live smoke test, CI) | Ran the commands; I read the results |
| Made the final call on every trade-off documented in SOLUTION.md | Presented the options |

## The direction I gave, phase by phase

### Phase 1 — Scope and scaffold

My opening move was to paste the brief in full and constrain it:

> "Build this as a single repo: ASP.NET Core 8 API + EF Core, React + TypeScript SPA,
> README and SOLUTION.md included. Production-minded, not maximal — I'd rather defend
> a small thing done properly than a big thing done loosely."

That last constraint was deliberate: vetting assignments are graded on judgment, and
judgment is mostly about what you *don't* build. Every "optional" item in the brief was
then a conscious include/exclude call on my side, not an accident of what the tool
happened to generate.

### Phase 2 — The demo workbench (my design)

The three-column workbench was my concept, specified to the tool almost as a product
brief:

> "3-column design, SYSPRO themed, dark with neon accents. Left: a live display of
> everything that happened when you clicked a button, code-wise, with explanation.
> Middle: the application. Right: raw database data on top; below it the SQL that was
> just executed, the security around it, and how it would be hardened when live."

The reasoning behind the design: a reviewer watching a demo shouldn't have to take my
word for how the system works — the UI should *show* the request path, the real SQL,
and the production gap analysis while they watch. One refinement came out of review:
the first pass mocked the SQL strings in the UI; I sent it back with "show the *actual*
SQL" — which is why the backend has a real `DbCommandInterceptor` ring buffer feeding
`/api/debug/sql-trace` instead of canned text.

### Phase 3 — Review against the brief

Once it worked, my next prompt was adversarial, not generative:

> "Review this against every requirement in the brief and tell me what it meets,
> what it exceeds, and what's missing."

That review surfaced the two gaps I then closed myself by directing the fixes: the
git history needed a clean commit, and the optional CI script was worth the ten lines
it cost. When CI then failed on GitHub's Node 20 runner
(`webidl.util.markAsUncloneable is not a function` — my machine runs Node 24, classic
"works on my machine"), the fix I directed was to pin the workflow to Node 22 with a
comment explaining *why*, so the next person doesn't "fix" it back.

## Calls I made (and would defend in a review)

Each of these had a plausible alternative the tool could just as easily have built;
these were my calls after looking at the options:

- **Hand-written `sql/schema.sql` over EF Core migrations** — EF migrations are
  provider-specific (a Sqlite-generated migration won't apply cleanly to SQL Server),
  and a reviewed DDL script is an artifact a DBA can approve before it runs against
  Azure SQL. Cost accepted: no migration history in the local dev loop, where
  `EnsureCreated()` is fine.
- **Tags as a delimited column, not a child table** — the brief scopes tags as "short
  strings" with no tag search, so normalizing them would be solving a problem this
  slice doesn't have. The `IIdeaRepository` seam is where that changes if the
  requirement ever does.
- **Status as a string column with a CHECK constraint** rather than a lookup table —
  four fixed values don't earn a join.
- **Tests against the real repository on in-memory Sqlite** rather than mocks, so the
  EF mapping itself (enum-as-string, tags-as-CSV) is covered — plus a fixed
  `TimeProvider` so timestamp assertions are deterministic.
- **`/api/debug/*` endpoints documented as demo-only** — shipping them wasn't a mistake
  to hide; it's a conscious trade-off for demo visibility, flagged in the README and in
  the security panel itself.

## Verification — the part I never delegated

AI output got the same gates a human PR would get from me:

1. `dotnet build` + `dotnet test` — 3/3 backend tests
2. `npm run build` + `npm run test` + `npm run lint` — 5/5 frontend tests, 0 lint issues
3. Live smoke test — started the API and hit the new debug endpoints with real requests
   to confirm the SQL trace captures genuine EF Core output
4. GitHub Actions on every push — which immediately earned its keep by catching the
   Node version issue above

## If asked about this in an interview

I'd say the same thing I'd say about delegating to any fast junior: the value I add
isn't keystrokes, it's direction, taste, review, and knowing what to verify. The tool
drafted; I decided. And because I reviewed every change, I can walk through any file
in this repo and explain not just what it does, but why it's shaped the way it is.

