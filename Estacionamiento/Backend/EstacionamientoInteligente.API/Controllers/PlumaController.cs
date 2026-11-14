using EstacionamientoInteligente.API.Comun;
using EstacionamientoInteligente.Application.Interfaces;
using EstacionamientoInteligente.Domain.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EstacionamientoInteligente.API.Controllers;

/// <summary>Control de la pluma de acceso.</summary>
[ApiController]
[Route("api/pluma")]
[Tags("Escáner y pluma")]
[Authorize]
public class PlumaController(IPlumaService pluma) : ControllerBase
{
    /// <summary>Abre la pluma a mano, sin validar cupo. Queda registrado quién la abrió. Solo Administrador.</summary>
    /// <response code="202">La orden se mandó a la maqueta; el cambio real llega por SignalR (PlumaActualizada).</response>
    [HttpPost("abrir")]
    [Authorize(Roles = Roles.Administrador)]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    public async Task<IActionResult> Abrir(AbrirPlumaRequest? request)
    {
        await pluma.AbrirManualAsync(User.ObtenerId(), request?.Motivo);
        return Accepted();
    }

    /// <summary>Si la pluma está abierta o cerrada. Usuario y Administrador.</summary>
    [HttpGet("estado")]
    [ProducesResponseType<EstadoPlumaDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<EstadoPlumaDto>> Estado() =>
        Ok(await pluma.ObtenerEstadoAsync());
}
