namespace IdeaTracker.Api.Models;

/// <summary>
/// The review lifecycle of an idea. Stored as a string in the database (see
/// IdeaTrackerDbContext) so the column is human-readable and stable across
/// enum member reordering.
/// </summary>
public enum IdeaStatus
{
    Proposed,
    InReview,
    Approved,
    Rejected,
}
