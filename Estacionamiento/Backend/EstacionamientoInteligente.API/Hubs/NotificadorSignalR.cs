using EstacionamientoInteligente.Application.Interfaces.Externos;
using EstacionamientoInteligente.Domain.DTOs;
using EstacionamientoInteligente.Domain.Enums;
using Microsoft.AspNetCore.SignalR;

namespace EstacionamientoInteligente.API.Hubs;

/// <summary>
/// Manda los avisos en vivo por <see cref="EstacionamientoHub"/>. Lo llaman los services
/// (cajones, pluma, paso por la pluma y alertas) después de guardar en la base.
/// </summary>
/// <remarks>
/// Si un aviso falla (por ejemplo, se cayó la conexión con Azure SignalR) solo se registra:
/// lo importante ya quedó guardado y la app lo verá la próxima vez que consulte.
/// </remarks>
public class NotificadorSignalR(IHubContext<EstacionamientoHub> hub, ILogger<NotificadorSignalR> logger)
    : INotificadorTiempoReal
{
    public const string EventoCajon = "CajonActualizado";
    public const string EventoPluma = "PlumaActualizada";
    public const string EventoAcceso = "AccesoRegistrado";
    public const string EventoAlerta = "AlertaCreada";

    public Task CajonActualizadoAsync(int numero, EstadoCajon estado, int libres, int total) =>
        EnviarAsync(EventoCajon, hub.Clients.All, new { numero, estado, libres, total });

    public Task PlumaActualizadaAsync(bool abierta, DateTime fecha) =>
        EnviarAsync(EventoPluma, hub.Clients.All, new { abierta, fecha });

    public Task AccesoRegistradoAsync(TipoPaso tipo, string? placa, int? cajon, DateTime hora, Guid? usuarioId)
    {
        // Los administradores siempre; el dueño solo si el auto está ligado a su cuenta.
        var destino = usuarioId is { } id
            ? hub.Clients.Groups(EstacionamientoHub.GrupoAdministradores, EstacionamientoHub.GrupoUsuario(id))
            : hub.Clients.Group(EstacionamientoHub.GrupoAdministradores);

        return EnviarAsync(EventoAcceso, destino, new { tipo, placa, cajon, hora });
    }

    public Task AlertaCreadaAsync(AlertaDto alerta) =>
        EnviarAsync(EventoAlerta, hub.Clients.Group(EstacionamientoHub.GrupoAdministradores), alerta);

    private async Task EnviarAsync(string evento, IClientProxy destino, object contenido)
    {
        try
        {
            await destino.SendAsync(evento, contenido);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "No se pudo enviar el evento en vivo {Evento}.", evento);
        }
    }
}
