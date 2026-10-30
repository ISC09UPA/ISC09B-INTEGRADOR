using EstacionamientoInteligente.Domain.DTOs;

namespace EstacionamientoInteligente.Application.Interfaces;

/// <summary>Alertas del administrador (CU-24, CU-25 y CU-26).</summary>
public interface IAlertasService
{
    /// <summary>De la más reciente a la más antigua.</summary>
    Task<IReadOnlyList<AlertaDto>> ListarAsync(bool soloPendientes);

    /// <summary>Lanza <c>ExcepcionNoEncontrado</c> si la alerta no existe.</summary>
    /// <param name="administradorId">Quién la atendió (id del token).</param>
    Task AtenderAsync(Guid id, Guid administradorId);

    /// <summary>
    /// Proceso automático (cada minuto): crea la alerta "auto sin cajón" para los que llevan
    /// <c>ReglasAcceso.TiempoMaximoSinCajon</c> dentro sin estacionarse, una sola vez por vehículo.
    /// </summary>
    Task RevisarAutosSinCajonAsync();
}
