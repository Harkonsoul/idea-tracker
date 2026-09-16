using System.ComponentModel.DataAnnotations;
using IdeaTracker.Api.Models;

namespace IdeaTracker.Api.Dtos;

/// <summary>Request body for POST /api/ideas.</summary>
public class CreateIdeaDto
{
    [Required(AllowEmptyStrings = false)]
    [MaxLength(200)]
    public required string Title { get; set; }

    [MaxLength(4000)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(10)]
    public List<string> Tags { get; set; } = new();
}

/// <summary>Request body for PUT /api/ideas/{id} (optional bonus endpoint).</summary>
public class UpdateIdeaDto
{
    [Required(AllowEmptyStrings = false)]
    [MaxLength(200)]
    public required string Title { get; set; }

    [MaxLength(4000)]
    public string Description { get; set; } = string.Empty;

    [Required]
    public required IdeaStatus Status { get; set; }

    [MaxLength(10)]
    public List<string> Tags { get; set; } = new();
}

/// <summary>Shape returned to clients — decoupled from the EF entity on purpose.</summary>
public class IdeaResponseDto
{
    public Guid Id { get; set; }
    public required string Title { get; set; }
    public string Description { get; set; } = string.Empty;
    public required string Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<string> Tags { get; set; } = new();

    public static IdeaResponseDto FromEntity(Idea idea) => new()
    {
        Id = idea.Id,
        Title = idea.Title,
        Description = idea.Description,
        Status = idea.Status.ToString(),
        CreatedAt = idea.CreatedAt,
        UpdatedAt = idea.UpdatedAt,
        Tags = idea.Tags,
    };
}

/// <summary>Envelope for GET /api/ideas — pagination is optional per the brief, included here since it's cheap on top of IQueryable.</summary>
public class PagedResult<T>
{
    public required List<T> Items { get; set; }
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
