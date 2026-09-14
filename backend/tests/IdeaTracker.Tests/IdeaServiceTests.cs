using IdeaTracker.Api.Data;
using IdeaTracker.Api.Dtos;
using IdeaTracker.Api.Models;
using IdeaTracker.Api.Repositories;
using IdeaTracker.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace IdeaTracker.Tests;

/// <summary>
/// Exercises IdeaService against a real (in-memory) Sqlite-backed
/// IdeaRepository rather than a mock, so the EF Core mapping in
/// IdeaTrackerDbContext (the enum-as-string and tags-as-CSV conversions) is
/// covered too, not just the service's own logic.
/// </summary>
public class IdeaServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly IdeaTrackerDbContext _db;
    private readonly IdeaService _service;

    public IdeaServiceTests()
    {
        // Kept open for the test's lifetime — an in-memory Sqlite database is
        // dropped the moment its connection closes.
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<IdeaTrackerDbContext>()
            .UseSqlite(_connection)
            .Options;

        _db = new IdeaTrackerDbContext(options);
        _db.Database.EnsureCreated();

        var repository = new IdeaRepository(_db);
        var fixedClock = new FixedTimeProvider(new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero));
        _service = new IdeaService(repository, fixedClock);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    [Fact]
    public async Task CreateAsync_TrimsTitle_DefaultsToProposedStatus_AndStampsTimestamps()
    {
        var dto = new CreateIdeaDto
        {
            Title = "  Offline-first field reporting  ",
            Description = "Capture reports offline.",
            Tags = new List<string> { "mobile", " mobile ", "sync" }, // duplicate + whitespace on purpose
        };

        var created = await _service.CreateAsync(dto);

        Assert.Equal("Offline-first field reporting", created.Title);
        Assert.Equal("Proposed", created.Status);
        Assert.Equal(new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero), created.CreatedAt);
        Assert.Equal(new[] { "mobile", "sync" }, created.Tags); // de-duplicated, trimmed
    }

    [Fact]
    public async Task ListAsync_WithStatusFilter_ReturnsOnlyMatchingIdeas()
    {
        await _service.CreateAsync(new CreateIdeaDto { Title = "Idea A" });
        var toApprove = await _service.CreateAsync(new CreateIdeaDto { Title = "Idea B" });
        await _service.UpdateAsync(toApprove.Id, new UpdateIdeaDto
        {
            Title = toApprove.Title,
            Description = toApprove.Description,
            Status = IdeaStatus.Approved,
            Tags = toApprove.Tags,
        });

        var approvedOnly = await _service.ListAsync(IdeaStatus.Approved, page: 1, pageSize: 20);

        Assert.Equal(1, approvedOnly.Total);
        Assert.Equal("Idea B", Assert.Single(approvedOnly.Items).Title);
    }

    [Fact]
    public async Task UpdateAsync_WhenIdeaDoesNotExist_ReturnsNullRatherThanThrowing()
    {
        var result = await _service.UpdateAsync(Guid.NewGuid(), new UpdateIdeaDto
        {
            Title = "Doesn't matter",
            Status = IdeaStatus.Approved,
        });

        Assert.Null(result);
    }

    private sealed class FixedTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _now;
        public FixedTimeProvider(DateTimeOffset now) => _now = now;
        public override DateTimeOffset GetUtcNow() => _now;
    }
}
