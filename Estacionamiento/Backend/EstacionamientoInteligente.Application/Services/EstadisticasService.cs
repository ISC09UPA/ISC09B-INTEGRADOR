using EstacionamientoInteligente.Application.Comun;
using EstacionamientoInteligente.Application.Interfaces;
using EstacionamientoInteligente.Domain.Comun;
using EstacionamientoInteligente.Domain.DAOs;
using EstacionamientoInteligente.Domain.DTOs;
using EstacionamientoInteligente.Domain.Enums;
using EstacionamientoInteligente.Domain.Models;

namespace EstacionamientoInteligente.Application.Services;

/// <summary>
/// Panel del administrador, pantalla 5 (CU-09 a CU-11). Las fechas son días en hora de México;
/// null significa "hoy".
/// </summary>
/// <remarks>
/// "Usos" de un cajón cuenta las estancias que terminaron (o siguen) en ese cajón:
/// un acceso guarda el último cajón donde se estacionó.
/// </remarks>
public class EstadisticasService(
    ICajonDao cajones,
    IAccesoDao accesos,
    IAlertaDao alertas,
    TimeProvider reloj) : IEstadisticasService
{
    public async Task<PanelDto> ObtenerPanelAsync(DateOnly? fecha)
    {
        var dia = fecha ?? Hoy();
        var (desde, hasta) = HoraLocal.RangoDiaUtc(dia);

        // Ocupados y Total son el estado actual de los sensores, sin importar la fecha consultada.
        var lista = await cajones.ObtenerTodosAsync();
        var delDia = await accesos.ObtenerEntreFechasAsync(desde, hasta);
        var negadas = await alertas.ContarAsync(TipoAlerta.EntradaNegada, desde, hasta);

        var terminadas = delDia.Where(a => !a.EstaAbierto).ToList();
        var promedio = terminadas.Count == 0
            ? 0
            : (int)Math.Round(terminadas.Average(a => a.Duracion(Ahora()).TotalMinutes));

        return new PanelDto(
            dia,
            Ocupados: lista.Count(c => !c.EstaLibre),
            Total: lista.Count,
            EntradasHoy: delDia.Count,
            EntradasNegadasHoy: negadas,
            MinutosPromedio: promedio,
            CajonMasUsado: CajonMasUsado(delDia));
    }

    public async Task<IReadOnlyList<OcupacionHoraDto>> ObtenerOcupacionPorHoraAsync(DateOnly? fecha)
    {
        var dia = fecha ?? Hoy();
        var (desde, hasta) = HoraLocal.RangoDiaUtc(dia);
        var total = (await cajones.ObtenerTodosAsync()).Count;
        var ahora = Ahora();

        // Estancias que pudieron tocar el día: las que entraron ese día o el anterior,
        // más las que siguen abiertas (pudieron entrar antes).
        var candidatas = (await accesos.ObtenerEntreFechasAsync(desde.AddDays(-1), hasta))
            .Concat(await accesos.ObtenerAbiertosAsync())
            .DistinctBy(a => a.Id)
            .Where(a => a.Cajon is not null)
            .ToList();

        var entradasDelDia = await accesos.ObtenerEntreFechasAsync(desde, hasta);

        var resultado = new List<OcupacionHoraDto>(24);
        for (var hora = 0; hora < 24; hora++)
        {
            var inicio = desde.AddHours(hora);
            var fin = inicio.AddHours(1);

            var entradas = entradasDelDia.Count(a => a.HoraEntrada >= inicio && a.HoraEntrada < fin);
            var maximo = MaximoSimultaneo(candidatas, inicio, fin, ahora);

            resultado.Add(new OcupacionHoraDto(hora, Math.Min(maximo, total), entradas));
        }
        return resultado;
    }

    public async Task<IReadOnlyList<UsoCajonDto>> ObtenerUsoPorCajonAsync(DateOnly? desde, DateOnly? hasta)
    {
        // Sin fechas: el mes actual.
        var hoy = Hoy();
        var primerDia = desde ?? new DateOnly(hoy.Year, hoy.Month, 1);
        var ultimoDia = hasta ?? primerDia.AddMonths(1).AddDays(-1);

        if (ultimoDia < primerDia)
            throw new ExcepcionDominio("La fecha 'hasta' no puede ser anterior a 'desde'.");

        var inicioUtc = HoraLocal.RangoDiaUtc(primerDia).Desde;
        var finUtc = HoraLocal.RangoDiaUtc(ultimoDia).Hasta; // 'hasta' se incluye completo

        var usos = (await accesos.ObtenerEntreFechasAsync(inicioUtc, finUtc))
            .Where(a => a.Cajon is not null)
            .GroupBy(a => a.Cajon!.Numero)
            .ToDictionary(g => g.Key, g => g.Count());

        // Todos los cajones, aunque no se hayan usado.
        return (await cajones.ObtenerTodosAsync())
            .Select(c => new UsoCajonDto(c.Numero, usos.GetValueOrDefault(c.Numero)))
            .ToList();
    }

    /// <summary>Cuántas estancias estuvieron dentro al mismo tiempo, como máximo, en [inicio, fin).</summary>
    private static int MaximoSimultaneo(IEnumerable<Acceso> estancias, DateTime inicio, DateTime fin, DateTime ahora)
    {
        // Cada estancia recortada a la hora: +1 cuando empieza, -1 cuando termina.
        var cambios = new List<(DateTime Momento, int Delta)>();
        foreach (var a in estancias)
        {
            var desde = a.HoraEntrada > inicio ? a.HoraEntrada : inicio;
            var salida = a.HoraSalida ?? ahora;
            var hasta = salida < fin ? salida : fin;
            if (desde >= hasta)
                continue;

            cambios.Add((desde, +1));
            cambios.Add((hasta, -1));
        }

        // Las salidas van antes que las entradas del mismo instante, para no contar de más.
        var actual = 0;
        var maximo = 0;
        foreach (var (_, delta) in cambios.OrderBy(c => c.Momento).ThenBy(c => c.Delta))
        {
            actual += delta;
            maximo = Math.Max(maximo, actual);
        }
        return maximo;
    }

    /// <summary>El cajón con más estancias; si hay empate, el de número menor.</summary>
    private static int? CajonMasUsado(IEnumerable<Acceso> lista) =>
        lista
            .Where(a => a.Cajon is not null)
            .GroupBy(a => a.Cajon!.Numero)
            .OrderByDescending(g => g.Count())
            .ThenBy(g => g.Key)
            .Select(g => (int?)g.Key)
            .FirstOrDefault();

    private DateTime Ahora() => reloj.GetUtcNow().UtcDateTime;

    private DateOnly Hoy() => DateOnly.FromDateTime(HoraLocal.ALocal(Ahora()));
}
