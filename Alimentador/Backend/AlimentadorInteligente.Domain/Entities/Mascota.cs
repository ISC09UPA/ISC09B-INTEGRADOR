using AlimentadorInteligente.Domain.Common;
using AlimentadorInteligente.Domain.Enums;

namespace AlimentadorInteligente.Domain.Entities;

public class Mascota : EntidadBase
{
    public const int TolvaPerro = 1;
    public const int TolvaGato = 2;

    public int AlimentadorId { get; set; }
    public Alimentador Alimentador { get; set; } = null!;

    public string Nombre { get; set; } = string.Empty;
    public Especie Especie { get; set; }
    public double PesoKg { get; set; }
    public int EdadMeses { get; set; }
    public NivelActividad NivelActividad { get; set; } = NivelActividad.Moderado;
    public bool Esterilizado { get; set; } = true;
    public int ComidasPorDia { get; set; } = 2;
    public string? EtiquetaRfid { get; set; }
    /// <summary>Baja lógica: una mascota dada de baja conserva su historial.</summary>
    public bool Activa { get; set; } = true;

    /// <summary>Ajuste acumulado del algoritmo nocturno, limitado a ±15 % (RF-16).</summary>
    public double AjustePorcentaje { get; set; }

    /// <summary>Cada especie tiene su dispensador y su plato (RF-05). No se guarda en la BD.</summary>
    public int Tolva => Especie == Especie.Perro ? TolvaPerro : TolvaGato;

    public ICollection<Visita> Visitas { get; set; } = [];
    public ICollection<AjusteRacion> Ajustes { get; set; } = [];
}
