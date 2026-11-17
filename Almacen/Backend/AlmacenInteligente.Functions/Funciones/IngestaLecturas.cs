using System.Text.Json;
using AlmacenInteligente.Application.DTOs;
using AlmacenInteligente.Application.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace AlmacenInteligente.Functions.Funciones;

// Microservicio de ingesta: recibe lecturas de la Raspberry y solo las deja en la cola de lecturas (Colas.Lecturas).
// No toca la base: si la base o el procesador están caídos, las lecturas esperan en Service Bus.
// Acepta una lectura o una lista (hasta 100), que es como la Raspberry reenvía lo que guardó sin conexión.
public class IngestaLecturas(ILogger<IngestaLecturas> log)
{
    private const int MaximoPorEnvio = 100;

    [Function("IngestarLecturas")]
    public async Task<SalidaIngesta> Ingestar(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "lecturas")] HttpRequest req)
    {
        List<LecturaDispositivoDto?> recibidas;
        try
        {
            using var documento = await JsonDocument.ParseAsync(req.Body);
            var raiz = documento.RootElement;

            if (raiz.ValueKind == JsonValueKind.Array)
                recibidas = raiz.Deserialize<List<LecturaDispositivoDto?>>(Json.Opciones) ?? new List<LecturaDispositivoDto?>();
            else if (raiz.ValueKind == JsonValueKind.Object)
                recibidas = new List<LecturaDispositivoDto?> { raiz.Deserialize<LecturaDispositivoDto>(Json.Opciones) };
            else
                return Rechazo("El cuerpo debe ser una lectura JSON o una lista de lecturas.");
        }
        catch (JsonException)
        {
            return Rechazo("El cuerpo debe ser una lectura JSON o una lista de lecturas (revisa comas, comillas y tipos).");
        }

        if (recibidas.Count == 0)
            return Rechazo("La lista de lecturas está vacía.");
        if (recibidas.Count > MaximoPorEnvio)
            return Rechazo($"Máximo {MaximoPorEnvio} lecturas por envío.");

        var ahora = DateTime.UtcNow;
        var mensajes = new List<string>();
        var aceptadas = new List<string>();
        var rechazadas = new List<object>();

        for (var i = 0; i < recibidas.Count; i++)
        {
            var (lectura, error) = LecturaValidador.Normalizar(recibidas[i], ahora);
            if (lectura is null)
            {
                rechazadas.Add(new { indice = i, lecturaId = recibidas[i]?.LecturaId, error });
                continue;
            }

            mensajes.Add(JsonSerializer.Serialize(lectura, Json.Opciones));
            aceptadas.Add(lectura.LecturaId!);
        }

        log.LogInformation("Ingesta: {Aceptadas} lectura(s) a la cola, {Rechazadas} rechazada(s).", aceptadas.Count, rechazadas.Count);

        if (mensajes.Count == 0)
            return new SalidaIngesta
            {
                Respuesta = new BadRequestObjectResult(new { error = "Ninguna lectura es válida.", rechazadas })
            };

        // 202: la lectura quedó en la cola; se procesa unos segundos después.
        return new SalidaIngesta
        {
            Respuesta = new ObjectResult(new { aceptadas = aceptadas.Count, lecturaIds = aceptadas, rechazadas })
            {
                StatusCode = StatusCodes.Status202Accepted
            },
            Mensajes = mensajes.ToArray()
        };
    }

    // Sin clave: la Raspberry lo usa al arrancar para saber si hay conexión con la nube.
    [Function("Salud")]
    public IActionResult Salud(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "salud")] HttpRequest req) =>
        new OkObjectResult(new { ingesta = "ok", horaUtc = DateTime.UtcNow });

    private static SalidaIngesta Rechazo(string error) =>
        new() { Respuesta = new BadRequestObjectResult(new { error }) };
}

// Respuesta HTTP y, al mismo tiempo, los mensajes para la cola de lecturas (null = no se encola nada).
public class SalidaIngesta
{
    [HttpResult]
    public IActionResult Respuesta { get; set; } = new OkResult();

    [ServiceBusOutput(Colas.Lecturas, Connection = Colas.Conexion)]
    public string[]? Mensajes { get; set; }
}
