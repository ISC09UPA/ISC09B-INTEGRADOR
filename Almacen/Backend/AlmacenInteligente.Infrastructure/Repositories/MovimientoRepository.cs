using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Entities;
using AlmacenInteligente.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlmacenInteligente.Infrastructure.Repositories;

public class MovimientoRepository(AlmacenDbContext db) : IMovimientoRepository
{
    public async Task AgregarAsync(Movimiento movimiento, CancellationToken ct = default) =>
        await db.Movimientos.AddAsync(movimiento, ct);

    public Task<Movimiento?> ObtenerPorIdAsync(long id, CancellationToken ct = default) =>
        db.Movimientos
            .AsNoTracking()
            .Include(m => m.Producto)
            .Include(m => m.Usuario)
            .FirstOrDefaultAsync(m => m.Id == id, ct);

    public Task<List<Movimiento>> ListarAsync(string? productoId, int? usuarioId, int limite, CancellationToken ct = default)
    {
        var consulta = db.Movimientos
            .AsNoTracking()
            .Include(m => m.Producto)
            .Include(m => m.Usuario)
            .AsQueryable();

        if (productoId is not null)
            consulta = consulta.Where(m => m.ProductoId == productoId);
        if (usuarioId is not null)
            consulta = consulta.Where(m => m.UsuarioId == usuarioId);

        return consulta
            .OrderByDescending(m => m.FechaHora)
            .ThenByDescending(m => m.Id)
            .Take(limite)
            .ToListAsync(ct);
    }

    public Task GuardarCambiosAsync(CancellationToken ct = default) =>
        db.SaveChangesAsync(ct);
}
