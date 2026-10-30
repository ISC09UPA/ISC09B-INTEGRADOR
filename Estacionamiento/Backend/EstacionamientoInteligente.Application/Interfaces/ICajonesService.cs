using EstacionamientoInteligente.Domain.DTOs;

namespace EstacionamientoInteligente.Application.Interfaces;

/// <summary>Mapa, detalle de cajón y lecturas de los sensores IR (CU-04, CU-05 y CU-21).</summary>
public interface ICajonesService
{
    /// <param name="usuarioId">Para marcar con <c>EsMio</c> el cajón de su auto.</param>
    Task<MapaCajonesDto> ObtenerMapaAsync(Guid usuarioId);

    /// <summary>
    /// Un usuario solo ve los datos del vehículo si el auto es suyo; el administrador ve todos.
    /// Lanza <c>ExcepcionNoEncontrado</c> si el cajón no existe y <c>ExcepcionAccesoDenegado</c>
    /// si un usuario pide un cajón ocupado por un auto que no es suyo.
    /// </summary>
    Task<DetalleCajonDto> ObtenerDetalleAsync(int numero, Guid usuarioId, bool esAdministrador);

    /// <summary>
    /// Un sensor IR cambió. Si se ocupó, asigna el cajón al auto en tránsito más reciente;
    /// si se liberó, el acceso sigue abierto como "sin cajón".
    /// Lo llaman la maqueta (Service Bus) y la simulación.
    /// </summary>
    Task RegistrarCambioSensorAsync(int numero, bool ocupado, DateTime fecha);
}
