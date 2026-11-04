using EstacionamientoInteligente.Domain.DAOs;
using EstacionamientoInteligente.Domain.Enums;
using EstacionamientoInteligente.Domain.Models;
using EstacionamientoInteligente.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EstacionamientoInteligente.Infrastructure.DAOs;

/// <summary>Consultas a la tabla <c>Cajones</c>.</summary>
public class CajonDao(EstacionamientoDbContext db) : ICajonDao
{
    public async Task<IReadOnlyList<Cajon>> ObtenerTodosAsync() =>
        await db.Cajones
            .OrderBy(c => c.Numero)
            .ToListAsync();

    public Task<Cajon?> ObtenerPorNumeroAsync(int numero) =>
        db.Cajones.FirstOrDefaultAsync(c => c.Numero == numero);

    public Task<int> ContarLibresAsync() =>
        db.Cajones.CountAsync(c => c.Estado == EstadoCajon.Libre);
}
