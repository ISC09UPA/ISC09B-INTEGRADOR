namespace AlmacenInteligente.Application.Interfaces;

// Etiqueta que reconoce Azure Vision en una foto (por ejemplo "screw", "bottle") y su confianza de 0 a 1.
public record EtiquetaDetectada(string Nombre, double Confianza);

// Análisis de imágenes con Azure AI Vision (Image Analysis 4.0, etiquetas).
public interface IServicioVision
{
    bool Configurado { get; }

    // Confianza mínima para tomar en cuenta una etiqueta (Vision:UmbralConfianza, 0.6 por defecto).
    double UmbralConfianza { get; }

    // Etiquetas de la imagen, o null si el servicio no respondió.
    Task<List<EtiquetaDetectada>?> ObtenerEtiquetasAsync(byte[] imagen, CancellationToken ct = default);
}
