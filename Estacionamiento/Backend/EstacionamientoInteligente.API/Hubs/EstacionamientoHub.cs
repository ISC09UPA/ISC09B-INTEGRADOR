using EstacionamientoInteligente.API.Comun;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace EstacionamientoInteligente.API.Hubs;

/// <summary>
/// Conexión en vivo con la app (CU-27), en <c>/hubs/estacionamiento</c>.
/// La app solo escucha: el backend le manda los eventos de <see cref="NotificadorSignalR"/>.
/// </summary>
/// <remarks>
/// Pide JWT. Como el navegador no puede mandar encabezados al abrir el WebSocket,
/// el token viaja en la query string como <c>access_token</c> (ver Program.cs).
/// Al conectarse, cada quien entra a sus grupos:
/// <list type="bullet">
///   <item><c>administradores</c>: si su rol es Administrador.</item>
///   <item><c>usuario-{id}</c>: siempre, para avisarle solo a él cuando entra o sale su auto.</item>
/// </list>
/// </remarks>
[Authorize]
public class EstacionamientoHub : Hub
{
    public const string Ruta = "/hubs/estacionamiento";
    public const string GrupoAdministradores = "administradores";

    public static string GrupoUsuario(Guid id) => $"usuario-{id}";

    public override async Task OnConnectedAsync()
    {
        var usuario = Context.User!;

        await Groups.AddToGroupAsync(Context.ConnectionId, GrupoUsuario(usuario.ObtenerId()));

        if (usuario.EsAdministrador())
            await Groups.AddToGroupAsync(Context.ConnectionId, GrupoAdministradores);

        await base.OnConnectedAsync();
    }
}
