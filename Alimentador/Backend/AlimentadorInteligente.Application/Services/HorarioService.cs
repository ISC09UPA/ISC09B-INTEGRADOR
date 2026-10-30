using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Exceptions;
using AlimentadorInteligente.Application.Interfaces;
using AlimentadorInteligente.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Application.Services;

public class HorarioService(IAppDbContext db, IAccesoAlimentador acceso) : IHorarioService
{
    public async Task<IReadOnlyList<HorarioDto>> ListarAsync(int alimentadorId, CancellationToken ct = default)
    {
        await acceso.RequerirAccesoAsync(alimentadorId, ct);
        var horarios = await db.Horarios.AsNoTracking()
            .Where(h => h.AlimentadorId == alimentadorId)
            .OrderBy(h => h.Hora)
            .ToListAsync(ct);
        return horarios.Select(h => h.ADto()).ToList();
    }

    public async Task<HorarioDto> CrearAsync(int alimentadorId, GuardarHorarioRequest request, CancellationToken ct = default)
    {
        await acceso.RequerirDuenoAsync(alimentadorId, ct);
        var alimentador = await db.Alimentadores.FindAsync([alimentadorId], ct)
            ?? throw new NoEncontradoException("Alimentador", alimentadorId);
        await ValidarMascotaAsync(alimentadorId, request.MascotaId, ct);

        var horario = new Horario
        {
            AlimentadorId = alimentadorId,
            MascotaId = request.MascotaId,
            Hora = request.Hora,
            Activo = request.Activo
        };
        db.Horarios.Add(horario);
        alimentador.VersionConfiguracion++;
        await db.SaveChangesAsync(ct);
        return horario.ADto();
    }

    public async Task<HorarioDto> ActualizarAsync(int id, GuardarHorarioRequest request, CancellationToken ct = default)
    {
        var horario = await CargarAsync(id, ct);
        await acceso.RequerirDuenoAsync(horario.AlimentadorId, ct);
        await ValidarMascotaAsync(horario.AlimentadorId, request.MascotaId, ct);

        horario.MascotaId = request.MascotaId;
        horario.Hora = request.Hora;
        horario.Activo = request.Activo;
        horario.Alimentador.VersionConfiguracion++;
        await db.SaveChangesAsync(ct);
        return horario.ADto();
    }

    public async Task EliminarAsync(int id, CancellationToken ct = default)
    {
        var horario = await CargarAsync(id, ct);
        await acceso.RequerirDuenoAsync(horario.AlimentadorId, ct);
        horario.Alimentador.VersionConfiguracion++;
        db.Horarios.Remove(horario);
        await db.SaveChangesAsync(ct);
    }

    private async Task<Horario> CargarAsync(int id, CancellationToken ct)
        => await db.Horarios.Include(h => h.Alimentador).FirstOrDefaultAsync(h => h.Id == id, ct)
           ?? throw new NoEncontradoException("Horario", id);

    private async Task ValidarMascotaAsync(int alimentadorId, int? mascotaId, CancellationToken ct)
    {
        if (mascotaId is null) return;
        if (!await db.Mascotas.AnyAsync(m => m.Id == mascotaId && m.AlimentadorId == alimentadorId, ct))
            throw new NoEncontradoException("Mascota", mascotaId);
    }
}
