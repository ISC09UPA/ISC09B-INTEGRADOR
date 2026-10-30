using AlimentadorInteligente.Domain.Common;
using AlimentadorInteligente.Domain.Enums;

namespace AlimentadorInteligente.Domain.Entities;

public class Mascota : EntidadBase
{
    public int AlimentadorId { get; set; }
    public Alimentador Alimentador { get; set; } = null!;

    public string Nombre { get; set; } = string.Empty;
    public Especie Especie { get; set; }
    public double PesoKg { get; set; }
    public int EdadMeses { get; set; }
    public NivelActividad NivelActividad { get; set; }
    public bool Esterilizado { get; set; } = true;
    public int ComidasPorDia { get; set; } = 2;
    public string? EtiquetaRfid { get; set; }

    /// <summary>Ajuste acumulado del algoritmo nocturno, limitado a ±15 % (RF-16).</summary>
    public double AjustePorcentaje { get; set; }

    public ICollection<Visita> Visitas { get; set; } = [];
    public ICollection<AjusteRacion> Ajustes { get; set; } = [];
}
