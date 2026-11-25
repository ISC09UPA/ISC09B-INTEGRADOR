using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.Interfaces;

public interface IProveedorRepository
{
    Task<Proveedor?> ObtenerPorIdAsync(int id, CancellationToken ct = default);
    Task<List<Proveedor>> ListarAsync(CancellationToken ct = default);
}
