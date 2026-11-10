using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Exceptions;
using AlimentadorInteligente.Application.Interfaces;
using AlimentadorInteligente.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Application.Services;

public class MascotaService(IAppDbContext db, IAccesoAlimentador acceso) : IMascotaService
{
    public async Task<IReadOnlyList<MascotaDto>> ListarAsync(int alimentadorId, CancellationToken ct = default)
    {
        await acceso.RequerirAccesoAsync(alimentadorId, ct);
        var mascotas = await db.Mascotas.AsNoTracking().Include(m => m.Alimentador)
            .Where(m => m.AlimentadorId == alimentadorId && m.Activa)
            .OrderBy(m => m.Nombre)
            .ToListAsync(ct);
        return mascotas.Select(m => m.ADto(m.Alimentador.KcalPorGramo)).ToList();
    }

    public async Task<MascotaDto> ObtenerAsync(int id, CancellationToken ct = default)
    {
        var mascota = await CargarAsync(id, ct);
        await acceso.RequerirAccesoAsync(mascota.AlimentadorId, ct);
        return mascota.ADto(mascota.Alimentador.KcalPorGramo);
    }

    public async Task<MascotaDto> CrearAsync(int alimentadorId, GuardarMascotaRequest request, CancellationToken ct = default)
    {
        await acceso.RequerirDuenoAsync(alimentadorId, ct);
        var alimentador = await db.Alimentadores.Include(a => a.Mascotas.Where(m => m.Activa))
            .FirstOrDefaultAsync(a => a.Id == alimentadorId, ct)
            ?? throw new NoEncontradoException("Alimentador", alimentadorId);

        if (alimentador.Mascotas.Count(m => m.Activa) >= Alimentador.MaxMascotas)
            throw new ReglaNegocioException($"Un alimentador admite hasta {Alimentador.MaxMascotas} mascotas.");

        var mascota = new Mascota { AlimentadorId = alimentadorId, Alimentador = alimentador };
        Aplicar(mascota, request);
        ValidarRfid(alimentador, mascota);

        db.Mascotas.Add(mascota);
        alimentador.VersionConfiguracion++;
        await db.SaveChangesAsync(ct);
        return mascota.ADto(alimentador.KcalPorGramo);
    }

    public async Task<MascotaDto> ActualizarAsync(int id, GuardarMascotaRequest request, CancellationToken ct = default)
    {
        var mascota = await CargarAsync(id, ct);
        await acceso.RequerirDuenoAsync(mascota.AlimentadorId, ct);
        await db.Mascotas.Where(m => m.AlimentadorId == mascota.AlimentadorId && m.Activa).LoadAsync(ct);

        Aplicar(mascota, request);
        ValidarRfid(mascota.Alimentador, mascota);
        mascota.Alimentador.VersionConfiguracion++;
        await db.SaveChangesAsync(ct);
        return mascota.ADto(mascota.Alimentador.KcalPorGramo);
    }

    public async Task EliminarAsync(int id, CancellationToken ct = default)
    {
        var mascota = await CargarAsync(id, ct);
        await acceso.RequerirDuenoAsync(mascota.AlimentadorId, ct);

        // Baja lógica: las visitas se conservan y la etiqueta queda libre para otra mascota
        mascota.Activa = false;
        mascota.EtiquetaRfid = null;
        db.Horarios.RemoveRange(await db.Horarios.Where(h => h.MascotaId == id).ToListAsync(ct));
        mascota.Alimentador.VersionConfiguracion++;
        await db.SaveChangesAsync(ct);
    }

    private async Task<Mascota> CargarAsync(int id, CancellationToken ct)
        => await db.Mascotas.Include(m => m.Alimentador).FirstOrDefaultAsync(m => m.Id == id && m.Activa, ct)
           ?? throw new NoEncontradoException("Mascota", id);

    private static void Aplicar(Mascota m, GuardarMascotaRequest r)
    {
        m.Nombre = r.Nombre.Trim();
        m.Especie = r.Especie;
        m.PesoKg = r.PesoKg;
        m.EdadMeses = r.EdadMeses;
        m.NivelActividad = r.NivelActividad;
        m.Esterilizado = r.Esterilizado;
        m.ComidasPorDia = r.ComidasPorDia;
        m.EtiquetaRfid = string.IsNullOrWhiteSpace(r.EtiquetaRfid) ? null : r.EtiquetaRfid.Trim();
    }

    /// <summary>RF-04: con dos mascotas de la misma especie, ambas necesitan RFID para distinguirse.</summary>
    private static void ValidarRfid(Alimentador alimentador, Mascota mascota)
    {
        var otras = alimentador.Mascotas.Where(m => m.Activa && m != mascota).ToList();
        if (mascota.EtiquetaRfid is not null && otras.Any(m => m.EtiquetaRfid == mascota.EtiquetaRfid))
            throw new ConflictoException("La etiqueta RFID ya está asignada a otra mascota.");

        var mismaEspecie = otras.Where(m => m.Especie == mascota.Especie).ToList();
        if (mismaEspecie.Count > 0 && (mascota.EtiquetaRfid is null || mismaEspecie.Any(m => m.EtiquetaRfid is null)))
            throw new ReglaNegocioException("Con dos mascotas de la misma especie, cada una necesita etiqueta RFID.");
    }
}
