using AlmacenInteligente.Application.Common;
using AlmacenInteligente.Application.DTOs;

namespace AlmacenInteligente.Application.Interfaces;

public interface IEspacioService
{
    Task<List<EspacioDto>> ListarAsync(string? anaquelId, CancellationToken ct = default);
    Task<Resultado<EspacioDto>> ActualizarAsync(string id, ActualizarEspacioDto dto, CancellationToken ct = default);
}
