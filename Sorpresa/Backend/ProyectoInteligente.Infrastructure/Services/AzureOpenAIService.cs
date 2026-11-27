using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using ProyectoInteligente.Application.Interfaces;
using ProyectoInteligente.Domain.Entities;
using ProyectoInteligente.Infrastructure.Options;

namespace ProyectoInteligente.Infrastructure.Services;

public class AzureOpenAIService : IAzureOpenAIService
{
    private readonly HttpClient _httpClient;
    private readonly AzureOpenAIOptions _options;
    private readonly ILogger<AzureOpenAIService> _logger;

    public AzureOpenAIService(AzureOpenAIOptions options, HttpClient httpClient, ILogger<AzureOpenAIService> logger)
    {
        _options = options;
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<ResumenDeteccion> GenerarResumenAsync(string contextoCrudo, int totalDetectado, string horaFallback)
    {
        var endpoint = _options.Endpoint.Trim().TrimEnd('/');
        var url = $"{endpoint}/openai/deployments/{_options.Deployment}/chat/completions?api-version={_options.ApiVersion}";

        var systemPrompt = 
            "Eres un extractor y sintetizador de datos especializado. Recibirás el texto crudo del análisis y contexto de una imagen.\n" +
            "Tu tarea es generar un resumen únicamente diciendo cuántas personas se ven en la imagen y a qué hora.\n" +
            "DEBES RESPONDER EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO con la siguiente estructura exacta:\n" +
            "{\n" +
            "  \"personas\": <número entero>,\n" +
            "  \"hora\": \"<hora en formato HH:mm:ss>\",\n" +
            "  \"resumen\": \"<texto breve indicando cuántas personas se ven y a qué hora>\"\n" +
            "}";

        var requestBody = new
        {
            messages = new object[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = $"Contexto crudo de la imagen:\n{contextoCrudo}" }
            },
            temperature = 0.2,
            response_format = new { type = "json_object" }
        };

        try
        {
            var jsonContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Add("api-key", _options.Key);
            request.Content = jsonContent;

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var responseString = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseString);
            var content = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            if (!string.IsNullOrEmpty(content))
            {
                var jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var resultado = JsonSerializer.Deserialize<ResumenDeteccion>(content, jsonOptions);
                if (resultado != null)
                {
                    return resultado;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al consultar Azure OpenAI. Se usará el resumen de contingencia.");
        }

        // Fallback en caso de contingencia o fallo de red
        return new ResumenDeteccion
        {
            Personas = totalDetectado,
            Hora = horaFallback,
            Resumen = $"Se observan {totalDetectado} personas en la imagen a las {horaFallback}."
        };
    }
}
