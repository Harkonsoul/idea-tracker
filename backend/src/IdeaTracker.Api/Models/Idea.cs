namespace IdeaTracker.Api.Models;

/// <summary>
/// An innovation idea submitted for review. This is the EF Core entity /
/// persistence model — API request/response shapes live in Dtos/ instead,
/// so the wire format can evolve independently of the storage schema.
/// </summary>
public class Idea
{
    public Guid Id { get; set; }

    public required string Title { get; set; }

    public string Description { get; set; } = string.Empty;

    public IdeaStatus Status { get; set; } = IdeaStatus.Proposed;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>
    /// Stored as a single delimited string column (see IdeaTrackerDbContext's
    /// value converter) to avoid standing up a child table for what the brief
    /// scopes as "short strings" — a deliberate simplicity trade-off for this
    /// slice, called out in SOLUTION.md.
    /// </summary>
    public List<string> Tags { get; set; } = new();
}
