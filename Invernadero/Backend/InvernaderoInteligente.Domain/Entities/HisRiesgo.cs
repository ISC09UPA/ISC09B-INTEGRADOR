namespace InvernaderoInteligente.Domain.Entities;

public class HisRiesgo
{
    public int id_Historial { get; set; }
    public int id_Maceta { get; set; }
    public int id_Actuador { get; set; }
    public double duracion_Seg { get; set; }
    public bool disparador_Por { get; set; }
    public DateTime fecha_R_hora { get; set; }
    public Maceta Maceta { get; set; } = null!;
    public Actuador Actuador { get; set; } = null!;
}
