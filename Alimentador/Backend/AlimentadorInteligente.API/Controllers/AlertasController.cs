using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlimentadorInteligente.API.Controllers;

[ApiController]
[Authorize]
[Route("api")]
public class AlertasController(IAlertaService alertas) : ControllerBase
{
    [HttpGet("alimentadores/{alimentadorId:int}/alertas")]
    public async Task<ActionResult<IReadOnlyList<AlertaDto>>> Listar(
        int alimentadorId, [FromQuery] bool soloNoLeidas, CancellationToken ct)
        => Ok(await alertas.ListarAsync(alimentadorId, soloNoLeidas, ct));

    [HttpPut("alertas/{id:int}/leida")]
    public async Task<IActionResult> MarcarLeida(int id, CancellationToken ct)
    {
        await alertas.MarcarLeidaAsync(id, ct);
        return NoContent();
    }
}
