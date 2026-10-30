using EstacionamientoInteligente.API.Ejemplos;
using EstacionamientoInteligente.Domain.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace EstacionamientoInteligente.API.Controllers;

/// <summary>Avisos para el administrador. Solo Administrador.</summary>
[ApiController]
[Route("api/alertas")]
[Tags("Alertas")]
public class AlertasController : ControllerBase
{
    /// <summary>Alertas de la más reciente a la más antigua.</summary>
    /// <param name="pendientes">True: solo las no atendidas.</param>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<AlertaDto>>(StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<AlertaDto>> Listar([FromQuery] bool pendientes = true) =>
        Ok(DatosEjemplo.Alertas());

    /// <summary>Marca una alerta como atendida.</summary>
    /// <response code="409">Ya estaba atendida.</response>
    [HttpPatch("{id:guid}/atender")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public IActionResult Atender(Guid id) => NoContent();
}
