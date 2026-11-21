using CasaDomotica.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CasaDomotica.API.Controllers;

[ApiController]
[Authorize]
[Route("api")]
public class FotosController : ControllerBase
{
    private readonly IAlmacenFotos _fotos;

    public FotosController(IAlmacenFotos fotos)
    {
        _fotos = fotos;
    }

    /// <summary>Últimas fotos de accesos guardadas en Blob Storage (con enlace temporal de 30 min).</summary>
    [HttpGet("fotos")]
    public async Task<IActionResult> Listar([FromQuery] int max = 40, CancellationToken ct = default)
    {
        if (!_fotos.Configurado)
        {
            return Ok(Array.Empty<FotoDto>());
        }

        try
        {
            return Ok(await _fotos.ListarAsync(Math.Clamp(max, 1, 100), ct));
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { mensaje = "No se pudo leer Blob Storage: " + ex.Message });
        }
    }
}
