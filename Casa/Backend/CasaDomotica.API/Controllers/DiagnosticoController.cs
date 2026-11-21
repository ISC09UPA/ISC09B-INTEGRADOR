using CasaDomotica.API.Services;
using CasaDomotica.Application;
using Microsoft.AspNetCore.Mvc;

namespace CasaDomotica.API.Controllers;

/// <summary>Para comprobar que todo está conectado (sin iniciar sesión).</summary>
[ApiController]
[Route("api")]
public class DiagnosticoController : ControllerBase
{
    public record Prueba(bool Ok, string Mensaje);

    private readonly IConfiguration _cfg;
    private readonly IReconocimientoFacial _vision;
    private readonly IAlmacenFotos _fotos;
    private readonly IAlertasCorreo _correo;
    private readonly IMapas _mapas;
    private readonly PuertaEstado _puerta;

    public DiagnosticoController(
        IConfiguration cfg,
        IReconocimientoFacial vision,
        IAlmacenFotos fotos,
        IAlertasCorreo correo,
        IMapas mapas,
        PuertaEstado puerta)
    {
        _cfg = cfg;
        _vision = vision;
        _fotos = fotos;
        _correo = correo;
        _mapas = mapas;
        _puerta = puerta;
    }

    /// <summary>Resumen rápido: qué servicios están configurados.</summary>
    [HttpGet("estado")]
    public IActionResult Estado() => Ok(new
    {
        baseDeDatos = _cfg["Database:Provider"] ?? "Sqlite",
        customVision = _vision.Configurado,
        blob = _fotos.Configurado,
        correo = _correo.Configurado,
        mapas = _mapas.Configurado,
        raspberry = _puerta.RaspberryEnLinea
    });

    /// <summary>
    /// Prueba de verdad cada conexión con Azure. Con ?correo=true además manda un correo de prueba.
    /// Quita este endpoint antes de publicar el backend en internet.
    /// </summary>
    [HttpGet("diagnostico")]
    public async Task<IActionResult> Diagnostico([FromQuery] bool correo = false, CancellationToken ct = default)
    {
        Prueba vision;
        if (!_vision.Configurado)
        {
            vision = new Prueba(false, "Falta CustomVision:Key en appsettings.Local.json.");
        }
        else
        {
            var r = await _vision.ProbarAsync(ct);
            vision = r.Exito
                ? new Prueba(true, "Conexión con Custom Vision correcta.")
                : new Prueba(false, r.Error ?? "Error desconocido.");
        }

        var (blobOk, blobMensaje) = await _fotos.ProbarAsync(ct);

        Prueba mail;
        if (!_correo.Configurado)
        {
            mail = new Prueba(false, "Falta configurar Email (ConnectionString, Remitente y Destinatarios).");
        }
        else if (!correo)
        {
            mail = new Prueba(true, "Configurado. Agrega ?correo=true para mandar un correo de prueba.");
        }
        else
        {
            var datos = new List<KeyValuePair<string, string>>
            {
                new("Prueba", "Si lees esto, el correo de alertas funciona"),
                new("Fecha", DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"))
            };
            var r = await _correo.EnviarAsync("Prueba CasaLink", "Prueba del correo de alertas", datos, null, ignorarLimites: true, ct: ct);
            mail = new Prueba(r.Enviado, r.Mensaje);
        }

        var mapas = _mapas.Configurado
            ? new Prueba(true, "Configurado.")
            : new Prueba(false, "Opcional: falta Maps:Key y las coordenadas de la casa.");

        return Ok(new
        {
            customVision = vision,
            blob = new Prueba(blobOk, blobMensaje),
            correo = mail,
            mapas,
            raspberry = new Prueba(_puerta.RaspberryEnLinea, _puerta.RaspberryEnLinea
                ? "La Raspberry está en línea."
                : "La Raspberry no ha consultado en los últimos 10 s.")
        });
    }
}
