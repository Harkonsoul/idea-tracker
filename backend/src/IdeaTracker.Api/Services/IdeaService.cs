using IdeaTracker.Api.Dtos;
using IdeaTracker.Api.Models;
using IdeaTracker.Api.Repositories;

namespace IdeaTracker.Api.Services;

/// <summary>
/// Business rules for ideas: defaulting, timestamps, and pagination-parameter
/// sanitising. Deliberately thin for this slice — there's no cross-entity
/// logic yet — but this is the seam where rules like "can't approve an idea
/// with no description" would land without the controller or repository
/// needing to change.
/// </summary>
public class IdeaService : IIdeaService
{
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;

    private readonly IIdeaRepository _repository;
    private readonly TimeProvider _clock;

    public IdeaService(IIdeaRepository repository, TimeProvider? clock = null)
    {
        _repository = repository;
        _clock = clock ?? TimeProvider.System;
    }

    public async Task<IdeaResponseDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var idea = await _repository.GetByIdAsync(id, ct);
        return idea is null ? null : IdeaResponseDto.FromEntity(idea);
    }

    public async Task<PagedResult<IdeaResponseDto>> ListAsync(
        IdeaStatus? status, int page, int pageSize, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize <= 0 ? DefaultPageSize : Math.Min(pageSize, MaxPageSize);

        var (items, total) = await _repository.ListAsync(status, page, pageSize, ct);

        return new PagedResult<IdeaResponseDto>
        {
            Items = items.Select(IdeaResponseDto.FromEntity).ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<IdeaResponseDto> CreateAsync(CreateIdeaDto dto, CancellationToken ct = default)
    {
        var now = _clock.GetUtcNow().UtcDateTime;

        var idea = new Idea
        {
            Id = Guid.NewGuid(),
            Title = dto.Title.Trim(),
            Description = dto.Description?.Trim() ?? string.Empty,
            Status = IdeaStatus.Proposed,
            Tags = NormalizeTags(dto.Tags),
            CreatedAt = now,
            UpdatedAt = now,
        };

        await _repository.AddAsync(idea, ct);
        return IdeaResponseDto.FromEntity(idea);
    }

    public async Task<IdeaResponseDto?> UpdateAsync(Guid id, UpdateIdeaDto dto, CancellationToken ct = default)
    {
        var idea = await _repository.GetByIdAsync(id, ct);
        if (idea is null) return null;

        idea.Title = dto.Title.Trim();
        idea.Description = dto.Description?.Trim() ?? string.Empty;
        idea.Status = dto.Status;
        idea.Tags = NormalizeTags(dto.Tags);
        idea.UpdatedAt = _clock.GetUtcNow().UtcDateTime;

        await _repository.UpdateAsync(idea, ct);
        return IdeaResponseDto.FromEntity(idea);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken ct = default) =>
        _repository.DeleteAsync(id, ct);

    private static List<string> NormalizeTags(List<string>? tags) =>
        (tags ?? new())
            .Select(t => t.Trim())
            .Where(t => t.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(10)
            .ToList();
}
