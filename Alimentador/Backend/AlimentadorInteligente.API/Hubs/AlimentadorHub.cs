using System.IdentityModel.Tokens.Jwt;
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
        // En un hub el usuario sale de la conexión; IHttpContextAccessor no es confiable aquí
        var sub = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        if (!int.TryParse(sub, out var usuarioId) || !await acceso.EsMiembroAsync(alimentadorId, usuarioId))
            throw new HubException("No tienes acceso a este alimentador.");

        await Groups.AddToGroupAsync(Context.ConnectionId, Grupo(alimentadorId));
    }

    public Task SalirAlimentador(int alimentadorId)
        => Groups.RemoveFromGroupAsync(Context.ConnectionId, Grupo(alimentadorId));
}
