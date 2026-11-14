namespace InvernaderoInteligente.Domain.Entities;

public class Lectura
{
    public int id_Lectura { get; set; }
    public int id_Sensor { get; set; }
    public double valor { get; set; }
    public DateTime fecha_L_Hora { get; set; } = DateTime.UtcNow;

    public Sensor? Sensor { get; set; }
}
