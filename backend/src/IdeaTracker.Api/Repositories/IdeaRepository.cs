using IdeaTracker.Api.Data;
using IdeaTracker.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace IdeaTracker.Api.Repositories;

public class IdeaRepository : IIdeaRepository
{
    private readonly IdeaTrackerDbContext _db;

    public IdeaRepository(IdeaTrackerDbContext db)
    {
        _db = db;
    }

    public Task<Idea?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Ideas.FirstOrDefaultAsync(i => i.Id == id, ct);

    public async Task<(List<Idea> Items, int Total)> ListAsync(
        IdeaStatus? status, int page, int pageSize, CancellationToken ct = default)
    {
        IQueryable<Idea> query = _db.Ideas.AsNoTracking();

        if (status is not null)
        {
            query = query.Where(i => i.Status == status);
        }

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(i => i.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, total);
    }

    public async Task AddAsync(Idea idea, CancellationToken ct = default)
    {
        _db.Ideas.Add(idea);
        await _db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Idea idea, CancellationToken ct = default)
    {
        _db.Ideas.Update(idea);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var idea = await _db.Ideas.FindAsync(new object[] { id }, ct);
        if (idea is null) return false;

        _db.Ideas.Remove(idea);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
