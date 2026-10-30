using System.Net.Http.Headers;
using System.Net.Http.Json;
using AlimentadorInteligente.Application.Abstractions;
using AlimentadorInteligente.Infrastructure.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AlimentadorInteligente.Infrastructure.Notifications;

/// <summary>Envía notificaciones push por el servicio de Expo.</summary>
public class ExpoPushService(HttpClient http, IOptions<ExpoPushOptions> opciones, ILogger<ExpoPushService> logger) : IPushService
{
    public async Task EnviarAsync(IEnumerable<string> expoTokens, string titulo, string cuerpo, CancellationToken ct = default)
    {
        var mensajes = expoTokens.Distinct()
            .Select(token => new { to = token, title = titulo, body = cuerpo, sound = "default" })
            .ToList();
        if (mensajes.Count == 0) return;

        using var request = new HttpRequestMessage(HttpMethod.Post, opciones.Value.Url) { Content = JsonContent.Create(mensajes) };
        if (!string.IsNullOrEmpty(opciones.Value.AccessToken))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", opciones.Value.AccessToken);

        try
        {
            using var response = await http.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
                logger.LogWarning("Expo push respondió {Status}", response.StatusCode);
            // TODO: leer los tickets y borrar los tokens con DeviceNotRegistered
        }
        catch (HttpRequestException ex)
        {
            // Una falla de push no debe tirar la operación que generó la alerta
            logger.LogWarning(ex, "No se pudo enviar la notificación push");
        }
    }
}
