using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Application.DTOs;
using AlimentadorInteligente.Application.Exceptions;
using AlimentadorInteligente.Application.Interfaces;
using AlimentadorInteligente.Domain.Services;
using Microsoft.EntityFrameworkCore;

namespace AlimentadorInteligente.Application.Services;

public class HistorialService(IAppDbContext db, IAccesoAlimentador acceso) : IHistorialService
{
    public async Task<IReadOnlyList<VisitaDto>> ListarVisitasAsync(
        int mascotaId, DateTimeOffset? desde, DateTimeOffset? hasta, CancellationToken ct = default)
    {
        var mascota = await db.Mascotas.AsNoTracking().FirstOrDefaultAsync(m => m.Id == mascotaId, ct)
            ?? throw new NoEncontradoException("Mascota", mascotaId);
        await acceso.RequerirAccesoAsync(mascota.AlimentadorId, ct);

        var query = db.Visitas.AsNoTracking().Where(v => v.MascotaId == mascotaId);
        if (desde is not null) query = query.Where(v => v.IniciadaEn >= desde);
        if (hasta is not null) query = query.Where(v => v.IniciadaEn < hasta);

        var visitas = await query.OrderByDescending(v => v.IniciadaEn).Take(500).ToListAsync(ct);
        return visitas.Select(v => v.ADto()).ToList();
    }

    public async Task<IReadOnlyList<ConsumoDiarioDto>> ConsumoDiarioAsync(
        int mascotaId, DateOnly desde, DateOnly hasta, CancellationToken ct = default)
    {
        var mascota = await db.Mascotas.AsNoTracking().Include(m => m.Alimentador)
            .FirstOrDefaultAsync(m => m.Id == mascotaId, ct)
            ?? throw new NoEncontradoException("Mascota", mascotaId);
        await acceso.RequerirAccesoAsync(mascota.AlimentadorId, ct);

        // TODO: agrupar por día en la zona horaria del alimentador; por ahora se usa UTC.
        var inicio = new DateTimeOffset(desde.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var fin = new DateTimeOffset(hasta.AddDays(1).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var visitas = await db.Visitas.AsNoTracking()
            .Where(v => v.MascotaId == mascotaId && v.IniciadaEn >= inicio && v.IniciadaEn < fin)
            .Select(v => new { v.IniciadaEn, v.DispensadoG, v.ConsumidoG })
            .ToListAsync(ct);

        // TODO: guardar la ración recomendada de cada día; hoy se usa la actual para todo el rango.
        var recomendado = Math.Round(CalculadoraRacion.GramosPorDia(mascota, mascota.Alimentador.KcalPorGramo), 1);
        var porDia = visitas.GroupBy(v => DateOnly.FromDateTime(v.IniciadaEn.UtcDateTime))
            .ToDictionary(g => g.Key, g => g.ToList());

        var resultado = new List<ConsumoDiarioDto>();
        for (var dia = desde; dia <= hasta; dia = dia.AddDays(1))
        {
            var delDia = porDia.GetValueOrDefault(dia) ?? [];
            resultado.Add(new ConsumoDiarioDto(
                dia, recomendado, Math.Round(delDia.Sum(v => v.DispensadoG), 1),
                Math.Round(delDia.Sum(v => v.ConsumidoG), 1), delDia.Count));
        }
        return resultado;
    }
}
