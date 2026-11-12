using AlimentadorInteligente.Domain.Common;
using AlimentadorInteligente.Domain.Enums;

namespace AlimentadorInteligente.Domain.Entities;

public class EventoAlimentador : EntidadBase
{
    public string EventId { get; set; } = string.Empty;
    public int AlimentadorId { get; set; }
    public Alimentador Alimentador { get; set; } = null!;
    public TipoEvento Tipo { get; set; }
    /// <summary>Tolva afectada: 1 perro, 2 gato (RF-10).</summary>
    public int? Tolva { get; set; }
    public DateTimeOffset OcurridoEn { get; set; }
    public string? Detalle { get; set; }
}
