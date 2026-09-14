using IdeaTracker.Api.Dtos;
using IdeaTracker.Api.Models;

namespace IdeaTracker.Api.Services;

public interface IIdeaService
{
    Task<IdeaResponseDto?> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<PagedResult<IdeaResponseDto>> ListAsync(
        IdeaStatus? status, int page, int pageSize, CancellationToken ct = default);

    Task<IdeaResponseDto> CreateAsync(CreateIdeaDto dto, CancellationToken ct = default);

    /// <summary>Returns null if no idea exists with that id.</summary>
    Task<IdeaResponseDto?> UpdateAsync(Guid id, UpdateIdeaDto dto, CancellationToken ct = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}
