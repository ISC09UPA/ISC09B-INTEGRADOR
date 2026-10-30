using AlimentadorInteligente.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace AlimentadorInteligente.API.Hubs;

/// <summary>
/// Canal en tiempo real con la app (RF-20). Cada alimentador es un grupo;
/// la app se une a los alimentadores que tiene abiertos.
/// Eventos que manda el servidor: VisitaRegistrada, AlertaCreada, ComandoActualizado, EstadoAlimentador.
/// </summary>
[Authorize]
public class AlimentadorHub(IAccesoAlimentador acceso) : Hub
{
    public static string Grupo(int alimentadorId) => $"alimentador-{alimentadorId}";

    public async Task UnirseAlimentador(int alimentadorId)
    {
        await acceso.RequerirAccesoAsync(alimentadorId);
        await Groups.AddToGroupAsync(Context.ConnectionId, Grupo(alimentadorId));
    }

    public Task SalirAlimentador(int alimentadorId)
        => Groups.RemoveFromGroupAsync(Context.ConnectionId, Grupo(alimentadorId));
}
