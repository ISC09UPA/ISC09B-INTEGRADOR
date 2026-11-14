using EstacionamientoInteligente.Application.Interfaces.Externos;
using EstacionamientoInteligente.Domain.DTOs;
using EstacionamientoInteligente.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace EstacionamientoInteligente.Infrastructure.Locales;

/// <summary>
/// Mientras no exista SignalR, los avisos en vivo solo se escriben en el log.
/// La app se entera de los cambios porque vuelve a consultar cada 10 segundos.
/// </summary>
/// <remarks>Se reemplaza por el hub /hubs/estacionamiento en la Fase 4.</remarks>
public class NotificadorSinTiempoReal(ILogger<NotificadorSinTiempoReal> logger) : INotificadorTiempoReal
{
    public Task CajonActualizadoAsync(int numero, EstadoCajon estado, int libres, int total)
    {
        logger.LogDebug("[En vivo] Cajón {Numero}: {Estado} ({Libres}/{Total} libres)", numero, estado, libres, total);
        return Task.CompletedTask;
    }

    public Task PlumaActualizadaAsync(bool abierta, DateTime fecha)
    {
        logger.LogDebug("[En vivo] Pluma {Estado}", abierta ? "abierta" : "cerrada");
        return Task.CompletedTask;
    }

    public Task AccesoRegistradoAsync(TipoPaso tipo, string? placa, int? cajon, DateTime hora, Guid? usuarioId)
    {
        logger.LogDebug("[En vivo] {Tipo} de {Placa}", tipo, placa ?? "placa no legible");
        return Task.CompletedTask;
    }

    public Task AlertaCreadaAsync(AlertaDto alerta)
    {
        logger.LogDebug("[En vivo] Alerta {Tipo}: {Mensaje}", alerta.Tipo, alerta.Mensaje);
        return Task.CompletedTask;
    }
}
