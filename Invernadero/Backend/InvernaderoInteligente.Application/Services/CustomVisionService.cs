using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;

public sealed class CustomVisionClient : ICustomVisionClient
{
    private readonly HttpClient _http;
    private readonly CustomVisionOptions _options;

    public CustomVisionClient(HttpClient http, IOptions<CustomVisionOptions> options)
    {
        _options = options.Value;
        if (!Uri.TryCreate(_options.Endpoint, UriKind.Absolute, out var endpoint))
            throw new InvalidOperationException("Configure CustomVision:Endpoint con una URL válida.");
        if (string.IsNullOrWhiteSpace(_options.PredictionKey) || string.IsNullOrWhiteSpace(_options.ProjectId) || string.IsNullOrWhiteSpace(_options.PublishedName))
            throw new InvalidOperationException("Configure las credenciales y el modelo publicado de Custom Vision.");
        _http = http;
        _http.BaseAddress = new Uri(endpoint.ToString().TrimEnd('/') + "/");
        _http.DefaultRequestHeaders.Remove("Prediction-Key");
        _http.DefaultRequestHeaders.Add("Prediction-Key", _options.PredictionKey);
    }

    public async Task<IReadOnlyList<PredictionDto>> ClassifyAsync(Stream image, CancellationToken ct = default)
    {
        var url = $"customvision/v3.0/Prediction/{_options.ProjectId}/classify/iterations/{Uri.EscapeDataString(_options.PublishedName)}/image";
        using var content = new StreamContent(image);
        content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
        using var response = await _http.PostAsync(url, content, ct);
        //response.EnsureSuccessStatusCode();
        if (!response.IsSuccessStatusCode)
        {
            var detalle = await response.Content.ReadAsStringAsync(ct);

            throw new HttpRequestException(
                $"Custom Vision respondió {(int)response.StatusCode} " +
                $"{response.StatusCode}. URL: {response.RequestMessage?.RequestUri}. " +
                $"Detalle: {detalle}",
                null,
                response.StatusCode);
        }
        var result = await response.Content.ReadFromJsonAsync<CvResponse>(cancellationToken: ct);
        return result?.Predictions.Select(p => new PredictionDto(p.TagName, p.Probability)).ToArray()
            ?? Array.Empty<PredictionDto>();
    }

    private sealed record CvResponse(List<CvPrediction> Predictions);
    private sealed record CvPrediction(string TagName, double Probability);
}
