using AlimentadorInteligente.Domain.Common;
using AlimentadorInteligente.Domain.Enums;

namespace AlimentadorInteligente.Domain.Entities;

/// <summary>Versión de firmware o de modelo disponible para OTA (RF-15).</summary>
public class ArtefactoOta : EntidadBase
{
    public TipoArtefactoOta Tipo { get; set; }
    public string Version { get; set; } = string.Empty;
    public string BlobNombre { get; set; } = string.Empty;
    public string Sha256 { get; set; } = string.Empty;
    public long TamanoBytes { get; set; }
}
