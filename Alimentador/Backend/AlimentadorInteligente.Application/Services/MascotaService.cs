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
            .Where(m => m.AlimentadorId == alimentadorId)
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
        var alimentador = await db.Alimentadores.Include(a => a.Mascotas)
            .FirstOrDefaultAsync(a => a.Id == alimentadorId, ct)
            ?? throw new NoEncontradoException("Alimentador", alimentadorId);

        if (alimentador.Mascotas.Count >= Alimentador.MaxMascotas)
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
        await db.Mascotas.Where(m => m.AlimentadorId == mascota.AlimentadorId).LoadAsync(ct);

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
        mascota.Alimentador.VersionConfiguracion++;
        db.Mascotas.Remove(mascota);
        await db.SaveChangesAsync(ct);
    }

    private async Task<Mascota> CargarAsync(int id, CancellationToken ct)
        => await db.Mascotas.Include(m => m.Alimentador).FirstOrDefaultAsync(m => m.Id == id, ct)
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
        var mismaEspecie = alimentador.Mascotas
            .Where(m => m.Especie == mascota.Especie && m != mascota)
            .ToList();
        if (mismaEspecie.Count == 0) return;

        if (mascota.EtiquetaRfid is null || mismaEspecie.Any(m => m.EtiquetaRfid is null))
            throw new ReglaNegocioException("Con dos mascotas de la misma especie, cada una necesita etiqueta RFID.");
        if (mismaEspecie.Any(m => m.EtiquetaRfid == mascota.EtiquetaRfid))
            throw new ConflictoException("La etiqueta RFID ya está asignada a otra mascota.");
    }
}
