using CasaDomotica.API.Hubs;
using CasaDomotica.Application;
using CasaDomotica.Domain;
using CasaDomotica.Infrastructure.Data;
using Microsoft.AspNetCore.SignalR;

namespace CasaDomotica.API.Services;

/// <summary>Guarda alertas y avisa en vivo a las apps conectadas (SignalR).</summary>
public sealed class Notificador
{
    private readonly CasaDb _db;
    private readonly IHubContext<AlertasHub> _hub;

    public Notificador(CasaDb db, IHubContext<AlertasHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    public async Task AlertarAsync(string mensaje)
    {
        var hora = DateTime.Now;
        _db.Alertas.Add(new AlertaLog { Mensaje = mensaje, Hora = hora });
        await _db.SaveChangesAsync();
        await _hub.Clients.All.SendAsync("alerta", new Registro(mensaje, hora));
    }

    public Task AvisarAccesoAsync(string mensaje, DateTime hora) =>
        _hub.Clients.All.SendAsync("acceso", new Registro(mensaje, hora));
}
