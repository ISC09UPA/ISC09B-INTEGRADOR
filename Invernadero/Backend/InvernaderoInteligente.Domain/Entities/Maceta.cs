namespace InvernaderoInteligente.Domain.Entities;

public class Maceta
{
    public int id_Maceta { get; set; }
    public int id_Cultivo { get; set; }
    public int id_Planta { get; set; }
    public string etiqueta { get; set; } = string.Empty;
    public DateTime Fecha_Siembra { get; set; }
    public Cultivo Cultivo { get; set; } = null!;
    public Especie Planta { get; set; } = null!;
    public ICollection<Sensor> Sensores { get; set; } = new List<Sensor>();
    public ICollection<HisRiesgo> HisRiesgos { get; set; } = new List<HisRiesgo>();
}
