using EstacionamientoInteligente.Application.Interfaces.Externos;
using EstacionamientoInteligente.Domain.DTOs;
using Microsoft.Extensions.Logging;

namespace EstacionamientoInteligente.Infrastructure.Locales;

/// <summary>
/// Sin Service Bus no hay forma de hablarle a la Raspberry: solo se escribe en el log
/// lo que se le habría mandado.
/// </summary>
/// <remarks>Se reemplaza por la cola "comandos-maqueta" en la Fase 4.</remarks>
public class ComandosMaquetaLocal(ILogger<ComandosMaquetaLocal> logger) : IComandosMaqueta
{
    public Task ResponderPasoAsync(Guid solicitudId, ResultadoPasoDto resultado)
    {
        logger.LogInformation("[Maqueta] pluma.respuesta {SolicitudId}: {Accion} ({Motivo})",
            solicitudId, resultado.Accion, resultado.Motivo);
        return Task.CompletedTask;
    }

    public Task AbrirPlumaAsync(string? motivo)
    {
        logger.LogInformation("[Maqueta] pluma.abrir: {Motivo}", motivo ?? "sin motivo");
        return Task.CompletedTask;
    }
}
