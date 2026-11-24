using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;

public sealed class MachinLearningService : IMachinLearningService
{
    private readonly HttpClient _httpClient;
    private readonly MachineLearningSettings _settings;

    public MachinLearningService(HttpClient httpClient, IOptions<MachineLearningSettings> settings)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
    }

    public bool IsConfigured =>
        Uri.TryCreate(_settings.ScoringUri, UriKind.Absolute, out _) &&
        !string.IsNullOrWhiteSpace(_settings.ApiKey);

    public async Task<IReadOnlyList<PrediccionRiego>> PredecirRiegoAsync(
        LoteLecturas lote,
        CancellationToken cancellationToken)
    {
        if (!IsConfigured)
            throw new InvalidOperationException("MachineLearning:ScoringUri y MachineLearning:ApiKey deben configurarse.");

        var nivel = lote.NivelTanque.Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(nivel))
            throw new InvalidOperationException("La lectura no contiene NivelTanque.");

        var requestBody = new
        {
            input_data = new
            {
                columns = new[] { "humedadSueloPct", "nivelTanque" },
                index = Enumerable.Range(0, lote.Macetas.Count).ToArray(),
                data = lote.Macetas
                    .Select(maceta => new object?[] { maceta.Humedad, nivel })
                    .ToArray()
            }
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, _settings.ScoringUri)
        {
            Content = JsonContent.Create(requestBody)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"Azure ML respondió {(int)response.StatusCode} {response.StatusCode}: {responseBody}",
                null,
                response.StatusCode);
        }

        using var document = JsonDocument.Parse(responseBody);
        var predictions = FindPredictions(document.RootElement);
        if (predictions.Count != lote.Macetas.Count)
        {
            throw new InvalidOperationException(
                $"Azure ML devolvió {predictions.Count} predicciones para {lote.Macetas.Count} macetas. Respuesta: {responseBody}");
        }

        return lote.Macetas
            .Select((maceta, index) => new PrediccionRiego(maceta.Maceta, NormalizeLabel(predictions[index])))
            .ToArray();
    }

    private static List<JsonElement> FindPredictions(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Array)
            return element.EnumerateArray().ToList();

        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var name in new[] { "predictions", "prediction", "outputs", "output" })
            {
                if (element.TryGetProperty(name, out var nested))
                    return FindPredictions(nested);
            }
        }

        return new List<JsonElement> { element };
    }

    private static string NormalizeLabel(JsonElement element)
    {
        while (element.ValueKind == JsonValueKind.Array && element.GetArrayLength() == 1)
            element = element[0];

        if (element.ValueKind != JsonValueKind.String)
            throw new InvalidOperationException($"La predicción del modelo no es texto SI/NO: {element}");

        var label = element.GetString()?.Trim().ToUpperInvariant() ?? string.Empty;
        return label is "SI" or "NO"
            ? label
            : throw new InvalidOperationException($"Etiqueta inesperada del modelo: '{label}'. Se esperaba SI o NO.");
    }
}
