namespace InvernaderoInteligente.Domain.Entities;

public class TipoSensor
{
    public int id_T_Sensor { get; set; }
    public DateTime fecha_Despliegue { get; set; }
    public string nombre { get; set; } = string.Empty;
    public string unidad_Medida { get; set; } = string.Empty;
    public ICollection<Sensor> Sensores { get; set; } = new List<Sensor>();
}
