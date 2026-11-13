using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Constantes;
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
            .ThenByDescending(m => m.Id)
            .FirstOrDefaultAsync(ct);

    // Último movimiento de cada producto: aquel para el que no existe otro más reciente del mismo producto.
    public async Task<Dictionary<string, Movimiento>> ObtenerUltimosMovimientosAsync(CancellationToken ct = default)
    {
        var ultimos = await db.Movimientos
            .AsNoTracking()
            .Where(m => !db.Movimientos.Any(o =>
                o.ProductoId == m.ProductoId &&
                (o.FechaHora > m.FechaHora || (o.FechaHora == m.FechaHora && o.Id > m.Id))))
            .ToListAsync(ct);

        return ultimos.ToDictionary(m => m.ProductoId);
    }

    public Task<Dictionary<string, int>> ObtenerSalidasDesdeAsync(DateTime desdeUtc, CancellationToken ct = default) =>
        db.Movimientos
            .AsNoTracking()
            .Where(m => m.TipoMovimiento == TiposMovimiento.Salida && m.FechaHora >= desdeUtc)
            .GroupBy(m => m.ProductoId)
            .Select(g => new { ProductoId = g.Key, Total = g.Sum(m => m.Cantidad) })
            .ToDictionaryAsync(x => x.ProductoId, x => x.Total, ct);

    public Task<int> ObtenerSalidasProductoDesdeAsync(string productoId, DateTime desdeUtc, CancellationToken ct = default) =>
        db.Movimientos
            .Where(m => m.ProductoId == productoId && m.TipoMovimiento == TiposMovimiento.Salida && m.FechaHora >= desdeUtc)
            .SumAsync(m => m.Cantidad, ct);

    public Task<List<string>> ObtenerIdsConPrefijoAsync(string prefijo, CancellationToken ct = default) =>
        db.Productos
            .Where(p => p.Id.StartsWith(prefijo))
            .Select(p => p.Id)
            .ToListAsync(ct);

    public Task<bool> ExisteAsync(string id, CancellationToken ct = default) =>
        db.Productos.AnyAsync(p => p.Id == id, ct);

    public Task<bool> EtiquetaEnUsoAsync(string etiquetaVision, CancellationToken ct = default) =>
        db.Productos.AnyAsync(p => p.EtiquetaVision == etiquetaVision, ct);

    public async Task AgregarAsync(Producto producto, CancellationToken ct = default) =>
        await db.Productos.AddAsync(producto, ct);

    public Task GuardarCambiosAsync(CancellationToken ct = default) =>
        db.SaveChangesAsync(ct);
}
