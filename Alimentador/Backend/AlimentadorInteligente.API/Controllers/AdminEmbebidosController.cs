using AlimentadorInteligente.API.Auth;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlimentadorInteligente.API.Controllers;

/// <summary>Raspberry Pi, ESP32, eventos y fotos dudosas.</summary>
[ApiController]
[Authorize(Policy = RequisitoAdministrador.Politica)]
[Route("api/admin")]
public class AdminEmbebidosController(IAdminEmbebidosService embebidos) : ControllerBase
{
    /// <summary>Todas las Pi, ordenadas por deviceId, con sus alimentadores.</summary>
    [HttpGet("gateways")]
    public async Task<ActionResult<IReadOnlyList<GatewayAdminDto>>> Gateways(CancellationToken ct)
        => Ok(await embebidos.ListarGatewaysAsync(ct));

    /// <summary>Clave nueva para cualquier Pi; se muestra una sola vez.</summary>
    [HttpPost("gateways/{id:int}/regenerar-clave")]
    public async Task<ActionResult<GatewayClaveResponse>> RegenerarClave(int id, CancellationToken ct)
        => Ok(await embebidos.RegenerarClaveAsync(id, ct));

    /// <summary>Eventos JAM y HOPPER_LOW, del más reciente al más antiguo.</summary>
    [HttpGet("eventos")]
    public async Task<ActionResult<Pagina<EventoAdminDto>>> Eventos([FromQuery] ConsultaEventos consulta, CancellationToken ct)
        => Ok(await embebidos.ListarEventosAsync(consulta, ct));

    /// <summary>Fotos dudosas; estado = pendientes (predeterminado) | revisadas | todas.</summary>
    [HttpGet("fotos")]
    public async Task<ActionResult<Pagina<FotoDudosaAdminDto>>> Fotos([FromQuery] ConsultaFotos consulta, CancellationToken ct)
        => Ok(await embebidos.ListarFotosAsync(consulta, ct));

    [HttpPut("fotos/{id:int}/revision")]
    public async Task<ActionResult<FotoDudosaAdminDto>> RevisarFoto(int id, RevisarFotoRequest request, CancellationToken ct)
        => Ok(await embebidos.RevisarFotoAsync(id, request, ct));
}
