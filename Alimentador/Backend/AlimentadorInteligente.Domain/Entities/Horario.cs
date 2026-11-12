using AlimentadorInteligente.Domain.Common;

namespace AlimentadorInteligente.Domain.Entities;

public class Horario : EntidadBase
{
    public int AlimentadorId { get; set; }
    public Alimentador Alimentador { get; set; } = null!;
    /// <summary>null = aplica a todas las mascotas del alimentador.</summary>
    public int? MascotaId { get; set; }
    public Mascota? Mascota { get; set; }
    public TimeOnly Hora { get; set; }
    public bool Activo { get; set; } = true;
}
