using IdeaTracker.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace IdeaTracker.Api.Data;

public class IdeaTrackerDbContext : DbContext
{
    public IdeaTrackerDbContext(DbContextOptions<IdeaTrackerDbContext> options) : base(options) { }

    public DbSet<Idea> Ideas => Set<Idea>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var tagsComparer = new ValueComparer<List<string>>(
            (a, b) => (a ?? new()).SequenceEqual(b ?? new()),
            v => v.Aggregate(0, (hash, tag) => HashCode.Combine(hash, tag.GetHashCode())),
            v => v.ToList());

        modelBuilder.Entity<Idea>(entity =>
        {
            entity.ToTable("Ideas");
            entity.HasKey(i => i.Id);

            entity.Property(i => i.Title)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(i => i.Description)
                .HasMaxLength(4000)
                .HasDefaultValue(string.Empty);

            // Stored as a string column so the schema stays simple SQL Server
            // DDL (see sql/schema.sql) instead of introducing a lookup table
            // for a fixed, small set of values.
            entity.Property(i => i.Status)
                .HasConversion<string>()
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(i => i.CreatedAt).IsRequired();
            entity.Property(i => i.UpdatedAt).IsRequired();

            // Tags are a handful of short strings (per the brief) — persisted
            // as one comma-delimited column rather than a child table. Cheap
            // and readable for this slice; a real tag taxonomy (dedupe,
            // search-by-tag at scale) would earn its own table later.
            entity.Property(i => i.Tags)
                .HasConversion(
                    v => string.Join(',', v),
                    v => v.Length == 0
                        ? new List<string>()
                        : v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList())
                .Metadata.SetValueComparer(tagsComparer);

            entity.HasIndex(i => i.Status);
        });
    }
}
