using EstacionamientoInteligente.API.Ejemplos;
using EstacionamientoInteligente.Domain.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace EstacionamientoInteligente.API.Controllers;

/// <summary>Control de la pluma de acceso.</summary>
[ApiController]
[Route("api/pluma")]
[Tags("Escáner y pluma")]
public class PlumaController : ControllerBase
{
    /// <summary>Abre la pluma a mano, sin validar cupo. Queda registrado quién la abrió. Solo Administrador.</summary>
    /// <response code="202">La orden se mandó a la maqueta; el cambio real llega por SignalR (PlumaActualizada).</response>
    [HttpPost("abrir")]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    public IActionResult Abrir(AbrirPlumaRequest? request) => Accepted();

    /// <summary>Si la pluma está abierta o cerrada. Usuario y Administrador.</summary>
    [HttpGet("estado")]
    [ProducesResponseType<EstadoPlumaDto>(StatusCodes.Status200OK)]
    public ActionResult<EstadoPlumaDto> Estado() => Ok(DatosEjemplo.EstadoPluma());
}
