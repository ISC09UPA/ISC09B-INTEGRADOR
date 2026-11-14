namespace InvernaderoInteligente.Domain.Entities;

public class Sensor
{
    public int id_Sensor { get; set; }
    public int id_T_Sensor { get; set; }
    public int id_Maceta { get; set; }
    public string codigo_hardware { get; set; } = string.Empty;
    public DateTime estado { get; set; } = DateTime.UtcNow;

    public List<Lectura> Lecturas { get; set; } = new();
}
