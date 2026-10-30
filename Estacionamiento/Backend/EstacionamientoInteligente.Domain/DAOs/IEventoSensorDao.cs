using EstacionamientoInteligente.Domain.Models;

namespace EstacionamientoInteligente.Domain.DAOs;

/// <summary>
/// Bitácora de lo que reportan la pluma y los sensores de la maqueta.
/// Solo se escribe y se consulta el último estado de la pluma.
/// </summary>
public interface IEventoSensorDao
{
    /// <summary>Último cambio de la pluma, para saber si está abierta o cerrada.</summary>
    Task<EventoSensor?> ObtenerUltimoDePlumaAsync();

    void Agregar(EventoSensor evento);
}
