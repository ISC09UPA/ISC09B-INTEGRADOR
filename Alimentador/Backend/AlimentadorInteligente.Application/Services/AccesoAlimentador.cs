using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Application.Exceptions;
using AlimentadorInteligente.Application.Interfaces;
using AlimentadorInteligente.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Application.Services;

public class AccesoAlimentador(IAppDbContext db, IUsuarioActual usuario) : IAccesoAlimentador
{
    public async Task<RolAlimentador> RequerirAccesoAsync(int alimentadorId, CancellationToken ct = default)
    {
        var miembro = await db.MiembrosAlimentador.AsNoTracking()
            .FirstOrDefaultAsync(m => m.AlimentadorId == alimentadorId && m.UsuarioId == usuario.Id, ct);
        return miembro?.Rol ?? throw new ProhibidoException();
    }

    public async Task RequerirDuenoAsync(int alimentadorId, CancellationToken ct = default)
    {
        if (await RequerirAccesoAsync(alimentadorId, ct) != RolAlimentador.Dueno)
            throw new ProhibidoException("Solo el dueño puede modificar la configuración.");
    }
}
