using System.Collections.Concurrent;
using System.Text;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace IdeaTracker.Api.Diagnostics;

/// <summary>
/// One captured SQL statement, exposed to the frontend's "SQL / Database"
/// panel so the demo can show the *real* query EF Core just issued — not a
/// hand-written approximation.
/// </summary>
public record SqlTraceEntry(DateTimeOffset TimestampUtc, string CommandText, string Parameters);

/// <summary>
/// EF Core command interceptor that keeps a small in-memory ring buffer of
/// the most recent SQL statements executed against <c>IdeaTrackerDbContext</c>.
/// This is a diagnostics/demo aid only (see <c>DebugController</c>) — it is
/// never wired into the write path and has no effect on query behaviour.
/// Deliberately singleton + in-memory: fine for a single-instance dev/demo
/// process, and explicitly not something to ship as-is to a scaled-out
/// production deployment (see the "Security &amp; production notes" the
/// frontend renders alongside this data).
/// </summary>
public class SqlTraceInterceptor : DbCommandInterceptor
{
    private const int MaxEntries = 20;
    private readonly ConcurrentQueue<SqlTraceEntry> _entries = new();

    public IReadOnlyList<SqlTraceEntry> RecentEntries => _entries.ToArray().Reverse().ToList();

    public override InterceptionResult<System.Data.Common.DbDataReader> ReaderExecuting(
        System.Data.Common.DbCommand command, CommandEventData eventData, InterceptionResult<System.Data.Common.DbDataReader> result)
    {
        Capture(command);
        return base.ReaderExecuting(command, eventData, result);
    }

    public override ValueTask<InterceptionResult<System.Data.Common.DbDataReader>> ReaderExecutingAsync(
        System.Data.Common.DbCommand command, CommandEventData eventData, InterceptionResult<System.Data.Common.DbDataReader> result, CancellationToken cancellationToken = default)
    {
        Capture(command);
        return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
    }

    public override InterceptionResult<int> NonQueryExecuting(
        System.Data.Common.DbCommand command, CommandEventData eventData, InterceptionResult<int> result)
    {
        Capture(command);
        return base.NonQueryExecuting(command, eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(
        System.Data.Common.DbCommand command, CommandEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        Capture(command);
        return base.NonQueryExecutingAsync(command, eventData, result, cancellationToken);
    }

    private void Capture(System.Data.Common.DbCommand command)
    {
        var parameters = new StringBuilder();
        foreach (System.Data.Common.DbParameter p in command.Parameters)
        {
            if (parameters.Length > 0) parameters.Append(", ");
            parameters.Append(p.ParameterName).Append('=').Append(p.Value);
        }

        _entries.Enqueue(new SqlTraceEntry(DateTimeOffset.UtcNow, command.CommandText, parameters.ToString()));
        while (_entries.Count > MaxEntries && _entries.TryDequeue(out _)) { }
    }
}
