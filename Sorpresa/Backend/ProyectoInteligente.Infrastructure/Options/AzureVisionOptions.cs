namespace ProyectoInteligente.Infrastructure.Options;

public class AzureVisionOptions
{
    public string Endpoint { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;

    // Una persona de pie tiene la caja mucho mas alta que ancha (alto / ancho)
    public double StandingRatio { get; set; } = 1.8;

    // Confianza minima para considerar una deteccion como persona
    public double MinConfidence { get; set; } = 0.5;
}
