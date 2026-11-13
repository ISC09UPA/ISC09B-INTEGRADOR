using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.Interfaces;

public interface IEspacioRepository
{
    Task<List<Espacio>> ListarAsync(string? anaquelId, CancellationToken ct = default);
    Task<Espacio?> ObtenerPorIdAsync(string id, CancellationToken ct = default);
    Task GuardarCambiosAsync(CancellationToken ct = default);
}
