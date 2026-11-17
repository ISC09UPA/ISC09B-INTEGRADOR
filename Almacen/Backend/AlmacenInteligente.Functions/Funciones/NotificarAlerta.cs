using System.Text.Json;
using AlmacenInteligente.Application.DTOs;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace AlmacenInteligente.Functions.Funciones;

// Microservicio de alertas: consume la cola de alertas sin depender de que la ingesta o el procesador
// estén activos al mismo tiempo. La alerta ya quedó en la tabla Alertas; aquí se registra el aviso.
// Es el punto donde se conecta el comando al LED/buzzer de la Raspberry.
public class NotificarAlerta(ILogger<NotificarAlerta> log)
{
    [Function("NotificarAlerta")]
    public void Notificar([ServiceBusTrigger(Colas.Alertas, Connection = Colas.Conexion)] string mensaje)
    {
        AlertaReordenDto? alerta = null;
        try
        {
            alerta = JsonSerializer.Deserialize<AlertaReordenDto>(mensaje, Json.Opciones);
        }
        catch (JsonException)
        {
            // Se descarta abajo.
        }

        if (alerta is null)
        {
            log.LogWarning("Mensaje de alerta descartado: formato inválido. {Mensaje}", mensaje);
            return;
        }

        log.LogWarning("REORDEN #{AlertaId}: {Producto} ({ProductoId}) tiene {Existencia} pieza(s); punto de reorden {PuntoReorden}.",
            alerta.Id, alerta.ProductoNombre, alerta.ProductoId, alerta.Existencia, alerta.PuntoReorden);
    }
}
