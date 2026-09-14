using IdeaTracker.Api.Models;

namespace IdeaTracker.Api.Repositories;

/// <summary>
/// Persistence boundary for ideas. Kept separate from IdeaService so the
/// business rules (validation, timestamps) don't know or care which store is
/// behind them — EF Core today, something else later without touching the
/// controller or service.
/// </summary>
public interface IIdeaRepository
{
    Task<Idea?> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<(List<Idea> Items, int Total)> ListAsync(
        IdeaStatus? status, int page, int pageSize, CancellationToken ct = default);

    Task AddAsync(Idea idea, CancellationToken ct = default);

    Task UpdateAsync(Idea idea, CancellationToken ct = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}
