using EstacionamientoInteligente.Domain.DTOs;
using EstacionamientoInteligente.Domain.Enums;

namespace EstacionamientoInteligente.Application.Interfaces.Externos;

/// <summary>Avisos en vivo a la app (CU-27). Lo implementa la API con SignalR.</summary>
public interface INotificadorTiempoReal
{
    /// <summary>Evento <c>CajonActualizado</c>, para todos.</summary>
    Task CajonActualizadoAsync(int numero, EstadoCajon estado, int libres, int total);

    /// <summary>Evento <c>PlumaActualizada</c>, para todos.</summary>
    Task PlumaActualizadaAsync(bool abierta, DateTime fecha);

    /// <summary>Evento <c>AccesoRegistrado</c>, para los administradores y el dueño del auto.</summary>
    /// <param name="usuarioId">Dueño del auto; null si el vehículo no está ligado a una cuenta.</param>
    Task AccesoRegistradoAsync(TipoPaso tipo, string? placa, int? cajon, DateTime hora, Guid? usuarioId);

    /// <summary>Evento <c>AlertaCreada</c>, solo para los administradores.</summary>
    Task AlertaCreadaAsync(AlertaDto alerta);
}
