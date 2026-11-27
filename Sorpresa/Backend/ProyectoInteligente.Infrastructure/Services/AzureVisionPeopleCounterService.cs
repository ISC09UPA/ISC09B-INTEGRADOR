using System.Text;
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
        var horaActual = DateTime.Now.ToString("HH:mm:ss");

        var result = await _client.AnalyzeAsync(
            BinaryData.FromStream(image),
            VisualFeatures.People | VisualFeatures.Caption,
            cancellationToken: cancellationToken);

        var people = result.Value.People.Values
            .Where(p => p.Confidence >= _options.MinConfidence)
            .ToList();

        var standing = people.Count(p =>
            p.BoundingBox.Width > 0 &&
            (double)p.BoundingBox.Height / p.BoundingBox.Width > _options.StandingRatio);

        string descripcionVisual = result.Value.Caption?.Text ?? "Sin descripción disponible";

        // Armar contexto crudo para Azure OpenAI
        var sb = new StringBuilder();
        sb.AppendLine("[ANÁLISIS_IMAGEN]");
        sb.AppendLine($"Hora de captura / detección: {horaActual}");
        sb.AppendLine($"Descripción visual de la escena: {descripcionVisual}");
        sb.AppendLine($"Total de personas detectadas: {people.Count}");
        sb.AppendLine($"Personas de pie: {standing}");
        sb.AppendLine($"Personas en otras posturas: {people.Count - standing}");
        for (int i = 0; i < people.Count; i++)
        {
            var p = people[i];
            sb.AppendLine($"  - Persona #{i + 1}: Confianza={p.Confidence:P0}, Posición=[X:{p.BoundingBox.X}, Y:{p.BoundingBox.Y}, W:{p.BoundingBox.Width}, H:{p.BoundingBox.Height}]");
        }

        return new PeopleCount
        {
            TotalPeople = people.Count,
            StandingPeople = standing,
            ContextoCrudo = sb.ToString()
        };
    }
}
