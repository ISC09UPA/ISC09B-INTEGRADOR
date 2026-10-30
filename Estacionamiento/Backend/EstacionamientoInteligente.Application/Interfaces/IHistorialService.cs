using EstacionamientoInteligente.Domain.DTOs;

namespace EstacionamientoInteligente.Application.Interfaces;

/// <summary>Historial del usuario (CU-06 a CU-08). Todos reciben el id del token.</summary>
public interface IHistorialService
{
    /// <summary>Null si el usuario no tiene ningún auto dentro.</summary>
    Task<AccesoActualDto?> ObtenerActualAsync(Guid usuarioId);

    /// <summary>Del más reciente al más antiguo.</summary>
    Task<IReadOnlyList<HistorialItemDto>> ListarAsync(Guid usuarioId, PeriodoHistorial periodo);

    /// <param name="mes">Formato "2026-10"; null para el mes actual. Lanza <c>ExcepcionDominio</c> si no tiene ese formato.</param>
    Task<ResumenMesDto> ObtenerResumenMesAsync(Guid usuarioId, string? mes);
}
