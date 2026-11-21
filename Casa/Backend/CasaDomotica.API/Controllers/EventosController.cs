using CasaDomotica.API.Filters;
using CasaDomotica.API.Services;
using CasaDomotica.Application;
using CasaDomotica.Domain;
using CasaDomotica.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CasaDomotica.API.Controllers;

/// <summary>Lo que manda la Raspberry (casa_domotica.py). Protegido con la cabecera X-Api-Key.</summary>
[ApiController]
[ClaveRaspberry]
[Route("api")]
public class EventosController : ControllerBase
{
    private readonly CasaDb _db;
    private readonly PuertaEstado _puerta;
    private readonly Notificador _notificador;
    private readonly IAlertasCorreo _correo;

    public EventosController(CasaDb db, PuertaEstado puerta, Notificador notificador, IAlertasCorreo correo)
    {
        _db = db;
        _puerta = puerta;
        _notificador = notificador;
        _correo = correo;
    }

    /// <summary>
    /// Alguien intentó entrar. La Raspberry ya decidió si es autorizado.
    /// Si no lo es: alerta roja en la app + correo con la foto. Responde cómo quedó el correo
    /// ("enviado", "omitido", "apagado" o "error") para que la Raspberry mande el suyo si el servidor falló.
    /// </summary>
    [HttpPost("eventos/acceso")]
    public async Task<IActionResult> Acceso([FromBody] AccesoEventoDto dto)
    {
        var zona = string.IsNullOrWhiteSpace(dto.Zona) ? "Entrada" : dto.Zona.Trim();
        var nombre = string.IsNullOrWhiteSpace(dto.Nombre) ? null : dto.Nombre.Trim();
        var hora = DateTime.Now;
        var mensaje = dto.Autorizado
            ? $"Acceso concedido: {nombre ?? "Persona"} ({zona})"
            : $"Acceso denegado en {zona}";

        _db.Accesos.Add(new AccesoLog { Mensaje = mensaje, Hora = hora });
        await _db.SaveChangesAsync();

        if (dto.Autorizado)
        {
            if (nombre is not null)
            {
                await _db.AsegurarPersonaAsync(nombre);
            }

            // La tarjeta "Puerta principal" solo cambia con la puerta de la entrada.
            if (zona.Equals("Entrada", StringComparison.OrdinalIgnoreCase))
            {
                _ = _puerta.AbrirAsync();
            }
        }

        await _notificador.AvisarAccesoAsync(mensaje, hora);

        var estadoCorreo = "no_aplica";
        if (!dto.Autorizado)
        {
            await _notificador.AlertarAsync($"Rostro desconocido detectado en {zona}");

            var coincidencia = nombre is null ? "ninguna" : $"{nombre} ({dto.Probabilidad ?? 0:P0})";
            var datos = new List<KeyValuePair<string, string>>
            {
                new("Zona", zona),
                new("Mejor coincidencia", coincidencia),
                new("Fecha", hora.ToString("dd/MM/yyyy HH:mm:ss"))
            };
            var foto = Util.DecodificarImagen(dto.Foto);
            var r = await _correo.EnviarAsync(
                $"Alerta CasaLink: alguien intenta entrar a tu casa ({zona})",
                "Una persona no reconocida intenta entrar",
                datos,
                foto);
            estadoCorreo = r.Estado;
            Console.WriteLine($"[correo] {r.Estado}: {r.Mensaje}");
        }

        return Ok(new { correo = estadoCorreo });
    }

    [HttpPost("eventos/movimiento")]
    public async Task<IActionResult> Movimiento([FromBody] MovimientoDto? dto)
    {
        var ajustes = await _db.Ajustes.AsNoTracking().FirstAsync();
        if (ajustes.SeguridadActiva)
        {
            var zona = dto?.Zona?.Trim();
            await _notificador.AlertarAsync(string.IsNullOrEmpty(zona)
                ? "Movimiento detectado dentro de la casa"
                : $"Movimiento detectado en {zona}");
        }

        return Ok();
    }

    [HttpPost("eventos/lux")]
    public async Task<IActionResult> Lux([FromBody] LuxDto dto)
    {
        var ajustes = await _db.Ajustes.FirstAsync();
        ajustes.Lux = dto.Lux;
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("eventos/clima")]
    public async Task<IActionResult> Clima([FromBody] ClimaDto dto)
    {
        var c = await _db.Clima.FirstOrDefaultAsync(x => x.Zona == dto.Zona);
        if (c is null)
        {
            _db.Clima.Add(new ClimaRegistro { Zona = dto.Zona, Temp = dto.Temp, Hum = dto.Hum });
        }
        else
        {
            c.Temp = dto.Temp;
            c.Hum = dto.Hum;
        }

        await _db.SaveChangesAsync();
        return Ok();
    }

    /// <summary>La Raspberry avisa cómo están realmente sus LED (los de sensor de luz cambian solos).</summary>
    [HttpPost("eventos/luces")]
    public async Task<IActionResult> Luces([FromBody] Dictionary<string, bool> luces)
    {
        foreach (var (nombre, encendida) in luces)
        {
            var luz = await _db.Luces.FirstOrDefaultAsync(l => l.Nombre == nombre);
            if (luz is null)
            {
                _db.Luces.Add(new Luz { Nombre = nombre, Encendida = encendida });
            }
            else
            {
                luz.Encendida = encendida;
            }
        }

        await _db.SaveChangesAsync();
        return Ok();
    }

    /// <summary>
    /// La Raspberry pregunta cada segundo: ¿la app pidió abrir la puerta? ¿cómo quieren las luces?
    /// La orden de abrir se entrega una sola vez.
    /// </summary>
    [HttpGet("raspberry/estado")]
    public async Task<IActionResult> Estado()
    {
        var abrir = _puerta.ConsumirOrden();
        if (abrir)
        {
            _ = _puerta.AbrirAsync();
            await _notificador.AvisarAccesoAsync("Puerta abierta desde la app", DateTime.Now);
        }

        var ajustes = await _db.Ajustes.AsNoTracking().FirstAsync();
        var luces = await _db.Luces.AsNoTracking().ToDictionaryAsync(l => l.Nombre, l => l.Encendida);
        return Ok(new { abrirPuerta = abrir, luces, seguridad = ajustes.SeguridadActiva });
    }
}
