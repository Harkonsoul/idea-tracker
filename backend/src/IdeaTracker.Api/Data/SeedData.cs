using IdeaTracker.Api.Models;

namespace IdeaTracker.Api.Data;

/// <summary>
/// Dev/demo convenience only — seeds a handful of ideas so the UI has
/// something to show immediately after a fresh `dotnet run`. Never runs
/// against the SQL Server/Azure SQL path (see Program.cs).
/// </summary>
public static class SeedData
{
    public static void EnsureSeeded(IdeaTrackerDbContext db)
    {
        if (db.Ideas.Any()) return;

        var now = DateTimeOffset.UtcNow;

        db.Ideas.AddRange(
            new Idea
            {
                Id = Guid.NewGuid(),
                Title = "Offline-first field reporting",
                Description = "Enable mobile users to capture reports offline and sync later.",
                Status = IdeaStatus.Proposed,
                CreatedAt = now.AddDays(-6),
                UpdatedAt = now.AddDays(-6),
                Tags = new List<string> { "mobile", "sync" },
            },
            new Idea
            {
                Id = Guid.NewGuid(),
                Title = "AI-assisted order note summarisation",
                Description = "Summarise long order notes for warehouse staff using a hosted LLM.",
                Status = IdeaStatus.InReview,
                CreatedAt = now.AddDays(-4),
                UpdatedAt = now.AddDays(-1),
                Tags = new List<string> { "ai", "warehouse" },
            },
            new Idea
            {
                Id = Guid.NewGuid(),
                Title = "Self-serve BOM cost simulator",
                Description = "Let planners model bill-of-materials cost changes before committing them.",
                Status = IdeaStatus.Approved,
                CreatedAt = now.AddDays(-20),
                UpdatedAt = now.AddDays(-2),
                Tags = new List<string> { "manufacturing", "costing" },
            },
            new Idea
            {
                Id = Guid.NewGuid(),
                Title = "Dark mode for the shop-floor tablet app",
                Description = "Reduce glare for night-shift operators.",
                Status = IdeaStatus.Rejected,
                CreatedAt = now.AddDays(-30),
                UpdatedAt = now.AddDays(-25),
                Tags = new List<string> { "ux" },
            }
        );

        db.SaveChanges();
    }
}
