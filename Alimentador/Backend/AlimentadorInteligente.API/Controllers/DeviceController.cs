using AlimentadorInteligente.API.Auth;
using AlimentadorInteligente.API.Extensions;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlimentadorInteligente.API.Controllers;

/// <summary>
/// Endpoints que llama la Raspberry Pi (sección 8.2 de los requerimientos).
/// Autenticación con los encabezados X-Device-Id y X-Device-Key.
/// </summary>
[ApiController]
[Authorize(AuthenticationSchemes = DeviceKeyAuthenticationHandler.Esquema)]
[Route("api/device")]
public class DeviceController(IDispositivoService dispositivo) : ControllerBase
{
    /// <summary>Configuración de los alimentadores del gateway; 204 si ninguno cambió desde <paramref name="version"/>.</summary>
    [HttpGet("config")]
    public async Task<ActionResult<ConfiguracionDispositivoDto>> Config([FromQuery] int version, CancellationToken ct)
    {
        var config = await dispositivo.ObtenerConfiguracionAsync(User.GatewayId(), version, ct);
        return config is null ? NoContent() : Ok(config);
    }

    [HttpPost("heartbeat")]
    public async Task<ActionResult<HeartbeatResponse>> Heartbeat(HeartbeatRequest request, CancellationToken ct)
        => Ok(await dispositivo.HeartbeatAsync(User.GatewayId(), request, ct));

    /// <summary>Lote de visitas. Idempotente por eventId: reenviar un lote no duplica nada.</summary>
    [HttpPost("visits")]
    public async Task<ActionResult<LoteResponse>> Visitas(List<VisitaDispositivoDto> visitas, CancellationToken ct)
        => Ok(await dispositivo.RegistrarVisitasAsync(User.GatewayId(), visitas, ct));

    [HttpPost("events")]
    public async Task<ActionResult<LoteResponse>> Eventos(List<EventoDispositivoDto> eventos, CancellationToken ct)
        => Ok(await dispositivo.RegistrarEventosAsync(User.GatewayId(), eventos, ct));

    [HttpGet("commands")]
    public async Task<ActionResult<IReadOnlyList<ComandoDispositivoDto>>> Comandos(CancellationToken ct)
        => Ok(await dispositivo.ObtenerComandosAsync(User.GatewayId(), ct));

    [HttpPost("commands/{id:int}/result")]
    public async Task<IActionResult> ResultadoComando(int id, ResultadoComandoRequest request, CancellationToken ct)
    {
        await dispositivo.ReportarResultadoAsync(User.GatewayId(), id, request, ct);
        return NoContent();
    }

    /// <summary>Devuelve una URL SAS para que la Pi suba una foto dudosa directo a Blob Storage.</summary>
    [HttpPost("photos")]
    public async Task<ActionResult<SolicitudFotoResponse>> SolicitarFoto(SolicitudFotoRequest request, CancellationToken ct)
        => Ok(await dispositivo.SolicitarSubidaFotoAsync(User.GatewayId(), request, ct));
}
