using EstacionamientoInteligente.API.Comun;
using EstacionamientoInteligente.Application.Interfaces;
using EstacionamientoInteligente.Domain.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EstacionamientoInteligente.API.Controllers;

/// <summary>Avisos para el administrador. Solo Administrador.</summary>
[ApiController]
[Route("api/alertas")]
[Tags("Alertas")]
[Authorize(Roles = Roles.Administrador)]
public class AlertasController(IAlertasService alertas) : ControllerBase
{
    /// <summary>Alertas de la más reciente a la más antigua.</summary>
    /// <param name="pendientes">True: solo las no atendidas.</param>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<AlertaDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AlertaDto>>> Listar([FromQuery] bool pendientes = true) =>
        Ok(await alertas.ListarAsync(pendientes));

    /// <summary>Marca una alerta como atendida por el administrador que hace la petición.</summary>
    /// <response code="409">Ya estaba atendida.</response>
    [HttpPatch("{id:guid}/atender")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Atender(Guid id)
    {
        await alertas.AtenderAsync(id, User.ObtenerId());
        return NoContent();
    }
}
