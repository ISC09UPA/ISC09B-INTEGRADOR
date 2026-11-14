using Azure;
using Azure.AI.Vision.ImageAnalysis;
using ProyectoInteligente.Application.Interfaces;
using ProyectoInteligente.Domain.Entities;
using ProyectoInteligente.Infrastructure.Options;

namespace ProyectoInteligente.Infrastructure.Services;

public class AzureVisionPeopleCounterService : IPeopleCounterService
{
    private readonly ImageAnalysisClient _client;
    private readonly AzureVisionOptions _options;

    public AzureVisionPeopleCounterService(AzureVisionOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.Endpoint) || string.IsNullOrWhiteSpace(options.Key))
            throw new InvalidOperationException("Falta configurar AzureVision:Endpoint y AzureVision:Key en appsettings.json");

        _options = options;
        _client = new ImageAnalysisClient(new Uri(options.Endpoint), new AzureKeyCredential(options.Key));
    }

    public async Task<PeopleCount> CountAsync(Stream image, CancellationToken cancellationToken = default)
    {
        var result = await _client.AnalyzeAsync(
            BinaryData.FromStream(image),
            VisualFeatures.People,
            cancellationToken: cancellationToken);

        var people = result.Value.People.Values
            .Where(p => p.Confidence >= _options.MinConfidence)
            .ToList();

        var standing = people.Count(p =>
            p.BoundingBox.Width > 0 &&
            (double)p.BoundingBox.Height / p.BoundingBox.Width > _options.StandingRatio);

        return new PeopleCount
        {
            TotalPeople = people.Count,
            StandingPeople = standing
        };
    }
}
