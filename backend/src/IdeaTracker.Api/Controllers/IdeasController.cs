using IdeaTracker.Api.Dtos;
using IdeaTracker.Api.Models;
using IdeaTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace IdeaTracker.Api.Controllers;

[ApiController]
[Route("api/ideas")]
public class IdeasController : ControllerBase
{
    private readonly IIdeaService _service;

    public IdeasController(IIdeaService service)
    {
        _service = service;
    }

    /// <summary>List ideas, optionally filtered by status, with optional paging.</summary>
    /// <remarks>GET /api/ideas?status=Approved&amp;page=1&amp;pageSize=20</remarks>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<IdeaResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResult<IdeaResponseDto>>> List(
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        IdeaStatus? parsedStatus = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<IdeaStatus>(status, ignoreCase: true, out var s))
            {
                return Problem(
                    title: "Invalid status filter",
                    detail: $"'{status}' is not a valid status. Expected one of: {string.Join(", ", Enum.GetNames<IdeaStatus>())}.",
                    statusCode: StatusCodes.Status400BadRequest);
            }
            parsedStatus = s;
        }

        var result = await _service.ListAsync(parsedStatus, page, pageSize, ct);
        return Ok(result);
    }

    /// <summary>Get a single idea by id.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(IdeaResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IdeaResponseDto>> GetById(Guid id, CancellationToken ct)
    {
        var idea = await _service.GetByIdAsync(id, ct);
        return idea is null ? NotFound() : Ok(idea);
    }

    /// <summary>Create a new idea. Always starts in the Proposed status.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(IdeaResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IdeaResponseDto>> Create(CreateIdeaDto dto, CancellationToken ct)
    {
        // [ApiController] already returns a 400 ValidationProblemDetails for
        // invalid ModelState (e.g. missing Title) before this method runs.
        var created = await _service.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    /// <summary>Update an existing idea, including its status. Optional per the brief.</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(IdeaResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IdeaResponseDto>> Update(Guid id, UpdateIdeaDto dto, CancellationToken ct)
    {
        var updated = await _service.UpdateAsync(id, dto, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    /// <summary>Delete an idea. Optional per the brief.</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var deleted = await _service.DeleteAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }
}
