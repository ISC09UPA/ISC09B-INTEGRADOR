using AlimentadorInteligente.Domain.Common;

namespace AlimentadorInteligente.Domain.Entities;

/// <summary>Historial de los ajustes nocturnos de ración (RF-16).</summary>
public class AjusteRacion : EntidadBase
{
    public int MascotaId { get; set; }
    public Mascota Mascota { get; set; } = null!;
    /// <summary>Último día (inclusive) de la ventana de 3 días evaluada.</summary>
    public DateOnly Dia { get; set; }
    public double AjusteAnterior { get; set; }
    public double AjusteNuevo { get; set; }
    public string Motivo { get; set; } = string.Empty;
}
