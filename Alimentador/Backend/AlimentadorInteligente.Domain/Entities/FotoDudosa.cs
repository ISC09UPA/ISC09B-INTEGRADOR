using AlimentadorInteligente.Domain.Common;
using AlimentadorInteligente.Domain.Enums;

namespace AlimentadorInteligente.Domain.Entities;

/// <summary>Foto con confianza entre 0.5 y 0.8 subida a Blob Storage (RF-14).</summary>
public class FotoDudosa : EntidadBase
{
    public string EventId { get; set; } = string.Empty;
    public int AlimentadorId { get; set; }
    public Alimentador Alimentador { get; set; } = null!;
    public string BlobNombre { get; set; } = string.Empty;
    public ClaseDetectada ClasePredicha { get; set; }
    public double Confianza { get; set; }
    public DateTimeOffset TomadaEn { get; set; }
    public bool Subida { get; set; }
    /// <summary>Clase asignada en la revisión manual; null mientras no se revise.</summary>
    public ClaseDetectada? ClaseRevisada { get; set; }
}
