using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Entities;
using AlmacenInteligente.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlmacenInteligente.Infrastructure.Repositories;

public class EspacioRepository(AlmacenDbContext db) : IEspacioRepository
{
    public Task<List<Espacio>> ListarAsync(string? anaquelId, CancellationToken ct = default)
    {
        var consulta = db.Espacios
            .AsNoTracking()
            .Include(e => e.Producto)
            .AsQueryable();

        if (anaquelId is not null)
            consulta = consulta.Where(e => e.AnaquelId == anaquelId);

        return consulta.OrderBy(e => e.Id).ToListAsync(ct);
    }

    public Task<Espacio?> ObtenerPorIdAsync(string id, CancellationToken ct = default) =>
        db.Espacios
            .Include(e => e.Producto)
            .FirstOrDefaultAsync(e => e.Id == id, ct);

    public Task GuardarCambiosAsync(CancellationToken ct = default) =>
        db.SaveChangesAsync(ct);
}
