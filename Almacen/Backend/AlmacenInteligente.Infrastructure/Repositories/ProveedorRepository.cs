using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Entities;
using AlmacenInteligente.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlmacenInteligente.Infrastructure.Repositories;

public class ProveedorRepository(AlmacenDbContext db) : IProveedorRepository
{
    public Task<Proveedor?> ObtenerPorIdAsync(int id, CancellationToken ct = default) =>
        db.Proveedores.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<List<Proveedor>> ListarAsync(CancellationToken ct = default) =>
        db.Proveedores.AsNoTracking().OrderBy(p => p.Nombre).ToListAsync(ct);
}
