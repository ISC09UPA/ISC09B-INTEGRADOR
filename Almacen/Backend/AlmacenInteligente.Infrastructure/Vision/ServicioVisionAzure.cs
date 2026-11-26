using AlmacenInteligente.Application.Interfaces;
using Azure;
using Azure.AI.Vision.ImageAnalysis;
using Microsoft.Extensions.Logging;

namespace AlmacenInteligente.Infrastructure.Vision;

// Etiquetas de una foto con Azure AI Vision (Image Analysis 4.0).
// Configuración (User Secrets en local, App Service → Variables de entorno en Azure):
//   Vision:Endpoint          https://<recurso>.cognitiveservices.azure.com/
//   Vision:Key               clave del recurso Computer Vision
//   Vision:UmbralConfianza   opcional, 0.6 por defecto
// Las etiquetas vienen en inglés ("screw", "bottle"): así se escribe la etiquetaVision de cada producto.
public class ServicioVisionAzure(string? endpoint, string? clave, double umbral, ILogger<ServicioVisionAzure> log) : IServicioVision
{
    private ImageAnalysisClient? cliente;

    public bool Configurado => !string.IsNullOrWhiteSpace(endpoint) && !string.IsNullOrWhiteSpace(clave);

    public double UmbralConfianza => umbral;

    public async Task<List<EtiquetaDetectada>?> ObtenerEtiquetasAsync(byte[] imagen, CancellationToken ct = default)
    {
        if (!Configurado) return null;
        try
        {
            cliente ??= new ImageAnalysisClient(new Uri(endpoint!), new AzureKeyCredential(clave!));
            var resultado = await cliente.AnalyzeAsync(BinaryData.FromBytes(imagen), VisualFeatures.Tags, cancellationToken: ct);
            var etiquetas = resultado.Value.Tags?.Values ?? [];
            log.LogInformation("Vision: {Etiquetas}", string.Join(", ", etiquetas.Select(t => $"{t.Name} {t.Confidence:0.00}")));
            return etiquetas.Select(t => new EtiquetaDetectada(t.Name, t.Confidence)).ToList();
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            log.LogError(ex, "Azure Vision no pudo analizar la foto.");
            return null;
        }
    }
}
