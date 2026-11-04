using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Entities;
using AlmacenInteligente.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlmacenInteligente.Infrastructure.Repositories;

public class ProductoRepository(AlmacenDbContext db) : IProductoRepository
{
    public Task<List<Producto>> ObtenerActivosAsync(CancellationToken ct = default) =>
        db.Productos
            .AsNoTracking()
            .Include(p => p.Espacios)
            .Where(p => p.Activo)
            .OrderBy(p => p.Id)
            .ToListAsync(ct);

    public Task<Producto?> ObtenerPorIdAsync(string id, CancellationToken ct = default) =>
        db.Productos
            .Include(p => p.Espacios)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<Movimiento?> ObtenerUltimoMovimientoAsync(string productoId, CancellationToken ct = default) =>
        db.Movimientos
            .AsNoTracking()
            .Where(m => m.ProductoId == productoId)
            .OrderByDescending(m => m.FechaHora)
            .FirstOrDefaultAsync(ct);

    public Task<bool> ExisteAsync(string id, CancellationToken ct = default) =>
        db.Productos.AnyAsync(p => p.Id == id, ct);

    public Task<bool> EtiquetaEnUsoAsync(string etiquetaVision, CancellationToken ct = default) =>
        db.Productos.AnyAsync(p => p.EtiquetaVision == etiquetaVision, ct);

    public async Task AgregarAsync(Producto producto, CancellationToken ct = default) =>
        await db.Productos.AddAsync(producto, ct);

    public Task GuardarCambiosAsync(CancellationToken ct = default) =>
        db.SaveChangesAsync(ct);
}
