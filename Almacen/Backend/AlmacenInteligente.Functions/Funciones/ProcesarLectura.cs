using System.Text.Json;
using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Application.Interfaces;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace AlmacenInteligente.Functions.Funciones;

// Microservicio de procesamiento: toma cada lectura de la cola de lecturas, actualiza la base
// (bitácora, peso, existencia y movimiento) y, si un producto llega a su punto de reorden,
// publica la alerta en la cola de alertas.
// Si la base no responde, la función falla y Service Bus reintenta el mensaje (hasta 10 veces);
// después lo manda a la cola de mensajes muertos. Así no se pierde ninguna lectura.
public class ProcesarLectura(ILecturaService lecturas, ILogger<ProcesarLectura> log)
{
    [Function("ProcesarLectura")]
    [ServiceBusOutput(Colas.Alertas, Connection = Colas.Conexion)]
    public async Task<string?> Procesar(
        [ServiceBusTrigger(Colas.Lecturas, Connection = Colas.Conexion)] string mensaje,
        CancellationToken ct)
    {
        LecturaDispositivoDto? lectura;
        try
        {
            lectura = JsonSerializer.Deserialize<LecturaDispositivoDto>(mensaje, Json.Opciones);
        }
        catch (JsonException)
        {
            log.LogWarning("Mensaje descartado: no es una lectura válida. {Mensaje}", mensaje);
            return null;
        }

        var resultado = await lecturas.ProcesarAsync(lectura, ct);
        if (!resultado.EsExito)
        {
            // Una lectura inválida no mejora con reintentos: se registra y se descarta.
            log.LogWarning("Lectura descartada: {Error} {Mensaje}", resultado.Error, mensaje);
            return null;
        }

        var procesada = resultado.Valor!;
        log.LogInformation("Lectura {LecturaId}: {Resultado} Producto {ProductoId}, existencia {Existencia}.",
            procesada.LecturaId, procesada.Resultado, procesada.ProductoId, procesada.ExistenciaProducto);

        return procesada.AlertaNueva is null
            ? null
            : JsonSerializer.Serialize(procesada.AlertaNueva, Json.Opciones);
    }
}
