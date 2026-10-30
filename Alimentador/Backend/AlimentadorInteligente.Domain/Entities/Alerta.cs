using AlimentadorInteligente.Domain.Common;
using AlimentadorInteligente.Domain.Enums;

namespace AlimentadorInteligente.Domain.Entities;

public class Alerta : EntidadBase
{
    public int AlimentadorId { get; set; }
    public Alimentador Alimentador { get; set; } = null!;
    public int? MascotaId { get; set; }
    public Mascota? Mascota { get; set; }
    public TipoAlerta Tipo { get; set; }
    public string Mensaje { get; set; } = string.Empty;
    /// <summary>Hora real en que ocurrió; puede ser anterior a CreadoEn si llegó atrasada.</summary>
    public DateTimeOffset OcurridaEn { get; set; }
    public bool Leida { get; set; }
}
