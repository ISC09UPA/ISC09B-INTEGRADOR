using System.Net.Http.Headers;
using System.Text.Json;
using CasaDomotica.Application;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CasaDomotica.Infrastructure.Servicios;

/// <summary>Clasifica una foto con el proyecto de Azure Custom Vision (la etiqueta = nombre de la persona).</summary>
public sealed class CustomVisionService : IReconocimientoFacial
{
    // Imagen gris de 300x300 para probar la conexión.
    private static readonly byte[] ImagenPrueba = Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAIAAAD2HxkiAAACdElEQVR42u3TMQ0AAAzDsEIv9GLYtceGECkp8CoSgAnBhIAJwYSACcGEgAnBhIAJwYSACcGEgAnBhIAJwYSACcGEgAnBhIAJwYSACcGEgAnBhIAJwYSACcGEgAnBhIAJwYSACcGEgAnBhIAJwYSACcGEgAnBhIAJwYSACcGEgAnBhIAJwYSACcGEgAnBhIAJwYSACcGEgAnBhIAJwYRgQsCEYELAhGBCwIRgQsCEYELAhGBCwIRgQsCEYELAhGBCwIRgQsCEYELAhGBCwIRgQsCEYELAhGBCwIRgQsCEYELAhGBCwIRgQsCEYELAhGBCwIRgQsCEYELAhGBCwIRgQsCEYELAhGBCwIRgQsCEYELAhGBCwIRgQsCEYELAhGBCMCFgQjAhYEIwIWBCMCFgQjAhYEIwIWBCMCFgQjAhYEIwIWBCMCFgQjAhYEIwIWBCMCFgQjAhYEIwIWBCMCFgQjAhYEIwIWBCMCFgQjAhYEIwIWBCMCFgQjAhYEIwIWBCMCFgQjAhYEIwIWBCMCFgQjAhYEIwIWBCMCFgQjAhYEIwIZgQMCGYEDAhmBAwIZgQMCGYEDAhmBAwIZgQMCGYEDAhmBAwIZgQMCGYEDAhmBAwIZgQMCGYEDAhmBAwIZgQMCGYEDAhmBAwIZgQMCGYEDAhmBAwIZgQMCGYEDAhmBAwIZgQMCGYEDAhmBAwIZgQMCGYEDAhmBAwIZgQMCGYEEwoAZgQTAiYEEwImBBMCJgQTAiYEEwImBBMCJgQTAiYEEwImBBMCJgQTAiYEEwImBBMCJgQTAiYEEwImBBMCJgQTAiYEEwImBBMCJgQTAiYEEwI3AwycHbiUa91yQAAAABJRU5ErkJggg==");

    private readonly HttpClient _http;
    private readonly CustomVisionOptions _o;
    private readonly ILogger<CustomVisionService> _log;

    public CustomVisionService(HttpClient http, IOptions<CustomVisionOptions> o, ILogger<CustomVisionService> log)
    {
        _http = http;
        _o = o.Value;
        _log = log;
    }

    public bool Configurado =>
        !string.IsNullOrWhiteSpace(_o.Endpoint)
        && !string.IsNullOrWhiteSpace(_o.ProjectId)
        && !string.IsNullOrWhiteSpace(_o.PublishedName)
        && !string.IsNullOrWhiteSpace(_o.Key)
        && !_o.Key.StartsWith("PEGA", StringComparison.OrdinalIgnoreCase);

    public Task<ResultadoRostro> ProbarAsync(CancellationToken ct = default) => ClasificarAsync(ImagenPrueba, ct);

    public async Task<ResultadoRostro> ClasificarAsync(byte[] foto, CancellationToken ct = default)
    {
        if (!Configurado)
        {
            return new ResultadoRostro(false, "", -1, 0, "Falta la llave de Azure Custom Vision (appsettings.Local.json).", null);
        }

        var url = $"{_o.Endpoint.TrimEnd('/')}/customvision/v3.0/Prediction/{_o.ProjectId}"
                  + $"/classify/iterations/{Uri.EscapeDataString(_o.PublishedName)}/image";

        using var req = new HttpRequestMessage(HttpMethod.Post, url) { Content = new ByteArrayContent(foto) };
        req.Headers.Add("Prediction-Key", _o.Key);
        req.Content!.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");

        try
        {
            using var res = await _http.SendAsync(req, ct);
            var cuerpo = await res.Content.ReadAsStringAsync(ct);

            if (!res.IsSuccessStatusCode)
            {
                _log.LogWarning("Custom Vision respondió {Status}: {Cuerpo}", (int)res.StatusCode, cuerpo);
                var pista = (int)res.StatusCode switch
                {
                    401 or 403 => "Azure rechazó la llave (Prediction-Key). Revisa CustomVision:Key.",
                    404 => "Azure no encontró el proyecto o el nombre publicado. Revisa ProjectId y PublishedName.",
                    _ => "El servicio de reconocimiento no respondió correctamente."
                };
                return new ResultadoRostro(false, "", -1, (int)res.StatusCode, pista, cuerpo);
            }

            using var doc = JsonDocument.Parse(cuerpo);
            var nombre = "";
            var mejor = -1.0;
            foreach (var p in doc.RootElement.GetProperty("predictions").EnumerateArray())
            {
                var prob = p.GetProperty("probability").GetDouble();
                if (prob > mejor)
                {
                    mejor = prob;
                    nombre = p.GetProperty("tagName").GetString() ?? "";
                }
            }

            return new ResultadoRostro(true, nombre, Math.Max(mejor, 0), 200, null, null);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "No se pudo contactar Custom Vision");
            return new ResultadoRostro(false, "", -1, 0, "No se pudo contactar el servicio de reconocimiento (¿hay internet?).", ex.Message);
        }
    }
}
