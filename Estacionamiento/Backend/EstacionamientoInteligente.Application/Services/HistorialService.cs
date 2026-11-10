using System.Globalization;
using EstacionamientoInteligente.Application.Comun;
using EstacionamientoInteligente.Application.Interfaces;
using EstacionamientoInteligente.Domain.Comun;
using EstacionamientoInteligente.Domain.DAOs;
using EstacionamientoInteligente.Domain.DTOs;
using EstacionamientoInteligente.Domain.Models;

namespace EstacionamientoInteligente.Application.Services;

/// <summary>Historial del usuario, pantalla 4 (CU-06 a CU-08). Todos reciben el id del token.</summary>
public class HistorialService(IAccesoDao accesos, TimeProvider reloj) : IHistorialService
{
    public async Task<AccesoActualDto?> ObtenerActualAsync(Guid usuarioId)
    {
        var acceso = await accesos.ObtenerAbiertoDeUsuarioAsync(usuarioId);
        if (acceso is null)
            return null;

        return new AccesoActualDto(
            acceso.Id,
            // Si ya entró pero aún no se estaciona (o está cambiando de lugar), no hay cajón.
            acceso.Estacionado ? acceso.Cajon?.Numero : null,
            acceso.Vehiculo.Placa?.Valor,
            acceso.HoraEntrada,
            Minutos(acceso));
    }

    public async Task<IReadOnlyList<HistorialItemDto>> ListarAsync(Guid usuarioId, PeriodoHistorial periodo)
    {
        // Semana y Mes son los últimos 7 y 30 días contados desde ahora.
        DateTime? desde = periodo switch
        {
            PeriodoHistorial.Semana => Ahora().AddDays(-7),
            PeriodoHistorial.Mes => Ahora().AddDays(-30),
            _ => null
        };

        var lista = await accesos.ObtenerDeUsuarioAsync(usuarioId, desde, hasta: null);

        return lista
            .Select(a => new HistorialItemDto(
                a.Id,
                a.HoraEntrada,
                a.HoraSalida,
                a.Cajon?.Numero,   // Último cajón donde se estacionó.
                a.Vehiculo.Placa?.Valor,
                Minutos(a),
                EnCurso: a.EstaAbierto))
            .ToList();
    }

    public async Task<ResumenMesDto> ObtenerResumenMesAsync(Guid usuarioId, string? mes)
    {
        var (anio, numeroMes) = LeerMes(mes);
        var (desde, hasta) = HoraLocal.RangoMesUtc(anio, numeroMes);

        var lista = await accesos.ObtenerDeUsuarioAsync(usuarioId, desde, hasta);

        // El promedio solo cuenta estancias terminadas; una en curso todavía no tiene su duración real.
        var terminadas = lista.Where(a => !a.EstaAbierto).ToList();
        var promedio = terminadas.Count == 0
            ? 0
            : (int)Math.Round(terminadas.Average(a => Minutos(a)));

        // Cajón más usado; si hay empate, el de número menor.
        int? cajonFrecuente = lista
            .Where(a => a.Cajon is not null)
            .GroupBy(a => a.Cajon!.Numero)
            .OrderByDescending(g => g.Count())
            .ThenBy(g => g.Key)
            .Select(g => (int?)g.Key)
            .FirstOrDefault();

        return new ResumenMesDto($"{anio:D4}-{numeroMes:D2}", lista.Count, promedio, cajonFrecuente);
    }

    /// <summary>"2026-10" → (2026, 10). Null = mes actual en hora local.</summary>
    private (int Anio, int Mes) LeerMes(string? mes)
    {
        if (string.IsNullOrWhiteSpace(mes))
        {
            var hoy = HoraLocal.ALocal(Ahora());
            return (hoy.Year, hoy.Month);
        }

        if (!DateTime.TryParseExact(mes.Trim(), "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out var fecha))
            throw new ExcepcionDominio($"'{mes}' no es un mes válido. Usa el formato AAAA-MM, por ejemplo 2026-10.");

        return (fecha.Year, fecha.Month);
    }

    private DateTime Ahora() => reloj.GetUtcNow().UtcDateTime;

    private int Minutos(Acceso a) => (int)a.Duracion(Ahora()).TotalMinutes;
}
