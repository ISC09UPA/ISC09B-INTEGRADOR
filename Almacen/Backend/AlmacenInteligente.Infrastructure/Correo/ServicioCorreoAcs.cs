using AlmacenInteligente.Application.Interfaces;
using Azure;
using Azure.Communication.Email;
using Microsoft.Extensions.Logging;

namespace AlmacenInteligente.Infrastructure.Correo;

// Correo con Azure Communication Services Email.
// Configuración (User Secrets en local, App Service → Variables de entorno en Azure):
//   Correo:ConnectionString  cadena de conexión del recurso Communication Services
//   Correo:Remitente         DoNotReply@<dominio>.azurecomm.net (el dominio administrado por Azure)
// Si falta alguna, no se manda nada y el pedido se crea con correoEnviado = false.
public class ServicioCorreoAcs(string? cadenaConexion, string? remitente, ILogger<ServicioCorreoAcs> log) : IServicioCorreo
{
    private EmailClient? cliente;

    public async Task<bool> EnviarAsync(
        string destinatario, string asunto, string textoPlano, string html, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(cadenaConexion) || string.IsNullOrWhiteSpace(remitente))
        {
            log.LogWarning("Correo sin configurar (Correo:ConnectionString / Correo:Remitente): no se envió a {Destinatario}.", destinatario);
            return false;
        }

        try
        {
            // Se crea al primer uso: una cadena de conexión mal escrita solo hace que falle el correo, no la API.
            cliente ??= new EmailClient(cadenaConexion);
            // WaitUntil.Started: responde en cuanto Azure acepta el correo, sin esperar la entrega.
            var operacion = await cliente.SendAsync(WaitUntil.Started, remitente, destinatario, asunto, html, textoPlano, ct);
            log.LogInformation("Correo aceptado por Communication Services ({OperacionId}) para {Destinatario}.", operacion.Id, destinatario);
            return true;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            log.LogError(ex, "No se pudo enviar el correo a {Destinatario}.", destinatario);
            return false;
        }
    }
}
