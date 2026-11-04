using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.Interfaces;

public interface IProductoRepository
{
    Task<List<Producto>> ObtenerActivosAsync(CancellationToken ct = default);
    Task<Producto?> ObtenerPorIdAsync(string id, CancellationToken ct = default);
    Task<Movimiento?> ObtenerUltimoMovimientoAsync(string productoId, CancellationToken ct = default);
    Task<bool> ExisteAsync(string id, CancellationToken ct = default);
    Task<bool> EtiquetaEnUsoAsync(string etiquetaVision, CancellationToken ct = default);
    Task AgregarAsync(Producto producto, CancellationToken ct = default);
    Task GuardarCambiosAsync(CancellationToken ct = default);
}
