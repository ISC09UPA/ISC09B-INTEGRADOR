using AlimentadorInteligente.Application;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlimentadorInteligente.API.Controllers;

[ApiController]
[Authorize]
[Route("api/ota")]
public class OtaController(IComandoService comandos, IOtaService ota) : ControllerBase
{
    /// <summary>Margen para los campos del formulario además del archivo.</summary>
    private const long LimitePeticion = Constantes.MaxTamanoArtefactoOta + 1024 * 1024;

    /// <summary>Versiones de firmware y modelo disponibles.</summary>
    [HttpGet("artefactos")]
    public async Task<ActionResult<IReadOnlyList<ArtefactoOtaDto>>> Artefactos(CancellationToken ct)
        => Ok(await comandos.ListarArtefactosAsync(ct));

    /// <summary>
    /// Publica un firmware o modelo (multipart: tipo = firmware | modelo, version, archivo).
    /// Solo los correos configurados en Ota:Administradores.
    /// </summary>
    [HttpPost("artefactos")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(LimitePeticion)]
    [RequestFormLimits(MultipartBodyLengthLimit = LimitePeticion)]
    public async Task<ActionResult<ArtefactoOtaDto>> Publicar(
        [FromForm] string tipo, [FromForm] string version, IFormFile archivo, CancellationToken ct)
    {
        await using var contenido = archivo.OpenReadStream();
        var creado = await ota.PublicarAsync(new PublicarArtefactoRequest(tipo, version, archivo.FileName), contenido, ct);
        return StatusCode(StatusCodes.Status201Created, creado);
    }

    /// <summary>Borra un artefacto que todavía no se haya usado en ninguna actualización.</summary>
    [HttpDelete("artefactos/{id:int}")]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
    {
        await ota.EliminarAsync(id, ct);
        return NoContent();
    }
}
