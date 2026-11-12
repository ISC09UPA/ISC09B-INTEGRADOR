using AlimentadorInteligente.Domain.Enums;

namespace AlimentadorInteligente.Domain.Entities;

/// <summary>Relación usuario–alimentador con su rol (RF-19).</summary>
public class MiembroAlimentador
{
    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
    public int AlimentadorId { get; set; }
    public Alimentador Alimentador { get; set; } = null!;
    public RolAlimentador Rol { get; set; }
}
