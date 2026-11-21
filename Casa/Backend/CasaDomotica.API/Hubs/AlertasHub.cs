using Microsoft.AspNetCore.SignalR;

namespace CasaDomotica.API.Hubs;

/// <summary>
/// Hub de SignalR. El servidor manda a las apps conectadas:
///  - "alerta": movimiento / rostro desconocido
///  - "acceso": alguien entró (o lo intentó) / la puerta se abrió
/// </summary>
public class AlertasHub : Hub
{
}
