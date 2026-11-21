using CasaDomotica.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CasaDomotica.API.Controllers;

/// <summary>Azure Maps: tiempo de llegada a casa e imagen del mapa.</summary>
[ApiController]
[Authorize]
[Route("api/mapa")]
public class MapaController : ControllerBase
{
    private readonly IMapas _mapas;

    public MapaController(IMapas mapas)
    {
        _mapas = mapas;
    }

    [HttpGet("eta")]
    public async Task<IActionResult> Eta([FromQuery] double lat, [FromQuery] double lon, CancellationToken ct)
    {
        if (!_mapas.Configurado)
        {
            return StatusCode(501, new { mensaje = "Azure Maps no está configurado (Maps:Key, CasaLat y CasaLon)." });
        }

        var info = await _mapas.CalcularAsync(lat, lon, ct);
        return info is null
            ? StatusCode(502, new { mensaje = "No se pudo calcular la ruta." })
            : Ok(new { minutos = info.Minutos, distanciaKm = info.DistanciaKm });
    }

    /// <summary>Imagen del mapa. La app manda el token como ?access_token= porque un Image no puede llevar cabeceras.</summary>
    [HttpGet("imagen")]
    public async Task<IActionResult> Imagen([FromQuery] double? lat, [FromQuery] double? lon, CancellationToken ct)
    {
        if (!_mapas.Configurado)
        {
            return StatusCode(501, new { mensaje = "Azure Maps no está configurado." });
        }

        var bytes = await _mapas.ImagenAsync(lat, lon, ct);
        return bytes is null
            ? StatusCode(502, new { mensaje = "No se pudo obtener el mapa." })
            : File(bytes, "image/png");
    }
}
