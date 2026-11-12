using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlimentadorInteligente.API.Controllers;

[ApiController]
[Authorize]
[Route("api")]
public class MascotasController(IMascotaService mascotas, IHistorialService historial) : ControllerBase
{
    [HttpGet("alimentadores/{alimentadorId:int}/mascotas")]
    public async Task<ActionResult<IReadOnlyList<MascotaDto>>> Listar(int alimentadorId, CancellationToken ct)
        => Ok(await mascotas.ListarAsync(alimentadorId, ct));

    [HttpPost("alimentadores/{alimentadorId:int}/mascotas")]
    public async Task<ActionResult<MascotaDto>> Crear(int alimentadorId, GuardarMascotaRequest request, CancellationToken ct)
    {
        var creada = await mascotas.CrearAsync(alimentadorId, request, ct);
        return CreatedAtAction(nameof(Obtener), new { id = creada.Id }, creada);
    }

    [HttpGet("mascotas/{id:int}")]
    public async Task<ActionResult<MascotaDto>> Obtener(int id, CancellationToken ct)
        => Ok(await mascotas.ObtenerAsync(id, ct));

    [HttpPut("mascotas/{id:int}")]
    public async Task<ActionResult<MascotaDto>> Actualizar(int id, GuardarMascotaRequest request, CancellationToken ct)
        => Ok(await mascotas.ActualizarAsync(id, request, ct));

    [HttpDelete("mascotas/{id:int}")]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
    {
        await mascotas.EliminarAsync(id, ct);
        return NoContent();
    }

    // --- Historial y gráficas (RF-18) ---

    [HttpGet("mascotas/{id:int}/visitas")]
    public async Task<ActionResult<IReadOnlyList<VisitaDto>>> Visitas(
        int id, [FromQuery] DateTimeOffset? desde, [FromQuery] DateTimeOffset? hasta, CancellationToken ct)
        => Ok(await historial.ListarVisitasAsync(id, desde, hasta, ct));

    /// <summary>Ración recomendada vs. real por día.</summary>
    [HttpGet("mascotas/{id:int}/consumo")]
    public async Task<ActionResult<IReadOnlyList<ConsumoDiarioDto>>> Consumo(
        int id, [FromQuery] DateOnly desde, [FromQuery] DateOnly hasta, CancellationToken ct)
    {
        if (hasta < desde || hasta.DayNumber - desde.DayNumber > 90)
            return BadRequest("El rango debe ser válido y de máximo 90 días.");
        return Ok(await historial.ConsumoDiarioAsync(id, desde, hasta, ct));
    }
}
