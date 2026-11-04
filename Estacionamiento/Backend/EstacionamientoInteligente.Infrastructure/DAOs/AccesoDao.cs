using EstacionamientoInteligente.Domain.DAOs;
using EstacionamientoInteligente.Domain.Models;
using EstacionamientoInteligente.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EstacionamientoInteligente.Infrastructure.DAOs;

/// <summary>
/// Consultas a la tabla <c>Accesos</c>. Un acceso está abierto mientras <c>hora_salida</c> es NULL.
/// Todas las consultas traen el vehículo (con su dueño) y el cajón.
/// </summary>
public class AccesoDao(EstacionamientoDbContext db) : IAccesoDao
{
    private IQueryable<Acceso> AccesosCompletos =>
        db.Accesos
            .Include(a => a.Vehiculo).ThenInclude(v => v.Usuario)
            .Include(a => a.Cajon);

    // ---- Pluma ----

    public Task<Acceso?> ObtenerAbiertoDeVehiculoAsync(Guid vehiculoId) =>
        AccesosCompletos
            .Where(a => a.VehiculoId == vehiculoId && a.HoraSalida == null)
            .OrderByDescending(a => a.HoraEntrada)
            .FirstOrDefaultAsync();

    /// <summary>El de entrada más reciente; su último paso es <c>HoraSalida ?? HoraEntrada</c>.</summary>
    public Task<Acceso?> ObtenerUltimoDeVehiculoAsync(Guid vehiculoId) =>
        AccesosCompletos
            .Where(a => a.VehiculoId == vehiculoId)
            .OrderByDescending(a => a.HoraEntrada)
            .FirstOrDefaultAsync();

    // ---- Sensores de cajón ----

    public async Task<IReadOnlyList<Acceso>> ObtenerEnTransitoAsync() =>
        await AccesosCompletos
            .Where(a => a.HoraSalida == null && !a.Estacionado)
            .OrderByDescending(a => a.SinCajonDesde ?? a.HoraEntrada)
            .ToListAsync();

    public Task<Acceso?> ObtenerAbiertoEnCajonAsync(Guid cajonId) =>
        AccesosCompletos
            .Where(a => a.CajonId == cajonId && a.Estacionado && a.HoraSalida == null)
            .OrderByDescending(a => a.HoraEntrada)
            .FirstOrDefaultAsync();

    public async Task<IReadOnlyList<Acceso>> ObtenerAbiertosAsync() =>
        await AccesosCompletos
            .Where(a => a.HoraSalida == null)
            .OrderBy(a => a.HoraEntrada)
            .ToListAsync();

    // ---- Usuario ----

    public Task<Acceso?> ObtenerAbiertoDeUsuarioAsync(Guid usuarioId) =>
        AccesosCompletos
            .Where(a => a.Vehiculo.UsuarioId == usuarioId && a.HoraSalida == null)
            .OrderByDescending(a => a.HoraEntrada)
            .FirstOrDefaultAsync();

    public async Task<IReadOnlyList<Acceso>> ObtenerDeUsuarioAsync(Guid usuarioId, DateTime? desde, DateTime? hasta)
    {
        var consulta = AccesosCompletos.Where(a => a.Vehiculo.UsuarioId == usuarioId);

        if (desde is { } inicio)
            consulta = consulta.Where(a => a.HoraEntrada >= inicio);
        if (hasta is { } fin)
            consulta = consulta.Where(a => a.HoraEntrada < fin);

        return await consulta
            .OrderByDescending(a => a.HoraEntrada)
            .ToListAsync();
    }

    // ---- Estadísticas ----

    public async Task<IReadOnlyList<Acceso>> ObtenerEntreFechasAsync(DateTime desde, DateTime hasta) =>
        await AccesosCompletos
            .Where(a => a.HoraEntrada >= desde && a.HoraEntrada < hasta)
            .OrderBy(a => a.HoraEntrada)
            .ToListAsync();

    public void Agregar(Acceso acceso) => db.Accesos.Add(acceso);
}
