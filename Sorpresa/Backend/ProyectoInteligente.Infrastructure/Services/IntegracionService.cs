using Microsoft.Extensions.Logging;
using ProyectoInteligente.Application.Interfaces;
using ProyectoInteligente.Domain.Entities;

namespace ProyectoInteligente.Infrastructure.Services;

public class IntegracionService : IIntegracionService
{
    private readonly ILogger<IntegracionService> _logger;

    public IntegracionService(ILogger<IntegracionService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Guarda el resumen generado por Azure en tu base de datos MySQL.
    /// </summary>
    public void GuardarEnDbSql(ResumenDeteccion datos)
    {
        _logger.LogInformation("[BD SQL] Preparando para guardar: Personas={Personas}, Hora={Hora}, Resumen={Resumen}", 
            datos.Personas, datos.Hora, datos.Resumen);

        // =====================================================================
        // >>> [AQUI COLOCA TU CONEXION Y TU CONSULTA A MYSQL] <<<
        // Ejemplo con MySqlConnector / Pomelo:
        // using var conexion = new MySqlConnection(cadenaConexion);
        // conexion.Open();
        // var query = "INSERT INTO detecciones (personas, hora, resumen, fecha_registro) VALUES (@p, @h, @r, NOW())";
        // =====================================================================
    }

    /// <summary>
    /// Envía los datos o notificación hacia tu aplicación móvil.
    /// </summary>
    public void EnviarAAppMovil(ResumenDeteccion datos)
    {
        _logger.LogInformation("[APP MOVIL] Preparando envío hacia la app móvil: {Resumen}", datos.Resumen);

        // =====================================================================
        // >>> [AQUI COLOCA EL ENVIO A TU APP MOVIL] <<<
        // Ejemplo:
        // - Enviar notificación Push (Firebase FCM, OneSignal, Expo Push API)
        // - O WebSocket / SignalR para actualizar la pantalla en vivo
        // =====================================================================
    }
}
