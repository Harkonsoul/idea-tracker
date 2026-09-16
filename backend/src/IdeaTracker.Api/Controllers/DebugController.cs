using IdeaTracker.Api.Data;
using IdeaTracker.Api.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IdeaTracker.Api.Controllers;

/// <summary>
/// Demo/inspection-only endpoints backing the frontend's right-hand
/// "Database" panel: the raw table contents and the actual SQL EF Core has
/// recently issued. This is intentionally NOT something you'd ship to a real
/// production API — see <see cref="SecurityNotes"/> for exactly why, which
/// the frontend renders verbatim next to the data it returns.
/// </summary>
[ApiController]
[Route("api/debug")]
public class DebugController : ControllerBase
{
    private readonly IdeaTrackerDbContext _db;
    private readonly SqlTraceInterceptor _sqlTrace;
    private readonly IConfiguration _configuration;

    public DebugController(IdeaTrackerDbContext db, SqlTraceInterceptor sqlTrace, IConfiguration configuration)
    {
        _db = db;
        _sqlTrace = sqlTrace;
        _configuration = configuration;
    }

    /// <summary>Every row currently in the Ideas table, straight off EF Core, no DTO shaping.</summary>
    [HttpGet("raw-table")]
    public async Task<ActionResult> RawTable(CancellationToken ct)
    {
        var rows = await _db.Ideas.AsNoTracking().OrderByDescending(i => i.CreatedAt).ToListAsync(ct);
        var provider = _configuration["Database:Provider"] ?? "Sqlite";
        return Ok(new
        {
            provider,
            table = "dbo.Ideas",
            rowCount = rows.Count,
            rows,
        });
    }

    /// <summary>The last ~20 SQL statements EF Core actually executed against this DbContext.</summary>
    [HttpGet("sql-trace")]
    public ActionResult SqlTrace()
    {
        return Ok(new
        {
            entries = _sqlTrace.RecentEntries,
        });
    }

    /// <summary>Static content describing production-hardening steps this demo intentionally skips.</summary>
    [HttpGet("security-notes")]
    public ActionResult SecurityNotes() => Ok(new
    {
        notes = new[]
        {
            new { title = "No authentication/authorization", detail = "Every endpoint, including /api/debug/*, is open. A real deployment puts this behind Azure AD / an API gateway and never ships raw-table or sql-trace endpoints at all." },
            new { title = "Least-privilege DB login", detail = "Local dev uses a single Sqlite file with full access. Azure SQL should use a dedicated login scoped to only the Ideas table (SELECT/INSERT/UPDATE), not db_owner." },
            new { title = "Parameterized queries only", detail = "EF Core already parameterizes every query you see in the SQL trace panel (values arrive as @p0, @p1, never string-concatenated) — this is what actually prevents SQL injection here." },
            new { title = "Connection string secrecy", detail = "Locally this comes from an env var / appsettings.json. In Azure it should come from Key Vault via a managed identity, never checked into source or App Service settings in plaintext." },
            new { title = "TLS everywhere", detail = "Azure SQL enforces TLS in transit by default; Encrypt=True;TrustServerCertificate=False should be set explicitly once a real cert chain is in place (this demo uses TrustServerCertificate=True for local convenience only)." },
            new { title = "No raw-table/debug endpoints in production", detail = "This whole controller exists to make the demo's right-hand panel honest. It should be deleted or gated behind Development-only routing before anything resembling a production deploy." },
            new { title = "Rate limiting & request size limits", detail = "Nothing here throttles requests or caps payload size — ASP.NET Core's built-in rate limiting middleware and MaxRequestBodySize should be configured before this is internet-facing." },
            new { title = "Auditing", detail = "CreatedAt/UpdatedAt exist, but there's no who — a real system would add CreatedBy/UpdatedBy once auth exists, and consider a lightweight audit/history table for status transitions." },
        }
    });
}
