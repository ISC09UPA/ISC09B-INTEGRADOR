using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.Interfaces;

public interface IMovimientoRepository
{
    Task AgregarAsync(Movimiento movimiento, CancellationToken ct = default);
    Task<Movimiento?> ObtenerPorIdAsync(long id, CancellationToken ct = default);
    Task<List<Movimiento>> ListarAsync(string? productoId, int? usuarioId, int limite, CancellationToken ct = default);
    Task GuardarCambiosAsync(CancellationToken ct = default);
}
