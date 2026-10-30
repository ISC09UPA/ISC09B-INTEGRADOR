using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlimentadorInteligente.API.Controllers;

[ApiController]
[Authorize]
[Route("api")]
public class HorariosController(IHorarioService horarios) : ControllerBase
{
    [HttpGet("alimentadores/{alimentadorId:int}/horarios")]
    public async Task<ActionResult<IReadOnlyList<HorarioDto>>> Listar(int alimentadorId, CancellationToken ct)
        => Ok(await horarios.ListarAsync(alimentadorId, ct));

    [HttpPost("alimentadores/{alimentadorId:int}/horarios")]
    public async Task<ActionResult<HorarioDto>> Crear(int alimentadorId, GuardarHorarioRequest request, CancellationToken ct)
        => Ok(await horarios.CrearAsync(alimentadorId, request, ct));

    [HttpPut("horarios/{id:int}")]
    public async Task<ActionResult<HorarioDto>> Actualizar(int id, GuardarHorarioRequest request, CancellationToken ct)
        => Ok(await horarios.ActualizarAsync(id, request, ct));

    [HttpDelete("horarios/{id:int}")]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
    {
        await horarios.EliminarAsync(id, ct);
        return NoContent();
    }
}
