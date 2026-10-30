using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Application.DTOs;
using Microsoft.AspNetCore.SignalR;

namespace AlimentadorInteligente.API.Hubs;

public class NotificadorSignalR(IHubContext<AlimentadorHub> hub) : INotificadorTiempoReal
{
    public Task VisitaRegistradaAsync(int alimentadorId, VisitaDto visita, CancellationToken ct = default)
        => Enviar(alimentadorId, "VisitaRegistrada", visita, ct);

    public Task AlertaCreadaAsync(int alimentadorId, AlertaDto alerta, CancellationToken ct = default)
        => Enviar(alimentadorId, "AlertaCreada", alerta, ct);

    public Task ComandoActualizadoAsync(int alimentadorId, ComandoDto comando, CancellationToken ct = default)
        => Enviar(alimentadorId, "ComandoActualizado", comando, ct);

    public Task EstadoAlimentadorAsync(int alimentadorId, EstadoAlimentadorDto estado, CancellationToken ct = default)
        => Enviar(alimentadorId, "EstadoAlimentador", new { alimentadorId, estado }, ct);

    private Task Enviar(int alimentadorId, string evento, object datos, CancellationToken ct)
        => hub.Clients.Group(AlimentadorHub.Grupo(alimentadorId)).SendAsync(evento, datos, ct);
}
