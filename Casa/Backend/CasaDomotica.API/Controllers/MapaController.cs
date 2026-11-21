<<<<<<< HEAD
using CasaDomotica.Application;
using Microsoft.AspNetCore.Authorization;
=======
using System.Globalization;
using System.Text;
using System.Text.Json;
>>>>>>> c14ea15e14ec29175ae8aaa839ebbfbdb6a1b710
using Microsoft.AspNetCore.Mvc;

namespace CasaDomotica.API.Controllers;

<<<<<<< HEAD
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
=======
[ApiController]
[Route("api/mapa")]
public class MapaController : ControllerBase
{
    // HttpClient propio para que la clave de la URL no salga en los logs
    private static readonly HttpClient Http = new();

    private readonly IConfiguration _config;

    public MapaController(IConfiguration config)
    {
        _config = config;
    }

    private string Clave => _config["AzureMaps:Key"]
        ?? throw new InvalidOperationException("Falta AzureMaps:Key");

    private double CasaLat => double.Parse(_config["Casa:Lat"]!, CultureInfo.InvariantCulture);
    private double CasaLon => double.Parse(_config["Casa:Lon"]!, CultureInfo.InvariantCulture);

    private static string F(double n) => n.ToString("0.######", CultureInfo.InvariantCulture);

    // GET api/mapa/imagen?lat=..&lon=..   (lat y lon son opcionales)
    [HttpGet("imagen")]
    public async Task<IActionResult> Imagen([FromQuery] double? lat, [FromQuery] double? lon)
    {
        var pins = $"default||'Casa'{F(CasaLon)} {F(CasaLat)}";
        double centroLat = CasaLat, centroLon = CasaLon;
        var zoom = 15;

        if (lat.HasValue && lon.HasValue)
        {
            pins += $"|'Yo'{F(lon.Value)} {F(lat.Value)}";
            centroLat = (CasaLat + lat.Value) / 2;
            centroLon = (CasaLon + lon.Value) / 2;
            zoom = ZoomPara(DistanciaKm(CasaLat, CasaLon, lat.Value, lon.Value));
        }

        var url = "https://atlas.microsoft.com/map/static?api-version=2024-04-01" +
                  $"&zoom={zoom}&center={F(centroLon)},{F(centroLat)}&width=640&height=360" +
                  $"&pins={Uri.EscapeDataString(pins)}&subscription-key={Clave}";

        using var respuesta = await Http.GetAsync(url);
        if (!respuesta.IsSuccessStatusCode)
            return StatusCode(502, "Azure Maps no devolvio el mapa");

        var bytes = await respuesta.Content.ReadAsByteArrayAsync();
        return File(bytes, "image/png");
    }

    // GET api/mapa/eta?lat=..&lon=..
    [HttpGet("eta")]
    public async Task<IActionResult> Eta([FromQuery] double lat, [FromQuery] double lon)
    {
        var cuerpo = JsonSerializer.Serialize(new
        {
            type = "FeatureCollection",
            features = new[]
            {
                Punto(lon, lat, 0),
                Punto(CasaLon, CasaLat, 1),
            },
        });

        using var contenido = new StringContent(cuerpo, Encoding.UTF8, "application/geo+json");
        using var respuesta = await Http.PostAsync(
            $"https://atlas.microsoft.com/route/directions?api-version=2025-01-01&subscription-key={Clave}",
            contenido);

        if (respuesta.IsSuccessStatusCode)
        {
            using var json = JsonDocument.Parse(await respuesta.Content.ReadAsStringAsync());
            foreach (var f in json.RootElement.GetProperty("features").EnumerateArray())
            {
                var props = f.GetProperty("properties");
                if (props.TryGetProperty("type", out var tipo) && tipo.GetString() == "RoutePath")
                {
                    var metros = props.GetProperty("distanceInMeters").GetDouble();
                    var segundos = props.GetProperty("durationInSeconds").GetDouble();
                    return Ok(new
                    {
                        distanciaKm = Math.Round(metros / 1000, 1),
                        minutos = (int?)Math.Ceiling(segundos / 60),
                    });
                }
            }
        }

        // si Azure no encuentra ruta se manda solo la distancia en linea recta
        var directa = DistanciaKm(CasaLat, CasaLon, lat, lon);
        return Ok(new { distanciaKm = Math.Round(directa, 1), minutos = (int?)null });
    }

    private static object Punto(double lon, double lat, int indice) => new
    {
        type = "Feature",
        geometry = new { type = "Point", coordinates = new[] { lon, lat } },
        properties = new { pointIndex = indice, pointType = "waypoint" },
    };

    private static double DistanciaKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double radioTierra = 6371;
        static double Rad(double grados) => grados * Math.PI / 180;

        var dLat = Rad(lat2 - lat1);
        var dLon = Rad(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(Rad(lat1)) * Math.Cos(Rad(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return 2 * radioTierra * Math.Asin(Math.Sqrt(a));
    }

    private static int ZoomPara(double km) => km switch
    {
        < 0.4 => 16,
        < 0.8 => 15,
        < 1.6 => 14,
        < 3.5 => 13,
        < 7 => 12,
        < 14 => 11,
        < 28 => 10,
        < 55 => 9,
        < 110 => 8,
        < 220 => 7,
        _ => 6,
    };
}
>>>>>>> c14ea15e14ec29175ae8aaa839ebbfbdb6a1b710
