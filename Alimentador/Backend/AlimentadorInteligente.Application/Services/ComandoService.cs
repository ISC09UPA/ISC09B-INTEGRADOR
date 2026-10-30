using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Exceptions;
using AlimentadorInteligente.Application.Interfaces;
using AlimentadorInteligente.Domain.Entities;
using AlimentadorInteligente.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Application.Services;

public class ComandoService(
    IAppDbContext db, IUsuarioActual usuario, IAccesoAlimentador acceso, INotificadorTiempoReal notificador) : IComandoService
{
    /// <summary>Dispensado manual desde la app (RF-11). Dueño y Cuidador pueden hacerlo.</summary>
    public async Task<ComandoDto> DispensarAsync(int alimentadorId, DispensarRequest request, CancellationToken ct = default)
    {
        await acceso.RequerirAccesoAsync(alimentadorId, ct);
        var alimentador = await db.Alimentadores.Include(a => a.Gateway)
            .FirstOrDefaultAsync(a => a.Id == alimentadorId, ct)
            ?? throw new NoEncontradoException("Alimentador", alimentadorId);

        if (!alimentador.Estado().DispensadoRemotoDisponible)
            throw new ReglaNegocioException("El alimentador está sin conexión; el dispensado remoto no está disponible.");

        if (request.MascotaId is not null &&
            !await db.Mascotas.AnyAsync(m => m.Id == request.MascotaId && m.AlimentadorId == alimentadorId, ct))
            throw new NoEncontradoException("Mascota", request.MascotaId);

        var comando = new Comando
        {
            AlimentadorId = alimentadorId,
            SolicitadoPorId = usuario.Id,
            Tipo = TipoComando.Dispensar,
            Gramos = request.Gramos,
            MascotaId = request.MascotaId
        };
        db.Comandos.Add(comando);
        await db.SaveChangesAsync(ct);

        var dto = comando.ADto();
        await notificador.ComandoActualizadoAsync(alimentadorId, dto, ct);
        return dto;
    }

    public async Task<IReadOnlyList<ComandoDto>> ListarAsync(int alimentadorId, CancellationToken ct = default)
    {
        await acceso.RequerirAccesoAsync(alimentadorId, ct);
        var comandos = await db.Comandos.AsNoTracking()
            .Where(c => c.AlimentadorId == alimentadorId)
            .OrderByDescending(c => c.CreadoEn)
            .Take(50)
            .ToListAsync(ct);
        return comandos.Select(c => c.ADto()).ToList();
    }
}
