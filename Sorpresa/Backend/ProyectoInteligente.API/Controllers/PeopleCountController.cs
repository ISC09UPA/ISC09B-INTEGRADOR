using Microsoft.AspNetCore.Mvc;
using ProyectoInteligente.Application.DTOs;
using ProyectoInteligente.Application.Interfaces;
using ProyectoInteligente.Application.Mappings;

namespace ProyectoInteligente.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PeopleCountController : ControllerBase
{
    private static readonly string[] AllowedTypes = { "image/jpeg", "image/png", "image/bmp" };
    private const long MaxBytes = 20 * 1024 * 1024;

    private readonly IPeopleCounterService _service;

    public PeopleCountController(IPeopleCounterService service)
    {
        _service = service;
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<PeopleCountDto>> Count(IFormFile image, CancellationToken cancellationToken)
    {
        if (image == null || image.Length == 0)
            return BadRequest("Debes enviar una imagen.");

        if (image.Length > MaxBytes)
            return BadRequest("La imagen supera los 20 MB.");

        if (!AllowedTypes.Contains(image.ContentType))
            return BadRequest("Formato no soportado. Usa JPG, PNG o BMP.");

        await using var stream = image.OpenReadStream();
        var result = await _service.CountAsync(stream, cancellationToken);

        return Ok(result.ToDto());
    }
}
