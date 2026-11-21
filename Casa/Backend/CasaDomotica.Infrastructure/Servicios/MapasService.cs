using System.Globalization;
using System.Text.Json;
using CasaDomotica.Application;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CasaDomotica.Infrastructure.Servicios;

/// <summary>Azure Maps: imagen del mapa (con la casa y tú) y tiempo de llegada en coche.</summary>
public sealed class MapasService : IMapas
{
    private static readonly CultureInfo Inv = CultureInfo.InvariantCulture;

    private readonly HttpClient _http;
    private readonly MapsOptions _o;
    private readonly ILogger<MapasService> _log;

    public MapasService(HttpClient http, IOptions<MapsOptions> o, ILogger<MapasService> log)
    {
        _http = http;
        _o = o.Value;
        _log = log;
    }

    public bool Configurado =>
        !string.IsNullOrWhiteSpace(_o.Key)
        && !_o.Key.StartsWith("PEGA", StringComparison.OrdinalIgnoreCase)
        && (_o.CasaLat != 0 || _o.CasaLon != 0);

    public async Task<InfoMapa?> CalcularAsync(double lat, double lon, CancellationToken ct = default)
    {
        if (!Configurado)
        {
            return null;
        }

        try
        {
            var url = "https://atlas.microsoft.com/route/directions/json?api-version=1.0"
                      + $"&subscription-key={Uri.EscapeDataString(_o.Key)}"
                      + $"&query={lat.ToString(Inv)},{lon.ToString(Inv)}:{_o.CasaLat.ToString(Inv)},{_o.CasaLon.ToString(Inv)}";

            using var res = await _http.GetAsync(url, ct);
            if (!res.IsSuccessStatusCode)
            {
                _log.LogWarning("Azure Maps (ruta) respondió {Status}", (int)res.StatusCode);
                return null;
            }

            using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(ct));
            var resumen = doc.RootElement.GetProperty("routes")[0].GetProperty("summary");
            var segundos = resumen.GetProperty("travelTimeInSeconds").GetInt32();
            var metros = resumen.GetProperty("lengthInMeters").GetInt32();
            return new InfoMapa((int)Math.Round(segundos / 60.0), Math.Round(metros / 1000.0, 1));
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "No se pudo calcular la ruta con Azure Maps");
            return null;
        }
    }

    public async Task<byte[]?> ImagenAsync(double? lat, double? lon, CancellationToken ct = default)
    {
        if (!Configurado)
        {
            return null;
        }

        try
        {
            var url = "https://atlas.microsoft.com/map/static?api-version=2024-04-01&tilesetId=microsoft.base.darkgrey"
                      + "&width=720&height=405"
                      + $"&subscription-key={Uri.EscapeDataString(_o.Key)}";

            var pinCasa = Uri.EscapeDataString($"default|coC8FF3D||{_o.CasaLon.ToString(Inv)} {_o.CasaLat.ToString(Inv)}");

            if (lat is double la && lon is double lo)
            {
                // Encuadra la casa y al usuario con un poco de margen.
                var minLon = Math.Min(lo, _o.CasaLon);
                var maxLon = Math.Max(lo, _o.CasaLon);
                var minLat = Math.Min(la, _o.CasaLat);
                var maxLat = Math.Max(la, _o.CasaLat);
                var margenLon = Math.Max((maxLon - minLon) * 0.25, 0.004);
                var margenLat = Math.Max((maxLat - minLat) * 0.25, 0.003);
                var bbox = string.Join(",",
                    (minLon - margenLon).ToString(Inv), (minLat - margenLat).ToString(Inv),
                    (maxLon + margenLon).ToString(Inv), (maxLat + margenLat).ToString(Inv));
                var pinYo = Uri.EscapeDataString($"default|coFFFFFF||{lo.ToString(Inv)} {la.ToString(Inv)}");
                url += $"&bbox={bbox}&pins={pinCasa}&pins={pinYo}";
            }
            else
            {
                url += $"&center={_o.CasaLon.ToString(Inv)},{_o.CasaLat.ToString(Inv)}&zoom=15&pins={pinCasa}";
            }

            using var res = await _http.GetAsync(url, ct);
            if (!res.IsSuccessStatusCode)
            {
                _log.LogWarning("Azure Maps (imagen) respondió {Status}", (int)res.StatusCode);
                return null;
            }

            return await res.Content.ReadAsByteArrayAsync(ct);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "No se pudo pedir el mapa a Azure Maps");
            return null;
        }
    }
}
