using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.Interfaces;

public interface IPedidoRepository
{
    // estado null = todos. Los más recientes primero, con producto, proveedor y usuario.
    Task<List<Pedido>> ListarAsync(string? estado, int limite, CancellationToken ct = default);

    // Con seguimiento de cambios, con producto (y sus espacios), proveedor y usuario.
    Task<Pedido?> ObtenerPorIdAsync(long id, CancellationToken ct = default);

    Task<bool> ExisteSolicitadoAsync(string productoId, CancellationToken ct = default);

    void Agregar(Pedido pedido);
    Task GuardarCambiosAsync(CancellationToken ct = default);
}
