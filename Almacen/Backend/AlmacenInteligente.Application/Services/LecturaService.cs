using AlmacenInteligente.Application.Common;
using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Application.Interfaces;
using AlmacenInteligente.Domain.Constantes;
using AlmacenInteligente.Domain.Entities;

namespace AlmacenInteligente.Application.Services;

// Procesa una lectura de la Raspberry que llegó por la cola de Service Bus:
//  - IR:   suma o resta piezas al espacio y registra el movimiento con origen SENSOR.
//  - PESO: guarda la lectura y recalcula las piezas: (peso - tara) / peso unitario.
// Después revisa el punto de reorden del producto: crea la alerta si bajó, o la da por atendida si se repuso.
// Todo se guarda en un solo SaveChanges (una transacción).
public class LecturaService(ILecturaRepository repositorio) : ILecturaService
{
    private const int LargoResultado = 200;

    public async Task<Resultado<LecturaProcesadaDto>> ProcesarAsync(LecturaDispositivoDto? entrada, CancellationToken ct = default)
    {
        var ahora = DateTime.UtcNow;
        var (lectura, error) = LecturaValidador.Normalizar(entrada, ahora);
        if (lectura is null)
            return Resultado<LecturaProcesadaDto>.Falla(TipoError.Validacion, error!);

        var lecturaId = lectura.LecturaId!;
        if (await repositorio.ExisteAsync(lecturaId, ct))
            return Listo(lecturaId, "DUPLICADA: ya se había procesado.");

        var fecha = lectura.FechaHora!.Value;
        int? peso = lectura.PesoGramos is decimal p ? (int)p : null;

        var registro = new LecturaDispositivo
        {
            LecturaId = lecturaId,
            DispositivoId = lectura.DispositivoId!,
            EspacioId = lectura.EspacioId!,
            TipoSensor = lectura.TipoSensor!,
            Evento = lectura.Evento,
            Cantidad = lectura.Cantidad,
            PesoGramos = peso,
            FechaHora = fecha,
            ProcesadaEn = ahora
        };
        repositorio.Agregar(registro);

        var espacio = await repositorio.ObtenerEspacioAsync(lectura.EspacioId!, ct);
        if (espacio is null)
            return await TerminarAsync(registro, $"IGNORADA: no existe el espacio {lectura.EspacioId}.", ct);

        // Una lectura de peso más vieja que la última (llegó tarde al resincronizar) no debe pisar la existencia actual.
        var esHistorica = espacio.UltimaLectura is DateTime ultima && fecha < ultima;
        if (!esHistorica)
            espacio.UltimaLectura = fecha;

        if (peso is int gramos)
            repositorio.Agregar(new LecturaPeso { EspacioId = espacio.Id, PesoGramos = gramos, FechaHora = fecha });

        var producto = espacio.Producto;
        if (producto is null)
            return await TerminarAsync(registro, "SIN PRODUCTO: el espacio está vacío; no cambia ninguna existencia.", ct);

        var (cambio, resultado) = lectura.TipoSensor == TiposSensor.Infrarrojo
            ? CambioPorInfrarrojo(espacio, lectura.Evento!, lectura.Cantidad!.Value)
            : CambioPorPeso(espacio, producto, peso!.Value, esHistorica);

        if (cambio != 0)
        {
            espacio.Existencia += cambio;
            repositorio.Agregar(new Movimiento
            {
                ProductoId = producto.Id,
                TipoMovimiento = cambio > 0 ? TiposMovimiento.Entrada : TiposMovimiento.Salida,
                Cantidad = Math.Abs(cambio),
                Origen = OrigenesMovimiento.Sensor,
                UsuarioId = null,
                FechaHora = fecha
            });
        }

        // producto.Espacios incluye este mismo espacio (ya con la existencia nueva).
        var existenciaTotal = producto.Espacios.Sum(e => e.Existencia);
        var alertaNueva = await RevisarReordenAsync(producto, existenciaTotal, ahora, ct);

        registro.Resultado = Recortar(resultado);
        await repositorio.GuardarCambiosAsync(ct);

        var alertaDto = alertaNueva is null
            ? null
            : new AlertaReordenDto(alertaNueva.Id, producto.Id, producto.Nombre, alertaNueva.Existencia,
                alertaNueva.PuntoReorden, DateTime.SpecifyKind(alertaNueva.CreadaEn, DateTimeKind.Utc));

        return Resultado<LecturaProcesadaDto>.Exito(
            new LecturaProcesadaDto(lecturaId, registro.Resultado, producto.Id, existenciaTotal, alertaDto));
    }

    private static (int Cambio, string Resultado) CambioPorInfrarrojo(Espacio espacio, string evento, int cantidad)
    {
        if (evento == TiposMovimiento.Entrada)
            return (cantidad, $"OK: entraron {cantidad} pieza(s) a {espacio.Id}.");

        // El sensor no puede sacar más de lo que hay: se ajusta a la existencia.
        var quitar = Math.Min(cantidad, espacio.Existencia);
        return quitar == cantidad
            ? (-quitar, $"OK: salieron {cantidad} pieza(s) de {espacio.Id}.")
            : (-quitar, $"AJUSTADA: el sensor marcó {cantidad} salida(s) en {espacio.Id} pero solo había {espacio.Existencia}.");
    }

    private static (int Cambio, string Resultado) CambioPorPeso(Espacio espacio, Producto producto, int gramos, bool esHistorica)
    {
        if (esHistorica)
            return (0, "HISTÓRICA: ya había una lectura más reciente; solo se guardó el peso.");
        if (producto.PesoUnitarioGramos <= 0)
            return (0, $"SIN PESO UNITARIO: {producto.Id} no tiene peso por pieza; solo se guardó el peso.");

        var piezas = (int)Math.Round((gramos - espacio.TaraGramos) / (double)producto.PesoUnitarioGramos,
            MidpointRounding.AwayFromZero);
        piezas = Math.Max(0, piezas);

        var cambio = piezas - espacio.Existencia;
        return (cambio, $"OK: {gramos} g en {espacio.Id} = {piezas} pieza(s) (cambio {cambio:+0;-0;0}).");
    }

    // Punto de reorden con la regla compartida (la misma de los movimientos manuales).
    // Devuelve la alerta nueva para publicarla en la cola "alertas-reorden"; null si no se creó ninguna.
    private async Task<Alerta?> RevisarReordenAsync(Producto producto, int existenciaTotal, DateTime ahora, CancellationToken ct)
    {
        var activa = await repositorio.ObtenerAlertaActivaAsync(producto.Id, ct);
        var reorden = ReglaReorden.Evaluar(producto, existenciaTotal, activa, ahora);
        if (reorden.Nueva is not null)
            repositorio.Agregar(reorden.Nueva);
        return reorden.Nueva;
    }

    private async Task<Resultado<LecturaProcesadaDto>> TerminarAsync(LecturaDispositivo registro, string resultado, CancellationToken ct)
    {
        registro.Resultado = Recortar(resultado);
        await repositorio.GuardarCambiosAsync(ct);
        return Listo(registro.LecturaId, registro.Resultado);
    }

    private static Resultado<LecturaProcesadaDto> Listo(string lecturaId, string resultado) =>
        Resultado<LecturaProcesadaDto>.Exito(new LecturaProcesadaDto(lecturaId, resultado, null, null, null));

    private static string Recortar(string texto) =>
        texto.Length <= LargoResultado ? texto : texto[..LargoResultado];
}
