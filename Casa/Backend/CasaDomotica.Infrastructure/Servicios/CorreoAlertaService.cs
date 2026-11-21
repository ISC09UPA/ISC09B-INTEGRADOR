using System.Net;
using System.Text;
using Azure;
using Azure.Communication.Email;
using CasaDomotica.Application;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CasaDomotica.Infrastructure.Servicios;

/// <summary>
/// Correos de alerta con Azure Communication Services.
/// - No espera a que Azure confirme el envío (WaitUntil.Started): así no gasta las consultas de estado,
///   que en el dominio gratis (azurecomm.net) solo son 10 por minuto y 20 por hora.
/// - Limita los envíos (dominio gratis: 5 por minuto y 10 por hora) y explica claramente cada error.
/// </summary>
public sealed class CorreoAlertaService : IAlertasCorreo
{
    private readonly EmailOptions _o;
    private readonly ILogger<CorreoAlertaService> _log;
    private readonly object _lock = new();
    private readonly List<DateTime> _envios = new();
    private DateTime _ultimo = DateTime.MinValue;
    private EmailClient? _cliente;

    public CorreoAlertaService(IOptions<EmailOptions> o, ILogger<CorreoAlertaService> log)
    {
        _o = o.Value;
        _log = log;
    }

    private string[] Destinos => _o.Destinatarios
        .Where(d => !string.IsNullOrWhiteSpace(d) && d.Contains('@') && !d.StartsWith("PEGA", StringComparison.OrdinalIgnoreCase))
        .Select(d => d.Trim())
        .ToArray();

    public bool Configurado =>
        !string.IsNullOrWhiteSpace(_o.ConnectionString)
        && _o.ConnectionString.Contains("endpoint=", StringComparison.OrdinalIgnoreCase)
        && !string.IsNullOrWhiteSpace(_o.Remitente)
        && _o.Remitente.Contains('@')
        && Destinos.Length > 0;

    private EmailClient Cliente()
    {
        if (_cliente is null)
        {
            var opciones = new EmailClientOptions();
            opciones.Retry.MaxRetries = 1;
            opciones.Retry.NetworkTimeout = TimeSpan.FromSeconds(20);
            _cliente = new EmailClient(_o.ConnectionString, opciones);
        }

        return _cliente;
    }

    public async Task<ResultadoCorreo> EnviarAsync(
        string asunto,
        string titulo,
        IReadOnlyList<KeyValuePair<string, string>> datos,
        byte[]? foto = null,
        bool ignorarLimites = false,
        CancellationToken ct = default)
    {
        if (!Configurado)
        {
            return new ResultadoCorreo("apagado", "El correo no está configurado (Email:ConnectionString, Remitente y Destinatarios).");
        }

        DateTime reserva;
        lock (_lock)
        {
            var ahora = DateTime.UtcNow;
            _envios.RemoveAll(t => (ahora - t).TotalMinutes >= 60);

            if (!ignorarLimites)
            {
                if ((ahora - _ultimo).TotalSeconds < _o.EsperaSegundos)
                {
                    return new ResultadoCorreo("omitido", $"Ya se mandó un correo hace menos de {_o.EsperaSegundos} s.");
                }

                if (_envios.Count >= _o.MaxPorHora)
                {
                    return new ResultadoCorreo("omitido", $"Ya se mandaron {_o.MaxPorHora} correos en la última hora (límite del dominio gratis de Azure).");
                }
            }

            _ultimo = ahora;
            _envios.Add(ahora);
            reserva = ahora;
        }

        try
        {
            var texto = ConstruirTexto(titulo, datos);
            var contenido = new EmailContent(asunto)
            {
                PlainText = texto,
                Html = ConstruirHtml(titulo, datos, foto is { Length: > 0 })
            };
            var para = Destinos.Select(d => new EmailAddress(d)).ToList();
            var mensaje = new EmailMessage(_o.Remitente, new EmailRecipients(para), contenido);

            if (foto is { Length: > 0 })
            {
                mensaje.Attachments.Add(new EmailAttachment("visitante.jpg", "image/jpeg", BinaryData.FromBytes(foto)));
            }

            await Cliente().SendAsync(WaitUntil.Started, mensaje, ct);
            _log.LogInformation("Correo de alerta aceptado por Azure para {Destinos}", string.Join(", ", Destinos));
            return new ResultadoCorreo("enviado", "Azure aceptó el correo. Revisa la bandeja y la carpeta de SPAM.");
        }
        catch (RequestFailedException ex)
        {
            Liberar(reserva, ex.Status == 429);
            _log.LogWarning("Azure Email respondió {Status} {Codigo}: {Mensaje}", ex.Status, ex.ErrorCode, ex.Message);
            return new ResultadoCorreo("error", Explicar(ex));
        }
        catch (Exception ex)
        {
            Liberar(reserva, false);
            _log.LogWarning(ex, "No se pudo enviar el correo");
            return new ResultadoCorreo("error", "No se pudo contactar Azure Communication Services: " + ex.Message);
        }
    }

    /// <summary>Si falló, devuelve el turno para poder reintentar (salvo que Azure haya limitado).</summary>
    private void Liberar(DateTime reserva, bool limitadoPorAzure)
    {
        lock (_lock)
        {
            if (limitadoPorAzure)
            {
                return;
            }

            _envios.Remove(reserva);
            _ultimo = DateTime.MinValue;
        }
    }

    private static string Explicar(RequestFailedException ex) => ex.Status switch
    {
        401 or 403 => "Azure rechazó la llave del correo. Copia la cadena de conexión (key1) de tu recurso Communication Services.",
        429 => "Azure limitó los correos (429): el dominio gratis solo permite 5 por minuto y 10 por hora. Espera una hora.",
        _ when ex.ErrorCode == "DomainNotLinked" =>
            "El dominio no está conectado: en Azure ve a Communication Services > Email > Domains > Connect domain.",
        _ => $"Azure respondió {ex.Status} ({ex.ErrorCode}): {ex.Message}"
    };

    private static string ConstruirTexto(string titulo, IReadOnlyList<KeyValuePair<string, string>> datos)
    {
        var sb = new StringBuilder();
        sb.AppendLine(titulo);
        sb.AppendLine();
        foreach (var d in datos)
        {
            sb.AppendLine($"{d.Key}: {d.Value}");
        }

        sb.AppendLine();
        sb.AppendLine("CasaLink · Tu casa inteligente");
        return sb.ToString();
    }

    private static string ConstruirHtml(string titulo, IReadOnlyList<KeyValuePair<string, string>> datos, bool conFoto)
    {
        var filas = new StringBuilder();
        foreach (var d in datos)
        {
            filas.Append("<tr><td style=\"padding:8px 0;color:#8B979D;font-size:12px;letter-spacing:1px;text-transform:uppercase;width:42%\">")
                 .Append(WebUtility.HtmlEncode(d.Key))
                 .Append("</td><td style=\"padding:8px 0;color:#F3F6F4;font-size:15px;font-weight:600\">")
                 .Append(WebUtility.HtmlEncode(d.Value))
                 .Append("</td></tr>");
        }

        var nota = conFoto ? "La foto del visitante va adjunta." : "";
        return "<html><body style=\"margin:0;padding:24px;background:#07090A;font-family:Segoe UI,Arial,sans-serif\">"
               + "<div style=\"max-width:520px;margin:0 auto;background:#111416;border:1px solid #232A2F;border-radius:20px;overflow:hidden\">"
               + "<div style=\"padding:18px 24px;border-bottom:1px solid #232A2F;color:#C8FF3D;font-weight:700;letter-spacing:2px;font-size:13px\">CASALINK</div>"
               + "<div style=\"padding:24px\">"
               + "<div style=\"display:inline-block;background:rgba(255,77,94,.14);color:#FF4D5E;border-radius:999px;padding:4px 12px;font-size:11px;font-weight:700;letter-spacing:1px\">ALERTA DE ACCESO</div>"
               + "<h2 style=\"color:#F3F6F4;font-size:22px;margin:14px 0 8px\">" + WebUtility.HtmlEncode(titulo) + "</h2>"
               + "<table style=\"width:100%;border-collapse:collapse;margin-top:8px\">" + filas + "</table>"
               + "<p style=\"color:#8B979D;font-size:13px;margin:18px 0 0\">" + nota + "</p>"
               + "</div></div></body></html>";
    }
}
