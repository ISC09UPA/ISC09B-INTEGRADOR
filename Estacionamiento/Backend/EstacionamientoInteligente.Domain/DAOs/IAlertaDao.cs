using EstacionamientoInteligente.Domain.Enums;
using EstacionamientoInteligente.Domain.Models;

namespace EstacionamientoInteligente.Domain.DAOs;

/// <summary>Acceso a la tabla de alertas del administrador.</summary>
public interface IAlertaDao
{
    /// <summary>De la más reciente a la más antigua.</summary>
    /// <param name="soloPendientes">True para traer solo las que no se han atendido.</param>
    Task<IReadOnlyList<Alerta>> ListarAsync(bool soloPendientes);

    Task<Alerta?> ObtenerPorIdAsync(Guid id);

    /// <summary>
    /// Evita repetir la misma alerta: por ejemplo, "auto sin cajón" se revisa cada minuto
    /// y solo debe avisar una vez por vehículo.
    /// </summary>
    Task<bool> ExistePendienteAsync(TipoAlerta tipo, Guid vehiculoId);

    /// <summary>Para el panel: "entradas negadas hoy" son las alertas de ese tipo en el día.</summary>
    Task<int> ContarAsync(TipoAlerta tipo, DateTime desde, DateTime hasta);

    void Agregar(Alerta alerta);
}
