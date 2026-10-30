using EstacionamientoInteligente.Domain.DTOs;

namespace EstacionamientoInteligente.Application.Interfaces;

/// <summary>
/// Gestión de vehículos, pantalla 6 (CU-12 a CU-16).
/// Si el id no existe lanzan <c>ExcepcionNoEncontrado</c>; si se rompe una regla, <c>ExcepcionDominio</c>.
/// </summary>
public interface IVehiculosService
{
    /// <param name="textoPlaca">Parte de la placa escrita en el buscador; null para no filtrar.</param>
    Task<IReadOnlyList<VehiculoDto>> ListarAsync(string? textoPlaca, FiltroVehiculos filtro);

    /// <summary>Valida la placa, que no esté repetida y, si viene, que exista el correo del dueño.</summary>
    Task<VehiculoDto> DarDeAltaAsync(AltaVehiculoRequest request);

    Task<VehiculoDto> DarDeBajaAsync(Guid id);

    Task<VehiculoDto> ReactivarAsync(Guid id);

    /// <summary>Corrige una "placa no legible" y atiende su alerta pendiente.</summary>
    Task<VehiculoDto> CorregirPlacaAsync(Guid id, CorregirPlacaRequest request);
}
