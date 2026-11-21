using CasaDomotica.API.Services;
using CasaDomotica.Application;
using CasaDomotica.Domain;
using CasaDomotica.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace CasaDomotica.API.Controllers;

[ApiController]
[Route("api")]
public class AuthController : ControllerBase
{
    private readonly IConfiguration _cfg;
    private readonly TokenService _tokens;
    private readonly IReconocimientoFacial _vision;
    private readonly IAlmacenFotos _fotos;
    private readonly IAlertasCorreo _correo;
    private readonly CasaDb _db;
    private readonly Notificador _notificador;
    private readonly CustomVisionOptions _cv;

    public AuthController(
        IConfiguration cfg,
        TokenService tokens,
        IReconocimientoFacial vision,
        IAlmacenFotos fotos,
        IAlertasCorreo correo,
        CasaDb db,
        Notificador notificador,
        IOptions<CustomVisionOptions> cv)
    {
        _cfg = cfg;
        _tokens = tokens;
        _vision = vision;
        _fotos = fotos;
        _correo = correo;
        _db = db;
        _notificador = notificador;
        _cv = cv.Value;
    }

    /// <summary>Login con correo y contraseña.</summary>
    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginDto dto)
    {
        var usuario = dto.Usuario?.Trim() ?? string.Empty;
        var esperadoUsuario = _cfg["Auth:Usuario"] ?? "admin@casa.com";
        var esperadaClave = _cfg["Auth:Password"] ?? "1234";

        if (!string.Equals(usuario, esperadoUsuario, StringComparison.OrdinalIgnoreCase) || dto.Password != esperadaClave)
        {
            return Unauthorized(new { mensaje = "Correo o contraseña incorrectos." });
        }

        return Ok(new { token = _tokens.Crear(usuario), nombre = "Admin" });
    }

    /// <summary>
    /// Login con rostro: la app manda una foto y Azure Custom Vision dice quién es.
    /// Entra cualquier persona que Azure reconozca (las mismas que abren la puerta en la Raspberry).
    /// Si no la reconoce: se guarda la foto en Blob Storage, se avisa a las apps y se manda un correo de alerta.
    /// </summary>
    [HttpPost("login/rostro")]
    public async Task<IActionResult> LoginRostro([FromBody] RostroDto dto, CancellationToken ct)
    {
        if (!_vision.Configurado)
        {
            return StatusCode(501, new { mensaje = "El acceso con rostro no está configurado en el servidor (falta la llave de Azure)." });
        }

        var foto = Util.DecodificarImagen(dto.Imagen);
        if (foto is null)
        {
            return BadRequest(new { mensaje = "La imagen no es válida." });
        }

        var r = await _vision.ClasificarAsync(foto, ct);
        if (!r.Exito)
        {
            return StatusCode(502, new { mensaje = r.Error });
        }

        Console.WriteLine($"[rostro] Azure vio a \"{r.Nombre}\" con {r.Probabilidad:P0}");

        var reconocido = r.Probabilidad >= _cv.Umbral && Util.EsPersona(r.Nombre);
        var ahora = DateTime.Now;

        if (reconocido)
        {
            await _db.AsegurarPersonaAsync(r.Nombre, ct);
            _db.Accesos.Add(new AccesoLog { Mensaje = $"Acceso concedido: {r.Nombre} (app)", Hora = ahora });
            await _db.SaveChangesAsync(ct);

            // Sin ct: que sigan aunque la app cierre la conexión.
            _ = _fotos.SubirAsync(foto, "autorizado", "app", r.Nombre, r.Probabilidad);
            return Ok(new { token = _tokens.Crear(r.Nombre), nombre = r.Nombre });
        }

        _db.Accesos.Add(new AccesoLog { Mensaje = "Rostro no reconocido en la app", Hora = ahora });
        await _db.SaveChangesAsync(ct);

        _ = _fotos.SubirAsync(foto, "denegado", "app", string.IsNullOrWhiteSpace(r.Nombre) ? "desconocido" : r.Nombre, r.Probabilidad);
        await _notificador.AlertarAsync("Rostro desconocido detectado en App móvil");

        var datos = new List<KeyValuePair<string, string>>
        {
            new("Zona", "App móvil (inicio de sesión)"),
            new("Mejor coincidencia", string.IsNullOrWhiteSpace(r.Nombre) ? "ninguna" : $"{r.Nombre} ({r.Probabilidad:P0})"),
            new("Porcentaje requerido", _cv.Umbral.ToString("P0")),
            new("Fecha", ahora.ToString("dd/MM/yyyy HH:mm:ss"))
        };
        _ = _correo.EnviarAsync("Alerta CasaLink: alguien intenta entrar a la app", "Alguien intentó entrar con su rostro y no fue reconocido", datos, foto);

        return Unauthorized(new { mensaje = "No te reconocimos. Intenta de nuevo o usa tu correo y contraseña." });
    }

    /// <summary>Prueba el reconocimiento ya con sesión iniciada (no abre nada ni manda alertas).</summary>
    [Authorize]
    [HttpPost("rostro/verificar")]
    public async Task<IActionResult> Verificar([FromBody] RostroDto dto, CancellationToken ct)
    {
        if (!_vision.Configurado)
        {
            return StatusCode(501, new { mensaje = "Falta la llave de Azure Custom Vision en el servidor." });
        }

        var foto = Util.DecodificarImagen(dto.Imagen);
        if (foto is null)
        {
            return BadRequest(new { mensaje = "La imagen no es válida." });
        }

        var r = await _vision.ClasificarAsync(foto, ct);
        if (!r.Exito)
        {
            return StatusCode(502, new { mensaje = r.Error });
        }

        return Ok(new
        {
            nombre = r.Nombre,
            probabilidad = r.Probabilidad,
            umbral = _cv.Umbral,
            autorizado = r.Probabilidad >= _cv.Umbral && Util.EsPersona(r.Nombre)
        });
    }
}
