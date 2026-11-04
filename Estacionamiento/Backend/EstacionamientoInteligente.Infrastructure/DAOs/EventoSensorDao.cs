using EstacionamientoInteligente.Domain.DAOs;
using EstacionamientoInteligente.Domain.Enums;
using EstacionamientoInteligente.Domain.Models;
using EstacionamientoInteligente.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EstacionamientoInteligente.Infrastructure.DAOs;

/// <summary>Consultas a la tabla <c>EventosSensor</c>.</summary>
public class EventoSensorDao(EstacionamientoDbContext db) : IEventoSensorDao
{
    public Task<EventoSensor?> ObtenerUltimoDePlumaAsync() =>
        db.EventosSensor
            .Where(e => e.Tipo == TipoEventoSensor.Pluma)
            .OrderByDescending(e => e.Fecha)
            .FirstOrDefaultAsync();

    public void Agregar(EventoSensor evento) => db.EventosSensor.Add(evento);
}
